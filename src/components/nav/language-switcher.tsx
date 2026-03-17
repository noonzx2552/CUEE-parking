"use client";

import { useRouter } from "next/navigation";

import { LOCALE_COOKIE_NAME, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  const setLocale = (nextLocale: Locale) => {
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <div className="inline-flex items-center rounded-2xl border border-zinc-200 bg-white/95 p-1 shadow-sm">
      <button
        type="button"
        className={cn(
          "min-w-12 rounded-xl px-3 py-2 text-xs font-semibold tracking-[0.18em] transition",
          locale === "en"
            ? "bg-zinc-950 text-white shadow-sm"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
        )}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={cn(
          "min-w-12 rounded-xl px-3 py-2 text-xs font-semibold tracking-[0.18em] transition",
          locale === "th"
            ? "bg-zinc-950 text-white shadow-sm"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
        )}
        onClick={() => setLocale("th")}
      >
        TH
      </button>
    </div>
  );
}
