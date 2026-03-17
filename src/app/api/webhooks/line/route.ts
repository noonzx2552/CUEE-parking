import crypto from "node:crypto";

import { withErrorHandler, jsonOk } from "@/lib/api";
import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/db/mongoose";
import { UserModel } from "@/models/User";

function verifySignature(rawBody: string, signature: string | null) {
  if (!env.LINE_CHANNEL_SECRET || !signature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", env.LINE_CHANNEL_SECRET).update(rawBody).digest("base64");
  return digest === signature;
}

export const POST = withErrorHandler(async (request) => {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifySignature(rawBody, signature)) {
    return jsonOk({ ok: false }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as {
    events?: Array<{
      type?: string;
      source?: { userId?: string };
      message?: { text?: string };
    }>;
  };

  await connectToDatabase();

  for (const event of body.events ?? []) {
    if (event.type !== "message") continue;
    const message = event.message?.text?.trim() ?? "";
    if (!message.toLowerCase().startsWith("bind ")) continue;
    const email = message.slice(5).trim().toLowerCase();
    if (!email || !event.source?.userId) continue;

    await UserModel.findOneAndUpdate({ email }, { $set: { lineUserId: event.source.userId } });
  }

  return jsonOk({ ok: true });
});
