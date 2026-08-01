/**
 * Темы оформления урока.
 *
 * `auto` и `none` — не темы, а инструкции для AI: «выбери сам» и «без сюжета».
 * В сгенерированном уроке (`Lesson.theme`) их быть не может — там всегда
 * конкретная тема либо `none`.
 */

export const STORY_THEMES = [
  { slug: 'space', label: 'Космос' },
  { slug: 'pirates', label: 'Пірати' },
  { slug: 'magic', label: 'Магія' },
  { slug: 'castle', label: 'Замок' },
  { slug: 'detective', label: 'Детектив' },
  { slug: 'jungle', label: 'Джунглі' },
  { slug: 'underwater', label: 'Підводний світ' },
  { slug: 'robots', label: 'Роботи' },
  { slug: 'journey', label: 'Подорож' },
  { slug: 'lab', label: 'Наукова лабораторія' },
] as const;

export type StoryTheme = (typeof STORY_THEMES)[number]['slug'];

/**
 * Значения поля `theme` в сгенерированном уроке: конкретная тема либо `none`.
 * Отдельный кортеж нужен, чтобы z.enum получил литеральные типы — из `.map()`
 * TypeScript выводит массив, а не кортеж.
 */
export const LESSON_THEME_VALUES = [
  'space',
  'pirates',
  'magic',
  'castle',
  'detective',
  'jungle',
  'underwater',
  'robots',
  'journey',
  'lab',
  'none',
] as const;

export type LessonTheme = (typeof LESSON_THEME_VALUES)[number];

// Не даём спискам разъехаться: если добавить тему в STORY_THEMES и забыть
// про LESSON_THEME_VALUES, здесь будет ошибка компиляции.
const _everyStoryThemeIsListed: StoryTheme extends LessonTheme ? true : never = true;
void _everyStoryThemeIsListed;

/** То, что учитель выбирает в форме. */
export const THEME_CHOICES = [
  { slug: 'auto', label: 'Автоматично', hint: 'AI сам обере найкращу тему' },
  ...STORY_THEMES.map((t) => ({ slug: t.slug, label: t.label, hint: undefined })),
  { slug: 'none', label: 'Без сюжету', hint: 'Урок без історії' },
] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number]['slug'];

const labels = new Map<string, string>(THEME_CHOICES.map((t) => [t.slug, t.label]));

export function themeLabel(slug: string | null | undefined): string {
  if (!slug) return '—';
  return labels.get(slug) ?? slug;
}
