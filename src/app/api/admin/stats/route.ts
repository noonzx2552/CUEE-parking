import { requireAdminSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { getAdminStats } from "@/lib/data";

export const GET = withErrorHandler(async () => {
  await requireAdminSession();
  const stats = await getAdminStats();
  return jsonOk({ stats });
});
