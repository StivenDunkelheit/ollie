import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { LessonSchema, type Lesson } from '@/lib/schema/lesson';
import { findIntegrityIssues } from '@/lib/schema/integrity';
import { systemPrompt, userPrompt, type GenerationRequest } from './prompt';

const MODEL = 'claude-opus-5';

/** Цена Opus 5, долларов за миллион токенов. */
const PRICE = { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 };

export interface GenerationMeta {
  model: string;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
}

export type GenerationResult =
  | { ok: true; lesson: Lesson; meta: GenerationMeta }
  | { ok: false; error: string; meta: GenerationMeta | null };

function estimateCost(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}): number {
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const dollars =
    (usage.input_tokens * PRICE.input +
      usage.output_tokens * PRICE.output +
      cacheRead * PRICE.cacheRead +
      cacheWrite * PRICE.cacheWrite) /
    1_000_000;
  return Math.round(dollars * 10_000) / 10_000;
}

/**
 * Один вызов модели на весь урок.
 *
 * Стримим не ради UI, а потому что при больших max_tokens SDK иначе упирается
 * в HTTP-таймаут. Системный промпт помечен cache_control: он стабилен, и со
 * второй генерации входные токены считаются по цене чтения кэша.
 */
export async function generateLesson(request: GenerationRequest): Promise<GenerationResult> {
  const client = new Anthropic();
  const startedAt = Date.now();

  let message;
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      output_config: {
        format: zodOutputFormat(LessonSchema),
        effort: 'high',
      },
      system: [
        {
          type: 'text',
          text: systemPrompt(),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt(request) }],
    });

    message = await stream.finalMessage();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Невідома помилка виклику моделі.',
      meta: null,
    };
  }

  const meta: GenerationMeta = {
    model: message.model,
    duration_ms: Date.now() - startedAt,
    input_tokens: message.usage.input_tokens,
    output_tokens: message.usage.output_tokens,
    cache_read_tokens: message.usage.cache_read_input_tokens ?? 0,
    cache_write_tokens: message.usage.cache_creation_input_tokens ?? 0,
    cost_usd: estimateCost(message.usage),
  };

  // Проверять stop_reason нужно до чтения content: при отказе он пустой.
  if (message.stop_reason === 'refusal') {
    return { ok: false, error: 'Модель відхилила запит через правила безпеки.', meta };
  }
  if (message.stop_reason === 'max_tokens') {
    return {
      ok: false,
      error: 'Урок не вмістився в ліміт відповіді. Спробуйте менше задач за раз.',
      meta,
    };
  }

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!text.trim()) {
    return { ok: false, error: 'Модель повернула порожню відповідь.', meta };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Модель повернула невалідний JSON.', meta };
  }

  const parsed = LessonSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `Урок не відповідає схемі: ${first.path.join('.')} — ${first.message}`,
      meta,
    };
  }

  const issues = findIntegrityIssues(parsed.data);
  if (issues.length > 0) {
    return {
      ok: false,
      error: `У згенерованому уроці не сходяться посилання: ${issues.slice(0, 3).join('; ')}`,
      meta,
    };
  }

  return { ok: true, lesson: parsed.data, meta };
}
