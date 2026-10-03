"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import {
  generatePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  type PasswordOptions,
} from "@/lib/password-utils";

interface Output {
  password: string;
  error: string;
}

const DEFAULT_LENGTH = 16;
const DEFAULT_OPTIONS: PasswordOptions = {
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
};

const OPTION_LABELS: readonly { key: keyof PasswordOptions; label: string }[] =
  [
    { key: "lowercase", label: "Lowercase (a–z)" },
    { key: "uppercase", label: "Uppercase (A–Z)" },
    { key: "digits", label: "Digits (0–9)" },
    { key: "symbols", label: "Symbols (!@#…)" },
  ];

function build(length: number, options: PasswordOptions): Output {
  const result = generatePassword(length, options);
  return result.ok
    ? { password: result.value, error: "" }
    : { password: "", error: result.error };
}

export function PasswordGenerator() {
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [lengthText, setLengthText] = useState(String(DEFAULT_LENGTH));
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_OPTIONS);
  const [output, setOutput] = useState<Output>({ password: "", error: "" });

  // Random values can't be produced during render (server/client would
  // disagree), so the first password is generated after mount.
  useEffect(() => {
    setOutput(build(DEFAULT_LENGTH, DEFAULT_OPTIONS));
  }, []);

  function applyLength(next: number) {
    setLength(next);
    setLengthText(String(next));
    setOutput(build(next, options));
  }

  function handleLengthText(value: string) {
    setLengthText(value);
    const parsed = Number.parseInt(value, 10);
    if (
      Number.isInteger(parsed) &&
      parsed >= MIN_PASSWORD_LENGTH &&
      parsed <= MAX_PASSWORD_LENGTH
    ) {
      setLength(parsed);
      setOutput(build(parsed, options));
    }
  }

  function handleOption(key: keyof PasswordOptions, checked: boolean) {
    const next = { ...options, [key]: checked };
    setOptions(next);
    setOutput(build(length, next));
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]">
      <div className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold">Your password</span>
        <output
          aria-live="polite"
          className="block min-h-16 break-all rounded-xl border border-line-strong bg-canvas p-4 font-mono text-[clamp(18px,2.4vw,24px)] leading-relaxed"
        >
          {output.password}
        </output>
        <p role="alert" className="min-h-6 text-[15px] text-danger">
          {output.error}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <CopyButton text={output.password} label="Copy password" />
        <button
          type="button"
          onClick={() => setOutput(build(length, options))}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-4.5 text-[15px] font-semibold text-ink transition hover:bg-surface-hover"
        >
          Generate new
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="pw-length" className="text-[15px] font-semibold">
          Number of characters ({MIN_PASSWORD_LENGTH}–{MAX_PASSWORD_LENGTH})
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <input
            id="pw-length"
            type="number"
            inputMode="numeric"
            min={MIN_PASSWORD_LENGTH}
            max={MAX_PASSWORD_LENGTH}
            value={lengthText}
            onChange={(event) => handleLengthText(event.target.value)}
            onBlur={() => setLengthText(String(length))}
            className="h-11 w-28 rounded-xl border border-line-strong bg-canvas px-4 font-mono text-[15px] text-ink"
          />
          <input
            type="range"
            aria-label="Password length"
            min={MIN_PASSWORD_LENGTH}
            max={MAX_PASSWORD_LENGTH}
            value={length}
            onChange={(event) => applyLength(Number(event.target.value))}
            className="h-11 min-w-48 flex-1 accent-accent"
          />
        </div>
      </div>

      <fieldset className="m-0 flex min-w-0 flex-wrap gap-x-6 gap-y-1 border-0 p-0">
        <legend className="mb-1 text-[15px] font-semibold">
          Character types
        </legend>
        {OPTION_LABELS.map(({ key, label }) => (
          <label
            key={key}
            className="flex h-11 cursor-pointer items-center gap-2.5 text-[15px]"
          >
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(event) => handleOption(key, event.target.checked)}
              className="size-4.5 accent-accent"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <p className="text-sm text-muted">
        Passwords are generated in your browser with a cryptographically secure
        random source and are never sent anywhere.
      </p>
    </div>
  );
}
