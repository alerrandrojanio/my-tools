"use client";

import { type FormEvent, useState } from "react";
import { CopyButton } from "@/components/copy-button";

interface ShortenResponse {
  shortUrl?: string;
  error?: string;
}

export function UrlShortener() {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setShortUrl("");

    try {
      const response = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as ShortenResponse;

      if (!response.ok || !data.shortUrl) {
        setError(data.error ?? "Could not create the short link.");
      } else {
        setShortUrl(data.shortUrl);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label htmlFor="long-url" className="text-[15px] font-semibold">
          Long URL
        </label>
        <div className="flex flex-wrap gap-3">
          <input
            id="long-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-invalid={error !== ""}
            aria-describedby="shorten-error"
            placeholder="https://example.com/a/very/long/link"
            className="h-12 min-w-64 flex-1 rounded-xl border border-line-strong bg-canvas px-4 text-[15px] text-ink placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={busy || url.trim() === ""}
            className="inline-flex min-h-12 items-center rounded-xl bg-accent px-5 text-[15px] font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Shortening…" : "Shorten URL"}
          </button>
        </div>
      </form>

      <p
        id="shorten-error"
        role="alert"
        className="min-h-6 text-[15px] text-danger"
      >
        {error}
      </p>

      {shortUrl && (
        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold">Your short link</span>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-strong bg-canvas p-4">
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-mono text-[17px] text-accent-soft hover:text-ink"
            >
              {shortUrl}
            </a>
            <CopyButton text={shortUrl} label="Copy link" />
          </div>
        </div>
      )}

      <p className="text-sm text-muted">
        Short links are stored on our server so they can redirect. Only http and
        https links are accepted.
      </p>
    </div>
  );
}
