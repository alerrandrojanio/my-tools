const CNPJ_WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function randomDigits(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 10));
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function allEqual(digits: readonly number[]): boolean {
  return digits.every((digit) => digit === digits[0]);
}

function toDigits(value: string): number[] {
  return [...value].map(Number);
}

function cpfCheckDigit(base: readonly number[]): number {
  // Weights start at base.length + 1 and decrease to 2.
  const sum = base.reduce(
    (total, digit, index) => total + digit * (base.length + 1 - index),
    0,
  );
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function cnpjCheckDigit(
  base: readonly number[],
  weights: readonly number[],
): number {
  const sum = base.reduce(
    (total, digit, index) => total + digit * weights[index],
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function formatCpf(digits: string): string {
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

export function formatCnpj(digits: string): string {
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

/** Generates a mathematically valid CPF (never all-equal digits). */
export function generateCpf(formatted = true): string {
  let base = randomDigits(9);
  while (allEqual(base)) base = randomDigits(9);

  const d1 = cpfCheckDigit(base);
  const d2 = cpfCheckDigit([...base, d1]);
  const digits = [...base, d1, d2].join("");

  return formatted ? formatCpf(digits) : digits;
}

/** Generates a mathematically valid CNPJ for a "headquarters" (branch 0001). */
export function generateCnpj(formatted = true): string {
  const base = [...randomDigits(8), 0, 0, 0, 1];

  const d1 = cnpjCheckDigit(base, CNPJ_WEIGHTS_1);
  const d2 = cnpjCheckDigit([...base, d1], CNPJ_WEIGHTS_2);
  const digits = [...base, d1, d2].join("");

  return formatted ? formatCnpj(digits) : digits;
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;

  const numbers = toDigits(digits);
  if (allEqual(numbers)) return false;

  const d1 = cpfCheckDigit(numbers.slice(0, 9));
  const d2 = cpfCheckDigit(numbers.slice(0, 10));
  return d1 === numbers[9] && d2 === numbers[10];
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return false;

  const numbers = toDigits(digits);
  if (allEqual(numbers)) return false;

  const d1 = cnpjCheckDigit(numbers.slice(0, 12), CNPJ_WEIGHTS_1);
  const d2 = cnpjCheckDigit(numbers.slice(0, 13), CNPJ_WEIGHTS_2);
  return d1 === numbers[12] && d2 === numbers[13];
}

/** Progressive mask for typing: keeps digits only and adds separators. */
export function maskCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

/** Progressive mask for typing a CNPJ. */
export function maskCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}
