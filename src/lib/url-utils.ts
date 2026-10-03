export type UrlResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export const CODE_LENGTH = 7;
export const MAX_URL_LENGTH = 2048;

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const CODE_PATTERN = new RegExp(`^[0-9A-Za-z]{${CODE_LENGTH}}$`);
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Validates and normalizes a user-provided URL. Only http(s) links with a
 * real hostname are accepted; a missing scheme defaults to https.
 */
export function normalizeUrl(input: string): UrlResult {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: false, error: "Enter a URL." };
  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      ok: false,
      error: `URL is longer than ${MAX_URL_LENGTH} characters.`,
    };
  }

  const candidate = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, error: "This is not a valid URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http and https links are supported." };
  }
  if (url.username !== "" || url.password !== "") {
    return { ok: false, error: "URLs with credentials are not allowed." };
  }
  if (!url.hostname.includes(".")) {
    return { ok: false, error: "This is not a valid URL." };
  }

  return { ok: true, value: url.toString() };
}

/** Random base62 code from a cryptographically secure source. */
export function generateCode(length = CODE_LENGTH): string {
  // Reject bytes above the largest multiple of the alphabet size (no modulo bias).
  const limit = 256 - (256 % ALPHABET.length);
  let code = "";
  while (code.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && code.length < length) {
        code += ALPHABET[byte % ALPHABET.length];
      }
    }
  }
  return code;
}

export function isValidCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}
