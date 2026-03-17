import { withErrorHandler, jsonOk } from "@/lib/api";
import { reconcileReservationStatuses } from "@/lib/services/reconciliation";

export const POST = withErrorHandler(async () => {
  await reconcileReservationStatuses();
  return jsonOk({ success: true });
});
