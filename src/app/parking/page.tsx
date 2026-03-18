import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { ParkingGrid } from "@/components/parking/parking-grid";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getParkingSpaces, getUserReservations } from "@/lib/data";
import { getLocale } from "@/lib/i18n-server";

export default async function ParkingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const isThai = locale === "th";
  const user = await getCurrentUser();
  const params = await searchParams;
  const filters = {
    zone: typeof params.zone === "string" ? params.zone : undefined,
    type: typeof params.type === "string" ? params.type : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
  };

  const [spaces, reservations] = await Promise.all([
    getParkingSpaces(filters),
    user ? getUserReservations(user.id) : Promise.resolve([]),
  ]);

  const scannableSpaceIds = reservations
    .filter((reservation) => ["pending", "confirmed", "checked-in"].includes(reservation.status))
    .map((reservation) => String((reservation.parkingSpaceId as { _id?: string })._id ?? reservation.parkingSpaceId));

  const queryString = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">
          {isThai ? "สถานะที่จอดรถ" : "Parking availability"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
          {isThai ? "เลือกดูช่องจอดรถ" : "Browse parking spaces"}
        </h1>
      </div>

      <Card>
        <form className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">{isThai ? "ช่องจอด" : "Parking spot"}</label>
            <Input
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder={isThai ? "พิมพ์รหัส เช่น A01" : "Enter code, e.g. A01"}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Zone</label>
            <Select name="zone" defaultValue={filters.zone ?? ""}>
              <option value="">{isThai ? "ทุกโซน" : "All zones"}</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="VIP">VIP</option>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">{isThai ? "ประเภท" : "Type"}</label>
            <Select name="type" defaultValue={filters.type ?? ""}>
              <option value="">{isThai ? "ทุกประเภท" : "All types"}</option>
              <option value="normal">{isThai ? "ปกติ" : "Normal"}</option>
              <option value="ev">EV</option>
              <option value="disabled">{isThai ? "ผู้พิการ" : "Disabled"}</option>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">{isThai ? "สถานะ" : "Status"}</label>
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">{isThai ? "ทุกสถานะ" : "All statuses"}</option>
              <option value="available">{isThai ? "ว่าง" : "Available"}</option>
              <option value="reserved">{isThai ? "ถูกจอง" : "Reserved"}</option>
              <option value="occupied">{isThai ? "มีรถจอด" : "Occupied"}</option>
              <option value="maintenance">{isThai ? "ปิดปรับปรุง" : "Maintenance"}</option>
            </Select>
          </div>
          <div className="flex items-end">
            <button className="h-11 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white" type="submit">
              {isThai ? "ค้นหา" : "Apply filters"}
            </button>
          </div>
        </form>
      </Card>

      <ParkingGrid
        initialSpaces={JSON.parse(JSON.stringify(spaces))}
        queryString={queryString}
        locale={locale}
        scannableSpaceIds={scannableSpaceIds}
      />

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">
            {isThai ? "การจองและสแกน" : "Booking and scanning"}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            {isThai
              ? "กดจองจากแต่ละช่องได้เลย หรือพิมพ์รหัสช่องด้านบนเพื่อค้นหา ส่วนปุ่มสแกนเข้าออกจะขึ้นเฉพาะช่องที่คุณจองอยู่เท่านั้น"
              : "Reserve from each space directly, or search by code above. Scan access is shown only for spaces you have reserved."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/reservations/new" className="inline-flex h-11 items-center rounded-xl bg-sky-600 px-4 text-sm font-medium text-white">
            {isThai ? "เปิดหน้าจอง" : "Open booking"}
          </Link>
          <Link href="/scan" className="inline-flex h-11 items-center rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-700">
            {isThai ? "เปิดหน้าสแกน" : "Open scanner"}
          </Link>
        </div>
      </Card>
    </div>
  );
}
