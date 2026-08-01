import type { BlockKind, InteractiveType } from '@/lib/schema/lesson';

export const BLOCK_LABEL: Record<BlockKind, string> = {
  intro: 'Стартовий екран',
  story: 'Сюжет',
  task: 'Завдання',
  reward: 'Нагорода',
  boss: 'Boss Battle',
  final_quiz: 'Фінальний квіз',
  stats: 'Статистика',
  finish: 'Завершення',
};

export const INTERACTIVE_LABEL: Record<InteractiveType, string> = {
  quiz: 'Quiz',
  multiple_choice: 'Multiple Choice',
  fill_blank: 'Fill in the Blank',
  match: 'Match',
  sort: 'Sort',
  drag_drop: 'Drag & Drop',
};
