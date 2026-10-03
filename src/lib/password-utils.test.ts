import { describe, expect, it } from "vitest";
import {
  generatePassword,
  MAX_PASSWORD_LENGTH,
  type PasswordOptions,
} from "./password-utils";

const ALL: PasswordOptions = {
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
};

const NONE: PasswordOptions = {
  lowercase: false,
  uppercase: false,
  digits: false,
  symbols: false,
};

function generate(length: number, options: PasswordOptions): string {
  const result = generatePassword(length, options);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe("generatePassword", () => {
  it("returns exactly the requested length", () => {
    for (const length of [4, 8, 16, 64, MAX_PASSWORD_LENGTH]) {
      expect(generate(length, ALL)).toHaveLength(length);
    }
  });

  it("includes every selected character type", () => {
    for (let i = 0; i < 500; i++) {
      const password = generate(4 + (i % 30), ALL);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/\d/);
      expect(password).toMatch(/[^a-zA-Z0-9]/);
    }
  });

  it("uses only the selected character types", () => {
    expect(generate(50, { ...NONE, digits: true })).toMatch(/^\d{50}$/);
    expect(generate(50, { ...NONE, lowercase: true })).toMatch(/^[a-z]{50}$/);
    expect(generate(50, { ...NONE, uppercase: true })).toMatch(/^[A-Z]{50}$/);
  });

  it("produces different passwords on each call", () => {
    const seen = new Set(Array.from({ length: 50 }, () => generate(24, ALL)));
    expect(seen.size).toBe(50);
  });

  it("does not always start with the guaranteed characters (shuffled)", () => {
    const firstChars = new Set(
      Array.from({ length: 200 }, () => generate(8, ALL)[0]),
    );
    expect(firstChars.size).toBeGreaterThan(10);
  });

  it("errors when no character type is selected", () => {
    expect(generatePassword(8, NONE)).toEqual({
      ok: false,
      error: "Select at least one character type.",
    });
  });

  it("errors when the length cannot fit the selected types", () => {
    expect(generatePassword(3, ALL)).toEqual({
      ok: false,
      error: "Length must be at least 4 for the selected types.",
    });
  });

  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
    MAX_PASSWORD_LENGTH + 1,
  ])("rejects the invalid length %s", (length) => {
    expect(generatePassword(length, ALL)).toMatchObject({ ok: false });
  });
});
