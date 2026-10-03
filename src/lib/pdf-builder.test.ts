import { describe, expect, it } from "vitest";
import { buildPdfFromJpegs, layoutPage } from "./pdf-builder";

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

function toText(pdf: Uint8Array): string {
  return Buffer.from(pdf).toString("latin1");
}

describe("layoutPage", () => {
  it("sizes the page to the image in 'image' mode (96dpi to 72dpi)", () => {
    expect(layoutPage({ width: 400, height: 800 }, "image")).toEqual({
      pageWidth: 300,
      pageHeight: 600,
      x: 0,
      y: 0,
      width: 300,
      height: 600,
    });
  });

  it("always uses a portrait A4 page in 'a4' mode", () => {
    for (const image of [
      { width: 1000, height: 500 },
      { width: 500, height: 1000 },
      { width: 800, height: 800 },
    ]) {
      const layout = layoutPage(image, "a4");
      expect(layout.pageWidth).toBe(A4_WIDTH);
      expect(layout.pageHeight).toBe(A4_HEIGHT);
    }
  });

  it("fits the image inside the margins, centered, keeping its ratio", () => {
    const margin = 28.35;
    for (const image of [
      { width: 1000, height: 500 },
      { width: 500, height: 1000 },
      { width: 40, height: 40 },
    ]) {
      const layout = layoutPage(image, "a4");
      expect(layout.x).toBeGreaterThanOrEqual(margin - 0.001);
      expect(layout.y).toBeGreaterThanOrEqual(margin - 0.001);
      expect(layout.x + layout.width).toBeLessThanOrEqual(
        A4_WIDTH - margin + 0.001,
      );
      expect(layout.y + layout.height).toBeLessThanOrEqual(
        A4_HEIGHT - margin + 0.001,
      );
      expect(layout.x).toBeCloseTo(A4_WIDTH - layout.x - layout.width, 5);
      expect(layout.y).toBeCloseTo(A4_HEIGHT - layout.y - layout.height, 5);
      expect(layout.width / layout.height).toBeCloseTo(
        image.width / image.height,
        5,
      );
    }
  });
});

describe("buildPdfFromJpegs", () => {
  it("rejects an empty page list", () => {
    expect(() => buildPdfFromJpegs([])).toThrow();
  });

  it("writes a PDF header, trailer and one page object per image", () => {
    const pdf = toText(
      buildPdfFromJpegs([
        { jpeg: JPEG, width: 100, height: 50 },
        { jpeg: JPEG, width: 80, height: 80 },
      ]),
    );
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdf).toContain("/Count 2");
    expect(pdf.match(/\/Type \/Page /g)).toHaveLength(2);
    expect(pdf.match(/\/Filter \/DCTDecode/g)).toHaveLength(2);
  });

  it("uses the image size for MediaBox in 'image' mode and A4 in 'a4' mode", () => {
    const page = [{ jpeg: JPEG, width: 400, height: 800 }];
    expect(toText(buildPdfFromJpegs(page, "image"))).toContain(
      "/MediaBox [0 0 300 600]",
    );
    expect(toText(buildPdfFromJpegs(page, "a4"))).toContain(
      "/MediaBox [0 0 595.28 841.89]",
    );
  });

  it("has a cross-reference table whose offsets point at each object", () => {
    const pdf = toText(
      buildPdfFromJpegs([
        { jpeg: JPEG, width: 100, height: 50 },
        { jpeg: JPEG, width: 80, height: 80 },
      ]),
    );
    const startxref = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
    expect(pdf.slice(startxref, startxref + 4)).toBe("xref");

    const offsets = [...pdf.slice(startxref).matchAll(/(\d{10}) 00000 n/g)].map(
      (m) => Number(m[1]),
    );
    expect(offsets).toHaveLength(8); // catalog + pages + 2 x (page, content, image)
    offsets.forEach((offset, index) => {
      expect(pdf.startsWith(`${index + 1} 0 obj`, offset)).toBe(true);
    });
  });

  it("embeds the JPEG bytes unchanged", () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
    const bytes = buildPdfFromJpegs([{ jpeg, width: 10, height: 10 }]);
    expect(Buffer.from(bytes).includes(Buffer.from(jpeg))).toBe(true);
  });
});
