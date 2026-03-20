import { jsonOk, withErrorHandler } from "@/lib/api";
import { pushLineMessage } from "@/lib/services/line";

function formatRemainingText(seconds: number) {
  if (seconds <= 0) return "0 วินาที";
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  if (minutes > 0 && remainSeconds > 0) return `${minutes} นาที ${remainSeconds} วินาที`;
  if (minutes > 0) return `${minutes} นาที`;
  return `${remainSeconds} วินาที`;
}

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request) => {
  const data = (await request.json()) as {
    user_id?: string;
    slot?: string;
    type?: string;
    remaining?: number;
    fee?: number;
    period?: number;
  };

  const userId = (data.user_id ?? "").trim();
  const slot = (data.slot ?? "ไม่ระบุช่อง").trim();
  const type = (data.type ?? "warn").trim();

  if (!userId) {
    return jsonOk({ status: "error", message: "User ID is required." }, { status: 422 });
  }

  let message = "";
  if (type === "billing") {
    const fee = Number(data.fee ?? 0);
    const period = Number(data.period ?? 1);
    message = `💳 ช่อง ${slot}\nค่าจอดสะสม ${fee} บาท\nเกินเวลามาแล้ว ${period * 15} วินาที`;
  } else if (type === "expired") {
    message = `🚨 ช่อง ${slot}\nเวลาจอดหมดแล้ว กรุณานำรถออกทันที`;
  } else {
    message = `⚠️ ช่อง ${slot}\nเหลือเวลาจอดอีก ${formatRemainingText(Number(data.remaining ?? 0))}`;
  }

  const result = await pushLineMessage(userId, [message]);
  return jsonOk({ status: result.ok ? "success" : "error", result });
});
