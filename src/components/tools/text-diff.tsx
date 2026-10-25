"use client";

import {
  type Ref,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useI18n } from "@/i18n/provider";
import {
  type DiffMode,
  type DiffRow,
  diffText,
  layoutRows,
} from "@/lib/text-diff";

const MODES: readonly DiffMode[] = ["words", "chars", "lines"];

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Height of one line, in px; matches `leading-5` below. */
const LINE_HEIGHT = 20;
/** Lines kept visible above a difference when jumping to it. */
const CONTEXT_LINES = 3;

/**
 * Shared by the textarea and the highlight layer behind it: both must lay
 * text out identically, or the marks drift away from the words.
 */
const TEXT_LAYOUT =
  "py-3 pr-4 pl-3 font-mono text-[13px] leading-5 [tab-size:4] [scrollbar-gutter:stable]";

const WRAP_LAYOUT = {
  on: "whitespace-pre-wrap break-words",
  off: "whitespace-pre",
} as const;

const STYLE = {
  removed: {
    row: "bg-down/10",
    mark: "rounded-[3px] bg-down/35",
    gutter: "bg-down/15 text-down",
    sign: "−",
  },
  added: {
    row: "bg-up/10",
    mark: "rounded-[3px] bg-up/30",
    gutter: "bg-up/15 text-up",
    sign: "+",
  },
} as const;

const GHOST_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-[10px] border border-line-strong px-4 text-[15px] font-semibold text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50";

interface EditorHandle {
  /** Scrolls so the line is near the top; returns the resulting scrollTop. */
  scrollToRow: (row: number) => number;
  /** Returns the scrollTop actually reached (it may be clamped). */
  setScrollTop: (top: number) => number;
}

/**
 * A code editor whose changed parts are highlighted. Textareas can't style
 * their own text, so the same text is drawn in a layer behind it with
 * transparent letters and colored marks; that layer and the line numbers
 * scroll in sync with the textarea.
 */
