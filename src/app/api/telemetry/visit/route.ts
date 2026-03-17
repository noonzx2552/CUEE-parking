import { z } from "zod";

import { jsonOk, withErrorHandler } from "@/lib/api";
import { sendDiscordEvent } from "@/lib/services/discord";
import { getRequestContext } from "@/lib/security/request";

const visitSchema = z.object({
  pathname: z.string().min(1).max(200),
});

export const POST = withErrorHandler(async (request) => {
  const payload = visitSchema.parse(await request.json());
  const requestContext = await getRequestContext();

  await sendDiscordEvent(
    "Website Visit",
    `A visitor opened ${payload.pathname}\nIP: ${requestContext.ip}\nUA: ${requestContext.userAgent.slice(0, 250)}`,
  );

  return jsonOk({ ok: true });
});
