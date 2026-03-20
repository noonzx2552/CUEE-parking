import { jsonOk, withErrorHandler } from "@/lib/api";
import { createSmartParkSession, endActiveSessions } from "@/lib/services/smartpark";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request) => {
  const data = (await request.json()) as {
    action?: string;
    slot?: string;
    duration?: number;
    warn?: number;
    user_id?: string;
  };

  const action = (data.action ?? "").trim();
  const slot = (data.slot ?? "").trim();
  const lineUserId = (data.user_id ?? "").trim();

  if (!slot) {
    return jsonOk({ success: false, message: "Slot is required." }, { status: 422 });
  }

  if (action === "start") {
    await endActiveSessions(slot);
    await createSmartParkSession(slot, lineUserId, data.duration, data.warn, "manual");
    return jsonOk({ success: true, action: "started", slot, line_linked: Boolean(lineUserId) });
  }

  if (action === "end") {
    await endActiveSessions(slot);
    return jsonOk({ success: true, action: "ended", slot });
  }

  return jsonOk({ success: false, message: "Unknown action." }, { status: 422 });
});
