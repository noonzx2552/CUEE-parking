import { redirect } from "next/navigation";

import { ParkingForm } from "@/components/admin/parking-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getParkingSpaces } from "@/lib/data";
import { parkingStatusColor, toTitleCase } from "@/lib/utils";

export default async function AdminParkingSpacesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const spaces = await getParkingSpaces({});

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Parking space management</h1>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-zinc-950">Create parking space</h2>
        <ParkingForm />
      </Card>

      <Card className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="py-3 pr-4">Code</th>
              <th className="py-3 pr-4">Zone</th>
              <th className="py-3 pr-4">Type</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Description</th>
            </tr>
          </thead>
          <tbody>
            {spaces.map((space) => (
              <tr key={String(space._id)} className="border-b border-zinc-100">
                <td className="py-4 pr-4 font-medium text-zinc-900">{space.code}</td>
                <td className="py-4 pr-4 text-zinc-600">{space.zone}</td>
                <td className="py-4 pr-4 text-zinc-600">{toTitleCase(space.type)}</td>
                <td className="py-4 pr-4">
                  <Badge className={parkingStatusColor(space.status)}>{toTitleCase(space.status)}</Badge>
                </td>
                <td className="py-4 pr-4 text-zinc-600">{space.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
