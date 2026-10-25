"use client";

import { type DragEvent, useState } from "react";
import { useI18n } from "@/i18n/provider";
import type { CompressResult, ImageMode } from "@/lib/pdf-compress";

/** pdf-lib is large, so it is only downloaded once a file is chosen. */
const loadCompressor = () => import("@/lib/pdf-compress");

const MAX_SIZES: readonly (number | null)[] = [null, 2400, 1600, 1000];
const DEFAULT_QUALITY = 65;

const GHOST_BUTTON =
  "inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4.5 text-[15px] font-semibold text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50";

function toggleClass(active: boolean): string {
  return `inline-flex min-h-11 items-center justify-center rounded-[10px] px-4.5 text-[15px] font-semibold transition ${
    active
      ? "bg-accent text-white"
      : "border border-line-strong text-muted hover:bg-surface-hover hover:text-ink"
  }`;
}

function compressedName(name: string): string {
  return `${name.replace(/\.pdf$/i, "") || "document"}-compressed.pdf`;
}

export function PdfCompressor() {
  const { t, tError, tag } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<ImageMode>("recompress");
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [maxSize, setMaxSize] = useState<number | null>(null);
  const [result, setResult] = useState<CompressResult | null>(null);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const formatSize = (bytes: number) => {
    const mb = bytes >= 1024 * 1024;
    const value = mb ? bytes / (1024 * 1024) : Math.max(1, bytes / 1024);
    const number = new Intl.NumberFormat(tag, {
      maximumFractionDigits: mb ? 2 : 0,
    }).format(value);
    return `${number} ${mb ? "MB" : "KB"}`;
  };

  // Any change of file or settings makes the previous result stale.
  function update(apply: () => void) {
    apply();
    setResult(null);
    setError("");
  }

  async function chooseFile(chosen: File | undefined) {
    if (!chosen) return;
    try {
      const { validatePdfFile } = await loadCompressor();
      const problem = validatePdfFile(chosen);
      update(() => setFile(problem ? null : chosen));
      if (problem) setError(tError(problem));
    } catch {
      setError(t.common.networkError);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void chooseFile(event.dataTransfer.files[0]);
  }

  async function handleCompress() {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const { compressPdf, canvasJpegEncoder } = await loadCompressor();
      const input = new Uint8Array(await file.arrayBuffer());
      const compressed = await compressPdf(
        input,
        { images, quality: quality / 100, maxSize },
        canvasJpegEncoder,
        (done, total) => setProgress([done, total]),
      );
      setResult(compressed);
    } catch (compressError) {
      setError(
        compressError instanceof Error
          ? tError(compressError.message)
          : t.pdfCompress.failed,
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function handleDownload() {
    if (!file || !result) return;
    const url = URL.createObjectURL(
      new Blob([result.bytes as BlobPart], { type: "application/pdf" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = compressedName(file.name);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  const ratio = file && result ? result.bytes.length / file.size : 1;
  const savedPercent = new Intl.NumberFormat(tag, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(1 - ratio);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop is a shortcut; the file input inside stays keyboard accessible */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col gap-2 rounded-xl border border-dashed p-4 transition ${
          dragging
            ? "border-accent bg-accent-tint"
            : "border-line-strong bg-canvas"
        }`}
      >
        <label htmlFor="pdf-file" className="text-[15px] font-semibold">
          {t.pdfCompress.file}
        </label>
        <input
          id="pdf-file"
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          onChange={(event) => {
            const input = event.target;
            void chooseFile(input.files?.[0]).finally(() => {
              input.value = "";
            });
          }}
          className="w-full cursor-pointer text-[15px] text-muted file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-[10px] file:border-0 file:bg-accent file:px-4.5 file:text-[15px] file:font-semibold file:text-white"
        />
        {file ? (
          <p className="min-w-0 truncate text-[15px]" title={file.name}>
            {file.name}{" "}
            <span className="text-muted">({formatSize(file.size)})</span>
          </p>
        ) : (
          <p className="text-sm text-muted">{t.pdfCompress.hint}</p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
          <legend className="mb-1 text-[15px] font-semibold">
            {t.pdfCompress.images}
          </legend>
          <div className="flex flex-wrap gap-2">
            {(["recompress", "keep"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={images === mode}
                onClick={() => update(() => setImages(mode))}
                className={toggleClass(images === mode)}
              >
                {t.pdfCompress[mode]}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">
            {images === "recompress"
              ? t.pdfCompress.recompressHint
              : t.pdfCompress.keepHint}
          </p>
        </fieldset>

        {images === "recompress" && (
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="pdf-quality"
                className="text-[15px] font-semibold"
              >
                {t.pdfCompress.quality}
              </label>
              <output
                htmlFor="pdf-quality"
                className="shrink-0 font-mono text-[15px] font-semibold"
              >
                {quality}
              </output>
            </div>
            <input
              id="pdf-quality"
              type="range"
              min={20}
              max={95}
              step={5}
              value={quality}
              onChange={(event) =>
                update(() => setQuality(Number(event.target.value)))
              }
              className="h-11 w-full cursor-pointer accent-accent"
            />
            <p className="text-sm text-muted">{t.pdfCompress.qualityHint}</p>
          </div>
        )}
      </div>

      {images === "recompress" && (
        <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
          <legend className="mb-1 text-[15px] font-semibold">
            {t.pdfCompress.maxSize}
          </legend>
          <div className="flex flex-wrap gap-2">
            {MAX_SIZES.map((size) => (
              <button
                key={size ?? "full"}
                type="button"
                aria-pressed={maxSize === size}
                onClick={() => update(() => setMaxSize(size))}
                className={`${toggleClass(maxSize === size)} min-w-20`}
              >
                {size === null ? t.pdfCompress.full : size}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">{t.pdfCompress.maxSizeHint}</p>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCompress}
          disabled={!file || busy}
          className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4.5 text-[15px] font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? t.pdfCompress.compressing : t.pdfCompress.compress}
        </button>
        {busy && progress && progress[1] > 0 && (
          <span aria-live="polite" className="text-[15px] text-muted">
            {t.pdfCompress.progress(
              Math.min(progress[0] + 1, progress[1]),
              progress[1],
            )}
          </span>
        )}
      </div>

      <p role="alert" className="min-h-6 text-[15px] text-danger empty:hidden">
        {error}
      </p>

      {file && result && (
        <section
          aria-labelledby="pdf-result-title"
          className="flex flex-col gap-4 rounded-xl border border-line-strong bg-canvas p-[clamp(16px,2.5vw,24px)]"
        >
          <h2 id="pdf-result-title" className="sr-only">
            {t.common.result}
          </h2>
          <dl className="flex flex-col gap-3">
            {[
              { label: t.pdfCompress.original, bytes: file.size, width: 1 },
              {
                label: t.pdfCompress.compressed,
                bytes: result.bytes.length,
                width: Math.min(1, ratio),
              },
            ].map(({ label, bytes, width }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="shrink-0 whitespace-nowrap font-mono text-[15px] font-semibold">
                    {formatSize(bytes)}
                  </dd>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(1, width * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </dl>

          {result.unchanged ? (
            <p className="text-[15px] text-muted">{t.pdfCompress.unchanged}</p>
          ) : (
            <p className="text-[15px]">
              <strong className="text-up">
                {t.pdfCompress.smaller(savedPercent)}
              </strong>{" "}
              <span className="text-muted">
                {images === "recompress"
                  ? t.pdfCompress.imagesSummary(
                      result.recompressed,
                      result.images,
                    )
                  : ""}
              </span>
            </p>
          )}

          <div>
            <button
              type="button"
              onClick={handleDownload}
              disabled={result.unchanged}
              className={GHOST_BUTTON}
            >
              {t.pdfCompress.download}
            </button>
          </div>
        </section>
      )}

      <p className="text-sm text-muted">{t.pdfCompress.note}</p>
    </div>
  );
}
