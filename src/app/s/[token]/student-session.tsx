'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicSessionView } from '@/lib/public-session';
import type { CheckResult } from '@/lib/interactives';
import { BlockView } from '@/components/blocks/block-view';
import { computeStats } from '@/lib/lesson-stats';

/**
 * Экран ученика.
 *
 * Пока состояние забирается опросом раз в 1.5 секунды — на следующем шаге его
 * заменит Realtime-канал, а опрос останется запасным путём при потере связи.
 */
export function StudentSession({
  token,
  initial,
}: {
  token: string;
  initial: PublicSessionView;
}) {
  const [view, setView] = useState(initial);
  const [answers, setAnswers] = useState<Record<string, CheckResult>>({});
  const [offline, setOffline] = useState(false);
  const seenSeq = useRef(initial.seq);

  useEffect(() => {
    let stopped = false;

    async function poll() {
      try {
        const response = await fetch(`/api/public/sessions/${token}`, { cache: 'no-store' });
        if (!response.ok) {
          if (!stopped) setOffline(true);
          return;
        }
        const next = (await response.json()) as PublicSessionView;
        if (stopped) return;

        setOffline(false);
        // Состояние с меньшим seq — устаревший ответ, обгоняющий свежий.
        if (next.seq >= seenSeq.current) {
          seenSeq.current = next.seq;
          setView(next);
        }
      } catch {
        if (!stopped) setOffline(true);
      }
    }

    const id = setInterval(poll, 1500);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [token]);

  const handleCheck = useCallback(
    async (blockId: string, roundIndex: number, input: unknown): Promise<CheckResult> => {
      const response = await fetch(`/api/public/sessions/${token}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block_id: blockId, round_index: roundIndex, input }),
      });

      if (!response.ok) return { correct: false, score: 0 };

      const result = (await response.json()) as CheckResult;
      setAnswers((current) => ({ ...current, [`${blockId}:${roundIndex}`]: result }));
      return result;
    },
    [token],
  );

  if (view.status === 'waiting') return <WaitingRoom name={view.student_name} />;
  if (view.status === 'ended') return <Ended />;
  // Пауза — отдельный экран, а не просто заблокированный ввод: учень має
  // розуміти, що урок зупинив викладач, а не щось зламалося.
  if (view.status === 'paused') return <Paused />;

  const stats = computeStats(answers, view.position.total);

  return (
    <div className="bg-ink-50 flex h-dvh flex-col">
      <header className="ring-ink-200 flex h-12 shrink-0 items-center gap-3 bg-white px-4 ring-1">
        <Progress index={view.position.index} total={view.position.total} />
        {offline && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 ring-1 ring-amber-200 ring-inset">
            Немає зв&apos;язку
          </span>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {view.block ? (
          <BlockView
            key={view.block.id}
            block={view.block}
            stats={stats}
            onCheck={handleCheck}
            locked={view.input_locked}
            revealed={view.revealed}
          />
        ) : (
          <NoBlock />
        )}
      </main>
    </div>
  );
}

function Progress({ index, total }: { index: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round(((index + 1) / total) * 100);
  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="bg-ink-200 h-2 flex-1 overflow-hidden rounded-full">
        <div
          className="bg-brand-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-ink-500 shrink-0 text-xs tabular-nums">
        {index + 1} / {total}
      </span>
    </div>
  );
}

function WaitingRoom({ name }: { name: string | null }) {
  return (
    <main className="flex h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="border-brand-500 mb-6 size-8 animate-spin rounded-full border-3 border-t-transparent" />
      <h1 className="text-ink-900 text-xl font-semibold">
        {name ? `Привіт, ${name}!` : 'Майже готово'}
      </h1>
      <p className="text-ink-500 mt-2 max-w-xs text-sm">
        Урок почнеться, щойно викладач його розпочне. Сторінку закривати не треба.
      </p>
    </main>
  );
}

function Paused() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-6xl" aria-hidden>
        ☕
      </div>
      <h1 className="text-ink-900 text-2xl font-semibold">Перерва</h1>
      <p className="text-ink-500 mt-2 text-sm">Викладач скоро продовжить урок.</p>
    </main>
  );
}

/** Маршрут пуст или блок ещё не выбран — редкий случай, но экран не должен быть пустым. */
function NoBlock() {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <p className="text-ink-500 text-sm">Зачекай, викладач готує наступне завдання.</p>
    </div>
  );
}

function Ended() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-6xl" aria-hidden>
        🎉
      </div>
      <h1 className="text-ink-900 text-2xl font-semibold">Урок завершено</h1>
      <p className="text-ink-500 mt-2 text-sm">Дякуємо за роботу!</p>
    </main>
  );
}
