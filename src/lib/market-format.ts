import type { RangeId } from "./market-data";

/** Decimals to show: Yahoo's hint when present, else based on magnitude. */
export function decimalsFor(value: number, priceHint: number | null): number {
  if (priceHint !== null && priceHint >= 0 && priceHint <= 8) return priceHint;
  const size = Math.abs(value);
  if (size >= 1) return 2;
  return size >= 0.1 ? 4 : 5;
}

export function formatNumber(
  value: number,
  decimals: number,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPrice(
  value: number,
  currency: string,
  priceHint: number | null,
  locale?: string,
): string {
  const decimals = decimalsFor(value, priceHint);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    // Unknown currency code: show the number with the raw code.
    return `${formatNumber(value, decimals, locale)} ${currency}`;
  }
}

export type Direction = "up" | "down" | "flat";

export function directionOf(change: number): Direction {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

export const ARROWS: Readonly<Record<Direction, string>> = {
  up: "▲",
  down: "▼",
  flat: "■",
};

export function formatPercent(value: number, locale?: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatNumber(Math.abs(value), 2, locale)}%`;
}

export function formatSigned(
  value: number,
  decimals: number,
  locale?: string,
): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatNumber(Math.abs(value), decimals, locale)}`;
}

const INTRADAY: readonly RangeId[] = ["1d"];
const SHORT: readonly RangeId[] = ["5d", "1w", "1m"];

/** Short label for an x-axis tick. */
export function formatAxisTime(
  ms: number,
  range: RangeId,
  locale?: string,
): string {
  const date = new Date(ms);
  if (INTRADAY.includes(range)) {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (SHORT.includes(range)) {
    return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
  }
  if (range === "5y") {
    return date.toLocaleDateString(locale, { month: "short", year: "numeric" });
  }
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/** Full date (and time for intraday ranges) for the hover tooltip. */
export function formatTooltipTime(
  ms: number,
  range: RangeId,
  locale?: string,
): string {
  const date = new Date(ms);
  const day = date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (range === "3m" || range === "6m" || range === "1y" || range === "5y") {
    return day;
  }
  const time = date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day}, ${time}`;
}
