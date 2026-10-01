export type JsonResult =
  | { ok: true; value: string }
  | { ok: false; error: string; line?: number; column?: number };

export type JsonIndent = 2 | 4 | "tab";

export interface FormatOptions {
  indent?: JsonIndent;
  sortKeys?: boolean;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortKeysDeep(nested)]),
    );
  }
  return value;
}

function positionToLineColumn(
  text: string,
  position: number,
): { line: number; column: number } {
  const before = text.slice(0, position).split("\n");
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

function describeError(
  input: string,
  error: unknown,
): Extract<JsonResult, { ok: false }> {
  const message = error instanceof Error ? error.message : "Invalid JSON.";

  const lineColumn = /line (\d+) column (\d+)/.exec(message);
  if (lineColumn) {
    return {
      ok: false,
      error: message,
      line: Number(lineColumn[1]),
      column: Number(lineColumn[2]),
    };
  }

  const position = /position (\d+)/.exec(message);
  if (position) {
    return {
      ok: false,
      error: message,
      ...positionToLineColumn(input, Number(position[1])),
    };
  }

  return { ok: false, error: message };
}

type ParseResult =
  | { ok: true; data: unknown }
  | Extract<JsonResult, { ok: false }>;

function parse(input: string): ParseResult {
  try {
    return { ok: true, data: JSON.parse(input) };
  } catch (error) {
    return describeError(input, error);
  }
}

/** Parses and pretty-prints JSON. */
export function formatJson(
  input: string,
  { indent = 2, sortKeys = false }: FormatOptions = {},
): JsonResult {
  const parsed = parse(input);
  if (!parsed.ok) return parsed;

  const data = sortKeys ? sortKeysDeep(parsed.data) : parsed.data;
  const space = indent === "tab" ? "\t" : indent;
  return { ok: true, value: JSON.stringify(data, null, space) };
}

/** Parses and re-serializes JSON without whitespace. */
export function minifyJson(
  input: string,
  { sortKeys = false }: Pick<FormatOptions, "sortKeys"> = {},
): JsonResult {
  const parsed = parse(input);
  if (!parsed.ok) return parsed;

  const data = sortKeys ? sortKeysDeep(parsed.data) : parsed.data;
  return { ok: true, value: JSON.stringify(data) };
}
