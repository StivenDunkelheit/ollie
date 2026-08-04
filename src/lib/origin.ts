import 'server-only';

import { headers } from 'next/headers';

/**
 * Адрес, по которому сейчас открыто приложение.
 *
 * Берётся из самого запроса, а не из настройки: ссылка ученику должна
 * работать на том домене, где викладач її отримав — і локально, і на превʼю,
 * і на продакшені. NEXT_PUBLIC_APP_URL залишається необовʼязковим override
 * на випадок роботи за проксі, який не проставляє forwarded-заголовки.
 */
function fromHeaders(list: Headers): string | null {
  const host = list.get('x-forwarded-host') ?? list.get('host');
  if (!host) return null;

  const proto = list.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** Для Server Components и Server Actions. */
export async function currentOrigin(): Promise<string> {
  const override = process.env.NEXT_PUBLIC_APP_URL;
  if (override && !override.includes('xxx')) return override.replace(/\/$/, '');

  return fromHeaders(await headers()) ?? 'http://localhost:3000';
}

/** Для Route Handlers, где запрос доступен напрямую. */
export function originFromRequest(request: Request): string {
  const override = process.env.NEXT_PUBLIC_APP_URL;
  if (override && !override.includes('xxx')) return override.replace(/\/$/, '');

  return fromHeaders(request.headers) ?? new URL(request.url).origin;
}
