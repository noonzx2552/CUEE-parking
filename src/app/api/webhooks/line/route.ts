import crypto from "node:crypto";

import { withErrorHandler, jsonOk } from "@/lib/api";
import { env } from "@/lib/env";
import { findUserByEmail, findUserByLineBindToken, updateUser } from "@/lib/db/store";
import { replyLineMessage } from "@/lib/services/line";

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
      replyToken?: string;
      source?: { userId?: string };
      message?: { text?: string };
    }>;
  };

  for (const event of body.events ?? []) {
    if (event.type !== "message") continue;

    const message = event.message?.text?.trim() ?? "";
    const normalized = message.toLowerCase();
    const sourceUserId = event.source?.userId;
    const replyToken = event.replyToken;

    if (!sourceUserId || !replyToken || !normalized.startsWith("bind ")) {
      continue;
    }

    const bindValue = message.slice(5).trim();
    if (!bindValue) continue;

    const now = new Date();
    const tokenBoundUser = await findUserByLineBindToken(bindValue, now);

    if (tokenBoundUser) {
      await updateUser(tokenBoundUser._id, {
        lineUserId: sourceUserId,
        lineBindToken: null,
        lineBindExpiresAt: null,
      });
      await replyLineMessage(replyToken, ["เชื่อมต่อ LINE กับระบบสำเร็จแล้ว"]);
      continue;
    }

    const emailBoundUser = await findUserByEmail(bindValue.toLowerCase());
    if (emailBoundUser) {
      await updateUser(emailBoundUser._id, {
        lineUserId: sourceUserId,
        lineBindToken: null,
        lineBindExpiresAt: null,
      });
      await replyLineMessage(replyToken, ["เชื่อมต่อ LINE กับระบบสำเร็จแล้ว"]);
      continue;
    }

    await replyLineMessage(replyToken, ["ไม่พบรหัสเชื่อมต่อหรือรหัสหมดอายุแล้ว กรุณากลับไปสร้างรหัสใหม่ในระบบ"]);
  }

  return jsonOk({ ok: true });
});
