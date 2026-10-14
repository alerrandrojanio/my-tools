import { ToolPage, toolMetadata } from "@/components/tool-page";
import { JsonFormatter } from "@/components/tools/json-formatter";

export function generateMetadata() {
  return toolMetadata("json-formatter");
}

export default function JsonFormatterPage() {
  return (
    <ToolPage slug="json-formatter">
      <JsonFormatter />
    </ToolPage>
  );
}
