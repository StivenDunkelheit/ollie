import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseLesson } from '@/lib/schema/lesson';
import { parseSessionState } from '@/lib/schema/session';
import { applyAction, type SessionAction } from '@/lib/session-actions';
import type { Database, Json, SessionStatus } from '@/lib/supabase/types';

const ActionSchema: z.ZodType<SessionAction> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('next') }),
  z.object({ type: z.literal('prev') }),
  z.object({ type: z.literal('goto'), index: z.number().int().min(0).max(200) }),
  z.object({ type: z.literal('skip') }),
  z.object({ type: z.literal('reveal') }),
  z.object({ type: z.literal('hide_block'), block_id: z.string().min(1) }),
  z.object({ type: z.literal('activate_bonus'), block_id: z.string().min(1) }),
  z.object({ type: z.literal('set_input_lock'), locked: z.boolean() }),
  z.object({ type: z.literal('set_student_nav'), enabled: z.boolean() }),
  z.object({ type: z.literal('pause') }),
  z.object({ type: z.literal('resume') }),
  z.object({ type: z.literal('end') }),
]);

/**
 * Управление сессией. Клиент присылает намерение, состояние считает сервер —
 * см. `applyAction`. RLS не отдаст чужую сессию, поэтому владельца отдельно
 * проверять не нужно.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Потрібна авторизація.' }, { status: 401 });

  const body = ActionSchema.safeParse((await request.json().catch(() => null))?.action);
  if (!body.success) return NextResponse.json({ error: 'Невідома дія.' }, { status: 400 });

  const { data: session } = await supabase
    .from('sessions')
    .select('id, status, state, content_snapshot')
    .eq('id', id)
    .maybeSingle();

  if (!session) return NextResponse.json({ error: 'Сесію не знайдено.' }, { status: 404 });

  const lesson = parseLesson(session.content_snapshot);
  const state = parseSessionState(session.state);
  if (!lesson || !state) {
    return NextResponse.json({ error: 'Стан сесії пошкоджений.' }, { status: 422 });
  }

  const result = applyAction(state, session.status as SessionStatus, body.data, lesson);

  if (!result.unchanged) {
    const patch: Database['public']['Tables']['sessions']['Update'] = {
      state: result.state as unknown as Json,
      status: result.status,
    };
    if (result.status === 'active' && session.status === 'waiting') {
      patch.started_at = new Date().toISOString();
    }
    if (result.status === 'ended') patch.ended_at = new Date().toISOString();

    const { error } = await supabase.from('sessions').update(patch).eq('id', id);
    if (error) {
      return NextResponse.json({ error: `Не вдалося зберегти: ${error.message}` }, { status: 500 });
    }
  }

  return NextResponse.json(
    { state: result.state, status: result.status },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
