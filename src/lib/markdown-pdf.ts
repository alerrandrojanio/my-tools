import { Lexer, type Token, type Tokens } from "marked";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

export type PdfPageSize = "A4" | "LETTER";

export interface MarkdownPdfOptions {
  pageSize?: PdfPageSize;
  /** Document title stored in the PDF metadata. */
  title?: string;
}

/** Text run inside a paragraph, with the formatting it inherited. */
interface Run {
  text: string;
  bold?: boolean;
  italics?: boolean;
  decoration?: "lineThrough" | "underline";
  font?: string;
  background?: string;
  color?: string;
  link?: string;
}

type RunStyle = Omit<Run, "text">;

/** Name the monospace font is registered under (DejaVu Sans Mono in the browser). */
export const CODE_FONT = "Mono";

/** Characters after which a long name may wrap. */
const SEPARATORS = new Set([..."/_.-,:;=&?|>)]}"]);

/**
 * Splits `text` into pieces so that no run of non-space characters is longer
 * than `maxRun`. Long names (paths, file names, URLs) are cut after separators
 * like "/", "_" or ".", and, if still too long, every `maxRun` characters.
 * pdfmake may wrap between pieces, so nothing visible is added and the text
 * copies exactly as written. Joining the pieces gives back `text`.
 */
export function breakablePieces(text: string, maxRun: number): string[] {
  const pieces: string[] = [];
  let current: string[] = [];
  /** Characters since the last whitespace (or cut). */
  let run = 0;
  /** Index in `current` just after the most recent separator in this run. */
  let cutAt = -1;

  for (const char of text) {
    current.push(char);
    if (/\s/.test(char)) {
      run = 0;
      cutAt = -1;
      continue;
    }
    run++;
    if (SEPARATORS.has(char)) cutAt = current.length;
    if (run < maxRun) continue;

    // Too long: cut after the last separator if there is one in this run,
    // otherwise right here.
    const at = cutAt > current.length - run ? cutAt : current.length;
    pieces.push(current.slice(0, at).join(""));
    current = current.slice(at);
    run = current.length;
    cutAt = -1;
  }
  if (current.length > 0) pieces.push(current.join(""));
  return pieces.length > 0 ? pieces : [""];
}

/** Longest unbroken run allowed in normal text, table cells and inline code. */
const TEXT_MAX_RUN = 24;

/** Body text size in points. */
const BODY_FONT_SIZE = 11;
/**
 * The monospace font looks bigger than Roboto at the same size (taller and
 * wider letters), so inline code is scaled to match the text around it.
 */
export const INLINE_CODE_SCALE = 0.85;
/** Code blocks only break very long tokens, keeping code copy-friendly. */
const CODE_MAX_RUN = 48;
const LINK_COLOR = "#5b21b6";
const MUTED_COLOR = "#555555";
const CODE_BACKGROUND = "#f2f1f7";
const RULE_COLOR = "#d4d4dc";
const HEADING_SIZES = [22, 18, 15, 13, 12, 11];
/** Usable width of the page in points (page width minus 2 × 50pt margins). */
const CONTENT_WIDTH: Record<PdfPageSize, number> = { A4: 495, LETTER: 512 };

export const MAX_MARKDOWN_BYTES = 2 * 1024 * 1024;

/** Only http(s) and mailto links are kept; anything else becomes plain text. */
function safeLink(href: string): string | undefined {
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:"].includes(url.protocol)
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/** Raw HTML is never rendered: script/style bodies are dropped, other tags removed. */
function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]*>/g, "");
}

/**
 * Decodes the few HTML entities marked leaves in text tokens and drops emoji,
 * which the embedded font cannot draw (they would print as empty boxes).
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(
      /(\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator})(?:\u{FE0F}|\u{200D}|\u{20E3})*/gu,
      "",
    );
}

function inlineRuns(tokens: Token[] | undefined, style: RunStyle = {}): Run[] {
  if (!tokens) return [];
  return tokens.flatMap((token): Run[] => {
    switch (token.type) {
      case "strong":
        return inlineRuns((token as Tokens.Strong).tokens, {
          ...style,
          bold: true,
        });
      case "em":
        return inlineRuns((token as Tokens.Em).tokens, {
          ...style,
          italics: true,
        });
      case "del":
        return inlineRuns((token as Tokens.Del).tokens, {
          ...style,
          decoration: "lineThrough",
        });
      case "codespan":
        return [
          {
            ...style,
            text: decodeEntities((token as Tokens.Codespan).text),
            font: CODE_FONT,
            background: CODE_BACKGROUND,
          },
        ];
      case "link": {
        const link = token as Tokens.Link;
        const href = safeLink(link.href);
        return inlineRuns(
          link.tokens,
          href
            ? {
                ...style,
                link: href,
                color: LINK_COLOR,
                decoration: "underline",
              }
            : style,
        );
      }
      case "image": {
        // Remote images can't be embedded without fetching them, so show the description.
        const image = token as Tokens.Image;
        return [
          {
            ...style,
            text: `[${image.text || "image"}]`,
            italics: true,
            color: MUTED_COLOR,
          },
        ];
      }
      case "br":
        return [{ ...style, text: "\n" }];
      case "html":
        // Raw HTML is not rendered; drop the tags and keep any text.
        return [
          {
            ...style,
            text: decodeEntities(stripHtml((token as Tokens.HTML).text)),
          },
        ];
      case "text": {
        const text = token as Tokens.Text;
        return text.tokens
          ? inlineRuns(text.tokens, style)
          : [{ ...style, text: decodeEntities(text.text) }];
      }
      case "escape":
        return [{ ...style, text: (token as Tokens.Escape).text }];
      default:
        return "text" in token && typeof token.text === "string"
          ? [{ ...style, text: decodeEntities(token.text) }]
          : [];
    }
  });
}

