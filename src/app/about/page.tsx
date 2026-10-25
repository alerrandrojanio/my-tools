import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ToolIcon } from "@/components/tool-icon";
import { tools } from "@/data/tools-list";
import type { Dictionary } from "@/i18n/dictionaries";
import { getTranslations } from "@/i18n/server";

type TechId = keyof Dictionary["about"]["tech"];

/** Product names stay the same in every language; what each one does is translated. */
const TECHNOLOGIES: readonly { id: TechId; name: string }[] = [
  { id: "next", name: "Next.js 16" },
  { id: "react", name: "React 19" },
  { id: "typescript", name: "TypeScript" },
  { id: "tailwind", name: "Tailwind CSS 4" },
  { id: "webApis", name: "Web APIs" },
  { id: "pdfLib", name: "pdf-lib" },
  { id: "pdfmake", name: "pdfmake" },
  { id: "marked", name: "marked + DOMPurify" },
  { id: "redis", name: "Redis" },
  { id: "webPush", name: "Web Push" },
  { id: "telegram", name: "Telegram Bot API" },
  { id: "yahoo", name: "Yahoo Finance" },
  { id: "actions", name: "GitHub Actions" },
  { id: "vitest", name: "Vitest" },
  { id: "biome", name: "Biome" },
];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t.about.title, description: t.about.description };
}

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2
          id={id}
          className="text-[clamp(22px,2.4vw,28px)] font-extrabold tracking-[-0.015em]"
        >
          {title}
        </h2>
        <p className="max-w-[720px] text-base leading-relaxed text-muted">
          {intro}
        </p>
      </div>
      {children}
    </section>
  );
}

function ServerCard({
  name,
  href,
  sends,
  stores,
  t,
}: {
  name: string;
  href: string;
  sends: string;
  stores: string;
  t: Dictionary;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-lg font-bold">
        <Link href={href} className="hover:text-accent-soft">
          {name}
        </Link>
      </h3>
      <dl className="flex flex-col gap-3 text-[15px] leading-[1.55]">
        <div className="flex flex-col gap-1">
          <dt className="font-semibold">{t.about.sends}</dt>
          <dd className="text-muted">{sends}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-semibold">{t.about.stores}</dt>
          <dd className="text-muted">{stores}</dd>
        </div>
      </dl>
    </article>
  );
}

export default async function AboutPage() {
  const { t } = await getTranslations();
  const available = tools.filter((tool) => tool.available);
  const browserTools = available.filter((tool) => tool.runsOn === "browser");
  const server = t.about.server;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-[clamp(40px,6vw,64px)] px-[clamp(16px,4vw,32px)] py-[clamp(32px,5vw,56px)]">
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.02em]">
          {t.about.title}
        </h1>
        <p className="max-w-[720px] text-[clamp(16px,1.4vw,18px)] leading-relaxed text-muted">
          {t.about.intro}
        </p>
      </div>

      <Section
        id="about-browser"
        title={t.about.browserTitle}
        intro={t.about.browserIntro}
      >
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
          {browserTools.map((tool) => (
            <li key={tool.slug} className="min-w-0">
              <Link
                href={tool.href}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 transition hover:bg-surface-hover"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-tint text-accent-icon">
                  <ToolIcon name={tool.icon} size={20} />
                </span>
                <span
                  className="min-w-0 truncate text-[15px] font-semibold"
                  title={t.tools[tool.slug].name}
                >
                  {t.tools[tool.slug].name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="about-server"
        title={t.about.serverTitle}
        intro={t.about.serverIntro}
      >
        <div className="grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5">
          <ServerCard
            name={t.tools["url-shortener"].name}
            href="/tools/url-shortener"
            {...server["url-shortener"]}
            t={t}
          />
          <ServerCard
            name={t.tools["market-quotes"].name}
            href="/tools/market-quotes"
            {...server["market-quotes"]}
            t={t}
          />
          <ServerCard
            name={server.alerts.name}
            href="/tools/market-quotes"
            sends={server.alerts.sends}
            stores={server.alerts.stores}
            t={t}
          />
        </div>
      </Section>

      <Section
        id="about-local"
        title={t.about.localTitle}
        intro={t.about.localIntro}
      >
        <ul className="flex max-w-[720px] list-disc flex-col gap-2 pl-6 text-[15px] leading-relaxed text-muted">
          <li>{t.about.localLanguage}</li>
          <li>{t.about.localAlerts}</li>
        </ul>
      </Section>

      <Section
        id="about-tech"
        title={t.about.techTitle}
        intro={t.about.techIntro}
      >
        <dl className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
          {TECHNOLOGIES.map(({ id, name }) => (
            <div
              key={id}
              className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-4 py-3"
            >
              <dt className="font-mono text-[14px] font-semibold text-accent-soft">
                {name}
              </dt>
              <dd className="text-[15px] leading-[1.5] text-muted">
                {t.about.tech[id]}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
