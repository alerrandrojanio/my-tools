import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRateLimited } from "@/lib/rate-limit";
import { getChart, getQuote, searchSymbols } from "@/lib/yahoo-finance";
import { GET as chartGET } from "./chart/route";
import { GET as overviewGET } from "./overview/route";
import { GET as searchGET } from "./search/route";

vi.mock("@/lib/rate-limit", () => ({ isRateLimited: vi.fn() }));
vi.mock("@/lib/yahoo-finance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/yahoo-finance")>();
  return {
    ...actual,
    getChart: vi.fn(),
    getQuote: vi.fn(),
    searchSymbols: vi.fn(),
  };
});

const { MarketDataError } = await vi.importActual<
  typeof import("@/lib/yahoo-finance")
>("@/lib/yahoo-finance");

function request(path: string, headers?: HeadersInit): Request {
  return new Request(`https://site.test/api/markets/${path}`, { headers });
}

const quote = (symbol: string) => ({
  symbol,
  name: symbol,
  currency: "USD",
  exchange: "",
  price: 10,
  previousClose: 9,
  priceHint: 2,
  updatedAt: 0,
});

beforeEach(() => {
  vi.mocked(isRateLimited).mockResolvedValue(false);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("GET /api/markets/chart", () => {
  it("returns the chart for a valid symbol and range", async () => {
    vi.mocked(getChart).mockResolvedValue({ range: "5d", points: [] } as never);
    const response = await chartGET(
      request("chart?symbol=USDBRL%3DX&range=5d"),
    );

    expect(response.status).toBe(200);
    expect(getChart).toHaveBeenCalledWith("USDBRL=X", "5d");
    expect(await response.json()).toMatchObject({ range: "5d" });
  });

  it("defaults to the 1D range", async () => {
    vi.mocked(getChart).mockResolvedValue({} as never);
    await chartGET(request("chart?symbol=AAPL"));
    expect(getChart).toHaveBeenCalledWith("AAPL", "1d");
  });

  it.each([
    "",
    "../../etc/passwd",
    "a b",
    "A;B",
    "x".repeat(30),
  ])("rejects the symbol %j before touching the upstream", async (symbol) => {
    const response = await chartGET(
      request(`chart?symbol=${encodeURIComponent(symbol)}`),
    );
    expect(response.status).toBe(400);
    expect(getChart).not.toHaveBeenCalled();
  });

  it("rejects an unknown range", async () => {
    const response = await chartGET(request("chart?symbol=AAPL&range=99y"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid range." });
  });

  it("passes through a 404 for an unknown symbol", async () => {
    vi.mocked(getChart).mockRejectedValue(
      new MarketDataError("Symbol not found.", 404),
    );
    const response = await chartGET(request("chart?symbol=ZZZZ"));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Symbol not found." });
  });

  it("hides unexpected error details behind a generic 502", async () => {
    vi.mocked(getChart).mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.5:443"),
    );
    const response = await chartGET(request("chart?symbol=AAPL"));
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("10.0.0.5");
  });

  it("answers 429 when the client is rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);
    const response = await chartGET(request("chart?symbol=AAPL"));
    expect(response.status).toBe(429);
    expect(getChart).not.toHaveBeenCalled();
  });

  it("keeps working when the rate limiter itself fails (fail open)", async () => {
    vi.mocked(isRateLimited).mockRejectedValue(new Error("redis down"));
    vi.mocked(getChart).mockResolvedValue({ range: "1d" } as never);
    const response = await chartGET(request("chart?symbol=AAPL"));
    expect(response.status).toBe(200);
  });

  it("rate limits per client IP", async () => {
    vi.mocked(getChart).mockResolvedValue({} as never);
    await chartGET(
      request("chart?symbol=AAPL", { "x-forwarded-for": "9.8.7.6, 1.1.1.1" }),
    );
    expect(isRateLimited).toHaveBeenCalledWith("markets:9.8.7.6", 240, 60);
  });
});

describe("GET /api/markets/search", () => {
  it("returns results for a valid query", async () => {
    vi.mocked(searchSymbols).mockResolvedValue([
      {
        symbol: "PETR4.SA",
        name: "Petrobras",
        type: "EQUITY",
        exchange: "São Paulo",
      },
    ]);
    const response = await searchGET(request("search?q=petro"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      results: [
        {
          symbol: "PETR4.SA",
          name: "Petrobras",
          type: "EQUITY",
          exchange: "São Paulo",
        },
      ],
    });
    expect(searchSymbols).toHaveBeenCalledWith("petro");
  });

  it.each([
    "",
    "a",
    "   ",
    "x".repeat(41),
  ])("rejects the query %j", async (q) => {
    const response = await searchGET(
      request(`search?q=${encodeURIComponent(q)}`),
    );
    expect(response.status).toBe(400);
    expect(searchSymbols).not.toHaveBeenCalled();
  });

  it("rejects a missing query", async () => {
    expect((await searchGET(request("search"))).status).toBe(400);
  });

  it("maps upstream failures to 502", async () => {
    vi.mocked(searchSymbols).mockRejectedValue(
      new MarketDataError("down", 502),
    );
    expect((await searchGET(request("search?q=apple"))).status).toBe(502);
  });
});

describe("GET /api/markets/overview", () => {
  it("returns every item of the list with its quote", async () => {
    vi.mocked(getQuote).mockImplementation(async (symbol) => quote(symbol));
    const response = await overviewGET(request("overview?list=stocks-us"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.list).toBe("stocks-us");
    expect(body.items).toHaveLength(10);
    expect(body.items[0]).toMatchObject({
      symbol: "AAPL",
      name: "Apple",
      quote: { price: 10 },
    });
  });

  it("keeps the other items when one symbol fails", async () => {
    vi.mocked(getQuote).mockImplementation(async (symbol) => {
      if (symbol === "MSFT") throw new MarketDataError("down", 502);
      return quote(symbol);
    });
    const body = await (
      await overviewGET(request("overview?list=stocks-us"))
    ).json();

    expect(body.items).toHaveLength(10);
    expect(
      body.items.filter((item: { quote: unknown }) => item.quote === null),
    ).toHaveLength(1);
    expect(
      body.items.find((item: { symbol: string }) => item.symbol === "MSFT")
        .quote,
    ).toBeNull();
  });

  it("answers 502 when every symbol fails", async () => {
    vi.mocked(getQuote).mockRejectedValue(new MarketDataError("down", 502));
    expect(
      (await overviewGET(request("overview?list=currencies"))).status,
    ).toBe(502);
  });

  it.each(["", "nope", "../x"])("rejects the unknown list %j", async (list) => {
    const response = await overviewGET(
      request(`overview?list=${encodeURIComponent(list)}`),
    );
    expect(response.status).toBe(400);
    expect(getQuote).not.toHaveBeenCalled();
  });
});
