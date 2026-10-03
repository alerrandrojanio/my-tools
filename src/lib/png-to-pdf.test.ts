import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE_BYTES, validatePngFile } from "./png-to-pdf";

function fakeFile(name: string, type: string, size = 10): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validatePngFile", () => {
  it("accepts a PNG within the size limit", () => {
    expect(validatePngFile(fakeFile("a.png", "image/png"))).toBeNull();
  });

  it("rejects other image types", () => {
    expect(validatePngFile(fakeFile("a.jpg", "image/jpeg"))).toBe(
      '"a.jpg" is not a PNG image.',
    );
    expect(validatePngFile(fakeFile("a.txt", ""))).toBe(
      '"a.txt" is not a PNG image.',
    );
  });

  it("rejects files larger than the limit", () => {
    const big = fakeFile("big.png", "image/png", MAX_FILE_SIZE_BYTES + 1);
    expect(validatePngFile(big)).toBe('"big.png" is larger than 25 MB.');
  });

  it("accepts a file exactly at the limit", () => {
    const edge = fakeFile("edge.png", "image/png", MAX_FILE_SIZE_BYTES);
    expect(validatePngFile(edge)).toBeNull();
  });
});
