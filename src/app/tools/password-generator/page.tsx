import { ToolPage, toolMetadata } from "@/components/tool-page";
import { PasswordGenerator } from "@/components/tools/password-generator";

export function generateMetadata() {
  return toolMetadata("password-generator");
}

export default function PasswordGeneratorPage() {
  return (
    <ToolPage slug="password-generator">
      <PasswordGenerator />
    </ToolPage>
  );
}
