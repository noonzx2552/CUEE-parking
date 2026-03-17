"use client";

import { useEffect, useState } from "react";
import { CarFront, ShieldCheck, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

export function ParkingGrid({
  initialSpaces,
  queryString,
}: {
  initialSpaces: Space[];
  queryString: string;
}) {
  const [spaces, setSpaces] = useState(initialSpaces);

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
    }, 20000);

    return () => window.clearInterval(interval);
  }, [queryString]);

  if (!spaces.length) {
    return (
      <Card>
        <p className="text-sm text-zinc-500">No parking spaces match the selected filters.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {spaces.map((space) => (
        <Card key={space._id} className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold text-zinc-900">{space.code}</p>
              <p className="text-sm text-zinc-500">Zone {space.zone}</p>
            </div>
            <Badge className={parkingStatusColor(space.status)}>{toTitleCase(space.status)}</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            {space.type === "ev" ? <Zap className="h-4 w-4" /> : space.type === "disabled" ? <ShieldCheck className="h-4 w-4" /> : <CarFront className="h-4 w-4" />}
            <span>{toTitleCase(space.type)}</span>
          </div>
          <p className="text-sm text-zinc-600">{space.description || "No additional notes"}</p>
        </Card>
      ))}
    </div>
  );
}
