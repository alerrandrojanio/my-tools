"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { contrastRatio, luminance, parseHex } from "@/lib/color-convert";
import {
  type QrLevel,
  type QrStyle,
  qrInfo,
  renderQrPng,
  renderQrSvg,
  validateWifi,
  type WifiSecurity,
  wifiPayload,
} from "@/lib/qr-code";

const LEVELS: readonly QrLevel[] = ["L", "M", "Q", "H"];
const SECURITIES: readonly WifiSecurity[] = ["WPA", "WEP", "nopass"];
const PNG_SIZES: readonly number[] = [256, 512, 1024, 2048];
const MARGIN = 4;
/** Below this, phone cameras start to struggle (3:1 is the WCAG graphics minimum). */
const MIN_CONTRAST = 3;

const FIELD =
  "w-full rounded-xl border border-line-strong bg-canvas px-3 text-[15px] text-ink placeholder:text-muted";
const GHOST_BUTTON =
  "inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4.5 text-[15px] font-semibold text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50";

function toggleClass(active: boolean): string {
  return `inline-flex min-h-11 items-center rounded-[10px] px-4 text-[15px] font-semibold transition ${
    active
      ? "bg-accent text-white"
      : "border border-line-strong text-muted hover:bg-surface-hover hover:text-ink"
  }`;
}

function download(href: string, name: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  link.click();
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-[10px] border border-line-strong bg-canvas p-1"
        />
        <span className="font-mono text-[15px] uppercase">{value}</span>
      </div>
    </div>
  );
}

