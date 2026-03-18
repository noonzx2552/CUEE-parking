import { requireSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { processReservationAccess } from "@/lib/services/reservations";
import { reservationAccessSchema } from "@/lib/validators/reservation";

export const POST = withErrorHandler(async (request) => {
  await verifyCsrfToken(request);
  const session = await requireSession();
  const payload = reservationAccessSchema.parse(await request.json());

  const reservation = await processReservationAccess({
    actorUserId: session.id,
    isAdmin: session.role === "admin",
    mode: payload.mode,
    token: payload.token,
  });

  return jsonOk({
    reservation,
    message: payload.mode === "entry" ? "Check-in completed" : "Check-out completed",
  });
});
