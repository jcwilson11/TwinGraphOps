import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-950/40',
  secondary: 'border border-slate-700 bg-slate-900/80 text-slate-100 hover:border-slate-500 hover:bg-slate-800',
  ghost: 'text-slate-300 hover:bg-slate-800/70 hover:text-white',
  danger: 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-950/40',
};

export default function Button({ className, variant = 'primary', children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
