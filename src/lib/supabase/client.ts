'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabasePublishableKey, supabaseUrl } from './env';
import type { Database } from './types';

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Клиент для браузера. Ходит под publishable-ключом, всё режет RLS. */
export function createClient() {
  cached ??= createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey());
  return cached;
}
