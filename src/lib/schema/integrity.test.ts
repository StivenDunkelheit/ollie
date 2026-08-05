import { describe, expect, it } from 'vitest';
import type { Block, Lesson } from './lesson';
import { SAMPLE_LESSON } from './lesson.fixture';
import { findIntegrityIssues } from './integrity';

function task(id: string, difficulty: number, isBonus = false): Block {
  return {
    kind: 'task',
    id,
    title: null,
    difficulty,
    timer_sec: null,
    is_bonus: isBonus,
    interactive: {
      type: 'quiz',
      question: `Питання ${id}`,
      options: [
        { id: `${id}-a`, text: 'А' },
        { id: `${id}-b`, text: 'Б' },
      ],
      correct_id: `${id}-a`,
      explanation: null,
    },
  };
}

function lessonWith(blocks: Block[]): Lesson {
  return {
    title: 'Тест',
    grade: '5 клас',
    topic: null,
    theme: 'none',
    story: null,
    blocks: [
      { kind: 'intro', id: 'i', title: 'Старт', subtitle: null },
      ...blocks,
      { kind: 'finish', id: 'f', title: 'Кінець', text: 'Готово' },
    ],
  };
}

describe('фикстура', () => {
  it('проходит все проверки целостности', () => {
    expect(findIntegrityIssues(SAMPLE_LESSON)).toEqual([]);
  });
});

describe('кривая сложности', () => {
  it('пропускает нарастающую последовательность', () => {
    const lesson = lessonWith([task('t1', 1), task('t2', 2), task('t3', 4)]);
    expect(findIntegrityIssues(lesson)).toEqual([]);
  });

  it('допускает повтор уровня, если урок в целом усложняется', () => {
    const lesson = lessonWith([task('t1', 1), task('t2', 2), task('t3', 2), task('t4', 3)]);
    expect(findIntegrityIssues(lesson)).toEqual([]);
  });

  it('ловит падение сложности', () => {
    const lesson = lessonWith([task('t1', 1), task('t2', 4), task('t3', 2)]);
    const issues = findIntegrityIssues(lesson);
    expect(issues.some((i) => i.includes('складність падає'))).toBe(true);
  });

  it('ловит урок только из лёгких заданий', () => {
    const lesson = lessonWith([task('t1', 1), task('t2', 1), task('t3', 1)]);
    const issues = findIntegrityIssues(lesson);
    expect(issues.some((i) => i.includes('не ускладнюється'))).toBe(true);
  });

  it('ловит урок только из сложных заданий', () => {
    const lesson = lessonWith([task('t1', 5), task('t2', 5), task('t3', 5)]);
    const issues = findIntegrityIssues(lesson);
    expect(issues.some((i) => i.includes('не ускладнюється'))).toBe(true);
  });

  it('не требует роста от урока из двух заданий', () => {
    const lesson = lessonWith([task('t1', 3), task('t2', 3)]);
    expect(findIntegrityIssues(lesson)).toEqual([]);
  });

  it('не учитывает запасные задания в кривой', () => {
    // Запасное сложное задание стоит посередине — на кривую влиять не должно.
    const lesson = lessonWith([task('t1', 1), task('bonus', 5, true), task('t2', 2), task('t3', 3)]);
    expect(findIntegrityIssues(lesson)).toEqual([]);
  });
});

describe('ссылочная целостность', () => {
  it('ловит correct_id, которого нет среди вариантов', () => {
    const broken = task('t1', 1);
    if (broken.kind !== 'task' || broken.interactive.type !== 'quiz') throw new Error('bad');
    broken.interactive.correct_id = 'неіснуючий';

    const issues = findIntegrityIssues(lessonWith([broken, task('t2', 3)]));
    expect(issues.some((i) => i.includes('correct_id'))).toBe(true);
  });

  it('ловит пропуск, которого нет в тексте', () => {
    const lesson = lessonWith([
      {
        kind: 'task',
        id: 't1',
        title: null,
        difficulty: 1,
        timer_sec: null,
        is_bonus: false,
        interactive: {
          type: 'fill_blank',
          text: 'Тут немає жодного пропуску.',
          blanks: [{ id: 'g1', accepted: ['1'] }],
          explanation: null,
        },
      },
      task('t2', 3),
    ]);

    const issues = findIntegrityIssues(lesson);
    expect(issues.some((i) => i.includes('не згаданий у тексті'))).toBe(true);
  });

  it('ловит несовпадение hp и числа раундов боса', () => {
    const lesson = lessonWith([
      task('t1', 1),
      task('t2', 3),
      {
        kind: 'boss',
        id: 'boss',
        title: 'Бос',
        intro: null,
        hp: 5,
        timer_sec: null,
        rounds: [
          {
            type: 'quiz',
            question: 'Питання',
            options: [
              { id: 'a', text: 'А' },
              { id: 'b', text: 'Б' },
            ],
            correct_id: 'a',
            explanation: null,
          },
          {
            type: 'quiz',
            question: 'Ще питання',
            options: [
              { id: 'c', text: 'В' },
              { id: 'd', text: 'Г' },
            ],
            correct_id: 'c',
            explanation: null,
          },
        ],
      },
    ]);

    const issues = findIntegrityIssues(lesson);
    expect(issues.some((i) => i.includes('hp=5'))).toBe(true);
  });
});
