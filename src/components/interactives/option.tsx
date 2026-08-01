'use client';

import { cn } from '@/lib/cn';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'muted';

const styles: Record<OptionState, string> = {
  idle: 'bg-white ring-ink-200 text-ink-800 hover:ring-ink-300 hover:bg-ink-50',
  selected: 'bg-brand-50 ring-brand-500 text-brand-900 ring-2',
  correct: 'bg-emerald-50 ring-emerald-500 text-emerald-900 ring-2',
  wrong: 'bg-red-50 ring-red-400 text-red-900 ring-2',
  muted: 'bg-ink-50 ring-ink-200 text-ink-400',
};

/** Общий вид кликабельного варианта — используется во всех интерактивах. */
export function OptionButton({
  state,
  disabled,
  onClick,
  children,
  className,
}: {
  state: OptionState;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={state === 'selected'}
      className={cn(
        'w-full rounded-xl px-4 py-3 text-left text-base ring-1 ring-inset transition-all',
        'focus-visible:ring-brand-500 focus-visible:ring-2 focus-visible:outline-none',
        'disabled:cursor-default',
        styles[state],
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Подпись-инструкция над заданием. */
export function Prompt({ children }: { children: React.ReactNode }) {
  return <p className="text-ink-900 mb-4 text-lg leading-snug font-medium">{children}</p>;
}
