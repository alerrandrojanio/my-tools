"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import {
  generateCnpj,
  generateCpf,
  isValidCnpj,
  isValidCpf,
  maskCnpj,
  maskCpf,
} from "@/lib/cpf-cnpj-utils";

type DocType = "cpf" | "cnpj";

const DOC_TYPES: readonly { id: DocType; label: string }[] = [
  { id: "cpf", label: "CPF" },
  { id: "cnpj", label: "CNPJ" },
];

const MAX_QUANTITY = 20;

const FIELD =
  "w-full rounded-xl border border-line-strong bg-canvas px-4 font-mono text-[15px] text-ink placeholder:text-muted";

export function CpfCnpjGenerator() {
  const [type, setType] = useState<DocType>("cpf");
  const [formatted, setFormatted] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [results, setResults] = useState<{ id: string; value: string }[]>([]);
  const [candidate, setCandidate] = useState("");

  function handleGenerate() {
    const generate = type === "cpf" ? generateCpf : generateCnpj;
    setResults(
      Array.from({ length: quantity }, () => ({
        id: crypto.randomUUID(),
        value: generate(formatted),
      })),
    );
  }

  function handleTypeChange(next: DocType) {
    setType(next);
    setResults([]);
    setCandidate("");
  }

  const mask = type === "cpf" ? maskCpf : maskCnpj;

  const trimmed = candidate.trim();
  const candidateIsValid =
    type === "cpf" ? isValidCpf(trimmed) : isValidCnpj(trimmed);

  return (
    <div className="flex flex-col gap-8">
      <section
        aria-labelledby="generate-title"
        className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]"
      >
        <h2 id="generate-title" className="text-xl font-bold">
          Generate
        </h2>

        <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
          <legend className="sr-only">Document type</legend>
          {DOC_TYPES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={type === id}
              onClick={() => handleTypeChange(id)}
              className={`inline-flex min-h-11 items-center rounded-[10px] px-4.5 text-[15px] font-semibold transition ${
                type === id
                  ? "bg-accent text-white"
                  : "border border-line-strong text-muted hover:bg-surface-hover hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </fieldset>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="quantity" className="text-[15px] font-semibold">
              Quantity (1–{MAX_QUANTITY})
            </label>
            <input
              id="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_QUANTITY}
              value={quantity}
              onChange={(event) => {
                const value = Math.floor(Number(event.target.value));
                setQuantity(
                  Number.isFinite(value)
                    ? Math.min(MAX_QUANTITY, Math.max(1, value))
                    : 1,
                );
              }}
              className={`${FIELD} min-h-11 w-28`}
            />
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
            <input
              type="checkbox"
              checked={formatted}
              onChange={(event) => setFormatted(event.target.checked)}
              className="size-4.5 accent-accent"
            />
            Formatted (with dots, slash and dash)
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4.5 text-[15px] font-semibold text-white transition hover:brightness-90"
          >
            Generate {type.toUpperCase()}
          </button>
          <CopyButton
            text={results.map((item) => item.value).join("\n")}
            label="Copy all"
          />
        </div>

        {results.length > 0 && (
          <ul
            aria-label="Generated numbers"
            className="flex flex-col gap-2 rounded-xl border border-line-strong bg-canvas p-4 font-mono text-[17px]"
          >
            {results.map(({ id, value }) => (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <span>{value}</span>
                <CopyButton text={value} compact />
              </li>
            ))}
          </ul>
        )}

        <p className="text-sm text-muted">
          Numbers are mathematically valid but randomly generated. Use them only
          for testing and development.
        </p>
      </section>

      <section
        aria-labelledby="validate-title"
        className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-[clamp(16px,3vw,28px)]"
      >
        <h2 id="validate-title" className="text-xl font-bold">
          Validate a {type.toUpperCase()}
        </h2>
        <label htmlFor="candidate" className="text-[15px] font-semibold">
          {type.toUpperCase()} number
        </label>
        <input
          id="candidate"
          type="text"
          value={candidate}
          onChange={(event) => setCandidate(mask(event.target.value))}
          inputMode="numeric"
          maxLength={type === "cpf" ? 14 : 18}
          autoComplete="off"
          spellCheck={false}
          placeholder={type === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
          className={`${FIELD} min-h-12`}
        />
        <p
          aria-live="polite"
          className={`min-h-6 text-[15px] font-semibold ${
            candidateIsValid ? "text-accent-soft" : "text-danger"
          }`}
        >
          {trimmed === ""
            ? ""
            : candidateIsValid
              ? `Valid ${type.toUpperCase()}.`
              : `Invalid ${type.toUpperCase()}.`}
        </p>
      </section>
    </div>
  );
}
