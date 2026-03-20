import { withErrorHandler, jsonOk } from "@/lib/api";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { reconcileReservationStatuses } from "@/lib/services/reconciliation";

async function runReconciliation(request: Request) {
  if (env.CRON_SECRET) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${env.CRON_SECRET}`) {
      throw new AppError("Unauthorized", 401);
    }
  }

  await reconcileReservationStatuses();
  return jsonOk({ success: true });
}

export const GET = withErrorHandler(async (request) => runReconciliation(request));

export const POST = withErrorHandler(async (request) => runReconciliation(request));
