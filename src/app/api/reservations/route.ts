import { ACTION_RATE_LIMIT_MAX, ACTION_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { requireSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { getUserReservations } from "@/lib/data";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { getRequestContext } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { createReservation } from "@/lib/services/reservations";
import { reservationCreateSchema } from "@/lib/validators/reservation";

export const GET = withErrorHandler(async () => {
  const session = await requireSession();
  const reservations = await getUserReservations(session.id);
  return jsonOk({ reservations });
});

export const POST = withErrorHandler(async (request) => {
  await verifyCsrfToken(request);
  const session = await requireSession();
  const requestContext = await getRequestContext();
  assertRateLimit(
    `reservation:create:${session.id}:${requestContext.ip}`,
    ACTION_RATE_LIMIT_MAX,
    ACTION_RATE_LIMIT_WINDOW_MS,
  );

  const payload = reservationCreateSchema.parse(await request.json());
  const reservation = await createReservation({
    userId: session.id,
    ...payload,
  });

  return jsonOk({ reservation }, { status: 201 });
});
