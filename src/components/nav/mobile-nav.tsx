"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { LanguageSwitcher } from "@/components/nav/language-switcher";
import { LogoutButton } from "@/components/nav/logout-button";
import { Button } from "@/components/ui/button";
import { t, type Locale } from "@/lib/i18n";

type SessionLike = {
  role?: string;
};

export function MobileNav({
  user,
  locale,
  serverTimeLabel,
}: {
  user: SessionLike | null;
  locale: Locale;
  serverTimeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const text = t(locale);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="absolute inset-x-4 top-full z-50 mt-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-xl">
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                {locale === "th" ? "เวลาเซิร์ฟเวอร์" : "Server Time"}
              </p>
              <p className="mt-1 font-mono text-sm text-zinc-900">{serverTimeLabel}</p>
            </div>

            <LanguageSwitcher locale={locale} />

            <nav className="grid gap-2">
              <Link href="/parking" onClick={closeMenu} className="rounded-2xl px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                {text.nav.parking}
              </Link>
              {user ? (
                <>
                  <Link
                    href={isAdmin ? "/admin" : "/dashboard"}
                    onClick={closeMenu}
                    className="rounded-2xl px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                  >
                    {isAdmin ? text.nav.admin : text.nav.dashboard}
                  </Link>
                  {!isAdmin ? (
                    <Link href="/reservations" onClick={closeMenu} className="rounded-2xl px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                      {text.nav.reservations}
                    </Link>
                  ) : null}
                  <Link href="/profile" onClick={closeMenu} className="rounded-2xl px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                    {text.nav.profile}
                  </Link>
                  <div onClick={closeMenu}>
                    <LogoutButton locale={locale} />
                  </div>
                </>
              ) : (
                <div className="grid gap-2 pt-2">
                  <Link href="/login" onClick={closeMenu}>
                    <Button variant="ghost" className="w-full">
                      {text.nav.login}
                    </Button>
                  </Link>
                  <Link href="/register" onClick={closeMenu}>
                    <Button className="w-full">{text.nav.getStarted}</Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
