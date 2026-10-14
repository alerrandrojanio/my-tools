"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import {
  type Base64Result,
  decodeBase64,
  encodeBase64,
} from "@/lib/base64-utils";

type Mode = "encode" | "decode";

const MODES: readonly Mode[] = ["encode", "decode"];

const FIELD =
  "min-h-[28rem] w-full resize-y rounded-xl border border-line-strong bg-canvas py-4 pr-6 pl-4 font-mono text-[15px] leading-relaxed text-ink placeholder:text-muted";

const BUTTON =
  "inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4.5 text-[15px] font-semibold text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent";

function convert(mode: Mode, input: string, urlSafe: boolean): Base64Result {
  if (input === "") return { ok: true, value: "" };
  return mode === "encode"
    ? encodeBase64(input, { urlSafe })
    : decodeBase64(input);
}

export function Base64Converter() {
  const { t, tError } = useI18n();
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = convert(mode, input, urlSafe);
  const output = result.ok ? result.value : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function handleSwap() {
    setInput(output);
    setMode(mode === "encode" ? "decode" : "encode");
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]">
      <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
        <legend className="sr-only">{t.base64.directionLegend}</legend>
        {MODES.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={`inline-flex min-h-11 items-center rounded-[10px] px-4.5 text-[15px] font-semibold transition ${
              mode === id
                ? "bg-accent text-white"
                : "border border-line-strong text-muted hover:bg-surface-hover hover:text-ink"
            }`}
          >
            {t.base64[id]}
          </button>
        ))}
      </fieldset>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="b64-input" className="text-[15px] font-semibold">
            {mode === "encode" ? t.base64.inputEncode : t.base64.inputDecode}
          </label>
          <textarea
            id="b64-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            aria-invalid={!result.ok}
            aria-describedby={result.ok ? undefined : "b64-error"}
            placeholder={
              mode === "encode"
                ? t.base64.placeholderEncode
                : t.base64.placeholderDecode
            }
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="b64-output" className="text-[15px] font-semibold">
            {t.common.result}
          </label>
          <textarea
            id="b64-output"
            value={output}
            readOnly
            spellCheck={false}
            placeholder={t.common.resultPlaceholder}
            className={FIELD}
          />
        </div>
      </div>

      <p
        id="b64-error"
        role="alert"
        className={`text-[15px] text-danger ${result.ok ? "hidden" : ""}`}
      >
        {result.ok ? "" : tError(result.error)}
      </p>

      {mode === "encode" && (
        <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2.5 text-[15px]">
          <input
            type="checkbox"
            checked={urlSafe}
            onChange={(event) => setUrlSafe(event.target.checked)}
            className="size-4.5 accent-accent"
          />
          {t.base64.urlSafe}
        </label>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCopy}
          disabled={output === ""}
          className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4.5 text-[15px] font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
        >
          {copied ? t.common.copied : t.common.copyResult}
        </button>
        <button
          type="button"
          onClick={handleSwap}
          disabled={output === ""}
          className={BUTTON}
        >
          {t.base64.useAsInput}
        </button>
        <button
          type="button"
          onClick={() => setInput("")}
          disabled={input === ""}
          className={BUTTON}
        >
          {t.common.clear}
        </button>
      </div>
    </div>
  );
}
