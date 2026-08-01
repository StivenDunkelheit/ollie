'use client';

import { useActionState } from 'react';
import { register, type AuthState } from '../actions';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Hint, Input, Label } from '@/components/ui/field';

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});

  if (state.notice) return <Alert tone="success">{state.notice}</Alert>;

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">Ім&apos;я</Label>
        <Input id="name" name="name" autoComplete="name" />
      </div>

      <div>
        <Label htmlFor="email">Пошта</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div>
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Hint>Мінімум 8 символів.</Hint>
      </div>

      {state.error && <Alert>{state.error}</Alert>}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Створюємо…' : 'Створити акаунт'}
      </Button>
    </form>
  );
}