export function QrCodeGenerator() {
  const { t, tError } = useI18n();
  const [kind, setKind] = useState<"text" | "wifi">("text");
  const [text, setText] = useState("");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [security, setSecurity] = useState<WifiSecurity>("WPA");
  const [hidden, setHidden] = useState(false);
  const [level, setLevel] = useState<QrLevel>("M");
  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#ffffff");
  const [pngSize, setPngSize] = useState(1024);
  const [svg, setSvg] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const style: QrStyle = { level, foreground, background, margin: MARGIN };
  const network = { ssid, password, security, hidden };
  const wifiProblem = kind === "wifi" ? validateWifi(network) : null;
  const payload =
    kind === "text" ? text : wifiProblem ? "" : wifiPayload(network);

  let info: ReturnType<typeof qrInfo> | null = null;
  let error = "";
  if (payload !== "") {
    try {
      info = qrInfo(payload, level);
    } catch (sizeError) {
      error = sizeError instanceof Error ? tError(sizeError.message) : "";
    }
  } else if (wifiProblem && (ssid !== "" || password !== "")) {
    error = tError(wifiProblem);
  }

  // The SVG renderer is asynchronous; a newer input cancels an older render.
  const ready = info !== null;
  useEffect(() => {
    if (!ready) return;
    let current = true;
    renderQrSvg(payload, {
      level,
      foreground,
      background,
      margin: MARGIN,
    })
      .then((result) => {
        if (current) setSvg(result);
      })
      .catch(() => {
        if (current) setSvg("");
      });
    return () => {
      current = false;
    };
  }, [ready, payload, level, foreground, background]);

  const fg = parseHex(foreground);
  const bg = parseHex(background);
  const lowContrast = fg && bg && contrastRatio(fg, bg) < MIN_CONTRAST;
  const inverted = fg && bg && luminance(fg) > luminance(bg);
  const shown = ready ? svg : "";

  async function handlePng() {
    setDownloadError("");
    try {
      download(await renderQrPng(payload, style, pngSize), "qr-code.png");
    } catch {
      setDownloadError(t.qr.failed);
    }
  }

  function handleSvg() {
    const url = URL.createObjectURL(
      new Blob([shown], { type: "image/svg+xml" }),
    );
    download(url, "qr-code.svg");
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <div className="grid gap-6 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <div className="flex min-w-0 flex-col gap-6">
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-[15px] font-semibold">
            {t.qr.contentType}
          </legend>
          <div className="flex flex-wrap gap-2">
            {(["text", "wifi"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => setKind(option)}
                className={toggleClass(kind === option)}
              >
                {t.qr[option]}
              </button>
            ))}
          </div>
        </fieldset>

        {kind === "text" ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="qr-text" className="text-[15px] font-semibold">
              {t.qr.text}
            </label>
            <textarea
              id="qr-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t.qr.textPlaceholder}
              rows={4}
              spellCheck={false}
              className={`${FIELD} min-h-28 resize-y py-3 leading-relaxed`}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="qr-ssid" className="text-[15px] font-semibold">
                  {t.qr.ssid}
                </label>
                <input
                  id="qr-ssid"
                  type="text"
                  value={ssid}
                  onChange={(event) => setSsid(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className={`${FIELD} h-11`}
                />
              </div>
              {security !== "nopass" && (
                <div className="flex min-w-0 flex-col gap-2">
                  <label
                    htmlFor="qr-password"
                    className="text-[15px] font-semibold"
                  >
                    {t.qr.password}
                  </label>
                  <input
                    id="qr-password"
                    type="text"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className={`${FIELD} h-11 font-mono`}
                  />
                </div>
              )}
            </div>
            <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-[15px] font-semibold">
                {t.qr.security}
              </legend>
              <div className="flex flex-wrap items-center gap-2">
                {SECURITIES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={security === option}
                    onClick={() => setSecurity(option)}
                    className={toggleClass(security === option)}
                  >
                    {option === "WPA"
                      ? t.qr.wpa
                      : option === "WEP"
                        ? t.qr.wep
                        : t.qr.open}
                  </button>
                ))}
                <label className="ml-2 inline-flex min-h-11 cursor-pointer items-center gap-2 text-[15px]">
                  <input
                    type="checkbox"
                    checked={hidden}
                    onChange={(event) => setHidden(event.target.checked)}
                    className="size-4.5 cursor-pointer accent-accent"
                  />
                  {t.qr.hidden}
                </label>
              </div>
            </fieldset>
            <p className="text-sm text-muted">{t.qr.wifiHint}</p>
          </div>
        )}

        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-[15px] font-semibold">
            {t.qr.level}
          </legend>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={level === option}
                onClick={() => setLevel(option)}
                className={toggleClass(level === option)}
              >
                {t.qr.levels[option]}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">{t.qr.levelHint}</p>
        </fieldset>

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <ColorField
            id="qr-foreground"
            label={t.qr.foreground}
            value={foreground}
            onChange={setForeground}
          />
          <ColorField
            id="qr-background"
            label={t.qr.background}
            value={background}
            onChange={setBackground}
          />
        </div>
        {(lowContrast || inverted) && (
          <p className="text-[15px] text-danger">
            {lowContrast ? t.qr.lowContrast : t.qr.inverted}
          </p>
        )}
      </div>

      <section
        aria-labelledby="qr-preview-title"
        className="flex min-w-0 flex-col gap-4"
      >
        <h2 id="qr-preview-title" className="text-[15px] font-semibold">
          {t.qr.preview}
        </h2>
        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-line-strong bg-canvas">
          {shown ? (
            // biome-ignore lint/performance/noImgElement: a generated data URL, next/image can't optimize it
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(shown)}`}
              alt={t.qr.previewAlt}
              className="size-full [image-rendering:pixelated]"
            />
          ) : (
            <p className="p-6 text-center text-muted">{t.qr.previewEmpty}</p>
          )}
        </div>

        <p role="alert" className="text-[15px] text-danger empty:hidden">
          {error || downloadError}
        </p>
        {info && (
          <p className="text-sm text-muted">
            {t.qr.info(info.version, info.modules, [...payload].length)}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="qr-png-size" className="text-[15px] font-semibold">
            {t.qr.pngSize}
          </label>
          <select
            id="qr-png-size"
            value={pngSize}
            onChange={(event) => setPngSize(Number(event.target.value))}
            className={`${FIELD} h-11`}
          >
            {PNG_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} × {size} px
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePng}
            disabled={!shown}
            className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4.5 text-[15px] font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.qr.downloadPng}
          </button>
          <button
            type="button"
            onClick={handleSvg}
            disabled={!shown}
            className={GHOST_BUTTON}
          >
            {t.qr.downloadSvg}
          </button>
        </div>

        <p className="text-sm text-muted">{t.qr.note}</p>
      </section>
    </div>
  );
}
