import {
  type ChartData,
  getRange,
  lastHoursChart,
  NO_PRICE_DATA,
  parseYahooChart,
  parseYahooSearch,
  type Quote,
  type RangeId,
  type SearchResult,
} from "./market-data";

const BASE_URL = "https://query1.finance.yahoo.com";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_CACHE_ENTRIES = 500;

const SHORT_TTL_MS = 15_000;
const LONG_TTL_MS = 120_000;
const SEARCH_TTL_MS = 5 * 60_000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
};

/** An upstream failure, carrying the HTTP status our API should answer with. */
export class MarketDataError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 502,
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}

interface CacheEntry {
  expires: number;
  value: Promise<unknown>;
}

const cache = new Map<string, CacheEntry>();

/**
 * Memoizes `load` for `ttl` ms. The promise itself is cached, so concurrent
 * callers share one upstream request; failures are never kept.
 */
async function cached<T>(
  key: string,
  ttl: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;

  if (cache.size >= MAX_CACHE_ENTRIES) {
    for (const [entryKey, entry] of cache) {
      if (entry.expires <= now) cache.delete(entryKey);
    }
    // Still full: drop the oldest entry (Map keeps insertion order).
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  }

  const value = load();
  cache.set(key, { expires: now + ttl, value });
  value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key);
  });
  return value;
}

/** Test helper: forget everything cached. */
export function clearMarketCache(): void {
  cache.clear();
}

async function fetchJson(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new MarketDataError("Market data is unavailable right now.", 502);
  }

  if (response.status === 404) {
    throw new MarketDataError("Symbol not found.", 404);
  }
  if (!response.ok) {
    throw new MarketDataError("Market data is unavailable right now.", 502);
  }

  try {
    return await response.json();
  } catch {
    throw new MarketDataError("Market data is unavailable right now.", 502);
  }
}

function chartUrl(
  symbol: string,
  yahooRange: string,
  interval: string,
): string {
  const params = new URLSearchParams({ range: yahooRange, interval });
  return `${BASE_URL}/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`;
}

async function loadChart(
  symbol: string,
  rangeId: RangeId,
  yahooRange: string,
  interval: string,
): Promise<ChartData> {
  const json = await fetchJson(chartUrl(symbol, yahooRange, interval));
  const parsed = parseYahooChart(json, rangeId);
  if (parsed.ok) return parsed.value;

  // A new trading day with no prices yet: show the last 24 hours instead.
  if (rangeId === "1d" && parsed.error === NO_PRICE_DATA) {
    const recent = parseYahooChart(
      await fetchJson(chartUrl(symbol, "5d", "5m")),
      "5d",
    );
    const fallback = recent.ok ? lastHoursChart(recent.value, 24) : null;
    if (fallback) return fallback;
  }
  throw new MarketDataError(parsed.error, 404);
}

/** Price history for a symbol. `symbol` must already be validated. */
export function getChart(symbol: string, rangeId: RangeId): Promise<ChartData> {
  const config = getRange(rangeId);
  if (!config) throw new Error(`Unknown range: ${rangeId}`);

  const ttl = rangeId === "1d" || rangeId === "5d" ? SHORT_TTL_MS : LONG_TTL_MS;
  return cached(`chart:${symbol}:${rangeId}`, ttl, () =>
    loadChart(symbol, rangeId, config.yahooRange, config.interval),
  );
}

/** Latest price and previous close, using a deliberately tiny request. */
export async function getQuote(symbol: string): Promise<Quote> {
  const data = await cached(`quote:${symbol}`, SHORT_TTL_MS, () =>
    loadChart(symbol, "1d", "1d", "1d"),
  );
  return data.quote;
}

export function searchSymbols(query: string): Promise<SearchResult[]> {
  const normalized = query.trim().toLowerCase();
  return cached(`search:${normalized}`, SEARCH_TTL_MS, async () => {
    const params = new URLSearchParams({
      q: normalized,
      quotesCount: "10",
      newsCount: "0",
    });
    const json = await fetchJson(`${BASE_URL}/v1/finance/search?${params}`);
    return parseYahooSearch(json);
  });
}
