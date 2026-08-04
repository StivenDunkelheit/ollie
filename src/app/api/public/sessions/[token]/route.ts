import { NextResponse } from 'next/server';
import { loadSessionByToken, toPublicView } from '@/lib/public-session';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Состояние сессии для ученика.
 *
 * Единственный источник контента для Student Mode. Отдаёт только текущий блок
 * и то в санитизированном виде — правильные ответы сюда не попадают, пока
 * викладач їх не розкриє.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const limit = rateLimit(`session:${token}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Забагато запитів.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const lookup = await loadSessionByToken(token);

  if (!lookup.ok) {
    return NextResponse.json(
      { error: lookup.reason === 'expired' ? 'Посилання більше не діє.' : 'Сесію не знайдено.' },
      { status: lookup.reason === 'expired' ? 410 : 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(toPublicView(lookup.session), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
