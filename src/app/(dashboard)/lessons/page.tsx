import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { LessonsTable } from './lessons-table';
import { createDemoLesson } from './actions';

export const dynamic = 'force-dynamic';

export default async function LessonsPage() {
  const supabase = await createClient();
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, title, grade, topic, theme, status, content, created_at')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-ink-900 text-xl font-semibold tracking-tight">Мої уроки</h1>
          <p className="text-ink-500 mt-1 text-sm">
            Створіть урок із тексту задач — решту зробить AI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={createDemoLesson}>
            <Button type="submit" variant="secondary" size="md">
              Демо-урок
            </Button>
          </form>
          <Link href="/lessons/new">
            <Button size="md">Створити урок</Button>
          </Link>
        </div>
      </div>

      {error ? (
        <Alert>Не вдалося завантажити уроки: {error.message}</Alert>
      ) : (
        <LessonsTable lessons={lessons ?? []} />
      )}
    </>
  );
}
