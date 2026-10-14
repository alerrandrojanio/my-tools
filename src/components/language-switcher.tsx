"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALES,
  type Locale,
} from "@/i18n/config";
import { useI18n } from "@/i18n/provider";

const LABELS: Readonly<Record<Locale, string>> = { en: "EN", pt: "PT" };

/** Saves the choice in a cookie and re-renders the page in the new language. */
export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is not available in every browser yet
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <fieldset
      className="m-0 flex items-center gap-0.5 rounded-[10px] border border-line-strong p-0.5"
      aria-busy={pending}
    >
      <legend className="sr-only">{t.nav.language}</legend>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code === "pt" ? "pt-BR" : "en"}
          aria-pressed={locale === code}
          title={locale === code ? undefined : t.nav.switchTo}
          onClick={() => choose(code)}
          disabled={pending}
          className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg px-2.5 text-sm font-semibold transition ${
            locale === code
              ? "bg-accent text-white"
              : "text-muted hover:bg-surface-hover hover:text-ink"
          }`}
        >
          {LABELS[code]}
        </button>
      ))}
    </fieldset>
  );
}
