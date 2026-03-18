import { redirect } from "next/navigation";

import { ReservationActions } from "@/components/reservations/reservation-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserReservations } from "@/lib/data";
import { formatParkingFee } from "@/lib/parking-fees";
import { formatDateTime, reservationStatusColor, toTitleCase } from "@/lib/utils";

export default async function ReservationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");

  const reservations = await getUserReservations(user.id);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">My reservations</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Reservation history</h1>
      </div>
      <Card className="overflow-x-auto">
        {reservations.length ? (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Parking</th>
                <th className="py-3 pr-4">Time</th>
                <th className="py-3 pr-4">Fee</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={String(reservation._id)} className="border-b border-zinc-100 align-top">
                  <td className="py-4 pr-4 font-medium text-zinc-900">
                    {(reservation.parkingSpaceId as { code?: string }).code ?? "Unknown"}
                  </td>
                  <td className="py-4 pr-4 text-zinc-600">
                    {formatDateTime(reservation.startTime)} - {formatDateTime(reservation.endTime)}
                    <p className="mt-1 text-xs text-zinc-500">
                      เช็กอินได้ถึง {formatDateTime(reservation.checkInDeadline ?? reservation.startTime)}
                    </p>
                  </td>
                  <td className="py-4 pr-4 text-zinc-700">
                    {formatParkingFee(
                      Number((reservation as { parkingFee?: number }).parkingFee ?? 0),
                      String((reservation as { feeCurrency?: string }).feeCurrency ?? "THB"),
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <Badge className={reservationStatusColor(reservation.status)}>{toTitleCase(reservation.status)}</Badge>
                  </td>
                  <td className="py-4 pr-4">
                    <ReservationActions reservationId={String(reservation._id)} reservationStatus={reservation.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-zinc-500">No reservations found.</p>
        )}
      </Card>
    </div>
  );
}