/** A paragraph-like block: always at least one (possibly empty) run. */
function paragraph(
  tokens: Token[] | undefined,
  extra: Record<string, unknown> = {},
  maxRun = TEXT_MAX_RUN,
): Content {
  const baseSize =
    typeof extra.fontSize === "number" ? extra.fontSize : BODY_FONT_SIZE;
  const codeSize = Math.round(baseSize * INLINE_CODE_SCALE * 10) / 10;
  const runs = inlineRuns(tokens).flatMap((run) =>
    breakablePieces(run.text, maxRun).map((text) =>
      run.font === CODE_FONT
        ? { ...run, text, fontSize: codeSize }
        : { ...run, text },
    ),
  );
  return { text: runs.length > 0 ? runs : "", ...extra } as Content;
}

function listContent(list: Tokens.List, width: number): Content {
  const items = list.items.map((item) => {
    const blocks = blockContent(item.tokens, width - 18, true);
    if (item.task) {
      // Roboto has no ballot-box glyphs; a monospace "[x]" reads well.
      const box = { text: item.checked ? "[x] " : "[ ] ", font: CODE_FONT };
      const [first, ...rest] = blocks;
      const firstText =
        first && typeof first === "object" && "text" in first ? first : null;
      if (firstText) {
        const runs = Array.isArray(firstText.text)
          ? firstText.text
          : [firstText.text];
        // Task items show their own box instead of a bullet.
        return {
          stack: [{ ...firstText, text: [box, ...runs] }, ...rest],
          listType: "none",
        };
      }
      return { stack: [box, ...blocks], listType: "none" };
    }
    return blocks.length === 1 ? blocks[0] : blocks;
  });

  const marker = { margin: [0, 0, 0, 4] as [number, number, number, number] };
  return list.ordered
    ? ({
        ol: items,
        start: typeof list.start === "number" ? list.start : 1,
        ...marker,
      } as Content)
    : ({ ul: items, ...marker } as Content);
}

function codeBlock(code: Tokens.Code): Content {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: breakablePieces(code.text, CODE_MAX_RUN).map((text) => ({
              text,
            })),
            font: CODE_FONT,
            fontSize: 8.5,
            lineHeight: 1.25,
            preserveLeadingSpaces: true,
          },
        ],
      ],
    },
    layout: {
      fillColor: () => CODE_BACKGROUND,
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 2, 0, 10],
  } as Content;
}

function blockquote(quote: Tokens.Blockquote, width: number): Content {
  return {
    table: {
      widths: ["*"],
      body: [
        [{ stack: blockContent(quote.tokens, width - 14), color: MUTED_COLOR }],
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i: number) => (i === 0 ? 3 : 0),
      vLineColor: () => RULE_COLOR,
      paddingLeft: () => 10,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    },
    margin: [0, 2, 0, 10],
  } as Content;
}

/** Smaller text for wide tables, so more fits per column. */
export function tableFontSize(columns: number): number {
  if (columns >= 7) return 8;
  if (columns >= 5) return 9;
  return 10;
}

/**
 * Longest unbroken run a table cell may have, from the space each column
 * gets: the sum of all columns' minimum widths must fit the page, or the
 * table overflows and its last columns are cut off.
 */
export function tableMaxRun(columns: number, width: number): number {
  const fontSize = tableFontSize(columns);
  const cellPadding = 10;
  // Average glyph is ~0.6em wide (monospace code is the widest).
  const perColumn = width / Math.max(1, columns) - cellPadding;
  return Math.max(
    4,
    Math.min(TEXT_MAX_RUN, Math.floor(perColumn / (fontSize * 0.6))),
  );
}

function tableContent(table: Tokens.Table, width: number): Content {
  const columns = table.header.length;
  const fontSize = tableFontSize(columns);
  const maxRun = tableMaxRun(columns, width);
  const align = (index: number) => table.align[index] ?? "left";
  const cell = (tokens: Token[], index: number, header: boolean) =>
    paragraph(
      tokens,
      { bold: header || undefined, alignment: align(index), fontSize },
      maxRun,
    );
  const header = table.header.map((head, index) =>
    cell(head.tokens, index, true),
  );
  const rows = table.rows.map((row) =>
    row.map((data, index) => cell(data.tokens, index, false)),
  );
  return {
    table: {
      headerRows: 1,
      // "auto" sizes each column to its own content and shrinks columns
      // toward their minimum when space is short; "*" would give every
      // column the width of the widest one and push the table off the page.
      widths: table.header.map(() => "auto"),
      body: [header, ...rows],
    },
    layout: {
      hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => RULE_COLOR,
      fillColor: (row: number) => (row === 0 ? CODE_BACKGROUND : null),
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 2, 0, 12],
  } as Content;
}

