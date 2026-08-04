import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseLesson } from '@/lib/schema/lesson';
import { parseSessionState } from '@/lib/schema/session';
import { currentOrigin } from '@/lib/origin';
import { TeacherMode } from './teacher-mode';
import type { SessionStatus } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

/** Teacher Mode — повноекранний режим ведення уроку, без бічного меню. */
export default async function TeachPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: session } = await supabase
    .from('sessions')
    .select('id, token, status, state, content_snapshot, student_name')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) notFound();

  const lesson = parseLesson(session.content_snapshot);
  const state = parseSessionState(session.state);
  if (!lesson || !state) notFound();

  return (
    <TeacherMode
      sessionId={session.id}
      lesson={lesson}
      initialState={state}
      initialStatus={session.status as SessionStatus}
      studentName={session.student_name}
      studentUrl={`${await currentOrigin()}/s/${session.token}`}
    />
  );
}
