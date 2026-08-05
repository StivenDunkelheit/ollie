import { NextResponse } from 'next/server';
import { buildGenerationPayload } from '@/lib/ai/webhook-payload';
import { originFromRequest } from '@/lib/origin';

/**
 * Образец задания для сценария генерации.
 *
 * GET  — вернуть payload (скопировать в Make вручную).
 * POST — отправить его на GENERATION_WEBHOOK_URL, чтобы Make у себя
 *        «Determine data structure» разобрал реальный запрос.
 *
 * Только для разработки: в продакшене маршрута нет.
 */

const SAMPLE_SOURCE = `1. Обчисліть: 3/4 + 1/4
2. Обчисліть: 2/5 + 1/5
3. Порівняйте дроби: 2/3 і 5/6
4. Скоротіть дріб 6/9
5. Скоротіть дріб 4/8
6. Розставте за зростанням: 3/4, 1/4, 1/2
7. Знайдіть 1/3 від числа 27
8. Знайдіть 2/5 від числа 45
9. Розв'яжіть: у кошику 24 яблука, 3/8 з них червоні. Скільки червоних яблук?
10. Розв'яжіть: турист пройшов 2/7 шляху в перший день і 3/7 у другий. Яку частину шляху лишилось?`;

function samplePayload(request: Request) {
  return buildGenerationPayload({
    lessonId: '00000000-0000-4000-8000-000000000000',
    callbackUrl: `${originFromRequest(request)}/api/webhooks/lesson`,
    callbackToken: 'ЗРАЗОК-ТОКЕНА-у-реальному-запиті-він-одноразовий',
    input: {
      title: 'Звичайні дроби: додавання і порівняння',
      grade: '5 клас',
      topic: 'Звичайні дроби',
      theme: 'auto',
      generateSpares: true,
      sourceText: SAMPLE_SOURCE,
    },
  });
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(samplePayload(request), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const webhookUrl = process.env.GENERATION_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'Не задано GENERATION_WEBHOOK_URL у .env.local' },
      { status: 400 },
    );
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(samplePayload(request)),
    signal: AbortSignal.timeout(30_000),
  });

  return NextResponse.json({
    sent_to: webhookUrl,
    status: response.status,
    response: (await response.text()).slice(0, 500),
  });
}
