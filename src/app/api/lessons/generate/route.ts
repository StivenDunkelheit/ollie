import { after, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateLesson } from '@/lib/ai/generate';
import { buildGenerationPayload } from '@/lib/ai/webhook-payload';
import { originFromRequest } from '@/lib/origin';
import { THEME_CHOICES } from '@/lib/themes';
import type { Json } from '@/lib/supabase/types';

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
  const webhookUrl = process.env.GENERATION_WEBHOOK_URL;
  const callbackToken = randomBytes(24).toString('base64url');

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
      generation_token: webhookUrl ? callbackToken : null,
      generation_started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !lesson) {
    return NextResponse.json(
      { error: `Не вдалося створити урок: ${error?.message ?? 'невідома помилка'}` },
      { status: 500 },
    );
  }

  const generationInput = {
    title: input.title,
    grade: input.grade,
    topic: input.topic,
    theme: input.theme,
    generateSpares: input.generate_spares,
    sourceText: input.source_text,
  };

  if (webhookUrl) {
    // Внешний сценарий: ставим задачу и уходим. Готовый урок придёт на
    // /api/webhooks/lesson — ждать его в этом запросе нельзя, генерация
    // занимает минуты.
    after(async () => {
      const payload = buildGenerationPayload({
        lessonId: lesson.id,
        callbackUrl: `${originFromRequest(request)}/api/webhooks/lesson`,
        callbackToken,
        input: generationInput,
      });

      const admin = createAdminClient();

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) {
          await admin
            .from('lessons')
            .update({
              status: 'failed',
              error_message: `Сценарій генерації не прийняв завдання: HTTP ${response.status}.`,
              generation_token: null,
            })
            .eq('id', lesson.id);
        }
      } catch (cause) {
        await admin
          .from('lessons')
          .update({
            status: 'failed',
            error_message: `Не вдалося звернутися до сценарію генерації: ${
              cause instanceof Error ? cause.message : 'невідома помилка'
            }`,
            generation_token: null,
          })
          .eq('id', lesson.id);
      }
    });

    return NextResponse.json({ id: lesson.id }, { status: 202 });
  }

  // Запасной путь: прямой вызов модели, если вебхук не настроен.
  after(async () => {
    const result = await generateLesson(generationInput);
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
