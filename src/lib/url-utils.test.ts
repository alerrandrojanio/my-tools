import { describe, expect, it } from "vitest";
import {
  CODE_LENGTH,
  generateCode,
  isValidCode,
  MAX_URL_LENGTH,
  normalizeUrl,
} from "./url-utils";

describe("normalizeUrl", () => {
  it("keeps valid http(s) URLs", () => {
    expect(normalizeUrl("https://example.com/a?b=1#c")).toEqual({
      ok: true,
      value: "https://example.com/a?b=1#c",
    });
    expect(normalizeUrl("http://example.com")).toEqual({
      ok: true,
      value: "http://example.com/",
    });
  });

  it("adds https:// when the scheme is missing and trims spaces", () => {
    expect(normalizeUrl("  example.com/path  ")).toEqual({
      ok: true,
      value: "https://example.com/path",
    });
  });

  it("rejects empty input", () => {
    expect(normalizeUrl("   ")).toEqual({ ok: false, error: "Enter a URL." });
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://example.com/file",
    "file:///etc/passwd",
  ])("rejects the non-http scheme in %s", (input) => {
    expect(normalizeUrl(input)).toEqual({
      ok: false,
      error: "Only http and https links are supported.",
    });
  });

  it("rejects URLs with embedded credentials", () => {
    expect(normalizeUrl("https://user:pass@example.com")).toEqual({
      ok: false,
      error: "URLs with credentials are not allowed.",
    });
  });

  it("rejects hosts without a dot (localhost, bare words)", () => {
    expect(normalizeUrl("http://localhost")).toMatchObject({ ok: false });
    expect(normalizeUrl("mytools")).toMatchObject({ ok: false });
  });

  it("rejects malformed URLs", () => {
    expect(normalizeUrl("http://")).toMatchObject({ ok: false });
    expect(normalizeUrl("https://exa mple.com")).toMatchObject({ ok: false });
  });

  it("rejects URLs longer than the limit", () => {
    const long = `https://example.com/${"a".repeat(MAX_URL_LENGTH)}`;
    expect(normalizeUrl(long)).toMatchObject({ ok: false });
  });
});

describe("generateCode / isValidCode", () => {
  it("generates codes of the default length using only base62", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(code).toMatch(/^[0-9A-Za-z]+$/);
      expect(isValidCode(code)).toBe(true);
    }
  });

  it("supports a custom length", () => {
    expect(generateCode(12)).toHaveLength(12);
  });

  it("generates distinct codes", () => {
    expect(
      new Set(Array.from({ length: 500 }, () => generateCode())).size,
    ).toBe(500);
  });

  it("validates codes strictly", () => {
    expect(isValidCode("abc1234")).toBe(true);
    expect(isValidCode("abc123")).toBe(false);
    expect(isValidCode("abc12345")).toBe(false);
    expect(isValidCode("abc-123")).toBe(false);
    expect(isValidCode("../etc/")).toBe(false);
    expect(isValidCode("")).toBe(false);
  });
});
