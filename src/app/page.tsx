import { ToolCard } from "@/components/tool-card";
import { categories, getToolsByCategory, tools } from "@/data/tools-list";

export default function HomePage() {
  return (
    <>
      <section
        aria-labelledby="hero-title"
        className="border-b border-line bg-surface"
      >
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-[22px] px-[clamp(16px,4vw,32px)] py-[clamp(56px,9vw,104px)]">
          <span className="rounded-full bg-accent-badge px-3 py-1.5 font-mono text-[13px] font-medium uppercase tracking-[0.04em] text-accent-soft">
            {tools.length} tools · {categories.length} categories
          </span>
          <h1
            id="hero-title"
            className="max-w-[780px] text-[clamp(36px,5.2vw,62px)] font-extrabold leading-[1.06] tracking-[-0.025em]"
          >
            Everyday tools, one click away.
          </h1>
          <p className="max-w-[620px] text-[clamp(17px,1.6vw,20px)] leading-[1.6] text-muted">
            Convert, format, generate and check — a growing collection of small,
            focused utilities that run right in your browser. Pick a tool and
            get the job done in seconds.
          </p>
          <a
            href="#tools"
            className="mt-1.5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-[22px] text-base font-semibold text-white transition hover:brightness-90"
          >
            Browse all tools
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </a>
        </div>
      </section>

      <div
        id="tools"
        className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-col gap-[clamp(48px,7vw,72px)] px-[clamp(16px,4vw,32px)] py-[clamp(48px,7vw,80px)]"
      >
        {categories.map((category) => {
          const categoryTools = getToolsByCategory(category.id);
          if (categoryTools.length === 0) return null;

          return (
            <section
              key={category.id}
              aria-labelledby={`cat-${category.id}`}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1.5">
                <h2
                  id={`cat-${category.id}`}
                  className="text-[clamp(24px,2.6vw,30px)] font-extrabold tracking-[-0.015em]"
                >
                  {category.title}
                </h2>
                <p className="text-base text-muted">{category.description}</p>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5">
                {categoryTools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
