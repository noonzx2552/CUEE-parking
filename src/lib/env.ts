import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("3000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().optional().default(""),
  LINE_CHANNEL_ID: z.string().optional().default(""),
  LINE_CHANNEL_SECRET: z.string().optional().default(""),
  LINE_ADD_FRIEND_URL: z.string().url().optional().or(z.literal("")).default(""),
  DISCORD_WEBHOOK_URL: z.string().url().optional().or(z.literal("")).default(""),
  APP_NAME: z.string().default("CUEE Parking"),
  PARKING_FEE_NORMAL_PER_HOUR: z.coerce.number().nonnegative().default(20),
  PARKING_FEE_EV_PER_HOUR: z.coerce.number().nonnegative().default(30),
  PARKING_FEE_DISABLED_PER_HOUR: z.coerce.number().nonnegative().default(0),
  PARKING_FEE_CURRENCY: z.string().default("THB"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
