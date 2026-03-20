import { requireAdminSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { getUserById } from "@/lib/db/store";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { lineTestSchema } from "@/lib/validators/admin";
import { pushLineMessage } from "@/lib/services/line";

export const POST = withErrorHandler(async (request) => {
  await verifyCsrfToken(request);
  const admin = await requireAdminSession();
  const payload = lineTestSchema.parse(await request.json());

  const user = await getUserById(admin.id);
  const result = await pushLineMessage(user?.lineUserId, [payload.message]);

  return jsonOk({ result });
});
