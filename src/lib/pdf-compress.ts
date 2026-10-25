import {
  decodePDFRawStream,
  EncryptedPDFError,
  PDFArray,
  type PDFContext,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  type PDFObject,
  PDFRawStream,
  PDFRef,
  PDFStream,
} from "pdf-lib";

export const MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024;

/** Larger images are left alone: the canvas can't hold them in every browser. */
const MAX_IMAGE_PIXELS = 40_000_000;

export type ImageMode = "recompress" | "keep";

export interface CompressOptions {
  images: ImageMode;
  /** JPEG quality, 0–1. */
  quality: number;
  /** Longest side in pixels; null keeps the original resolution. */
  maxSize: number | null;
}

/** An image taken from the PDF, ready to be decoded by the encoder. */
export type ImageSource =
  | { kind: "jpeg"; bytes: Uint8Array; width: number; height: number }
  | {
      kind: "pixels";
      /** 8 bits per component, rows packed without padding. */
      pixels: Uint8Array;
      components: 1 | 3;
      width: number;
      height: number;
    };

/** Re-encodes an image as JPEG at the target size; null when it can't. */
export type JpegEncoder = (
  source: ImageSource,
  target: { width: number; height: number },
  quality: number,
) => Promise<Uint8Array | null>;

export interface CompressResult {
  bytes: Uint8Array;
  /** Images found in the file. */
  images: number;
  /** Images that were replaced by a smaller JPEG. */
  recompressed: number;
  /** The result was not smaller, so the original bytes are returned. */
  unchanged: boolean;
}

const NAME = {
  BitsPerComponent: PDFName.of("BitsPerComponent"),
  ColorSpace: PDFName.of("ColorSpace"),
  DCTDecode: PDFName.of("DCTDecode"),
  Decode: PDFName.of("Decode"),
  DecodeParms: PDFName.of("DecodeParms"),
  DeviceGray: PDFName.of("DeviceGray"),
  DeviceRGB: PDFName.of("DeviceRGB"),
  Filter: PDFName.of("Filter"),
  FlateDecode: PDFName.of("FlateDecode"),
  Height: PDFName.of("Height"),
  ICCBased: PDFName.of("ICCBased"),
  Image: PDFName.of("Image"),
  ImageMask: PDFName.of("ImageMask"),
  Length: PDFName.of("Length"),
  Mask: PDFName.of("Mask"),
  N: PDFName.of("N"),
  SMask: PDFName.of("SMask"),
  Subtype: PDFName.of("Subtype"),
  Width: PDFName.of("Width"),
};

/** Returns an error message for a file that can't be compressed, else null. */
export function validatePdfFile(file: File): string | null {
  const isPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name.trim());
  if (!isPdf) return `"${file.name}" is not a PDF file.`;
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return `"${file.name}" is larger than 100 MB.`;
  }
  return null;
}

