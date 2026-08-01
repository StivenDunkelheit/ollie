function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Не задана змінна оточення ${name}. Скопіюй .env.example у .env.local і заповни її.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Publishable key (`sb_publishable_…`) — бывший anon. Безопасен в браузере, всё режет RLS. */
export function supabasePublishableKey(): string {
  return required(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/** Secret key (`sb_secret_…`) — бывший service_role. Обходит RLS, только на сервере. */
export function supabaseSecretKey(): string {
  return required('SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY);
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}
