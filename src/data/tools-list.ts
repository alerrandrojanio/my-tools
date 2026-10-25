import type {
  Tool,
  ToolCategory,
  ToolCategoryId,
  ToolSlug,
} from "@/types/tool";

export const categories: readonly ToolCategory[] = [
  { id: "text-and-data" },
  { id: "images-and-colors" },
  { id: "development-and-data" },
  { id: "finance" },
];

export const tools: readonly Tool[] = [
  // Text and Data
  {
    slug: "base64-converter",
    categoryId: "text-and-data",
    icon: "swap",
    href: "/tools/base64-converter",
    available: true,
    runsOn: "browser",
  },
  {
    slug: "base64-to-file",
    categoryId: "text-and-data",
    icon: "download",
    href: "/tools/base64-to-file",
    available: true,
    runsOn: "browser",
  },
  {
    slug: "markdown-to-pdf",
    categoryId: "text-and-data",
    icon: "file",
    href: "/tools/markdown-to-pdf",
    available: true,
    runsOn: "browser",
  },
  {
    slug: "text-diff",
    categoryId: "text-and-data",
    icon: "diff",
    href: "/tools/text-diff",
    available: true,
    runsOn: "browser",
  },
  {
    slug: "word-counter",
    categoryId: "text-and-data",
    icon: "text-lines",
    href: "/tools/word-counter",
    available: true,
    runsOn: "browser",
  },
  {
    slug: "password-generator",
    categoryId: "text-and-data",
    icon: "lock",
    href: "/tools/password-generator",
    available: true,
    runsOn: "browser",
  },

  // Images and Colors
  {
    slug: "png-to-pdf",
    categoryId: "images-and-colors",
    icon: "file",
    href: "/tools/png-to-pdf",
    available: true,
    runsOn: "browser",
  },
  {
    slug: "pdf-compressor",
    categoryId: "images-and-colors",
    icon: "compress",
    href: "/tools/pdf-compressor",
    available: true,
    runsOn: "browser",
  },
  {
    slug: "qr-code-generator",
    categoryId: "images-and-colors",
    icon: "qr-code",
    href: "/tools/qr-code-generator",
    available: true,
    runsOn: "browser",
  },
  {
    slug: "color-converter",
    categoryId: "images-and-colors",
    icon: "droplet",
    href: "/tools/color-converter",
    available: true,
    runsOn: "browser",
  },

  // Development and Data
  {
    slug: "json-formatter",
    categoryId: "development-and-data",
    icon: "braces",
    href: "/tools/json-formatter",
    available: true,
    runsOn: "browser",
  },
  {
    slug: "url-shortener",
    categoryId: "development-and-data",
    icon: "link",
    href: "/tools/url-shortener",
    available: true,
    runsOn: "server",
  },
  {
    slug: "cpf-cnpj-generator",
    categoryId: "development-and-data",
    icon: "id-card",
    href: "/tools/cpf-cnpj-generator",
    available: true,
    runsOn: "browser",
  },

  // Finance and Markets
  {
    slug: "market-quotes",
    categoryId: "finance",
    icon: "trending-up",
    href: "/tools/market-quotes",
    available: true,
    runsOn: "server",
  },
];

export function getToolsByCategory(categoryId: ToolCategoryId): Tool[] {
  return tools.filter((tool) => tool.categoryId === categoryId);
}

export function getToolBySlug(slug: ToolSlug): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}