/** Scales a size down (never up) so its longest side fits `maxSize`. */
export function fitWithin(
  width: number,
  height: number,
  maxSize: number | null,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (maxSize === null || longest <= maxSize) return { width, height };
  const scale = maxSize / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Reverses the PNG row filters (Predictor 10–15) of a Flate stream with
 * 8 bits per component. Each row starts with one byte naming its filter.
 */
export function unpredictPng(
  data: Uint8Array,
  columns: number,
  colors: number,
): Uint8Array {
  const rowLength = columns * colors;
  const rows = Math.floor(data.length / (rowLength + 1));
  const out = new Uint8Array(rows * rowLength);

  for (let row = 0; row < rows; row++) {
    const filter = data[row * (rowLength + 1)];
    const src = row * (rowLength + 1) + 1;
    const dst = row * rowLength;
    for (let i = 0; i < rowLength; i++) {
      const left = i >= colors ? out[dst + i - colors] : 0;
      const up = row > 0 ? out[dst + i - rowLength] : 0;
      const upLeft =
        row > 0 && i >= colors ? out[dst + i - rowLength - colors] : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      out[dst + i] = (data[src + i] + predicted) & 0xff;
    }
  }
  return out;
}

/** Expands gray or RGB pixels to the RGBA layout canvases use. */
export function pixelsToRgba(
  pixels: Uint8Array,
  components: 1 | 3,
  width: number,
  height: number,
): Uint8ClampedArray<ArrayBuffer> {
  const count = width * height;
  const rgba = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) {
    const src = i * components;
    rgba[i * 4] = pixels[src];
    rgba[i * 4 + 1] = pixels[components === 3 ? src + 1 : src];
    rgba[i * 4 + 2] = pixels[components === 3 ? src + 2 : src];
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

function numberOf(value: PDFObject | undefined): number | null {
  return value instanceof PDFNumber ? value.asNumber() : null;
}

/** 1 for gray, 3 for RGB, null for anything else (CMYK, indexed, Lab…). */
function colorComponents(
  value: PDFObject | undefined,
  context: PDFContext,
): 1 | 3 | null {
  const space = value instanceof PDFRef ? context.lookup(value) : value;
  if (space === NAME.DeviceGray) return 1;
  if (space === NAME.DeviceRGB) return 3;
  if (
    space instanceof PDFArray &&
    space.size() === 2 &&
    space.lookup(0) === NAME.ICCBased
  ) {
    const profile = space.lookup(1);
    const n =
      profile instanceof PDFStream
        ? numberOf(profile.dict.lookup(NAME.N))
        : null;
    if (n === 1 || n === 3) return n;
  }
  return null;
}

/**
 * Reads an image XObject as JPEG bytes or raw pixels. Returns null for the
 * kinds that are safer to keep as they are: masks, custom decode ranges,
 * CMYK/indexed colors, other bit depths and unusual filters.
 */
export function readImageSource(
  stream: PDFRawStream,
  context: PDFContext,
): { source: ImageSource; components: 1 | 3 } | null {
  const { dict } = stream;
  const width = numberOf(dict.lookup(NAME.Width));
  const height = numberOf(dict.lookup(NAME.Height));
  if (!width || !height || width * height > MAX_IMAGE_PIXELS) return null;
  if (dict.lookup(NAME.ImageMask)?.toString() === "true") return null;
  if (dict.has(NAME.Decode) || dict.lookup(NAME.Mask) instanceof PDFArray) {
    return null;
  }
  if (numberOf(dict.lookup(NAME.BitsPerComponent)) !== 8) return null;

  const components = colorComponents(dict.get(NAME.ColorSpace), context);
  if (!components) return null;

  const filter = dict.lookup(NAME.Filter);
  if (filter === NAME.DCTDecode) {
    return {
      source: { kind: "jpeg", bytes: stream.contents, width, height },
      components,
    };
  }

  if (filter !== undefined && filter !== NAME.FlateDecode) return null;

  let pixels: Uint8Array;
  try {
    pixels =
      filter === undefined
        ? stream.contents
        : decodePDFRawStream(stream).decode();
  } catch {
    return null;
  }

  const params = dict.lookup(NAME.DecodeParms);
  const predictor =
    params instanceof PDFDict
      ? numberOf(params.lookup(PDFName.of("Predictor")))
      : null;
  if (predictor !== null && predictor >= 10) {
    pixels = unpredictPng(pixels, width, components);
  } else if (predictor !== null && predictor !== 1) {
    return null; // TIFF predictor: rare in images, not worth supporting
  }

  if (pixels.length < width * height * components) return null;
  return {
    source: { kind: "pixels", pixels, components, width, height },
    components,
  };
}

/** Objects reachable from the trailer; everything else is dead weight. */
function reachableRefs(context: PDFContext): Set<string> {
  const seen = new Set<string>();
  const pending: PDFObject[] = [];
  const { Root, Info } = context.trailerInfo;
  for (const entry of [Root, Info]) if (entry) pending.push(entry);

  while (pending.length > 0) {
    const object = pending.pop();
    if (object instanceof PDFRef) {
      const key = object.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      const target = context.lookup(object);
      if (target) pending.push(target);
    } else if (object instanceof PDFDict) {
      for (const [, value] of object.entries()) pending.push(value);
    } else if (object instanceof PDFArray) {
      for (let i = 0; i < object.size(); i++) pending.push(object.get(i));
    } else if (object instanceof PDFStream) {
      pending.push(object.dict);
    }
  }
  return seen;
}

/**
 * Compresses a PDF: optionally re-encodes its photos as smaller JPEGs, drops
 * unreferenced objects and packs the rest into compressed object streams.
 * Text, vector drawings and fonts are kept exactly as they are.
 */
export async function compressPdf(
  input: Uint8Array,
  options: CompressOptions,
  encode: JpegEncoder,
  onProgress?: (done: number, total: number) => void,
): Promise<CompressResult> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(input, { updateMetadata: false });
  } catch (error) {
    if (error instanceof EncryptedPDFError) {
      throw new Error(
        "This PDF is password-protected and can't be compressed.",
      );
    }
    throw new Error("This file could not be read as a PDF.");
  }
  const { context } = doc;

  const images: [PDFRef, PDFRawStream][] = [];
  // Soft masks must stay grayscale and lossless-looking, so they are skipped.
  const masks = new Set<string>();
  for (const [ref, object] of context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    if (object.dict.get(NAME.Subtype) !== NAME.Image) continue;
    images.push([ref, object]);
    for (const key of [NAME.SMask, NAME.Mask]) {
      const mask = object.dict.get(key);
      if (mask instanceof PDFRef) masks.add(mask.toString());
    }
  }

  let recompressed = 0;
  if (options.images === "recompress") {
    for (const [index, [ref, stream]] of images.entries()) {
      onProgress?.(index, images.length);
      if (masks.has(ref.toString())) continue;

      const read = readImageSource(stream, context);
      if (!read) continue;
      const { source, components } = read;
      const target = fitWithin(source.width, source.height, options.maxSize);
      const jpeg = await encode(source, target, options.quality);
      if (!jpeg || jpeg.length >= stream.contents.length) continue;

      const dict = stream.dict.clone(context);
      dict.set(NAME.Filter, NAME.DCTDecode);
      dict.delete(NAME.DecodeParms);
      dict.set(NAME.Width, PDFNumber.of(target.width));
      dict.set(NAME.Height, PDFNumber.of(target.height));
      dict.set(NAME.BitsPerComponent, PDFNumber.of(8));
      dict.set(NAME.Length, PDFNumber.of(jpeg.length));
      // The encoder always writes color JPEGs.
      if (components === 1) dict.set(NAME.ColorSpace, NAME.DeviceRGB);
      context.assign(ref, PDFRawStream.of(dict, jpeg));
      recompressed++;
    }
    onProgress?.(images.length, images.length);
  }

  const reachable = reachableRefs(context);
  for (const [ref] of context.enumerateIndirectObjects()) {
    if (!reachable.has(ref.toString())) context.delete(ref);
  }

  const bytes = await doc.save({ useObjectStreams: true });
  const unchanged = bytes.length >= input.length;
  return {
    bytes: unchanged ? input : bytes,
    images: images.length,
    recompressed: unchanged ? 0 : recompressed,
    unchanged,
  };
}

/** Browser only: decodes the image, scales it on a canvas and encodes JPEG. */
export const canvasJpegEncoder: JpegEncoder = async (
  source,
  target,
  quality,
) => {
  let bitmap: ImageBitmap;
  try {
    bitmap =
      source.kind === "jpeg"
        ? await createImageBitmap(
            new Blob([source.bytes as BlobPart], { type: "image/jpeg" }),
          )
        : await createImageBitmap(
            new ImageData(
              pixelsToRgba(
                source.pixels,
                source.components,
                source.width,
                source.height,
              ),
              source.width,
              source.height,
            ),
          );
  } catch {
    return null; // a corrupt image is kept as it is
  }

  try {
    // A JPEG whose own header disagrees with the PDF would come out distorted.
    if (bitmap.width !== source.width || bitmap.height !== source.height) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.imageSmoothingQuality = "high";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, target.width, target.height);
    context.drawImage(bitmap, 0, 0, target.width, target.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } finally {
    bitmap.close();
  }
};
