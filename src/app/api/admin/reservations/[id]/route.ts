import { requireAdminSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { getReservationById, hydrateReservation, updateReservation } from "@/lib/db/store";
import { adminReservationUpdateSchema } from "@/lib/validators/reservation";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { createAuditLog } from "@/lib/services/audit-log";
import { getRequestContext } from "@/lib/security/request";
import { cancelReservation } from "@/lib/services/reservations";

export const PATCH = withErrorHandler(async (request, context) => {
  await verifyCsrfToken(request);
  const admin = await requireAdminSession();
  const params = await context?.params;
  const payload = adminReservationUpdateSchema.parse(await request.json());

  if (payload.status === "cancelled") {
    const reservation = await cancelReservation({
      reservationId: params?.id ?? "",
      actorUserId: admin.id,
      isAdmin: true,
      note: payload.note,
    });

    return jsonOk({ reservation });
  }

  const existing = await getReservationById(params?.id ?? "");
  if (!existing) {
    throw new AppError("Reservation not found", 404);
  }

  const reservation = await updateReservation(existing._id, {
    status: payload.status,
    note: payload.note ?? "",
  });

  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }

  await createAuditLog({
    actorUserId: admin.id,
    action: "admin.reservation.update",
    targetType: "reservation",
    targetId: String(reservation._id),
    metadata: payload,
    ...(await getRequestContext()),
  });

  return jsonOk({ reservation: await hydrateReservation(reservation) });
});
