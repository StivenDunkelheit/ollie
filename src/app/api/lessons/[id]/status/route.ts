import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Опрашивается страницей урока, пока идёт генерация. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('status, error_message')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Урок не знайдено.' }, { status: 404 });

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
