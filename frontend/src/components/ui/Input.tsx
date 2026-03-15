import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export default function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25',
        className
      )}
      {...props}
    />
  );
}
