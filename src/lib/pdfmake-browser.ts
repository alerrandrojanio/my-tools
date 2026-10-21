import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { CODE_FONT } from "./markdown-pdf";

type PdfMake = typeof import("pdfmake/build/pdfmake");

/** DejaVu Sans Mono (free license, see /fonts/DejaVu-LICENSE.txt), used for code. */
const MONO_FILES = {
  normal: "DejaVuSansMono.ttf",
  bold: "DejaVuSansMono-Bold.ttf",
} as const;

let loading: Promise<PdfMake> | null = null;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function fetchFont(file: string): Promise<string> {
  const response = await fetch(`/fonts/${file}`);
  if (!response.ok) throw new Error(`Could not load the font ${file}.`);
  return toBase64(await response.arrayBuffer());
}

/**
 * Browser only: loads pdfmake and its fonts on first use, so the page itself
 * stays light. Roboto covers text and accents; DejaVu Sans Mono is a legible
 * monospace font for code.
 */
function loadPdfMake(): Promise<PdfMake> {
  loading ??= (async () => {
    const [pdfMakeModule, roboto, monoNormal, monoBold] = await Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/fonts/Roboto"),
      fetchFont(MONO_FILES.normal),
      fetchFont(MONO_FILES.bold),
    ]);
    const pdfMake =
      (pdfMakeModule as { default?: PdfMake }).default ?? pdfMakeModule;
    pdfMake.addFontContainer(roboto.default);
    pdfMake.addVirtualFileSystem({
      [MONO_FILES.normal]: monoNormal,
      [MONO_FILES.bold]: monoBold,
    });
    pdfMake.addFonts({
      [CODE_FONT]: {
        normal: MONO_FILES.normal,
        bold: MONO_FILES.bold,
        italics: MONO_FILES.normal,
        bolditalics: MONO_FILES.bold,
      },
    });
    return pdfMake;
  })().catch((error) => {
    loading = null; // allow a retry after a network hiccup
    throw error;
  });
  return loading;
}

export async function renderPdfBlob(
  document: TDocumentDefinitions,
): Promise<Blob> {
  const pdfMake = await loadPdfMake();
  return pdfMake.createPdf(document).getBlob();
}
