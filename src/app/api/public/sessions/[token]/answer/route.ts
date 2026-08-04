import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadSessionByToken } from '@/lib/public-session';
import { currentBlockId } from '@/lib/schema/session';
import { checkAnswer, interactiveAt } from '@/lib/interactives';
import { rateLimit } from '@/lib/rate-limit';
import type { Json } from '@/lib/supabase/types';

const BodySchema = z.object({
  block_id: z.string().min(1),
  round_index: z.number().int().min(0).max(50),
  input: z.unknown(),
});

/**
 * Проверка ответа ученика.
 *
 * Единственное место, где сверяется правильность. Ответ берётся из
 * `content_snapshot` на сервере — клиент присылает только то, что ввёл, и не
 * может подсунуть своё задание вместо настоящего.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const limit = rateLimit(`answer:${token}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Забагато запитів.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'Некоректний запит.' }, { status: 400 });
  }

  const lookup = await loadSessionByToken(token);
  if (!lookup.ok) {
    return NextResponse.json({ error: 'Сесію не знайдено.' }, { status: 404 });
  }

  const { session } = lookup;

  if (session.status !== 'active') {
    return NextResponse.json({ error: 'Урок зараз не активний.' }, { status: 409 });
  }
  if (session.state.input_locked) {
    return NextResponse.json({ error: 'Введення заблоковано викладачем.' }, { status: 409 });
  }

  // Отвечать можно только на тот блок, который сейчас открыт викладачем.
  if (body.data.block_id !== currentBlockId(session.state)) {
    return NextResponse.json({ error: 'Це завдання вже не активне.' }, { status: 409 });
  }

  const block = session.lesson.blocks.find((b) => b.id === body.data.block_id);
  const interactive = block ? interactiveAt(block, body.data.round_index) : null;
  if (!interactive) {
    return NextResponse.json({ error: 'Завдання не знайдено.' }, { status: 404 });
  }

  const outcome = checkAnswer(interactive, body.data.input);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from('attempts').insert({
    session_id: session.id,
    // Раунды боса и вопросы квиза различаем суффиксом.
    block_id: `${body.data.block_id}:${body.data.round_index}`,
    answer: (body.data.input ?? null) as Json,
    is_correct: outcome.result.correct,
    score: outcome.result.score,
  });

  return NextResponse.json(outcome.result, { headers: { 'Cache-Control': 'no-store' } });
}
