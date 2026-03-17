import { env } from "@/lib/env";

type LinePushResult =
  | { ok: true }
  | { ok: false; reason: "missing-binding" | "missing-token" | "request-failed" };

export async function pushLineMessage(lineUserId: string | null | undefined, messages: string[]) {
  if (!lineUserId) {
    return { ok: false, reason: "missing-binding" } satisfies LinePushResult;
  }

  if (!env.LINE_CHANNEL_ACCESS_TOKEN) {
    return { ok: false, reason: "missing-token" } satisfies LinePushResult;
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: messages.map((text) => ({
          type: "text",
          text,
        })),
      }),
    });

    if (!response.ok) {
      console.error("LINE push failed", response.status, await response.text());
      return { ok: false, reason: "request-failed" } satisfies LinePushResult;
    }

    return { ok: true } satisfies LinePushResult;
  } catch (error) {
    console.error("LINE request failed", String(error));
    return { ok: false, reason: "request-failed" } satisfies LinePushResult;
  }
}
