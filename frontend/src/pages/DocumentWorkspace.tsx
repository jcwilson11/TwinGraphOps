import { lazy, Suspense, useEffect, useState } from 'react';
import { BarChart3, Download, FileJson, FileText, List, Loader2, Network, RefreshCcw, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DocumentNodesEdgesView from '../components/DocumentNodesEdgesView';
import DocumentOverview from '../components/DocumentOverview';
import EmptyState from '../components/EmptyState';
import StatusBanner from '../components/StatusBanner';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { formatLabel } from '../lib/selectors';
import { useAppContext } from '../state/AppContext';

const DocumentGraphView = lazy(() => import('../components/DocumentGraphView'));

type DocumentViewType = 'graph' | 'nodes' | 'overview';

const navItems: Array<{ id: DocumentViewType; label: string; icon: typeof Network }> = [
  { id: 'graph', label: 'Graph View', icon: Network },
  { id: 'nodes', label: 'Nodes & Edges', icon: List },
  { id: 'overview', label: 'Document Overview', icon: BarChart3 },
];

export default function DocumentWorkspace() {
  const navigate = useNavigate();
  const { documentGraph, loadDocumentGraph } = useAppContext();
  const [currentView, setCurrentView] = useState<DocumentViewType>('graph');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (documentGraph.status === 'idle' && !documentGraph.data) {
      loadDocumentGraph().catch(() => undefined);
    }
  }, [documentGraph.data, documentGraph.status, loadDocumentGraph]);

  useEffect(() => {
    if (!documentGraph.data || !selectedNodeId) {
      return;
    }
    if (!documentGraph.data.nodeIndex[selectedNodeId]) {
      setSelectedNodeId(null);
    }
  }, [documentGraph.data, selectedNodeId]);

  if (documentGraph.status === 'loading' && !documentGraph.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A]">
        <div className="flex items-center gap-3 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading document graph...</span>
        </div>
      </div>
    );
  }

  if (documentGraph.status === 'error' && !documentGraph.data) {
    return (
      <div className="min-h-screen bg-[#0F172A] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <EmptyState
            title="Document Graph Loading Failed"
            message={documentGraph.error || 'The frontend could not load the active document graph from the backend.'}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => loadDocumentGraph().catch(() => undefined)}>Retry Graph Load</Button>
                <Button variant="secondary" onClick={() => navigate('/documents')}>
                  Return to Upload
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  if (!documentGraph.data || documentGraph.data.nodes.length === 0) {
    return (
      <div className="min-h-screen bg-[#0F172A] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <EmptyState
            title="The Document Graph Is Empty"
            message="Upload a PDF, markdown, or text document to build a document knowledge graph."
            action={<Button onClick={() => navigate('/documents')}>Upload Document</Button>}
          />
        </div>
      </div>
    );
  }

  const graphData = documentGraph.data;
  const artifactManifest = documentGraph.artifacts;
  const finalMarkdownArtifact = artifactManifest?.artifacts.find((artifact) => artifact.type === 'final-markdown') ?? null;
  const mergedJsonArtifact = artifactManifest?.artifacts.find((artifact) => artifact.type === 'merged-json') ?? null;
  const chunkArtifacts = artifactManifest?.chunk_artifacts ?? [];

  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-800 bg-slate-950/95 xl:flex xl:flex-col xl:self-stretch">
        <div className="border-b border-slate-800 px-6 py-7">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-300">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TwinGraphOps</h1>
              <p className="text-sm text-slate-400">Document knowledge graph workspace</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Nodes</p>
              <p className="mt-2 text-2xl font-semibold text-white">{graphData.nodes.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Edges</p>
              <p className="mt-2 text-2xl font-semibold text-white">{graphData.links.length}</p>
            </div>
          </div>

          <div className="mt-4">
            <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-100">
              Active Graph: {formatLabel(graphData.source)}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={() => navigate('/risk')}
              className="rounded-2xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Risk
            </button>
            <button className="rounded-2xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Documents</button>
            <button
              onClick={() => navigate('/graphs')}
              className="rounded-2xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Graphs
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <button
            onClick={() => navigate('/documents')}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            <Upload className="h-5 w-5" />
            <span>Upload New Document</span>
          </button>
          <button
            onClick={() => navigate('/graphs')}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            <Network className="h-5 w-5" />
            <span>Graph Workspace</span>
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Document Graph Workspace</h1>
              <p className="mt-1 text-sm text-slate-400">
                {graphData.nodes.length} nodes, {graphData.links.length} relationships, {graphData.kindTypes.length} node kinds
              </p>
            </div>

            <div className="flex items-center gap-3">
              {documentGraph.error ? <StatusBanner tone="error" message={documentGraph.error} /> : null}
              <Button variant="secondary" onClick={() => loadDocumentGraph({ keepStatus: true }).catch(() => undefined)}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1">
          <section className="border-b border-slate-800 bg-slate-950/40 px-6 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Download Source Materials</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Download the finalized markdown, chunked markdown files, and merged document graph JSON for this workspace.
                </p>
              </div>

              {artifactManifest ? (
                <a
                  href={artifactManifest.bundle.download_url}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition-all hover:bg-blue-500"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Bundle</span>
                </a>
              ) : null}
            </div>

            {artifactManifest ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
                <a
                  href={finalMarkdownArtifact?.download_url || '#'}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-600 hover:bg-slate-900"
                >
                  <div className="flex items-center gap-3 text-white">
                    <FileText className="h-5 w-5 text-blue-300" />
                    <span className="font-medium">Final Markdown</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{finalMarkdownArtifact?.filename || 'Unavailable'}</p>
                </a>

                <a
                  href={mergedJsonArtifact?.download_url || '#'}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-600 hover:bg-slate-900"
                >
                  <div className="flex items-center gap-3 text-white">
                    <FileJson className="h-5 w-5 text-emerald-300" />
                    <span className="font-medium">Merged JSON</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{mergedJsonArtifact?.filename || 'Unavailable'}</p>
                </a>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="flex items-center gap-3 text-white">
                    <FileText className="h-5 w-5 text-amber-300" />
                    <span className="font-medium">Chunked Markdown Files</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {chunkArtifacts.length} chunk file{chunkArtifacts.length === 1 ? '' : 's'}
                  </p>
                  <div className="mt-3 max-h-32 space-y-2 overflow-auto pr-1">
                    {chunkArtifacts.map((artifact) => (
                      <a
                        key={artifact.id}
                        href={artifact.download_url}
                        className="block truncate text-sm text-blue-300 transition hover:text-blue-200"
                      >
                        {artifact.filename}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : documentGraph.artifactsError ? (
              <div className="mt-4">
                <StatusBanner tone="error" message={documentGraph.artifactsError} />
              </div>
            ) : (
              <div className="mt-4">
                <StatusBanner tone="info" message="Source material downloads are not available for this document yet." />
              </div>
            )}
          </section>

          {currentView === 'graph' && (
            <div className="p-6">
              <Suspense
                fallback={
                  <div className="flex min-h-[720px] items-center justify-center rounded-[24px] border border-slate-700 bg-[#d9d9d9]">
                    <div className="flex items-center gap-3 text-slate-700">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading graph view...</span>
                    </div>
                  </div>
                }
              >
                <DocumentGraphView graphData={graphData} selectedNodeId={selectedNodeId} onNodeSelect={setSelectedNodeId} />
              </Suspense>
            </div>
          )}
          {currentView === 'nodes' && (
            <DocumentNodesEdgesView
              graphData={graphData}
              onNodeSelect={(nodeId) => {
                setCurrentView('graph');
                setSelectedNodeId(nodeId);
              }}
            />
          )}
          {currentView === 'overview' && <DocumentOverview graphData={graphData} />}
        </div>
      </main>
    </div>
  );
}
