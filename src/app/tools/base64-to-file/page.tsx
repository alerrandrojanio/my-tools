import { ToolPage, toolMetadata } from "@/components/tool-page";
import { Base64ToFile } from "@/components/tools/base64-to-file";

export function generateMetadata() {
  return toolMetadata("base64-to-file");
}

export default function Base64ToFilePage() {
  return (
    <ToolPage slug="base64-to-file">
      <Base64ToFile />
    </ToolPage>
  );
}
