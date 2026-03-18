import crypto from "node:crypto";

import { addMilliseconds, addMinutes, addSeconds, isAfter, subMinutes } from "date-fns";
import mongoose from "mongoose";

import {
  CANCELLATION_LEAD_MINUTES,
  CHECK_IN_GRACE_MINUTES,
  CHECK_IN_OPEN_BEFORE_MINUTES,
  QR_TOKEN_TTL_SECONDS,
  RESERVATION_LOCK_MS,
  RESERVATION_MAX_ACTIVE_PER_USER,
  UPCOMING_REMINDER_MINUTES,
} from "@/lib/constants";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { createAuditLog } from "@/lib/services/audit-log";
import { sendDiscordEvent } from "@/lib/services/discord";
import { pushLineMessage } from "@/lib/services/line";
import { getRequestContext } from "@/lib/security/request";
import { ParkingSpaceModel } from "@/models/ParkingSpace";
import { ReservationModel } from "@/models/Reservation";
import { UserModel } from "@/models/User";

const activeReservationStatuses = ["pending", "confirmed", "checked-in"];

async function syncParkingSpaceStatus(parkingSpaceId: string) {
  const now = new Date();
  const occupiedReservation = await ReservationModel.findOne({
    parkingSpaceId,
    status: "checked-in",
    checkOutAt: null,
  })
    .sort({ checkInAt: -1 })
    .lean();

  const nextStatus = occupiedReservation
    ? "occupied"
    : (await ReservationModel.findOne({
        parkingSpaceId,
        status: { $in: ["pending", "confirmed"] },
        checkInDeadline: { $gte: now },
      })
        .sort({ startTime: 1 })
        .lean())
      ? "reserved"
      : "available";

  await ParkingSpaceModel.findByIdAndUpdate(parkingSpaceId, {
    $set: {
      status: nextStatus,
      lastStatusChangedAt: now,
    },
  });
}

function buildQrToken() {
  return `${crypto.randomUUID()}_${crypto.randomBytes(16).toString("hex")}`;
}

export async function createReservation(input: {
  userId: string;
  parkingSpaceId: string;
  startTime: Date;
  endTime: Date;
  note?: string;
}) {
  await connectToDatabase();

  const now = new Date();
  if (!isAfter(input.startTime, now)) {
    throw new AppError("Reservations cannot start in the past", 422);
  }

  const activeReservationsCount = await ReservationModel.countDocuments({
    userId: input.userId,
    status: { $in: activeReservationStatuses },
    $or: [{ endTime: { $gt: now } }, { checkOutAt: null, status: "checked-in" }],
  });

  if (activeReservationsCount >= RESERVATION_MAX_ACTIVE_PER_USER) {
    throw new AppError("Reservation limit reached for this user", 409);
  }

  const lockUntil = addMilliseconds(now, RESERVATION_LOCK_MS);
  const parkingSpace = await ParkingSpaceModel.findOneAndUpdate(
    {
      _id: input.parkingSpaceId,
      $or: [{ reservationLockUntil: null }, { reservationLockUntil: { $lt: now } }],
    },
    { $set: { reservationLockUntil: lockUntil } },
    { new: true },
  );

  if (!parkingSpace) {
    throw new AppError("Parking space is busy, please retry", 409);
  }

  try {
    if (parkingSpace.status === "maintenance") {
      throw new AppError("Parking space is under maintenance", 409);
    }

    const conflict = await ReservationModel.findOne({
      parkingSpaceId: input.parkingSpaceId,
      status: { $in: activeReservationStatuses },
      startTime: { $lt: input.endTime },
      endTime: { $gt: input.startTime },
    }).lean();

    if (conflict) {
      throw new AppError("Selected time conflicts with an existing reservation", 409);
    }

    const reservation = await ReservationModel.create({
      userId: new mongoose.Types.ObjectId(input.userId),
      parkingSpaceId: new mongoose.Types.ObjectId(input.parkingSpaceId),
      startTime: input.startTime,
      endTime: input.endTime,
      checkInDeadline: addMinutes(input.startTime, CHECK_IN_GRACE_MINUTES),
      note: input.note ?? "",
      status: "confirmed",
    });

    await syncParkingSpaceStatus(input.parkingSpaceId);

    const user = await UserModel.findById(input.userId).lean();
    const requestContext = await getRequestContext();

    await createAuditLog({
      actorUserId: input.userId,
      action: "reservation.create",
      targetType: "reservation",
      targetId: String(reservation._id),
      metadata: {
        parkingCode: parkingSpace.code,
        startTime: input.startTime.toISOString(),
        endTime: input.endTime.toISOString(),
      },
      ...requestContext,
    });

    if (user) {
      const lineResult = await pushLineMessage(user.lineUserId, [
        `Reservation confirmed / ยืนยันการจอง: ${parkingSpace.code}`,
        `Time: ${input.startTime.toLocaleString()} - ${input.endTime.toLocaleString()}`,
        `Reminder in ${UPCOMING_REMINDER_MINUTES} minutes / ระบบจะเตือนก่อนเวลา`,
      ]);

      await createAuditLog({
        actorUserId: input.userId,
        action: "notification.line.reservation_created",
        targetType: "notification",
        targetId: String(reservation._id),
        metadata: lineResult,
        ...requestContext,
      });
    }

    void sendDiscordEvent(
      "New Reservation",
      `Reservation ${String(reservation._id)} created for ${parkingSpace.code} by ${user?.email ?? input.userId}.`,
    );

    return reservation;
  } finally {
    await ParkingSpaceModel.findByIdAndUpdate(input.parkingSpaceId, {
      $set: { reservationLockUntil: null },
    });
  }
}

