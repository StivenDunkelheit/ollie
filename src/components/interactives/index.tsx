'use client';

import type { CheckResult, PublicInteractive, RevealedAnswer } from '@/lib/interactives';
import { QuizView } from './quiz-view';
import { MultipleChoiceView } from './multiple-choice-view';
import { FillBlankView } from './fill-blank-view';
import { MatchView } from './match-view';
import { SortView } from './sort-view';
import { DragDropView } from './drag-drop-view';

export interface InteractiveViewProps {
  interactive: PublicInteractive;
  /** Ответ ученика в формате, соответствующем типу интерактива. */
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  result?: CheckResult | null;
  revealed?: RevealedAnswer | null;
}

/**
 * Диспетчер: по типу задания выбирает компонент.
 *
 * `value` и `revealed` приходят как unknown и сужаются здесь: связь «тип
 * задания → тип ответа» держится в реестре (`lib/interactives`), а не в
 * пропсах компонента-обёртки.
 */
export function InteractiveView({
  interactive,
  value,
  onChange,
  disabled = false,
  result = null,
  revealed = null,
}: InteractiveViewProps) {
  const shared = { disabled, result, onChange } as const;

  switch (interactive.type) {
    case 'quiz':
      return (
        <QuizView
          {...shared}
          interactive={interactive}
          value={value as never}
          revealed={revealed?.type === 'quiz' ? revealed : null}
        />
      );
    case 'multiple_choice':
      return (
        <MultipleChoiceView
          {...shared}
          interactive={interactive}
          value={value as never}
          revealed={revealed?.type === 'multiple_choice' ? revealed : null}
        />
      );
    case 'fill_blank':
      return (
        <FillBlankView
          {...shared}
          interactive={interactive}
          value={value as never}
          revealed={revealed?.type === 'fill_blank' ? revealed : null}
        />
      );
    case 'match':
      return (
        <MatchView
          {...shared}
          interactive={interactive}
          value={value as never}
          revealed={revealed?.type === 'match' ? revealed : null}
        />
      );
    case 'sort':
      return (
        <SortView
          {...shared}
          interactive={interactive}
          value={value as never}
          revealed={revealed?.type === 'sort' ? revealed : null}
        />
      );
    case 'drag_drop':
      return (
        <DragDropView
          {...shared}
          interactive={interactive}
          value={value as never}
          revealed={revealed?.type === 'drag_drop' ? revealed : null}
        />
      );
  }
}
