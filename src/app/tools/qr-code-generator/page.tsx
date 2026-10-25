import { ToolPage, toolMetadata } from "@/components/tool-page";
import { QrCodeGenerator } from "@/components/tools/qr-code-generator";

export function generateMetadata() {
  return toolMetadata("qr-code-generator");
}

export default function QrCodeGeneratorPage() {
  return (
    <ToolPage slug="qr-code-generator">
      <QrCodeGenerator />
    </ToolPage>
  );
}
