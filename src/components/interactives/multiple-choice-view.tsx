'use client';

import type { PublicMultipleChoice } from '@/lib/interactives';
import type { MultipleChoiceInput } from '@/lib/interactives/multiple-choice';
import type { InteractiveProps } from './types';
import { OptionButton, Prompt, type OptionState } from './option';

type Revealed = { type: 'multiple_choice'; correct_ids: string[] };

export function MultipleChoiceView({
  interactive,
  value,
  onChange,
  disabled,
  result,
  revealed,
}: InteractiveProps<PublicMultipleChoice, MultipleChoiceInput, Revealed>) {
  const chosen = new Set(value?.option_ids ?? []);

  function toggle(optionId: string) {
    const next = new Set(chosen);
    if (next.has(optionId)) next.delete(optionId);
    else next.add(optionId);
    onChange({ option_ids: [...next] });
  }

  function stateOf(optionId: string): OptionState {
    const picked = chosen.has(optionId);

    if (revealed) {
      const isCorrect = revealed.correct_ids.includes(optionId);
      if (isCorrect) return 'correct';
      return picked ? 'wrong' : 'muted';
    }
    // После проверки не подсвечиваем поштучно — иначе ученик подберёт ответ
    // перебором с одной попытки.
    if (result) return picked ? (result.correct ? 'correct' : 'wrong') : 'idle';
    return picked ? 'selected' : 'idle';
  }

  return (
    <div>
      <Prompt>{interactive.question}</Prompt>
      <p className="text-ink-500 mb-3 text-sm">
        Обери варіантів: {interactive.correct_count}
      </p>
      <div className="space-y-2">
        {interactive.options.map((option) => (
          <OptionButton
            key={option.id}
            state={stateOf(option.id)}
            disabled={disabled}
            onClick={() => toggle(option.id)}
          >
            <span className="flex items-center gap-3">
              <span
                aria-hidden
                className={
                  'inline-block size-4 shrink-0 rounded border ' +
                  (chosen.has(option.id) ? 'border-brand-600 bg-brand-600' : 'border-ink-300')
                }
              />
              {option.text}
            </span>
          </OptionButton>
        ))}
      </div>
    </div>
  );
}
