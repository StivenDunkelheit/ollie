export function LinkProblem({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <div className="mb-4 text-5xl" aria-hidden>
          🔒
        </div>
        <h1 className="text-ink-900 text-xl font-semibold">{title}</h1>
        <p className="text-ink-500 mt-2 text-sm">{text}</p>
      </div>
    </main>
  );
}
