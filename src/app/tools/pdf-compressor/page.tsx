import { ToolPage, toolMetadata } from "@/components/tool-page";
import { PdfCompressor } from "@/components/tools/pdf-compressor";

export function generateMetadata() {
  return toolMetadata("pdf-compressor");
}

export default function PdfCompressorPage() {
  return (
    <ToolPage slug="pdf-compressor">
      <PdfCompressor />
    </ToolPage>
  );
}
