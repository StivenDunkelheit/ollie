/**
 * Простой счётчик обращений в памяти процесса.
 *
 * Защищает публичные ендпоинты ученика от перебора токенов и от заваливания
 * запросами. В serverless счётчик живёт на инстанс, поэтому это не строгий
 * лимит, а разумный потолок: полноценный вариант — Redis, когда появится
 * несколько инстансов.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Подчищаем протухшие записи, чтобы карта не росла бесконечно.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
    }
    return { ok: true, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  return { ok: true, retryAfterSec: 0 };
}
