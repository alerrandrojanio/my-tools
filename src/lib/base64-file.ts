import { base64ToBytes } from "./base64-utils";

export interface DecodedFile {
  bytes: Uint8Array;
  mime: string;
  /** File extension without the dot. */
  extension: string;
}

export type DecodedFileResult =
  | ({ ok: true } & DecodedFile)
  | { ok: false; error: string };

interface FileSignature {
  mime: string;
  extension: string;
  /** Bytes expected at `offset`; `null` entries match any byte. */
  magic: readonly (number | null)[];
  offset?: number;
}

const SIGNATURES: readonly FileSignature[] = [
  {
    mime: "image/png",
    extension: "png",
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { mime: "image/jpeg", extension: "jpg", magic: [0xff, 0xd8, 0xff] },
  { mime: "image/gif", extension: "gif", magic: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/bmp", extension: "bmp", magic: [0x42, 0x4d] },
  {
    mime: "image/webp",
    extension: "webp",
    // "RIFF" ???? "WEBP"
    magic: [
      0x52,
      0x49,
      0x46,
      0x46,
      null,
      null,
      null,
      null,
      0x57,
      0x45,
      0x42,
      0x50,
    ],
  },
  {
    mime: "application/pdf",
    extension: "pdf",
    magic: [0x25, 0x50, 0x44, 0x46],
  },
  {
    mime: "application/zip",
    extension: "zip",
    magic: [0x50, 0x4b, 0x03, 0x04],
  },
  { mime: "application/gzip", extension: "gz", magic: [0x1f, 0x8b] },
  { mime: "audio/mpeg", extension: "mp3", magic: [0x49, 0x44, 0x33] },
  {
    mime: "video/mp4",
    extension: "mp4",
    // ???? "ftyp"
    magic: [0x66, 0x74, 0x79, 0x70],
    offset: 4,
  },
];

const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  "text/plain": "txt",
  "text/html": "html",
  "text/css": "css",
  "text/csv": "csv",
  "application/json": "json",
  "application/xml": "xml",
  "image/svg+xml": "svg",
  "application/octet-stream": "bin",
  ...Object.fromEntries(SIGNATURES.map((s) => [s.mime, s.extension])),
};

const DATA_URI = /^data:([^;,]*)((?:;[^;,]*)*),/i;

/** Splits an optional `data:<mime>;base64,` prefix from the Base64 payload. */
export function parseBase64Input(input: string): {
  base64: string;
  mime: string | null;
} {
  const trimmed = input.trim();
  const match = DATA_URI.exec(trimmed);
  if (!match) return { base64: trimmed, mime: null };

  return {
    base64: trimmed.slice(match[0].length),
    mime: match[1].toLowerCase() || null,
  };
}

function matchesSignature(
  bytes: Uint8Array,
  signature: FileSignature,
): boolean {
  const offset = signature.offset ?? 0;
  return signature.magic.every(
    (expected, index) =>
      expected === null || bytes[offset + index] === expected,
  );
}

function looksLikeText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // Control characters other than tab/newline/carriage return mean binary data.
    return ![...text].some((char) => {
      const code = char.charCodeAt(0);
      return code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d;
    });
  } catch {
    return false;
  }
}

/** Detects the file type from its leading bytes (magic numbers). */
export function detectFileType(bytes: Uint8Array): {
  mime: string;
  extension: string;
} {
  const known = SIGNATURES.find((signature) =>
    matchesSignature(bytes, signature),
  );
  if (known) return { mime: known.mime, extension: known.extension };
  if (looksLikeText(bytes)) return { mime: "text/plain", extension: "txt" };
  return { mime: "application/octet-stream", extension: "bin" };
}

/**
 * Decodes Base64 (raw or as a data URI) into a file. The type comes from the
 * file's own bytes when recognizable, else from the data URI, else is generic.
 */
export function decodeBase64ToFile(input: string): DecodedFileResult {
  const { base64, mime: declaredMime } = parseBase64Input(input);
  if (base64 === "") return { ok: false, error: "Paste some Base64 first." };

  let decoded: ReturnType<typeof base64ToBytes>;
  try {
    decoded = base64ToBytes(base64);
  } catch {
    return { ok: false, error: "Input is not valid Base64." };
  }
  if (!decoded.ok) return decoded;

  const bytes = decoded.value;
  if (bytes.length === 0)
    return { ok: false, error: "The decoded file is empty." };

  const detected = detectFileType(bytes);
  if (
    detected.mime !== "application/octet-stream" &&
    detected.mime !== "text/plain"
  ) {
    return { ok: true, bytes, ...detected };
  }

  if (declaredMime) {
    return {
      ok: true,
      bytes,
      mime: declaredMime,
      extension: MIME_EXTENSIONS[declaredMime] ?? detected.extension,
    };
  }
  return { ok: true, bytes, ...detected };
}

/** Builds a safe download name, appending the detected extension if missing. */
export function buildFileName(name: string, extension: string): string {
  const cleaned = [...name.trim()]
    .map((char) =>
      char.charCodeAt(0) < 0x20 || /[\\/:*?"<>|]/.test(char) ? "_" : char,
    )
    .join("")
    .replace(/^\.+/, "")
    .slice(0, 100);
  const base = cleaned === "" ? "file" : cleaned;
  return /\.[A-Za-z0-9]{1,8}$/.test(base) ? base : `${base}.${extension}`;
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}
