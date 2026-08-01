import { z } from 'zod';
import type { DragDrop } from '@/lib/schema/lesson';
import { partial, type InteractiveDef } from './types';
import { ratio } from './normalize';

export const DragDropInputSchema = z.object({
  placement: z.array(z.object({ item_id: z.string(), zone_id: z.string() })),
});
export type DragDropInput = z.infer<typeof DragDropInputSchema>;

export interface PublicDragDrop {
  type: 'drag_drop';
  instruction: string;
  items: { id: string; text: string }[];
  zones: { id: string; text: string }[];
}

export const dragDropDef: InteractiveDef<DragDrop, DragDropInput, PublicDragDrop> = {
  type: 'drag_drop',

  inputSchema: DragDropInputSchema,

  check(interactive, input) {
    const expected = new Map(interactive.placement.map((p) => [p.item_id, p.zone_id]));

    const seen = new Set<string>();
    let hits = 0;
    for (const placed of input.placement) {
      if (seen.has(placed.item_id)) continue;
      seen.add(placed.item_id);
      if (expected.get(placed.item_id) === placed.zone_id) hits += 1;
    }

    return partial(ratio(hits, expected.size));
  },

  sanitize(interactive) {
    return {
      type: 'drag_drop',
      instruction: interactive.instruction,
      items: interactive.items.map((o) => ({ id: o.id, text: o.text })),
      zones: interactive.zones.map((z) => ({ id: z.id, text: z.text })),
    };
  },

  aiDescription:
    'drag_drop — розкласти елементи по зонах-категоріях. ' +
    'Підходить для класифікації (парні/непарні, живе/неживе, частини мови), ' +
    'сортування за ознакою, підстановки у формулу. 2–5 зон, 2–10 елементів. ' +
    'Кожен елемент належить рівно одній зоні.',
};
