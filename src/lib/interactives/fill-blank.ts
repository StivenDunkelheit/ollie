import { z } from 'zod';
import type { FillBlank } from '@/lib/schema/lesson';
import { partial, type InteractiveDef } from './types';
import { matchesAny, ratio } from './normalize';

export const FillBlankInputSchema = z.object({
  values: z.record(z.string(), z.string()),
});
export type FillBlankInput = z.infer<typeof FillBlankInputSchema>;

export interface PublicFillBlank {
  type: 'fill_blank';
  text: string;
  blank_ids: string[];
}

export const fillBlankDef: InteractiveDef<FillBlank, FillBlankInput, PublicFillBlank> = {
  type: 'fill_blank',

  inputSchema: FillBlankInputSchema,

  check(interactive, input) {
    const hits = interactive.blanks.filter((blank) =>
      matchesAny(input.values[blank.id] ?? '', blank.accepted),
    ).length;

    return partial(ratio(hits, interactive.blanks.length));
  },

  sanitize(interactive) {
    return {
      type: 'fill_blank',
      text: interactive.text,
      blank_ids: interactive.blanks.map((b) => b.id),
    };
  },

  aiDescription:
    'fill_blank — текст із пропусками, учень вписує відповідь. ' +
    'Підходить для формул, означень, пропущених чисел, обчислень. ' +
    'Пропуски позначай у тексті як {{id}}. Для кожного пропуску перелічи в accepted ' +
    'усі прийнятні варіанти: синоніми, різні форми запису числа (0.5 і 1/2), ' +
    'з одиницями виміру і без. Порівняння нечутливе до регістру й зайвих пробілів.',
};
