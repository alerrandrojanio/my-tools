import { describe, expect, it } from "vitest";
import {
  decimalsFor,
  directionOf,
  formatAxisTime,
  formatNumber,
  formatPercent,
  formatPrice,
  formatSigned,
  formatTooltipTime,
} from "./market-format";

describe("decimalsFor", () => {
  it("prefers Yahoo's price hint", () => {
    expect(decimalsFor(5.04, 4)).toBe(4);
    expect(decimalsFor(345.8, 2)).toBe(2);
  });

  it("falls back to magnitude", () => {
    expect(decimalsFor(345.8, null)).toBe(2);
    expect(decimalsFor(0.5, null)).toBe(4);
    expect(decimalsFor(0.0031, null)).toBe(5);
  });

  it("ignores a nonsensical hint", () => {
    expect(decimalsFor(10, -1)).toBe(2);
    expect(decimalsFor(10, 99)).toBe(2);
  });
});

describe("formatPrice", () => {
  it("formats currencies with the requested decimals", () => {
    expect(formatPrice(5.0398, "BRL", 4, "en-US")).toBe("R$5.0398");
    expect(formatPrice(345.816, "USD", 2, "en-US")).toBe("$345.82");
  });

  it("does not throw on an unknown currency code", () => {
    expect(formatPrice(12.5, "NOT-A-CODE", 2, "en-US")).toBe(
      "12.50 NOT-A-CODE",
    );
  });
});

describe("directions and signs", () => {
  it("classifies direction", () => {
    expect(directionOf(0.1)).toBe("up");
    expect(directionOf(-0.1)).toBe("down");
    expect(directionOf(0)).toBe("flat");
  });

  it("formats percentages with an explicit sign", () => {
    expect(formatPercent(1.234, "en-US")).toBe("+1.23%");
    expect(formatPercent(-0.5, "en-US")).toBe("−0.50%");
    expect(formatPercent(0, "en-US")).toBe("0.00%");
  });

  it("formats signed amounts", () => {
    expect(formatSigned(0.0234, 4, "en-US")).toBe("+0.0234");
    expect(formatSigned(-12.5, 2, "en-US")).toBe("−12.50");
    expect(formatSigned(0, 2, "en-US")).toBe("0.00");
  });

  it("formats plain numbers", () => {
    expect(formatNumber(1234.5, 1, "en-US")).toBe("1,234.5");
  });
});

describe("time formatting", () => {
  const ms = Date.UTC(2026, 9, 14, 15, 30); // 14 Oct 2026, 15:30 UTC

  it("shows a clock time for 1D and dates for longer ranges", () => {
    expect(formatAxisTime(ms, "1d", "en-US")).toMatch(/\d{2}:\d{2}/);
    expect(formatAxisTime(ms, "5d", "en-US")).toMatch(/Oct/);
    expect(formatAxisTime(ms, "5y", "en-US")).toMatch(/2026/);
  });

  it("includes the time in tooltips only for intraday-resolution ranges", () => {
    expect(formatTooltipTime(ms, "1d", "en-US")).toMatch(/\d{2}:\d{2}/);
    expect(formatTooltipTime(ms, "1m", "en-US")).toMatch(/\d{2}:\d{2}/);
    expect(formatTooltipTime(ms, "1y", "en-US")).not.toMatch(/\d{2}:\d{2}/);
    expect(formatTooltipTime(ms, "1y", "en-US")).toMatch(/2026/);
  });
});
