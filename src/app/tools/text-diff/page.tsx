import { ToolPage, toolMetadata } from "@/components/tool-page";
import { TextDiff } from "@/components/tools/text-diff";

export function generateMetadata() {
  return toolMetadata("text-diff");
}

export default function TextDiffPage() {
  return (
    <ToolPage slug="text-diff" wide>
      <TextDiff />
    </ToolPage>
  );
}
