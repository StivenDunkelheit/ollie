import { describe, expect, it } from 'vitest';
import { SAMPLE_LESSON } from '@/lib/schema/lesson.fixture';
import { answerKey, computeStats, countAnswerableRounds } from './lesson-stats';

describe('countAnswerableRounds', () => {
  it('считает раунды, а не блоки', () => {
    // 5 обычных заданий (b9 запасное — не в счёт) + 3 раунда боса + 3 вопроса квиза.
    expect(countAnswerableRounds(SAMPLE_LESSON.blocks)).toBe(11);
  });

  it('не учитывает запасные задания', () => {
    const withoutBonus = SAMPLE_LESSON.blocks.filter(
      (b) => !(b.kind === 'task' && b.is_bonus),
    );
    expect(countAnswerableRounds(withoutBonus)).toBe(countAnswerableRounds(SAMPLE_LESSON.blocks));
  });
});

describe('computeStats', () => {
  const correct = { correct: true, score: 1 };
  const wrong = { correct: false, score: 0 };

  it('считает процент от всех запланированных заданий, а не от отвеченных', () => {
    // Два верных ответа из десяти заданий — это 20%, а не 100%.
    const stats = computeStats({ 'a:0': correct, 'b:0': correct }, 10);
    expect(stats.scorePercent).toBe(20);
    expect(stats.answered).toBe(2);
    expect(stats.total).toBe(10);
  });

  it('не занижает знаменатель, если ответов больше запланированного', () => {
    // Викладач видав запасні завдання — они увеличивают знаменатель.
    const stats = computeStats({ 'a:0': correct, 'b:0': correct, 'c:0': correct }, 2);
    expect(stats.total).toBe(3);
    expect(stats.scorePercent).toBe(100);
  });

  it('учитывает частичные баллы', () => {
    const stats = computeStats({ 'a:0': { correct: false, score: 0.5 } }, 1);
    expect(stats.scorePercent).toBe(50);
    expect(stats.correct).toBe(0);
  });

  it('выдаёт звёзды по порогам', () => {
    expect(computeStats({ 'a:0': correct }, 1).stars).toBe(3);
    expect(computeStats({ 'a:0': correct, 'b:0': wrong }, 2).stars).toBe(1);
    expect(computeStats({ 'a:0': wrong }, 1).stars).toBe(0);
  });

  it('переживает пустой урок', () => {
    expect(computeStats({}, 0)).toEqual({
      answered: 0,
      total: 0,
      correct: 0,
      scorePercent: 0,
      stars: 0,
    });
  });
});

describe('answerKey', () => {
  it('различает раунды одного блока', () => {
    expect(answerKey('b10', 0)).not.toBe(answerKey('b10', 1));
  });
});
