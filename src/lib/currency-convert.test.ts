import { describe, expect, it } from "vitest";
import {
  canConvert,
  convertAmount,
  convertChart,
  convertQuote,
} from "./currency-convert";
import type { ChartData, Quote } from "./market-data";

const quote = (over: Partial<Quote> = {}): Quote => ({
  symbol: "AAPL",
  name: "Apple",
  currency: "USD",
  exchange: "NMS",
  price: 100,
  previousClose: 90,
  priceHint: 2,
  updatedAt: 0,
  ...over,
});

describe("convertAmount", () => {
  it("converts both ways at the given rate", () => {
    expect(convertAmount(10, "USD", "BRL", 5)).toBe(50);
    expect(convertAmount(50, "BRL", "USD", 5)).toBe(10);
    expect(convertAmount(7, "USD", "USD", null)).toBe(7);
  });

  it("refuses unsupported pairs and bad rates", () => {
    expect(convertAmount(10, "EUR", "BRL", 5)).toBeNull();
    expect(convertAmount(10, "USD", "BRL", null)).toBeNull();
    expect(convertAmount(10, "USD", "BRL", 0)).toBeNull();
    expect(convertAmount(10, "USD", "BRL", Number.NaN)).toBeNull();
  });
});

describe("canConvert", () => {
  it("knows which currencies can be shown", () => {
    expect(canConvert("EUR", "native")).toBe(true);
    expect(canConvert("USD", "BRL")).toBe(true);
    expect(canConvert("BRL", "BRL")).toBe(true);
    expect(canConvert("EUR", "USD")).toBe(false);
  });
});

describe("convertQuote", () => {
  it("converts price and previous close and drops the decimals hint", () => {
    expect(convertQuote(quote(), "BRL", 5)).toMatchObject({
      currency: "BRL",
      price: 500,
      previousClose: 450,
      priceHint: null,
    });
  });

  it("keeps null previous close", () => {
    expect(
      convertQuote(quote({ previousClose: null }), "BRL", 5).previousClose,
    ).toBeNull();
  });

  it("returns the very same object when nothing changes", () => {
    const q = quote();
    expect(convertQuote(q, "native", 5)).toBe(q);
    expect(convertQuote(q, "USD", 5)).toBe(q);
    expect(convertQuote(q, "BRL", null)).toBe(q);
    const eur = quote({ currency: "EUR" });
    expect(convertQuote(eur, "BRL", 5)).toBe(eur);
  });
});

describe("convertChart", () => {
  const chart: ChartData = {
    quote: quote(),
    range: "1d",
    points: [
      { t: 1, c: 80 },
      { t: 2, c: 100 },
    ],
    stats: {
      first: 80,
      last: 100,
      high: 100,
      low: 80,
      change: 20,
      changePercent: 25,
    },
  };

  it("scales points and stats, keeping the percent change", () => {
    const out = convertChart(chart, "BRL", 5);
    expect(out.points).toEqual([
      { t: 1, c: 400 },
      { t: 2, c: 500 },
    ]);
    expect(out.stats).toEqual({
      first: 400,
      last: 500,
      high: 500,
      low: 400,
      change: 100,
      changePercent: 25,
    });
    expect(out.quote.currency).toBe("BRL");
  });

  it("returns the original chart when not converting", () => {
    expect(convertChart(chart, "native", 5)).toBe(chart);
  });
});
