import Link from "next/link";
import { redirect } from "next/navigation";

import { DiscordWebhookCard } from "@/components/admin/discord-webhook-card";
import { StatsChart } from "@/components/admin/stats-chart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminStats } from "@/lib/data";
import { env } from "@/lib/env";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

function maskWebhookUrl(value: string) {
  if (!value) {
    return "Not configured";
  }

  if (value.length <= 22) {
    return value;
  }

  return `${value.slice(0, 18)}...${value.slice(-10)}`;
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const text = t(locale);
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const stats = await getAdminStats();
  const discordConfigured = Boolean(env.DISCORD_WEBHOOK_URL);
  const discordWebhookLabel = maskWebhookUrl(env.DISCORD_WEBHOOK_URL);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700">{text.admin.badge}</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950">{text.admin.title}</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/parking-spaces">
            <Button variant="ghost">{text.admin.manageParking}</Button>
          </Link>
          <Link href="/api/admin/reports/reservations">
            <Button>{text.admin.exportCsv}</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><p className="text-sm text-zinc-500">Total spaces</p><p className="mt-2 text-4xl font-semibold">{stats.totalSpaces}</p></Card>
        <Card><p className="text-sm text-zinc-500">Available</p><p className="mt-2 text-4xl font-semibold">{stats.byStatus.available}</p></Card>
        <Card><p className="text-sm text-zinc-500">Reserved</p><p className="mt-2 text-4xl font-semibold">{stats.byStatus.reserved}</p></Card>
        <Card><p className="text-sm text-zinc-500">Maintenance</p><p className="mt-2 text-4xl font-semibold">{stats.byStatus.maintenance}</p></Card>
        <Card><p className="text-sm text-zinc-500">Reservations today</p><p className="mt-2 text-4xl font-semibold">{stats.todayReservations}</p></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-950">Zone usage</h2>
            <span className="text-sm text-zinc-500">{stats.usersCount} users</span>
          </div>
          <div className="mt-4">
            <StatsChart data={stats.zoneUsage} />
          </div>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-950">Quick actions</h2>
          <Link className="block rounded-2xl border border-zinc-200 p-4 hover:border-sky-300" href="/admin/users">
            Manage users
          </Link>
          <Link className="block rounded-2xl border border-zinc-200 p-4 hover:border-sky-300" href="/admin/reservations">
            Review reservations
          </Link>
          <Link className="block rounded-2xl border border-zinc-200 p-4 hover:border-sky-300" href="/admin/parking-spaces">
            Configure parking spaces
          </Link>
        </Card>
      </div>

      <DiscordWebhookCard configured={discordConfigured} webhookLabel={discordWebhookLabel} />
    </div>
  );
}
