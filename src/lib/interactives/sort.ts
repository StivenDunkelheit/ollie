import { z } from 'zod';
import type { Sort } from '@/lib/schema/lesson';
import { partial, type InteractiveDef } from './types';
import { ratio } from './normalize';

export const SortInputSchema = z.object({ order: z.array(z.string()) });
export type SortInput = z.infer<typeof SortInputSchema>;

export interface PublicSort {
  type: 'sort';
  instruction: string;
  items: { id: string; text: string }[];
}

export const sortDef: InteractiveDef<Sort, SortInput, PublicSort> = {
  type: 'sort',

  inputSchema: SortInputSchema,

  check(interactive, input) {
    const expected = interactive.correct_order;

    // Частичный балл по числу элементов, стоящих на своём месте.
    const hits = expected.filter((itemId, index) => input.order[index] === itemId).length;
    return partial(ratio(hits, expected.length));
  },

  sanitize(interactive) {
    return {
      type: 'sort',
      instruction: interactive.instruction,
      items: interactive.items.map((o) => ({ id: o.id, text: o.text })),
    };
  },

  aiDescription:
    'sort — упорядкувати елементи. ' +
    'Підходить для порядку кроків розв’язання, хронології, зростання/спадання, ' +
    'алгоритму дій. 3–8 елементів. У items давай їх у перемішаному порядку, ' +
    'а правильний — у correct_order.',
};
