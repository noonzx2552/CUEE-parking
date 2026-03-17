import { env } from "@/lib/env";

export async function sendDiscordEvent(title: string, description: string) {
  if (!env.DISCORD_WEBHOOK_URL) {
    return { ok: false, skipped: true as const };
  }

  try {
    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title,
            description,
            color: 0x2563eb,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    return { ok: response.ok, skipped: false as const };
  } catch (error) {
    console.error("Discord webhook failed", String(error));
    return { ok: false, skipped: false as const };
  }
}
