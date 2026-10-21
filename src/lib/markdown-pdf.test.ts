import { describe, expect, it } from "vitest";
import {
  breakablePieces,
  firstHeading,
  INLINE_CODE_SCALE,
  MAX_MARKDOWN_BYTES,
  markdownToPdfDocument,
  tableFontSize,
  tableMaxRun,
  toPdfFileName,
  validateMarkdownFile,
} from "./markdown-pdf";

type Node = Record<string, unknown>;

function content(markdown: string): Node[] {
  return markdownToPdfDocument(markdown).content as unknown as Node[];
}

/** All text in a pdfmake node tree, in reading order. */
function textOf(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object") {
    const n = node as Node;
    return ["text", "stack", "ul", "ol", "table", "body"]
      .flatMap((key) => (key in n ? [textOf(n[key])] : []))
      .join("");
  }
  return "";
}

/** The styled runs of a paragraph node. */
function runs(node: Node): Node[] {
  return (Array.isArray(node.text) ? node.text : [node.text]) as Node[];
}

describe("markdownToPdfDocument: blocks", () => {
  it("maps headings to sizes and keeps the level for page-break logic", () => {
    const [h1, h3] = content("# Title\n\n### Sub");
    expect(h1).toMatchObject({ fontSize: 22, bold: true, headlineLevel: 1 });
    expect(textOf(h1)).toBe("Title");
    expect(h3).toMatchObject({ fontSize: 15, headlineLevel: 3 });
  });

  it("styles inline formatting", () => {
    const [p] = content("a **b** *c* ~~d~~ `e`");
    const parts = runs(p);
    expect(parts.find((r) => r.text === "b")).toMatchObject({ bold: true });
    expect(parts.find((r) => r.text === "c")).toMatchObject({ italics: true });
    expect(parts.find((r) => r.text === "d")).toMatchObject({
      decoration: "lineThrough",
    });
    expect(parts.find((r) => r.text === "e")).toMatchObject({
      font: "Mono",
    });
  });

  it("sizes inline code relative to the text around it", () => {
    const codeSize = (node: Node) =>
      runs(node).find((r) => r.font === "Mono")?.fontSize as number;
    const [h4, p] = content("#### Title (`CODE_NAME`)\n\ntext `CODE_NAME`");
    expect(codeSize(h4)).toBe(Math.round(13 * INLINE_CODE_SCALE * 10) / 10); // h4 is 13pt
    expect(codeSize(p)).toBe(Math.round(11 * INLINE_CODE_SCALE * 10) / 10);

    const [table] = content("| A |\n|---|\n| `CODE_NAME` |");
    const cell = ((table.table as Node).body as Node[][])[1][0];
    expect(codeSize(cell)).toBe(Math.round(10 * INLINE_CODE_SCALE * 10) / 10);
  });

  it("combines nested formatting", () => {
    const [p] = content("***both***");
    expect(runs(p)[0]).toMatchObject({
      text: "both",
      bold: true,
      italics: true,
    });
  });

  it("builds bullet, numbered and nested lists", () => {
    const [ul, ol] = content("- a\n- b\n  - c\n\n3. x\n4. y");
    expect(ul).toHaveProperty("ul");
    expect(textOf(ul)).toBe("abc");
    expect(ol).toMatchObject({ start: 3 });
    expect((ol.ol as unknown[]).length).toBe(2);
  });

  it("shows task boxes instead of bullets", () => {
    const [list] = content("- [x] done\n- [ ] todo");
    const items = list.ul as Node[];
    expect(items[0]).toMatchObject({ listType: "none" });
    expect(textOf(items[0])).toBe("[x] done");
    expect(textOf(items[1])).toBe("[ ] todo");
  });

  it("keeps code blocks verbatim in a monospace box", () => {
    const [block] = content("```js\nif (a) {\n    b();\n}\n```");
    const cell = ((block.table as Node).body as Node[][])[0][0];
    expect(cell).toMatchObject({ font: "Mono", preserveLeadingSpaces: true });
    expect(textOf(cell)).toBe("if (a) {\n    b();\n}");
  });

  it("renders blockquotes and horizontal rules", () => {
    const [quote, rule] = content("> quoted **text**\n\n---");
    expect(textOf(quote)).toBe("quoted text");
    expect(rule).toHaveProperty("canvas");
  });

  it("builds tables with a header row and column alignment", () => {
    const [table] = content("| A | B |\n|:--|--:|\n| 1 | 2 |");
    const body = (table.table as Node).body as Node[][];
    expect((table.table as Node).headerRows).toBe(1);
    expect(body[0][0]).toMatchObject({ bold: true, alignment: "left" });
    expect(body[1][1]).toMatchObject({ alignment: "right" });
    expect(textOf(body[1])).toBe("12");
  });

  it("produces a valid document for empty input", () => {
    expect(markdownToPdfDocument("").content).toEqual([{ text: "" }]);
  });

  it("normalizes Windows line endings", () => {
    expect(textOf(content("# A\r\n\r\ntext"))).toBe("Atext");
  });
});

