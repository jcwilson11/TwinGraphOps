import { lazy, Suspense, useMemo, useState } from 'react';
import { BarChart3, FileJson, List, Loader2, Network, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import NodesEdgesView from '../components/NodesEdgesView';
import RiskAnalysis from '../components/RiskAnalysis';
import SystemOverview from '../components/SystemOverview';
import StatusBanner from '../components/StatusBanner';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { buildGraphSummary, formatLabel } from '../lib/selectors';
import { useAppContext } from '../state/AppContext';
import type { GraphData, NodeDetails } from '../types/app';
import UploadedDocumentWorkspace from './UploadedDocumentWorkspace';

const GraphView = lazy(() => import('../components/GraphView'));

type UploadedGraphViewType = 'graph' | 'risk' | 'nodes' | 'overview';

const navItems: Array<{ id: UploadedGraphViewType; label: string; icon: typeof Network }> = [
  { id: 'graph', label: 'Graph View', icon: Network },
  { id: 'risk', label: 'Risk Analysis', icon: Shield },
  { id: 'nodes', label: 'Nodes & Edges', icon: List },
  { id: 'overview', label: 'System Overview', icon: BarChart3 },
];

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function buildLocalNodeDetails(graphData: GraphData, nodeId: string): NodeDetails | null {
  const node = graphData.nodeIndex[nodeId];
  if (!node) {
    return null;
  }

  const dependencies = node.dependencies
    .map((dependencyId) => graphData.nodeIndex[dependencyId])
    .filter((candidate): candidate is GraphData['nodes'][number] => Boolean(candidate))
    .map((dependency) => ({ id: dependency.id, name: dependency.name, type: dependency.type }));

  const affectedSystems = node.dependents
    .map((dependentId) => graphData.nodeIndex[dependentId])
    .filter((candidate): candidate is GraphData['nodes'][number] => Boolean(candidate))
    .map((dependent) => ({ id: dependent.id, name: dependent.name, type: dependent.type }));

  const issues = graphData.links
    .filter((link) => link.source === nodeId || link.target === nodeId)
    .map((link) => link.rationale)
    .filter((rationale, index, collection) => rationale.trim().length > 0 && collection.indexOf(rationale) === index);

  return {
    componentId: node.id,
    name: node.name,
    type: node.type,
    riskScore: node.riskScore,
    riskLevel: node.riskLevel,
    description: node.description,
    dependencies,
    affectedSystems,
    issues,
    explanation: node.riskExplanation,
    impactCount: node.dependents.length,
    metadata: [
      { label: 'Degree', value: formatMetric(node.degree) },
      { label: 'Betweenness', value: formatMetric(node.betweenness) },
      { label: 'Closeness', value: formatMetric(node.closeness) },
      { label: 'Blast Radius', value: String(node.blastRadius) },
      { label: 'Dependency Span', value: String(node.dependencySpan) },
      { label: 'Source', value: node.source },
    ],
  };
}

export default function UploadedGraphWorkspace() {
  const navigate = useNavigate();
  const { uploadedGraph } = useAppContext();
  const [currentView, setCurrentView] = useState<UploadedGraphViewType>('graph');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  if (uploadedGraph.kind === 'document') {
    return <UploadedDocumentWorkspace />;
  }

  const graphData = uploadedGraph.operationalData;
  const selectedNodeDetails = useMemo(
    () => (graphData && selectedNodeId ? buildLocalNodeDetails(graphData, selectedNodeId) : null),
    [graphData, selectedNodeId]
  );
  const graphSummary = useMemo(() => (graphData ? buildGraphSummary(graphData) : null), [graphData]);

  if (uploadedGraph.status === 'loading' && !graphData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A]">
        <div className="flex items-center gap-3 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading uploaded graph...</span>
        </div>
      </div>
    );
  }

  if (uploadedGraph.status === 'error' && !graphData) {
    return (
      <div className="min-h-screen bg-[#0F172A] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <EmptyState
            title="Uploaded Graph Loading Failed"
            message={uploadedGraph.error || 'The frontend could not load the selected operational graph JSON.'}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => navigate('/graphs')}>Return to Graph Upload</Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="min-h-screen bg-[#0F172A] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <EmptyState
            title="No Uploaded Graph Loaded"
            message="Upload an operational or document graph artifact JSON to inspect a local graph workspace."
            action={<Button onClick={() => navigate('/graphs')}>Upload Graph JSON</Button>}
          />
        </div>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="min-h-screen bg-[#0F172A] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <EmptyState
            title="The Uploaded Graph Is Empty"
            message="The selected operational graph artifact loaded successfully, but it contains no nodes."
            action={<Button onClick={() => navigate('/graphs')}>Upload Another Graph</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F172A]">
      <aside className="hidden h-full w-72 shrink-0 border-r border-slate-800 bg-slate-950/95 xl:flex xl:flex-col">
        <div className="border-b border-slate-800 px-6 py-7">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-300">
              <FileJson className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TwinGraphOps</h1>
              <p className="text-sm text-slate-400">Uploaded graph workspace</p>
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
              Active Graph: {uploadedGraph.filename || formatLabel(graphData.source)}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={() => navigate('/risk')}
              className="rounded-2xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Risk
            </button>
            <button
              onClick={() => navigate('/documents')}
              className="rounded-2xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Documents
            </button>
            <button className="rounded-2xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Graphs</button>
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
            onClick={() => navigate('/graphs')}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            <FileJson className="h-5 w-5" />
            <span>Upload New Graph</span>
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Uploaded Graph Workspace</h1>
              <p className="mt-1 text-sm text-slate-400">
                {graphSummary?.totalComponents ?? 0} components, {graphSummary?.totalRelationships ?? 0} relationships, average risk {graphSummary?.avgRisk ?? 0}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {uploadedGraph.error ? <StatusBanner tone="error" message={uploadedGraph.error} /> : null}
              <Badge className="border-slate-700 bg-slate-900/80 text-slate-200">Auto-detected operational artifact</Badge>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {currentView === 'graph' && (
            <div className="h-full p-6">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center rounded-[24px] border border-slate-700 bg-[#d9d9d9]">
                    <div className="flex items-center gap-3 text-slate-700">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading graph view...</span>
                    </div>
                  </div>
                }
              >
                <GraphView
                  graphData={graphData}
                  selectedNodeId={selectedNodeId}
                  selectedNodeDetails={selectedNodeDetails}
                  detailsStatus="ready"
                  detailsError={null}
                  onNodeSelect={setSelectedNodeId}
                  onRetryDetails={() => undefined}
                />
              </Suspense>
            </div>
          )}
          {currentView === 'risk' && <RiskAnalysis graphData={graphData} sourceLabel="uploaded graph JSON" />}
          {currentView === 'nodes' && (
            <NodesEdgesView
              graphData={graphData}
              onNodeSelect={(nodeId) => {
                setCurrentView('graph');
                setSelectedNodeId(nodeId);
              }}
            />
          )}
          {currentView === 'overview' && <SystemOverview graphData={graphData} sourceLabel="uploaded graph JSON" />}
        </div>
      </main>
    </div>
  );
}
