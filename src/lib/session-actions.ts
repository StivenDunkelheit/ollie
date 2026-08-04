import type { Lesson } from '@/lib/schema/lesson';
import type { SessionState } from '@/lib/schema/session';
import type { SessionStatus } from '@/lib/supabase/types';

/**
 * Все действия викладача над сессией — одной чистой функцией.
 *
 * Состояние меняется только здесь и только на сервере: клиент присылает
 * намерение («далі», «показати відповідь»), а не готовое состояние. Так учень
 * не може підробити стан, а два клієнти не розходяться.
 */

export type SessionAction =
  | { type: 'start' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'goto'; index: number }
  | { type: 'skip' }
  | { type: 'reveal' }
  | { type: 'hide_block'; block_id: string }
  | { type: 'activate_bonus'; block_id: string }
  | { type: 'set_input_lock'; locked: boolean }
  | { type: 'set_student_nav'; enabled: boolean }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'end' };

export interface ApplyResult {
  state: SessionState;
  status: SessionStatus;
  /** Ничего не изменилось — можно не писать в базу. */
  unchanged?: boolean;
}

function clampIndex(state: SessionState, index: number): number {
  return Math.max(0, Math.min(state.route.length - 1, index));
}

export function applyAction(
  state: SessionState,
  status: SessionStatus,
  action: SessionAction,
  lesson: Lesson,
): ApplyResult {
  const bump = (next: Partial<SessionState>, nextStatus: SessionStatus = status): ApplyResult => ({
    state: { ...state, ...next, seq: state.seq + 1 },
    status: nextStatus,
  });

  switch (action.type) {
    case 'start':
      if (status === 'ended') return { state, status, unchanged: true };
      return bump({ current_index: 0 }, 'active');

    case 'next': {
      const index = clampIndex(state, state.current_index + 1);
      if (index === state.current_index) return { state, status, unchanged: true };
      return bump({ current_index: index });
    }

    case 'prev': {
      const index = clampIndex(state, state.current_index - 1);
      if (index === state.current_index) return { state, status, unchanged: true };
      return bump({ current_index: index });
    }

    case 'goto': {
      const index = clampIndex(state, action.index);
      if (index === state.current_index) return { state, status, unchanged: true };
      return bump({ current_index: index });
    }

    // Пропуск — то же движение вперёд; отдельный тип оставлен, чтобы позже
    // отметить блок как пропущенный в отчёте.
    case 'skip':
      return bump({ current_index: clampIndex(state, state.current_index + 1) });

    case 'reveal': {
      const blockId = state.route[state.current_index];
      if (!blockId || state.revealed.includes(blockId)) {
        return { state, status, unchanged: true };
      }
      return bump({ revealed: [...state.revealed, blockId] });
    }

    case 'hide_block': {
      const position = state.route.indexOf(action.block_id);
      if (position === -1) return { state, status, unchanged: true };

      const route = state.route.filter((id) => id !== action.block_id);
      if (route.length === 0) return { state, status, unchanged: true };

      // Убрали блок до текущего — индекс сдвигается, чтобы викладач залишився
      // на тому самому місці уроку.
      const current =
        position < state.current_index ? state.current_index - 1 : state.current_index;

      return bump({ route, current_index: Math.min(current, route.length - 1) });
    }

    case 'activate_bonus': {
      if (state.route.includes(action.block_id)) return { state, status, unchanged: true };

      const exists = lesson.blocks.some(
        (block) => block.id === action.block_id && block.kind === 'task' && block.is_bonus,
      );
      if (!exists) return { state, status, unchanged: true };

      // Запасное задание встаёт сразу после текущего блока.
      const route = [...state.route];
      route.splice(state.current_index + 1, 0, action.block_id);

      return bump({
        route,
        activated_bonus: [...state.activated_bonus, action.block_id],
      });
    }

    case 'set_input_lock':
      if (state.input_locked === action.locked) return { state, status, unchanged: true };
      return bump({ input_locked: action.locked });

    case 'set_student_nav':
      if (state.student_nav === action.enabled) return { state, status, unchanged: true };
      return bump({ student_nav: action.enabled });

    case 'pause':
      if (status !== 'active') return { state, status, unchanged: true };
      return bump({}, 'paused');

    case 'resume':
      if (status !== 'paused') return { state, status, unchanged: true };
      return bump({}, 'active');

    case 'end':
      if (status === 'ended') return { state, status, unchanged: true };
      return bump({}, 'ended');
  }
}
