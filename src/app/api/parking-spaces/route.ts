import { withErrorHandler, jsonOk } from "@/lib/api";
import { getParkingSpaces } from "@/lib/data";
import { parkingQuerySchema } from "@/lib/validators/parking";
import { reconcileReservationStatuses } from "@/lib/services/reconciliation";

export const GET = withErrorHandler(async (request) => {
  await reconcileReservationStatuses();
  const url = new URL(request.url);
  const query = parkingQuerySchema.parse({
    zone: url.searchParams.get("zone") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });

  const spaces = await getParkingSpaces(query);
  return jsonOk({ spaces });
});
