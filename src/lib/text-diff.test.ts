import { describe, expect, it } from "vitest";
import {
  type DiffMode,
  type DiffSegment,
  diffText,
  diffTokens,
  layoutRows,
  tokenize,
} from "./text-diff";

/** The original text is what's equal plus what was removed; the new, plus what was added. */
function sides(segments: readonly DiffSegment[]) {
  const join = (skip: DiffSegment["type"]) =>
    segments
      .filter((s) => s.type !== skip)
      .map((s) => (skip === "removed" ? (s.after ?? s.text) : s.text))
      .join("");
  return { before: join("added"), after: join("removed") };
}

const PAIRS: [string, string][] = [
  ["The quick brown fox.", "The quick red fox jumps."],
  ["linha 1\nlinha 2\nlinha 3\n", "linha 1\nlinha dois\nlinha 3"],
  ["", "novo"],
  ["abc", ""],
  ["a  b\tc", "a b  c"],
  ["if (x) {\n  return 1;\n}\n", "if (x) {\n    return 2;\n}\n\n"],
];
const MODES: DiffMode[] = ["chars", "words", "lines"];

describe("tokenize", () => {
  it("keeps every character so tokens join back to the text", () => {
    const text = "Olá, mundo!\n  São 10h.\n";
    for (const mode of ["chars", "words", "lines"] as DiffMode[]) {
      expect(tokenize(text, mode).join("")).toBe(text);
    }
  });

  it("splits words, spaces and punctuation", () => {
    expect(tokenize("Olá, mundo!", "words")).toEqual([
      "Olá",
      ",",
      " ",
      "mundo",
      "!",
    ]);
  });

  it("keeps the line break with its line", () => {
    expect(tokenize("a\n\nb", "lines")).toEqual(["a\n", "\n", "b"]);
  });

  it("returns nothing for empty text", () => {
    expect(tokenize("", "words")).toEqual([]);
  });
});

describe("diffTokens", () => {
  it("finds insertions and deletions", () => {
    expect(diffTokens(["a", "b", "c"], ["a", "x", "c", "d"])).toEqual([
      { type: "equal", text: "a" },
      { type: "removed", text: "b" },
      { type: "added", text: "x" },
      { type: "equal", text: "c" },
      { type: "added", text: "d" },
    ]);
  });

  it("handles empty sides", () => {
    expect(diffTokens([], [])).toEqual([]);
    expect(diffTokens([], ["a"])).toEqual([{ type: "added", text: "a" }]);
    expect(diffTokens(["a"], [])).toEqual([{ type: "removed", text: "a" }]);
  });

  it("gives up past the edit limit", () => {
    expect(diffTokens(["a", "b"], ["c", "d"], 3)).toBeNull();
    expect(diffTokens(["a", "b"], ["c", "d"], 4)).not.toBeNull();
  });
});

describe("diffText", () => {
  it("marks changed words and folds the space between them", () => {
    const diff = diffText("o carro vermelho", "o ônibus azul", "words");
    expect(diff.segments).toEqual([
      { type: "equal", text: "o " },
      { type: "removed", text: "carro vermelho" },
      { type: "added", text: "ônibus azul" },
    ]);
    expect(diff).toMatchObject({ removed: 1, added: 1, mode: "words" });
  });

  it("keeps an unchanged word between two changes", () => {
    const diff = diffText("um gato preto", "dois gato branco", "words");
    expect(diff.segments.filter((s) => s.type === "equal")).toEqual([
      { type: "equal", text: " gato " },
    ]);
    expect(diff).toMatchObject({ removed: 2, added: 2 });
  });

  it("reports no changes for identical texts", () => {
    const diff = diffText("igual\n", "igual\n", "lines");
    expect(diff.segments).toEqual([{ type: "equal", text: "igual\n" }]);
    expect(diff).toMatchObject({ removed: 0, added: 0 });
  });

  it("always rebuilds both texts exactly", () => {
    for (const [a, b] of PAIRS) {
      for (const mode of MODES) {
        for (const ignoreWhitespace of [false, true]) {
          const { segments } = diffText(a, b, mode, { ignoreWhitespace });
          expect(sides(segments)).toEqual({ before: a, after: b });
        }
      }
    }
  });

  it("can ignore indentation and spacing changes", () => {
    const a = "if (x) {\n  return 1;\n}";
    const b = "if (x) {\n\treturn  1;\n}";
    expect(diffText(a, b, "words")).toMatchObject({ removed: 2, added: 2 });
    for (const mode of MODES) {
      expect(diffText(a, b, mode, { ignoreWhitespace: true })).toMatchObject({
        removed: 0,
        added: 0,
      });
    }
  });

  it("still sees added line breaks when ignoring whitespace", () => {
    const diff = diffText("a b", "a\nb", "words", { ignoreWhitespace: true });
    expect(diff).toMatchObject({ removed: 1, added: 1 });
  });

  it("falls back to a coarser mode for very different texts", () => {
    const a = Array.from({ length: 1500 }, (_, i) => `a${i}`).join("");
    const b = Array.from({ length: 1500 }, (_, i) => `b${i}`).join("");
    const diff = diffText(a, b, "chars");
    expect(diff.mode).not.toBe("chars");
    expect(sides(diff.segments)).toEqual({ before: a, after: b });
  });
});

describe("layoutRows", () => {
  const text = (row: { pieces: { text: string }[] }) =>
    row.pieces.map((piece) => piece.text).join("");

  it("splits each side into its lines", () => {
    for (const [a, b] of PAIRS) {
      for (const mode of MODES) {
        const layout = layoutRows(diffText(a, b, mode).segments);
        expect(layout.before.map(text)).toEqual(a.split("\n"));
        expect(layout.after.map(text)).toEqual(b.split("\n"));
      }
    }
  });

  it("flags changed lines and where each change starts", () => {
    const a = "one\ntwo\nthree\nfour";
    const b = "one\n2\nthree\nfour\nfive";
    const layout = layoutRows(diffText(a, b, "lines").segments);
    expect(layout.before.map((row) => row.changed)).toEqual([
      false,
      true,
      false,
      true,
    ]);
    expect(layout.after.map((row) => row.changed)).toEqual([
      false,
      true,
      false,
      true,
      true,
    ]);
    expect(layout.changes).toEqual([
      { before: 1, after: 1 },
      { before: 3, after: 3 },
    ]);
  });

  it("marks only the changed words inside a line", () => {
    const layout = layoutRows(
      diffText("let a = 1;", "let a = 2;", "words").segments,
    );
    expect(layout.after[0].pieces).toEqual([
      { text: "let a = ", changed: false },
      { text: "2", changed: true },
      { text: ";", changed: false },
    ]);
  });
});
