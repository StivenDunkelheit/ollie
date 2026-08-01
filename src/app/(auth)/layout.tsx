export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-ink-900 text-2xl font-semibold tracking-tight">Ollie</p>
          <p className="text-ink-500 mt-1 text-sm">Інтерактивні уроки для репетиторів</p>
        </div>
        <div className="ring-ink-200 rounded-2xl bg-white p-6 shadow-sm ring-1">{children}</div>
      </div>
    </main>
  );
}
