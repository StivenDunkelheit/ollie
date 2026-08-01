import { describe, expect, it } from 'vitest';
import { LessonSchema, type Interactive } from '@/lib/schema/lesson';
import { SAMPLE_LESSON } from '@/lib/schema/lesson.fixture';
import { sanitizeBlock, sanitizeInteractive } from './index';

/** Ключи, которых не должно быть ни на одном уровне публичной выдачи. */
const FORBIDDEN_KEYS = [
  'correct_id',
  'correct_ids',
  'correct_order',
  'pairs',
  'placement',
  'accepted',
  'blanks',
  'explanation',
  'is_bonus',
];

/**
 * Точный набор ключей публичной версии каждого интерактива.
 *
 * Это и есть основная гарантия: сравнение по белому списку ловит и забытое
 * приватное поле, и потерянное публичное. Проверять «нет ли в выдаче текста
 * правильного ответа» бессмысленно — короткий ответ вроде «1/2» законно
 * зустрічається в умові задачі й у варіантах інших завдань.
 */
const PUBLIC_KEYS: Record<Interactive['type'], string[]> = {
  quiz: ['type', 'question', 'options'],
  // correct_count публичен намеренно: ученик должен знать, сколько выбрать.
  multiple_choice: ['type', 'question', 'options', 'correct_count'],
  fill_blank: ['type', 'text', 'blank_ids'],
  match: ['type', 'instruction', 'left', 'right'],
  sort: ['type', 'instruction', 'items'],
  drag_drop: ['type', 'instruction', 'items', 'zones'],
};

function walk(value: unknown, visit: (key: string, value: unknown) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      visit(key, child);
      walk(child, visit);
    }
  }
}

/** Все интерактивы урока, включая раунды боса и вопросы финального квиза. */
function allInteractives(): Interactive[] {
  const out: Interactive[] = [];
  for (const block of SAMPLE_LESSON.blocks) {
    if (block.kind === 'task') out.push(block.interactive);
    if (block.kind === 'boss') out.push(...(block.rounds as Interactive[]));
    if (block.kind === 'final_quiz') out.push(...(block.questions as Interactive[]));
  }
  return out;
}

describe('фикстура урока', () => {
  it('соответствует LessonSchema', () => {
    const result = LessonSchema.safeParse(SAMPLE_LESSON);
    expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
  });

  it('покрывает все шесть типов интерактивов', () => {
    const types = new Set(allInteractives().map((i) => i.type));
    expect([...types].sort()).toEqual([
      'drag_drop',
      'fill_blank',
      'match',
      'multiple_choice',
      'quiz',
      'sort',
    ]);
  });
});

describe('sanitizeInteractive', () => {
  it('оставляет ровно те ключи, что перечислены в белом списке', () => {
    for (const interactive of allInteractives()) {
      const published = sanitizeInteractive(interactive);
      expect(Object.keys(published).sort(), `тип ${interactive.type}`).toEqual(
        [...PUBLIC_KEYS[interactive.type]].sort(),
      );
    }
  });

  it('не отдаёт пояснение к ответу', () => {
    const withExplanation = allInteractives().find(
      (i) => 'explanation' in i && typeof i.explanation === 'string',
    );
    expect(withExplanation, 'у фікстурі має бути завдання з explanation').toBeDefined();

    const explanation = (withExplanation as { explanation: string }).explanation;
    expect(JSON.stringify(sanitizeInteractive(withExplanation!))).not.toContain(explanation);
  });
});

describe('sanitizeBlock', () => {
  const publicBlocks = SAMPLE_LESSON.blocks.map(sanitizeBlock);

  it('не оставляет ни одного приватного ключа', () => {
    const found: string[] = [];
    walk(publicBlocks, (key) => {
      if (FORBIDDEN_KEYS.includes(key)) found.push(key);
    });
    expect(found).toEqual([]);
  });

  it('сохраняет всё, что нужно для рендера задания', () => {
    const task = publicBlocks.find((b) => b.kind === 'task' && b.interactive.type === 'quiz');
    if (task?.kind !== 'task' || task.interactive.type !== 'quiz') throw new Error('bad fixture');

    expect(task.interactive.question).toContain('3/4');
    expect(task.interactive.options).toEqual([
      { id: 'o1', text: '3/4' },
      { id: 'o2', text: '2/3' },
      { id: 'o3', text: 'Вони рівні' },
    ]);
  });

  it('раскрывает раунды боса без правильных ответов', () => {
    const boss = publicBlocks.find((b) => b.kind === 'boss');
    if (boss?.kind !== 'boss') throw new Error('bad fixture');

    expect(boss.hp).toBe(3);
    expect(boss.rounds).toHaveLength(3);

    const serialized = JSON.stringify(boss.rounds);
    expect(serialized).not.toContain('correct_id');
    expect(serialized).not.toContain('correct_ids');
    expect(serialized).not.toContain('accepted');
  });

  it('не сообщает ученику, что задание запасное', () => {
    const bonus = SAMPLE_LESSON.blocks.find((b) => b.kind === 'task' && b.is_bonus);
    expect(bonus).toBeDefined();
    expect(JSON.stringify(sanitizeBlock(bonus!))).not.toContain('is_bonus');
  });
});