describe("markdownToPdfDocument: safety", () => {
  it("keeps only http(s) and mailto links", () => {
    const [p] = content(
      "[ok](https://example.com) [mail](mailto:a@b.co) [bad](javascript:alert(1)) [data](data:text/html,x)",
    );
    const linked = runs(p)
      .filter((r) => r.link)
      .map((r) => r.link);
    expect(linked).toEqual(["https://example.com/", "mailto:a@b.co"]);
    expect(textOf(p)).toContain("bad");
  });

  it("drops script and style contents and strips other tags", () => {
    const out = textOf(
      content(
        "<script>alert(1)</script>\n\n<style>p{}</style>\n\n<b>bold</b> <!-- hidden --> text",
      ),
    );
    expect(out).not.toContain("alert");
    expect(out).not.toContain("p{}");
    expect(out).not.toContain("hidden");
    expect(out).toContain("bold");
  });

  it("does not try to load images, showing their description instead", () => {
    const [p] = content("![a chart](https://example.com/x.png)");
    expect(JSON.stringify(p)).not.toContain("example.com");
    expect(textOf(p)).toBe("[a chart]");
  });

  it("removes emoji the font cannot draw, keeping accents", () => {
    expect(textOf(content("Ação 🚀 ok 👍🏽 ✅ 🇧🇷 fim"))).toBe(
      "Ação  ok    fim",
    );
    // Digits, # and * are emoji components too, but must stay.
    expect(textOf(content("Item #1 * 2"))).toBe("Item #1 * 2");
  });

  it("decodes HTML entities in text", () => {
    expect(textOf(content("a &amp; b &lt;c&gt;"))).toBe("a & b <c>");
  });
});

describe("document settings", () => {
  it("uses the chosen page size and the first heading as title", () => {
    const doc = markdownToPdfDocument("intro\n\n## Report **2026**", {
      pageSize: "LETTER",
    });
    expect(doc.pageSize).toBe("LETTER");
    expect(doc.info?.title).toBe("Report 2026");
  });

  it("prefers an explicit title and falls back to a default", () => {
    expect(markdownToPdfDocument("# A", { title: "B" }).info?.title).toBe("B");
    expect(markdownToPdfDocument("no heading").info?.title).toBe("Document");
  });

  it("numbers pages in the footer", () => {
    const footer = markdownToPdfDocument("x").footer as unknown as (
      page: number,
      pages: number,
    ) => Node;
    expect(footer(2, 5).text).toBe("2 / 5");
  });

  it("keeps a heading with the content after it", () => {
    const doc = markdownToPdfDocument("# A");
    const rule = doc.pageBreakBefore as unknown as (
      node: Node,
      queries: Node,
    ) => boolean;
    const queries = (following: unknown[]) => ({
      getFollowingNodesOnPage: () => following,
    });
    expect(rule({ headlineLevel: 1 }, queries([]))).toBe(true);
    expect(rule({ headlineLevel: 1 }, queries([{}]))).toBe(false);
    expect(rule({}, queries([]))).toBe(false);
  });
});

