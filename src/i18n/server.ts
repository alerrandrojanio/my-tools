import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, type Locale, pickLocale } from "./config";
import { type Dictionary, getDictionary } from "./dictionaries";

/** The visitor's language: saved choice first, then the browser's preference. */
export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return pickLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get("accept-language"),
  );
}

export async function getTranslations(): Promise<{
  locale: Locale;
  t: Dictionary;
}> {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
