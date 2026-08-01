'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface AuthState {
  error?: string;
  notice?: string;
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  };
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: 'Введіть пошту і пароль.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        error.status === 400
          ? 'Невірна пошта або пароль.'
          : `Не вдалося увійти: ${error.message}`,
    };
  }

  const next = String(formData.get('next') ?? '/lessons');
  redirect(next.startsWith('/') ? next : '/lessons');
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const name = String(formData.get('name') ?? '').trim();

  if (!email || !password) return { error: 'Введіть пошту і пароль.' };
  if (password.length < 8) return { error: 'Пароль має бути не коротшим за 8 символів.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) return { error: `Не вдалося зареєструватися: ${error.message}` };

  // Если в проекте включено підтвердження пошти — сессии не будет.
  if (!data.session) {
    return { notice: 'Перевірте пошту — ми надіслали лист із підтвердженням.' };
  }

  redirect('/lessons');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
