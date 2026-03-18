import { env } from "@/lib/env";

type DiscordField = {
  name: string;
  value: string;
  inline?: boolean;
};

type DiscordPayload =
  | string
  | {
      description?: string;
      color?: number;
      fields?: DiscordField[];
    };

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

export async function sendDiscordEvent(title: string, payload: DiscordPayload) {
  if (!env.DISCORD_WEBHOOK_URL) {
    return { ok: false, skipped: true as const };
  }

  const description = typeof payload === "string" ? payload : payload.description ?? "";
  const fields = typeof payload === "string" ? [] : payload.fields ?? [];
  const color = typeof payload === "string" ? 0x2563eb : payload.color ?? 0x2563eb;

  try {
    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "CUEE Parking",
        embeds: [
          {
            title,
            description: truncate(description, 4000),
            color,
            fields: fields.map((field) => ({
              name: truncate(field.name, 256),
              value: truncate(field.value, 1024),
              inline: field.inline ?? false,
            })),
            timestamp: new Date().toISOString(),
            footer: {
              text: `${env.APP_NAME} • webhook event`,
            },
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
