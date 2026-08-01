import { describe, expect, it } from 'vitest';
import type { Interactive } from '@/lib/schema/lesson';
import { checkAnswer } from './index';
import { normalizeAnswer } from './normalize';

function score(interactive: Interactive, input: unknown): number {
  const outcome = checkAnswer(interactive, input);
  if (!outcome.ok) throw new Error(`ввід відхилено: ${outcome.error}`);
  return outcome.result.score;
}

describe('quiz', () => {
  const quiz: Interactive = {
    type: 'quiz',
    question: '2 + 2 = ?',
    options: [
      { id: 'a', text: '3' },
      { id: 'b', text: '4' },
    ],
    correct_id: 'b',
    explanation: null,
  };

  it('засчитывает правильный вариант', () => {
    expect(checkAnswer(quiz, { option_id: 'b' })).toEqual({
      ok: true,
      result: { correct: true, score: 1 },
    });
  });

  it('не засчитывает неправильный', () => {
    expect(score(quiz, { option_id: 'a' })).toBe(0);
  });

  it('не засчитывает несуществующий вариант', () => {
    expect(score(quiz, { option_id: 'zzz' })).toBe(0);
  });

  it('отклоняет ввод не по схеме', () => {
    expect(checkAnswer(quiz, { option: 'b' })).toEqual({
      ok: false,
      error: 'Некоректний формат відповіді.',
    });
  });
});

describe('multiple_choice', () => {
  const mc: Interactive = {
    type: 'multiple_choice',
    question: 'Які числа парні?',
    options: [
      { id: 'a', text: '2' },
      { id: 'b', text: '3' },
      { id: 'c', text: '4' },
      { id: 'd', text: '5' },
    ],
    correct_ids: ['a', 'c'],
    explanation: null,
  };

  it('даёт 1 за точное совпадение', () => {
    expect(score(mc, { option_ids: ['a', 'c'] })).toBe(1);
    expect(score(mc, { option_ids: ['c', 'a'] })).toBe(1);
  });

  it('даёт половину за один из двух', () => {
    expect(score(mc, { option_ids: ['a'] })).toBe(0.5);
  });

  it('штрафует за лишний выбор', () => {
    // Два правильных и один лишний: 2 - 1 = 1 из 2.
    expect(score(mc, { option_ids: ['a', 'c', 'b'] })).toBe(0.5);
  });

  it('не даёт баллов за выбор всего подряд', () => {
    expect(score(mc, { option_ids: ['a', 'b', 'c', 'd'] })).toBe(0);
  });

  it('даёт 0 за пустой ответ', () => {
    expect(score(mc, { option_ids: [] })).toBe(0);
  });
});

describe('fill_blank', () => {
  const fb: Interactive = {
    type: 'fill_blank',
    text: '{{a}} і {{b}}',
    blanks: [
      { id: 'a', accepted: ['1/2', '0.5'] },
      { id: 'b', accepted: ['Київ'] },
    ],
    explanation: null,
  };

  it('принимает любой из вариантов', () => {
    expect(score(fb, { values: { a: '1/2', b: 'Київ' } })).toBe(1);
    expect(score(fb, { values: { a: '0.5', b: 'Київ' } })).toBe(1);
  });

  it('нечувствителен к регистру и лишним пробелам', () => {
    expect(score(fb, { values: { a: ' 1/2 ', b: 'київ' } })).toBe(1);
  });

  it('принимает запятую как десятичный разделитель', () => {
    expect(score(fb, { values: { a: '0,5', b: 'Київ' } })).toBe(1);
  });

  it('даёт частичный балл', () => {
    expect(score(fb, { values: { a: '1/2', b: 'Львів' } })).toBe(0.5);
  });

  it('даёт 0 за пропущенные поля', () => {
    expect(score(fb, { values: {} })).toBe(0);
    expect(score(fb, { values: { a: '   ', b: '' } })).toBe(0);
  });
});

describe('match', () => {
  const match: Interactive = {
    type: 'match',
    instruction: 'З’єднай',
    left: [
      { id: 'l1', text: 'A' },
      { id: 'l2', text: 'B' },
    ],
    right: [
      { id: 'r1', text: '1' },
      { id: 'r2', text: '2' },
    ],
    pairs: [
      { left_id: 'l1', right_id: 'r1' },
      { left_id: 'l2', right_id: 'r2' },
    ],
  };

  it('даёт 1 за все верные пары в любом порядке', () => {
    expect(
      score(match, {
        pairs: [
          { left_id: 'l2', right_id: 'r2' },
          { left_id: 'l1', right_id: 'r1' },
        ],
      }),
    ).toBe(1);
  });

  it('даёт частичный балл', () => {
    expect(
      score(match, {
        pairs: [
          { left_id: 'l1', right_id: 'r1' },
          { left_id: 'l2', right_id: 'r1' },
        ],
      }),
    ).toBe(0.5);
  });

  it('не даёт накрутить балл повторами одного элемента', () => {
    expect(
      score(match, {
        pairs: [
          { left_id: 'l1', right_id: 'r1' },
          { left_id: 'l1', right_id: 'r1' },
        ],
      }),
    ).toBe(0.5);
  });
});

describe('sort', () => {
  const sort: Interactive = {
    type: 'sort',
    instruction: 'За зростанням',
    items: [
      { id: 'a', text: '3' },
      { id: 'b', text: '1' },
      { id: 'c', text: '2' },
    ],
    correct_order: ['b', 'c', 'a'],
  };

  it('даёт 1 за точный порядок', () => {
    expect(score(sort, { order: ['b', 'c', 'a'] })).toBe(1);
  });

  it('считает элементы на своих местах', () => {
    // b на месте, c и a переставлены.
    expect(score(sort, { order: ['b', 'a', 'c'] })).toBeCloseTo(1 / 3);
  });

  it('даёт 0 за полностью обратный порядок', () => {
    expect(score(sort, { order: ['a', 'b', 'c'] })).toBe(0);
  });

  it('переживает неполный ответ', () => {
    expect(score(sort, { order: ['b'] })).toBeCloseTo(1 / 3);
  });
});

describe('drag_drop', () => {
  const dd: Interactive = {
    type: 'drag_drop',
    instruction: 'Розклади',
    items: [
      { id: 'i1', text: '2' },
      { id: 'i2', text: '3' },
    ],
    zones: [
      { id: 'z1', text: 'Парні' },
      { id: 'z2', text: 'Непарні' },
    ],
    placement: [
      { item_id: 'i1', zone_id: 'z1' },
      { item_id: 'i2', zone_id: 'z2' },
    ],
  };

  it('даёт 1 за верное распределение', () => {
    expect(
      score(dd, {
        placement: [
          { item_id: 'i2', zone_id: 'z2' },
          { item_id: 'i1', zone_id: 'z1' },
        ],
      }),
    ).toBe(1);
  });

  it('даёт частичный балл', () => {
    expect(
      score(dd, {
        placement: [
          { item_id: 'i1', zone_id: 'z1' },
          { item_id: 'i2', zone_id: 'z1' },
        ],
      }),
    ).toBe(0.5);
  });

  it('даёт 0, если ничего не разложено', () => {
    expect(score(dd, { placement: [] })).toBe(0);
  });
});

describe('normalizeAnswer', () => {
  it('приводит числа к единому виду', () => {
    expect(normalizeAnswer('1 000,5')).toBe('1000.5');
    expect(normalizeAnswer('+42')).toBe('42');
    expect(normalizeAnswer(' 7 ')).toBe('7');
  });

  it('не ломает текст', () => {
    expect(normalizeAnswer('  Київ   столиця ')).toBe('київ столиця');
  });
});
