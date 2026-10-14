import type { ChartData, ChartPoint, Quote } from "./market-data";

export type DisplayCurrency = "native" | "USD" | "BRL";

export const DISPLAY_OPTIONS: readonly {
  id: DisplayCurrency;
  label: string;
}[] = [
  { id: "native", label: "Original" },
  { id: "USD", label: "US$ USD" },
  { id: "BRL", label: "R$ BRL" },
];

/** Converts between USD and BRL; null when the pair is unsupported or the rate is invalid. */
export function convertAmount(
  value: number,
  from: string,
  to: string,
  usdBrl: number | null,
): number | null {
  if (from === to) return value;
  if (usdBrl === null || !Number.isFinite(usdBrl) || usdBrl <= 0) return null;
  if (from === "USD" && to === "BRL") return value * usdBrl;
  if (from === "BRL" && to === "USD") return value / usdBrl;
  return null;
}

/** True when `from` can be shown in `target` (same currency counts). */
export function canConvert(from: string, target: DisplayCurrency): boolean {
  return (
    target === "native" ||
    from === target ||
    (from === "USD" && target === "BRL") ||
    (from === "BRL" && target === "USD")
  );
}

/**
 * Re-expresses a quote in `target`. Returns the original quote when no
 * conversion is requested or possible. A single current rate is used.
 */
export function convertQuote(
  quote: Quote,
  target: DisplayCurrency,
  usdBrl: number | null,
): Quote {
  if (target === "native" || quote.currency === target) return quote;
  const price = convertAmount(quote.price, quote.currency, target, usdBrl);
  if (price === null) return quote;
  const previousClose =
    quote.previousClose === null
      ? null
      : convertAmount(quote.previousClose, quote.currency, target, usdBrl);
  return { ...quote, currency: target, price, previousClose, priceHint: null };
}

export function convertChart(
  chart: ChartData,
  target: DisplayCurrency,
  usdBrl: number | null,
): ChartData {
  const quote = convertQuote(chart.quote, target, usdBrl);
  if (quote === chart.quote) return chart;
  const rate = quote.price / chart.quote.price;
  const points: ChartPoint[] = chart.points.map((p) => ({
    t: p.t,
    c: p.c * rate,
  }));
  const { first, last, high, low, change, changePercent } = chart.stats;
  return {
    ...chart,
    quote,
    points,
    stats: {
      first: first * rate,
      last: last * rate,
      high: high * rate,
      low: low * rate,
      change: change * rate,
      changePercent,
    },
  };
}
