import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  message: string;
  action?: ReactNode;
}

export default function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="glass-panel flex min-h-[320px] flex-col items-center justify-center rounded-3xl px-8 py-12 text-center">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">{message}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
