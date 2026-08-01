/** Приведение свободного ввода к сравнимому виду. */

const NUMERIC = /^[+-]?[\d\s ]*[.,]?\d+$/;

/**
 * Общая нормализация: убирает лишние пробелы и регистр.
 * Числа дополнительно приводятся к единому виду: `1 000,5` → `1000.5`.
 */
export function normalizeAnswer(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed === '') return '';

  if (NUMERIC.test(trimmed)) {
    return trimmed.replace(/[\s ]/g, '').replace(',', '.').replace(/^\+/, '');
  }

  return trimmed.toLocaleLowerCase('uk');
}

/** Совпадает ли ответ ученика хотя бы с одним принимаемым вариантом. */
export function matchesAny(input: string, accepted: readonly string[]): boolean {
  const normalized = normalizeAnswer(input);
  if (normalized === '') return false;
  return accepted.some((variant) => normalizeAnswer(variant) === normalized);
}

/** Доля правильных из общего числа, 0..1. */
export function ratio(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, correct / total));
}

export function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = new Set(a);
  if (left.size !== a.length) return false; // дубликаты в ответе
  return b.every((value) => left.has(value));
}