function DiffEditor({
  ref,
  id,
  label,
  value,
  rows,
  kind,
  wrap,
  placeholder,
  onChange,
  onScroll,
  onError,
}: {
  ref: Ref<EditorHandle>;
  id: string;
  label: string;
  value: string;
  rows: readonly DiffRow[];
  kind: "removed" | "added";
  wrap: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onScroll: (top: number) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const lines = useRef<HTMLDivElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // Wrapped lines can be several rows tall; their numbers must grow with them.
  const [heights, setHeights] = useState<readonly number[]>([]);
  const style = STYLE[kind];

  const measure = useEffectEvent(() => {
    if (!wrap || !lines.current) return;
    const next = Array.from(
      lines.current.children,
      (line) => (line as HTMLElement).offsetHeight,
    );
    setHeights((previous) =>
      previous.length === next.length &&
      previous.every((height, index) => height === next[index])
        ? previous
        : next,
    );
  });

  // Edits can rewrap lines without changing the total height, so measure
  // after every render; the observer catches width changes.
  useLayoutEffect(() => measure());
  useEffect(() => {
    if (!wrap || !lines.current) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(lines.current);
    return () => observer.disconnect();
  }, [wrap]);

  useImperativeHandle(ref, () => ({
    scrollToRow(row) {
      const line = lines.current?.children[row] as HTMLElement | undefined;
      const area = textarea.current;
      if (!area || !line) return 0;
      // offsetTop counts the layer's top padding, which the textarea has too.
      area.scrollTop = Math.max(
        0,
        line.offsetTop - 12 - CONTEXT_LINES * LINE_HEIGHT,
      );
      area.scrollLeft = 0;
      return area.scrollTop;
    },
    setScrollTop(top) {
      if (!textarea.current) return top;
      textarea.current.scrollTop = top;
      return textarea.current.scrollTop;
    },
  }));

  async function openFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      onError(t.textDiff.fileTooLarge(file.name));
      return;
    }
    try {
      // Textareas only use "\n"; Windows line breaks would show as changes.
      onChange((await file.text()).replace(/\r\n?/g, "\n"));
      onError("");
    } catch {
      onError(t.textDiff.readFailed(file.name));
    }
  }

  const digits = String(rows.length).length;
  const wrapLayout = wrap ? WRAP_LAYOUT.on : WRAP_LAYOUT.off;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <label htmlFor={id} className="text-[15px] font-semibold">
            {label}
          </label>
          <span className="truncate text-sm text-muted">
            {t.textDiff.lineCount(value === "" ? 0 : rows.length)}
          </span>
        </div>
        <input
          ref={fileInput}
          type="file"
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
          onChange={(event) => {
            const input = event.target;
            void openFile(input.files?.[0]).finally(() => {
              input.value = "";
            });
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          aria-label={t.textDiff.openFileLabel(label.toLowerCase())}
          className={`${GHOST_BUTTON} shrink-0 gap-2 text-sm`}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 15V3" />
            <path d="M7 8l5-5 5 5" />
            <path d="M5 21h14" />
          </svg>
          {t.textDiff.openFile}
        </button>
      </div>

      <div className="flex overflow-hidden rounded-xl border border-line-strong bg-canvas">
        <div
          ref={gutter}
          aria-hidden="true"
          className="relative shrink-0 select-none overflow-hidden border-r border-line bg-surface font-mono text-[12px]"
          style={{ width: `calc(${digits + 1}ch + 1.25rem)` }}
        >
          <div className="absolute inset-x-0 top-0 pt-3 pb-12">
            {rows.map((row, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: a line is identified by its number
                key={index}
                style={{
                  height: wrap ? (heights[index] ?? LINE_HEIGHT) : LINE_HEIGHT,
                }}
                className={`flex justify-end gap-1 pr-1.5 pl-2 leading-5 ${
                  row.changed ? style.gutter : "text-muted/70"
                }`}
              >
                <span>{index + 1}</span>
                <span className="w-[1ch]">{row.changed ? style.sign : ""}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            ref={backdrop}
            aria-hidden="true"
            className={`${TEXT_LAYOUT} ${wrapLayout} pointer-events-none absolute inset-0 overflow-hidden text-transparent`}
          >
            <div
              ref={lines}
              className={`pb-12 ${wrap ? "" : "w-max min-w-full"}`}
            >
              {rows.map((row, index) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: a line is identified by its number
                  key={index}
                  className={`min-h-5 ${row.changed ? style.row : ""}`}
                >
                  {row.pieces.map((piece, pieceIndex) =>
                    piece.changed ? (
                      <mark
                        // biome-ignore lint/suspicious/noArrayIndexKey: pieces have no identity besides their position
                        key={pieceIndex}
                        className={`${style.mark} text-transparent`}
                      >
                        {piece.text}
                      </mark>
                    ) : (
                      piece.text
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
          <textarea
            ref={textarea}
            id={id}
            value={value}
            wrap={wrap ? "soft" : "off"}
            onChange={(event) => onChange(event.target.value)}
            onScroll={(event) => {
              const { scrollTop, scrollLeft } = event.currentTarget;
              if (backdrop.current) {
                backdrop.current.scrollTop = scrollTop;
                backdrop.current.scrollLeft = scrollLeft;
              }
              if (gutter.current) gutter.current.scrollTop = scrollTop;
              onScroll(scrollTop);
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            placeholder={placeholder}
            className={`${TEXT_LAYOUT} ${wrapLayout} relative block h-[70vh] min-h-[28rem] w-full resize-y overflow-auto bg-transparent text-ink placeholder:text-muted`}
          />
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  title,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  title?: string;
}) {
  return (
    <label
      title={title}
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[15px]"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4.5 cursor-pointer accent-accent"
      />
      {label}
    </label>
  );
}

export function TextDiff() {
  const { t } = useI18n();
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [mode, setMode] = useState<DiffMode>("words");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);
  const [current, setCurrent] = useState(-1);
  const [error, setError] = useState("");

  const before = useRef<EditorHandle>(null);
  const after = useRef<EditorHandle>(null);
  // scrollTop each editor was moved to by code, so its echo event is ignored.
  const expected = useRef<{ before: number | null; after: number | null }>({
    before: null,
    after: null,
  });

  const diff = diffText(original, modified, mode, { ignoreWhitespace });
  const layout = layoutRows(diff.segments);
  const total = layout.changes.length;
  const position = current < total ? current : -1;
  const isEmpty = original === "" && modified === "";

  function handleScroll(side: "before" | "after", top: number) {
    if (expected.current[side] === top) {
      expected.current[side] = null;
      return;
    }
    expected.current[side] = null;
    if (!syncScroll) return;
    const other = side === "before" ? "after" : "before";
    const target = other === "before" ? before.current : after.current;
    if (target) expected.current[other] = target.setScrollTop(top);
  }

  function goTo(index: number) {
    const change = layout.changes[index];
    if (!change) return;
    setCurrent(index);
    if (before.current) {
      expected.current.before = before.current.scrollToRow(change.before);
    }
    if (after.current) {
      expected.current.after = after.current.scrollToRow(change.after);
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-[clamp(16px,2.5vw,24px)]">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-[15px] font-semibold">
              {t.textDiff.compareBy}
            </legend>
            <div className="flex flex-wrap gap-2">
              {MODES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  onClick={() => setMode(option)}
                  className={`inline-flex min-h-11 items-center rounded-[10px] px-4 text-[15px] font-semibold transition ${
                    mode === option
                      ? "bg-accent text-white"
                      : "border border-line-strong text-muted hover:bg-surface-hover hover:text-ink"
                  }`}
                >
                  {t.textDiff[option]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
            <legend className="sr-only">{t.textDiff.options}</legend>
            <div className="flex flex-wrap gap-x-5">
              <Toggle
                checked={ignoreWhitespace}
                onChange={setIgnoreWhitespace}
                label={t.textDiff.ignoreWhitespace}
                title={t.textDiff.ignoreWhitespaceHint}
              />
              <Toggle
                checked={wrap}
                onChange={setWrap}
                label={t.textDiff.wrap}
              />
              <Toggle
                checked={syncScroll}
                onChange={setSyncScroll}
                label={t.textDiff.syncScroll}
              />
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setOriginal(modified);
              setModified(original);
            }}
            disabled={isEmpty}
            className={GHOST_BUTTON}
          >
            ⇄ {t.textDiff.swap}
          </button>
          <button
            type="button"
            onClick={() => {
              setOriginal("");
              setModified("");
              setError("");
            }}
            disabled={isEmpty}
            className={GHOST_BUTTON}
          >
            {t.common.clear}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DiffEditor
          ref={before}
          id="diff-original"
          label={t.textDiff.original}
          value={original}
          rows={layout.before}
          kind="removed"
          wrap={wrap}
          placeholder={t.textDiff.placeholder}
          onChange={setOriginal}
          onScroll={(top) => handleScroll("before", top)}
          onError={setError}
        />
        <DiffEditor
          ref={after}
          id="diff-modified"
          label={t.textDiff.modified}
          value={modified}
          rows={layout.after}
          kind="added"
          wrap={wrap}
          placeholder={t.textDiff.placeholder}
          onChange={setModified}
          onScroll={(top) => handleScroll("after", top)}
          onError={setError}
        />
      </div>

      <p role="alert" className="text-[15px] text-danger empty:hidden">
        {error}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div
          aria-live="polite"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]"
        >
          {original === "" || modified === "" ? (
            <span className="text-muted">{t.textDiff.empty}</span>
          ) : total > 0 ? (
            <>
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-[3px] bg-down/60"
                />
                <strong className="font-semibold text-down">
                  {t.textDiff.removedCount(diff.removed)}
                </strong>
                <span className="text-muted">· {t.textDiff.legendRemoved}</span>
              </span>
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-[3px] bg-up/60"
                />
                <strong className="font-semibold text-up">
                  {t.textDiff.addedCount(diff.added)}
                </strong>
                <span className="text-muted">· {t.textDiff.legendAdded}</span>
              </span>
            </>
          ) : (
            <span className="font-semibold text-up">
              {t.textDiff.identical}
            </span>
          )}
        </div>

        {total > 0 && original !== "" && modified !== "" && (
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-[15px] text-muted">
              {position >= 0
                ? t.textDiff.position(position + 1, total)
                : t.textDiff.total(total)}
            </span>
            <button
              type="button"
              onClick={() => goTo(position <= 0 ? total - 1 : position - 1)}
              aria-label={t.textDiff.previous}
              title={t.textDiff.previous}
              className={`${GHOST_BUTTON} w-11 px-0`}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => goTo(position >= total - 1 ? 0 : position + 1)}
              aria-label={t.textDiff.next}
              title={t.textDiff.next}
              className={`${GHOST_BUTTON} w-11 px-0`}
            >
              ↓
            </button>
          </div>
        )}
      </div>

      {diff.mode !== mode && (
        <p className="text-sm text-muted">
          {t.textDiff.fellBack(t.textDiff[diff.mode].toLowerCase())}
        </p>
      )}

      <p className="text-sm text-muted">{t.textDiff.note}</p>
    </div>
  );
}
