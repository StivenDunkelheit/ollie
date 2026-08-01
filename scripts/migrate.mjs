/**
 * Прогон миграций.
 *
 *   npm run db:migrate          применить непримененные
 *   npm run db:migrate -- --dry показать, что будет применено
 *
 * Читает SUPABASE_DB_URL из .env.local. Каждый файл из supabase/migrations
 * выполняется один раз, в транзакции; применённые записываются в таблицу
 * schema_migrations, поэтому повторный запуск безопасен.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

const MIGRATIONS_DIR = 'supabase/migrations';
const dryRun = process.argv.includes('--dry');

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('Немає SUPABASE_DB_URL у .env.local.');
  console.error('Supabase → Project Settings → Database → Connection string → URI');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  // Supabase вимагає TLS, але віддає сертифікат власного CA.
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
} catch (error) {
  console.error(`Не вдалося підключитися: ${error.message}`);
  if (/password authentication|SASL/i.test(error.message)) {
    console.error('Схоже, у рядку підключення невірний пароль бази.');
  }
  if (/ENOTFOUND|EAI_AGAIN/i.test(error.message)) {
    console.error('Хост не знайдено — перевірте, що скопійовано весь рядок URI.');
  }
  process.exit(1);
}

console.log(`Підключено: ${client.host}\n`);

await client.query(`
  create table if not exists schema_migrations (
    name       text primary key,
    applied_at timestamptz not null default now()
  )
`);

const { rows } = await client.query('select name from schema_migrations');
const applied = new Set(rows.map((row) => row.name));

const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

const pending = files.filter((file) => !applied.has(file));

if (pending.length === 0) {
  console.log(`Нових міграцій немає (застосовано ${applied.size}).`);
  await client.end();
  process.exit(0);
}

console.log(`До застосування: ${pending.join(', ')}\n`);

if (dryRun) {
  await client.end();
  process.exit(0);
}

for (const file of pending) {
  const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
  process.stdout.write(`  ${file} … `);

  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('insert into schema_migrations (name) values ($1)', [file]);
    await client.query('commit');
    console.log('готово');
  } catch (error) {
    await client.query('rollback');
    console.log('помилка');
    console.error(`\n${error.message}`);
    if (error.position) console.error(`позиція в SQL: ${error.position}`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log('\nМіграції застосовано. Перевірка: npm run db:check');
