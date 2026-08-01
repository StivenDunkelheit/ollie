'use client';

import { useMemo } from 'react';
import type { PublicFillBlank } from '@/lib/interactives';
import type { FillBlankInput } from '@/lib/interactives/fill-blank';
import type { InteractiveProps } from './types';
import { Prompt } from './option';
import { cn } from '@/lib/cn';

type Revealed = { type: 'fill_blank'; values: Record<string, string> };

const PLACEHOLDER = /(\{\{\s*[^}\s]+\s*\}\})/g;

/** Разбивает текст на куски: обычный текст и пропуски. */
function segments(text: string): Array<{ kind: 'text' | 'blank'; value: string }> {
  return text.split(PLACEHOLDER).map((chunk) => {
    const match = /^\{\{\s*([^}\s]+)\s*\}\}$/.exec(chunk);
    return match ? { kind: 'blank' as const, value: match[1] } : { kind: 'text' as const, value: chunk };
  });
}

export function FillBlankView({
  interactive,
  value,
  onChange,
  disabled,
  result,
  revealed,
}: InteractiveProps<PublicFillBlank, FillBlankInput, Revealed>) {
  const parts = useMemo(() => segments(interactive.text), [interactive.text]);
  const values = value?.values ?? {};

  function setBlank(blankId: string, next: string) {
    onChange({ values: { ...values, [blankId]: next } });
  }

  return (
    <div>
      <Prompt>Заповни пропуски</Prompt>
      <p className="text-ink-900 text-lg leading-loose">
        {parts.map((part, index) =>
          part.kind === 'text' ? (
            <span key={index}>{part.value}</span>
          ) : (
            <input
              key={index}
              type="text"
              inputMode="text"
              autoComplete="off"
              aria-label={`Пропуск ${part.value}`}
              disabled={disabled}
              value={revealed ? (revealed.values[part.value] ?? '') : (values[part.value] ?? '')}
              onChange={(e) => setBlank(part.value, e.target.value)}
              className={cn(
                'mx-1 w-32 rounded-lg px-2 py-1 text-center text-base ring-1 ring-inset',
                'focus:ring-brand-500 focus:ring-2 focus:outline-none',
                revealed
                  ? 'bg-emerald-50 text-emerald-900 ring-emerald-400'
                  : result
                    ? result.correct
                      ? 'bg-emerald-50 text-emerald-900 ring-emerald-400'
                      : 'bg-red-50 text-red-900 ring-red-300'
                    : 'ring-ink-300 bg-white',
              )}
            />
          ),
        )}
      </p>
    </div>
  );
}
