import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { LessonSchema } from '@/lib/schema/lesson';
import { findIntegrityIssues } from '@/lib/schema/integrity';
import { tokensMatch } from '@/lib/session-token';
import type { Json } from '@/lib/supabase/types';

/**
 * Приём готового урока от внешнего сценария генерации (Make.com).
 *
 * Единственная защита — одноразовый токен, выданный при постановке задачи:
 * авторизованной сессии здесь нет. Токен гасится сразу после приёма, поэтому
 * повторно тот же callback ничего не перезапишет.
 *
 * Урок проверяется нашей же схемой и правилами целостности: сценарию мы не
 * доверяем на слово, даже если он наш.
 */

const BodySchema = z.object({
  lesson_id: z.uuid(),
  token: z.string().min(10).max(200),
  status: z.enum(['ok', 'failed']).default('ok'),
  lesson: z.unknown().optional(),
  error: z.string().max(2000).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'Некоректний формат запиту.' }, { status: 400 });
  }

  const { lesson_id, token, status, meta } = body.data;
  const admin = createAdminClient();

  const { data: lesson } = await admin
    .from('lessons')
    .select('id, generation_token, status')
    .eq('id', lesson_id)
    .maybeSingle();

  // Один ответ на «не знайдено» и на «невірний токен»: иначе по разнице
  // ответов можно проверять, какие lesson_id существуют.
  if (!lesson?.generation_token || !tokensMatch(lesson.generation_token, token)) {
    return NextResponse.json({ error: 'Невідоме або вже виконане завдання.' }, { status: 404 });
  }

  if (status === 'failed') {
    await admin
      .from('lessons')
      .update({
        status: 'failed',
        error_message: body.data.error?.slice(0, 2000) ?? 'Сценарій генерації повернув помилку.',
        ai_meta: (meta ?? null) as Json,
        generation_token: null,
      })
      .eq('id', lesson_id);

    return NextResponse.json({ accepted: true });
  }

  const parsed = LessonSchema.safeParse(body.data.lesson);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = `Урок не відповідає схемі: ${issue.path.join('.') || '(корінь)'} — ${issue.message}`;

    await admin
      .from('lessons')
      .update({ status: 'failed', error_message: message, generation_token: null })
      .eq('id', lesson_id);

    // Сценарию сообщаем причину — её видно в истории выполнения Make.
    return NextResponse.json({ error: message, issues: parsed.error.issues }, { status: 422 });
  }

  const issues = findIntegrityIssues(parsed.data);
  if (issues.length > 0) {
    const message = `Урок не пройшов перевірку: ${issues.slice(0, 5).join('; ')}`;

    await admin
      .from('lessons')
      .update({ status: 'failed', error_message: message, generation_token: null })
      .eq('id', lesson_id);

    return NextResponse.json({ error: message, issues }, { status: 422 });
  }

  await admin
    .from('lessons')
    .update({
      status: 'ready',
      content: parsed.data as unknown as Json,
      ai_meta: (meta ?? null) as Json,
      error_message: null,
      generation_token: null,
    })
    .eq('id', lesson_id);

  return NextResponse.json({ accepted: true, lesson_id });
}
