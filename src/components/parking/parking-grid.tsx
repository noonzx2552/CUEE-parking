"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CarFront, QrCode, ShieldCheck, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n";
import { REALTIME_REFRESH_INTERVAL_MS } from "@/lib/constants";
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
  if (!isThai) {
    return toTitleCase(status);
  }

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
      <Card>
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

        return (
          <Card key={space._id} className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-zinc-900">{space.code}</p>
                <p className="text-sm text-zinc-500">{isThai ? `โซน ${space.zone}` : `Zone ${space.zone}`}</p>
              </div>
              <Badge className={parkingStatusColor(space.status)}>
                {translateParkingStatus(space.status, isThai)}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-sm text-zinc-600">
              {space.type === "ev" ? (
                <Zap className="h-4 w-4" />
              ) : space.type === "disabled" ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <CarFront className="h-4 w-4" />
              )}
              <span>{translateParkingType(space.type, isThai)}</span>
            </div>

            <p className="text-sm text-zinc-600">
              {space.description || (isThai ? "ไม่มีรายละเอียดเพิ่มเติม" : "No additional notes")}
            </p>

            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              {space.status === "maintenance" ? (
                <Button className="w-full" disabled>
                  {isThai ? "จองช่องนี้" : "Reserve this spot"}
                </Button>
              ) : (
                <Link href={`/reservations/new?parkingSpaceId=${space._id}`}>
                  <Button className="w-full">{isThai ? "จองช่องนี้" : "Reserve this spot"}</Button>
                </Link>
              )}

              {canScan ? (
                <Link href="/scan">
                  <Button variant="ghost" className="w-full gap-2">
                    <QrCode className="h-4 w-4" />
                    {isThai ? "สแกนเข้าออก" : "Scan access"}
                  </Button>
                </Link>
              ) : (
                <Button variant="ghost" className="w-full gap-2" disabled>
                  <QrCode className="h-4 w-4" />
                  {isThai ? "สแกนได้เมื่อจองแล้ว" : "Scan after booking"}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
