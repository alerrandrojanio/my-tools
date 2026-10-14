export type ToolCategoryId =
  | "text-and-data"
  | "images-and-colors"
  | "development-and-data"
  | "finance";

export type ToolIconName =
  | "swap"
  | "text-lines"
  | "lock"
  | "file"
  | "qr-code"
  | "droplet"
  | "braces"
  | "link"
  | "id-card"
  | "download"
  | "trending-up";

/** Titles and descriptions live in the language files (src/i18n). */
export interface ToolCategory {
  id: ToolCategoryId;
}

export type ToolSlug =
  | "base64-converter"
  | "base64-to-file"
  | "word-counter"
  | "password-generator"
  | "png-to-pdf"
  | "qr-code-generator"
  | "color-converter"
  | "json-formatter"
  | "url-shortener"
  | "cpf-cnpj-generator"
  | "market-quotes";

/** Names and descriptions live in the language files (src/i18n). */
export interface Tool {
  slug: ToolSlug;
  categoryId: ToolCategoryId;
  icon: ToolIconName;
  href: string;
  /** Tools without a dedicated page yet are rendered as "Coming soon". */
  available: boolean;
}
