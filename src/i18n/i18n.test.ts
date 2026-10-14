import { describe, expect, it } from "vitest";
import { isLocale, pickLocale } from "./config";
import { getDictionary, translateError } from "./dictionaries";
import { en } from "./en";
import { pt } from "./pt";

describe("pickLocale", () => {
  it("prefers the saved cookie", () => {
    expect(pickLocale("pt", "en-US,en;q=0.9")).toBe("pt");
    expect(pickLocale("en", "pt-BR,pt;q=0.9")).toBe("en");
  });

  it("ignores an invalid cookie and follows the browser", () => {
    expect(pickLocale("fr", "pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt");
    expect(pickLocale("../x", "pt-PT")).toBe("pt");
  });

  it("respects the q-weights of Accept-Language", () => {
    expect(pickLocale(undefined, "en;q=0.4,pt-BR;q=0.9")).toBe("pt");
    expect(pickLocale(undefined, "pt;q=0.2,en-GB;q=0.8")).toBe("en");
  });

  it("skips unsupported languages and falls back to English", () => {
    expect(pickLocale(undefined, "fr-FR,de;q=0.9,pt;q=0.5")).toBe("pt");
    expect(pickLocale(undefined, "fr-FR,de;q=0.9")).toBe("en");
    expect(pickLocale(undefined, "")).toBe("en");
    expect(pickLocale(null, null)).toBe("en");
    expect(pickLocale(undefined, "garbage;;;q=x")).toBe("en");
  });

  it("validates locales", () => {
    expect(isLocale("pt")).toBe(true);
    expect(isLocale("pt-BR")).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
});

/** Every key path with the kind of value at it ("string" or "function"). */
function shape(value: unknown, prefix = ""): string[] {
  if (typeof value === "function") return [`${prefix}:function`];
  if (typeof value === "string") return [`${prefix}:string`];
  if (value instanceof RegExp || Array.isArray(value))
    return [`${prefix}:list`];
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, child]) =>
      shape(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [`${prefix}:${typeof value}`];
}

describe("dictionaries", () => {
  // Free-form maps whose keys legitimately differ between languages.
  const freeForm = /^(errors\.|market\.assetNames\.)/;

  it("Portuguese has exactly the same keys as English", () => {
    const strip = (keys: string[]) =>
      keys.filter((key) => !freeForm.test(key)).sort();
    expect(strip(shape(pt))).toEqual(strip(shape(en)));
  });

  it("has no empty texts", () => {
    for (const dict of [en, pt]) {
      for (const key of shape(dict)) {
        expect(key.endsWith(":string") ? key : "ok").not.toMatch(/^:/);
      }
    }
    const empty = (value: unknown): boolean =>
      typeof value === "string"
        ? value.trim() === ""
        : typeof value === "object" && value !== null && !Array.isArray(value)
          ? Object.values(value).some(empty)
          : false;
    expect(empty(en)).toBe(false);
    expect(empty(pt)).toBe(false);
  });

  it("formats texts with variables", () => {
    expect(en.home.badge(11, 4)).toBe("11 tools · 4 categories");
    expect(pt.home.badge(11, 4)).toBe("11 ferramentas · 4 categorias");
    expect(pt.alerts.buttonActive("Apple", 1)).toContain("1 ativo)");
    expect(pt.alerts.buttonActive("Apple", 2)).toContain("2 ativos)");
    expect(pt.json.invalid("x", 3, 1)).toBe(
      "JSON inválido (linha 3, coluna 1): x",
    );
    expect(pt.json.invalid("x")).toBe("JSON inválido: x");
  });

  it("returns the dictionary for each locale", () => {
    expect(getDictionary("en")).toBe(en);
    expect(getDictionary("pt")).toBe(pt);
  });
});

describe("translateError", () => {
  it("translates exact messages", () => {
    expect(translateError(pt, "Enter a URL.")).toBe("Digite uma URL.");
  });

  it("translates messages with variables", () => {
    expect(translateError(pt, "Length must be between 1 and 128.")).toBe(
      "O tamanho deve ficar entre 1 e 128.",
    );
    expect(translateError(pt, '"foto.png" is larger than 25 MB.')).toBe(
      '"foto.png" tem mais de 25 MB.',
    );
    expect(
      translateError(pt, "Invalid push subscription: endpoint too long."),
    ).toBe("Inscrição de push inválida: endpoint too long.");
  });

  it("leaves English and unknown messages unchanged", () => {
    expect(translateError(en, "Enter a URL.")).toBe("Enter a URL.");
    expect(translateError(pt, "Something brand new.")).toBe(
      "Something brand new.",
    );
  });
});
