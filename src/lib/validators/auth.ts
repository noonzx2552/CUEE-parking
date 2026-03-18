import { z } from "zod";

import { sanitizePlainText } from "@/lib/security/sanitize";

export const registerSchema = z.object({
  name: z.string().min(2).max(120).transform(sanitizePlainText),
  email: z.email().max(120).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร").max(128),
  lineUserId: z
    .string()
    .max(80)
    .optional()
    .transform((value) => (value ? sanitizePlainText(value) : "")),
});

export const loginSchema = z.object({
  email: z.email().max(120).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร").max(128),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(120).transform(sanitizePlainText),
  lineUserId: z
    .string()
    .max(80)
    .optional()
    .transform((value) => (value ? sanitizePlainText(value) : "")),
});
