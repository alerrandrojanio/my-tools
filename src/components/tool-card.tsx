import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Tool } from "@/types/tool";
import { ToolIcon } from "./tool-icon";

interface ToolCardProps {
  tool: Tool;
  t: Dictionary;
}

const ACTION_BASE =
  "inline-flex min-h-11 items-center self-start rounded-[10px] px-4.5 text-[15px] font-semibold";

export function ToolCard({ tool, t }: ToolCardProps) {
  const { name, description } = t.tools[tool.slug];

  return (
    <article className="flex flex-col gap-4.5 rounded-2xl border border-line bg-surface p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.45)]">
      <div className="flex size-12 items-center justify-center rounded-xl bg-accent-tint text-accent-icon">
        <ToolIcon name={tool.icon} />
      </div>

      <div className="flex grow flex-col gap-1.5">
        <h3 className="text-lg font-bold">{name}</h3>
        <p className="text-[15px] leading-[1.55] text-muted">{description}</p>
      </div>

      {tool.available ? (
        <Link
          href={tool.href}
          aria-label={t.toolCard.accessLabel(name)}
          className={`${ACTION_BASE} bg-accent text-white transition hover:brightness-90`}
        >
          {t.toolCard.access}
        </Link>
      ) : (
        <span className={`${ACTION_BASE} border border-line-strong text-muted`}>
          {t.toolCard.comingSoon}
        </span>
      )}
    </article>
  );
}
