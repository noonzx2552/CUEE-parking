import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getParkingSpaces, getUserReservations } from "@/lib/data";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const text = t(locale);
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");

  const [spaces, reservations] = await Promise.all([
    getParkingSpaces({}),
    getUserReservations(user.id),
  ]);

  const activeReservations = reservations.filter((item) => ["pending", "confirmed", "checked-in"].includes(item.status)).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700">{text.dashboard.badge}</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
            {text.dashboard.title}, {user.name}
          </h1>
        </div>
        <Link href="/parking">
          <Button>{text.dashboard.reserve}</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-zinc-500">{text.dashboard.available}</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-950">
            {spaces.filter((space) => space.status === "available").length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">{text.dashboard.active}</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-950">{activeReservations.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">{text.dashboard.lineLinked}</p>
          <p className="mt-2 text-4xl font-semibold text-zinc-950">{user.lineUserId ? text.dashboard.yes : text.dashboard.no}</p>
          {!user.lineUserId ? (
            <div className="mt-4">
              <Link href="/line/connect">
                <Button>เชื่อมต่อ LINE กับระบบ</Button>
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              {locale === "th"
                ? "ระบบพร้อมส่งแจ้งเตือนการจองเข้า LINE ของคุณ"
                : "Reservation alerts are ready to be delivered to your LINE account."}
            </p>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-950">{text.dashboard.upcoming}</h2>
          <Link href="/reservations" className="text-sm font-medium text-sky-700">
            {text.dashboard.viewAll}
          </Link>
        </div>
        <div className="mt-4 space-y-4">
          {activeReservations.length ? (
            activeReservations.map((reservation) => (
              <div key={String(reservation._id)} className="rounded-2xl border border-zinc-200 p-4">
                <p className="font-medium text-zinc-900">
                  {(reservation.parkingSpaceId as { code?: string } | null)?.code ?? text.dashboard.unknownSpot}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {formatDateTime(reservation.startTime)} - {formatDateTime(reservation.endTime)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">{text.dashboard.noReservations}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
