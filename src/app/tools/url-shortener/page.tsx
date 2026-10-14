import { ToolPage, toolMetadata } from "@/components/tool-page";
import { UrlShortener } from "@/components/tools/url-shortener";

export function generateMetadata() {
  return toolMetadata("url-shortener");
}

export default function UrlShortenerPage() {
  return (
    <ToolPage slug="url-shortener">
      <UrlShortener />
    </ToolPage>
  );
}
