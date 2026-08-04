import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <>
      <h1 className="text-ink-900 mb-6 text-lg font-semibold">Вхід</h1>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      {/* Самореєстрації немає: акаунт викладача заводиться командою
          `npm run teacher:create`. Учню акаунт не потрібен зовсім — він
          заходить лише за посиланням на сесію. */}
      <p className="text-ink-400 mt-6 text-center text-xs">
        Доступ до кабінету надає адміністратор.
      </p>
    </>
  );
}
