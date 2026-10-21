import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearMarketCache,
  getChart,
  getQuote,
  MarketDataError,
  searchSymbols,
} from "./yahoo-finance";

const BASE_TS = 1_760_000_000;

function chartJson(symbol = "USDBRL=X") {
  return {
    chart: {
      result: [
        {
          meta: {
            symbol,
            currency: "BRL",
            regularMarketPrice: 5.04,
            chartPreviousClose: 5.0,
          },
          timestamp: [BASE_TS, BASE_TS + 300],
          indicators: { quote: [{ close: [5.0, 5.04] }] },
        },
      ],
      error: null,
    },
  };
}

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  clearMarketCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function requestedUrl(call = 0): URL {
  return new URL(String(fetchMock.mock.calls[call][0]));
}

describe("getChart: new trading day with no prices yet", () => {
  const HOUR = 3600;
  const emptyDay = {
    chart: {
      result: [
        {
          meta: {
            symbol: "USDBRL=X",
            currency: "BRL",
            regularMarketPrice: 5.05,
          },
          timestamp: [],
          indicators: { quote: [{ close: [] }] },
        },
      ],
      error: null,
    },
  };
  // 30 hours of hourly prices, the newest last.
  const lastDays = {
    chart: {
      result: [
        {
          meta: {
            symbol: "USDBRL=X",
            currency: "BRL",
            regularMarketPrice: 5.05,
          },
          timestamp: Array.from({ length: 31 }, (_, i) => BASE_TS + i * HOUR),
          indicators: {
            quote: [
              { close: Array.from({ length: 31 }, (_, i) => 5 + i / 1000) },
            ],
          },
        },
      ],
      error: null,
    },
  };

  it("falls back to the last 24 hours instead of failing", async () => {
    fetchMock
      .mockResolvedValueOnce(ok(emptyDay))
      .mockResolvedValueOnce(ok(lastDays));
    const data = await getChart("USDBRL=X", "1d");

    expect(requestedUrl(1).searchParams.get("range")).toBe("5d");
    expect(requestedUrl(1).searchParams.get("interval")).toBe("5m");
    expect(data.range).toBe("1d");
    expect(data.points).toHaveLength(25); // 24 h window, both ends included
    expect(data.points[0].t).toBe((BASE_TS + 6 * HOUR) * 1000);
    expect(data.stats.first).toBeCloseTo(5.006, 6);
    expect(data.quote.previousClose).toBeNull();
  });

  it("still reports the error when the fallback has no prices either", async () => {
    fetchMock.mockImplementation(async () => ok(emptyDay));
    await expect(getChart("USDBRL=X", "1d")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("does not fall back for other ranges", async () => {
    fetchMock.mockImplementation(async () => ok(emptyDay));
    await expect(getChart("USDBRL=X", "5d")).rejects.toBeInstanceOf(
      MarketDataError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("getChart", () => {
  it("requests the right range and interval, with the symbol URL-encoded", async () => {
    fetchMock.mockResolvedValue(ok(chartJson()));
    const data = await getChart("USDBRL=X", "5d");

    const url = requestedUrl();
    expect(url.hostname).toBe("query1.finance.yahoo.com");
    expect(url.pathname).toBe("/v8/finance/chart/USDBRL%3DX");
    expect(url.searchParams.get("range")).toBe("5d");
    expect(url.searchParams.get("interval")).toBe("15m");
    expect(data.quote.symbol).toBe("USDBRL=X");
    expect(data.points).toHaveLength(2);
  });

  it("sends a browser-like User-Agent", async () => {
    fetchMock.mockResolvedValue(ok(chartJson()));
    await getChart("AAPL", "1d");
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<
      string,
      string
    >;
    expect(headers["User-Agent"]).toContain("Mozilla/5.0");
  });

  it("maps the 1W range onto a month of hourly data", async () => {
    fetchMock.mockResolvedValue(ok(chartJson()));
    await getChart("AAPL", "1w");
    expect(requestedUrl().searchParams.get("range")).toBe("1mo");
    expect(requestedUrl().searchParams.get("interval")).toBe("60m");
  });

  it("serves repeated calls from cache and refetches after the TTL", async () => {
    fetchMock.mockImplementation(async () => ok(chartJson()));

    await getChart("AAPL", "1d");
    await getChart("AAPL", "1d");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-10-14T12:00:16Z")); // short TTL is 15s
    await getChart("AAPL", "1d");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps long ranges cached longer than intraday ones", async () => {
    fetchMock.mockImplementation(async () => ok(chartJson()));

    await getChart("AAPL", "1y");
    vi.setSystemTime(new Date("2026-10-14T12:01:00Z")); // 60s later
    await getChart("AAPL", "1y");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-10-14T12:02:01Z")); // past the 120s TTL
    await getChart("AAPL", "1y");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caches each symbol and range separately", async () => {
    fetchMock.mockImplementation(async () => ok(chartJson()));
    await getChart("AAPL", "1d");
    await getChart("MSFT", "1d");
    await getChart("AAPL", "5d");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("shares one upstream request between concurrent callers", async () => {
    fetchMock.mockImplementation(async () => ok(chartJson()));
    await Promise.all([
      getChart("AAPL", "1d"),
      getChart("AAPL", "1d"),
      getChart("AAPL", "1d"),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));
    await expect(getChart("AAPL", "1d")).rejects.toMatchObject({ status: 502 });

    fetchMock.mockResolvedValueOnce(ok(chartJson()));
    await expect(getChart("AAPL", "1d")).resolves.toMatchObject({
      range: "1d",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps upstream failures to our error type", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 404 }));
    await expect(getChart("NOPE", "1d")).rejects.toMatchObject({
      name: "MarketDataError",
      status: 404,
      message: "Symbol not found.",
    });

    clearMarketCache();
    fetchMock.mockResolvedValueOnce(new Response("", { status: 429 }));
    await expect(getChart("AAPL", "1d")).rejects.toMatchObject({ status: 502 });

    clearMarketCache();
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(getChart("AAPL", "1d")).rejects.toMatchObject({ status: 502 });

    clearMarketCache();
    fetchMock.mockResolvedValueOnce(
      new Response("<html>not json</html>", { status: 200 }),
    );
    await expect(getChart("AAPL", "1d")).rejects.toMatchObject({ status: 502 });
  });

  it("answers 404 when Yahoo returns no result for the symbol", async () => {
    fetchMock.mockResolvedValueOnce(
      ok({ chart: { result: null, error: { description: "No data found" } } }),
    );
    const error = await getChart("NOPE", "1d").catch((e) => e);
    expect(error).toBeInstanceOf(MarketDataError);
    expect(error).toMatchObject({ status: 404, message: "No data found" });
  });
});

describe("getQuote", () => {
  it("uses a minimal one-day request and returns just the quote", async () => {
    fetchMock.mockResolvedValue(ok(chartJson("AAPL")));
    const quote = await getQuote("AAPL");

    expect(requestedUrl().searchParams.get("range")).toBe("1d");
    expect(requestedUrl().searchParams.get("interval")).toBe("1d");
    expect(quote).toMatchObject({
      symbol: "AAPL",
      price: 5.04,
      previousClose: 5.0,
    });
  });
});

describe("searchSymbols", () => {
  const payload = {
    quotes: [
      {
        symbol: "PETR4.SA",
        quoteType: "EQUITY",
        longname: "Petrobras",
        exchDisp: "São Paulo",
      },
    ],
  };

  it("queries Yahoo search and parses the results", async () => {
    fetchMock.mockResolvedValue(ok(payload));
    const results = await searchSymbols("Petro");

    const url = requestedUrl();
    expect(url.pathname).toBe("/v1/finance/search");
    expect(url.searchParams.get("q")).toBe("petro");
    expect(results).toEqual([
      {
        symbol: "PETR4.SA",
        name: "Petrobras",
        type: "EQUITY",
        exchange: "São Paulo",
      },
    ]);
  });

  it("treats queries that differ only by case or spacing as the same", async () => {
    fetchMock.mockImplementation(async () => ok(payload));
    await searchSymbols("Petro");
    await searchSymbols("  PETRO ");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("escapes characters that could change the query", async () => {
    fetchMock.mockImplementation(async () => ok(payload));
    await searchSymbols("a&b=c#d");
    expect(requestedUrl().searchParams.get("q")).toBe("a&b=c#d");
    expect(requestedUrl().searchParams.get("quotesCount")).toBe("10");
  });
});