export async function cancelReservation(input: {
  reservationId: string;
  actorUserId: string;
  isAdmin?: boolean;
  note?: string;
}) {
  await connectToDatabase();

  const reservation = await ReservationModel.findById(input.reservationId)
    .populate("parkingSpaceId")
    .populate("userId");

  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }

  if (!input.isAdmin && String(reservation.userId._id) !== input.actorUserId) {
    throw new AppError("Forbidden", 403);
  }

  if (["cancelled", "expired", "completed"].includes(reservation.status)) {
    throw new AppError("Reservation cannot be cancelled", 409);
  }

  if (reservation.status === "checked-in" || reservation.checkInAt) {
    throw new AppError("Checked-in reservations cannot be cancelled", 409);
  }

  const cutoff = addMinutes(new Date(), CANCELLATION_LEAD_MINUTES);
  if (!input.isAdmin && !isAfter(new Date(reservation.startTime), cutoff)) {
    throw new AppError(
      `Reservations can only be cancelled at least ${CANCELLATION_LEAD_MINUTES} minutes in advance`,
      409,
    );
  }

  reservation.status = "cancelled";
  if (input.note) {
    reservation.note = input.note;
  }
  await reservation.save();

  await syncParkingSpaceStatus(String(reservation.parkingSpaceId._id));

  const requestContext = await getRequestContext();
  await createAuditLog({
    actorUserId: input.actorUserId,
    action: "reservation.cancel",
    targetType: "reservation",
    targetId: String(reservation._id),
    metadata: { isAdmin: Boolean(input.isAdmin), note: input.note ?? "" },
    ...requestContext,
  });

  const user = reservation.userId as unknown as { lineUserId?: string | null };
  const parkingSpace = reservation.parkingSpaceId as unknown as { code: string };
  const lineResult = await pushLineMessage(user.lineUserId, [
    `Reservation cancelled / ยกเลิกการจอง: ${parkingSpace.code}`,
    `Time: ${new Date(reservation.startTime).toLocaleString()} - ${new Date(
      reservation.endTime,
    ).toLocaleString()}`,
  ]);

  await createAuditLog({
    actorUserId: input.actorUserId,
    action: "notification.line.reservation_cancelled",
    targetType: "notification",
    targetId: String(reservation._id),
    metadata: lineResult,
    ...requestContext,
  });

  void sendDiscordEvent(
    "Reservation Cancelled",
    `Reservation ${String(reservation._id)} for ${parkingSpace.code} was cancelled.`,
  );

  return reservation;
}

