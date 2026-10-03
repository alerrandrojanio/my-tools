import { describe, expect, it } from "vitest";
import { countText } from "./word-counter";

describe("countText", () => {
  it("returns zeros for empty and whitespace-only text", () => {
    const zeros = {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      readingMinutes: 0,
    };
    expect(countText("")).toEqual(zeros);
    expect(countText("   \n\t ")).toMatchObject({
      words: 0,
      sentences: 0,
      paragraphs: 0,
      readingMinutes: 0,
    });
  });

  it("counts words separated by any whitespace", () => {
    expect(countText("one  two\tthree\nfour").words).toBe(4);
    expect(countText("  padded  ").words).toBe(1);
  });

  it("counts characters with and without spaces", () => {
    const stats = countText("a b\nc");
    expect(stats.characters).toBe(5);
    expect(stats.charactersNoSpaces).toBe(3);
  });

  it("counts an emoji as one character", () => {
    expect(countText("🚀").characters).toBe(1);
  });

  it("counts sentences by terminators followed by space or end", () => {
    expect(countText("Hello. How are you? Fine!").sentences).toBe(3);
    expect(countText("No terminator").sentences).toBe(1);
    expect(countText("Wait... what?!").sentences).toBe(2);
  });

  it("does not split decimals or abbreviations without a following space", () => {
    expect(countText("Pi is 3.14 today").sentences).toBe(1);
  });

  it("counts paragraphs separated by blank lines", () => {
    expect(countText("one\n\ntwo\n  \nthree").paragraphs).toBe(3);
    expect(countText("one\ntwo").paragraphs).toBe(1);
  });

  it("rounds reading time up at 200 words per minute", () => {
    expect(countText("word ".repeat(1)).readingMinutes).toBe(1);
    expect(countText("word ".repeat(200)).readingMinutes).toBe(1);
    expect(countText("word ".repeat(201)).readingMinutes).toBe(2);
  });
});
