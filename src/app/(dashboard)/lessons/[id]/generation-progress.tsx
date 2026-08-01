'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';

const STEPS = [
  'Читаємо задачі',
  'Оцінюємо складність і прибираємо дублікати',
  'Відбираємо найкращі та вибудовуємо послідовність',
  'Підбираємо інтерактиви й будуємо сюжет',
];

/** Опрашивает статус, пока идёт генерация, и обновляет страницу по готовности. */
export function GenerationProgress({ lessonId, title }: { lessonId: string; title: string }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let stopped = false;

    async function poll() {
      try {
        const response = await fetch(`/api/lessons/${lessonId}/status`, { cache: 'no-store' });
        const payload = (await response.json()) as { status?: string; error_message?: string };

        if (stopped) return;

        if (payload.status === 'ready' || payload.status === 'failed') {
          router.refresh();
          return;
        }
      } catch {
        if (!stopped) setError('Втрачено зв’язок із сервером. Оновіть сторінку.');
      }
    }

    const id = setInterval(poll, 2000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [lessonId, router]);

  // Шаги — индикация процесса, а не реальные этапы: генерация идёт одним запросом.
  const activeStep = Math.min(STEPS.length - 1, Math.floor(elapsed / 20));

  return (
    <div className="mx-auto max-w-lg pt-12 text-center">
      <div className="border-brand-600 mx-auto size-10 animate-spin rounded-full border-3 border-t-transparent" />

      <h1 className="text-ink-900 mt-6 text-lg font-semibold">{title}</h1>
      <p className="text-ink-500 mt-1 text-sm">Генеруємо урок — зазвичай 1–3 хвилини.</p>

      <ol className="mt-8 space-y-2 text-left">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className={
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm ' +
              (index <= activeStep ? 'text-ink-900' : 'text-ink-400')
            }
          >
            <span
              className={
                'size-2 shrink-0 rounded-full ' +
                (index < activeStep
                  ? 'bg-emerald-500'
                  : index === activeStep
                    ? 'bg-brand-500 animate-pulse'
                    : 'bg-ink-200')
              }
            />
            {step}
          </li>
        ))}
      </ol>

      <p className="text-ink-400 mt-6 text-xs tabular-nums">
        {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
      </p>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
    </div>
  );
}
