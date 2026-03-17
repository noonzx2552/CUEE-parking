import { redirect } from "next/navigation";

import { ReservationForm } from "@/components/parking/reservation-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getParkingSpaceById } from "@/lib/data";
import { parkingStatusColor, toTitleCase } from "@/lib/utils";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");

  const params = await searchParams;
  const parkingSpaceId = typeof params.parkingSpaceId === "string" ? params.parkingSpaceId : "";
  const parkingSpace = parkingSpaceId ? await getParkingSpaceById(parkingSpaceId) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">New reservation</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Reserve a parking space</h1>
      </div>
      <Card className="space-y-6">
        {parkingSpace ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-zinc-950">{parkingSpace.code}</h2>
                <p className="text-sm text-zinc-500">
                  Zone {parkingSpace.zone} • {toTitleCase(parkingSpace.type)}
                </p>
              </div>
              <Badge className={parkingStatusColor(parkingSpace.status)}>{toTitleCase(parkingSpace.status)}</Badge>
            </div>
            <ReservationForm parkingSpaceId={String(parkingSpace._id)} disabled={parkingSpace.status === "maintenance"} />
          </>
        ) : (
          <p className="text-sm text-zinc-500">Select a parking space from the parking list first.</p>
        )}
      </Card>
    </div>
  );
}
