import { describe, expect, it } from "vitest";
import {
  computeStats,
  dayChange,
  getRange,
  isValidSymbol,
  parseYahooChart,
  parseYahooSearch,
  RANGES,
} from "./market-data";

const HOUR = 3600;
const BASE_TS = 1_760_000_000; // seconds

function chartPayload(
  closes: (number | null)[],
  meta: Record<string, unknown> = {},
  stepSeconds = HOUR,
) {
  return {
    chart: {
      result: [
        {
          meta: {
            symbol: "USDBRL=X",
            currency: "BRL",
            longName: "USD/BRL",
            fullExchangeName: "CCY",
            regularMarketPrice: 5.04,
            regularMarketTime: BASE_TS + closes.length * stepSeconds,
            chartPreviousClose: 5.0,
            priceHint: 4,
            ...meta,
          },
          timestamp: closes.map((_, i) => BASE_TS + i * stepSeconds),
          indicators: { quote: [{ close: closes }] },
        },
      ],
      error: null,
    },
  };
}

describe("isValidSymbol", () => {
  it.each([
    "AAPL",
    "BRK-B",
    "PETR4.SA",
    "USDBRL=X",
    "BTC-USD",
    "^BVSP",
    "0857.HK",
  ])("accepts %s", (symbol) => expect(isValidSymbol(symbol)).toBe(true));

  it.each([
    "",
    "../../etc",
    "a/b",
    "a b",
    "AAPL;rm",
    "a".repeat(21),
    "-AAPL",
    "A?x=1",
    "A%2F",
  ])("rejects %j", (symbol) => expect(isValidSymbol(symbol)).toBe(false));
});

describe("RANGES / getRange", () => {
  it("lists the supported ranges with unique ids", () => {
    expect(RANGES.map((r) => r.id)).toEqual([
      "1d",
      "5d",
      "1w",
      "1m",
      "3m",
      "6m",
      "1y",
      "5y",
    ]);
    expect(new Set(RANGES.map((r) => r.id)).size).toBe(RANGES.length);
  });

  it("finds a range by id and rejects unknown ones", () => {
    expect(getRange("5d")?.label).toBe("5D");
    expect(getRange("99y")).toBeUndefined();
    expect(getRange("")).toBeUndefined();
  });
});

describe("computeStats", () => {
  it("computes high, low and change against the first point", () => {
    const stats = computeStats([
      { t: 1, c: 10 },
      { t: 2, c: 12 },
      { t: 3, c: 9 },
      { t: 4, c: 11 },
    ]);
    expect(stats).toEqual({
      first: 10,
      last: 11,
      high: 12,
      low: 9,
      change: 1,
      changePercent: 10,
    });
  });

  it("uses an explicit baseline (previous close) when given", () => {
    const stats = computeStats([{ t: 1, c: 105 }], 100);
    expect(stats.change).toBe(5);
    expect(stats.changePercent).toBe(5);
  });

  it("does not divide by zero", () => {
    expect(computeStats([{ t: 1, c: 5 }], 0).changePercent).toBe(0);
  });
});

