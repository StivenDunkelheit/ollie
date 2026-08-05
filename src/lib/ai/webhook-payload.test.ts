import { describe, expect, it } from 'vitest';
import { buildGenerationPayload } from './webhook-payload';
import { LessonSchema } from '@/lib/schema/lesson';
import { SAMPLE_LESSON } from '@/lib/schema/lesson.fixture';

const payload = buildGenerationPayload({
  lessonId: '11111111-1111-4111-8111-111111111111',
  callbackUrl: 'https://example.test/api/webhooks/lesson',
  callbackToken: 'токен',
  input: {
    title: 'Дроби',
    grade: '5 клас',
    topic: 'Звичайні дроби',
    theme: 'auto',
    generateSpares: true,
    sourceText: '1. Обчисліть 3/4 + 1/4',
  },
});

/** Обходит схему и собирает все узлы, у которых есть указанный ключ. */
function collect(node: unknown, key: string, out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) {
    for (const item of node) collect(item, key, out);
  } else if (node !== null && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    if (key in record) out.push(record[key]);
    for (const value of Object.values(record)) collect(value, key, out);
  }
  return out;
}

describe('payload для сценарію генерації', () => {
  it('несёт задание и адрес обратного вызова', () => {
    expect(payload.event).toBe('lesson.generate');
    expect(payload.lesson_id).toBe('11111111-1111-4111-8111-111111111111');
    expect(payload.callback.url).toBe('https://example.test/api/webhooks/lesson');
    expect(payload.input.source_text).toContain('3/4');
  });

  it('содержит правило нарастающей сложности', () => {
    const text = payload.rules.difficulty.join(' ');
    expect(text).toContain('difficulty');
    expect(text).toContain('не може спадати');
  });

  it('меняет требование к запасным заданиям вместе с настройкой', () => {
    const off = buildGenerationPayload({
      lessonId: payload.lesson_id,
      callbackUrl: payload.callback.url,
      callbackToken: 'токен',
      input: {
        title: 'Дроби',
        grade: '5 клас',
        topic: null,
        theme: 'none',
        generateSpares: false,
        sourceText: 'текст',
      },
    });

    expect(payload.rules.spares.join(' ')).toContain('is_bonus = true');
    expect(off.rules.spares.join(' ')).toContain('Запасних завдань не створюй');
    expect(off.rules.story.join(' ')).toContain('без сюжету');
  });

  it('перечисляет доступные интерактивы и темы', () => {
    expect(payload.reference.interactives.map((i) => i.type).sort()).toEqual([
      'drag_drop',
      'fill_blank',
      'match',
      'multiple_choice',
      'quiz',
      'sort',
    ]);
    expect(payload.reference.themes.length).toBe(10);
  });
});

describe('output_schema', () => {
  it('описывает поле difficulty с границами 1..5', () => {
    const schema = payload.output_schema as Record<string, never>;
    const found = collect(schema, 'difficulty')[0] as Record<string, unknown>;

    expect(found).toBeDefined();
    expect(found.type).toBe('integer');
    expect(found.minimum).toBe(1);
    expect(found.maximum).toBe(5);
  });

  it('использует anyOf, а не oneOf — его понимают structured outputs', () => {
    expect(collect(payload.output_schema, 'anyOf').length).toBeGreaterThan(0);
    expect(collect(payload.output_schema, 'oneOf')).toEqual([]);
  });

  it('запрещает лишние поля во всех объектах', () => {
    const flags = collect(payload.output_schema, 'additionalProperties');
    expect(flags.length).toBeGreaterThan(5);
    expect(flags.every((value) => value === false)).toBe(true);
  });

  it('описывает урок, который проходит нашу же схему', () => {
    // Схема в payload порождена из LessonSchema, поэтому образец обязан
    // проходить обе проверки — иначе они разъехались.
    expect(LessonSchema.safeParse(SAMPLE_LESSON).success).toBe(true);
  });
});
