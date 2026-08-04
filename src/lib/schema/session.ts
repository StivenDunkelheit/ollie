import { z } from 'zod';
import type { Block, Lesson } from './lesson';

/**
 * Runtime-состояние сессии — единственный источник истины о том, что сейчас
 * происходит на уроке.
 *
 * Лежит в `sessions.state` и рассылается через Realtime. Контента здесь нет
 * намеренно: только идентификаторы и флаги. Сам блок ученик забирает с сервера
 * отдельным запросом, где он проходит санитизацию. Так правильные ответы
 * физически не могут уехать в браузер ученика вместе с состоянием.
 */
export const SessionStateSchema = z.object({
  /** Порядок прохождения: id блоков. Меняется, когда викладач ховає блок або видає запасне завдання. */
  route: z.array(z.string()),
  /** Позиция в route. */
  current_index: z.number().int().min(0),
  /** Блоки, для которых викладач натиснув «Показати відповідь». */
  revealed: z.array(z.string()),
  /** Выданные запасные задания — до этого их в route нет. */
  activated_bonus: z.array(z.string()),
  /** Ввод ученика заблокирован (пауза или решение викладача). */
  input_locked: z.boolean(),
  /** Ученику разрешено самому листать блоки. По умолчанию ведёт викладач. */
  student_nav: z.boolean(),
  /** Монотонный счётчик: клиент с меньшим значением запрашивает полное состояние. */
  seq: z.number().int().min(0),
});

export type SessionState = z.infer<typeof SessionStateSchema>;

/** Блоки, которые попадают в маршрут при старте: всё, кроме запасных заданий. */
export function initialRoute(blocks: Block[]): string[] {
  return blocks.filter((block) => !(block.kind === 'task' && block.is_bonus)).map((b) => b.id);
}

export function initialState(lesson: Lesson): SessionState {
  return {
    route: initialRoute(lesson.blocks),
    current_index: 0,
    revealed: [],
    activated_bonus: [],
    input_locked: false,
    student_nav: false,
    seq: 0,
  };
}

/** Разбирает jsonb из БД; при несовпадении со схемой возвращает null. */
export function parseSessionState(value: unknown): SessionState | null {
  const result = SessionStateSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function currentBlockId(state: SessionState): string | null {
  return state.route[state.current_index] ?? null;
}
