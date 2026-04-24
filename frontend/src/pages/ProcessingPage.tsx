import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProcessingActivityPanel from '../components/ProcessingActivityPanel';
import Button from '../components/ui/Button';
import StatusBanner from '../components/StatusBanner';
import { useAppContext } from '../state/AppContext';

const steps = [
  'Uploading document',
  'Extracting architecture graph',
  'Calculating risk metrics and loading workspace',
];

export default function ProcessingPage() {
  const navigate = useNavigate();
  const { upload, graph, beginProcessing } = useAppContext();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!upload.selectedFile && !upload.ingestion && !graph.data) {
      navigate('/');
      return;
    }

    if (upload.phase === 'file-selected') {
      beginProcessing().catch(() => undefined);
    }
  }, [beginProcessing, graph.data, navigate, upload.ingestion, upload.phase, upload.selectedFile]);

  useEffect(() => {
    if (!(upload.phase === 'uploading' || upload.phase === 'processing') || !upload.startedAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsed(Date.now() - upload.startedAt!);
    }, 200);

    return () => window.clearInterval(interval);
  }, [upload.phase, upload.startedAt]);

  useEffect(() => {
    if ((upload.phase === 'success' || upload.phase === 'empty-graph') && graph.status === 'ready') {
      const timeout = window.setTimeout(() => navigate('/app'), 700);
      return () => window.clearTimeout(timeout);
    }
  }, [graph.status, navigate, upload.phase]);

  const currentStep = useMemo(() => {
    if (upload.phase === 'success' || upload.phase === 'empty-graph') {
      return steps.length;
    }
    if (upload.processingStatus?.state === 'running' && upload.processingStatus.current_chunk) {
      return upload.processingStatus.current_chunk >= (upload.processingStatus.chunks_total ?? 1) ? 3 : 2;
    }
    if (upload.phase === 'processing') {
      return elapsed > 2500 ? 3 : 2;
    }
    if (upload.phase === 'uploading') {
      return 1;
    }
    return 0;
  }, [elapsed, upload.phase, upload.processingStatus?.chunks_total, upload.processingStatus?.current_chunk, upload.processingStatus?.state]);

  const progress = useMemo(() => {
    if (upload.phase === 'success' || upload.phase === 'empty-graph') {
      return 100;
    }
    if (upload.processingStatus?.chunks_total) {
      const chunkProgress = ((upload.processingStatus.current_chunk ?? 0) / upload.processingStatus.chunks_total) * 100;
      return Math.max(18, Math.min(94, Math.round(20 + chunkProgress * 0.7)));
    }
    if (upload.phase === 'processing') {
      return Math.min(92, elapsed > 2500 ? 82 : 58);
    }
    if (upload.phase === 'uploading') {
      return 24;
    }
    return 0;
  }, [elapsed, upload.phase, upload.processingStatus?.chunks_total, upload.processingStatus?.current_chunk]);

  const isRetryState = upload.phase === 'retry' || upload.phase === 'error';

  return (
    <div className="min-h-screen bg-[#0F172A] px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <div className="glass-panel rounded-[32px] p-8 md:p-10">
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center rounded-full bg-blue-500/10 p-6 text-blue-300">
                <Network className="h-14 w-14" />
                <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-2xl" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold text-white">Processing Your Documentation</h1>
            </div>

            <div className="mt-10 space-y-4">
              {steps.map((label, index) => {
                const completed = currentStep > index + 1;
                const active = currentStep === index + 1;

                return (
                  <div
                    key={label}
                    className={`flex items-center gap-4 rounded-[24px] border px-5 py-4 transition ${
                      completed
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : active
                          ? 'border-blue-500/30 bg-blue-500/10'
                          : 'border-slate-800 bg-slate-950/55'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/70">
                      {completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      ) : active ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-300" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-slate-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{label}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {completed ? 'Completed' : active ? upload.statusMessage : 'Waiting'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-orange-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-400">{progress}%</p>
            </div>

            <div className="mt-8">
              <StatusBanner
                tone={isRetryState ? 'error' : upload.phase === 'success' || upload.phase === 'empty-graph' ? 'success' : 'info'}
                message={upload.error || upload.statusMessage}
              />
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {isRetryState ? (
                <Button onClick={() => beginProcessing().catch(() => undefined)}>Retry Processing</Button>
              ) : null}
              {(upload.phase === 'success' || upload.phase === 'empty-graph') && graph.status === 'ready' ? (
                <Button onClick={() => navigate('/app')}>Open Workspace</Button>
              ) : null}
              <Button variant="secondary" onClick={() => navigate('/')}>
                Back to Upload
              </Button>
            </div>
          </div>

          <ProcessingActivityPanel status={upload.processingStatus} />
        </div>
      </div>
    </div>
  );
}
