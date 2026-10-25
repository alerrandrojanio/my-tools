import {
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  type PDFRef,
} from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import {
  type CompressOptions,
  compressPdf,
  fitWithin,
  type JpegEncoder,
  pixelsToRgba,
  unpredictPng,
  validatePdfFile,
} from "./pdf-compress";

const RECOMPRESS: CompressOptions = {
  images: "recompress",
  quality: 0.65,
  maxSize: null,
};

/** A noisy image, so its Flate stream is clearly larger than a tiny fake JPEG. */
function noisyPixels(width: number, height: number, components: number) {
  const pixels = new Uint8Array(width * height * components);
  let seed = 7;
  for (let i = 0; i < pixels.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    pixels[i] = seed & 0xff;
  }
  return pixels;
}

const FAKE_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

/** A one-page PDF drawing a photo with a soft mask, plus an unused object. */
async function buildPdf() {
  const doc = await PDFDocument.create();
  const { context } = doc;
  const mask = context.register(
    context.flateStream(noisyPixels(40, 20, 1), {
      Type: "XObject",
      Subtype: "Image",
      Width: 40,
      Height: 20,
      ColorSpace: "DeviceGray",
      BitsPerComponent: 8,
    }),
  );
  const photo = context.register(
    context.flateStream(noisyPixels(40, 20, 3), {
      Type: "XObject",
      Subtype: "Image",
      Width: 40,
      Height: 20,
      ColorSpace: "DeviceRGB",
      BitsPerComponent: 8,
      SMask: mask,
    }),
  );
  const page = doc.addPage([200, 100]);
  page.node.setXObject(PDFName.of("Im0"), photo);
  context.register(context.flateStream(noisyPixels(500, 1, 1)));
  return { bytes: await doc.save(), photo, mask };
}

async function readImage(bytes: Uint8Array, ref: PDFRef) {
  const doc = await PDFDocument.load(bytes);
  const stream = doc.context.lookup(ref);
  if (!(stream instanceof PDFRawStream)) throw new Error("not a stream");
  return stream.dict;
}

describe("validatePdfFile", () => {
  it("accepts PDFs by type or extension", () => {
    const byType = new File(["x"], "a", { type: "application/pdf" });
    const byName = new File(["x"], "Relatório.PDF");
    expect(validatePdfFile(byType)).toBeNull();
    expect(validatePdfFile(byName)).toBeNull();
  });

  it("rejects other files", () => {
    const file = new File(["x"], "foto.png", { type: "image/png" });
    expect(validatePdfFile(file)).toBe('"foto.png" is not a PDF file.');
  });
});

describe("fitWithin", () => {
  it("keeps sizes that already fit", () => {
    expect(fitWithin(1000, 500, 1600)).toEqual({ width: 1000, height: 500 });
    expect(fitWithin(5000, 3000, null)).toEqual({ width: 5000, height: 3000 });
  });

  it("scales the longest side down, keeping the aspect ratio", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1000, 3000, 1000)).toEqual({ width: 333, height: 1000 });
  });
});

describe("unpredictPng", () => {
  it("reverses the None, Sub, Up, Average and Paeth filters", () => {
    // 2 pixels × 1 component per row; expected rows: [10, 20], [30, 50] …
    const data = new Uint8Array([
      0,
      10,
      20, // None
      1,
      30,
      20, // Sub: 30, 30+20
      2,
      5,
      5, // Up: 30+5, 50+5
      3,
      17,
      12, // Average: 35/2+17=34, (34+55)/2+12=56
      4,
      1,
      1, // Paeth: upper 34 → 35, then nearest of 35/56/34 → 56+1
    ]);
    expect(Array.from(unpredictPng(data, 2, 1))).toEqual([
      10, 20, 30, 50, 35, 55, 34, 56, 35, 57,
    ]);
  });
});

