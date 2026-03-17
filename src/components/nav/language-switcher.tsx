"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE_NAME, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  const setLocale = (nextLocale: Locale) => {
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
      <Button
        type="button"
        variant={locale === "en" ? "secondary" : "ghost"}
        className="h-9 px-3"
        onClick={() => setLocale("en")}
      >
        EN
      </Button>
      <Button
        type="button"
        variant={locale === "th" ? "secondary" : "ghost"}
        className="h-9 px-3"
        onClick={() => setLocale("th")}
      >
        TH
      </Button>
    </div>
  );
}
