import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../lib/cn';

interface StatusBannerProps {
  tone?: 'info' | 'success' | 'error';
  message: string;
}

const toneMap = {
  info: {
    container: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
    icon: Info,
  },
  success: {
    container: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    icon: CheckCircle2,
  },
  error: {
    container: 'border-red-500/30 bg-red-500/10 text-red-100',
    icon: AlertTriangle,
  },
};

export default function StatusBanner({ tone = 'info', message }: StatusBannerProps) {
  const Icon = toneMap[tone].icon;

  return (
    <div className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm', toneMap[tone].container)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="m-0 leading-6">{message}</p>
    </div>
  );
}
