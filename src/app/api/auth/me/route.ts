import { withErrorHandler, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { issueCsrfToken } from "@/lib/security/csrf";

export const GET = withErrorHandler(async () => {
  const user = await getCurrentUser();
  const csrfToken = await issueCsrfToken();
  return jsonOk({ user, csrfToken });
});
