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
    const normalized = message.toLowerCase();
    const sourceUserId = event.source?.userId;

    if (!sourceUserId || !normalized.startsWith("bind ")) {
      continue;
    }

    const bindValue = message.slice(5).trim();
    if (!bindValue) continue;

    const now = new Date();

    const tokenBoundUser = await UserModel.findOneAndUpdate(
      {
        lineBindToken: bindValue,
        lineBindExpiresAt: { $gt: now },
      },
      {
        $set: {
          lineUserId: sourceUserId,
        },
        $unset: {
          lineBindToken: 1,
          lineBindExpiresAt: 1,
        },
      },
      { new: true },
    );

    if (tokenBoundUser) {
      continue;
    }

    const email = bindValue.toLowerCase();
    await UserModel.findOneAndUpdate(
      { email },
      {
        $set: { lineUserId: sourceUserId },
        $unset: { lineBindToken: 1, lineBindExpiresAt: 1 },
      },
    );
  }

  return jsonOk({ ok: true });
});
