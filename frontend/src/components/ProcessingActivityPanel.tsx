import { CheckCircle2, Clock3, Loader2, TerminalSquare, XCircle } from 'lucide-react';
import type { ProcessingStatus } from '../types/api';

interface ProcessingActivityPanelProps {
  status: ProcessingStatus | null;
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) {
    return 'Pending';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}

export default function ProcessingActivityPanel({ status }: ProcessingActivityPanelProps) {
  const events = status?.events ?? [];
  const visibleEvents = [...events].reverse().slice(0, 8);
  const state = status?.state ?? 'pending';

  return (
    <section className="glass-panel rounded-[28px] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <TerminalSquare className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-semibold text-white">Processing Activity</h2>
          </div>
        </div>

        <div className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
          {state}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] border border-slate-800 bg-slate-950/70 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Current Step</div>
          <div className="mt-2 text-sm font-medium text-white">{status?.latest_event ?? 'Waiting for upload to begin.'}</div>
        </div>
        <div className="rounded-[22px] border border-slate-800 bg-slate-950/70 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Chunk Progress</div>
          <div className="mt-2 text-sm font-medium text-white">
            {status?.current_chunk && status?.chunks_total
              ? `${Math.min(status.current_chunk, status.chunks_total)} of ${status.chunks_total}`
              : status?.chunks_total
                ? `0 of ${status.chunks_total}`
                : 'Waiting'}
          </div>
        </div>
        <div className="rounded-[22px] border border-slate-800 bg-slate-950/70 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Started</div>
          <div className="mt-2 text-sm font-medium text-white">{formatTimestamp(status?.started_at ?? null)}</div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {visibleEvents.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-800 bg-slate-950/45 px-4 py-5 text-sm text-slate-400">
            Waiting for backend activity...
          </div>
        ) : (
          visibleEvents.map((event) => {
            const tone =
              event.level === 'ERROR'
                ? {
                    icon: <XCircle className="h-4 w-4 text-red-300" />,
                    border: 'border-red-500/20',
                    bg: 'bg-red-500/8',
                  }
                : event.event.endsWith('_completed') || event.event.endsWith('_succeeded')
                  ? {
                      icon: <CheckCircle2 className="h-4 w-4 text-emerald-300" />,
                      border: 'border-emerald-500/20',
                      bg: 'bg-emerald-500/8',
                    }
                  : state === 'running'
                    ? {
                        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-300" />,
                        border: 'border-blue-500/20',
                        bg: 'bg-blue-500/8',
                      }
                    : {
                        icon: <Clock3 className="h-4 w-4 text-slate-300" />,
                        border: 'border-slate-700',
                        bg: 'bg-slate-900/70',
                      };

            return (
              <div
                key={`${event.timestamp ?? 'pending'}-${event.event}`}
                className={`flex items-start gap-3 rounded-[22px] border px-4 py-3 ${tone.border} ${tone.bg}`}
              >
                <div className="mt-0.5">{tone.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white">{event.message}</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-slate-500">{formatTimestamp(event.timestamp)}</span>
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{event.event}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
