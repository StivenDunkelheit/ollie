'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { login, type AuthState } from '../actions';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Input, Label } from '@/components/ui/field';

export function LoginForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={params.get('next') ?? '/lessons'} />

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
          autoComplete="current-password"
          required
        />
      </div>

      {state.error && <Alert>{state.error}</Alert>}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Входимо…' : 'Увійти'}
      </Button>
    </form>
  );
}
