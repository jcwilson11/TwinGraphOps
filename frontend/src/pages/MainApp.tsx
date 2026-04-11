import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import GraphView from '../components/GraphView';
import NodesEdgesView from '../components/NodesEdgesView';
import RiskAnalysis from '../components/RiskAnalysis';
import Sidebar, { type ViewType } from '../components/Sidebar';
import StatusBanner from '../components/StatusBanner';
import SystemOverview from '../components/SystemOverview';
import Button from '../components/ui/Button';
import type { LoadStatus, NodeDetails } from '../types/app';
import { adaptNodeDetails } from '../lib/adapters';
import { getImpact, getRisk } from '../lib/api';
import { buildGraphSummary } from '../lib/selectors';
import { useAppContext } from '../state/AppContext';

interface DetailState {
  status: LoadStatus;
  data: NodeDetails | null;
  error: string | null;
}

interface MainAppProps {
  initialView?: ViewType;
}

export default function MainApp({ initialView = 'graph' }: MainAppProps) {
  const navigate = useNavigate();
  const { graph, loadGraph } = useAppContext();
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailState>({
    status: 'idle',
    data: null,
    error: null,
  });

  useEffect(() => {
    if (graph.status === 'idle' && !graph.data) {
      loadGraph().catch(() => undefined);
    }
  }, [graph.data, graph.status, loadGraph]);

  useEffect(() => {
    if (!graph.data || !selectedNodeId) {
      return;
    }
    if (!graph.data.nodeIndex[selectedNodeId]) {
      setSelectedNodeId(null);
      setDetailState({ status: 'idle', data: null, error: null });
    }
  }, [graph.data, selectedNodeId]);

  const loadNodeDetails = useCallback(
    async (nodeId: string) => {
      if (!graph.data) {
        return;
      }

      setDetailState({
        status: 'loading',
        data: null,
        error: null,
      });

      try {
        const [risk, impact] = await Promise.all([getRisk(nodeId), getImpact(nodeId)]);
        const details = adaptNodeDetails(graph.data, nodeId, risk, impact);
        setDetailState({
          status: 'ready',
          data: details,
          error: null,
        });
      } catch (error) {
        setDetailState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : 'Failed to load node details.',
        });
      }
    },
    [graph.data]
  );

  const handleNodeSelect = useCallback(
    (nodeId: string | null) => {
      setSelectedNodeId(nodeId);
      if (!nodeId) {
        setDetailState({ status: 'idle', data: null, error: null });
        return;
      }
      void loadNodeDetails(nodeId);
    },
    [loadNodeDetails]
  );

  const graphSummary = useMemo(() => (graph.data ? buildGraphSummary(graph.data) : null), [graph.data]);

  if (graph.status === 'loading' && !graph.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A]">
        <div className="flex items-center gap-3 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading active graph...</span>
        </div>
      </div>
    );
  }

  if (graph.status === 'error' && !graph.data) {
    return (
      <div className="min-h-screen bg-[#0F172A] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <EmptyState
            title="Graph Loading Failed"
            message={graph.error || 'The frontend could not load the active graph from the backend.'}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => loadGraph().catch(() => undefined)}>Retry Graph Load</Button>
                <Button variant="secondary" onClick={() => navigate('/')}>
                  Return to Upload
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  if (!graph.data) {
    return null;
  }

  if (graph.data.nodes.length === 0) {
    return (
      <div className="min-h-screen bg-[#0F172A] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <EmptyState
            title="The Active Graph Is Empty"
            message="Processing completed, but the backend returned no nodes. Upload another manual or retry loading the graph."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="secondary" onClick={() => loadGraph().catch(() => undefined)}>
                  Retry Graph Load
                </Button>
                <Button onClick={() => navigate('/')}>Upload Another Document</Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F172A]">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        graphSource={graph.data.source}
        nodeCount={graph.data.nodes.length}
        edgeCount={graph.data.links.length}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Active Graph Workspace</h1>
              <p className="mt-1 text-sm text-slate-400">
                {graphSummary?.totalComponents ?? 0} components, {graphSummary?.totalRelationships ?? 0} relationships, average risk {graphSummary?.avgRisk ?? 0}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {graph.error ? <StatusBanner tone="error" message={graph.error} /> : null}
              <Button variant="secondary" onClick={() => loadGraph({ keepStatus: true }).catch(() => undefined)}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {currentView === 'graph' && (
            <div className="h-full p-6">
              <GraphView
                graphData={graph.data}
                selectedNodeId={selectedNodeId}
                selectedNodeDetails={detailState.data}
                detailsStatus={detailState.status}
                detailsError={detailState.error}
                onNodeSelect={handleNodeSelect}
                onRetryDetails={() => {
                  if (selectedNodeId) {
                    void loadNodeDetails(selectedNodeId);
                  }
                }}
              />
            </div>
          )}
          {currentView === 'risk' && <RiskAnalysis graphData={graph.data} />}
          {currentView === 'nodes' && (
            <NodesEdgesView
              graphData={graph.data}
              onNodeSelect={(nodeId) => {
                setCurrentView('graph');
                handleNodeSelect(nodeId);
              }}
            />
          )}
          {currentView === 'overview' && <SystemOverview graphData={graph.data} />}
        </div>
      </main>
    </div>
  );
}
