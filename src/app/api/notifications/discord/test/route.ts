import { requireAdminSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { sendDiscordEvent } from "@/lib/services/discord";
import { discordTestSchema } from "@/lib/validators/admin";

export const POST = withErrorHandler(async (request) => {
  await verifyCsrfToken(request);
  await requireAdminSession();
  const payload = discordTestSchema.parse(await request.json());

  const result = await sendDiscordEvent("Discord Webhook Test", payload.message);
  return jsonOk({ result });
});
