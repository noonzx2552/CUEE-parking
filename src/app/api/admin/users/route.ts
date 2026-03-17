import { requireAdminSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { getAdminUsers } from "@/lib/data";

export const GET = withErrorHandler(async () => {
  await requireAdminSession();
  const users = await getAdminUsers();
  return jsonOk({ users });
});
