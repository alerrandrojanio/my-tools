"use client";

import { useEffect, useRef, useState } from "react";
import { layoutPage, type PageSizeMode } from "@/lib/pdf-builder";
import {
  convertPngsToPdf,
  readImageSize,
  validatePngFile,
} from "@/lib/png-to-pdf";

interface QueuedFile {
  id: string;
  file: File;
  width: number;
  height: number;
  previewUrl: string;
}

const SIZE_OPTIONS: readonly {
  id: PageSizeMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "image",
    label: "Image size",
    hint: "Each page matches its image exactly.",
  },
  {
    id: "a4",
    label: "A4",
    hint: "Portrait A4 pages, image centered with a 1 cm margin.",
  },
];

const GHOST_BUTTON =
  "inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4.5 text-[15px] font-semibold text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50";

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PagePreview({
  item,
  index,
  mode,
}: {
  item: QueuedFile;
  index: number;
  mode: PageSizeMode;
}) {
  const layout = layoutPage(item, mode);
  const pct = (value: number, total: number) => `${(value / total) * 100}%`;

  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <div
        className="relative w-full max-w-48 overflow-hidden rounded-md bg-white shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
        style={{ aspectRatio: `${layout.pageWidth} / ${layout.pageHeight}` }}
      >
        {/* biome-ignore lint/performance/noImgElement: local blob preview, next/image can't optimize it */}
        <img
          src={item.previewUrl}
          alt={`Page ${index + 1}: ${item.file.name}`}
          className="absolute"
          style={{
            left: pct(layout.x, layout.pageWidth),
            bottom: pct(layout.y, layout.pageHeight),
            width: pct(layout.width, layout.pageWidth),
            height: pct(layout.height, layout.pageHeight),
          }}
        />
      </div>
      <figcaption className="text-sm text-muted">Page {index + 1}</figcaption>
    </figure>
  );
}

export function PngToPdfConverter() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [mode, setMode] = useState<PageSizeMode>("image");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Release preview blob URLs when the component unmounts.
  const queueRef = useRef(queue);
  queueRef.current = queue;
  useEffect(() => {
    return () => {
      for (const item of queueRef.current) URL.revokeObjectURL(item.previewUrl);
    };
  }, []);

  async function handleFiles(list: FileList | null) {
    if (!list) return;
    const errors: string[] = [];
    const accepted: QueuedFile[] = [];

    for (const file of Array.from(list)) {
      const problem = validatePngFile(file);
      if (problem) {
        errors.push(problem);
        continue;
      }
      try {
        const { width, height } = await readImageSize(file);
        accepted.push({
          id: crypto.randomUUID(),
          file,
          width,
          height,
          previewUrl: URL.createObjectURL(file),
        });
      } catch {
        errors.push(`"${file.name}" could not be read as an image.`);
      }
    }

    setQueue((current) => [...current, ...accepted]);
    setError(errors.join(" "));
  }

  function move(index: number, direction: -1 | 1) {
    setQueue((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(id: string) {
    const removed = queue.find((item) => item.id === id);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    setQueue((current) => current.filter((item) => item.id !== id));
  }

  function clearAll() {
    for (const item of queue) URL.revokeObjectURL(item.previewUrl);
    setQueue([]);
    setError("");
  }

  async function handleConvert() {
    setBusy(true);
    setError("");
    try {
      const blob = await convertPngsToPdf(
        queue.map((item) => item.file),
        mode,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "images.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Conversion failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]">
      <div className="flex flex-col gap-2">
        <label htmlFor="png-files" className="text-[15px] font-semibold">
          PNG images
        </label>
        <input
          id="png-files"
          type="file"
          accept="image/png"
          multiple
          onChange={(event) => {
            const input = event.target;
            handleFiles(input.files).finally(() => {
              input.value = "";
            });
          }}
          className="w-full cursor-pointer rounded-xl border border-dashed border-line-strong bg-canvas p-4 text-[15px] text-muted file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-[10px] file:border-0 file:bg-accent file:px-4.5 file:text-[15px] file:font-semibold file:text-white"
        />
        <p className="text-sm text-muted">
          Each image becomes one page, in the order listed. Transparent areas
          are filled with white. Files never leave your browser.
        </p>
      </div>

      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <legend className="mb-1 text-[15px] font-semibold">Page size</legend>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map(({ id, label }) => (
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
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">
          {SIZE_OPTIONS.find((option) => option.id === mode)?.hint}
        </p>
      </fieldset>

      {queue.length > 0 && (
        <>
          <ol className="flex flex-col gap-2">
            {queue.map((item, index) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-strong bg-canvas px-4 py-2"
              >
                <span className="min-w-0 break-all text-[15px]">
                  {index + 1}. {item.file.name}{" "}
                  <span className="text-muted">
                    ({item.width}×{item.height}, {formatSize(item.file.size)})
                  </span>
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${item.file.name} up`}
                    className={`${GHOST_BUTTON} px-3`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === queue.length - 1}
                    aria-label={`Move ${item.file.name} down`}
                    className={`${GHOST_BUTTON} px-3`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                    className={GHOST_BUTTON}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ol>

          <section
            aria-labelledby="preview-title"
            className="flex flex-col gap-3"
          >
            <h2 id="preview-title" className="text-[15px] font-semibold">
              Preview
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] items-end gap-5 rounded-xl border border-line-strong bg-canvas p-5">
              {queue.map((item, index) => (
                <PagePreview
                  key={item.id}
                  item={item}
                  index={index}
                  mode={mode}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <p role="alert" className="min-h-6 text-[15px] text-danger">
        {error}
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleConvert}
          disabled={queue.length === 0 || busy}
          className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4.5 text-[15px] font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Converting…" : "Convert and download PDF"}
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={queue.length === 0 || busy}
          className={GHOST_BUTTON}
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
