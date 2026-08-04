'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Hint, Input, Label, Select } from '@/components/ui/field';

interface CreatedSession {
  id: string;
  student_url: string;
  teach_url: string;
  expires_at: string;
}

const EXPIRY_OPTIONS = [
  { hours: 1, label: '1 година' },
  { hours: 24, label: '24 години' },
  { hours: 24 * 7, label: '7 днів' },
];

export function StartSessionButton({ lessonId }: { lessonId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Почати сесію</Button>
      {open && <StartSessionModal lessonId={lessonId} onClose={() => setOpen(false)} />}
    </>
  );
}

function StartSessionModal({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CreatedSession | null>(null);
  const [copied, setCopied] = useState(false);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const name = String(form.get('student_name') ?? '').trim();

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          student_name: name === '' ? null : name,
          expires_in_hours: Number(form.get('expires_in_hours') ?? 24),
        }),
      });

      const payload = (await response.json()) as CreatedSession & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? 'Не вдалося створити сесію.');
        return;
      }
      setSession(payload);
    } catch {
      setError('Не вдалося зв’язатися з сервером.');
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    if (!session) return;
    await navigator.clipboard.writeText(session.student_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ring-ink-200 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1">
        {session === null ? (
          <form onSubmit={create} className="space-y-4">
            <h2 className="text-ink-900 text-lg font-semibold">Нова сесія</h2>
            <p className="text-ink-500 text-sm">
              Урок буде скопійовано в сесію — подальші правки шаблону на неї не вплинуть.
            </p>

            <div>
              <Label htmlFor="student_name">Ім&apos;я учня</Label>
              <Input id="student_name" name="student_name" maxLength={80} placeholder="Не обов'язково" />
            </div>

            <div>
              <Label htmlFor="expires_in_hours">Термін дії посилання</Label>
              <Select id="expires_in_hours" name="expires_in_hours" defaultValue="24">
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.hours} value={option.hours}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Hint>Після закінчення учень побачить, що посилання більше не діє.</Hint>
            </div>

            {error && <Alert>{error}</Alert>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Скасувати
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Створюємо…' : 'Створити'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <h2 className="text-ink-900 text-lg font-semibold">Сесія готова</h2>

            <div>
              <Label>Посилання для учня</Label>
              <div className="flex gap-2">
                <Input readOnly value={session.student_url} onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" variant="secondary" onClick={copyLink}>
                  {copied ? 'Скопійовано' : 'Копіювати'}
                </Button>
              </div>
              <Hint>Надішліть його учню. Реєстрація йому не потрібна.</Hint>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Пізніше
              </Button>
              <Button type="button" onClick={() => router.push(session.teach_url)}>
                Відкрити урок
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