export async function generateReservationQr(input: {
  reservationId: string;
  actorUserId: string;
  isAdmin?: boolean;
  mode: "entry" | "exit";
}) {
  await connectToDatabase();

  const reservation = await ReservationModel.findById(input.reservationId)
    .populate("parkingSpaceId")
    .populate("userId");

  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }

  if (!input.isAdmin && String(reservation.userId._id) !== input.actorUserId) {
    throw new AppError("Forbidden", 403);
  }

  if (input.mode === "entry") {
    if (!["pending", "confirmed"].includes(reservation.status) || reservation.checkInAt) {
      throw new AppError("Entry QR is only available before check-in", 409);
    }
  } else if (reservation.status !== "checked-in" || !reservation.checkInAt || reservation.checkOutAt) {
    throw new AppError("Exit QR is available only after check-in", 409);
  }

  const token = buildQrToken();
  const expiresAt = addSeconds(new Date(), QR_TOKEN_TTL_SECONDS);

  if (input.mode === "entry") {
    reservation.entryQrToken = token;
    reservation.entryQrExpiresAt = expiresAt;
  } else {
    reservation.exitQrToken = token;
    reservation.exitQrExpiresAt = expiresAt;
  }

  await reservation.save();

  return {
    reservationId: String(reservation._id),
    parkingCode: (reservation.parkingSpaceId as { code?: string }).code ?? "Unknown",
    mode: input.mode,
    token,
    expiresAt,
  };
}

export async function processReservationAccess(input: {
  actorUserId: string;
  isAdmin?: boolean;
  mode: "entry" | "exit";
  token: string;
}) {
  await connectToDatabase();

  const tokenField = input.mode === "entry" ? "entryQrToken" : "exitQrToken";
  const expiryField = input.mode === "entry" ? "entryQrExpiresAt" : "exitQrExpiresAt";

  const reservation = await ReservationModel.findOne({
    [tokenField]: input.token,
  })
    .populate("parkingSpaceId")
    .populate("userId");

  if (!reservation) {
    throw new AppError("QR code is invalid or has already been rotated", 404);
  }

  if (!input.isAdmin && String(reservation.userId._id) !== input.actorUserId) {
    throw new AppError("Forbidden", 403);
  }

  const expiryValue = reservation[expiryField];
  const now = new Date();
  if (!(expiryValue instanceof Date) || expiryValue.getTime() < now.getTime()) {
    throw new AppError("QR code expired. Please generate a new one.", 409);
  }

  if (input.mode === "entry") {
    if (reservation.status === "checked-in" || reservation.checkInAt) {
      throw new AppError("This reservation has already checked in", 409);
    }

    if (!["pending", "confirmed"].includes(reservation.status)) {
      throw new AppError("Reservation is not available for entry", 409);
    }

    const checkInOpensAt = subMinutes(new Date(reservation.startTime), CHECK_IN_OPEN_BEFORE_MINUTES);
    if (now.getTime() < checkInOpensAt.getTime()) {
      throw new AppError("Check-in is not open yet for this reservation", 409);
    }

    if (now.getTime() > new Date(reservation.checkInDeadline).getTime()) {
      reservation.status = "expired";
      reservation.entryQrToken = null;
      reservation.entryQrExpiresAt = null;
      await reservation.save();
      await syncParkingSpaceStatus(String(reservation.parkingSpaceId._id));
      throw new AppError("Check-in window has expired", 409);
    }

    reservation.status = "checked-in";
    reservation.checkInAt = now;
    reservation.entryQrToken = null;
    reservation.entryQrExpiresAt = null;
    reservation.exitQrToken = null;
    reservation.exitQrExpiresAt = null;
  } else {
    if (reservation.status !== "checked-in" || !reservation.checkInAt || reservation.checkOutAt) {
      throw new AppError("Reservation is not currently parked in the system", 409);
    }

    reservation.status = "completed";
    reservation.checkOutAt = now;
    reservation.exitQrToken = null;
    reservation.exitQrExpiresAt = null;
  }

  await reservation.save();
  await syncParkingSpaceStatus(String(reservation.parkingSpaceId._id));

  const requestContext = await getRequestContext();
  await createAuditLog({
    actorUserId: input.actorUserId,
    action: input.mode === "entry" ? "reservation.check_in" : "reservation.check_out",
    targetType: "reservation",
    targetId: String(reservation._id),
    metadata: {
      parkingCode: (reservation.parkingSpaceId as { code?: string }).code ?? "Unknown",
      mode: input.mode,
      at: now.toISOString(),
    },
    ...requestContext,
  });

  return reservation;
}