describe("breakablePieces (long names wrap instead of overflowing)", () => {
  const long = "FI_SP_SRCC_Integracoes_ConsultaContratoExternaPropOperV1.sql";

  it("never loses or adds characters", () => {
    for (const text of [
      long,
      "",
      "a b c",
      "Ação 🚀 coração",
      "x".repeat(100),
    ]) {
      expect(breakablePieces(text, 24).join("")).toBe(text);
    }
  });

  it("keeps every unbroken run within the limit", () => {
    for (const piece of breakablePieces(long, 24)) {
      expect(piece.length).toBeLessThanOrEqual(24);
    }
  });

  it("prefers cutting after separators", () => {
    expect(breakablePieces(long, 24)[0]).toBe("FI_SP_SRCC_Integracoes_");
    expect(breakablePieces("Dlls/FI.SRCC/.../CargaContratos/x", 24)[0]).toBe(
      "Dlls/FI.SRCC/.../",
    );
  });

  it("leaves normal text in one piece", () => {
    expect(
      breakablePieces("Carga de Contratos — remessa ARCC001", 24),
    ).toHaveLength(1);
  });

  it("splits long names inside table cells without changing the text", () => {
    const [table] = content(["| A |", "|---|", `| \`${long}\` |`].join("\n"));
    const cell = ((table.table as Node).body as Node[][])[1][0];
    expect(runs(cell).length).toBeGreaterThan(1);
    expect(textOf(cell)).toBe(long);
  });
});

describe("wide tables fit the page", () => {
  it("sizes columns to their content instead of making all columns equal", () => {
    const [table] = content("| A | B | C |\n|---|---|---|\n| 1 | 2 | 3 |");
    expect((table.table as Node).widths).toEqual(["auto", "auto", "auto"]);
  });

  it("uses smaller text for tables with many columns", () => {
    expect(tableFontSize(3)).toBe(10);
    expect(tableFontSize(5)).toBe(9);
    expect(tableFontSize(8)).toBe(8);
  });

  it("shortens unbroken runs as columns get narrower", () => {
    expect(tableMaxRun(2, 495)).toBe(24);
    expect(tableMaxRun(6, 495)).toBeLessThan(tableMaxRun(4, 495));
    expect(tableMaxRun(12, 495)).toBeGreaterThanOrEqual(4);
    // The narrowest guaranteed width of every column must fit the page.
    for (const columns of [2, 4, 6, 8, 10, 12]) {
      const charWidth = tableFontSize(columns) * 0.6;
      const minTable = columns * (tableMaxRun(columns, 495) * charWidth + 10);
      expect(minTable).toBeLessThanOrEqual(495);
    }
  });

  it("applies the narrower runs and font size to every cell", () => {
    const long = "SUPERLONGIDENTIFIER_WITHOUT_SPACES_1234567890";
    const cols = 8;
    const md = [
      `|${" H |".repeat(cols)}`,
      `|${"---|".repeat(cols)}`,
      `|${` \`${long}\` |`.repeat(cols)}`,
    ].join("\n");
    const [table] = content(md);
    const cell = ((table.table as Node).body as Node[][])[1][0];
    expect(cell.fontSize).toBe(8);
    const limit = tableMaxRun(cols, 495);
    for (const run of runs(cell)) {
      expect(String(run.text).length).toBeLessThanOrEqual(limit);
    }
    expect(textOf(cell)).toBe(long);
  });
});

describe("helpers", () => {
  it("finds the first heading's plain text", () => {
    expect(firstHeading("text\n\n## Hello *world*\n# Later")).toBe(
      "Hello world",
    );
    expect(firstHeading("no heading here")).toBeNull();
  });

  it("builds safe PDF file names", () => {
    expect(toPdfFileName("notes.md")).toBe("notes.pdf");
    expect(toPdfFileName("Relatório Final.markdown")).toBe(
      "Relatório Final.pdf",
    );
    expect(toPdfFileName("a/b:c*?.md")).toBe("a_b_c__.pdf");
    expect(toPdfFileName("  ")).toBe("document.pdf");
    expect(toPdfFileName("", "documento")).toBe("documento.pdf");
    expect(toPdfFileName("...")).toBe("document.pdf");
  });

  it("validates uploads by extension and size", () => {
    expect(validateMarkdownFile({ name: "a.md", size: 10 })).toBeNull();
    expect(validateMarkdownFile({ name: "A.MARKDOWN", size: 10 })).toBeNull();
    expect(validateMarkdownFile({ name: "a.txt", size: 10 })).toBeNull();
    expect(validateMarkdownFile({ name: "a.pdf", size: 10 })).toBe(
      '"a.pdf" is not a Markdown file.',
    );
    expect(
      validateMarkdownFile({ name: "big.md", size: MAX_MARKDOWN_BYTES + 1 }),
    ).toBe('"big.md" is larger than 2 MB.');
  });
});
