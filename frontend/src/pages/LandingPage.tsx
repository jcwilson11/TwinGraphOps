import { useRef } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { ChevronRight, FileText, Network, Shield, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import StatusBanner from '../components/StatusBanner';
import { appConfig } from '../lib/config';
import { useAppContext } from '../state/AppContext';

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { upload, graph, setDragActive, selectFile, clearSelectedFile } = useAppContext();

  const selectedFile = upload.selectedFile;

  const handleFile = (file: File | null) => {
    selectFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0] ?? null);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0] ?? null);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="glass-panel rounded-[32px] px-8 py-10 md:px-10 md:py-12">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-300">
                <Network className="h-8 w-8" />
              </div>
              <div>
                <div className="text-sm uppercase tracking-[0.22em] text-blue-300">Digital Twin Operations</div>
                <h1 className="mt-1 text-5xl font-bold tracking-tight text-white md:text-6xl">TwinGraphOps</h1>
              </div>
            </div>

            <p className="max-w-3xl text-lg leading-8 text-slate-300">
              Drop in your system manual and let TwinGraphOps extract the architecture, score operational risk, and turn the whole system into a graph your team can inspect in minutes.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-100">API {appConfig.apiBaseUrl}</Badge>
              <Badge className="border-slate-700 bg-slate-900/80 text-slate-200">
                Upload limit {Math.round(appConfig.maxUploadBytes / 1024 / 1024)} MB
              </Badge>
              <Badge className="border-slate-700 bg-slate-900/80 text-slate-200">
                Timeout {(appConfig.processingTimeoutMs / 1000).toFixed(0)}s
              </Badge>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="rounded-[28px] border border-slate-800 bg-slate-950/55 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                  <Upload className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold text-white">1. Upload Documentation</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Upload a UTF-8 `.md` or `.txt` file describing the system.</p>
              </div>
              <div className="rounded-[28px] border border-slate-800 bg-slate-950/55 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
                  <Network className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold text-white">2. Build Graph</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">The backend extracts nodes, edges, and risk metrics into the active graph.</p>
              </div>
              <div className="rounded-[28px] border border-slate-800 bg-slate-950/55 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
                  <Shield className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold text-white">3. Inspect Risks</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Explore the graph, tables, and detail panel for operational insight.</p>
              </div>
            </div>
          </section>

          <aside className="glass-panel rounded-[32px] p-8">
            <h2 className="text-xl font-semibold text-white">Active Ingest</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Queue one manual for ingestion. The active graph in the workspace will refresh when processing completes.
            </p>

            <div
              className={`mt-6 rounded-[28px] border-2 border-dashed p-8 text-center transition ${
                upload.phase === 'drag-hover'
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-950/50 hover:border-slate-500'
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-14 w-14 text-slate-400" />
              <h3 className="mt-4 text-xl font-medium text-white">Upload System Documentation</h3>
              <p className="mt-2 text-sm text-slate-400">Drag and drop your file here or browse locally.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,text/plain,text/markdown"
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <FileText className="h-4 w-4" />
                  Choose File
                </Button>
                <Button onClick={() => navigate('/processing')} disabled={!selectedFile}>
                  Analyze Document
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">Supported formats: .md and .txt</p>
            </div>

            <div className="mt-6 rounded-[28px] border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Selected File</p>
                  <p className="mt-2 text-sm font-medium text-white">{selectedFile?.name ?? 'No file selected.'}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedFile ? formatFileSize(selectedFile.size) : 'Choose a manual to begin.'}
                  </p>
                </div>
                {selectedFile ? (
                  <Button variant="ghost" onClick={clearSelectedFile}>
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-6">
              <StatusBanner
                tone={upload.error ? 'error' : graph.data ? 'success' : 'info'}
                message={upload.error || upload.statusMessage || 'Upload a file to continue.'}
              />
            </div>

            {graph.data ? (
              <div className="mt-6 rounded-[28px] border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Current Workspace</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-semibold text-white">{graph.data.nodes.length}</p>
                    <p className="text-sm text-slate-400">Nodes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white">{graph.data.links.length}</p>
                    <p className="text-sm text-slate-400">Edges</p>
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
