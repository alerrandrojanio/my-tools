import Link from "next/link";
import type { Tool } from "@/types/tool";
import { ToolIcon } from "./tool-icon";

interface ToolCardProps {
  tool: Tool;
}

const ACTION_BASE =
  "inline-flex min-h-11 items-center self-start rounded-[10px] px-4.5 text-[15px] font-semibold";

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <article className="flex flex-col gap-4.5 rounded-2xl border border-line bg-surface p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.45)]">
      <div className="flex size-12 items-center justify-center rounded-xl bg-accent-tint text-accent-icon">
        <ToolIcon name={tool.icon} />
      </div>

      <div className="flex grow flex-col gap-1.5">
        <h3 className="text-lg font-bold">{tool.name}</h3>
        <p className="text-[15px] leading-[1.55] text-muted">
          {tool.description}
        </p>
      </div>

      {tool.available ? (
        <Link
          href={tool.href}
          aria-label={`Access Tool: ${tool.name}`}
          className={`${ACTION_BASE} bg-accent text-white transition hover:brightness-90`}
        >
          Access Tool
        </Link>
      ) : (
        <span className={`${ACTION_BASE} border border-line-strong text-muted`}>
          Coming soon
        </span>
      )}
    </article>
  );
}
