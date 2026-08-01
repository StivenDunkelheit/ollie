'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { THEME_CHOICES } from '@/lib/themes';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Hint, Input, Label, Select, Textarea } from '@/components/ui/field';

const GRADES = [
  ...Array.from({ length: 11 }, (_, i) => `${i + 1} клас`),
  'Дорослий',
  'Підготовка до іспиту',
];

export function NewLessonForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sourceText, setSourceText] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const topic = String(form.get('topic') ?? '').trim();

    try {
      const response = await fetch('/api/lessons/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: String(form.get('title') ?? '').trim(),
          grade: String(form.get('grade') ?? ''),
          topic: topic === '' ? null : topic,
          theme: String(form.get('theme') ?? 'auto'),
          generate_spares: form.get('generate_spares') === 'on',
          source_text: sourceText,
        }),
      });

      const payload = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !payload.id) {
        setError(payload.error ?? 'Не вдалося запустити генерацію.');
        setPending(false);
        return;
      }

      router.push(`/lessons/${payload.id}`);
    } catch {
      setError('Не вдалося зв’язатися з сервером.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="ring-ink-200 space-y-4 rounded-2xl bg-white p-5 ring-1">
        <h2 className="text-ink-900 text-sm font-semibold">Основна інформація</h2>

        <div>
          <Label htmlFor="title">Назва уроку</Label>
          <Input id="title" name="title" required minLength={3} maxLength={120} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="grade">Клас</Label>
            <Select id="grade" name="grade" defaultValue="5 клас" required>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="topic">Тема</Label>
            <Input id="topic" name="topic" maxLength={120} placeholder="Напр. Звичайні дроби" />
          </div>
        </div>
      </section>

      <section className="ring-ink-200 space-y-4 rounded-2xl bg-white p-5 ring-1">
        <h2 className="text-ink-900 text-sm font-semibold">Матеріали</h2>

        <div>
          <Label htmlFor="source_text">Завдання текстом</Label>
          <Textarea
            id="source_text"
            name="source_text"
            rows={14}
            required
            minLength={30}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={'1. Обчисліть 3/4 + 1/4\n2. Порівняйте 2/3 і 5/6\n…'}
          />
          <Hint>
            Можна вставити більше задач, ніж потрібно на урок: AI відбере найцінніші, приберe
            дублікати й вибудує послідовність. Якщо у тексті є правильні відповіді — залиште їх,
            AI візьме їх звідти.
          </Hint>
        </div>
      </section>

      <section className="ring-ink-200 space-y-4 rounded-2xl bg-white p-5 ring-1">
        <h2 className="text-ink-900 text-sm font-semibold">Налаштування</h2>

        <div>
          <Label htmlFor="theme">Тематика</Label>
          <Select id="theme" name="theme" defaultValue="auto">
            {THEME_CHOICES.map((choice) => (
              <option key={choice.slug} value={choice.slug}>
                {choice.label}
                {choice.hint ? ` — ${choice.hint}` : ''}
              </option>
            ))}
          </Select>
          <Hint>
            Решту — анімації, стиль, темп, місця для нагород і Boss Battle — AI визначає сам.
          </Hint>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="generate_spares"
            className="text-brand-600 focus:ring-brand-500 ring-ink-300 mt-0.5 size-4 rounded ring-1"
          />
          <span className="text-sm">
            <span className="text-ink-900 font-medium">Згенерувати запасні завдання</span>
            <span className="text-ink-500 block text-xs">
              Приховані завдання, які викладач може видати під час уроку.
            </span>
          </span>
        </label>
      </section>

      {error && <Alert>{error}</Alert>}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Запускаємо…' : 'Згенерувати урок'}
        </Button>
        <p className="text-ink-500 text-xs">Генерація триває 1–3 хвилини.</p>
      </div>
    </form>
  );
}
