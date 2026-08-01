import { cn } from '@/lib/cn';

const tones = {
  error: 'bg-red-50 text-red-800 ring-red-200',
  info: 'bg-brand-50 text-brand-800 ring-brand-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
} as const;

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
}) {
  return (
    <p className={cn('rounded-lg px-3 py-2 text-sm ring-1 ring-inset', tones[tone])}>{children}</p>
  );
}
