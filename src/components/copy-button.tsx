"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";

interface CopyButtonProps {
  text: string;
  /** Defaults to the translated "Copy". */
  label?: string;
  compact?: boolean;
}

export function CopyButton({ text, label, compact = false }: CopyButtonProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={text === ""}
      className={`inline-flex items-center rounded-[10px] bg-accent font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 ${compact ? "min-h-11 px-3.5 text-sm" : "min-h-11 px-4.5 text-[15px]"}`}
    >
      {copied ? t.common.copied : (label ?? t.common.copy)}
    </button>
  );
}
