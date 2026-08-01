'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CheckResult, PublicInteractive, RevealedAnswer } from '@/lib/interactives';
import { InteractiveView } from '@/components/interactives';
import { isEmptyAnswer } from '@/components/interactives/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export interface TaskRunnerProps {
  /** Один элемент для обычного задания, несколько — для боса и финального квиза. */
  rounds: PublicInteractive[];
  title: string | null;
  timerSec: number | null;
  /** HP боса: показывается полоса. Для остальных блоков — null. */
  bossHp: number | null;
  onCheck: (roundIndex: number, input: unknown) => Promise<CheckResult>;
  /** Все раунды пройдены. */
  onDone?: () => void;
  revealed?: RevealedAnswer | null;
  /** Ввод заблокирован викладачем или паузой. */
  locked?: boolean;
}

function Feedback({ result }: { result: CheckResult }) {
  const tone = result.correct
    ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    : result.score > 0
      ? 'bg-amber-50 text-amber-800 ring-amber-200'
      : 'bg-red-50 text-red-800 ring-red-200';

  const label = result.correct
    ? 'Правильно!'
    : result.score > 0
      ? `Частково правильно — ${Math.round(result.score * 100)}%`
      : 'Не зовсім. Спробуй ще раз пізніше.';

  return (
    <p className={cn('mt-4 rounded-xl px-4 py-3 text-sm font-medium ring-1 ring-inset', tone)}>
      {label}
    </p>
  );
}

export function TaskRunner({
  rounds,
  title,
  timerSec,
  bossHp,
  onCheck,
  onDone,
  revealed = null,
  locked = false,
}: TaskRunnerProps) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [value, setValue] = useState<unknown>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [hits, setHits] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(timerSec);

  const current = rounds[roundIndex];
  const isLast = roundIndex === rounds.length - 1;
  const answered = result !== null;

  const submit = useCallback(async () => {
    if (checking || answered || locked) return;
    setChecking(true);
    try {
      const outcome = await onCheck(roundIndex, value ?? {});
      setResult(outcome);
      if (outcome.correct) setHits((n) => n + 1);
    } finally {
      setChecking(false);
    }
  }, [answered, checking, locked, onCheck, roundIndex, value]);

  // Таймер раунда. Ноль — принудительная отправка того, что есть.
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (secondsLeft === null || answered || locked) return;
    if (secondsLeft <= 0) {
      void submitRef.current();
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, answered, locked]);

  function next() {
    if (isLast) {
      onDone?.();
      return;
    }
    setRoundIndex((i) => i + 1);
    setValue(null);
    setResult(null);
    setSecondsLeft(timerSec);
  }

  const multiRound = rounds.length > 1;

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-5 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          {title && <h2 className="text-ink-900 text-lg font-semibold">{title}</h2>}
          {multiRound && (
            <p className="text-ink-500 text-sm">
              Раунд {roundIndex + 1} з {rounds.length}
            </p>
          )}
        </div>

        {secondsLeft !== null && !answered && (
          <span
            className={cn(
              'rounded-full px-3 py-1 text-sm font-semibold tabular-nums ring-1 ring-inset',
              secondsLeft <= 5
                ? 'bg-red-50 text-red-700 ring-red-200'
                : 'bg-ink-100 text-ink-700 ring-ink-200',
            )}
          >
            {secondsLeft} с
          </span>
        )}
      </div>

      {bossHp !== null && (
        <div className="mb-5">
          <div className="text-ink-500 mb-1 flex justify-between text-xs">
            <span>HP боса</span>
            <span>
              {Math.max(0, bossHp - hits)} / {bossHp}
            </span>
          </div>
          <div className="bg-ink-200 h-2.5 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-red-500 transition-all duration-500"
              style={{ width: `${Math.max(0, ((bossHp - hits) / bossHp) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1">
        <InteractiveView
          interactive={current}
          value={value}
          onChange={setValue}
          disabled={locked || answered || checking}
          result={result}
          revealed={revealed}
        />

        {result && <Feedback result={result} />}
      </div>

      <div className="mt-6 flex items-center gap-3">
        {!answered ? (
          <Button
            size="lg"
            onClick={() => void submit()}
            disabled={locked || checking || isEmptyAnswer(value)}
          >
            {checking ? 'Перевіряємо…' : 'Перевірити'}
          </Button>
        ) : multiRound ? (
          <Button size="lg" onClick={next}>
            {isLast ? 'Завершити' : 'Далі'}
          </Button>
        ) : (
          <p className="text-ink-500 text-sm">Чекай на викладача.</p>
        )}

        {locked && <p className="text-ink-500 text-sm">Введення заблоковано.</p>}
      </div>
    </div>
  );
}
