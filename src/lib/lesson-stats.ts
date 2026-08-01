import type { Block } from '@/lib/schema/lesson';
import type { CheckResult } from '@/lib/interactives';

export interface LessonStats {
  answered: number;
  total: number;
  correct: number;
  scorePercent: number;
  stars: number;
}

/**
 * Сколько ответов ученик должен дать за урок.
 *
 * Считаем именно раунды, а не блоки: Boss Battle из трёх раундов — это три
 * ответа, финальный квиз из пяти вопросов — пять. Иначе знаменатель в
 * статистике расходится с числителем.
 *
 * Запасные задания в знаменатель не идут: викладач может их и не видати.
 */
export function countAnswerableRounds(blocks: Block[]): number {
  let total = 0;
  for (const block of blocks) {
    switch (block.kind) {
      case 'task':
        if (!block.is_bonus) total += 1;
        break;
      case 'boss':
        total += block.rounds.length;
        break;
      case 'final_quiz':
        total += block.questions.length;
        break;
      default:
        break;
    }
  }
  return total;
}

/** Ключ ответа: один блок может содержать несколько раундов. */
export function answerKey(blockId: string, roundIndex: number): string {
  return `${blockId}:${roundIndex}`;
}

export function computeStats(
  results: Record<string, CheckResult>,
  totalRounds: number,
): LessonStats {
  const values = Object.values(results);
  const answered = values.length;
  const correct = values.filter((r) => r.correct).length;

  // Доля считается от всех запланированных заданий, а не от отвеченных:
  // пропущенное задание не должно повышать процент.
  const denominator = Math.max(totalRounds, answered);
  const score = denominator === 0 ? 0 : values.reduce((sum, r) => sum + r.score, 0) / denominator;

  return {
    answered,
    total: denominator,
    correct,
    scorePercent: Math.round(score * 100),
    stars: score >= 0.9 ? 3 : score >= 0.7 ? 2 : score > 0 ? 1 : 0,
  };
}
