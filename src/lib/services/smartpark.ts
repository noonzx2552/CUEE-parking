import crypto from "node:crypto";

import { headers } from "next/headers";

import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/db/mongoose";
import { SmartParkSessionModel } from "@/models/SmartParkSession";
import { SmartParkSlotModel } from "@/models/SmartParkSlot";

export const SMARTPARK_SLOT_NAMES = env.SMARTPARK_SLOTS.split(",")
  .map((slot) => slot.trim())
  .filter(Boolean);

export async function ensureSmartParkSlots() {
  await connectToDatabase();

  const existing = await SmartParkSlotModel.find(
    { slotName: { $in: SMARTPARK_SLOT_NAMES } },
    { slotName: 1 },
  ).lean();
  const existingNames = new Set(existing.map((item) => item.slotName));

  const missing = SMARTPARK_SLOT_NAMES.filter((slot) => !existingNames.has(slot));
  if (missing.length === 0) {
    return;
  }

  await SmartParkSlotModel.insertMany(
    missing.map((slotName) => ({
      slotName,
      status: "vacant" as const,
      updatedBy: "system",
    })),
    { ordered: false },
  ).catch(() => undefined);
}

export async function getSmartParkSlots() {
  await ensureSmartParkSlots();

  const slots = await SmartParkSlotModel.find({}, { slotName: 1, status: 1 })
    .sort({ slotName: 1 })
    .lean();

  return slots.map((slot) => ({
    slot_name: slot.slotName,
    status: slot.status,
  }));
}

export async function getSmartParkSlot(slotName: string) {
  await ensureSmartParkSlots();
  return SmartParkSlotModel.findOne({ slotName }).lean();
}

export async function setSmartParkSlotStatus(slotName: string, status: "vacant" | "occupied", source: string) {
  await ensureSmartParkSlots();

  return SmartParkSlotModel.findOneAndUpdate(
    { slotName },
    { $set: { slotName, status, updatedBy: source } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
}

export async function endActiveSessions(slotName: string) {
  await connectToDatabase();
  const endedAt = new Date();
  await SmartParkSessionModel.updateMany(
    { slotName, ended: false },
    { $set: { ended: true, endedAt } },
  );
}

export async function createSmartParkSession(
  slotName: string,
  lineUserId = "",
  durationMinutes = env.DEFAULT_PARKING_DURATION_MINUTES,
  warnMinutes = env.DEFAULT_WARNING_MINUTES,
  source = "system",
) {
  await connectToDatabase();

  return SmartParkSessionModel.create({
    slotName,
    lineUserId,
    startTime: new Date(),
    durationMinutes,
    warnMinutes,
    ended: false,
    source,
  });
}

export async function attachLineUserToLatestSession(slotName: string, lineUserId: string) {
  await connectToDatabase();

  const session = await SmartParkSessionModel.findOneAndUpdate(
    { slotName, ended: false },
    { $set: { lineUserId } },
    { sort: { createdAt: -1 }, new: true },
  ).lean();

  return Boolean(session);
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
