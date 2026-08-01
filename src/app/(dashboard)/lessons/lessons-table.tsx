import Link from 'next/link';
import { createDemoLesson, deleteLesson, duplicateLesson } from './actions';
import { themeLabel } from '@/lib/themes';
import { Button } from '@/components/ui/button';
import type { Json, LessonStatus } from '@/lib/supabase/types';

interface LessonListItem {
  id: string;
  title: string;
  grade: string;
  topic: string | null;
  theme: string;
  status: LessonStatus;
  content: Json | null;
  created_at: string;
}

/** Считает интерактивные блоки, не полагаясь на форму content. */
function taskCount(content: Json | null): number | null {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null;
  const blocks = (content as Record<string, Json>).blocks;
  if (!Array.isArray(blocks)) return null;
  return blocks.filter(
    (b) => b !== null && typeof b === 'object' && !Array.isArray(b) && 'interactive' in b,
  ).length;
}

const statusBadge: Record<LessonStatus, { label: string; className: string }> = {
  generating: { label: 'Генерується', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  ready: { label: 'Готовий', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  failed: { label: 'Помилка', className: 'bg-red-50 text-red-700 ring-red-200' },
};

const dateFormat = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium' });

export function LessonsTable({ lessons }: { lessons: LessonListItem[] }) {
  if (lessons.length === 0) {
    return (
      <div className="ring-ink-200 rounded-2xl bg-white px-6 py-16 text-center ring-1">
        <p className="text-ink-900 font-medium">Уроків поки немає</p>
        <p className="text-ink-500 mx-auto mt-1 max-w-sm text-sm">
          Вставте текст задач — AI проаналізує їх, відбере найкращі та збудує урок.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/lessons/new">
            <Button>Створити перший урок</Button>
          </Link>
          <form action={createDemoLesson}>
            <Button type="submit" variant="secondary">
              Додати демо-урок
            </Button>
          </form>
        </div>
        <p className="text-ink-400 mt-3 text-xs">
          Демо-урок додається без генерації — щоб подивитися, як усе працює.
        </p>
      </div>
    );
  }

  return (
    <div className="ring-ink-200 overflow-hidden rounded-2xl bg-white ring-1">
      <table className="w-full text-sm">
        <thead className="bg-ink-50 text-ink-600 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Назва</th>
            <th className="px-4 py-3 font-medium">Клас</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Тема</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Оформлення</th>
            <th className="px-4 py-3 font-medium">Завдань</th>
            <th className="hidden px-4 py-3 font-medium lg:table-cell">Створено</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-ink-100 divide-y">
          {lessons.map((lesson) => {
            const badge = statusBadge[lesson.status];
            const count = taskCount(lesson.content);

            return (
              <tr key={lesson.id} className="hover:bg-ink-50/60">
                <td className="px-4 py-3">
                  <Link href={`/lessons/${lesson.id}`} className="text-ink-900 font-medium hover:underline">
                    {lesson.title}
                  </Link>
                  {lesson.status !== 'ready' && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  )}
                </td>
                <td className="text-ink-600 px-4 py-3">{lesson.grade}</td>
                <td className="text-ink-600 hidden px-4 py-3 sm:table-cell">{lesson.topic ?? '—'}</td>
                <td className="text-ink-600 hidden px-4 py-3 md:table-cell">
                  {themeLabel(lesson.theme)}
                </td>
                <td className="text-ink-600 px-4 py-3">{count ?? '—'}</td>
                <td className="text-ink-500 hidden px-4 py-3 lg:table-cell">
                  {dateFormat.format(new Date(lesson.created_at))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <form action={duplicateLesson}>
                      <input type="hidden" name="id" value={lesson.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Копія
                      </Button>
                    </form>
                    <form action={deleteLesson}>
                      <input type="hidden" name="id" value={lesson.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        Видалити
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
