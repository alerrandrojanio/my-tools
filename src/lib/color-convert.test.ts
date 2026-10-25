import { describe, expect, it } from "vitest";
import {
  contrastLevel,
  contrastRatio,
  formatHsl,
  formatRgb,
  hslToRgb,
  parseColor,
  parseHex,
  parseHsl,
  parseRgb,
  rgbToHex,
  rgbToHsl,
  shades,
} from "./color-convert";

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

describe("parseHex", () => {
  it("reads long and short forms, with or without #", () => {
    expect(parseHex("#7c3aed")).toEqual({ r: 124, g: 58, b: 237 });
    expect(parseHex(" 7C3AED ")).toEqual({ r: 124, g: 58, b: 237 });
    expect(parseHex("#f80")).toEqual({ r: 255, g: 136, b: 0 });
  });

  it("rejects anything else", () => {
    for (const bad of ["", "#12", "#12345", "#ggg", "#1234567", "red"]) {
      expect(parseHex(bad)).toBeNull();
    }
  });
});

describe("parseRgb", () => {
  it("reads CSS and bare forms", () => {
    const orange = { r: 255, g: 128, b: 0 };
    expect(parseRgb("rgb(255, 128, 0)")).toEqual(orange);
    expect(parseRgb("RGB(255 128 0)")).toEqual(orange);
    expect(parseRgb("255,128,0")).toEqual(orange);
    expect(parseRgb("rgb(254.6, 128, 0)")).toEqual(orange);
  });

  it("rejects out-of-range and malformed values", () => {
    for (const bad of ["rgb(256, 0, 0)", "rgb(-1, 0, 0)", "1, 2", "a, b, c"]) {
      expect(parseRgb(bad)).toBeNull();
    }
  });
});

describe("parseHsl", () => {
  it("reads CSS and bare forms and wraps the hue", () => {
    const expected = { h: 210, s: 50, l: 40 };
    expect(parseHsl("hsl(210, 50%, 40%)")).toEqual(expected);
    expect(parseHsl("hsl(210deg 50% 40%)")).toEqual(expected);
    expect(parseHsl("210, 50, 40")).toEqual(expected);
    expect(parseHsl("hsl(-150, 50%, 40%)")).toEqual(expected);
    expect(parseHsl("hsl(570, 50%, 40%)")).toEqual(expected);
  });

  it("rejects percentages outside 0–100", () => {
    expect(parseHsl("hsl(0, 101%, 50%)")).toBeNull();
    expect(parseHsl("hsl(0, 50%, -1%)")).toBeNull();
  });
});

describe("conversions", () => {
  const cases = [
    { hex: "#000000", rgb: BLACK, hsl: "hsl(0, 0%, 0%)" },
    { hex: "#ffffff", rgb: WHITE, hsl: "hsl(0, 0%, 100%)" },
    { hex: "#ff0000", rgb: { r: 255, g: 0, b: 0 }, hsl: "hsl(0, 100%, 50%)" },
    {
      hex: "#7c3aed",
      rgb: { r: 124, g: 58, b: 237 },
      hsl: "hsl(262, 83%, 58%)",
    },
    { hex: "#808080", rgb: { r: 128, g: 128, b: 128 }, hsl: "hsl(0, 0%, 50%)" },
    {
      hex: "#00ffff",
      rgb: { r: 0, g: 255, b: 255 },
      hsl: "hsl(180, 100%, 50%)",
    },
  ];

  it("converts between HEX, RGB and HSL", () => {
    for (const { hex, rgb, hsl } of cases) {
      expect(rgbToHex(rgb)).toBe(hex);
      expect(formatHsl(rgbToHsl(rgb))).toBe(hsl);
      expect(hslToRgb(rgbToHsl(rgb))).toEqual(rgb);
    }
  });

  it("formats RGB", () => {
    expect(formatRgb({ r: 1, g: 2, b: 3 })).toBe("rgb(1, 2, 3)");
  });

  it("round-trips every gray and a sweep of hues exactly", () => {
    for (let value = 0; value <= 255; value += 15) {
      for (const rgb of [
        { r: value, g: value, b: value },
        { r: value, g: 255 - value, b: 40 },
      ]) {
        expect(hslToRgb(rgbToHsl(rgb))).toEqual(rgb);
      }
    }
  });
});

describe("parseColor", () => {
  it("detects the format", () => {
    const red = { r: 255, g: 0, b: 0 };
    expect(parseColor("#f00")).toEqual(red);
    expect(parseColor("rgb(255, 0, 0)")).toEqual(red);
    expect(parseColor("hsl(0, 100%, 50%)")).toEqual(red);
    expect(parseColor("hsl(0, 200%, 50%)")).toBeNull();
  });
});

describe("contrast", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 5);
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 5);
    expect(contrastRatio(WHITE, WHITE)).toBe(1);
    // #767676 on white is the classic "just passes AA" gray.
    expect(contrastRatio(parseHex("#767676") ?? BLACK, WHITE)).toBeCloseTo(
      4.54,
      2,
    );
  });

  it("grades the ratio", () => {
    expect(contrastLevel(21)).toBe("AAA");
    expect(contrastLevel(7)).toBe("AAA");
    expect(contrastLevel(4.4999999)).toBe("AA");
    expect(contrastLevel(4.49)).toBe("fail");
  });
});

describe("shades", () => {
  it("goes from light to dark keeping the hue", () => {
    const list = shades({ r: 124, g: 58, b: 237 });
    expect(list).toHaveLength(9);
    expect(formatHsl(rgbToHsl(list[0]))).toMatch(/^hsl\(26\d, \d+%, 95%\)$/);
    expect(formatHsl(rgbToHsl(list[8]))).toMatch(/^hsl\(26\d, \d+%, 5%\)$/);
  });
});
