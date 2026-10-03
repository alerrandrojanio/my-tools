import { describe, expect, it } from "vitest";
import { base64ToBytes, decodeBase64, encodeBase64 } from "./base64-utils";

describe("encodeBase64", () => {
  it("encodes ASCII text", () => {
    expect(encodeBase64("Hello")).toEqual({ ok: true, value: "SGVsbG8=" });
  });

  it("encodes the empty string", () => {
    expect(encodeBase64("")).toEqual({ ok: true, value: "" });
  });

  it("encodes Unicode as UTF-8", () => {
    expect(encodeBase64("Olá 🚀")).toEqual({ ok: true, value: "T2zDoSDwn5qA" });
  });

  it("uses the URL-safe alphabet without padding when asked", () => {
    expect(encodeBase64("???>>>")).toEqual({ ok: true, value: "Pz8/Pj4+" });
    expect(encodeBase64("???>>>", { urlSafe: true })).toEqual({
      ok: true,
      value: "Pz8_Pj4-",
    });
    expect(encodeBase64("a", { urlSafe: true })).toEqual({
      ok: true,
      value: "YQ",
    });
  });

  it("handles input larger than the chunk size", () => {
    const big = "x".repeat(300_000);
    const encoded = encodeBase64(big);
    expect(encoded.ok).toBe(true);
    if (encoded.ok)
      expect(decodeBase64(encoded.value)).toEqual({ ok: true, value: big });
  });
});

describe("decodeBase64", () => {
  it("round-trips text, including letters that regexes could mangle", () => {
    const text = "assess the sassy sources — Olá, mundo! 🚀 sss";
    const encoded = encodeBase64(text);
    expect(encoded.ok && decodeBase64(encoded.value)).toEqual({
      ok: true,
      value: text,
    });
  });

  it("accepts the URL-safe alphabet and missing padding", () => {
    expect(decodeBase64("Pz8_Pj4-")).toEqual({ ok: true, value: "???>>>" });
    expect(decodeBase64("SGVsbG8")).toEqual({ ok: true, value: "Hello" });
  });

  it("ignores whitespace and line breaks", () => {
    expect(decodeBase64("  SGVs\n bG8=\r\n")).toEqual({
      ok: true,
      value: "Hello",
    });
  });

  it("rejects characters outside the Base64 alphabet", () => {
    expect(decodeBase64("!!!")).toMatchObject({ ok: false });
  });

  it("rejects an impossible length", () => {
    expect(decodeBase64("A")).toEqual({
      ok: false,
      error: "Input has an invalid Base64 length.",
    });
  });

  it("rejects bytes that are not valid UTF-8 text", () => {
    expect(decodeBase64("/w==")).toEqual({
      ok: false,
      error: "Decoded data is not valid UTF-8 text.",
    });
  });
});

describe("base64ToBytes", () => {
  it("returns every possible byte value unchanged", () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    const result = base64ToBytes(Buffer.from(all).toString("base64"));
    expect(result.ok && Array.from(result.value)).toEqual(Array.from(all));
  });
});
