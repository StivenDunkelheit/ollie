'use client';

import type { PublicQuiz } from '@/lib/interactives';
import type { QuizInput } from '@/lib/interactives/quiz';
import type { InteractiveProps } from './types';
import { OptionButton, Prompt, type OptionState } from './option';

type Revealed = { type: 'quiz'; correct_id: string };

export function QuizView({
  interactive,
  value,
  onChange,
  disabled,
  result,
  revealed,
}: InteractiveProps<PublicQuiz, QuizInput, Revealed>) {
  function stateOf(optionId: string): OptionState {
    const chosen = value?.option_id === optionId;

    if (revealed) {
      if (optionId === revealed.correct_id) return 'correct';
      return chosen ? 'wrong' : 'muted';
    }
    if (result && chosen) return result.correct ? 'correct' : 'wrong';
    return chosen ? 'selected' : 'idle';
  }

  return (
    <div>
      <Prompt>{interactive.question}</Prompt>
      <div className="space-y-2">
        {interactive.options.map((option) => (
          <OptionButton
            key={option.id}
            state={stateOf(option.id)}
            disabled={disabled}
            onClick={() => onChange({ option_id: option.id })}
          >
            {option.text}
          </OptionButton>
        ))}
      </div>
    </div>
  );
}
