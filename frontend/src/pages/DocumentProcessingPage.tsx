import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import ProcessingActivityPanel from '../components/ProcessingActivityPanel';
import StatusBanner from '../components/StatusBanner';
import { useAppContext } from '../state/AppContext';

const steps = [
  'Uploading document',
  'Converting PDF when needed',
  'Extracting document graph',
  'Loading document workspace',
];

export default function DocumentProcessingPage() {
  const navigate = useNavigate();
  const { documentUpload, documentGraph, beginDocumentProcessing } = useAppContext();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!documentUpload.selectedFile && !documentUpload.ingestion && !documentGraph.data) {
      navigate('/documents');
      return;
    }

    if (documentUpload.phase === 'file-selected') {
      beginDocumentProcessing().catch(() => undefined);
    }
  }, [beginDocumentProcessing, documentGraph.data, documentUpload.ingestion, documentUpload.phase, documentUpload.selectedFile, navigate]);

  useEffect(() => {
    if (!(documentUpload.phase === 'uploading' || documentUpload.phase === 'processing') || !documentUpload.startedAt) {
      return;
    }
    const interval = window.setInterval(() => {
      setElapsed(Date.now() - documentUpload.startedAt!);
    }, 200);
    return () => window.clearInterval(interval);
  }, [documentUpload.phase, documentUpload.startedAt]);

  useEffect(() => {
    if ((documentUpload.phase === 'success' || documentUpload.phase === 'empty-graph') && documentGraph.status === 'ready') {
      const timeout = window.setTimeout(() => navigate('/documents/workspace'), 700);
      return () => window.clearTimeout(timeout);
    }
  }, [documentGraph.status, documentUpload.phase, navigate]);

  const currentStep = useMemo(() => {
    if (documentUpload.phase === 'success' || documentUpload.phase === 'empty-graph') {
      return steps.length;
    }
    const latestEvent = documentUpload.processingStatus?.latest_event?.toLowerCase() ?? '';
    if (latestEvent.includes('converting')) {
      return 2;
    }
    if (documentUpload.processingStatus?.state === 'running' && documentUpload.processingStatus.current_chunk) {
      return documentUpload.processingStatus.current_chunk >= (documentUpload.processingStatus.chunks_total ?? 1) ? 4 : 3;
    }
    if (documentUpload.phase === 'processing') {
      return elapsed > 2500 ? 4 : 3;
    }
    if (documentUpload.phase === 'uploading') {
      return 1;
    }
    return 0;
  }, [documentUpload.phase, documentUpload.processingStatus, elapsed]);

  const progress = useMemo(() => {
    if (documentUpload.phase === 'success' || documentUpload.phase === 'empty-graph') {
      return 100;
    }
    if (documentUpload.processingStatus?.chunks_total) {
      const chunkProgress = ((documentUpload.processingStatus.current_chunk ?? 0) / documentUpload.processingStatus.chunks_total) * 100;
      return Math.max(18, Math.min(94, Math.round(25 + chunkProgress * 0.65)));
    }
    if (documentUpload.phase === 'processing') {
      return Math.min(92, elapsed > 2500 ? 82 : 58);
    }
    if (documentUpload.phase === 'uploading') {
      return 24;
    }
    return 0;
  }, [documentUpload.phase, documentUpload.processingStatus?.chunks_total, documentUpload.processingStatus?.current_chunk, elapsed]);

  const isRetryState = documentUpload.phase === 'retry' || documentUpload.phase === 'error';

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
              <h1 className="mt-6 text-3xl font-semibold text-white">Processing Your Document</h1>
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
                        {completed ? 'Completed' : active ? documentUpload.statusMessage : 'Waiting'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-orange-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-3 text-sm text-slate-400">{progress}%</p>
            </div>

            <div className="mt-8">
              <StatusBanner
                tone={isRetryState ? 'error' : documentUpload.phase === 'success' || documentUpload.phase === 'empty-graph' ? 'success' : 'info'}
                message={documentUpload.error || documentUpload.statusMessage}
              />
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {isRetryState ? <Button onClick={() => beginDocumentProcessing().catch(() => undefined)}>Retry Processing</Button> : null}
              {(documentUpload.phase === 'success' || documentUpload.phase === 'empty-graph') && documentGraph.status === 'ready' ? (
                <Button onClick={() => navigate('/documents/workspace')}>Open Workspace</Button>
              ) : null}
              <Button variant="secondary" onClick={() => navigate('/documents')}>
                Back to Upload
              </Button>
            </div>
          </div>

          <ProcessingActivityPanel status={documentUpload.processingStatus} />
        </div>
      </div>
    </div>
  );
}
