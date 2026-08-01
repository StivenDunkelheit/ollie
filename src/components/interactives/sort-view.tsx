'use client';

import type { PublicSort } from '@/lib/interactives';
import type { SortInput } from '@/lib/interactives/sort';
import type { InteractiveProps } from './types';
import { Prompt } from './option';
import { cn } from '@/lib/cn';

type Revealed = { type: 'sort'; order: string[] };

/** Порядок меняется кнопками — работает и мышью, и пальцем, и с клавиатуры. */
export function SortView({
  interactive,
  value,
  onChange,
  disabled,
  result,
  revealed,
}: InteractiveProps<PublicSort, SortInput, Revealed>) {
  const label = new Map(interactive.items.map((o) => [o.id, o.text]));
  const fallback = interactive.items.map((o) => o.id);
  const order = revealed ? revealed.order : (value?.order ?? fallback);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ order: next });
  }

  const tone = revealed
    ? 'bg-emerald-50 ring-emerald-400'
    : result
      ? result.correct
        ? 'bg-emerald-50 ring-emerald-400'
        : 'bg-red-50 ring-red-300'
      : 'ring-ink-200 bg-white';

  return (
    <div>
      <Prompt>{interactive.instruction}</Prompt>

      <ol className="space-y-2">
        {order.map((itemId, index) => (
          <li
            key={itemId}
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-inset',
              tone,
            )}
          >
            <span className="bg-ink-900 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white">
              {index + 1}
            </span>
            <span className="text-ink-900 flex-1 text-base">{label.get(itemId) ?? itemId}</span>

            {!disabled && (
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label="Вище"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="ring-ink-200 text-ink-600 hover:bg-ink-50 flex size-8 items-center justify-center rounded-lg ring-1 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Нижче"
                  disabled={index === order.length - 1}
                  onClick={() => move(index, 1)}
                  className="ring-ink-200 text-ink-600 hover:bg-ink-50 flex size-8 items-center justify-center rounded-lg ring-1 disabled:opacity-30"
                >
                  ↓
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
