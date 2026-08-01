import { z } from 'zod';
import type { Match } from '@/lib/schema/lesson';
import { partial, type InteractiveDef } from './types';
import { ratio } from './normalize';

export const MatchInputSchema = z.object({
  pairs: z.array(z.object({ left_id: z.string(), right_id: z.string() })),
});
export type MatchInput = z.infer<typeof MatchInputSchema>;

export interface PublicMatch {
  type: 'match';
  instruction: string;
  left: { id: string; text: string }[];
  right: { id: string; text: string }[];
}

export const matchDef: InteractiveDef<Match, MatchInput, PublicMatch> = {
  type: 'match',

  inputSchema: MatchInputSchema,

  check(interactive, input) {
    const expected = new Map(interactive.pairs.map((p) => [p.left_id, p.right_id]));

    // Ученик мог соединить один и тот же left дважды — засчитываем первое.
    const seen = new Set<string>();
    let hits = 0;
    for (const pair of input.pairs) {
      if (seen.has(pair.left_id)) continue;
      seen.add(pair.left_id);
      if (expected.get(pair.left_id) === pair.right_id) hits += 1;
    }

    return partial(ratio(hits, expected.size));
  },

  sanitize(interactive) {
    return {
      type: 'match',
      instruction: interactive.instruction,
      left: interactive.left.map((o) => ({ id: o.id, text: o.text })),
      right: interactive.right.map((o) => ({ id: o.id, text: o.text })),
    };
  },

  aiDescription:
    'match — з’єднати елементи двох колонок парами. ' +
    'Підходить для «формула ↔ назва», «термін ↔ означення», «графік ↔ рівняння», ' +
    'перекладу слів. 2–8 пар. Права колонка може містити зайві варіанти-пастки.',
};
