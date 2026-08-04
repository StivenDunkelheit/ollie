import { randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Токен сессии — единственный ключ доступа ученика и одновременно имя
 * Realtime-канала. 32 байта энтропии: перебрать нельзя, поэтому отдельной
 * авторизации ученику не нужно.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Отсеивает мусор до похода в базу. */
export function isValidTokenShape(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

/** Сравнение за постоянное время — чтобы по задержке нельзя было подбирать токен. */
export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