function blockContent(
  tokens: Token[],
  width: number,
  tight = false,
): Content[] {
  const gap = tight ? 2 : 8;
  return tokens.flatMap((token): Content[] => {
    switch (token.type) {
      case "heading": {
        const heading = token as Tokens.Heading;
        const level = Math.min(Math.max(heading.depth, 1), 6);
        return [
          paragraph(heading.tokens, {
            fontSize: HEADING_SIZES[level - 1],
            bold: true,
            margin: [0, level <= 2 ? 14 : 10, 0, 6],
            headlineLevel: level,
          }),
        ];
      }
      case "paragraph":
        return [
          paragraph((token as Tokens.Paragraph).tokens, {
            margin: [0, 0, 0, gap],
          }),
        ];
      case "text": {
        // Loose text inside list items.
        const text = token as Tokens.Text;
        return [paragraph(text.tokens ?? [text], { margin: [0, 0, 0, gap] })];
      }
      case "list":
        return [listContent(token as Tokens.List, width)];
      case "code":
        return [codeBlock(token as Tokens.Code)];
      case "blockquote":
        return [blockquote(token as Tokens.Blockquote, width)];
      case "table":
        return [tableContent(token as Tokens.Table, width)];
      case "hr":
        return [
          {
            canvas: [
              {
                type: "line",
                x1: 0,
                y1: 0,
                x2: width,
                y2: 0,
                lineWidth: 0.75,
                lineColor: RULE_COLOR,
              },
            ],
            margin: [0, 6, 0, 12],
          } as Content,
        ];
      case "html": {
        const text = decodeEntities(
          stripHtml((token as Tokens.HTML).text),
        ).trim();
        return text ? [{ text, margin: [0, 0, 0, gap] } as Content] : [];
      }
      default:
        return [];
    }
  });
}

/** Text of the first heading, used as the default title / file name. */
export function firstHeading(markdown: string): string | null {
  const heading = new Lexer()
    .lex(markdown)
    .find((token) => token.type === "heading") as Tokens.Heading | undefined;
  const text = heading
    ? inlineRuns(heading.tokens)
        .map((run) => run.text)
        .join("")
        .trim()
    : "";
  return text || null;
}

/** Builds the pdfmake document for a Markdown text. Pure: no browser APIs. */
export function markdownToPdfDocument(
  markdown: string,
  options: MarkdownPdfOptions = {},
): TDocumentDefinitions {
  const pageSize = options.pageSize ?? "A4";
  const tokens = new Lexer({ gfm: true }).lex(markdown.replace(/\r\n?/g, "\n"));
  const content = blockContent(tokens, CONTENT_WIDTH[pageSize]);

  return {
    pageSize,
    pageMargins: [50, 56, 50, 56],
    info: { title: options.title || firstHeading(markdown) || "Document" },
    content: content.length > 0 ? content : [{ text: "" }],
    defaultStyle: {
      font: "Roboto",
      fontSize: BODY_FONT_SIZE,
      lineHeight: 1.35,
    },
    // Keep a heading on the same page as the text that follows it.
    pageBreakBefore: (current, nodes) =>
      Boolean(
        (current as { headlineLevel?: number }).headlineLevel &&
          nodes.getFollowingNodesOnPage().length === 0,
      ),
    footer: (page, pages) => ({
      text: `${page} / ${pages}`,
      alignment: "center",
      fontSize: 8,
      color: MUTED_COLOR,
      margin: [0, 20, 0, 0],
    }),
  };
}

/** "Meu Relatório.md" → "Meu Relatório.pdf"; empty or unsafe names get a default. */
export function toPdfFileName(name: string, fallback = "document"): string {
  const cleaned = [...name.trim().replace(/\.(md|markdown|txt)$/i, "")]
    .map((char) =>
      char.charCodeAt(0) < 0x20 || /[\\/:*?"<>|]/.test(char) ? "_" : char,
    )
    .join("")
    .replace(/^\.+/, "")
    .slice(0, 100)
    .trim();
  return `${cleaned || fallback}.pdf`;
}

/** Returns an error message for an unusable upload, else null. */
export function validateMarkdownFile(file: {
  name: string;
  size: number;
}): string | null {
  if (!/\.(md|markdown|txt)$/i.test(file.name)) {
    return `"${file.name}" is not a Markdown file.`;
  }
  if (file.size > MAX_MARKDOWN_BYTES)
    return `"${file.name}" is larger than 2 MB.`;
  return null;
}
