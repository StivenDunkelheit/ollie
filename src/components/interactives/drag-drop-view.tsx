'use client';

import { useState } from 'react';
import type { PublicDragDrop } from '@/lib/interactives';
import type { DragDropInput } from '@/lib/interactives/drag-drop';
import type { InteractiveProps } from './types';
import { OptionButton, Prompt } from './option';
import { cn } from '@/lib/cn';

type Revealed = { type: 'drag_drop'; placement: { item_id: string; zone_id: string }[] };

/** Раскладка в два клика: элемент, потом зона. Тач-совместимо. */
export function DragDropView({
  interactive,
  value,
  onChange,
  disabled,
  result,
  revealed,
}: InteractiveProps<PublicDragDrop, DragDropInput, Revealed>) {
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const placement = revealed ? revealed.placement : (value?.placement ?? []);
  const zoneOf = new Map(placement.map((p) => [p.item_id, p.zone_id]));
  const label = new Map(interactive.items.map((o) => [o.id, o.text]));

  const unplaced = interactive.items.filter((item) => !zoneOf.has(item.id));

  function place(zoneId: string) {
    if (!activeItem) return;
    const next = placement.filter((p) => p.item_id !== activeItem);
    next.push({ item_id: activeItem, zone_id: zoneId });
    onChange({ placement: next });
    setActiveItem(null);
  }

  function remove(itemId: string) {
    onChange({ placement: placement.filter((p) => p.item_id !== itemId) });
  }

  const zoneTone = revealed
    ? 'border-emerald-400 bg-emerald-50'
    : result
      ? result.correct
        ? 'border-emerald-400 bg-emerald-50'
        : 'border-red-300 bg-red-50'
      : 'border-ink-200 bg-ink-50';

  return (
    <div>
      <Prompt>{interactive.instruction}</Prompt>

      <div className="mb-4 flex flex-wrap gap-2">
        {unplaced.length === 0 ? (
          <p className="text-ink-400 text-sm">Усі елементи розкладені.</p>
        ) : (
          unplaced.map((item) => (
            <OptionButton
              key={item.id}
              state={activeItem === item.id ? 'selected' : 'idle'}
              disabled={disabled}
              onClick={() => setActiveItem((c) => (c === item.id ? null : item.id))}
              className="w-auto px-3 py-2 text-sm"
            >
              {item.text}
            </OptionButton>
          ))
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {interactive.zones.map((zone) => {
          const inside = placement.filter((p) => p.zone_id === zone.id);
          return (
            <button
              key={zone.id}
              type="button"
              disabled={disabled || !activeItem}
              onClick={() => place(zone.id)}
              className={cn(
                'min-h-28 rounded-xl border-2 border-dashed p-3 text-left transition-colors',
                zoneTone,
                activeItem && !disabled && 'border-brand-400 bg-brand-50 cursor-pointer',
              )}
            >
              <p className="text-ink-600 mb-2 text-xs font-medium tracking-wide uppercase">
                {zone.text}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {inside.map((entry) => (
                  <span
                    key={entry.item_id}
                    className="ring-ink-200 inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-sm ring-1"
                  >
                    {label.get(entry.item_id) ?? entry.item_id}
                    {!disabled && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Прибрати"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(entry.item_id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            remove(entry.item_id);
                          }
                        }}
                        className="text-ink-400 hover:text-ink-700 cursor-pointer"
                      >
                        ✕
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {!disabled && (
        <p className="text-ink-500 mt-3 text-sm">
          {activeItem ? 'Тепер обери зону' : 'Обери елемент угорі'}
        </p>
      )}
    </div>
  );
}
