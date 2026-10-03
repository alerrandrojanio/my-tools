import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPageHeader } from "@/components/tool-page-header";
import { Base64ToFile } from "@/components/tools/base64-to-file";
import { getToolBySlug } from "@/data/tools-list";

const tool = getToolBySlug("base64-to-file");

export const metadata: Metadata = {
  title: tool?.name,
  description: tool?.description,
};

export default function Base64ToFilePage() {
  if (!tool) notFound();

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-[clamp(16px,4vw,32px)] py-[clamp(32px,5vw,56px)]">
      <ToolPageHeader title={tool.name} description={tool.description} />
      <Base64ToFile />
    </div>
  );
}
