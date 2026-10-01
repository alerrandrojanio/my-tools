export type Base64Result =
  | { ok: true; value: string }
  | { ok: false; error: string };

export interface EncodeOptions {
  /** Use the URL-safe alphabet (`-` and `_`) and omit `=` padding. */
  urlSafe?: boolean;
}

// Keeps String.fromCharCode well under the engine's argument-count limit.
const CHUNK_SIZE = 0x8000;

const BASE64_BODY = /^[A-Za-z0-9+/]*$/;

function bytesToBinaryString(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return binary;
}

function binaryStringToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encodes a Unicode string as Base64 (UTF-8 safe). */
export function encodeBase64(
  text: string,
  { urlSafe = false }: EncodeOptions = {},
): Base64Result {
  const bytes = new TextEncoder().encode(text);
  const encoded = btoa(bytesToBinaryString(bytes));

  if (!urlSafe) {
    return { ok: true, value: encoded };
  }

  return {
    ok: true,
    value: encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  };
}

/**
 * Decodes a Base64 string into text. Accepts both the standard and URL-safe
 * alphabets, ignores whitespace and tolerates missing padding.
 */
export function decodeBase64(input: string): Base64Result {
  const normalized = input
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/=+$/, "");

  if (!BASE64_BODY.test(normalized)) {
    return {
      ok: false,
      error: "Input contains characters that are not valid in Base64.",
    };
  }

  if (normalized.length % 4 === 1) {
    return { ok: false, error: "Input has an invalid Base64 length." };
  }

  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    const bytes = binaryStringToBytes(atob(padded));
    const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value };
  } catch {
    return {
      ok: false,
      error: "Decoded data is not valid UTF-8 text.",
    };
  }
}
