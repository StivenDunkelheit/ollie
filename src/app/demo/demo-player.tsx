'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Lesson } from '@/lib/schema/lesson';
import { checkAnswer, interactiveAt, revealAnswer, sanitizeBlock } from '@/lib/interactives';
import type { CheckResult, RevealedAnswer } from '@/lib/interactives';
import { BlockView } from '@/components/blocks/block-view';
import { answerKey, computeStats, countAnswerableRounds } from '@/lib/lesson-stats';
import { Button } from '@/components/ui/button';
import { BLOCK_LABEL } from '@/lib/labels';

/** Прохождение урока с локальной проверкой — только для разработки. */
export function DemoPlayer({ lesson }: { lesson: Lesson }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, CheckResult>>({});
  const [revealed, setRevealed] = useState<RevealedAnswer | null>(null);

  const block = lesson.blocks[index];
  const publicBlock = useMemo(() => sanitizeBlock(block), [block]);

  const totalRounds = useMemo(() => countAnswerableRounds(lesson.blocks), [lesson.blocks]);
  const stats = useMemo(() => computeStats(answers, totalRounds), [answers, totalRounds]);

  const handleCheck = useCallback(
    async (blockId: string, roundIndex: number, input: unknown): Promise<CheckResult> => {
      const source = lesson.blocks.find((b) => b.id === blockId);
      const interactive = source ? interactiveAt(source, roundIndex) : null;
      if (!interactive) return { correct: false, score: 0 };

      const outcome = checkAnswer(interactive, input);
      const result = outcome.ok ? outcome.result : { correct: false, score: 0 };
      setAnswers((current) => ({ ...current, [answerKey(blockId, roundIndex)]: result }));
      return result;
    },
    [lesson.blocks],
  );

  function go(delta: number) {
    setRevealed(null);
    setIndex((i) => Math.min(lesson.blocks.length - 1, Math.max(0, i + delta)));
  }

  function reveal() {
    const interactive = interactiveAt(block, 0);
    setRevealed(interactive ? revealAnswer(interactive) : null);
  }

  const answerable = block.kind === 'task' || block.kind === 'boss' || block.kind === 'final_quiz';

  return (
    <div className="bg-ink-50 flex h-screen flex-col">
      <header className="ring-ink-200 flex h-14 shrink-0 items-center gap-3 bg-white px-4 ring-1">
        <span className="text-ink-900 text-sm font-semibold">Демо</span>
        <span className="text-ink-500 text-sm">
          {index + 1} / {lesson.blocks.length} · {BLOCK_LABEL[block.kind]}
          {block.kind === 'task' && ` · ${block.interactive.type}`}
        </span>
        <div className="flex-1" />
        {answerable && (
          <Button variant="ghost" size="sm" onClick={reveal}>
            Показати відповідь
          </Button>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <BlockView
          key={block.id}
          block={publicBlock}
          stats={stats}
          onCheck={handleCheck}
          revealed={revealed}
          onContinue={index < lesson.blocks.length - 1 ? () => go(1) : undefined}
        />
      </main>

      <footer className="ring-ink-200 flex h-16 shrink-0 items-center justify-center gap-3 bg-white px-4 ring-1">
        <Button variant="secondary" onClick={() => go(-1)} disabled={index === 0}>
          ← Назад
        </Button>
        <Button onClick={() => go(1)} disabled={index === lesson.blocks.length - 1}>
          Далі →
        </Button>
      </footer>
    </div>
  );
}
