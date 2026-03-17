import { requireAdminSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { getAdminReservations } from "@/lib/data";

export const GET = withErrorHandler(async () => {
  await requireAdminSession();
  const reservations = await getAdminReservations();
  return jsonOk({ reservations });
});
