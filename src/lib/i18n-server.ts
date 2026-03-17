import { cookies } from "next/headers";

import { isLocale, type Locale, LOCALE_COOKIE_NAME } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  return value && isLocale(value) ? value : "en";
}
