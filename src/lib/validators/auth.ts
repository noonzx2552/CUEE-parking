import { z } from "zod";

import { sanitizePlainText } from "@/lib/security/sanitize";

function getPasswordStrengthScore(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return score;
}

function isStrongPassword(password: string) {
  return getPasswordStrengthScore(password) >= 4;
}

export const registerSchema = z.object({
  name: z.string().min(2).max(120).transform(sanitizePlainText),
  email: z.email().max(120).transform((value) => value.trim().toLowerCase()),
  password: z
    .string()
    .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
    .max(128)
    .refine(isStrongPassword, "รหัสผ่านต้องแข็งแรงระดับ Strong ขึ้นไป"),
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
