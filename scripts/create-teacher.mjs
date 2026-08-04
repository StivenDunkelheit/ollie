/**
 * Создание аккаунта преподавателя.
 *
 *   npm run teacher:create -- пошта@example.com [пароль]
 *
 * Публичной регистрации в продукте нет: платформа рассчитана на закрытый круг
 * викладачів, а кожна генерація уроку коштує грошей. Аккаунт заводится этой
 * командой; без пароля в аргументах он генерируется и печатается один раз.
 */
import { randomBytes } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error('Немає NEXT_PUBLIC_SUPABASE_URL або SUPABASE_SECRET_KEY у .env.local');
  process.exit(1);
}

const [email, providedPassword, name] = process.argv.slice(2);

if (!email || !email.includes('@')) {
  console.error('Вкажіть пошту: npm run teacher:create -- пошта@example.com [пароль] [ім\'я]');
  process.exit(1);
}

const password = providedPassword ?? randomBytes(15).toString('base64url');
const generated = providedPassword === undefined;

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

// Уже существует? Тогда меняем пароль, а не создаём дубль.
const existing = await fetch(`${url}/auth/v1/admin/users?per_page=200`, { headers })
  .then((r) => r.json())
  .then((body) => (body.users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase()));

let response;
if (existing) {
  response = await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ password, email_confirm: true }),
  });
} else {
  response = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      // Подтверждаем сразу: письмо тут ни к чему, аккаунт заводить може лише
      // той, у кого вже є secret-ключ проєкту.
      email_confirm: true,
      user_metadata: name ? { name } : {},
    }),
  });
}

if (!response.ok) {
  const body = await response.text();
  console.error(`Не вдалося: HTTP ${response.status} — ${body.slice(0, 200)}`);
  process.exit(1);
}

console.log(existing ? '\nПароль оновлено.' : '\nВикладача створено.');
console.log(`  пошта:  ${email}`);
console.log(`  пароль: ${password}`);

if (generated) {
  console.log('\nПароль показано один раз — збережіть його в менеджері паролів.');
}
