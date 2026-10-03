export type PasswordResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export interface PasswordOptions {
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
}

export const MIN_PASSWORD_LENGTH = 1;
export const MAX_PASSWORD_LENGTH = 128;

const CHARSETS: Record<keyof PasswordOptions, string> = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
};

/** Uniform random integer in [0, max) using rejection sampling (no modulo bias). */
function randomInt(max: number): number {
  const limit = 0x100000000 - (0x100000000 % max);
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

function pick(chars: string): string {
  return chars[randomInt(chars.length)];
}

/**
 * Generates a random password from a cryptographically secure source,
 * guaranteeing at least one character from every selected set.
 */
export function generatePassword(
  length: number,
  options: PasswordOptions,
): PasswordResult {
  if (
    !Number.isInteger(length) ||
    length < MIN_PASSWORD_LENGTH ||
    length > MAX_PASSWORD_LENGTH
  ) {
    return {
      ok: false,
      error: `Length must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}.`,
    };
  }

  const sets = (Object.keys(CHARSETS) as (keyof PasswordOptions)[])
    .filter((key) => options[key])
    .map((key) => CHARSETS[key]);

  if (sets.length === 0) {
    return { ok: false, error: "Select at least one character type." };
  }
  if (length < sets.length) {
    return {
      ok: false,
      error: `Length must be at least ${sets.length} for the selected types.`,
    };
  }

  const all = sets.join("");
  const chars = [
    ...sets.map(pick),
    ...Array.from({ length: length - sets.length }, () => pick(all)),
  ];

  // Fisher-Yates shuffle so the guaranteed characters aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return { ok: true, value: chars.join("") };
}
