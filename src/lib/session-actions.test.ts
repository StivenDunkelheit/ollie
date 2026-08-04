import { describe, expect, it } from 'vitest';
import { SAMPLE_LESSON } from '@/lib/schema/lesson.fixture';
import { initialState } from '@/lib/schema/session';
import { applyAction, type SessionAction } from './session-actions';
import type { SessionStatus } from '@/lib/supabase/types';

const lesson = SAMPLE_LESSON;

function run(actions: SessionAction[], startStatus: SessionStatus = 'waiting') {
  let state = initialState(lesson);
  let status = startStatus;
  for (const action of actions) {
    const result = applyAction(state, status, action, lesson);
    state = result.state;
    status = result.status;
  }
  return { state, status };
}

describe('initialState', () => {
  it('не включает запасные задания в маршрут', () => {
    const state = initialState(lesson);
    const bonus = lesson.blocks.find((b) => b.kind === 'task' && b.is_bonus)!;
    expect(state.route).not.toContain(bonus.id);
    expect(state.route).toHaveLength(lesson.blocks.length - 1);
  });
});

describe('навигация', () => {
  it('start переводит сессию в active', () => {
    const { status, state } = run([{ type: 'start' }]);
    expect(status).toBe('active');
    expect(state.current_index).toBe(0);
  });

  it('next и prev двигают позицию', () => {
    const { state } = run([{ type: 'start' }, { type: 'next' }, { type: 'next' }, { type: 'prev' }]);
    expect(state.current_index).toBe(1);
  });

  it('не уходит за границы маршрута', () => {
    const back = run([{ type: 'start' }, { type: 'prev' }]);
    expect(back.state.current_index).toBe(0);

    const far = run([{ type: 'start' }, { type: 'goto', index: 999 }]);
    expect(far.state.current_index).toBe(far.state.route.length - 1);
  });

  it('увеличивает seq на каждое изменение', () => {
    const { state } = run([{ type: 'start' }, { type: 'next' }]);
    expect(state.seq).toBe(2);
  });

  it('не увеличивает seq, когда ничего не изменилось', () => {
    const state = initialState(lesson);
    const result = applyAction(state, 'active', { type: 'prev' }, lesson);
    expect(result.unchanged).toBe(true);
    expect(result.state.seq).toBe(state.seq);
  });
});

describe('показ ответа', () => {
  it('запоминает блок, для которого ответ раскрыт', () => {
    const { state } = run([{ type: 'start' }, { type: 'next' }, { type: 'next' }, { type: 'reveal' }]);
    expect(state.revealed).toEqual([state.route[state.current_index]]);
  });

  it('повторный показ ничего не меняет', () => {
    const first = run([{ type: 'start' }, { type: 'reveal' }]);
    const again = applyAction(first.state, first.status, { type: 'reveal' }, lesson);
    expect(again.unchanged).toBe(true);
  });
});

describe('скрытие блока', () => {
  it('убирает блок из маршрута', () => {
    const start = run([{ type: 'start' }]);
    const target = start.state.route[3];
    const result = applyAction(start.state, start.status, { type: 'hide_block', block_id: target }, lesson);

    expect(result.state.route).not.toContain(target);
    expect(result.state.route).toHaveLength(start.state.route.length - 1);
  });

  it('удерживает викладача на том же блоке, если скрыт предыдущий', () => {
    const start = run([{ type: 'start' }, { type: 'next' }, { type: 'next' }, { type: 'next' }]);
    const currentBefore = start.state.route[start.state.current_index];
    const earlier = start.state.route[1];

    const result = applyAction(start.state, start.status, { type: 'hide_block', block_id: earlier }, lesson);
    expect(result.state.route[result.state.current_index]).toBe(currentBefore);
  });
});

describe('запасные задания', () => {
  const bonusId = lesson.blocks.find((b) => b.kind === 'task' && b.is_bonus)!.id;

  it('вставляет запасное сразу после текущего блока', () => {
    const start = run([{ type: 'start' }, { type: 'next' }]);
    const result = applyAction(start.state, start.status, { type: 'activate_bonus', block_id: bonusId }, lesson);

    expect(result.state.route[start.state.current_index + 1]).toBe(bonusId);
    expect(result.state.activated_bonus).toContain(bonusId);
  });

  it('не выдаёт одно и то же задание дважды', () => {
    const start = run([{ type: 'start' }]);
    const once = applyAction(start.state, start.status, { type: 'activate_bonus', block_id: bonusId }, lesson);
    const twice = applyAction(once.state, once.status, { type: 'activate_bonus', block_id: bonusId }, lesson);
    expect(twice.unchanged).toBe(true);
  });

  it('игнорирует блок, который не является запасным', () => {
    const start = run([{ type: 'start' }]);
    const regular = lesson.blocks.find((b) => b.kind === 'task' && !b.is_bonus)!.id;
    const result = applyAction(start.state, start.status, { type: 'activate_bonus', block_id: regular }, lesson);
    expect(result.unchanged).toBe(true);
  });
});

describe('пауза и завершение', () => {
  it('пауза и продолжение переключают статус', () => {
    const paused = run([{ type: 'start' }, { type: 'pause' }]);
    expect(paused.status).toBe('paused');

    const resumed = applyAction(paused.state, paused.status, { type: 'resume' }, lesson);
    expect(resumed.status).toBe('active');
  });

  it('нельзя поставить на паузу незапущенный урок', () => {
    const result = applyAction(initialState(lesson), 'waiting', { type: 'pause' }, lesson);
    expect(result.unchanged).toBe(true);
  });

  it('завершённый урок нельзя запустить заново', () => {
    const ended = run([{ type: 'start' }, { type: 'end' }]);
    expect(ended.status).toBe('ended');

    const restart = applyAction(ended.state, ended.status, { type: 'start' }, lesson);
    expect(restart.unchanged).toBe(true);
  });
});
