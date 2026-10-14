import { ToolPage, toolMetadata } from "@/components/tool-page";
import { WordCounter } from "@/components/tools/word-counter";

export function generateMetadata() {
  return toolMetadata("word-counter");
}

export default function WordCounterPage() {
  return (
    <ToolPage slug="word-counter">
      <WordCounter />
    </ToolPage>
  );
}
