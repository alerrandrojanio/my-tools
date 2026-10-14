import { ToolPage, toolMetadata } from "@/components/tool-page";
import { MarketQuotes } from "@/components/tools/market-quotes";

export function generateMetadata() {
  return toolMetadata("market-quotes");
}

export default function MarketQuotesPage() {
  return (
    <ToolPage slug="market-quotes">
      <MarketQuotes />
    </ToolPage>
  );
}
