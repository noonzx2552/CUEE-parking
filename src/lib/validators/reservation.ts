import { isAfter } from "date-fns";
import { z } from "zod";

import { sanitizePlainText } from "@/lib/security/sanitize";

export const reservationCreateSchema = z
  .object({
    parkingSpaceId: z.string().min(1),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    note: z.string().max(280).optional().transform((value) => sanitizePlainText(value ?? "")),
  })
  .refine((value) => isAfter(value.endTime, value.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const reservationCancelSchema = z.object({
  note: z.string().max(280).optional().transform((value) => sanitizePlainText(value ?? "")),
});

export const adminReservationUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "checked-in", "cancelled", "expired", "completed"]),
  note: z.string().max(280).optional().transform((value) => sanitizePlainText(value ?? "")),
});

export const reservationQrSchema = z.object({
  mode: z.enum(["entry", "exit"]),
});

export const reservationAccessSchema = z.object({
  mode: z.enum(["entry", "exit"]),
  token: z.string().min(1),
});
