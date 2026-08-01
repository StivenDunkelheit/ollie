import type { Block } from '@/lib/schema/lesson';
import { BLOCK_LABEL, INTERACTIVE_LABEL } from '@/lib/labels';

/** Краткое описание блока — то, по чему викладач розуміє, що всередині. */
function summary(block: Block): string {
  switch (block.kind) {
    case 'intro':
      return block.subtitle ?? block.title;
    case 'story':
      return block.text;
    case 'task':
      return block.title ?? INTERACTIVE_LABEL[block.interactive.type];
    case 'reward':
      return block.title;
    case 'boss':
      return `${block.rounds.length} раундів`;
    case 'final_quiz':
      return `${block.questions.length} питань`;
    case 'stats':
      return block.title;
    case 'finish':
      return block.title;
  }
}

function badge(block: Block): string | null {
  if (block.kind === 'task') return INTERACTIVE_LABEL[block.interactive.type];
  return null;
}

export function LessonOutline({ blocks }: { blocks: Block[] }) {
  return (
    <ol className="ring-ink-200 divide-ink-100 divide-y overflow-hidden rounded-2xl bg-white ring-1">
      {blocks.map((block, index) => (
        <li key={block.id} className="flex items-start gap-3 px-4 py-3">
          <span className="bg-ink-100 text-ink-600 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
            {index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ink-900 text-sm font-medium">{BLOCK_LABEL[block.kind]}</span>

              {badge(block) && (
                <span className="bg-brand-50 text-brand-700 ring-brand-200 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset">
                  {badge(block)}
                </span>
              )}

              {'timer_sec' in block && block.timer_sec !== null && (
                <span className="text-ink-600 ring-ink-200 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset">
                  {block.timer_sec} с
                </span>
              )}

              {block.kind === 'task' && block.is_bonus && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 ring-1 ring-amber-200 ring-inset">
                  Запасне
                </span>
              )}
            </div>

            <p className="text-ink-500 mt-0.5 truncate text-sm">{summary(block)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
