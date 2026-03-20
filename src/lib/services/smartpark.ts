import crypto from "node:crypto";

import { headers } from "next/headers";

import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import {
  createSmartParkSessionRecord,
  getSmartParkSlotRecord,
  listSmartParkSessions,
  listSmartParkSlots,
  saveSmartParkSlot,
  updateSmartParkSession,
} from "@/lib/db/store";

export const SMARTPARK_SLOT_NAMES = env.SMARTPARK_SLOTS.split(",")
  .map((slot) => slot.trim())
  .filter(Boolean);

export async function ensureSmartParkSlots() {
  const existing = await listSmartParkSlots();
  const existingNames = new Set(existing.map((item) => item.slotName));

  for (const slotName of SMARTPARK_SLOT_NAMES) {
    if (!existingNames.has(slotName)) {
      await saveSmartParkSlot({
        slotName,
        status: "vacant",
        updatedBy: "system",
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

export async function getSmartParkSlots() {
  await ensureSmartParkSlots();

  return (await listSmartParkSlots()).map((slot) => ({
    slot_name: slot.slotName,
    status: slot.status,
  }));
}

export async function getSmartParkSlot(slotName: string) {
  await ensureSmartParkSlots();
  return getSmartParkSlotRecord(slotName);
}

export async function setSmartParkSlotStatus(slotName: string, status: "vacant" | "occupied", source: string) {
  await ensureSmartParkSlots();

  return saveSmartParkSlot({
    slotName,
    status,
    updatedBy: source,
    updatedAt: new Date().toISOString(),
  });
}

export async function endActiveSessions(slotName: string) {
  const endedAt = new Date().toISOString();
  const sessions = await listSmartParkSessions();

  for (const session of sessions) {
    if (session.slotName === slotName && !session.ended) {
      await updateSmartParkSession(session._id, { ended: true, endedAt });
    }
  }
}

export async function createSmartParkSession(
  slotName: string,
  lineUserId = "",
  durationMinutes = env.DEFAULT_PARKING_DURATION_MINUTES,
  warnMinutes = env.DEFAULT_WARNING_MINUTES,
  source = "system",
) {
  return createSmartParkSessionRecord({
    slotName,
    lineUserId,
    startTime: new Date().toISOString(),
    durationMinutes,
    warnMinutes,
    ended: false,
    endedAt: null,
    source,
  });
}

export async function attachLineUserToLatestSession(slotName: string, lineUserId: string) {
  const sessions = await listSmartParkSessions();
  const session = sessions.find((item) => item.slotName === slotName && !item.ended);

  if (!session) {
    return false;
  }

  await updateSmartParkSession(session._id, { lineUserId });
  return true;
}

export async function validateSmartParkDeviceRequest(request: Request, rawBody: string) {
  const headerList = await headers();
  const apiKey = headerList.get("x-api-key")?.trim() ?? request.headers.get("x-api-key")?.trim() ?? "";
  const timestamp = headerList.get("x-timestamp")?.trim() ?? request.headers.get("x-timestamp")?.trim() ?? "";
  const signature = headerList.get("x-signature")?.trim() ?? request.headers.get("x-signature")?.trim() ?? "";

  if (!env.DEVICE_API_KEY || !apiKey || !timestamp || !signature) {
    return false;
  }

  const providedKeyBuffer = Buffer.from(apiKey);
  const expectedKeyBuffer = Buffer.from(env.DEVICE_API_KEY);
  if (providedKeyBuffer.length !== expectedKeyBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(providedKeyBuffer, expectedKeyBuffer)) {
    return false;
  }

  if (!/^\d+$/.test(timestamp)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const requestTs = Number(timestamp);
  if (Math.abs(now - requestTs) > env.DEVICE_HMAC_WINDOW_SECONDS) {
    return false;
  }

  const expected = crypto.createHmac("sha256", env.DEVICE_API_KEY).update(`${timestamp}.${rawBody}`).digest("hex");
  const providedSignatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expected);

  if (providedSignatureBuffer.length !== expectedSignatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer);
}

export function assertSmartParkMethod(request: Request, method: string) {
  if (request.method.toUpperCase() !== method.toUpperCase()) {
    throw new AppError("Method not allowed", 405, true);
  }
}
