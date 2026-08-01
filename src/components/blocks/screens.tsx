'use client';

import { Button } from '@/components/ui/button';
import type { LessonStats } from '@/lib/lesson-stats';

const REWARD_ICON: Record<string, string> = {
  star: '⭐',
  chest: '🎁',
  medal: '🏅',
  gem: '💎',
  key: '🔑',
};

function Screen({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-full flex-col items-center justify-center px-6 text-center ${className}`}>
      <div className="max-w-xl">{children}</div>
    </div>
  );
}

function Continue({ onContinue, label = 'Далі' }: { onContinue?: () => void; label?: string }) {
  if (!onContinue) return null;
  return (
    <Button size="lg" className="mt-8" onClick={onContinue}>
      {label}
    </Button>
  );
}

export function IntroScreen({
  title,
  subtitle,
  onContinue,
}: {
  title: string;
  subtitle: string | null;
  onContinue?: () => void;
}) {
  return (
    <Screen>
      <h1 className="text-ink-900 text-4xl font-bold tracking-tight text-balance">{title}</h1>
      {subtitle && <p className="text-ink-500 mt-3 text-lg">{subtitle}</p>}
      <Continue onContinue={onContinue} label="Почати" />
    </Screen>
  );
}

export function StoryScreen({ text, onContinue }: { text: string; onContinue?: () => void }) {
  return (
    <Screen>
      <p className="text-ink-800 text-2xl leading-relaxed text-balance">{text}</p>
      <Continue onContinue={onContinue} />
    </Screen>
  );
}

export function RewardScreen({
  title,
  text,
  icon,
  onContinue,
}: {
  title: string;
  text: string;
  icon: string;
  onContinue?: () => void;
}) {
  return (
    <Screen>
      <div className="mb-4 text-7xl" aria-hidden>
        {REWARD_ICON[icon] ?? '⭐'}
      </div>
      <h2 className="text-ink-900 text-3xl font-bold tracking-tight">{title}</h2>
      <p className="text-ink-600 mt-2 text-lg">{text}</p>
      <Continue onContinue={onContinue} />
    </Screen>
  );
}

export function StatsScreen({
  title,
  stats,
  onContinue,
}: {
  title: string;
  stats: LessonStats;
  onContinue?: () => void;
}) {
  return (
    <Screen>
      <h2 className="text-ink-900 text-3xl font-bold tracking-tight">{title}</h2>

      <div className="mb-2 mt-6 text-4xl" aria-hidden>
        {'★'.repeat(stats.stars)}
        <span className="text-ink-200">{'★'.repeat(Math.max(0, 3 - stats.stars))}</span>
      </div>

      <p className="text-ink-900 text-5xl font-bold">{stats.scorePercent}%</p>

      <dl className="text-ink-600 mt-6 grid grid-cols-2 gap-4 text-left text-sm">
        <div className="ring-ink-200 rounded-xl bg-white px-4 py-3 ring-1">
          <dt className="text-ink-500">Виконано завдань</dt>
          <dd className="text-ink-900 mt-1 text-xl font-semibold">
            {stats.answered} / {stats.total}
          </dd>
        </div>
        <div className="ring-ink-200 rounded-xl bg-white px-4 py-3 ring-1">
          <dt className="text-ink-500">Без помилок</dt>
          <dd className="text-ink-900 mt-1 text-xl font-semibold">{stats.correct}</dd>
        </div>
      </dl>

      <Continue onContinue={onContinue} />
    </Screen>
  );
}

export function FinishScreen({ title, text }: { title: string; text: string }) {
  return (
    <Screen>
      <div className="mb-4 text-7xl" aria-hidden>
        🎉
      </div>
      <h2 className="text-ink-900 text-3xl font-bold tracking-tight text-balance">{title}</h2>
      <p className="text-ink-600 mt-3 text-lg text-balance">{text}</p>
    </Screen>
  );
}
