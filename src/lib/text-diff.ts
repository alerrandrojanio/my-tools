export type DiffMode = "chars" | "words" | "lines";

export interface DiffSegment {
  type: "equal" | "removed" | "added";
  text: string;
  /**
   * Only on "equal" segments matched while ignoring whitespace: the modified
   * text's version, when it differs from `text` (the original's).
   */
  after?: string;
}

export interface DiffOptions {
  /** Treats runs of spaces and tabs as equal, and ignores indentation in line mode. */
  ignoreWhitespace?: boolean;
}

/** One line of one side, split into unchanged and changed pieces. */
export interface DiffRow {
  pieces: { text: string; changed: boolean }[];
  /** The line has a change, even if only its line break. */
  changed: boolean;
}

export interface DiffLayout {
  before: DiffRow[];
  after: DiffRow[];
  /** Where each change starts, as a line index on each side. */
  changes: { before: number; after: number }[];
}

export interface TextDiff {
  segments: DiffSegment[];
  /** The mode actually used; coarser than requested when the texts differ too much. */
  mode: DiffMode;
  /** Number of removed and added stretches of text. */
  removed: number;
  added: number;
}

/** Above this many edits a finer mode is abandoned for a coarser one. */
const MAX_EDITS = 2000;

const FALLBACK: Readonly<Record<DiffMode, DiffMode | null>> = {
  chars: "words",
  words: "lines",
  lines: null,
};

/** Splits text so that joining the tokens gives the text back. */
export function tokenize(text: string, mode: DiffMode): string[] {
  if (text === "") return [];
  // Single characters, but a run of spaces/tabs stays together.
  if (mode === "chars") return text.match(/[^\S\n]+|[\s\S]/gu) ?? [];
  if (mode === "lines") return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  // Words, runs of whitespace, and single punctuation marks.
  return text.match(/[\p{L}\p{N}\p{M}_]+|\s+|[^\p{L}\p{N}\p{M}_\s]/gu) ?? [];
}

type Op = "=" | "-" | "+";

/**
 * Myers' O(ND) diff over token ids. Returns the edit script, or null when it
 * needs more than `maxEdits` insertions and deletions.
 */
function myers(a: Int32Array, b: Int32Array, maxEdits: number): Op[] | null {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max;
  const v = new Int32Array(2 * max + 2);
  // trace[d] holds v for k in [-d, d] after step d, at index k + d.
  const trace: Int32Array[] = [];

  let found = false;
  for (let d = 0; d <= Math.min(max, maxEdits) && !found; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])
          ? v[offset + k + 1]
          : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = true;
        break;
      }
    }
    trace.push(v.slice(offset - d, offset + d + 1));
  }
  if (!found) return null;

  const ops: Op[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d > 0; d--) {
    const prev = trace[d - 1];
    const at = (k: number) => prev[k + d - 1];
    const k = x - y;
    const prevK =
      k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const prevX = at(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push("=");
      x--;
      y--;
    }
    if (x === prevX) {
      ops.push("+");
      y--;
    } else {
      ops.push("-");
      x--;
    }
  }
  while (x > 0 && y > 0) {
    ops.push("=");
    x--;
    y--;
  }
  return ops.reverse();
}

/** The comparison key of a token when whitespace is ignored. */
function whitespaceKey(mode: DiffMode): (token: string) => string {
  if (mode === "lines") return (line) => line.replace(/\s+/g, " ").trim();
  // Line breaks still count; any other run of whitespace is the same.
  return (token) =>
    /^\s+$/.test(token) ? token.replace(/[^\n]/g, "") || " " : token;
}

/**
 * Diffs two token lists; null when they differ by more than `maxEdits`.
 * Tokens are compared through `keyOf`, so different texts can count as equal.
 */
