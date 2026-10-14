import type { Locale } from "./config";
import { type Dictionary, en } from "./en";
import { pt } from "./pt";

export type { Dictionary };

const DICTIONARIES: Readonly<Record<Locale, Dictionary>> = { en, pt };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/**
 * Translates a message produced by the app's logic or API (always English).
 * Unknown messages are returned unchanged, so nothing is ever lost.
 */
export function translateError(t: Dictionary, message: string): string {
  const exact = t.errors.exact[message];
  if (exact) return exact;
  for (const [pattern, render] of t.errors.patterns) {
    const match = pattern.exec(message);
    if (match) return render(...match.slice(1));
  }
  return message;
}
