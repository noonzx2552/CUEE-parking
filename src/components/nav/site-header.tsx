import Link from "next/link";

import { LanguageSwitcher } from "@/components/nav/language-switcher";
import { LogoutButton } from "@/components/nav/logout-button";
import { Button } from "@/components/ui/button";
import { t, type Locale } from "@/lib/i18n";

type SessionLike = {
  role?: string;
};

export function SiteHeader({
  user,
  locale,
  serverTimeLabel,
}: {
  user: SessionLike | null;
  locale: Locale;
  serverTimeLabel: string;
}) {
  const isAdmin = user?.role === "admin";
  const text = t(locale);

  return (
    <header className="sticky top-0 z-40 border-b border-white/30 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-lg font-semibold text-white">
            CP
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">CUEE Parking</p>
            <p className="text-xs text-zinc-500">{text.nav.tagline}</p>
          </div>
        </Link>
        <div className="hidden items-center gap-4 md:flex">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              {locale === "th" ? "เวลาเซิร์ฟเวอร์" : "Server Time"}
            </p>
            <p className="font-mono text-sm text-zinc-900">{serverTimeLabel}</p>
          </div>
          <nav className="flex items-center gap-2">
            <LanguageSwitcher locale={locale} />
            <Link className="rounded-xl px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100" href="/parking">
              {text.nav.parking}
            </Link>
            {user ? (
              <>
                <Link className="rounded-xl px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100" href={isAdmin ? "/admin" : "/dashboard"}>
                  {isAdmin ? text.nav.admin : text.nav.dashboard}
                </Link>
                {!isAdmin && (
                  <Link className="rounded-xl px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100" href="/reservations">
                    {text.nav.reservations}
                  </Link>
                )}
                <Link className="rounded-xl px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100" href="/profile">
                  {text.nav.profile}
                </Link>
                <LogoutButton locale={locale} />
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">{text.nav.login}</Button>
                </Link>
                <Link href="/register">
                  <Button>{text.nav.getStarted}</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
