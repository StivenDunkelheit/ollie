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

// Самореєстрації немає навмисно: платформа розрахована на закритий круг
// викладачів, і кожна генерація уроку коштує грошей. Акаунт заводиться
// командою `npm run teacher:create`, яка вимагає secret-ключ проєкту.

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
