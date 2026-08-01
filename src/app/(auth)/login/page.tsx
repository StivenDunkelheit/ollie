import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <>
      <h1 className="text-ink-900 mb-6 text-lg font-semibold">Вхід</h1>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="text-ink-500 mt-6 text-center text-sm">
        Немає акаунта?{' '}
        <Link href="/register" className="text-brand-600 font-medium hover:underline">
          Зареєструватися
        </Link>
      </p>
    </>
  );
}
