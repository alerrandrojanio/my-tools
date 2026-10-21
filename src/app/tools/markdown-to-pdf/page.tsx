import { ToolPage, toolMetadata } from "@/components/tool-page";
import { MarkdownToPdf } from "@/components/tools/markdown-to-pdf";

export function generateMetadata() {
  return toolMetadata("markdown-to-pdf");
}

export default function MarkdownToPdfPage() {
  return (
    <ToolPage slug="markdown-to-pdf">
      <MarkdownToPdf />
    </ToolPage>
  );
}
