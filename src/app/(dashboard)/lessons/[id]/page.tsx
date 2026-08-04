import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseLesson } from '@/lib/schema/lesson';
import { themeLabel } from '@/lib/themes';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { GenerationProgress } from './generation-progress';
import { LessonOutline } from './lesson-outline';
import { PreviewLauncher } from './preview-launcher';
import { StartSessionButton } from './start-session';

export const dynamic = 'force-dynamic';

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: lesson } = await supabase.from('lessons').select('*').eq('id', id).maybeSingle();

  if (!lesson) notFound();

  if (lesson.status === 'generating') {
    return <GenerationProgress lessonId={lesson.id} title={lesson.title} />;
  }

  if (lesson.status === 'failed') {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-ink-900 text-xl font-semibold tracking-tight">{lesson.title}</h1>
        <div className="mt-4 space-y-4">
          <Alert>{lesson.error_message ?? 'Генерація не вдалася.'}</Alert>
          <p className="text-ink-500 text-sm">
            Вихідний текст задач збережено — можна спробувати ще раз, нічого не вводячи заново.
          </p>
          <Link href="/lessons">
            <Button variant="secondary">До списку уроків</Button>
          </Link>
        </div>
      </div>
    );
  }

  const content = parseLesson(lesson.content);

  if (!content) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-ink-900 text-xl font-semibold tracking-tight">{lesson.title}</h1>
        <div className="mt-4">
          <Alert>
            Вміст уроку не відповідає очікуваній структурі. Найімовірніше, урок створено на старій
            версії схеми — згенеруйте його заново.
          </Alert>
        </div>
      </div>
    );
  }

  const taskCount = content.blocks.filter((b) => b.kind === 'task').length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-ink-900 text-xl font-semibold tracking-tight">{content.title}</h1>
          <p className="text-ink-500 mt-1 text-sm">
            {content.grade}
            {content.topic ? ` · ${content.topic}` : ''} · {themeLabel(content.theme)} ·{' '}
            {taskCount} завдань
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PreviewLauncher lesson={content} />
          <StartSessionButton lessonId={lesson.id} />
        </div>
      </div>

      {content.story && (
        <section className="ring-ink-200 mt-6 rounded-2xl bg-white p-5 ring-1">
          <h2 className="text-ink-900 text-sm font-semibold">
            Сюжет · {content.story.character_name}
          </h2>
          <p className="text-ink-600 mt-2 text-sm">{content.story.intro}</p>
          <p className="text-ink-400 mt-2 text-sm italic">{content.story.outro}</p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-ink-900 mb-3 text-sm font-semibold">Структура уроку</h2>
        <LessonOutline blocks={content.blocks} />
      </section>
    </div>
  );
}
