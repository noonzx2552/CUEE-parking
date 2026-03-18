"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CarFront, QrCode, ShieldCheck, Wrench, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { REALTIME_REFRESH_INTERVAL_MS } from "@/lib/constants";
import type { Locale } from "@/lib/i18n";
import { parkingStatusColor, toTitleCase } from "@/lib/utils";
import type { ParkingStatus, ParkingType } from "@/types";

type Space = {
  _id: string;
  code: string;
  zone: string;
  type: ParkingType;
  status: ParkingStatus;
  description: string;
};

function translateParkingType(type: ParkingType, isThai: boolean) {
  if (type === "ev") return "EV";
  if (type === "disabled") return isThai ? "ผู้พิการ" : "Disabled";
  return isThai ? "ปกติ" : "Normal";
}

function translateParkingStatus(status: ParkingStatus, isThai: boolean) {
  if (!isThai) return toTitleCase(status);

  switch (status) {
    case "available":
      return "ว่าง";
    case "reserved":
      return "ถูกจอง";
    case "occupied":
      return "มีรถจอด";
    case "maintenance":
      return "ปิดปรับปรุง";
  }
}

function getParkingTypeIcon(type: ParkingType) {
  if (type === "ev") return <Zap className="h-4 w-4" />;
  if (type === "disabled") return <ShieldCheck className="h-4 w-4" />;
  return <CarFront className="h-4 w-4" />;
}

function getStatusHint(status: ParkingStatus, isThai: boolean) {
  switch (status) {
    case "available":
      return isThai ? "พร้อมจองได้ทันที" : "Ready to reserve now";
    case "reserved":
      return isThai ? "มีการจองรอใช้งาน" : "Reserved for an upcoming booking";
    case "occupied":
      return isThai ? "มีรถอยู่ในช่องจอดนี้" : "A car is currently parked here";
    case "maintenance":
      return isThai ? "ยังไม่พร้อมให้ใช้งาน" : "Temporarily unavailable";
  }
}

export function ParkingGrid({
  initialSpaces,
  queryString,
  locale,
  scannableSpaceIds,
}: {
  initialSpaces: Space[];
  queryString: string;
  locale: Locale;
  scannableSpaceIds: string[];
}) {
  const [spaces, setSpaces] = useState(initialSpaces);
  const isThai = locale === "th";

  useEffect(() => {
    setSpaces(initialSpaces);
  }, [initialSpaces]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/parking-spaces${queryString ? `?${queryString}` : ""}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();
      setSpaces(data.spaces);
    }, REALTIME_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [queryString]);

  if (!spaces.length) {
    return (
      <Card className="rounded-3xl border-dashed">
        <p className="text-sm text-zinc-500">
          {isThai ? "ไม่พบช่องจอดที่ตรงกับตัวกรองที่เลือก" : "No parking spaces match the selected filters."}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {spaces.map((space) => {
        const canScan = scannableSpaceIds.includes(space._id);
        const isMaintenance = space.status === "maintenance";

        return (
          <Card
            key={space._id}
            className={`rounded-3xl border transition ${
              isMaintenance ? "border-rose-200 bg-rose-50/30" : "border-zinc-200 bg-white"
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-zinc-950">{space.code}</p>
                  <p className="text-sm text-zinc-500">{isThai ? `โซน ${space.zone}` : `Zone ${space.zone}`}</p>
                </div>
                <Badge className={parkingStatusColor(space.status)}>
                  {translateParkingStatus(space.status, isThai)}
                </Badge>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                {getParkingTypeIcon(space.type)}
                <span>{translateParkingType(space.type, isThai)}</span>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-white/80 px-3 py-3 text-sm text-zinc-600">
                {space.status === "occupied" ? (
                  <div className="flex items-center gap-2 font-medium text-zinc-800">
                    <CarFront className="h-4 w-4" />
                    <span>{isThai ? "มีรถจอดอยู่ตอนนี้" : "A car is parked right now"}</span>
                  </div>
                ) : space.status === "maintenance" ? (
                  <div className="flex items-center gap-2 font-medium text-rose-700">
                    <Wrench className="h-4 w-4" />
                    <span>{isThai ? "ช่องนี้ปิดปรับปรุงชั่วคราว" : "This space is under maintenance"}</span>
                  </div>
                ) : (
                  <p>{getStatusHint(space.status, isThai)}</p>
                )}
              </div>

              <p className="text-sm leading-6 text-zinc-600">
                {space.description || (isThai ? "ไม่มีรายละเอียดเพิ่มเติม" : "No additional notes")}
              </p>

              <div className={`grid gap-2 pt-2 ${canScan ? "sm:grid-cols-2" : ""}`}>
                {isMaintenance ? (
                  <Button className="w-full rounded-2xl" disabled>
                    {isThai ? "ยังจองไม่ได้" : "Unavailable"}
                  </Button>
                ) : (
                  <Link href={`/reservations/new?parkingSpaceId=${space._id}`}>
                    <Button className="w-full rounded-2xl">{isThai ? "จองช่องนี้" : "Reserve this spot"}</Button>
                  </Link>
                )}

                {canScan ? (
                  <Link href="/scan">
                    <Button variant="ghost" className="w-full gap-2 rounded-2xl">
                      <QrCode className="h-4 w-4" />
                      {isThai ? "สแกนเข้าออก" : "Scan access"}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
