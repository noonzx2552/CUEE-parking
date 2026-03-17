import Link from "next/link";
import { ArrowRight, BellRing, ChartColumn, Clock3, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export default async function Home() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const text = t(locale);
  const dashboardPath = user?.role === "admin" ? "/admin" : "/dashboard";

  const features = [
    {
      title: text.home.features.reservationTitle,
      description: text.home.features.reservationDescription,
      icon: Clock3,
    },
    {
      title: text.home.features.realtimeTitle,
      description: text.home.features.realtimeDescription,
      icon: ChartColumn,
    },
    {
      title: text.home.features.lineTitle,
      description: text.home.features.lineDescription,
      icon: BellRing,
    },
    {
      title: text.home.features.securityTitle,
      description: text.home.features.securityDescription,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
        <div className="animate-fade-up space-y-6">
          <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-800">
            {text.home.badge}
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-zinc-950 md:text-6xl">
            {text.home.title}
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600">
            {text.home.description}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={user ? dashboardPath : "/register"}>
              <Button className="gap-2">
                {user ? text.home.openDashboard : text.home.launch}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/parking">
              <Button variant="ghost">{text.home.browse}</Button>
            </Link>
          </div>
        </div>
        <Card className="overflow-hidden bg-zinc-950 p-0 text-white">
          <div className="grid gap-4 bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] p-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-sky-100">{text.home.operatingView}</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-100/70">{text.home.availability}</p>
                  <p className="mt-2 text-3xl font-semibold">20+</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-100/70">{text.home.zones}</p>
                  <p className="mt-2 text-3xl font-semibold">A / B / VIP</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
              <p className="text-sm text-sky-100">{text.home.controls}</p>
              <p className="mt-3 text-sm leading-7 text-sky-50/80">
                {text.home.controlsDescription}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature, index) => (
          <Card key={feature.title} className="animate-fade-up space-y-4" style={{ animationDelay: `${index * 80}ms` }}>
            <feature.icon className="h-10 w-10 rounded-2xl bg-sky-50 p-2 text-sky-700" />
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{feature.title}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-600">{feature.description}</p>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
