import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminReservations } from "@/lib/data";
import { formatDateTime, reservationStatusColor, toTitleCase } from "@/lib/utils";

export default async function AdminReservationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const reservations = await getAdminReservations();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Reservation management</h1>
      </div>
      <Card className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="py-3 pr-4">User</th>
              <th className="py-3 pr-4">Parking</th>
              <th className="py-3 pr-4">Time</th>
              <th className="py-3 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={String(reservation._id)} className="border-b border-zinc-100">
                <td className="py-4 pr-4 text-zinc-700">
                  {(reservation.userId as { email?: string }).email ?? "Unknown"}
                </td>
                <td className="py-4 pr-4 font-medium text-zinc-900">
                  {(reservation.parkingSpaceId as { code?: string }).code ?? "Unknown"}
                </td>
                <td className="py-4 pr-4 text-zinc-600">
                  {formatDateTime(reservation.startTime)} - {formatDateTime(reservation.endTime)}
                </td>
                <td className="py-4 pr-4">
                  <Badge className={reservationStatusColor(reservation.status)}>{toTitleCase(reservation.status)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
