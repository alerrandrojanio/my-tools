export type RangeId = "1d" | "5d" | "1w" | "1m" | "3m" | "6m" | "1y" | "5y";

export interface RangeConfig {
  id: RangeId;
  label: string;
  /** Description used in sentences, e.g. "past 5 days". */
  description: string;
  yahooRange: string;
  interval: string;
  /** Keep only the last N days of the response (for ranges Yahoo lacks). */
  lastDays?: number;
}

export const RANGES: readonly RangeConfig[] = [
  {
    id: "1d",
    label: "1D",
    description: "today",
    yahooRange: "1d",
    interval: "5m",
  },
  {
    id: "5d",
    label: "5D",
    description: "past 5 days",
    yahooRange: "5d",
    interval: "15m",
  },
  {
    id: "1w",
    label: "1W",
    description: "past week",
    yahooRange: "1mo",
    interval: "60m",
    lastDays: 7,
  },
  {
    id: "1m",
    label: "1M",
    description: "past month",
    yahooRange: "1mo",
    interval: "60m",
  },
  {
    id: "3m",
    label: "3M",
    description: "past 3 months",
    yahooRange: "3mo",
    interval: "1d",
  },
  {
    id: "6m",
    label: "6M",
    description: "past 6 months",
    yahooRange: "6mo",
    interval: "1d",
  },
  {
    id: "1y",
    label: "1Y",
    description: "past year",
    yahooRange: "1y",
    interval: "1d",
  },
  {
    id: "5y",
    label: "5Y",
    description: "past 5 years",
    yahooRange: "5y",
    interval: "1wk",
  },
];

export interface Quote {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  price: number;
  /** Previous session close; only known for the 1D range. */
  previousClose: number | null;
  /** Decimals Yahoo suggests for this instrument (e.g. 4 for FX pairs). */
  priceHint: number | null;
  /** Time of the latest price, in epoch milliseconds. */
  updatedAt: number;
}

export interface ChartPoint {
  /** Epoch milliseconds. */
  t: number;
  /** Close price. */
  c: number;
}

export interface ChartStats {
  first: number;
  last: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
}

