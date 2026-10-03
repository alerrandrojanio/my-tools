"use client";

import { useState } from "react";
import { countText } from "@/lib/word-counter";

export function WordCounter() {
  const [text, setText] = useState("");
  const stats = countText(text);

  const items = [
    { label: "Words", value: stats.words },
    { label: "Characters", value: stats.characters },
    { label: "Characters (no spaces)", value: stats.charactersNoSpaces },
    { label: "Sentences", value: stats.sentences },
    { label: "Paragraphs", value: stats.paragraphs },
    { label: "Reading time", value: `${stats.readingMinutes} min` },
  ];

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]">
      <dl className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-3">
        {items.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col justify-between gap-2 rounded-xl border border-line-strong bg-canvas px-4 py-3"
          >
            <dt className="whitespace-nowrap text-sm text-muted">{label}</dt>
            <dd className="text-2xl font-extrabold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-2">
        <label htmlFor="wc-input" className="text-[15px] font-semibold">
          Your text
        </label>
        <textarea
          id="wc-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type or paste your text here…"
          className="min-h-[28rem] w-full resize-y rounded-xl border border-line-strong bg-canvas p-4 text-[16px] leading-relaxed text-ink placeholder:text-muted"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setText("")}
          disabled={text === ""}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4.5 text-[15px] font-semibold text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
