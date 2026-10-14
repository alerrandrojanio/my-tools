import { ToolPage, toolMetadata } from "@/components/tool-page";
import { Base64Converter } from "@/components/tools/base64-converter";

export function generateMetadata() {
  return toolMetadata("base64-converter");
}

export default function Base64ConverterPage() {
  return (
    <ToolPage slug="base64-converter">
      <Base64Converter />
    </ToolPage>
  );
}
