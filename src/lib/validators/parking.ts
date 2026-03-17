import { z } from "zod";

import { sanitizePlainText } from "@/lib/security/sanitize";

export const parkingQuerySchema = z.object({
  zone: z.string().max(40).optional(),
  type: z.enum(["normal", "ev", "disabled"]).optional(),
  status: z.enum(["available", "reserved", "occupied", "maintenance"]).optional(),
  search: z.string().max(40).optional(),
});

export const parkingSpaceSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z0-9-]+$/),
  zone: z.string().min(1).max(40).transform((value) => sanitizePlainText(value).toUpperCase()),
  type: z.enum(["normal", "ev", "disabled"]),
  status: z.enum(["available", "reserved", "occupied", "maintenance"]),
  description: z.string().max(280).optional().transform((value) => sanitizePlainText(value ?? "")),
});
