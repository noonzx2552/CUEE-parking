import { z } from "zod";

import { sanitizePlainText } from "@/lib/security/sanitize";

export const adminUserUpdateSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  isActive: z.boolean().optional(),
  lineUserId: z.string().max(80).optional().transform((value) => sanitizePlainText(value ?? "")),
});

export const lineTestSchema = z.object({
  message: z.string().min(1).max(200).transform(sanitizePlainText),
});

export const discordTestSchema = z.object({
  message: z.string().min(1).max(200).transform(sanitizePlainText),
});
