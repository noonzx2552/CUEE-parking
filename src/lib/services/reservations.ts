import crypto from "node:crypto";

import { addMinutes, addSeconds, isAfter, subMinutes } from "date-fns";

import {
  CANCELLATION_LEAD_MINUTES,
  CHECK_IN_GRACE_MINUTES,
  CHECK_IN_OPEN_BEFORE_MINUTES,
  QR_TOKEN_TTL_SECONDS,
  RESERVATION_LOCK_MS,
  RESERVATION_MAX_ACTIVE_PER_USER,
  UPCOMING_REMINDER_MINUTES,
} from "@/lib/constants";
import {
  acquireParkingLock,
  createReservationRecord,
  getParkingSpaceByIdRecord,
  getReservationById,
  getUserById,
  hydrateReservation,
  listReservations,
  releaseParkingLock,
  updateParkingSpace,
  updateReservation,
} from "@/lib/db/store";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { calculateParkingFee, formatParkingFee } from "@/lib/parking-fees";
import { createAuditLog } from "@/lib/services/audit-log";
import { sendDiscordEvent } from "@/lib/services/discord";
import { pushLineMessage } from "@/lib/services/line";
import { getRequestContext } from "@/lib/security/request";

const activeReservationStatuses = ["pending", "confirmed", "checked-in"];
const parkingFeeConfig = {
  normalPerHour: env.PARKING_FEE_NORMAL_PER_HOUR,
  evPerHour: env.PARKING_FEE_EV_PER_HOUR,
  disabledPerHour: env.PARKING_FEE_DISABLED_PER_HOUR,
  currency: env.PARKING_FEE_CURRENCY,
};

