import Link from "next/link";

import { ParkingGrid } from "@/components/parking/parking-grid";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { getParkingSpaces } from "@/lib/data";

export default async function ParkingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    zone: typeof params.zone === "string" ? params.zone : undefined,
    type: typeof params.type === "string" ? params.type : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
  };

  const spaces = await getParkingSpaces(filters);
  const queryString = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Parking availability</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Browse parking spaces</h1>
      </div>

      <Card>
        <form className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Zone</label>
            <Select name="zone" defaultValue={filters.zone ?? ""}>
              <option value="">All zones</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="VIP">VIP</option>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Type</label>
            <Select name="type" defaultValue={filters.type ?? ""}>
              <option value="">All types</option>
              <option value="normal">Normal</option>
              <option value="ev">EV</option>
              <option value="disabled">Disabled</option>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Status</label>
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">All statuses</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
            </Select>
          </div>
          <div className="flex items-end">
            <button className="h-11 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white" type="submit">
              Apply filters
            </button>
          </div>
        </form>
      </Card>

      <ParkingGrid initialSpaces={JSON.parse(JSON.stringify(spaces))} queryString={queryString} />

      <Card>
        <h2 className="text-lg font-semibold text-zinc-950">Reservation flow</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Select a parking space from the admin-provided inventory, then open a reservation page using a spot ID.
        </p>
        {spaces[0] ? (
          <Link href={`/reservations/new?parkingSpaceId=${String(spaces[0]._id)}`} className="mt-4 inline-flex text-sm font-medium text-sky-700">
            Try reserving {spaces[0].code}
          </Link>
        ) : null}
      </Card>
    </div>
  );
}
