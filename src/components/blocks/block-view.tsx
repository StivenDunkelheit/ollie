'use client';

import type { CheckResult, PublicBlock, RevealedAnswer } from '@/lib/interactives';
import type { LessonStats } from '@/lib/lesson-stats';
import { TaskRunner } from './task-runner';
import { FinishScreen, IntroScreen, RewardScreen, StatsScreen, StoryScreen } from './screens';

export interface BlockViewProps {
  block: PublicBlock;
  /** Проверка ответа. В Student Mode уходит на сервер, в прев'ю считается локально. */
  onCheck: (blockId: string, roundIndex: number, input: unknown) => Promise<CheckResult>;
  /** Показывается только если ученику разрешена самостоятельная навигация. */
  onContinue?: () => void;
  stats?: LessonStats;
  revealed?: RevealedAnswer | null;
  locked?: boolean;
}

const EMPTY_STATS: LessonStats = {
  answered: 0,
  total: 0,
  correct: 0,
  scorePercent: 0,
  stars: 0,
};

/** Рисует один блок урока. Это всё, что ученик видит в каждый момент времени. */
export function BlockView({
  block,
  onCheck,
  onContinue,
  stats,
  revealed = null,
  locked = false,
}: BlockViewProps) {
  switch (block.kind) {
    case 'intro':
      return <IntroScreen title={block.title} subtitle={block.subtitle} onContinue={onContinue} />;

    case 'story':
      return <StoryScreen text={block.text} onContinue={onContinue} />;

    case 'reward':
      return (
        <RewardScreen
          title={block.title}
          text={block.text}
          icon={block.icon}
          onContinue={onContinue}
        />
      );

    case 'stats':
      return (
        <StatsScreen title={block.title} stats={stats ?? EMPTY_STATS} onContinue={onContinue} />
      );

    case 'finish':
      return <FinishScreen title={block.title} text={block.text} />;

    case 'task':
      return (
        <TaskRunner
          rounds={[block.interactive]}
          title={block.title}
          timerSec={block.timer_sec}
          bossHp={null}
          revealed={revealed}
          locked={locked}
          onCheck={(round, input) => onCheck(block.id, round, input)}
          onDone={onContinue}
        />
      );

    case 'boss':
      return (
        <TaskRunner
          rounds={block.rounds}
          title={block.title}
          timerSec={block.timer_sec}
          bossHp={block.hp}
          revealed={revealed}
          locked={locked}
          onCheck={(round, input) => onCheck(block.id, round, input)}
          onDone={onContinue}
        />
      );

    case 'final_quiz':
      return (
        <TaskRunner
          rounds={block.questions}
          title={block.title}
          timerSec={null}
          bossHp={null}
          revealed={revealed}
          locked={locked}
          onCheck={(round, input) => onCheck(block.id, round, input)}
          onDone={onContinue}
        />
      );
  }
}
