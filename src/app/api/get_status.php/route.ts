import { jsonOk, withErrorHandler } from "@/lib/api";
import { getSmartParkSlots } from "@/lib/services/smartpark";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const slots = await getSmartParkSlots();
  return jsonOk(slots, { headers: { "Access-Control-Allow-Origin": "*" } });
});
