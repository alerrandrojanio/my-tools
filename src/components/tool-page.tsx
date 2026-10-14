import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "@/i18n/server";
import type { ToolSlug } from "@/types/tool";

/** Page title and description for a tool, in the visitor's language. */
export async function toolMetadata(slug: ToolSlug): Promise<Metadata> {
  const { t } = await getTranslations();
  const { name, description } = t.tools[slug];
  return { title: name, description };
}

/** Shared frame of every tool page: back link, title, description, tool. */
export async function ToolPage({
  slug,
  children,
}: {
  slug: ToolSlug;
  children: ReactNode;
}) {
  const { t } = await getTranslations();
  const { name, description } = t.tools[slug];

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-[clamp(16px,4vw,32px)] py-[clamp(32px,5vw,56px)]">
      <div className="flex flex-col items-start gap-4">
        <Link
          href="/#tools"
          className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-accent-soft hover:text-ink"
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          {t.toolPage.back}
        </Link>
        <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.02em]">
          {name}
        </h1>
        <p className="max-w-[620px] text-[clamp(16px,1.4vw,18px)] leading-relaxed text-muted">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
