import Link from 'next/link';
import { RegisterForm } from './register-form';

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-ink-900 mb-6 text-lg font-semibold">Реєстрація</h1>
      <RegisterForm />
      <p className="text-ink-500 mt-6 text-center text-sm">
        Вже є акаунт?{' '}
        <Link href="/login" className="text-brand-600 font-medium hover:underline">
          Увійти
        </Link>
      </p>
    </>
  );
}
