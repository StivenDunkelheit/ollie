import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { parseLesson, type Lesson } from '@/lib/schema/lesson';
import { parseSessionState, currentBlockId, type SessionState } from '@/lib/schema/session';
import { isValidTokenShape } from '@/lib/session-token';
import { revealAnswer, sanitizeBlock, type PublicBlock, type RevealedAnswer } from '@/lib/interactives';
import type { SessionStatus } from '@/lib/supabase/types';

/**
 * Загрузка сессии по токену ученика.
 *
 * Ходит под secret-ключом в обход RLS — поэтому проверка токена и срока
 * действия живёт здесь и обязательна для каждого публичного маршрута.
 */

export type SessionLookup =
  | { ok: true; session: LoadedSession }
  | { ok: false; reason: 'not_found' | 'expired' };

export interface LoadedSession {
  id: string;
  status: SessionStatus;
  studentName: string | null;
  lesson: Lesson;
  state: SessionState;
  expiresAt: string;
}

export async function loadSessionByToken(token: string): Promise<SessionLookup> {
  if (!isValidTokenShape(token)) return { ok: false, reason: 'not_found' };

  const admin = createAdminClient();
  const { data } = await admin
    .from('sessions')
    .select('id, status, student_name, content_snapshot, state, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!data) return { ok: false, reason: 'not_found' };

  if (data.status !== 'ended' && new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  const lesson = parseLesson(data.content_snapshot);
  const state = parseSessionState(data.state);
  if (!lesson || !state) return { ok: false, reason: 'not_found' };

  return {
    ok: true,
    session: {
      id: data.id,
      status: data.status,
      studentName: data.student_name,
      lesson,
      state,
      expiresAt: data.expires_at,
    },
  };
}

/**
 * То, что уходит в браузер ученика.
 *
 * Ни маршрута, ни списка запасных заданий: только текущий блок и позиция.
 * Ученик не должен знать ни структуру уроку, ні того, що якесь завдання запасне.
 */
export interface PublicSessionView {
  status: SessionStatus;
  student_name: string | null;
  block: PublicBlock | null;
  position: { index: number; total: number };
  input_locked: boolean;
  student_nav: boolean;
  revealed: RevealedAnswer | null;
  seq: number;
}

export function toPublicView(session: LoadedSession): PublicSessionView {
  const { lesson, state } = session;
  const blockId = currentBlockId(state);
  const block = blockId ? lesson.blocks.find((b) => b.id === blockId) : undefined;

  // Ответ раскрывается, только если викладач явно натиснув «Показати відповідь».
  let revealed: RevealedAnswer | null = null;
  if (block && blockId && state.revealed.includes(blockId)) {
    if (block.kind === 'task') revealed = revealAnswer(block.interactive);
  }

  return {
    status: session.status,
    student_name: session.studentName,
    // Пока урок не начат, контент не отдаём вовсе.
    block: block && session.status !== 'waiting' ? sanitizeBlock(block) : null,
    position: { index: state.current_index, total: state.route.length },
    input_locked: state.input_locked || session.status === 'paused',
    student_nav: state.student_nav,
    revealed,
    seq: state.seq,
  };
}
