/**
 * Проверка подключения к Supabase и наличия таблиц.
 *
 *   npm run db:check
 *
 * Ходит под secret-ключом, поэтому видит данные в обход RLS — это диагностика
 * настройки, а не часть приложения.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error('Немає NEXT_PUBLIC_SUPABASE_URL або SUPABASE_SECRET_KEY у .env.local');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

console.log(`Проєкт: ${url}\n`);

let missing = 0;
for (const table of ['teachers', 'lessons', 'sessions', 'attempts']) {
  const { count, error } = await db.from(table).select('id', { count: 'exact' }).limit(0);
  if (error) {
    missing += 1;
    console.log(`  ${table.padEnd(10)} ✗  ${error.message}`);
  } else {
    console.log(`  ${table.padEnd(10)} ✓  рядків: ${count}`);
  }
}

if (missing > 0) {
  console.log('\nПохоже, міграцію не застосовано.');
  console.log('Supabase → SQL Editor → вставити supabase/migrations/0001_init.sql → Run');
  process.exit(1);
}

console.log('\nБаза готова.');
