"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import {
  formatJson,
  type JsonIndent,
  type JsonResult,
  minifyJson,
} from "@/lib/json-utils";

const INDENT_OPTIONS: readonly {
  value: string;
  label: string;
  indent: JsonIndent;
}[] = [
  { value: "2", label: "2 spaces", indent: 2 },
  { value: "4", label: "4 spaces", indent: 4 },
  { value: "tab", label: "Tab", indent: "tab" },
];

const FIELD =
  "min-h-[32rem] w-full resize-y rounded-xl border border-line-strong bg-canvas p-4 font-mono text-[14px] leading-relaxed text-ink placeholder:text-muted";

const GHOST_BUTTON =
  "inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4.5 text-[15px] font-semibold text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50";

const PRIMARY_BUTTON =
  "inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4.5 text-[15px] font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50";

export function JsonFormatter() {
  const [input, setInput] = useState("");
  const [indentValue, setIndentValue] = useState("2");
  const [sortKeys, setSortKeys] = useState(false);
  const [result, setResult] = useState<JsonResult | null>(null);

  const indent =
    INDENT_OPTIONS.find((option) => option.value === indentValue)?.indent ?? 2;

  function run(action: "format" | "minify") {
    setResult(
      action === "format"
        ? formatJson(input, { indent, sortKeys })
        : minifyJson(input, { sortKeys }),
    );
  }

  const output = result?.ok ? result.value : "";
  const isBlank = input.trim() === "";

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="indent" className="text-[15px] font-semibold">
            Indentation
          </label>
          <select
            id="indent"
            value={indentValue}
            onChange={(event) => setIndentValue(event.target.value)}
            className="h-11 rounded-xl border border-line-strong bg-canvas px-3 text-[15px] text-ink"
          >
            {INDENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex h-11 cursor-pointer items-center gap-2.5 text-[15px]">
          <input
            type="checkbox"
            checked={sortKeys}
            onChange={(event) => setSortKeys(event.target.checked)}
            className="size-4.5 accent-accent"
          />
          Sort keys alphabetically
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="json-input" className="text-[15px] font-semibold">
            JSON input
          </label>
          <textarea
            id="json-input"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setResult(null);
            }}
            spellCheck={false}
            aria-invalid={result?.ok === false}
            aria-describedby={result?.ok === false ? "json-status" : undefined}
            placeholder='{"hello": "world"}'
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="json-output" className="text-[15px] font-semibold">
            Result
          </label>
          <textarea
            id="json-output"
            value={output}
            readOnly
            spellCheck={false}
            placeholder="The result appears here."
            className={FIELD}
          />
        </div>
      </div>

      <output
        id="json-status"
        className={`min-h-6 text-[15px] font-semibold ${
          result?.ok === false ? "text-danger" : "text-accent-soft"
        }`}
      >
        {result === null
          ? ""
          : result.ok
            ? "Valid JSON."
            : `Invalid JSON${
                result.line !== undefined
                  ? ` (line ${result.line}, column ${result.column})`
                  : ""
              }: ${result.error}`}
      </output>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => run("format")}
          disabled={isBlank}
          className={PRIMARY_BUTTON}
        >
          Format / Validate
        </button>
        <button
          type="button"
          onClick={() => run("minify")}
          disabled={isBlank}
          className={GHOST_BUTTON}
        >
          Minify
        </button>
        <CopyButton text={output} label="Copy result" />
        <button
          type="button"
          onClick={() => {
            setInput("");
            setResult(null);
          }}
          disabled={input === ""}
          className={GHOST_BUTTON}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
