"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { countText } from "@/lib/word-counter";

export function WordCounter() {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const stats = countText(text);

  const items = [
    { label: t.wordCounter.words, value: stats.words },
    { label: t.wordCounter.characters, value: stats.characters },
    {
      label: t.wordCounter.charactersNoSpaces,
      value: stats.charactersNoSpaces,
    },
    { label: t.wordCounter.sentences, value: stats.sentences },
    { label: t.wordCounter.paragraphs, value: stats.paragraphs },
    {
      label: t.wordCounter.readingTime,
      value: t.wordCounter.minutes(stats.readingMinutes),
    },
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
          {t.wordCounter.yourText}
        </label>
        <textarea
          id="wc-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t.wordCounter.placeholder}
          className="min-h-[28rem] w-full resize-y rounded-xl border border-line-strong bg-canvas py-4 pr-6 pl-4 text-[16px] leading-relaxed text-ink placeholder:text-muted"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setText("")}
          disabled={text === ""}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4.5 text-[15px] font-semibold text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t.common.clear}
        </button>
      </div>
    </div>
  );
}
