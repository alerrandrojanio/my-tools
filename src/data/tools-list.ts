import type { Tool, ToolCategory, ToolCategoryId } from "@/types/tool";

export const categories: readonly ToolCategory[] = [
  {
    id: "text-and-data",
    title: "Text and Data",
    description: "Encode, count and generate text.",
  },
  {
    id: "images-and-colors",
    title: "Images and Colors",
    description: "Convert files, make codes and work with color values.",
  },
  {
    id: "development-and-data",
    title: "Development and Data",
    description: "Helpers for developers, testers and data work.",
  },
];

export const tools: readonly Tool[] = [
  // Text and Data
  {
    slug: "base64-converter",
    name: "Base64 to String Converter",
    description:
      "Decode Base64 into readable text, or encode any string back to Base64.",
    categoryId: "text-and-data",
    icon: "swap",
    href: "/tools/base64-converter",
    available: true,
  },
  {
    slug: "word-counter",
    name: "Word Counter",
    description:
      "Count words, characters, sentences and paragraphs as you type.",
    categoryId: "text-and-data",
    icon: "text-lines",
    href: "/tools/word-counter",
    available: true,
  },
  {
    slug: "password-generator",
    name: "Password Generator",
    description:
      "Create strong random passwords with the length and characters you choose.",
    categoryId: "text-and-data",
    icon: "lock",
    href: "/tools/password-generator",
    available: true,
  },

  // Images and Colors
  {
    slug: "png-to-pdf",
    name: "PNG to PDF Converter",
    description:
      "Turn one or more PNG images into a single, shareable PDF file.",
    categoryId: "images-and-colors",
    icon: "file",
    href: "/tools/png-to-pdf",
    available: true,
  },
  {
    slug: "qr-code-generator",
    name: "QR Code Generator",
    description:
      "Generate a QR code for any link or text and download it as an image.",
    categoryId: "images-and-colors",
    icon: "qr-code",
    href: "/tools/qr-code-generator",
    available: false,
  },
  {
    slug: "color-converter",
    name: "Color Converter",
    description:
      "Convert colors between HEX, RGB and HSL, with a live preview.",
    categoryId: "images-and-colors",
    icon: "droplet",
    href: "/tools/color-converter",
    available: false,
  },

  // Development and Data
  {
    slug: "json-formatter",
    name: "JSON Formatter & Validator",
    description:
      "Pretty-print, minify and validate JSON, with clear error messages.",
    categoryId: "development-and-data",
    icon: "braces",
    href: "/tools/json-formatter",
    available: true,
  },
  {
    slug: "url-shortener",
    name: "URL Shortener",
    description: "Turn long links into short ones that are easy to share.",
    categoryId: "development-and-data",
    icon: "link",
    href: "/tools/url-shortener",
    available: true,
  },
  {
    slug: "cpf-cnpj-generator",
    name: "CPF/CNPJ Generator",
    description:
      "Generate valid-format CPF and CNPJ numbers for testing and development.",
    categoryId: "development-and-data",
    icon: "id-card",
    href: "/tools/cpf-cnpj-generator",
    available: true,
  },
];

export function getToolsByCategory(categoryId: ToolCategoryId): Tool[] {
  return tools.filter((tool) => tool.categoryId === categoryId);
}

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}
