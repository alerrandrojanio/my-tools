import { ToolPage, toolMetadata } from "@/components/tool-page";
import { ColorConverter } from "@/components/tools/color-converter";

export function generateMetadata() {
  return toolMetadata("color-converter");
}

export default function ColorConverterPage() {
  return (
    <ToolPage slug="color-converter">
      <ColorConverter />
    </ToolPage>
  );
}
