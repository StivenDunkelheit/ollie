'use client';

import { useState } from 'react';
import type { PublicMatch } from '@/lib/interactives';
import type { MatchInput } from '@/lib/interactives/match';
import type { InteractiveProps } from './types';
import { OptionButton, Prompt, type OptionState } from './option';

type Revealed = { type: 'match'; pairs: { left_id: string; right_id: string }[] };

/**
 * Пары собираются в два клика: элемент слева, затем справа.
 *
 * Настоящий drag на тач-экранах капризен, а Student Mode обязан работать
 * на планшете — поэтому клик, а не перетаскивание.
 */
export function MatchView({
  interactive,
  value,
  onChange,
  disabled,
  result,
  revealed,
}: InteractiveProps<PublicMatch, MatchInput, Revealed>) {
  const [activeLeft, setActiveLeft] = useState<string | null>(null);

  const shown = revealed ? revealed.pairs : (value?.pairs ?? []);
  const pairing = new Map(shown.map((p) => [p.left_id, p.right_id]));

  const rightLabel = new Map(interactive.right.map((o) => [o.id, o.text]));
  const rightIndex = new Map(interactive.right.map((o, i) => [o.id, i + 1]));

  function pickLeft(leftId: string) {
    setActiveLeft((current) => (current === leftId ? null : leftId));
  }

  function pickRight(rightId: string) {
    if (!activeLeft) return;
    const next = shown.filter((p) => p.left_id !== activeLeft);
    next.push({ left_id: activeLeft, right_id: rightId });
    onChange({ pairs: next });
    setActiveLeft(null);
  }

  function leftState(leftId: string): OptionState {
    if (revealed) return 'correct';
    if (activeLeft === leftId) return 'selected';
    if (result) return result.correct ? 'correct' : 'wrong';
    return pairing.has(leftId) ? 'selected' : 'idle';
  }

  return (
    <div>
      <Prompt>{interactive.instruction}</Prompt>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          {interactive.left.map((option) => {
            const pairedTo = pairing.get(option.id);
            return (
              <OptionButton
                key={option.id}
                state={leftState(option.id)}
                disabled={disabled}
                onClick={() => pickLeft(option.id)}
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{option.text}</span>
                  {pairedTo && (
                    <span className="bg-ink-900 shrink-0 rounded-full px-2 py-0.5 text-xs text-white">
                      {rightIndex.get(pairedTo)}. {rightLabel.get(pairedTo)}
                    </span>
                  )}
                </span>
              </OptionButton>
            );
          })}
        </div>

        <div className="space-y-2">
          {interactive.right.map((option, index) => (
            <OptionButton
              key={option.id}
              state={activeLeft ? 'idle' : 'muted'}
              disabled={disabled || !activeLeft}
              onClick={() => pickRight(option.id)}
            >
              <span className="text-ink-400 mr-2 text-sm">{index + 1}.</span>
              {option.text}
            </OptionButton>
          ))}
        </div>
      </div>

      {!disabled && (
        <p className="text-ink-500 mt-3 text-sm">
          {activeLeft ? 'Тепер обери пару праворуч' : 'Обери елемент ліворуч'}
        </p>
      )}
    </div>
  );
}
