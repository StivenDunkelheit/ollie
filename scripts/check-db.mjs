/**
 * Проверка подключения к Supabase.
 *
 *   npm run db:check
 *
 * Проверяет два независимых пути: REST API (им ходит приложение) и прямое
 * подключение к Postgres (им идут миграции). Различать их важно — падение
 * одного и обоих означает разные проблемы.
 */
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error('Немає NEXT_PUBLIC_SUPABASE_URL або SUPABASE_SECRET_KEY у .env.local');
  process.exit(1);
}

console.log(`Проєкт: ${url}\n`);

const db = createClient(url, key, { auth: { persistSession: false } });
const TABLES = ['teachers', 'lessons', 'sessions', 'attempts'];

let unreachable = 0;
let missing = 0;

for (const table of TABLES) {
  const { count, error } = await db.from(table).select('id', { count: 'exact' }).limit(0);

  if (!error) {
    console.log(`  ${table.padEnd(10)} ✓  рядків: ${count}`);
    continue;
  }

  // «fetch failed» — до сервера не достучались; всё остальное — ответ сервера.
  if (/fetch failed|ENOTFOUND|ECONNREFUSED/i.test(error.message)) unreachable += 1;
  else missing += 1;

  console.log(`  ${table.padEnd(10)} ✗  ${error.message}`);
}

if (unreachable === TABLES.length) {
  const host = new URL(url).hostname;
  console.log(`\nСервер ${host} не відповідає — це не про міграції.`);

  // Проверяем прямое подключение: оно идёт через другой хост, и по тому,
  // отвечает ли он, видно, чи проєкт узагалі існує.
  if (process.env.SUPABASE_DB_URL) {
    const client = new pg.Client({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    try {
      await client.connect();
      await client.end();
      console.log('Але база напряму доступна — схоже, тимчасові проблеми з REST API.');
    } catch (error) {
      console.log(`База напряму теж недоступна: ${error.message}`);
      if (/not found|ENOTFOUND/i.test(error.message)) {
        console.log('\nСхоже, проєкт Supabase видалено або призупинено.');
        console.log('Перевірте його на supabase.com/dashboard.');
        console.log('Якщо створюєте новий: оновіть ключі в .env.local, тоді');
        console.log('  npm run db:migrate');
        console.log('  npm run teacher:create -- ваша@пошта');
      }
    }
  }
  process.exit(1);
}

if (missing > 0) {
  console.log('\nТаблиць немає — міграцію не застосовано:');
  console.log('  npm run db:migrate');
  process.exit(1);
}

console.log('\nБаза готова.');
