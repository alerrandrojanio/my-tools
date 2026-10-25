"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-[clamp(16px,4vw,32px)] py-7">
        <p className="text-sm text-muted">
          © {new Date().getFullYear()} {t.site.name}
        </p>
        <Link href="/about" className="text-sm text-muted hover:text-ink">
          {t.site.footerNote}
        </Link>
      </div>
    </footer>
  );
}
