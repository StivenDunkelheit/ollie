import { notFound } from 'next/navigation';
import { SAMPLE_LESSON } from '@/lib/schema/lesson.fixture';
import { DemoPlayer } from './demo-player';

/**
 * Витрина урока без бази й авторизації.
 *
 * Нужна, чтобы разрабатывать и проверять интерактивы, не поднимая Supabase
 * и не тратя генерации. В продакшене страница недоступна.
 */
export default function DemoPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DemoPlayer lesson={SAMPLE_LESSON} />;
}