export function diffTokens(
  a: readonly string[],
  b: readonly string[],
  maxEdits = MAX_EDITS,
  keyOf: (token: string) => string = (token) => token,
): DiffSegment[] | null {
  const keysA = a.map(keyOf);
  const keysB = b.map(keyOf);

  // Identical start and end are cheap to match and shrink the real problem.
  let start = 0;
  while (
    start < a.length &&
    start < b.length &&
    keysA[start] === keysB[start]
  ) {
    start++;
  }
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && keysA[endA - 1] === keysB[endB - 1]) {
    endA--;
    endB--;
  }

  const ids = new Map<string, number>();
  const toIds = (keys: readonly string[], from: number, to: number) => {
    const out = new Int32Array(to - from);
    for (let i = from; i < to; i++) {
      let id = ids.get(keys[i]);
      if (id === undefined) {
        id = ids.size;
        ids.set(keys[i], id);
      }
      out[i - from] = id;
    }
    return out;
  };
  const ops = myers(
    toIds(keysA, start, endA),
    toIds(keysB, start, endB),
    maxEdits,
  );
  if (!ops) return null;

  const raw: Required<DiffSegment>[] = [];
  const push = (type: DiffSegment["type"], text: string, after = text) => {
    const last = raw.at(-1);
    if (last?.type === type) {
      last.text += text;
      last.after += after;
    } else raw.push({ type, text, after });
  };
  for (let i = 0; i < start; i++) push("equal", a[i], b[i]);
  let ia = start;
  let ib = start;
  for (const op of ops) {
    if (op === "=") push("equal", a[ia++], b[ib++]);
    else if (op === "-") push("removed", a[ia++]);
    else push("added", b[ib++]);
  }
  for (let i = 0; i < a.length - endA; i++) {
    push("equal", a[endA + i], b[endB + i]);
  }

  return groupChanges(raw).map(({ type, text, after }) =>
    type === "equal" && after !== text ? { type, text, after } : { type, text },
  );
}

/**
 * Puts each change as "removed, then added", and folds a lone space between
 * two changes into them, so "red car" → "blue bus" reads as one replacement
 * instead of two.
 */
function groupChanges(
  segments: readonly Required<DiffSegment>[],
): Required<DiffSegment>[] {
  const out: Required<DiffSegment>[] = [];
  let removed = "";
  let added = "";
  const flush = () => {
    if (removed) out.push({ type: "removed", text: removed, after: removed });
    if (added) out.push({ type: "added", text: added, after: added });
    removed = "";
    added = "";
  };

  segments.forEach((segment, index) => {
    if (segment.type === "removed") removed += segment.text;
    else if (segment.type === "added") added += segment.text;
    else {
      const betweenChanges =
        (removed || added) &&
        index < segments.length - 1 &&
        /^[ \t]+$/.test(segment.text) &&
        /^[ \t]+$/.test(segment.after);
      if (betweenChanges) {
        removed += segment.text;
        added += segment.after;
      } else {
        flush();
        out.push({ ...segment });
      }
    }
  });
  flush();
  return out;
}

/**
 * Compares two texts in the requested mode, falling back to coarser modes
 * (and finally to "everything changed") for texts that are too different.
 */
export function diffText(
  a: string,
  b: string,
  mode: DiffMode,
  options: DiffOptions = {},
): TextDiff {
  let current: DiffMode | null = mode;
  let segments: DiffSegment[] | null = null;
  let used: DiffMode = mode;
  while (current && !segments) {
    used = current;
    segments = diffTokens(
      tokenize(a, current),
      tokenize(b, current),
      MAX_EDITS,
      options.ignoreWhitespace ? whitespaceKey(current) : undefined,
    );
    current = FALLBACK[current];
  }
  segments ??= [
    ...(a ? [{ type: "removed" as const, text: a }] : []),
    ...(b ? [{ type: "added" as const, text: b }] : []),
  ];

  return {
    segments,
    mode: used,
    removed: segments.filter((s) => s.type === "removed").length,
    added: segments.filter((s) => s.type === "added").length,
  };
}

/**
 * Splits the diff into the lines of each side, for line numbers and line
 * highlights. Joining a side's pieces line by line gives its text back.
 */
export function layoutRows(segments: readonly DiffSegment[]): DiffLayout {
  const newRow = (): DiffRow => ({ pieces: [], changed: false });
  const before = [newRow()];
  const after = [newRow()];
  const changes: DiffLayout["changes"] = [];

  const write = (rows: DiffRow[], text: string, changed: boolean) => {
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) rows.push(newRow());
      const row = rows[rows.length - 1];
      if (line) row.pieces.push({ text: line, changed });
      // A removed or added line break belongs to the line it ends.
      if (changed && (line || index < lines.length - 1)) row.changed = true;
    });
  };

  segments.forEach((segment, index) => {
    if (segment.type === "equal") {
      write(before, segment.text, false);
      write(after, segment.after ?? segment.text, false);
      return;
    }
    if (segments[index - 1]?.type !== "removed") {
      changes.push({ before: before.length - 1, after: after.length - 1 });
    }
    write(segment.type === "removed" ? before : after, segment.text, true);
  });

  return { before, after, changes };
}
