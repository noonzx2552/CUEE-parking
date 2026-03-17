import { withErrorHandler, jsonOk } from "@/lib/api";
import { clearSession } from "@/lib/auth/session";
import { verifyCsrfToken } from "@/lib/security/csrf";

export const POST = withErrorHandler(async (request) => {
  await verifyCsrfToken(request);
  await clearSession();
  return jsonOk({ success: true });
});
