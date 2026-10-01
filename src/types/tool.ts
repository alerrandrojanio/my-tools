export type ToolCategoryId =
  | "text-and-data"
  | "images-and-colors"
  | "development-and-data";

export type ToolIconName =
  | "swap"
  | "text-lines"
  | "lock"
  | "file"
  | "qr-code"
  | "droplet"
  | "braces"
  | "link"
  | "id-card";

export interface ToolCategory {
  id: ToolCategoryId;
  title: string;
  description: string;
}

export interface Tool {
  slug: string;
  name: string;
  description: string;
  categoryId: ToolCategoryId;
  icon: ToolIconName;
  href: string;
  /** Tools without a dedicated page yet are rendered as "Coming soon". */
  available: boolean;
}
