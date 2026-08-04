import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseLesson } from '@/lib/schema/lesson';
import { initialState } from '@/lib/schema/session';
import { generateSessionToken } from '@/lib/session-token';
import { originFromRequest } from '@/lib/origin';
import type { Json } from '@/lib/supabase/types';

const BodySchema = z.object({
  lesson_id: z.uuid(),
  student_name: z.string().trim().max(80).nullable().optional(),
  /** Сколько часов ссылка остаётся рабочей. */
  expires_in_hours: z.number().int().min(1).max(24 * 30).default(24),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Потрібна авторизація.' }, { status: 401 });

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }

  // RLS не отдаст чужой урок, поэтому отдельная проверка владельца не нужна.
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, content, status')
    .eq('id', body.data.lesson_id)
    .maybeSingle();

  if (!lesson) return NextResponse.json({ error: 'Урок не знайдено.' }, { status: 404 });
  if (lesson.status !== 'ready') {
    return NextResponse.json({ error: 'Урок ще не готовий.' }, { status: 409 });
  }

  const content = parseLesson(lesson.content);
  if (!content) {
    return NextResponse.json({ error: 'Вміст уроку пошкоджений.' }, { status: 422 });
  }

  const expiresAt = new Date(Date.now() + body.data.expires_in_hours * 3600_000);

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      lesson_id: lesson.id,
      token: generateSessionToken(),
      // Снимок урока: подальші правки шаблону не зачеплять це заняття.
      content_snapshot: content as unknown as Json,
      state: initialState(content) as unknown as Json,
      status: 'waiting',
      student_name: body.data.student_name ?? null,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, token, expires_at')
    .single();

  if (error || !session) {
    return NextResponse.json(
      { error: `Не вдалося створити сесію: ${error?.message ?? 'невідома помилка'}` },
      { status: 500 },
    );
  }

  const origin = originFromRequest(request);

  return NextResponse.json(
    {
      id: session.id,
      token: session.token,
      student_url: `${origin}/s/${session.token}`,
      teach_url: `/teach/${session.id}`,
      expires_at: session.expires_at,
    },
    { status: 201 },
  );
}
