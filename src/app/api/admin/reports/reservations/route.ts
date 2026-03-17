import { format } from "date-fns";

import { requireAdminSession } from "@/lib/auth/session";
import { getAdminReservations } from "@/lib/data";
import { withErrorHandler } from "@/lib/api";

export const GET = withErrorHandler(async () => {
  await requireAdminSession();
  const reservations = await getAdminReservations();

  const header = ["reservationId", "userEmail", "parkingCode", "status", "startTime", "endTime"];
  const rows = reservations.map((reservation) =>
    [
      String(reservation._id),
      String((reservation.userId as { email?: string })?.email ?? ""),
      String((reservation.parkingSpaceId as { code?: string })?.code ?? ""),
      reservation.status,
      format(new Date(reservation.startTime), "yyyy-MM-dd HH:mm:ss"),
      format(new Date(reservation.endTime), "yyyy-MM-dd HH:mm:ss"),
    ].join(","),
  );

  return new Response([header.join(","), ...rows].join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reservation-report.csv"',
    },
  });
});
