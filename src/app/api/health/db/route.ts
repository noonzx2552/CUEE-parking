import { withErrorHandler, jsonOk } from "@/lib/api";
import { connectToDatabase } from "@/lib/db/redis";
import { env } from "@/lib/env";

export const GET = withErrorHandler(async () => {
  const redis = await connectToDatabase();
  const ping = await redis.ping();

  return jsonOk({
    ok: ping === "PONG",
    engine: "redis",
    ping,
    hasRedisUrl: Boolean(env.REDIS_URL),
    hasSessionSecret: Boolean(env.SESSION_SECRET),
    hasDiscordWebhook: Boolean(env.DISCORD_WEBHOOK_URL),
  });
});
