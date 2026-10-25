"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { useI18n } from "@/i18n/provider";
import {
  contrastLevel,
  contrastRatio,
  formatHsl,
  formatRgb,
  hslToRgb,
  parseHex,
  parseHsl,
  parseRgb,
  type Rgb,
  rgbToHex,
  rgbToHsl,
  shades,
} from "@/lib/color-convert";

type Format = "hex" | "rgb" | "hsl";

const FORMATS: readonly { id: Format; label: string }[] = [
  { id: "hex", label: "HEX" },
  { id: "rgb", label: "RGB" },
  { id: "hsl", label: "HSL" },
];

const INITIAL: Rgb = { r: 124, g: 58, b: 237 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

function formatAll(rgb: Rgb): Record<Format, string> {
  return {
    hex: rgbToHex(rgb),
    rgb: formatRgb(rgb),
    hsl: formatHsl(rgbToHsl(rgb)),
  };
}

function parse(format: Format, text: string): Rgb | null {
  if (format === "hex") return parseHex(text);
  if (format === "rgb") return parseRgb(text);
  const hsl = parseHsl(text);
  return hsl ? hslToRgb(hsl) : null;
}

export function ColorConverter() {
  const { t, tag } = useI18n();
  const [color, setColor] = useState<Rgb>(INITIAL);
  // What each field shows: the field being typed in keeps the user's text.
  const [drafts, setDrafts] = useState<Record<Format, string>>(() =>
    formatAll(INITIAL),
  );
  const [invalid, setInvalid] = useState<Format | null>(null);

  const formatted = formatAll(color);
  const hex = formatted.hex;

  function applyColor(rgb: Rgb, keep?: Format) {
    setColor(rgb);
    const next = formatAll(rgb);
    setDrafts((current) => (keep ? { ...next, [keep]: current[keep] } : next));
    setInvalid(null);
  }

  function handleType(format: Format, text: string) {
    const rgb = parse(format, text);
    if (rgb) {
      setColor(rgb);
      setDrafts({ ...formatAll(rgb), [format]: text });
      setInvalid(null);
    } else {
      setDrafts((current) => ({ ...current, [format]: text }));
      setInvalid(format);
    }
  }

  function randomColor() {
    const bytes = crypto.getRandomValues(new Uint8Array(3));
    applyColor({ r: bytes[0], g: bytes[1], b: bytes[2] });
  }

  const ratioFormat = new Intl.NumberFormat(tag, { maximumFractionDigits: 2 });
  const contrasts = [
    { label: t.color.whiteText, text: WHITE, textClass: "text-white" },
    { label: t.color.blackText, text: BLACK, textClass: "text-black" },
  ].map((entry) => {
    const ratio = contrastRatio(color, entry.text);
    return { ...entry, ratio, level: contrastLevel(ratio) };
  });

  const errors: Record<Format, string> = {
    hex: t.color.invalidHex,
    rgb: t.color.invalidRgb,
    hsl: t.color.invalidHsl,
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <div
            className="min-h-48 flex-1 rounded-xl border border-line-strong"
            style={{ backgroundColor: hex }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="color-picker"
              className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-[15px] font-semibold"
            >
              <input
                id="color-picker"
                type="color"
                value={hex}
                onChange={(event) => {
                  const rgb = parseHex(event.target.value);
                  if (rgb) applyColor(rgb);
                }}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-[10px] border border-line-strong bg-canvas p-1"
              />
              {t.color.picker}
            </label>
            <button
              type="button"
              onClick={randomColor}
              className="inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4.5 text-[15px] font-semibold text-ink transition hover:bg-surface-hover"
            >
              {t.color.random}
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {FORMATS.map(({ id, label }) => (
            <div key={id} className="flex flex-col gap-2">
              <label
                htmlFor={`color-${id}`}
                className="text-[15px] font-semibold"
              >
                {label}
              </label>
              <div className="flex gap-2">
                <input
                  id={`color-${id}`}
                  type="text"
                  value={drafts[id]}
                  onChange={(event) => handleType(id, event.target.value)}
                  onBlur={() => {
                    // Tidy the text once the user is done with a valid value.
                    if (invalid !== id) {
                      setDrafts((current) => ({
                        ...current,
                        [id]: formatted[id],
                      }));
                    }
                  }}
                  aria-invalid={invalid === id}
                  aria-describedby={
                    invalid === id ? `color-${id}-error` : undefined
                  }
                  autoComplete="off"
                  spellCheck={false}
                  className={`h-11 min-w-0 flex-1 rounded-xl border bg-canvas px-3 font-mono text-[15px] text-ink ${
                    invalid === id ? "border-danger" : "border-line-strong"
                  }`}
                />
                <CopyButton
                  text={formatted[id]}
                  label={t.color.copyLabel(label)}
                  compact
                />
              </div>
              {invalid === id && (
                <p id={`color-${id}-error`} className="text-sm text-danger">
                  {errors[id]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <section aria-labelledby="color-contrast" className="flex flex-col gap-3">
        <h2 id="color-contrast" className="text-[15px] font-semibold">
          {t.color.contrastTitle}
        </h2>
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2">
          {contrasts.map(({ label, ratio, level, textClass }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-xl border border-line-strong px-4 py-3"
              style={{ backgroundColor: hex }}
            >
              <span className={`min-w-0 text-lg font-bold ${textClass}`}>
                {t.color.sample}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 rounded-lg bg-canvas/85 px-2.5 py-1.5 text-right">
                <span className="text-sm text-muted">{label}</span>
                <span className="whitespace-nowrap font-mono text-[15px] font-semibold">
                  {ratioFormat.format(ratio)}:1
                </span>
                <span
                  className={`whitespace-nowrap text-sm font-semibold ${
                    level === "fail" ? "text-danger" : "text-up"
                  }`}
                >
                  {level === "AAA"
                    ? t.color.levelAAA
                    : level === "AA"
                      ? t.color.levelAA
                      : t.color.levelFail}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="color-shades" className="flex flex-col gap-3">
        <h2 id="color-shades" className="text-[15px] font-semibold">
          {t.color.shades}
        </h2>
        <div className="grid grid-cols-9 gap-1.5">
          {shades(color).map((shade) => {
            const shadeHex = rgbToHex(shade);
            return (
              <button
                key={shadeHex}
                type="button"
                onClick={() => applyColor(shade)}
                aria-label={t.color.shadeLabel(shadeHex)}
                title={shadeHex}
                className="h-12 min-w-0 rounded-lg border border-line-strong transition hover:scale-105"
                style={{ backgroundColor: shadeHex }}
              />
            );
          })}
        </div>
      </section>

      <p className="text-sm text-muted">{t.color.note}</p>
    </div>
  );
}
