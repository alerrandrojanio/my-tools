import { describe, expect, it } from "vitest";
import {
  formatCnpj,
  formatCpf,
  generateCnpj,
  generateCpf,
  isValidCnpj,
  isValidCpf,
  maskCnpj,
  maskCpf,
} from "./cpf-cnpj-utils";

describe("isValidCpf", () => {
  it("accepts known valid CPFs, with or without mask", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("rejects wrong check digits", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("529.982.247-35")).toBe(false);
  });

  it("rejects repeated digits and wrong lengths", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("000.000.000-00")).toBe(false);
    expect(isValidCpf("529.982.247")).toBe(false);
    expect(isValidCpf("")).toBe(false);
  });
});

describe("isValidCnpj", () => {
  it("accepts known valid CNPJs, with or without mask", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000181")).toBe(true);
  });

  it("rejects wrong check digits, repeated digits and wrong lengths", () => {
    expect(isValidCnpj("11.222.333/0001-80")).toBe(false);
    expect(isValidCnpj("11.111.111/1111-11")).toBe(false);
    expect(isValidCnpj("11.222.333/0001")).toBe(false);
  });
});

describe("generateCpf", () => {
  it("always generates valid CPFs", () => {
    for (let i = 0; i < 1000; i++) {
      expect(isValidCpf(generateCpf())).toBe(true);
      expect(isValidCpf(generateCpf(false))).toBe(true);
    }
  });

  it("formats according to the flag", () => {
    expect(generateCpf(true)).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
    expect(generateCpf(false)).toMatch(/^\d{11}$/);
  });
});

describe("generateCnpj", () => {
  it("always generates valid CNPJs", () => {
    for (let i = 0; i < 1000; i++) {
      expect(isValidCnpj(generateCnpj())).toBe(true);
      expect(isValidCnpj(generateCnpj(false))).toBe(true);
    }
  });

  it("formats according to the flag and uses branch 0001", () => {
    expect(generateCnpj(true)).toMatch(/^\d{2}\.\d{3}\.\d{3}\/0001-\d{2}$/);
    expect(generateCnpj(false)).toMatch(/^\d{8}0001\d{2}$/);
  });
});

describe("formatting", () => {
  it("formats complete digit strings", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
});

describe("maskCpf (typing)", () => {
  it.each([
    ["", ""],
    ["1", "1"],
    ["123", "123"],
    ["1234", "123.4"],
    ["1234567", "123.456.7"],
    ["1234567890", "123.456.789-0"],
    ["12345678901", "123.456.789-01"],
  ])("masks %j as %j", (input, expected) => {
    expect(maskCpf(input)).toBe(expected);
  });

  it("drops non-digits, ignores extra digits and is idempotent", () => {
    expect(maskCpf("abc529.982.247-25xyz")).toBe("529.982.247-25");
    expect(maskCpf("123456789012345")).toBe("123.456.789-01");
    expect(maskCpf(maskCpf("52998224725"))).toBe("529.982.247-25");
  });
});

describe("maskCnpj (typing)", () => {
  it.each([
    ["", ""],
    ["12", "12"],
    ["123", "12.3"],
    ["12345678", "12.345.678"],
    ["123456789", "12.345.678/9"],
    ["123456780001", "12.345.678/0001"],
    ["1234567800019", "12.345.678/0001-9"],
    ["12345678000195", "12.345.678/0001-95"],
  ])("masks %j as %j", (input, expected) => {
    expect(maskCnpj(input)).toBe(expected);
  });

  it("ignores extra digits and is idempotent", () => {
    expect(maskCnpj("1234567800019599")).toBe("12.345.678/0001-95");
    expect(maskCnpj(maskCnpj("11222333000181"))).toBe("11.222.333/0001-81");
  });
});
