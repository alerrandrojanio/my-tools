import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPageHeader } from "@/components/tool-page-header";
import { WordCounter } from "@/components/tools/word-counter";
import { getToolBySlug } from "@/data/tools-list";

const tool = getToolBySlug("word-counter");

export const metadata: Metadata = {
  title: tool?.name,
  description: tool?.description,
};

export default function WordCounterPage() {
  if (!tool) notFound();

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-[clamp(16px,4vw,32px)] py-[clamp(32px,5vw,56px)]">
      <ToolPageHeader title={tool.name} description={tool.description} />
      <WordCounter />
    </div>
  );
}
