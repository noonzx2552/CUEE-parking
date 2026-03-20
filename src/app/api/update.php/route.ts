import { AppError } from "@/lib/errors";
import { jsonOk, withErrorHandler } from "@/lib/api";
import {
  assertSmartParkMethod,
  createSmartParkSession,
  endActiveSessions,
  getSmartParkSlot,
  setSmartParkSlotStatus,
  validateSmartParkDeviceRequest,
} from "@/lib/services/smartpark";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request) => {
  assertSmartParkMethod(request, "POST");

  const rawBody = await request.text();
  const data = JSON.parse(rawBody || "{}") as {
    slot?: string;
    status?: "vacant" | "occupied";
    source?: string;
  };

  const slot = (data.slot ?? "").trim();
  const status = data.status;
  const source = (data.source ?? "auto").trim();

  if (source === "sensor") {
    const validSignature = await validateSmartParkDeviceRequest(request, rawBody);
    if (!validSignature) {
      throw new AppError("Unauthorized device request", 401, true);
    }
  }

  if (!slot || (status !== "vacant" && status !== "occupied")) {
    throw new AppError("Invalid slot or status", 422, true);
  }

  const current = await getSmartParkSlot(slot);
  const currentStatus = current?.status ?? "";

  await setSmartParkSlotStatus(slot, status, source);

  if (status !== currentStatus) {
    if (status === "occupied") {
      await endActiveSessions(slot);
      await createSmartParkSession(slot, "", undefined, undefined, source);
    } else {
      await endActiveSessions(slot);
    }
  }

  return jsonOk({
    success: true,
    slot,
    status,
    changed: status !== currentStatus,
  });
});
