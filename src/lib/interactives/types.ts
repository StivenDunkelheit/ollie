import type { z } from 'zod';
import type { Interactive } from '@/lib/schema/lesson';

export interface CheckResult {
  correct: boolean;
  /** 0..1. Частичный балл там, где он осмыслен (несколько правильных элементов). */
  score: number;
}

/**
 * Описание одного типа интерактива.
 *
 * `check` вызывается ТОЛЬКО на сервере — он видит правильные ответы.
 * `sanitize` собирает публичный объект «с нуля» (whitelist), а не удаляет поля
 * из исходного: так добавленное в схему приватное поле не утечёт по забывчивости.
 */
export interface InteractiveDef<
  T extends Interactive = Interactive,
  Input = unknown,
  Public = unknown,
> {
  type: T['type'];
  /** Схема того, что присылает клиент ученика. */
  inputSchema: z.ZodType<Input>;
  check(interactive: T, input: Input): CheckResult;
  sanitize(interactive: T): Public;
  /** Попадает в системный промпт как описание доступного компонента. */
  aiDescription: string;
}

export const CORRECT: CheckResult = { correct: true, score: 1 };
export const WRONG: CheckResult = { correct: false, score: 0 };

export function partial(score: number): CheckResult {
  return { correct: score >= 1, score };
}
