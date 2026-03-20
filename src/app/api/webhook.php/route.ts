import crypto from "node:crypto";

import { jsonOk, withErrorHandler } from "@/lib/api";
import { env } from "@/lib/env";
import { getSmartParkSlots } from "@/lib/services/smartpark";
import { replyLineMessage } from "@/lib/services/line";

function verifyLineSignature(rawBody: string, signature: string | null) {
  if (!env.LINE_CHANNEL_SECRET || !signature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", env.LINE_CHANNEL_SECRET).update(rawBody).digest("base64");
  return digest === signature;
}

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request) => {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return jsonOk({ status: "error", message: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as {
    events?: Array<{
      type?: string;
      replyToken?: string;
      message?: { type?: string; text?: string };
    }>;
  };

  for (const event of body.events ?? []) {
    if (event.type !== "message" || event.message?.type !== "text") continue;

    const replyToken = event.replyToken;
    const incoming = event.message.text?.trim() ?? "";
    if (!replyToken || !incoming) continue;

    const slots = await getSmartParkSlots();
    const vacant = slots.filter((slot) => slot.status === "vacant").length;
    const occupied = slots.length - vacant;
    const normalized = incoming.toLowerCase();

    let replyText = "";
    if (normalized.includes("สถานะ") || normalized.includes("ว่าง") || normalized === "status" || normalized === "?") {
      const lines = [
        "SmartPark Status",
        `อัปเดตล่าสุด ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.`,
        "",
        ...slots.map((slot) => `${slot.status === "vacant" ? "🟢" : "🔴"} ${slot.slot_name} - ${slot.status === "vacant" ? "ว่าง" : "ไม่ว่าง"}`),
        "",
        `ว่าง ${vacant} ช่อง | ไม่ว่าง ${occupied} ช่อง`,
      ];
      replyText = lines.join("\n");
    } else if (normalized.includes("ราคา") || normalized.includes("ค่าจอด")) {
      replyText = "ค่าจอด SmartPark\n30 วินาทีแรก 20 บาท\nหลังจากนั้น +20 บาท ทุก 15 วินาที";
    } else if (normalized.includes("วิธีใช้") || normalized.includes("help")) {
      replyText = "วิธีใช้ SmartPark\n1. สแกน QR ทางเข้า\n2. เพิ่ม LINE และเลือกช่องจอด\n3. รับแจ้งเตือนผ่าน LINE\n4. แสดง QR ตอนออก";
    } else {
      replyText = `SmartPark Bot\nตอนนี้มีช่องว่าง ${vacant} ช่อง\nพิมพ์ 'สถานะ' เพื่อดูทุกช่อง`;
    }

    await replyLineMessage(replyToken, [replyText]);
  }

  return jsonOk({ status: "ok" });
});
