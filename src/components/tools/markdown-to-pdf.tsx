"use client";

import DOMPurify from "dompurify";
import { Marked } from "marked";
import { type DragEvent, useMemo, useState } from "react";
import { useI18n } from "@/i18n/provider";
import {
  firstHeading,
  markdownToPdfDocument,
  type PdfPageSize,
  toPdfFileName,
  validateMarkdownFile,
} from "@/lib/markdown-pdf";
import { renderPdfBlob } from "@/lib/pdfmake-browser";

const PAGE_SIZES: readonly PdfPageSize[] = ["A4", "LETTER"];

const FIELD =
  "min-h-[28rem] w-full resize-y rounded-xl border border-line-strong bg-canvas py-4 pr-6 pl-4 font-mono text-[14px] leading-relaxed text-ink placeholder:text-muted";
const GHOST_BUTTON =
  "inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4.5 text-[15px] font-semibold text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Images are shown as their description, exactly like in the PDF, so the
 * preview never loads remote files (no broken images, no tracking pixels).
 */
const previewMarked = new Marked({
  gfm: true,
  renderer: {
    image({ text }) {
      return `<em class="md-image">[${escapeHtml(text || "image")}]</em>`;
    },
  },
});

/** Live preview: Markdown → HTML, sanitized so pasted HTML can't run scripts. */
function renderPreview(markdown: string): string {
  const html = previewMarked.parse(markdown, { async: false });
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["img", "picture", "video", "audio", "iframe", "style"],
  });
}

export function MarkdownToPdf() {
  const { t, tError } = useI18n();
  const [markdown, setMarkdown] = useState("");
  const [fileName, setFileName] = useState("");
  const [pageSize, setPageSize] = useState<PdfPageSize>("A4");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const preview = useMemo(
    () => (markdown.trim() === "" ? "" : renderPreview(markdown)),
    [markdown],
  );
  const suggestedName =
    fileName || firstHeading(markdown) || t.mdPdf.defaultName;

  async function loadFile(file: File | undefined) {
    if (!file) return;
    const problem = validateMarkdownFile(file);
    if (problem) {
      setError(tError(problem));
      return;
    }
    try {
      setMarkdown(await file.text());
      setFileName(file.name);
      setError("");
    } catch {
      setError(t.mdPdf.readFailed(file.name));
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void loadFile(event.dataTransfer.files[0]);
  }

  async function handleDownload() {
    setBusy(true);
    setError("");
    try {
      const name = toPdfFileName(suggestedName, t.mdPdf.defaultName);
      const document = markdownToPdfDocument(markdown, {
        pageSize,
        title: name.replace(/\.pdf$/, ""),
      });
      const blob = await renderPdfBlob(document);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError(t.mdPdf.failed);
    } finally {
      setBusy(false);
    }
  }

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
        <label htmlFor="md-file" className="text-[15px] font-semibold">
          {t.mdPdf.upload}
        </label>
        <input
          id="md-file"
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          onChange={(event) => {
            const input = event.target;
            void loadFile(input.files?.[0]).finally(() => {
              input.value = "";
            });
          }}
          className="w-full cursor-pointer text-[15px] text-muted file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-[10px] file:border-0 file:bg-accent file:px-4.5 file:text-[15px] file:font-semibold file:text-white"
        />
        <p className="text-sm text-muted">{t.mdPdf.uploadHint}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="md-input" className="text-[15px] font-semibold">
            {t.mdPdf.input}
          </label>
          <textarea
            id="md-input"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck={false}
            placeholder={t.mdPdf.placeholder}
            className={FIELD}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[15px] font-semibold">{t.mdPdf.preview}</span>
          {preview ? (
            <div
              className="md-preview h-[28rem] overflow-y-auto overscroll-contain rounded-xl border border-line-strong bg-white px-8 py-6 text-[#1a1a1a]"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: the HTML is sanitized with DOMPurify
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          ) : (
            <div className="flex min-h-[28rem] items-center justify-center rounded-xl border border-line-strong bg-canvas p-6 text-center text-muted">
              {t.mdPdf.previewEmpty}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="md-name" className="text-[15px] font-semibold">
            {t.mdPdf.fileName}
          </label>
          <input
            id="md-name"
            type="text"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            placeholder={toPdfFileName(suggestedName, t.mdPdf.defaultName)}
            autoComplete="off"
            spellCheck={false}
            className="h-11 w-72 max-w-full rounded-xl border border-line-strong bg-canvas px-3 text-[15px] text-ink placeholder:text-muted"
          />
        </div>

        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-[15px] font-semibold">
            {t.mdPdf.pageSize}
          </legend>
          <div className="flex gap-2">
            {PAGE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={pageSize === size}
                onClick={() => setPageSize(size)}
                className={`inline-flex min-h-11 items-center rounded-[10px] px-4 text-[15px] font-semibold transition ${
                  pageSize === size
                    ? "bg-accent text-white"
                    : "border border-line-strong text-muted hover:bg-surface-hover hover:text-ink"
                }`}
              >
                {size === "A4" ? "A4" : t.mdPdf.letter}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <p role="alert" className="min-h-6 text-[15px] text-danger">
        {error}
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy || markdown.trim() === ""}
          className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4.5 text-[15px] font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? t.mdPdf.generating : t.mdPdf.download}
        </button>
        <button
          type="button"
          onClick={() => {
            setMarkdown("");
            setFileName("");
            setError("");
          }}
          disabled={markdown === "" && fileName === ""}
          className={GHOST_BUTTON}
        >
          {t.common.clear}
        </button>
      </div>

      <p className="text-sm text-muted">{t.mdPdf.note}</p>
    </div>
  );
}
