import { z } from 'zod';
import { LESSON_THEME_VALUES } from '@/lib/themes';

/**
 * Схема урока — единственный контракт между AI, БД и рендерером.
 *
 * Она же передаётся модели как structured output, поэтому здесь действуют
 * ограничения Anthropic structured outputs:
 *   • никакой рекурсии (поэтому Boss Battle — это вид блока, а не интерактив,
 *     который мог бы содержать сам себя);
 *   • `additionalProperties: false` проставляется хелпером SDK;
 *   • числовые/строковые ограничения (`.min`, `.max`) в JSON Schema не уходят,
 *     но проверяются на нашей стороне после парсинга — держим их.
 *
 * Опциональные поля объявлены через `.nullable()`, а не `.optional()`:
 * модель обязана явно вернуть `null`, и мы не спутаем «поля нет» с «модель
 * забыла его заполнить».
 */

const id = z
  .string()
  .min(1)
  .max(40)
  .describe('Короткий унікальний ідентифікатор у межах уроку, латиницею, напр. "q1", "opt-a".');

const Option = z.object({
  id,
  text: z.string().min(1).describe('Текст варіанта, який бачить учень.'),
});

// ---------------------------------------------------------------- інтерактиви

export const QuizSchema = z.object({
  type: z.literal('quiz'),
  question: z.string().min(1),
  options: z.array(Option).min(2).max(6),
  correct_id: z.string().min(1).describe('id єдиного правильного варіанта.'),
  explanation: z.string().nullable().describe('Коротке пояснення, чому відповідь правильна.'),
});

export const MultipleChoiceSchema = z.object({
  type: z.literal('multiple_choice'),
  question: z.string().min(1),
  options: z.array(Option).min(3).max(8),
  correct_ids: z.array(z.string().min(1)).min(1).describe('id усіх правильних варіантів.'),
  explanation: z.string().nullable(),
});

const Blank = z.object({
  id,
  accepted: z
    .array(z.string().min(1))
    .min(1)
    .describe('Усі прийнятні варіанти відповіді: синоніми, різні форми запису числа.'),
});

export const FillBlankSchema = z.object({
  type: z.literal('fill_blank'),
  text: z
    .string()
    .min(1)
    .describe('Текст із пропусками у вигляді {{id}}, де id — ідентифікатор із blanks.'),
  blanks: z.array(Blank).min(1).max(8),
  explanation: z.string().nullable(),
});

export const MatchSchema = z.object({
  type: z.literal('match'),
  instruction: z.string().min(1),
  left: z.array(Option).min(2).max(8),
  right: z.array(Option).min(2).max(8),
  pairs: z
    .array(z.object({ left_id: z.string().min(1), right_id: z.string().min(1) }))
    .min(2)
    .describe('Правильні пари. Кожен елемент лівої колонки має рівно одну пару.'),
});

export const SortSchema = z.object({
  type: z.literal('sort'),
  instruction: z.string().min(1),
  items: z.array(Option).min(3).max(8).describe('Елементи у перемішаному порядку.'),
  correct_order: z.array(z.string().min(1)).min(3).describe('id елементів у правильному порядку.'),
});

export const DragDropSchema = z.object({
  type: z.literal('drag_drop'),
  instruction: z.string().min(1),
  items: z.array(Option).min(2).max(10),
  zones: z.array(Option).min(2).max(5).describe('Зони, куди перетягують елементи.'),
  placement: z
    .array(z.object({ item_id: z.string().min(1), zone_id: z.string().min(1) }))
    .min(2)
    .describe('Правильний розподіл: кожен елемент у своїй зоні.'),
});

/** Швидкі типи — придатні для раундів боса і фінального квізу. */
export const QuickInteractiveSchema = z.discriminatedUnion('type', [
  QuizSchema,
  MultipleChoiceSchema,
  FillBlankSchema,
]);

export const InteractiveSchema = z.discriminatedUnion('type', [
  QuizSchema,
  MultipleChoiceSchema,
  FillBlankSchema,
  MatchSchema,
  SortSchema,
  DragDropSchema,
]);

