import mongoose from "mongoose";

import { withErrorHandler, jsonOk } from "@/lib/api";
import { connectToDatabase } from "@/lib/db/mongoose";
import { env } from "@/lib/env";

export const GET = withErrorHandler(async () => {
  await connectToDatabase();

  return jsonOk({
    ok: true,
    readyState: mongoose.connection.readyState,
    dbName: mongoose.connection.name,
    hasMongoUri: Boolean(env.MONGODB_URI),
    hasSessionSecret: Boolean(env.SESSION_SECRET),
    hasDiscordWebhook: Boolean(env.DISCORD_WEBHOOK_URL),
  });
});
