import { z } from 'zod';
import type { MultipleChoice } from '@/lib/schema/lesson';
import { partial, type InteractiveDef } from './types';
import { ratio } from './normalize';

export const MultipleChoiceInputSchema = z.object({ option_ids: z.array(z.string()) });
export type MultipleChoiceInput = z.infer<typeof MultipleChoiceInputSchema>;

export interface PublicMultipleChoice {
  type: 'multiple_choice';
  question: string;
  options: { id: string; text: string }[];
  /** Сколько вариантов нужно выбрать — подсказка без раскрытия каких именно. */
  correct_count: number;
}

export const multipleChoiceDef: InteractiveDef<
  MultipleChoice,
  MultipleChoiceInput,
  PublicMultipleChoice
> = {
  type: 'multiple_choice',

  inputSchema: MultipleChoiceInputSchema,

  check(interactive, input) {
    const expected = new Set(interactive.correct_ids);
    const chosen = new Set(input.option_ids);

    // Каждый лишний выбор гасит один правильный: иначе «выбрать всё» = 100%.
    let hits = 0;
    let misses = 0;
    for (const optionId of chosen) {
      if (expected.has(optionId)) hits += 1;
      else misses += 1;
    }

    return partial(ratio(Math.max(0, hits - misses), expected.size));
  },

  sanitize(interactive) {
    return {
      type: 'multiple_choice',
      question: interactive.question,
      options: interactive.options.map((o) => ({ id: o.id, text: o.text })),
      correct_count: interactive.correct_ids.length,
    };
  },

  aiDescription:
    'multiple_choice — питання, де правильних варіантів кілька. ' +
    'Підходить для «оберіть усі вірні твердження», властивостей, класифікації ознак. ' +
    '3–8 варіантів, щонайменше 2 правильні. Учень бачить, скільки треба обрати.',
};
