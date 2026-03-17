import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminUsers } from "@/lib/data";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const users = await getAdminUsers();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">User management</h1>
      </div>
      <Card className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">LINE</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={String(item._id)} className="border-b border-zinc-100">
                <td className="py-4 pr-4 font-medium text-zinc-900">{item.name}</td>
                <td className="py-4 pr-4 text-zinc-600">{item.email}</td>
                <td className="py-4 pr-4">
                  <Badge className="bg-sky-50 text-sky-700 ring-sky-200">{item.role}</Badge>
                </td>
                <td className="py-4 pr-4 text-zinc-600">{item.isActive ? "Active" : "Disabled"}</td>
                <td className="py-4 pr-4 text-zinc-600">{item.lineUserId ? "Bound" : "Not bound"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