export type Quiz = z.infer<typeof QuizSchema>;
export type MultipleChoice = z.infer<typeof MultipleChoiceSchema>;
export type FillBlank = z.infer<typeof FillBlankSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type Sort = z.infer<typeof SortSchema>;
export type DragDrop = z.infer<typeof DragDropSchema>;

export type Interactive = z.infer<typeof InteractiveSchema>;
export type QuickInteractive = z.infer<typeof QuickInteractiveSchema>;
export type InteractiveType = Interactive['type'];

// ---------------------------------------------------------------- блоки

const REWARD_ICONS = ['star', 'chest', 'medal', 'gem', 'key'] as const;

const IntroBlock = z.object({
  kind: z.literal('intro'),
  id,
  title: z.string().min(1),
  subtitle: z.string().nullable(),
});

const StoryBlock = z.object({
  kind: z.literal('story'),
  id,
  text: z.string().min(1).describe('Сюжетна вставка, 1–3 речення.'),
});

const TaskBlock = z.object({
  kind: z.literal('task'),
  id,
  title: z.string().nullable(),
  timer_sec: z
    .number()
    .int()
    .min(10)
    .max(600)
    .nullable()
    .describe('Таймер лише там, де він доречний. Інакше null.'),
  is_bonus: z
    .boolean()
    .describe('true — запасне завдання: приховане, доки викладач не активує його.'),
  interactive: InteractiveSchema,
});

const RewardBlock = z.object({
  kind: z.literal('reward'),
  id,
  title: z.string().min(1),
  text: z.string().min(1),
  icon: z.enum(REWARD_ICONS),
});

const BossBlock = z.object({
  kind: z.literal('boss'),
  id,
  title: z.string().min(1),
  intro: z.string().nullable(),
  hp: z.number().int().min(2).max(10).describe('Кількість HP боса — дорівнює кількості раундів.'),
  rounds: z.array(QuickInteractiveSchema).min(2).max(10),
  timer_sec: z.number().int().min(10).max(180).nullable().describe('Таймер на кожен раунд.'),
});

const FinalQuizBlock = z.object({
  kind: z.literal('final_quiz'),
  id,
  title: z.string().min(1),
  questions: z.array(QuickInteractiveSchema).min(3).max(10),
});

const StatsBlock = z.object({
  kind: z.literal('stats'),
  id,
  title: z.string().min(1),
});

const FinishBlock = z.object({
  kind: z.literal('finish'),
  id,
  title: z.string().min(1),
  text: z.string().min(1),
});

export const BlockSchema = z.discriminatedUnion('kind', [
  IntroBlock,
  StoryBlock,
  TaskBlock,
  RewardBlock,
  BossBlock,
  FinalQuizBlock,
  StatsBlock,
  FinishBlock,
]);

export type Block = z.infer<typeof BlockSchema>;
export type BlockKind = Block['kind'];
export type TaskBlock = z.infer<typeof TaskBlock>;
export type BossBlock = z.infer<typeof BossBlock>;
export type FinalQuizBlock = z.infer<typeof FinalQuizBlock>;

/** Блоки, у яких учень щось відповідає. */
export const ANSWERABLE_KINDS = ['task', 'boss', 'final_quiz'] as const;

export function isAnswerable(
  block: Block,
): block is TaskBlock | BossBlock | FinalQuizBlock {
  return (ANSWERABLE_KINDS as readonly string[]).includes(block.kind);
}

// ---------------------------------------------------------------- урок

export const LessonSchema = z.object({
  title: z.string().min(1),
  grade: z.string().min(1),
  topic: z.string().nullable(),
  theme: z
    .enum(LESSON_THEME_VALUES)
    .describe('Обрана тема оформлення або "none", якщо урок без сюжету.'),
  story: z
    .object({
      character_name: z.string().min(1),
      intro: z.string().min(1),
      outro: z.string().min(1),
    })
    .nullable()
    .describe('null, якщо урок без сюжету.'),
  blocks: z.array(BlockSchema).min(3).max(40).describe('Блоки у порядку проходження.'),
});

export type Lesson = z.infer<typeof LessonSchema>;

/** Разбирает jsonb из БД. Возвращает null, если содержимое не соответствует схеме. */
export function parseLesson(content: unknown): Lesson | null {
  const result = LessonSchema.safeParse(content);
  return result.success ? result.data : null;
}