export interface ChartData {
  quote: Quote;
  range: RangeId;
  points: ChartPoint[];
  stats: ChartStats;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const SYMBOL_PATTERN = /^[A-Za-z0-9^][A-Za-z0-9.=^_-]{0,19}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const SEARCH_TYPES = new Set([
  "EQUITY",
  "ETF",
  "CURRENCY",
  "CRYPTOCURRENCY",
  "INDEX",
  "MUTUALFUND",
]);
const MAX_SEARCH_RESULTS = 8;

export function isValidSymbol(value: string): boolean {
  return SYMBOL_PATTERN.test(value);
}

export function getRange(id: string): RangeConfig | undefined {
  return RANGES.find((range) => range.id === id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

export function computeStats(
  points: readonly ChartPoint[],
  baseline?: number | null,
): ChartStats {
  const closes = points.map((point) => point.c);
  const first = baseline ?? closes[0];
  const last = closes[closes.length - 1];
  const change = last - first;

  return {
    first,
    last,
    high: Math.max(...closes),
    low: Math.min(...closes),
    change,
    changePercent: first === 0 ? 0 : (change / first) * 100,
  };
}

/** Turns Yahoo's `/v8/finance/chart` payload into our own typed shape. */
/**
 * Keeps only the last `hours` of a chart and relabels it as 1D. Used when
 * today's session has no prices yet (FX starts a new day at midnight London
 * time, around 8–9 pm in Brazil), so 1D shows the last 24 hours instead of an
 * error. The change is measured from the first point of that window.
 */
/** Error text when a chart has no usable prices (callers may fall back). */
export const NO_PRICE_DATA = "No price data for this symbol.";

export function lastHoursChart(
  chart: ChartData,
  hours: number,
): ChartData | null {
  if (chart.points.length === 0) return null;
  const cutoff = chart.points[chart.points.length - 1].t - hours * 3_600_000;
  const points = chart.points.filter((point) => point.t >= cutoff);
  if (points.length === 0) return null;
  return {
    quote: { ...chart.quote, previousClose: null },
    range: "1d",
    points,
    stats: computeStats(points, null),
  };
}

export function parseYahooChart(
  json: unknown,
  rangeId: RangeId,
): ParseResult<ChartData> {
  const chart = isRecord(json) ? json.chart : null;
  if (!isRecord(chart)) return { ok: false, error: "Unexpected response." };

  const result = Array.isArray(chart.result) ? chart.result[0] : null;
  if (!isRecord(result)) {
    const description = isRecord(chart.error)
      ? asString(chart.error.description)
      : null;
    return { ok: false, error: description ?? "Symbol not found." };
  }

  const meta = result.meta;
  const timestamps = result.timestamp;
  const indicators = result.indicators;
  if (!isRecord(meta) || !isRecord(indicators)) {
    return { ok: false, error: "Unexpected response." };
  }

  const quoteSeries = Array.isArray(indicators.quote)
    ? indicators.quote[0]
    : null;
  const closes = isRecord(quoteSeries) ? quoteSeries.close : null;
  if (!Array.isArray(timestamps) || !Array.isArray(closes)) {
    return { ok: false, error: NO_PRICE_DATA };
  }

  let points: ChartPoint[] = [];
  timestamps.forEach((timestamp, index) => {
    const t = asNumber(timestamp);
    const c = asNumber(closes[index]);
    if (t !== null && c !== null) points.push({ t: t * 1000, c });
  });

  const config = getRange(rangeId);
  if (config?.lastDays && points.length > 0) {
    const cutoff = points[points.length - 1].t - config.lastDays * DAY_MS;
    points = points.filter((point) => point.t >= cutoff);
  }
  if (points.length === 0) {
    return { ok: false, error: NO_PRICE_DATA };
  }

  const symbol = asString(meta.symbol);
  if (!symbol) return { ok: false, error: "Unexpected response." };

  const last = points[points.length - 1];
  const price = asNumber(meta.regularMarketPrice) ?? last.c;
  const regularMarketTime = asNumber(meta.regularMarketTime);
  const previousClose =
    rangeId === "1d"
      ? (asNumber(meta.chartPreviousClose) ?? asNumber(meta.previousClose))
      : asNumber(meta.previousClose);

  const quote: Quote = {
    symbol,
    name: asString(meta.longName) ?? asString(meta.shortName) ?? symbol,
    currency: asString(meta.currency) ?? "USD",
    exchange:
      asString(meta.fullExchangeName) ?? asString(meta.exchangeName) ?? "",
    price,
    previousClose,
    priceHint: asNumber(meta.priceHint),
    updatedAt: regularMarketTime ? regularMarketTime * 1000 : last.t,
  };

  // Today's change is measured against yesterday's close; longer ranges
  // against the first price of the period.
  const stats = computeStats(
    points,
    rangeId === "1d" ? quote.previousClose : null,
  );

  return { ok: true, value: { quote, range: rangeId, points, stats } };
}

/** Day change (absolute and percent) for a quote, when yesterday's close is known. */
export function dayChange(
  quote: Quote,
): { change: number; changePercent: number } | null {
  if (quote.previousClose === null || quote.previousClose === 0) return null;
  const change = quote.price - quote.previousClose;
  return { change, changePercent: (change / quote.previousClose) * 100 };
}

/** Parses Yahoo's `/v1/finance/search` payload. */
export function parseYahooSearch(json: unknown): SearchResult[] {
  const quotes =
    isRecord(json) && Array.isArray(json.quotes) ? json.quotes : [];
  const results: SearchResult[] = [];

  for (const entry of quotes) {
    if (!isRecord(entry)) continue;
    const symbol = asString(entry.symbol);
    const type = asString(entry.quoteType);
    if (!symbol || !type || !isValidSymbol(symbol) || !SEARCH_TYPES.has(type)) {
      continue;
    }
    results.push({
      symbol,
      name: asString(entry.longname) ?? asString(entry.shortname) ?? symbol,
      type,
      exchange: asString(entry.exchDisp) ?? asString(entry.exchange) ?? "",
    });
    if (results.length === MAX_SEARCH_RESULTS) break;
  }

  return results;
}
