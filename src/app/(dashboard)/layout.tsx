import Link from 'next/link';
import { redirect } from 'next/navigation';
import { logout } from '../(auth)/actions';
import { getCurrentUser } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="ring-ink-200 sticky top-0 z-10 bg-white/80 ring-1 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/lessons" className="text-ink-900 font-semibold tracking-tight">
            Ollie
          </Link>
          <nav className="flex-1">
            <Link
              href="/lessons"
              className="text-ink-600 hover:text-ink-900 rounded-md px-2 py-1 text-sm font-medium"
            >
              Мої уроки
            </Link>
          </nav>
          <span className="text-ink-500 hidden text-sm sm:inline">{user.email}</span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Вийти
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
