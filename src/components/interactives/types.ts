import type { CheckResult } from '@/lib/interactives';

/**
 * Единый контракт компонента интерактива.
 *
 * Компонент получает ТОЛЬКО публичную версию задания и ничего не знает о
 * правильном ответе. Проверку делает сервер, сюда приходит уже готовый
 * `result`, а `revealed` — то, что викладач явно вирішив показати.
 */
export interface InteractiveProps<Public, Input, Revealed = unknown> {
  interactive: Public;
  /** Текущий ответ ученика. null — ещё не отвечал. */
  value: Input | null;
  onChange: (value: Input) => void;
  /** Ввод заблокирован: ответ принят, пауза или урок ведёт викладач. */
  disabled: boolean;
  /** Результат проверки с сервера. null — ещё не проверяли. */
  result: CheckResult | null;
  /** Правильный ответ, если викладач натиснув «Показати відповідь». */
  revealed: Revealed | null;
}

/** Пустой ответ — с ним кнопку «Перевірити» жмякать нет смысла. */
export function isEmptyAnswer(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    const values = Object.values(value as Record<string, unknown>);
    if (values.length === 0) return true;
    return values.every((v) => isEmptyAnswer(v));
  }
  if (typeof value === 'string') return value.trim() === '';
  return false;
}
