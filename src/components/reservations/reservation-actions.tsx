"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { QrCode } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getCsrfToken } from "@/lib/web/csrf";

type QrState = {
  mode: "entry" | "exit";
  qrDataUrl: string;
  accessUrl: string;
  expiresAt: string;
};

export function ReservationActions({
  reservationId,
  reservationStatus,
}: {
  reservationId: string;
  reservationStatus: string;
}) {
  const router = useRouter();
  const [qrState, setQrState] = useState<QrState | null>(null);
  const [loadingMode, setLoadingMode] = useState<"entry" | "exit" | "cancel" | null>(null);

  const canCancel = ["pending", "confirmed"].includes(reservationStatus);
  const canGenerateEntryQr = ["pending", "confirmed"].includes(reservationStatus);
  const canGenerateExitQr = reservationStatus === "checked-in";

  async function generateQr(mode: "entry" | "exit") {
    setLoadingMode(mode);
    const response = await fetch(`/api/reservations/${reservationId}/qr?mode=${mode}`, {
      cache: "no-store",
    });
    const data = await response.json();
    setLoadingMode(null);

    if (!response.ok) {
      toast.error(data.message ?? "Unable to generate QR");
      return;
    }

    setQrState({
      mode,
      qrDataUrl: data.qrDataUrl,
      accessUrl: data.accessUrl,
      expiresAt: data.expiresAt,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canCancel ? (
          <Button
            variant="danger"
            disabled={loadingMode !== null}
            onClick={async () => {
              setLoadingMode("cancel");
              const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "x-csrf-token": getCsrfToken(),
                },
                body: JSON.stringify({}),
              });

              const data = await response.json();
              setLoadingMode(null);
              if (!response.ok) {
                toast.error(data.message ?? "Unable to cancel reservation");
                return;
              }

              toast.success("Reservation cancelled");
              router.refresh();
            }}
          >
            ยกเลิก
          </Button>
        ) : null}

        {canGenerateEntryQr ? (
          <Button variant="ghost" className="gap-2" disabled={loadingMode !== null} onClick={() => void generateQr("entry")}>
            <QrCode className="h-4 w-4" />
            {loadingMode === "entry" ? "กำลังสร้าง QR..." : "QR เข้า"}
          </Button>
        ) : null}

        {canGenerateExitQr ? (
          <Button variant="ghost" className="gap-2" disabled={loadingMode !== null} onClick={() => void generateQr("exit")}>
            <QrCode className="h-4 w-4" />
            {loadingMode === "exit" ? "กำลังสร้าง QR..." : "QR ออก"}
          </Button>
        ) : null}

        <Button variant="ghost" onClick={() => router.push("/scan")}>
          เปิดหน้าสแกน
        </Button>
      </div>

      {qrState ? (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-sky-700">
                {qrState.mode === "entry" ? "QR สำหรับเข้า" : "QR สำหรับออก"}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                QR นี้จะถูกสร้างใหม่ทุกครั้งที่กด และหมดอายุเวลา {new Date(qrState.expiresAt).toLocaleTimeString()}
              </p>
            </div>
            <a href={qrState.accessUrl} className="text-sm font-medium text-sky-700">
              เปิดลิงก์สแกน
            </a>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Image
              src={qrState.qrDataUrl}
              alt="Reservation QR code"
              width={180}
              height={180}
              className="rounded-2xl border border-white bg-white p-2"
            />
            <p className="max-w-sm text-sm text-zinc-600">
              ใช้กล้องมือถือสแกนแล้วระบบจะเด้งเข้าเว็บโดยตรง ถ้ายังไม่ login ระบบจะพาไปหน้า login ก่อน
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
