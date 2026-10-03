import { describe, expect, it } from "vitest";
import {
  buildFileName,
  decodeBase64ToFile,
  detectFileType,
  formatBytes,
  parseBase64Input,
} from "./base64-file";

const toBase64 = (bytes: number[] | string) =>
  Buffer.from(
    typeof bytes === "string" ? bytes : Uint8Array.from(bytes),
  ).toString("base64");

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3];

describe("detectFileType", () => {
  it.each([
    ["png", PNG, "image/png"],
    ["jpg", [0xff, 0xd8, 0xff, 0xe0, 0, 0x10], "image/jpeg"],
    ["gif", [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], "image/gif"],
    ["bmp", [0x42, 0x4d, 0, 0], "image/bmp"],
    [
      "webp",
      [0x52, 0x49, 0x46, 0x46, 9, 9, 9, 9, 0x57, 0x45, 0x42, 0x50],
      "image/webp",
    ],
    ["pdf", [0x25, 0x50, 0x44, 0x46, 0x2d], "application/pdf"],
    ["zip", [0x50, 0x4b, 0x03, 0x04, 0, 0], "application/zip"],
    ["gz", [0x1f, 0x8b, 8, 0], "application/gzip"],
    ["mp3", [0x49, 0x44, 0x33, 3, 0], "audio/mpeg"],
    [
      "mp4",
      [0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32],
      "video/mp4",
    ],
  ])("detects .%s by its magic bytes", (extension, bytes, mime) => {
    expect(detectFileType(Uint8Array.from(bytes))).toEqual({ mime, extension });
  });

  it("falls back to text for readable UTF-8", () => {
    expect(detectFileType(new TextEncoder().encode("Olá\nmundo"))).toEqual({
      mime: "text/plain",
      extension: "txt",
    });
  });

  it("falls back to a generic binary type", () => {
    expect(detectFileType(Uint8Array.from([0, 1, 2, 250, 251]))).toEqual({
      mime: "application/octet-stream",
      extension: "bin",
    });
  });
});

describe("parseBase64Input", () => {
  it("returns raw Base64 untouched (trimmed)", () => {
    expect(parseBase64Input("  SGk=\n")).toEqual({
      base64: "SGk=",
      mime: null,
    });
  });

  it("splits a data URI into mime and payload", () => {
    expect(
      parseBase64Input("data:text/plain;charset=utf-8;base64,SGk="),
    ).toEqual({ base64: "SGk=", mime: "text/plain" });
  });
});

describe("decodeBase64ToFile", () => {
  it("decodes raw Base64 and identifies the type", () => {
    const result = decodeBase64ToFile(toBase64(PNG));
    expect(result).toMatchObject({
      ok: true,
      mime: "image/png",
      extension: "png",
    });
    expect(result.ok && result.bytes.length).toBe(PNG.length);
  });

  it("accepts a data URI", () => {
    expect(
      decodeBase64ToFile(`data:image/png;base64,${toBase64(PNG)}`),
    ).toMatchObject({ ok: true, mime: "image/png" });
  });

  it("prefers the real file type over a wrong declared one", () => {
    expect(
      decodeBase64ToFile(`data:text/plain;base64,${toBase64(PNG)}`),
    ).toMatchObject({ ok: true, mime: "image/png" });
  });

  it("uses the declared type when the bytes are not recognizable", () => {
    expect(
      decodeBase64ToFile(`data:application/json;base64,${toBase64('{"a":1}')}`),
    ).toMatchObject({ ok: true, mime: "application/json", extension: "json" });
  });

  it("keeps every byte intact", () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    const result = decodeBase64ToFile(Buffer.from(all).toString("base64"));
    expect(result.ok && Array.from(result.bytes)).toEqual(Array.from(all));
  });

  it.each([
    ["empty input", "   ", "Paste some Base64 first."],
    [
      "empty data URI payload",
      "data:image/png;base64,",
      "Paste some Base64 first.",
    ],
    [
      "invalid characters",
      "not base64 !!!",
      "Input contains characters that are not valid in Base64.",
    ],
    ["invalid length", "A", "Input has an invalid Base64 length."],
  ])("reports an error for %s", (_name, input, error) => {
    expect(decodeBase64ToFile(input)).toEqual({ ok: false, error });
  });
});

describe("buildFileName", () => {
  it.each([
    ["", "png", "file.png"],
    ["photo", "png", "photo.png"],
    ["photo.jpeg", "png", "photo.jpeg"],
    ["../../etc/passwd", "bin", "_.._etc_passwd.bin"],
    ["a\\b:c*d?.txt", "x", "a_b_c_d_.txt"],
    ["...", "pdf", "file.pdf"],
  ])("builds %j (+%s) as %s", (name, extension, expected) => {
    expect(buildFileName(name, extension)).toBe(expected);
  });

  it("limits the name length", () => {
    expect(buildFileName("a".repeat(500), "txt").length).toBeLessThanOrEqual(
      104,
    );
  });
});

describe("formatBytes", () => {
  it("formats B, KB and MB", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });
});