describe("pixelsToRgba", () => {
  it("expands gray and RGB pixels", () => {
    expect(Array.from(pixelsToRgba(new Uint8Array([9, 200]), 1, 2, 1))).toEqual(
      [9, 9, 9, 255, 200, 200, 200, 255],
    );
    expect(
      Array.from(pixelsToRgba(new Uint8Array([1, 2, 3]), 3, 1, 1)),
    ).toEqual([1, 2, 3, 255]);
  });
});

describe("compressPdf", () => {
  it("re-encodes photos as JPEG and skips soft masks", async () => {
    const { bytes, photo, mask } = await buildPdf();
    const encode = vi.fn<JpegEncoder>(async () => FAKE_JPEG);

    const result = await compressPdf(bytes, RECOMPRESS, encode);

    expect(result).toMatchObject({
      images: 2,
      recompressed: 1,
      unchanged: false,
    });
    expect(result.bytes.length).toBeLessThan(bytes.length);
    expect(encode).toHaveBeenCalledTimes(1);
    const [source, target, quality] = encode.mock.calls[0];
    expect(source).toMatchObject({ kind: "pixels", components: 3, width: 40 });
    expect(target).toEqual({ width: 40, height: 20 });
    expect(quality).toBe(0.65);

    const photoDict = await readImage(result.bytes, photo);
    expect(photoDict.get(PDFName.of("Filter"))).toBe(PDFName.of("DCTDecode"));
    const maskDict = await readImage(result.bytes, mask);
    expect(maskDict.get(PDFName.of("Filter"))).toBe(PDFName.of("FlateDecode"));
  });

  it("writes the new size when images are scaled down", async () => {
    const { bytes, photo } = await buildPdf();
    const encode = vi.fn<JpegEncoder>(async () => FAKE_JPEG);

    const result = await compressPdf(
      bytes,
      { ...RECOMPRESS, maxSize: 10 },
      encode,
    );

    expect(encode.mock.calls[0][1]).toEqual({ width: 10, height: 5 });
    const dict = await readImage(result.bytes, photo);
    expect(dict.get(PDFName.of("Width"))).toEqual(PDFNumber.of(10));
    expect(dict.get(PDFName.of("Height"))).toEqual(PDFNumber.of(5));
  });

  it("keeps an image when the JPEG would be larger", async () => {
    const { bytes, photo } = await buildPdf();
    const huge = new Uint8Array(1_000_000);

    const result = await compressPdf(bytes, RECOMPRESS, async () => huge);

    expect(result.recompressed).toBe(0);
    const dict = await readImage(result.bytes, photo);
    expect(dict.get(PDFName.of("Filter"))).toBe(PDFName.of("FlateDecode"));
  });

  it("only restructures the file when images are kept", async () => {
    const { bytes } = await buildPdf();
    const encode = vi.fn<JpegEncoder>(async () => FAKE_JPEG);

    const result = await compressPdf(
      bytes,
      { ...RECOMPRESS, images: "keep" },
      encode,
    );

    expect(encode).not.toHaveBeenCalled();
    expect(result.recompressed).toBe(0);
    // The unused 500-byte object is dropped.
    expect(result.bytes.length).toBeLessThan(bytes.length);
    const doc = await PDFDocument.load(result.bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("returns the original when nothing gets smaller", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const bytes = await doc.save({ useObjectStreams: true });

    const result = await compressPdf(bytes, RECOMPRESS, async () => null);

    expect(result.unchanged).toBe(true);
    expect(result.bytes).toBe(bytes);
  });

  it("reports progress", async () => {
    const { bytes } = await buildPdf();
    const progress = vi.fn();

    await compressPdf(bytes, RECOMPRESS, async () => FAKE_JPEG, progress);

    expect(progress).toHaveBeenLastCalledWith(2, 2);
  });

  it("rejects files that are not PDFs", async () => {
    const bytes = new TextEncoder().encode("hello, not a pdf");
    await expect(
      compressPdf(bytes, RECOMPRESS, async () => null),
    ).rejects.toThrow("This file could not be read as a PDF.");
  });
});
