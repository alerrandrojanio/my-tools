"use client";

import { createContext, type ReactNode, use } from "react";
import { LOCALE_TAGS, type Locale } from "./config";
import { type Dictionary, getDictionary, translateError } from "./dictionaries";

interface I18nValue {
  locale: Locale;
  /** BCP 47 tag for number/date formatting, e.g. "pt-BR". */
  tag: string;
  t: Dictionary;
  /** Translates an English message coming from the logic or the API. */
  tError: (message: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Only the locale crosses the server/client boundary; the dictionary (which
 * contains functions) is looked up here on the client.
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const t = getDictionary(locale);
  const value: I18nValue = {
    locale,
    tag: LOCALE_TAGS[locale],
    t,
    tError: (message) => translateError(t, message),
  };
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nValue {
  const value = use(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>.");
  return value;
}
