import { clsx, type ClassValue } from "clsx";
import { format, isAfter, isBefore } from "date-fns";
import { twMerge } from "tailwind-merge";

import type { ParkingStatus, ReservationStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: Date | string) {
  return format(new Date(value), "dd MMM yyyy, HH:mm");
}

export function formatThailandSystemTime(value: Date | string, locale: "th" | "en" = "th") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function reservationOverlaps(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
) {
  return isBefore(startA, endB) && isAfter(endA, startB);
}

export function parkingStatusColor(status: ParkingStatus) {
  switch (status) {
    case "available":
      return "bg-emerald-500/15 text-emerald-700 ring-emerald-600/20";
    case "reserved":
      return "bg-amber-500/15 text-amber-700 ring-amber-600/20";
    case "occupied":
      return "bg-sky-500/15 text-sky-700 ring-sky-600/20";
    case "maintenance":
      return "bg-rose-500/15 text-rose-700 ring-rose-600/20";
  }
}

export function reservationStatusColor(status: ReservationStatus) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/15 text-emerald-700 ring-emerald-600/20";
    case "pending":
      return "bg-amber-500/15 text-amber-700 ring-amber-600/20";
    case "checked-in":
      return "bg-sky-500/15 text-sky-700 ring-sky-600/20";
    case "cancelled":
      return "bg-rose-500/15 text-rose-700 ring-rose-600/20";
    case "expired":
      return "bg-zinc-500/15 text-zinc-700 ring-zinc-600/20";
    case "completed":
      return "bg-violet-500/15 text-violet-700 ring-violet-600/20";
  }
}

export function toTitleCase(value: string) {
  return value
    .split("-")
    .join(" ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function serializeObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
