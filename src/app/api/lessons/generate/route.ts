import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateLesson } from '@/lib/ai/generate';
import { THEME_CHOICES } from '@/lib/themes';
import type { Json } from '@/lib/supabase/types';

/** Генерация идёт в фоне после ответа, но всё ещё внутри лимита функции. */
export const maxDuration = 300;

const themeSlugs = THEME_CHOICES.map((t) => t.slug);

const BodySchema = z.object({
  title: z.string().trim().min(3).max(120),
  grade: z.string().trim().min(1).max(40),
  topic: z.string().trim().max(120).nullable(),
  theme: z.string().refine((value) => themeSlugs.includes(value as never), 'Невідома тема'),
  generate_spares: z.boolean(),
  source_text: z.string().trim().min(30, 'Замало тексту: додайте задачі.').max(60_000),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація.' }, { status: 401 });
  }

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }

  const input = body.data;

  const { data: lesson, error } = await supabase
    .from('lessons')
    .insert({
      teacher_id: user.id,
      title: input.title,
      grade: input.grade,
      topic: input.topic,
      theme: input.theme,
      status: 'generating',
      source_text: input.source_text,
      generate_spares: input.generate_spares,
    })
    .select('id')
    .single();

  if (error || !lesson) {
    return NextResponse.json(
      { error: `Не вдалося створити урок: ${error?.message ?? 'невідома помилка'}` },
      { status: 500 },
    );
  }

  // Отвечаем сразу — клиент уходит на страницу урока и опрашивает статус.
  after(async () => {
    const result = await generateLesson({
      title: input.title,
      grade: input.grade,
      topic: input.topic,
      theme: input.theme,
      generateSpares: input.generate_spares,
      sourceText: input.source_text,
    });

    // RLS-клиент здесь недоступен: пользовательский контекст уже завершён.
    const admin = createAdminClient();

    if (result.ok) {
      await admin
        .from('lessons')
        .update({
          status: 'ready',
          content: result.lesson as unknown as Json,
          ai_meta: result.meta as unknown as Json,
          error_message: null,
        })
        .eq('id', lesson.id);
    } else {
      await admin
        .from('lessons')
        .update({
          status: 'failed',
          error_message: result.error,
          ai_meta: (result.meta ?? null) as unknown as Json,
        })
        .eq('id', lesson.id);
    }
  });

  return NextResponse.json({ id: lesson.id }, { status: 202 });
}
