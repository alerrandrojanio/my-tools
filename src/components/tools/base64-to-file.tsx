"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildFileName,
  decodeBase64ToFile,
  formatBytes,
} from "@/lib/base64-file";

interface ConvertedFile {
  url: string;
  name: string;
  mime: string;
  size: number;
}

const GHOST_BUTTON =
  "inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4.5 text-[15px] font-semibold text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50";

export function Base64ToFile() {
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState("file");
  const [converted, setConverted] = useState<ConvertedFile | null>(null);
  const [error, setError] = useState("");

  // Release the blob URL when it is replaced and when the component unmounts.
  const urlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function reset() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setConverted(null);
  }

  function handleConvert() {
    reset();
    setError("");

    const result = decodeBase64ToFile(input);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    const blob = new Blob([result.bytes as BlobPart], { type: result.mime });
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    setConverted({
      url,
      name: buildFileName(fileName, result.extension),
      mime: result.mime,
      size: result.bytes.length,
    });
  }

  function handleClear() {
    reset();
    setInput("");
    setError("");
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]">
      <div className="flex flex-col gap-2">
        <label htmlFor="b64f-input" className="text-[15px] font-semibold">
          Base64 (raw or data URI)
        </label>
        <textarea
          id="b64f-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          spellCheck={false}
          aria-invalid={error !== ""}
          aria-describedby="b64f-error"
          placeholder="Paste Base64 here, e.g. iVBORw0KGgo… or data:image/png;base64,iVBORw0KGgo…"
          className="min-h-[20rem] w-full resize-y rounded-xl border border-line-strong bg-canvas py-4 pr-6 pl-4 font-mono text-[14px] leading-relaxed text-ink placeholder:text-muted"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="b64f-name" className="text-[15px] font-semibold">
          File name
        </label>
        <input
          id="b64f-name"
          type="text"
          value={fileName}
          onChange={(event) => setFileName(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full max-w-md rounded-xl border border-line-strong bg-canvas px-4 text-[15px] text-ink"
        />
        <p className="text-sm text-muted">
          The extension is added automatically when the file type is detected.
        </p>
      </div>

      <p
        id="b64f-error"
        role="alert"
        className="min-h-6 text-[15px] text-danger"
      >
        {error}
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleConvert}
          disabled={input.trim() === ""}
          className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4.5 text-[15px] font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Convert to file
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={input === "" && converted === null}
          className={GHOST_BUTTON}
        >
          Clear
        </button>
      </div>

      {converted && (
        <section
          aria-labelledby="b64f-result"
          className="flex flex-col gap-4 rounded-xl border border-line-strong bg-canvas p-5"
        >
          <h2 id="b64f-result" className="text-lg font-bold">
            File ready
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
            <dt className="text-muted">Name</dt>
            <dd className="break-all font-mono">{converted.name}</dd>
            <dt className="text-muted">Type</dt>
            <dd className="font-mono">{converted.mime}</dd>
            <dt className="text-muted">Size</dt>
            <dd>{formatBytes(converted.size)}</dd>
          </dl>

          {converted.mime.startsWith("image/") && (
            <div className="flex max-h-96 items-center justify-center overflow-auto rounded-lg bg-surface p-3">
              {/* biome-ignore lint/performance/noImgElement: local blob preview, next/image can't optimize it */}
              <img
                src={converted.url}
                alt={`Preview of ${converted.name}`}
                className="max-h-80 max-w-full object-contain"
              />
            </div>
          )}
          {converted.mime === "application/pdf" && (
            <iframe
              src={converted.url}
              title={`Preview of ${converted.name}`}
              className="h-96 w-full rounded-lg border-0 bg-white"
            />
          )}

          <div>
            <a
              href={converted.url}
              download={converted.name}
              className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4.5 text-[15px] font-semibold text-white transition hover:brightness-90"
            >
              Download file
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
