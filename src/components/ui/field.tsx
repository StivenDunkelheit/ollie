import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-lg bg-white px-3 py-2 text-sm text-ink-900 ring-1 ring-inset ring-ink-200 ' +
  'placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500 focus:outline-none ' +
  'disabled:bg-ink-100 disabled:text-ink-400';

export function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-ink-700 mb-1.5 block text-sm font-medium">
      {children}
    </label>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-ink-500 mt-1.5 text-xs">{children}</p>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, 'h-10', className)} {...props} />;
}
