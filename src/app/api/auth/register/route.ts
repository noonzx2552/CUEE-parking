import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { registerSchema } from "@/lib/validators/auth";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { registerUser } from "@/lib/services/auth";
import { issueCsrfToken } from "@/lib/security/csrf";
import { getRequestContext } from "@/lib/security/request";

export const POST = withErrorHandler(async (request) => {
  const requestContext = await getRequestContext();
  assertRateLimit(`register:${requestContext.ip}`, AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS);

  const payload = registerSchema.parse(await request.json());
  const user = await registerUser(payload);
  const csrfToken = await issueCsrfToken();

  return jsonOk({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    csrfToken,
  });
});
