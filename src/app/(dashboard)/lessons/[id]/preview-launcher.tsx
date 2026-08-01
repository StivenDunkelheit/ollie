'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Lesson } from '@/lib/schema/lesson';
import { checkAnswer, interactiveAt, sanitizeBlock, type CheckResult } from '@/lib/interactives';
import { BlockView } from '@/components/blocks/block-view';
import { answerKey, computeStats, countAnswerableRounds } from '@/lib/lesson-stats';
import { Button } from '@/components/ui/button';
import { BLOCK_LABEL } from '@/lib/labels';

/**
 * Прев'ю: викладач проходить урок очима учня, не створюючи сесію.
 *
 * Відповіді перевіряються локально — у прев'ю повний урок і так у браузері
 * викладача, це його власний матеріал. У Student Mode перевірка тільки на сервері.
 */
export function PreviewLauncher({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Прев&apos;ю
      </Button>
      {open && <PreviewOverlay lesson={lesson} onClose={() => setOpen(false)} />}
    </>
  );
}

function PreviewOverlay({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, CheckResult>>({});

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

  const go = (delta: number) =>
    setIndex((i) => Math.min(lesson.blocks.length - 1, Math.max(0, i + delta)));

  return (
    <div className="bg-ink-50 fixed inset-0 z-50 flex flex-col">
      <header className="ring-ink-200 flex h-14 shrink-0 items-center gap-4 bg-white px-4 ring-1">
        <span className="text-ink-500 text-sm">
          Прев&apos;ю · {index + 1} / {lesson.blocks.length} · {BLOCK_LABEL[block.kind]}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onClose}>
          Закрити
        </Button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <BlockView
          block={publicBlock}
          stats={stats}
          onCheck={handleCheck}
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
