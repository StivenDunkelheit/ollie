/**
 * Возвращает активные сессии в состояние ожидания.
 *
 *   npm run db:reset-sessions
 *
 * Нужен при отладке: после прерванного прогона сессия остаётся `active`, и
 * ссылка ученика показывает середину урока вместо комнаты ожидания.
 */
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const result = await client.query(`
  update sessions
     set status = 'waiting',
         started_at = null,
         ended_at = null,
         state = jsonb_set(
                   jsonb_set(state, '{current_index}', '0'::jsonb),
                   '{revealed}', '[]'::jsonb)
   where status in ('active', 'paused')
   returning id
`);

console.log(`Скинуто сесій: ${result.rowCount}`);
await client.end();
