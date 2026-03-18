import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { loginSchema } from "@/lib/validators/auth";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { loginUser } from "@/lib/services/auth";
import { issueCsrfToken } from "@/lib/security/csrf";
import { getRequestContext } from "@/lib/security/request";
import { sendDiscordEvent } from "@/lib/services/discord";
import { AppError } from "@/lib/errors";

export const POST = withErrorHandler(async (request) => {
  const requestContext = await getRequestContext();
  assertRateLimit(`login:${requestContext.ip}`, AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS);

  const payload = loginSchema.parse(await request.json());

  try {
    const user = await loginUser(payload);
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
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      void sendDiscordEvent("Repeated Login Failure", {
        description: "A login attempt failed.",
        color: 0xef4444,
        fields: [
          {
            name: "Username / Email",
            value: payload.email,
          },
        ],
      });
    }
    throw error;
  }
});
