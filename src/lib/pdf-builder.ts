export interface PdfJpegPage {
  /** Raw JPEG file bytes. */
  jpeg: Uint8Array;
  /** Image size in pixels. */
  width: number;
  height: number;
}

/** CSS pixels (96dpi) to PDF points (72dpi). */
const PX_TO_PT = 0.75;

export type PageSizeMode = "image" | "a4";

export interface PageLayout {
  /** Page size in PDF points. */
  pageWidth: number;
  pageHeight: number;
  /** Image placement in PDF points, origin at the bottom-left corner. */
  x: number;
  y: number;
  width: number;
  height: number;
}

const A4_SHORT_PT = 595.28;
const A4_LONG_PT = 841.89;
const A4_MARGIN_PT = 28.35; // 1 cm

/**
 * Computes the page size and image placement. "image" sizes the page to the
 * image; "a4" uses a portrait A4 page and fits the image
 * inside a 1 cm margin, centered, keeping its aspect ratio.
 */
export function layoutPage(
  image: { width: number; height: number },
  mode: PageSizeMode,
): PageLayout {
  if (mode === "image") {
    const width = image.width * PX_TO_PT;
    const height = image.height * PX_TO_PT;
    return { pageWidth: width, pageHeight: height, x: 0, y: 0, width, height };
  }

  const pageWidth = A4_SHORT_PT;
  const pageHeight = A4_LONG_PT;
  const scale = Math.min(
    (pageWidth - 2 * A4_MARGIN_PT) / image.width,
    (pageHeight - 2 * A4_MARGIN_PT) / image.height,
  );
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    pageWidth,
    pageHeight,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

function fmt(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/**
 * Builds a PDF with one JPEG per page, laid out according to `mode`.
 * Object layout: 1 = catalog, 2 = pages, then (page, content, image) per page.
 */
export function buildPdfFromJpegs(
  pages: readonly PdfJpegPage[],
  mode: PageSizeMode = "image",
): Uint8Array {
  if (pages.length === 0) throw new Error("At least one page is required.");

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (chunk: Uint8Array | string) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    length += bytes.length;
  };

  const beginObject = (id: number) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
  };

  push("%PDF-1.4\n%âãÏÓ\n");

  const pageIds = pages.map((_, index) => 3 + index * 3);

  beginObject(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  beginObject(2);
  push(
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] >>\nendobj\n`,
  );

  pages.forEach((page, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const layout = layoutPage(page, mode);

    beginObject(pageId);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(layout.pageWidth)} ${fmt(layout.pageHeight)}] ` +
        `/Resources << /XObject << /Im0 ${imageId} 0 R >> >> ` +
        `/Contents ${contentId} 0 R >>\nendobj\n`,
    );

    const content = `q ${fmt(layout.width)} 0 0 ${fmt(layout.height)} ${fmt(layout.x)} ${fmt(layout.y)} cm /Im0 Do Q`;
    beginObject(contentId);
    push(
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
    );

    beginObject(imageId);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
        `/Length ${page.jpeg.length} >>\nstream\n`,
    );
    push(page.jpeg);
    push("\nendstream\nendobj\n");
  });

  const objectCount = 2 + pages.length * 3;
  const xrefOffset = length;
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= objectCount; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  const output = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  return output;
}
