"use client";

import { BellRing, CheckCircle2, Disc3, Send, Sparkles, Webhook, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getCsrfToken } from "@/lib/web/csrf";

export function DiscordWebhookCard({
  configured,
  webhookLabel,
}: {
  configured: boolean;
  webhookLabel: string;
}) {
  const [message, setMessage] = useState("Test notification from CUEE Parking admin dashboard.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
      <div className="relative overflow-hidden border-b border-zinc-200 bg-[linear-gradient(135deg,#0f172a,#1d4ed8_58%,#38bdf8)] px-6 py-6 text-white">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-12 top-8 h-14 w-14 rounded-full border border-white/20" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">
              <Disc3 className="h-3.5 w-3.5" />
              Discord Webhook
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Notification bridge for admin alerts</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-sky-100/85">
                ส่งเหตุการณ์สำคัญจากระบบจองรถไปยัง Discord ได้ทันที ทั้งการจองใหม่ การยกเลิก และการทดสอบการเชื่อมต่อ
              </p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${configured ? "bg-emerald-400/15 text-emerald-100" : "bg-rose-400/15 text-rose-100"}`}>
            {configured ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {configured ? "Connected" : "Not configured"}
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-zinc-700">
                <Webhook className="h-4 w-4 text-sky-700" />
                <p className="text-sm font-medium">Webhook</p>
              </div>
              <p className="mt-3 break-all font-mono text-xs text-zinc-500">{webhookLabel}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-zinc-700">
                <BellRing className="h-4 w-4 text-sky-700" />
                <p className="text-sm font-medium">Events</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["New reservation", "Cancellation", "Login failure"].map((item) => (
                  <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-zinc-700">
                <Sparkles className="h-4 w-4 text-sky-700" />
                <p className="text-sm font-medium">Status</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-zinc-500">
                {configured
                  ? "Webhook พร้อมรับข้อความทดสอบและ notification จากระบบ"
                  : "ยังไม่ได้ตั้งค่า DISCORD_WEBHOOK_URL ใน environment"}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-[linear-gradient(180deg,#fafafa,#ffffff)] p-5">
            <label className="text-sm font-medium text-zinc-800">ส่งข้อความทดสอบไป Discord</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="mt-3 min-h-32 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-sky-400"
              placeholder="พิมพ์ข้อความที่ต้องการทดสอบส่งไป Discord"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">ข้อความนี้จะถูกส่งผ่าน Discord webhook ปัจจุบันของระบบ</p>
              <Button
                type="button"
                disabled={!configured || isSubmitting}
                className="gap-2"
                onClick={async () => {
                  setIsSubmitting(true);
                  const response = await fetch("/api/notifications/discord/test", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-csrf-token": getCsrfToken(),
                    },
                    body: JSON.stringify({ message }),
                  });

                  const data = await response.json();
                  setIsSubmitting(false);

                  if (!response.ok || !data.result?.ok) {
                    toast.error(data.message ?? "Unable to send Discord test message");
                    return;
                  }

                  toast.success("Discord test message sent");
                }}
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Sending..." : "Send test message"}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-zinc-950 p-5 text-white">
          <p className="text-xs uppercase tracking-[0.22em] text-sky-200">Preview</p>
          <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-200">
                <Disc3 className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">Discord Webhook Test</p>
                <p className="text-sm leading-7 text-zinc-300">{message || "Your test message preview will appear here."}</p>
                <p className="text-xs text-zinc-500">CUEE Parking • embed preview</p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">Design direction</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                ใช้การ์ดสไตล์ dashboard แบบสว่าง-ตัดเข้ม เพื่อให้ส่วน Discord ดูเป็น control center ชัดเจน
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">Admin usage</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                เหมาะกับการตรวจว่า webhook ใช้งานได้จริงก่อน deploy หรือก่อนเปิดให้ผู้ใช้ใช้งานจำนวนมาก
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
