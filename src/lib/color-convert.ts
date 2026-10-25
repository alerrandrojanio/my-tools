/** Channels from 0 to 255. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Hue in degrees (0–359), saturation and lightness in percent (0–100). */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Accepts "#1a2b3c", "1a2b3c", "#abc" or "abc". */
export function parseHex(input: string): Rgb | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) hex = [...hex].map((digit) => digit + digit).join("");
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

/** The three numbers of "rgb(…)"/"hsl(…)" or a bare list, with optional units. */
function parseTriple(
  input: string,
  prefix: string,
  units: [RegExp, RegExp, RegExp],
): [number, number, number] | null {
  let body = input.trim().toLowerCase();
  const wrapped = new RegExp(`^${prefix}a?\\((.*)\\)$`).exec(body);
  if (wrapped) body = wrapped[1];
  const parts = body.split(/[\s,]+/).filter((part) => part !== "");
  if (parts.length !== 3) return null;

  const values: number[] = [];
  for (const [index, part] of parts.entries()) {
    const match = units[index].exec(part);
    if (!match) return null;
    values.push(Number(match[1]));
  }
  return values.every(Number.isFinite)
    ? (values as [number, number, number])
    : null;
}

const NUMBER = String.raw`(-?\d+(?:\.\d+)?|-?\.\d+)`;

/** Accepts "rgb(255, 128, 0)", "rgb(255 128 0)" or "255, 128, 0". */
export function parseRgb(input: string): Rgb | null {
  const plain = new RegExp(`^${NUMBER}$`);
  const values = parseTriple(input, "rgb", [plain, plain, plain]);
  if (!values || values.some((value) => value < 0 || value > 255)) {
    return null;
  }
  const [r, g, b] = values.map(Math.round);
  return { r, g, b };
}

/** Accepts "hsl(210, 50%, 40%)", "hsl(210deg 50% 40%)" or "210, 50, 40". */
export function parseHsl(input: string): Hsl | null {
  const hue = new RegExp(`^${NUMBER}(?:deg)?$`);
  const percent = new RegExp(`^${NUMBER}%?$`);
  const values = parseTriple(input, "hsl", [hue, percent, percent]);
  if (!values) return null;
  const [h, s, l] = values;
  if (s < 0 || s > 100 || l < 0 || l > 100) return null;
  return { h: ((h % 360) + 360) % 360, s, l };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map((channel) =>
      Math.round(clamp(channel, 0, 255))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l: l * 100 };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === red) h = ((green - blue) / delta) % 6;
  else if (max === green) h = (blue - red) / delta + 2;
  else h = (red - green) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sat = s / 100;
  const light = l / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const sector = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  const [r1, g1, b1] =
    sector < 1
      ? [chroma, x, 0]
      : sector < 2
        ? [x, chroma, 0]
        : sector < 3
          ? [0, chroma, x]
          : sector < 4
            ? [0, x, chroma]
            : sector < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const m = light - chroma / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function formatRgb({ r, g, b }: Rgb): string {
  return `rgb(${r}, ${g}, ${b})`;
}

export function formatHsl(hsl: Hsl): string {
  // 359.6° rounds to 360°, which is the same as 0°.
  const h = Math.round(hsl.h) % 360;
  return `hsl(${h}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}

/** Reads a color written as HEX, rgb(…) or hsl(…). */
export function parseColor(input: string): Rgb | null {
  const text = input.trim().toLowerCase();
  if (text.startsWith("rgb")) return parseRgb(text);
  if (text.startsWith("hsl")) {
    const hsl = parseHsl(text);
    return hsl ? hslToRgb(hsl) : null;
  }
  return parseHex(text);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance({ r, g, b }: Rgb): number {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio between two colors, from 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** WCAG level for normal-size text: AAA ≥ 7, AA ≥ 4.5. */
export function contrastLevel(ratio: number): "AAA" | "AA" | "fail" {
  // Rounded first so 4.4999… from floating point doesn't fail a real 4.5.
  const rounded = Math.round(ratio * 100) / 100;
  return rounded >= 7 ? "AAA" : rounded >= 4.5 ? "AA" : "fail";
}

/** Lighter and darker versions of a color, from near white to near black. */
export function shades(rgb: Rgb, steps = 9): Rgb[] {
  const { h, s } = rgbToHsl(rgb);
  return Array.from({ length: steps }, (_, index) =>
    hslToRgb({ h, s, l: 95 - (index * 90) / (steps - 1) }),
  );
}
