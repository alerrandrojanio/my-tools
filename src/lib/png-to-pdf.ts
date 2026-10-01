import {
  buildPdfFromJpegs,
  type PageSizeMode,
  type PdfJpegPage,
} from "./pdf-builder";

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const JPEG_QUALITY = 0.92;

/** Returns an error message for a file that can't be converted, else null. */
export function validatePngFile(file: File): string | null {
  if (file.type !== "image/png") return `"${file.name}" is not a PNG image.`;
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" is larger than 25 MB.`;
  }
  return null;
}

/** Browser only: reads the pixel size of an image file. */
export async function readImageSize(
  file: File,
): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

/** Browser only: decodes a PNG, flattens transparency onto white, encodes JPEG. */
async function pngToJpegPage(file: File): Promise<PdfJpegPage> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not supported in this browser.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error(`Could not process "${file.name}".`);

    return {
      jpeg: new Uint8Array(await blob.arrayBuffer()),
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

/** Converts PNG files, in order, into a single PDF with one page per image. */
export async function convertPngsToPdf(
  files: readonly File[],
  mode: PageSizeMode,
): Promise<Blob> {
  const pages: PdfJpegPage[] = [];
  for (const file of files) pages.push(await pngToJpegPage(file));

  const pdf = buildPdfFromJpegs(pages, mode);
  return new Blob([pdf as BlobPart], { type: "application/pdf" });
}