async function syncParkingSpaceStatus(parkingSpaceId: string) {
  const now = Date.now();
  const reservations = await listReservations();

  const occupiedReservation = reservations
    .filter(
      (reservation) =>
        reservation.parkingSpaceId === parkingSpaceId &&
        reservation.status === "checked-in" &&
        !reservation.checkOutAt,
    )
    .sort((a, b) => b.startTime.localeCompare(a.startTime))[0];

  const reservedReservation = reservations
    .filter(
      (reservation) =>
        reservation.parkingSpaceId === parkingSpaceId &&
        ["pending", "confirmed"].includes(reservation.status) &&
        new Date(reservation.checkInDeadline).getTime() >= now,
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  const nextStatus = occupiedReservation ? "occupied" : reservedReservation ? "reserved" : "available";

  await updateParkingSpace(parkingSpaceId, {
    status: nextStatus,
    lastStatusChangedAt: new Date().toISOString(),
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
  const now = new Date();
  if (!isAfter(input.startTime, now)) {
    throw new AppError("Reservations cannot start in the past", 422);
  }

  const reservations = await listReservations();
  const activeReservationsCount = reservations.filter((reservation) => {
    if (reservation.userId !== input.userId || !activeReservationStatuses.includes(reservation.status)) {
      return false;
    }

    if (reservation.status === "checked-in" && !reservation.checkOutAt) {
      return true;
    }

    return new Date(reservation.endTime).getTime() > now.getTime();
  }).length;

  if (activeReservationsCount >= RESERVATION_MAX_ACTIVE_PER_USER) {
    throw new AppError("Reservation limit reached for this user", 409);
  }

  const lockToken = await acquireParkingLock(input.parkingSpaceId, RESERVATION_LOCK_MS);
  if (!lockToken) {
    throw new AppError("Parking space is busy, please retry", 409);
  }

  try {
    const parkingSpace = await getParkingSpaceByIdRecord(input.parkingSpaceId);
    if (!parkingSpace) {
      throw new AppError("Parking space not found", 404);
    }

    await updateParkingSpace(input.parkingSpaceId, {
      reservationLockUntil: addSeconds(now, Math.ceil(RESERVATION_LOCK_MS / 1000)).toISOString(),
    });

    if (parkingSpace.status === "maintenance") {
      throw new AppError("Parking space is under maintenance", 409);
    }

    const conflict = reservations.find(
      (reservation) =>
        reservation.parkingSpaceId === input.parkingSpaceId &&
        activeReservationStatuses.includes(reservation.status) &&
        new Date(reservation.startTime).getTime() < input.endTime.getTime() &&
        new Date(reservation.endTime).getTime() > input.startTime.getTime(),
    );

    if (conflict) {
      throw new AppError("Selected time conflicts with an existing reservation", 409);
    }

    const feeSummary = calculateParkingFee({
      type: parkingSpace.type,
      startTime: input.startTime,
      endTime: input.endTime,
      config: parkingFeeConfig,
    });

    const reservation = await createReservationRecord({
      userId: input.userId,
      parkingSpaceId: input.parkingSpaceId,
      startTime: input.startTime.toISOString(),
      endTime: input.endTime.toISOString(),
      parkingFee: feeSummary.total,
      feeRatePerHour: feeSummary.ratePerHour,
      feeCurrency: feeSummary.currency,
      checkInDeadline: addMinutes(input.startTime, CHECK_IN_GRACE_MINUTES).toISOString(),
      note: input.note ?? "",
      status: "confirmed",
      checkInAt: null,
      checkOutAt: null,
      entryQrToken: null,
      entryQrExpiresAt: null,
      exitQrToken: null,
      exitQrExpiresAt: null,
    });

    await syncParkingSpaceStatus(input.parkingSpaceId);

    const user = await getUserById(input.userId);
    const requestContext = await getRequestContext();

    await createAuditLog({
      actorUserId: input.userId,
      action: "reservation.create",
      targetType: "reservation",
      targetId: reservation._id,
      metadata: {
        parkingCode: parkingSpace.code,
        startTime: input.startTime.toISOString(),
        endTime: input.endTime.toISOString(),
        parkingFee: feeSummary.total,
        feeCurrency: feeSummary.currency,
      },
      ...requestContext,
    });

    if (user) {
      const lineResult = await pushLineMessage(user.lineUserId, [
        `Reservation confirmed / ยืนยันการจอง: ${parkingSpace.code}`,
        `Time: ${input.startTime.toLocaleString()} - ${input.endTime.toLocaleString()}`,
        `Parking fee / ค่าจอดรถ: ${formatParkingFee(feeSummary.total, feeSummary.currency)}`,
        `Reminder in ${UPCOMING_REMINDER_MINUTES} minutes / ระบบจะเตือนก่อนเวลา`,
      ]);

      await createAuditLog({
        actorUserId: input.userId,
        action: "notification.line.reservation_created",
        targetType: "notification",
        targetId: reservation._id,
        metadata: lineResult,
        ...requestContext,
      });
    }

    void sendDiscordEvent(
      "New Reservation",
      `Reservation ${reservation._id} created for ${parkingSpace.code} by ${user?.email ?? input.userId}.`,
    );

    return hydrateReservation(reservation);
  } finally {
    await releaseParkingLock(input.parkingSpaceId);
    await updateParkingSpace(input.parkingSpaceId, { reservationLockUntil: null });
  }
}

export async function cancelReservation(input: {
  reservationId: string;
  actorUserId: string;
  isAdmin?: boolean;
  note?: string;
}) {
  const reservation = await getReservationById(input.reservationId);
  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }

  const [user, parkingSpace] = await Promise.all([
    getUserById(reservation.userId),
    getParkingSpaceByIdRecord(reservation.parkingSpaceId),
  ]);

  if (!input.isAdmin && reservation.userId !== input.actorUserId) {
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

  const updated = await updateReservation(reservation._id, {
    status: "cancelled",
    note: input.note ?? reservation.note,
  });

  if (!updated) {
    throw new AppError("Reservation not found", 404);
  }

  await syncParkingSpaceStatus(reservation.parkingSpaceId);

  const requestContext = await getRequestContext();
  await createAuditLog({
    actorUserId: input.actorUserId,
    action: "reservation.cancel",
    targetType: "reservation",
    targetId: updated._id,
    metadata: { isAdmin: Boolean(input.isAdmin), note: input.note ?? "" },
    ...requestContext,
  });

  const lineResult = await pushLineMessage(user?.lineUserId, [
    `Reservation cancelled / ยกเลิกการจอง: ${parkingSpace?.code ?? "Unknown"}`,
    `Time: ${new Date(updated.startTime).toLocaleString()} - ${new Date(updated.endTime).toLocaleString()}`,
    `Parking fee / ค่าจอดรถ: ${formatParkingFee(updated.parkingFee, updated.feeCurrency ?? parkingFeeConfig.currency)}`,
  ]);

  await createAuditLog({
    actorUserId: input.actorUserId,
    action: "notification.line.reservation_cancelled",
    targetType: "notification",
    targetId: updated._id,
    metadata: lineResult,
    ...requestContext,
  });

  void sendDiscordEvent("Reservation Cancelled", `Reservation ${updated._id} for ${parkingSpace?.code ?? "Unknown"} was cancelled.`);

  return hydrateReservation(updated);
}

export async function generateReservationQr(input: {
  reservationId: string;
  actorUserId: string;
  isAdmin?: boolean;
  mode: "entry" | "exit";
}) {
  const reservation = await getReservationById(input.reservationId);
  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }

  if (!input.isAdmin && reservation.userId !== input.actorUserId) {
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
  const expiresAt = addSeconds(new Date(), QR_TOKEN_TTL_SECONDS).toISOString();

  const updated = await updateReservation(
    reservation._id,
    input.mode === "entry"
      ? { entryQrToken: token, entryQrExpiresAt: expiresAt }
      : { exitQrToken: token, exitQrExpiresAt: expiresAt },
  );

  if (!updated) {
    throw new AppError("Reservation not found", 404);
  }

  const parkingSpace = await getParkingSpaceByIdRecord(updated.parkingSpaceId);

  return {
    reservationId: updated._id,
    parkingCode: parkingSpace?.code ?? "Unknown",
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
  const reservations = await listReservations();
  const tokenField = input.mode === "entry" ? "entryQrToken" : "exitQrToken";
  const expiryField = input.mode === "entry" ? "entryQrExpiresAt" : "exitQrExpiresAt";
  const reservation = reservations.find((item) => item[tokenField] === input.token);

  if (!reservation) {
    throw new AppError("QR code is invalid or has already been rotated", 404);
  }

  if (!input.isAdmin && reservation.userId !== input.actorUserId) {
    throw new AppError("Forbidden", 403);
  }

  const expiryValue = reservation[expiryField];
  const now = new Date();
  if (!expiryValue || new Date(expiryValue).getTime() < now.getTime()) {
    throw new AppError("QR code expired. Please generate a new one.", 409);
  }

  let nextPatch: Parameters<typeof updateReservation>[1];

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
      await updateReservation(reservation._id, {
        status: "expired",
        entryQrToken: null,
        entryQrExpiresAt: null,
      });
      await syncParkingSpaceStatus(reservation.parkingSpaceId);
      throw new AppError("Check-in window has expired", 409);
    }

    nextPatch = {
      status: "checked-in",
      checkInAt: now.toISOString(),
      entryQrToken: null,
      entryQrExpiresAt: null,
      exitQrToken: null,
      exitQrExpiresAt: null,
    };
  } else {
    if (reservation.status !== "checked-in" || !reservation.checkInAt || reservation.checkOutAt) {
      throw new AppError("Reservation is not currently parked in the system", 409);
    }

    nextPatch = {
      status: "completed",
      checkOutAt: now.toISOString(),
      exitQrToken: null,
      exitQrExpiresAt: null,
    };
  }

  const updated = await updateReservation(reservation._id, nextPatch);
  if (!updated) {
    throw new AppError("Reservation not found", 404);
  }

  await syncParkingSpaceStatus(updated.parkingSpaceId);

  const parkingSpace = await getParkingSpaceByIdRecord(updated.parkingSpaceId);
  const requestContext = await getRequestContext();
  await createAuditLog({
    actorUserId: input.actorUserId,
    action: input.mode === "entry" ? "reservation.check_in" : "reservation.check_out",
    targetType: "reservation",
    targetId: updated._id,
    metadata: {
      parkingCode: parkingSpace?.code ?? "Unknown",
      mode: input.mode,
      at: now.toISOString(),
    },
    ...requestContext,
  });

  return hydrateReservation(updated);
}
