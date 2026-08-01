'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SAMPLE_LESSON } from '@/lib/schema/lesson.fixture';
import type { Json } from '@/lib/supabase/types';

/**
 * Кладёт готовый урок-образец прямо в базу, минуя генерацию.
 *
 * Нужен, чтобы разрабатывать и тестировать сессии, Teacher/Student Mode и доску
 * без вызовов AI: урок содержит все шесть интерактивов, Boss Battle, награды и
 * финальный квиз.
 */
export async function createDemoLesson() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      teacher_id: user.id,
      title: SAMPLE_LESSON.title,
      grade: SAMPLE_LESSON.grade,
      topic: SAMPLE_LESSON.topic,
      theme: SAMPLE_LESSON.theme,
      status: 'ready',
      content: SAMPLE_LESSON as unknown as Json,
      source_text: 'Демонстраційний урок — створений без генерації.',
      generate_spares: true,
    })
    .select('id')
    .single();

  if (error || !data) return;

  revalidatePath('/lessons');
  redirect(`/lessons/${data.id}`);
}

export async function deleteLesson(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const supabase = await createClient();
  // RLS не даст удалить чужой урок, дополнительная проверка не нужна.
  await supabase.from('lessons').delete().eq('id', id);
  revalidatePath('/lessons');
}

export async function duplicateLesson(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const supabase = await createClient();
  const { data: source } = await supabase.from('lessons').select('*').eq('id', id).single();
  if (!source) return;

  await supabase.from('lessons').insert({
    teacher_id: source.teacher_id,
    title: `${source.title} (копія)`,
    grade: source.grade,
    topic: source.topic,
    theme: source.theme,
    status: source.status,
    content: source.content,
    source_text: source.source_text,
    generate_spares: source.generate_spares,
    ai_meta: source.ai_meta,
  });

  revalidatePath('/lessons');
}
