"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageSquareMore } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getCsrfToken } from "@/lib/web/csrf";

export function LineConnectLauncher({
  hasLineConnection,
  currentName,
}: {
  hasLineConnection?: boolean;
  currentName: string;
}) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  async function openLineConnect() {
    setIsConnecting(true);

    const response = await fetch("/api/profile/line-connect", {
      method: "POST",
      headers: {
        "x-csrf-token": getCsrfToken(),
      },
    });
    const data = await response.json();

    setIsConnecting(false);

    if (!response.ok) {
      toast.error(data.message ?? "Unable to prepare LINE connection");
      return;
    }

    if (!data.connectUrl) {
      toast.error("ยังไม่ได้ตั้งค่า LINE_OA_ID สำหรับเชื่อมต่ออัตโนมัติ");
      return;
    }

    window.location.href = data.connectUrl;
  }

  async function disconnectLine() {
    setIsDisconnecting(true);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({
        name: currentName,
        lineUserId: "",
      }),
    });
    const data = await response.json();

    setIsDisconnecting(false);

    if (!response.ok) {
      toast.error(data.message ?? "Unable to disconnect LINE");
      return;
    }

    toast.success("ยกเลิกการเชื่อม LINE แล้ว");
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white p-3 text-sky-700 shadow-sm">
          <MessageSquareMore className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-zinc-950">เชื่อมต่อ LINE กับระบบ</p>
          <p className="text-sm leading-6 text-zinc-600">
            กดปุ่มด้านล่างเพื่อเปิด LINE ของระบบ จากนั้นให้กดส่งข้อความในแชตด้วย เพื่อให้ระบบรับคำสั่ง bind และผูกบัญชีให้สำเร็จ
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {hasLineConnection ? null : (
          <Button type="button" onClick={() => void openLineConnect()} disabled={isConnecting}>
            {isConnecting ? "กำลังเปิด LINE..." : "เปิด LINE เพื่อเชื่อมต่อ"}
          </Button>
        )}

        <Link href="/dashboard">
          <Button type="button" variant="ghost">
            กลับไปหน้าแดชบอร์ด
          </Button>
        </Link>

        {hasLineConnection ? (
          <Button type="button" variant="ghost" onClick={() => void disconnectLine()} disabled={isDisconnecting}>
            {isDisconnecting ? "กำลังยกเลิก..." : "ยกเลิกการเชื่อมต่อ"}
          </Button>
        ) : null}
      </div>

      <div className="mt-5 rounded-2xl border border-white/90 bg-white/90 p-4">
        <p className="text-sm font-medium text-zinc-900">สถานะ: {hasLineConnection ? "เชื่อม LINE แล้ว" : "ยังไม่ได้เชื่อม LINE"}</p>
        <p className="mt-2 text-sm text-zinc-600">
          {hasLineConnection
            ? "ระบบพร้อมส่งแจ้งเตือนการจองเข้า LINE ของคุณ"
            : "หลังจาก LINE เปิดขึ้นมาแล้ว ให้กดส่งข้อความในแชตทันที แล้วรอข้อความตอบกลับว่าเชื่อมต่อสำเร็จ"}
        </p>
      </div>
    </div>
  );
}
