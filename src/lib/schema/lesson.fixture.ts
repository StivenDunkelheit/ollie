import type { Lesson } from './lesson';

/**
 * Урок-образец: содержит все виды блоков и все шесть интерактивов.
 * Используется в тестах — в том числе как источник «секретных» значений,
 * которых не должно быть в публичной выдаче.
 */
export const SAMPLE_LESSON: Lesson = {
  title: 'Дроби: додавання і порівняння',
  grade: '5 клас',
  topic: 'Звичайні дроби',
  theme: 'pirates',
  story: {
    character_name: 'Капітан Дріб',
    intro: 'Скарб поділено на частини. Щоб зібрати карту, треба впоратися з дробами.',
    outro: 'Карта зібрана — скарб твій!',
  },
  blocks: [
    { kind: 'intro', id: 'b1', title: 'Полювання за скарбом', subtitle: 'Дроби, 5 клас' },
    { kind: 'story', id: 'b2', text: 'Стара карта розірвана на чотири шматки.' },
    {
      kind: 'task',
      id: 'b3',
      title: 'Що більше?',
      difficulty: 1,
      timer_sec: null,
      is_bonus: false,
      interactive: {
        type: 'quiz',
        question: 'Який дріб більший: 3/4 чи 2/3?',
        options: [
          { id: 'o1', text: '3/4' },
          { id: 'o2', text: '2/3' },
          { id: 'o3', text: 'Вони рівні' },
        ],
        correct_id: 'o1',
        explanation: 'Спільний знаменник 12: 9/12 проти 8/12.',
      },
    },
    {
      kind: 'task',
      id: 'b4',
      title: 'Оберіть усі правильні',
      difficulty: 2,
      timer_sec: 60,
      is_bonus: false,
      interactive: {
        type: 'multiple_choice',
        question: 'Які дроби скоротні?',
        options: [
          { id: 'm1', text: '4/8' },
          { id: 'm2', text: '3/7' },
          { id: 'm3', text: '6/9' },
          { id: 'm4', text: '5/11' },
        ],
        correct_ids: ['m1', 'm3'],
        explanation: null,
      },
    },
    {
      kind: 'task',
      id: 'b5',
      title: null,
      difficulty: 2,
      timer_sec: null,
      is_bonus: false,
      interactive: {
        type: 'fill_blank',
        text: 'Сума 1/4 + 1/4 дорівнює {{g1}}, а 1/2 + 1/2 дорівнює {{g2}}.',
        blanks: [
          { id: 'g1', accepted: ['1/2', '0.5', '0,5'] },
          { id: 'g2', accepted: ['1', 'одиниця'] },
        ],
        explanation: null,
      },
    },
    { kind: 'reward', id: 'b6', title: 'Перший шматок карти', text: 'Чудово!', icon: 'chest' },
    {
      kind: 'task',
      id: 'b7',
      title: 'З’єднай пари',
      difficulty: 3,
      timer_sec: null,
      is_bonus: false,
      interactive: {
        type: 'match',
        instruction: 'З’єднай дріб із його десятковим записом.',
        left: [
          { id: 'l1', text: '1/2' },
          { id: 'l2', text: '1/4' },
          { id: 'l3', text: '3/4' },
        ],
        right: [
          { id: 'r1', text: '0,25' },
          { id: 'r2', text: '0,5' },
          { id: 'r3', text: '0,75' },
        ],
        pairs: [
          { left_id: 'l1', right_id: 'r2' },
          { left_id: 'l2', right_id: 'r1' },
          { left_id: 'l3', right_id: 'r3' },
        ],
      },
    },
    {
      kind: 'task',
      id: 'b8',
      title: 'За зростанням',
      difficulty: 4,
      timer_sec: null,
      is_bonus: false,
      interactive: {
        type: 'sort',
        instruction: 'Розстав дроби за зростанням.',
        items: [
          { id: 's1', text: '3/4' },
          { id: 's2', text: '1/4' },
          { id: 's3', text: '1/2' },
        ],
        correct_order: ['s2', 's3', 's1'],
      },
    },
    {
      kind: 'task',
      id: 'b9',
      title: 'Розклади по скринях',
      difficulty: 5,
      timer_sec: null,
      is_bonus: true,
      interactive: {
        type: 'drag_drop',
        instruction: 'Розклади дроби на правильні та неправильні.',
        items: [
          { id: 'd1', text: '2/3' },
          { id: 'd2', text: '5/4' },
          { id: 'd3', text: '7/8' },
          { id: 'd4', text: '9/5' },
        ],
        zones: [
          { id: 'z1', text: 'Правильні' },
          { id: 'z2', text: 'Неправильні' },
        ],
        placement: [
          { item_id: 'd1', zone_id: 'z1' },
          { item_id: 'd2', zone_id: 'z2' },
          { item_id: 'd3', zone_id: 'z1' },
          { item_id: 'd4', zone_id: 'z2' },
        ],
      },
    },
    {
      kind: 'boss',
      id: 'b10',
      title: 'Бій зі Штормом',
      intro: 'Шторм має 3 HP. Кожна правильна відповідь — влучний постріл.',
      hp: 3,
      timer_sec: 45,
      rounds: [
        {
          type: 'quiz',
          question: '1/3 + 1/3 = ?',
          options: [
            { id: 'q1', text: '2/3' },
            { id: 'q2', text: '2/6' },
          ],
          correct_id: 'q1',
          explanation: null,
        },
        {
          type: 'fill_blank',
          text: '2/5 + 1/5 = {{bg1}}',
          blanks: [{ id: 'bg1', accepted: ['3/5'] }],
          explanation: null,
        },
        {
          type: 'multiple_choice',
          question: 'Які з дробів менші за 1?',
          options: [
            { id: 'bm1', text: '4/5' },
            { id: 'bm2', text: '6/5' },
            { id: 'bm3', text: '1/9' },
          ],
          correct_ids: ['bm1', 'bm3'],
          explanation: null,
        },
      ],
    },
    {
      kind: 'final_quiz',
      id: 'b11',
      title: 'Фінальна перевірка',
      questions: [
        {
          type: 'quiz',
          question: 'Скільки чвертей у цілому?',
          options: [
            { id: 'f1', text: '2' },
            { id: 'f2', text: '4' },
          ],
          correct_id: 'f2',
          explanation: null,
        },
        {
          type: 'quiz',
          question: '1/2 це скільки восьмих?',
          options: [
            { id: 'f3', text: '4/8' },
            { id: 'f4', text: '2/8' },
          ],
          correct_id: 'f3',
          explanation: null,
        },
        {
          type: 'fill_blank',
          text: '3/6 після скорочення дорівнює {{fg1}}.',
          blanks: [{ id: 'fg1', accepted: ['1/2', '0,5'] }],
          explanation: null,
        },
      ],
    },
    { kind: 'stats', id: 'b12', title: 'Твої результати' },
    { kind: 'finish', id: 'b13', title: 'Скарб знайдено!', text: 'Ти впорався з дробами.' },
  ],
};