describe("parseYahooChart", () => {
  it("parses points, quote and stats", () => {
    const result = parseYahooChart(chartPayload([5.0, 5.1, 4.9, 5.04]), "1d");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { quote, points, stats } = result.value;
    expect(points).toHaveLength(4);
    expect(points[0]).toEqual({ t: BASE_TS * 1000, c: 5.0 });
    expect(quote).toMatchObject({
      symbol: "USDBRL=X",
      name: "USD/BRL",
      currency: "BRL",
      exchange: "CCY",
      price: 5.04,
      previousClose: 5.0,
      priceHint: 4,
    });
    expect(stats.high).toBe(5.1);
    expect(stats.low).toBe(4.9);
  });

  it("measures the 1D change against yesterday's close", () => {
    const result = parseYahooChart(chartPayload([5.2, 5.3]), "1d");
    expect(result.ok && result.value.stats.change).toBeCloseTo(0.3, 10);
  });

  it("measures other ranges against the first point and ignores chartPreviousClose", () => {
    const result = parseYahooChart(chartPayload([5.2, 5.3]), "5d");
    expect(result.ok && result.value.stats.change).toBeCloseTo(0.1, 10);
    expect(result.ok && result.value.quote.previousClose).toBeNull();
  });

  it("skips points whose close is null (market closed gaps)", () => {
    const result = parseYahooChart(chartPayload([5.0, null, 5.2, null]), "1d");
    expect(result.ok && result.value.points.map((p) => p.c)).toEqual([
      5.0, 5.2,
    ]);
  });

  it("keeps only the last 7 days for the 1W range", () => {
    const hours = 24 * 20; // 20 days of hourly data
    const closes = Array.from({ length: hours }, (_, i) => 100 + i);
    const result = parseYahooChart(chartPayload(closes), "1w");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { points } = result.value;
    const spanMs = points[points.length - 1].t - points[0].t;
    expect(spanMs).toBeLessThanOrEqual(7 * 24 * 3600 * 1000);
    expect(spanMs).toBeGreaterThan(6.9 * 24 * 3600 * 1000);
    expect(points[points.length - 1].c).toBe(100 + hours - 1);
  });

  it("falls back to sensible defaults when optional meta is missing", () => {
    const payload = chartPayload([7, 8], {
      longName: undefined,
      shortName: undefined,
      currency: undefined,
      regularMarketPrice: undefined,
      regularMarketTime: undefined,
      fullExchangeName: undefined,
      priceHint: undefined,
    });
    const result = parseYahooChart(payload, "1d");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.quote).toMatchObject({
      name: "USDBRL=X",
      currency: "USD",
      price: 8,
      exchange: "",
      priceHint: null,
    });
  });

  it("reports Yahoo's error description", () => {
    const result = parseYahooChart(
      {
        chart: {
          result: null,
          error: {
            code: "Not Found",
            description: "No data found, symbol may be delisted",
          },
        },
      },
      "1d",
    );
    expect(result).toEqual({
      ok: false,
      error: "No data found, symbol may be delisted",
    });
  });

  it.each([
    null,
    undefined,
    42,
    "x",
    [],
    {},
    { chart: null },
    { chart: { result: [] } },
  ])("rejects the malformed payload %j", (payload) => {
    expect(parseYahooChart(payload, "1d").ok).toBe(false);
  });

  it("rejects a payload without any usable close", () => {
    expect(parseYahooChart(chartPayload([null, null]), "1d").ok).toBe(false);
  });
});

describe("dayChange", () => {
  const quote = {
    symbol: "X",
    name: "X",
    currency: "USD",
    exchange: "",
    price: 110,
    previousClose: 100,
    priceHint: null,
    updatedAt: 0,
  };

  it("computes absolute and percent change", () => {
    expect(dayChange(quote)).toEqual({ change: 10, changePercent: 10 });
    expect(dayChange({ ...quote, price: 90 })).toEqual({
      change: -10,
      changePercent: -10,
    });
  });

  it("returns null without a usable previous close", () => {
    expect(dayChange({ ...quote, previousClose: null })).toBeNull();
    expect(dayChange({ ...quote, previousClose: 0 })).toBeNull();
  });
});

describe("parseYahooSearch", () => {
  const entry = (overrides: Record<string, unknown>) => ({
    symbol: "PETR4.SA",
    quoteType: "EQUITY",
    longname: "Petróleo Brasileiro S.A. - Petrobras",
    shortname: "PETROBRAS PN",
    exchDisp: "São Paulo",
    ...overrides,
  });

  it("maps results to our shape", () => {
    expect(parseYahooSearch({ quotes: [entry({})] })).toEqual([
      {
        symbol: "PETR4.SA",
        name: "Petróleo Brasileiro S.A. - Petrobras",
        type: "EQUITY",
        exchange: "São Paulo",
      },
    ]);
  });

  it("falls back to the short name, then the symbol", () => {
    const results = parseYahooSearch({
      quotes: [
        entry({ longname: undefined }),
        entry({
          symbol: "VALE3.SA",
          longname: undefined,
          shortname: undefined,
        }),
      ],
    });
    expect(results[0].name).toBe("PETROBRAS PN");
    expect(results[1].name).toBe("VALE3.SA");
  });

  it("drops unsupported types, invalid symbols and malformed entries", () => {
    const results = parseYahooSearch({
      quotes: [
        entry({ symbol: "OPT1", quoteType: "OPTION" }),
        entry({ symbol: "../x" }),
        entry({ symbol: undefined }),
        "garbage",
        null,
        entry({ symbol: "AAPL", quoteType: "EQUITY" }),
      ],
    });
    expect(results.map((r) => r.symbol)).toEqual(["AAPL"]);
  });

  it("limits the number of results", () => {
    const quotes = Array.from({ length: 20 }, (_, i) =>
      entry({ symbol: `SYM${i}` }),
    );
    expect(parseYahooSearch({ quotes })).toHaveLength(8);
  });

  it.each([
    null,
    undefined,
    {},
    { quotes: "nope" },
    5,
  ])("returns [] for %j", (payload) => {
    expect(parseYahooSearch(payload)).toEqual([]);
  });
});
