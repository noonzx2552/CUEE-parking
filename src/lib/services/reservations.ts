import { addMilliseconds, addMinutes, isAfter } from "date-fns";
import mongoose from "mongoose";

import {
  CANCELLATION_LEAD_MINUTES,
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

const activeReservationStatuses = ["pending", "confirmed"];

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
    endTime: { $gt: now },
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
      note: input.note ?? "",
      status: "confirmed",
    });

    await ParkingSpaceModel.findByIdAndUpdate(input.parkingSpaceId, {
      $set: { status: "reserved" },
    });

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

  await ParkingSpaceModel.findByIdAndUpdate(String(reservation.parkingSpaceId._id), {
    $set: { status: "available" },
  });

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
