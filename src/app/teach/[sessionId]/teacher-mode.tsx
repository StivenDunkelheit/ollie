'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Lesson } from '@/lib/schema/lesson';
import type { SessionState } from '@/lib/schema/session';
import type { SessionStatus } from '@/lib/supabase/types';
import type { SessionAction } from '@/lib/session-actions';
import { revealAnswer, sanitizeBlock } from '@/lib/interactives';
import { BlockView } from '@/components/blocks/block-view';
import { BLOCK_LABEL, INTERACTIVE_LABEL } from '@/lib/labels';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { AnswerPanel } from './answer-panel';

export function TeacherMode({
  sessionId,
  lesson,
  initialState,
  initialStatus,
  studentName,
  studentUrl,
}: {
  sessionId: string;
  lesson: Lesson;
  initialState: SessionState;
  initialStatus: SessionStatus;
  studentName: string | null;
  studentUrl: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);

  const blockById = useMemo(
    () => new Map(lesson.blocks.map((block) => [block.id, block])),
    [lesson.blocks],
  );

  const currentId = state.route[state.current_index] ?? null;
  const currentBlock = currentId ? (blockById.get(currentId) ?? null) : null;
  const revealedHere = currentId ? state.revealed.includes(currentId) : false;

  const bonusBlocks = useMemo(
    () => lesson.blocks.filter((b) => b.kind === 'task' && b.is_bonus),
    [lesson.blocks],
  );

  const send = useCallback(
    async (action: SessionAction) => {
      setBusy(true);
      try {
        const response = await fetch(`/api/sessions/${sessionId}/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { state: SessionState; status: SessionStatus };
        setState(payload.state);
        setStatus(payload.status);
      } finally {
        setBusy(false);
      }
    },
    [sessionId],
  );

  const publicBlock = currentBlock ? sanitizeBlock(currentBlock) : null;
  const revealed =
    revealedHere && currentBlock?.kind === 'task' ? revealAnswer(currentBlock.interactive) : null;

  if (status === 'waiting') {
    return (
      <WaitingScreen
        studentName={studentName}
        studentUrl={studentUrl}
        busy={busy}
        onStart={() => void send({ type: 'start' })}
        onExit={() => router.push('/lessons')}
      />
    );
  }

  return (
    <div className="bg-ink-50 flex h-dvh flex-col">
      <header className="ring-ink-200 flex h-12 shrink-0 items-center gap-3 bg-white px-4 ring-1">
        <span className="text-ink-900 truncate text-sm font-semibold">{lesson.title}</span>
        {studentName && <span className="text-ink-500 truncate text-sm">· {studentName}</span>}
        <StatusPill status={status} />
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => router.push('/lessons')}>
          Згорнути
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="ring-ink-200 hidden w-60 shrink-0 overflow-y-auto bg-white ring-1 lg:block">
          <ol className="p-2">
            {state.route.map((blockId, index) => {
              const block = blockById.get(blockId);
              if (!block) return null;
              const active = index === state.current_index;

              return (
                <li key={blockId}>
                  <button
                    type="button"
                    onClick={() => void send({ type: 'goto', index })}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      active ? 'bg-brand-50 text-brand-900' : 'text-ink-600 hover:bg-ink-50',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-ink-400 w-5 shrink-0 text-xs tabular-nums">
                        {index + 1}
                      </span>
                      <span className="truncate">
                        {block.kind === 'task'
                          ? INTERACTIVE_LABEL[block.interactive.type]
                          : BLOCK_LABEL[block.kind]}
                      </span>
                      {index < state.current_index && (
                        <span className="ml-auto text-xs text-emerald-600">✓</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <main className="ring-ink-200 min-w-0 flex-1 overflow-y-auto bg-white lg:ring-1">
          <p className="text-ink-400 border-ink-100 border-b px-4 py-2 text-xs">
            Дзеркало екрана учня
          </p>
          {publicBlock ? (
            <BlockView
              key={publicBlock.id}
              block={publicBlock}
              onCheck={async () => ({ correct: false, score: 0 })}
              revealed={revealed}
              locked
            />
          ) : (
            <p className="text-ink-400 p-8 text-center text-sm">Блок не вибрано.</p>
          )}
        </main>

        <aside className="ring-ink-200 hidden w-72 shrink-0 overflow-y-auto bg-white p-4 ring-1 xl:block">
          <AnswerPanel block={currentBlock} revealed={revealedHere} />
        </aside>
      </div>

      <footer className="ring-ink-200 flex shrink-0 flex-wrap items-center gap-2 bg-white px-4 py-3 ring-1">
        <Button
          variant="secondary"
          onClick={() => void send({ type: 'prev' })}
          disabled={busy || state.current_index === 0}
        >
          ← Назад
        </Button>
        <Button
          onClick={() => void send({ type: 'next' })}
          disabled={busy || state.current_index >= state.route.length - 1}
        >
          Далі →
        </Button>
        <Button variant="ghost" onClick={() => void send({ type: 'skip' })} disabled={busy}>
          Пропустити
        </Button>
        <Button
          variant="ghost"
          onClick={() => void send({ type: 'reveal' })}
          disabled={busy || revealedHere || currentBlock?.kind !== 'task'}
        >
          {revealedHere ? 'Відповідь показано' : 'Показати відповідь'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => void send({ type: 'hide_block', block_id: currentId ?? '' })}
          disabled={busy || !currentId || state.route.length <= 1}
        >
          Приховати блок
        </Button>

        <div className="flex-1" />

        {bonusBlocks.length > 0 && (
          <Button
            variant="ghost"
            disabled={busy || bonusBlocks.every((b) => state.route.includes(b.id))}
            onClick={() => {
              const next = bonusBlocks.find((b) => !state.route.includes(b.id));
              if (next) void send({ type: 'activate_bonus', block_id: next.id });
            }}
          >
            Бонусне завдання
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => void send({ type: status === 'paused' ? 'resume' : 'pause' })}
          disabled={busy || status === 'ended'}
        >
          {status === 'paused' ? 'Продовжити' : 'Пауза'}
        </Button>
        <Button
          variant="danger"
          onClick={() => void send({ type: 'end' })}
          disabled={busy || status === 'ended'}
        >
          Завершити
        </Button>
      </footer>
    </div>
  );
}

function StatusPill({ status }: { status: SessionStatus }) {
  const tone =
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : status === 'paused'
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-ink-100 text-ink-600 ring-ink-200';

  const label = { waiting: 'Очікує', active: 'Іде урок', paused: 'Пауза', ended: 'Завершено' }[
    status
  ];

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs ring-1 ring-inset', tone)}>{label}</span>
  );
}

function WaitingScreen({
  studentName,
  studentUrl,
  busy,
  onStart,
  onExit,
}: {
  studentName: string | null;
  studentUrl: string;
  busy: boolean;
  onStart: () => void;
  onExit: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <main className="flex h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-ink-900 text-2xl font-semibold">Сесія готова</h1>
      <p className="text-ink-500 mt-2 text-sm">
        {studentName ? `Учень: ${studentName}. ` : ''}
        Надішліть посилання і починайте, коли учень відкриє його.
      </p>

      <div className="ring-ink-200 mt-6 flex w-full max-w-lg items-center gap-2 rounded-xl bg-white p-2 ring-1">
        <code className="text-ink-600 min-w-0 flex-1 truncate px-2 text-left text-sm">
          {studentUrl}
        </code>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(studentUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? 'Скопійовано' : 'Копіювати'}
        </Button>
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="ghost" onClick={onExit}>
          Пізніше
        </Button>
        <Button size="lg" onClick={onStart} disabled={busy}>
          Розпочати урок
        </Button>
      </div>
    </main>
  );
}
