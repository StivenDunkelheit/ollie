'use client';

import type { Block, Interactive } from '@/lib/schema/lesson';
import { INTERACTIVE_LABEL } from '@/lib/labels';

/**
 * Правая панель викладача: правильный ответ и пояснение.
 *
 * Живёт только в Teacher Mode — это данные, которых в браузере ученика нет
 * ни при каких условиях.
 */

function answerText(interactive: Interactive): string[] {
  switch (interactive.type) {
    case 'quiz': {
      const option = interactive.options.find((o) => o.id === interactive.correct_id);
      return [option?.text ?? interactive.correct_id];
    }
    case 'multiple_choice':
      return interactive.correct_ids.map(
        (id) => interactive.options.find((o) => o.id === id)?.text ?? id,
      );
    case 'fill_blank':
      return interactive.blanks.map((blank) => `${blank.id}: ${blank.accepted.join(' / ')}`);
    case 'match': {
      const left = new Map(interactive.left.map((o) => [o.id, o.text]));
      const right = new Map(interactive.right.map((o) => [o.id, o.text]));
      return interactive.pairs.map(
        (pair) => `${left.get(pair.left_id) ?? pair.left_id} → ${right.get(pair.right_id) ?? pair.right_id}`,
      );
    }
    case 'sort': {
      const label = new Map(interactive.items.map((o) => [o.id, o.text]));
      return [interactive.correct_order.map((id) => label.get(id) ?? id).join(' → ')];
    }
    case 'drag_drop': {
      const item = new Map(interactive.items.map((o) => [o.id, o.text]));
      const zone = new Map(interactive.zones.map((o) => [o.id, o.text]));
      return interactive.placement.map(
        (entry) => `${item.get(entry.item_id) ?? entry.item_id} → ${zone.get(entry.zone_id) ?? entry.zone_id}`,
      );
    }
  }
}

function explanationOf(interactive: Interactive): string | null {
  return 'explanation' in interactive ? interactive.explanation : null;
}

/** Условие задания. У fill_blank его роль играет сам текст с пропусками. */
function promptOf(interactive: Interactive): string {
  if ('question' in interactive) return interactive.question;
  if ('instruction' in interactive) return interactive.instruction;
  return interactive.text;
}

export function AnswerPanel({ block, revealed }: { block: Block | null; revealed: boolean }) {
  if (!block) return <p className="text-ink-400 text-sm">Блок не вибрано.</p>;

  const interactives: Interactive[] =
    block.kind === 'task'
      ? [block.interactive]
      : block.kind === 'boss'
        ? (block.rounds as Interactive[])
        : block.kind === 'final_quiz'
          ? (block.questions as Interactive[])
          : [];

  if (interactives.length === 0) {
    return <p className="text-ink-400 text-sm">У цьому блоці немає завдання.</p>;
  }

  return (
    <div className="space-y-5">
      {revealed && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200 ring-inset">
          Відповідь показано учню.
        </p>
      )}

      {interactives.map((interactive, index) => {
        const explanation = explanationOf(interactive);
        return (
          <section key={index}>
            <p className="text-ink-400 mb-1 text-xs font-medium tracking-wide uppercase">
              {interactives.length > 1 ? `${index + 1}. ` : ''}
              {INTERACTIVE_LABEL[interactive.type]}
            </p>

            <p className="text-ink-500 mb-2 text-sm">{promptOf(interactive)}</p>

            <p className="text-ink-400 mb-1 text-xs">Правильна відповідь</p>
            <ul className="space-y-1">
              {answerText(interactive).map((line, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-900 ring-1 ring-emerald-200 ring-inset"
                >
                  {line}
                </li>
              ))}
            </ul>

            {explanation && <p className="text-ink-500 mt-2 text-sm italic">{explanation}</p>}
          </section>
        );
      })}
    </div>
  );
}
