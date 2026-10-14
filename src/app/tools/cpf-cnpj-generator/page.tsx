import { ToolPage, toolMetadata } from "@/components/tool-page";
import { CpfCnpjGenerator } from "@/components/tools/cpf-cnpj-generator";

export function generateMetadata() {
  return toolMetadata("cpf-cnpj-generator");
}

export default function CpfCnpjGeneratorPage() {
  return (
    <ToolPage slug="cpf-cnpj-generator">
      <CpfCnpjGenerator />
    </ToolPage>
  );
}
