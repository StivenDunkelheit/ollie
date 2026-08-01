import type { Block, Interactive, QuickInteractive } from '@/lib/schema/lesson';
import type { CheckResult } from './types';

import { quizDef, type PublicQuiz, type QuizInput } from './quiz';
import {
  multipleChoiceDef,
  type MultipleChoiceInput,
  type PublicMultipleChoice,
} from './multiple-choice';
import { fillBlankDef, type FillBlankInput, type PublicFillBlank } from './fill-blank';
import { matchDef, type MatchInput, type PublicMatch } from './match';
import { sortDef, type PublicSort, type SortInput } from './sort';
import { dragDropDef, type DragDropInput, type PublicDragDrop } from './drag-drop';

export type { CheckResult } from './types';
export type { PublicQuiz, PublicMultipleChoice, PublicFillBlank, PublicMatch, PublicSort, PublicDragDrop };

export type PublicInteractive =
  | PublicQuiz
  | PublicMultipleChoice
  | PublicFillBlank
  | PublicMatch
  | PublicSort
  | PublicDragDrop;

export type InteractiveInput =
  | QuizInput
  | MultipleChoiceInput
  | FillBlankInput
  | MatchInput
  | SortInput
  | DragDropInput;

const defs = [
  quizDef,
  multipleChoiceDef,
  fillBlankDef,
  matchDef,
  sortDef,
  dragDropDef,
] as const;

export const INTERACTIVE_TYPES = defs.map((d) => d.type);

/**
 * Убирает из интерактива всё, чего ученик видеть не должен.
 *
 * Публичный объект собирается с нуля по белому списку полей — новое приватное
 * поле в схеме не утечёт из-за того, что его забыли удалить.
 */
export function sanitizeInteractive(interactive: Interactive): PublicInteractive {
  switch (interactive.type) {
    case 'quiz':
      return quizDef.sanitize(interactive);
    case 'multiple_choice':
      return multipleChoiceDef.sanitize(interactive);
    case 'fill_blank':
      return fillBlankDef.sanitize(interactive);
    case 'match':
      return matchDef.sanitize(interactive);
    case 'sort':
      return sortDef.sanitize(interactive);
    case 'drag_drop':
      return dragDropDef.sanitize(interactive);
  }
}

/**
 * Проверяет ответ ученика. Вызывать только на сервере — функция видит
 * правильные ответы.
 */
export function checkAnswer(
  interactive: Interactive,
  rawInput: unknown,
): { ok: true; result: CheckResult } | { ok: false; error: string } {
  const def = (() => {
    switch (interactive.type) {
      case 'quiz':
        return quizDef;
      case 'multiple_choice':
        return multipleChoiceDef;
      case 'fill_blank':
        return fillBlankDef;
      case 'match':
        return matchDef;
      case 'sort':
        return sortDef;
      case 'drag_drop':
        return dragDropDef;
    }
  })();

  const parsed = def.inputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: 'Некоректний формат відповіді.' };

  // Сужение по type уже выполнено выше — вызываем через общий контракт.
  const check = def.check as (i: Interactive, input: unknown) => CheckResult;
  return { ok: true, result: check(interactive, parsed.data) };
}

// ---------------------------------------------------------------- показ ответа

/**
 * Правильный ответ в форме, пригодной для отрисовки.
 *
 * Строится только когда викладач явно натиснув «Показати відповідь» — до этого
 * момента ничего из перечисленного в браузер ученика не попадает.
 */
export type RevealedAnswer =
  | { type: 'quiz'; correct_id: string }
  | { type: 'multiple_choice'; correct_ids: string[] }
  | { type: 'fill_blank'; values: Record<string, string> }
  | { type: 'match'; pairs: { left_id: string; right_id: string }[] }
  | { type: 'sort'; order: string[] }
  | { type: 'drag_drop'; placement: { item_id: string; zone_id: string }[] };

export function revealAnswer(interactive: Interactive): RevealedAnswer {
  switch (interactive.type) {
    case 'quiz':
      return { type: 'quiz', correct_id: interactive.correct_id };
    case 'multiple_choice':
      return { type: 'multiple_choice', correct_ids: interactive.correct_ids };
    case 'fill_blank':
      return {
        type: 'fill_blank',
        // Показываем первый принимаемый вариант — он канонический.
        values: Object.fromEntries(interactive.blanks.map((b) => [b.id, b.accepted[0]])),
      };
    case 'match':
      return { type: 'match', pairs: interactive.pairs };
    case 'sort':
      return { type: 'sort', order: interactive.correct_order };
    case 'drag_drop':
      return { type: 'drag_drop', placement: interactive.placement };
  }
}

// ---------------------------------------------------------------- блоки

export type PublicBlock =
  | { kind: 'intro'; id: string; title: string; subtitle: string | null }
  | { kind: 'story'; id: string; text: string }
  | {
      kind: 'task';
      id: string;
      title: string | null;
      timer_sec: number | null;
      interactive: PublicInteractive;
    }
  | { kind: 'reward'; id: string; title: string; text: string; icon: string }
  | {
      kind: 'boss';
      id: string;
      title: string;
      intro: string | null;
      hp: number;
      timer_sec: number | null;
      rounds: PublicInteractive[];
    }
  | { kind: 'final_quiz'; id: string; title: string; questions: PublicInteractive[] }
  | { kind: 'stats'; id: string; title: string }
  | { kind: 'finish'; id: string; title: string; text: string };

/** Публичная версия блока: то единственное, что уходит в браузер ученика. */
export function sanitizeBlock(block: Block): PublicBlock {
  switch (block.kind) {
    case 'intro':
      return { kind: 'intro', id: block.id, title: block.title, subtitle: block.subtitle };
    case 'story':
      return { kind: 'story', id: block.id, text: block.text };
    case 'task':
      return {
        kind: 'task',
        id: block.id,
        title: block.title,
        timer_sec: block.timer_sec,
        // is_bonus намеренно не отдаём: ученик не должен отличать запасное задание.
        interactive: sanitizeInteractive(block.interactive),
      };
    case 'reward':
      return {
        kind: 'reward',
        id: block.id,
        title: block.title,
        text: block.text,
        icon: block.icon,
      };
    case 'boss':
      return {
        kind: 'boss',
        id: block.id,
        title: block.title,
        intro: block.intro,
        hp: block.hp,
        timer_sec: block.timer_sec,
        rounds: block.rounds.map((r) => sanitizeInteractive(r as Interactive)),
      };
    case 'final_quiz':
      return {
        kind: 'final_quiz',
        id: block.id,
        title: block.title,
        questions: block.questions.map((q) => sanitizeInteractive(q as Interactive)),
      };
    case 'stats':
      return { kind: 'stats', id: block.id, title: block.title };
    case 'finish':
      return { kind: 'finish', id: block.id, title: block.title, text: block.text };
  }
}

/** Достаёт интерактив по индексу раунда — для boss и final_quiz. */
export function interactiveAt(block: Block, roundIndex: number): Interactive | null {
  switch (block.kind) {
    case 'task':
      return block.interactive;
    case 'boss':
      return (block.rounds[roundIndex] as QuickInteractive | undefined) ?? null;
    case 'final_quiz':
      return (block.questions[roundIndex] as QuickInteractive | undefined) ?? null;
    default:
      return null;
  }
}

/** Каталог компонентов для системного промпта. */
export function aiCatalog(): string {
  return defs.map((d) => `- ${d.aiDescription}`).join('\n');
}
