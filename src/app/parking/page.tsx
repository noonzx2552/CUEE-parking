import Link from "next/link";

import { ParkingGrid } from "@/components/parking/parking-grid";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getCurrentUser } from "@/lib/auth/session";
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

  const totalSpaces = spaces.length;
  const availableSpaces = spaces.filter((space) => space.status === "available").length;
  const activeSpaces = spaces.filter((space) => ["reserved", "occupied"].includes(space.status)).length;
  const maintenanceSpaces = spaces.filter((space) => space.status === "maintenance").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">
          {isThai ? "สถานะที่จอดรถ" : "Parking availability"}
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-950">
              {isThai ? "เลือกช่องจอดรถ" : "Choose a parking space"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              {isThai
                ? "ตอนนี้ระบบเริ่มต้นด้วยที่จอด 4 ช่อง เลือกช่องที่ต้องการแล้วกดจองได้ทันที"
                : "The system currently starts with 4 spaces. Pick the one you want and reserve it directly."}
            </p>
          </div>
          <Link
            href="/reservations/new"
            className="inline-flex h-11 items-center rounded-2xl bg-zinc-950 px-4 text-sm font-medium text-white"
          >
            {isThai ? "เปิดหน้าจอง" : "Open booking"}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-3xl">
          <p className="text-sm text-zinc-500">{isThai ? "ทั้งหมด" : "Total"}</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950">{totalSpaces}</p>
        </Card>
        <Card className="rounded-3xl">
          <p className="text-sm text-zinc-500">{isThai ? "ว่าง" : "Available"}</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{availableSpaces}</p>
        </Card>
        <Card className="rounded-3xl">
          <p className="text-sm text-zinc-500">{isThai ? "กำลังใช้งาน" : "In use"}</p>
          <p className="mt-2 text-3xl font-semibold text-sky-700">{activeSpaces}</p>
        </Card>
        <Card className="rounded-3xl">
          <p className="text-sm text-zinc-500">{isThai ? "ปิดปรับปรุง" : "Maintenance"}</p>
          <p className="mt-2 text-3xl font-semibold text-rose-700">{maintenanceSpaces}</p>
        </Card>
      </div>

      <Card className="rounded-3xl">
        <form className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">{isThai ? "ค้นหารหัสช่อง" : "Search code"}</label>
            <Input
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder={isThai ? "เช่น A01 หรือ A04" : "For example A01 or A04"}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Zone</label>
            <Select name="zone" defaultValue={filters.zone ?? ""}>
              <option value="">{isThai ? "ทุกโซน" : "All zones"}</option>
              <option value="A">A</option>
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
            <button className="h-11 rounded-2xl bg-sky-600 px-4 text-sm font-medium text-white" type="submit">
              {isThai ? "ค้นหา" : "Filter"}
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

      <Card className="rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">
              {isThai ? "จองและสแกนได้ง่ายขึ้น" : "Booking and scanning made simpler"}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {isThai
                ? "เริ่มต้นทุกช่องจะมีแค่ปุ่มจองก่อน และปุ่มสแกนจะขึ้นเฉพาะช่องที่คุณจองอยู่เท่านั้น"
                : "Each card starts with only a reserve action, and scan access appears only on the space you booked."}
            </p>
          </div>
          {scannableSpaceIds.length ? (
            <Link
              href="/scan"
              className="inline-flex h-11 items-center rounded-2xl border border-zinc-200 px-4 text-sm font-medium text-zinc-700"
            >
              {isThai ? "เปิดหน้าสแกน" : "Open scanner"}
            </Link>
          ) : null}
        </div>
      </Card>
    </div>
  );
}


