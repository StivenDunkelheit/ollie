import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabaseSecretKey, supabaseUrl } from './env';
import type { Database } from './types';

/**
 * Клиент с secret-ключом (бывший service_role) — обходит RLS целиком.
 *
 * Единственное легальное применение: публичные роуты ученика
 * (`/api/public/sessions/[token]/...`), где нет залогиненного пользователя,
 * и доступ авторизуется самим session-токеном. Каждый такой роут ОБЯЗАН
 * сам проверить токен и срок действия сессии перед любым запросом.
 *
 * Никогда не импортировать в клиентский код.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
