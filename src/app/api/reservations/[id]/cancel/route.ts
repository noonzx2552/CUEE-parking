import { requireSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { reservationCancelSchema } from "@/lib/validators/reservation";
import { cancelReservation } from "@/lib/services/reservations";

export const PATCH = withErrorHandler(async (request, context) => {
  await verifyCsrfToken(request);
  const session = await requireSession();
  const payload = reservationCancelSchema.parse(await request.json());
  const params = await context?.params;

  const reservation = await cancelReservation({
    reservationId: params?.id ?? "",
    actorUserId: session.id,
    note: payload.note,
  });

  return jsonOk({ reservation });
});
