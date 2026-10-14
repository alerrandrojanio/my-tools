import { ToolPage, toolMetadata } from "@/components/tool-page";
import { PngToPdfConverter } from "@/components/tools/png-to-pdf-converter";

export function generateMetadata() {
  return toolMetadata("png-to-pdf");
}

export default function PngToPdfConverterPage() {
  return (
    <ToolPage slug="png-to-pdf">
      <PngToPdfConverter />
    </ToolPage>
  );
}
