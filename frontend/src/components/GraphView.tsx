import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { AlertTriangle, Info, Link2, Maximize2, Network, RefreshCcw } from 'lucide-react';
import type { GraphData, LoadStatus, NodeDetails } from '../types/app';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { formatLabel, getLinkEndpointId, getRiskColor } from '../lib/selectors';

interface GraphViewProps {
  graphData: GraphData;
  selectedNodeId: string | null;
  selectedNodeDetails: NodeDetails | null;
  detailsStatus: LoadStatus;
  detailsError: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onRetryDetails: () => void;
}

export default function GraphView({
  graphData,
  selectedNodeId,
  selectedNodeDetails,
  detailsStatus,
  detailsError,
  onNodeSelect,
  onRetryDetails,
}: GraphViewProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 560 });

  const fitGraphToViewport = useCallback(() => {
    if (!graphRef.current || dimensions.width <= 0 || dimensions.height <= 0) {
      return;
    }

    const padding = Math.max(80, Math.min(dimensions.width, dimensions.height) * 0.12);
    graphRef.current.zoomToFit(600, padding);
  }, [dimensions.height, dimensions.width]);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) {
        return;
      }

      setDimensions({
        width: containerRef.current.clientWidth,
        height: Math.max(360, containerRef.current.clientHeight),
      });
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) {
      return;
    }

    graphRef.current.d3Force('charge')?.strength(-520);
    graphRef.current.d3Force('link')?.distance(() => 160);
    graphRef.current.d3Force('center')?.strength(0.08);

    const timeout = window.setTimeout(() => {
      fitGraphToViewport();
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [fitGraphToViewport, graphData.links.length, graphData.nodes.length]);

  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      fitGraphToViewport();
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [dimensions.height, dimensions.width, fitGraphToViewport, graphData.nodes.length]);

  const highlightedLinks = useMemo(() => {
    if (!selectedNodeId) {
      return new Set<string>();
    }

    return new Set(
      graphData.links
        .filter((link) => getLinkEndpointId(link.source) === selectedNodeId || getLinkEndpointId(link.target) === selectedNodeId)
        .map((link) => link.id)
    );
  }, [graphData.links, selectedNodeId]);

  const connectedNodes = useMemo(() => {
    if (!selectedNodeId) {
      return new Set<string>();
    }

    const connected = new Set<string>([selectedNodeId]);
    for (const link of graphData.links) {
      if (getLinkEndpointId(link.source) === selectedNodeId) {
        connected.add(getLinkEndpointId(link.target));
      }
      if (getLinkEndpointId(link.target) === selectedNodeId) {
        connected.add(getLinkEndpointId(link.source));
      }
    }
    return connected;
  }, [graphData.links, selectedNodeId]);

  const forceGraphData = useMemo(
    () => ({
      nodes: graphData.nodes.map((node) => ({ ...node })),
      links: graphData.links.map((link) => ({
        ...link,
        source: getLinkEndpointId(link.source),
        target: getLinkEndpointId(link.target),
      })),
    }),
    [graphData.links, graphData.nodes]
  );

  const fallbackNode = selectedNodeId ? graphData.nodeIndex[selectedNodeId] ?? null : null;
  const detailTitle = selectedNodeDetails?.name || fallbackNode?.name || 'Select a node';
  const detailType = selectedNodeDetails?.type || fallbackNode?.type || null;
  const detailRiskScore = selectedNodeDetails?.riskScore ?? fallbackNode?.riskScore ?? null;
  const detailRiskLevel = selectedNodeDetails?.riskLevel || fallbackNode?.riskLevel || null;
  const detailDescription =
    selectedNodeDetails?.description ||
    fallbackNode?.description ||
    'Select a node to inspect its operational context.';

  return (
    <div className="grid h-full min-h-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="glass-panel flex min-h-0 min-w-0 flex-col rounded-[28px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/90 pb-4">
          <div>
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-blue-300">
              <Network className="h-4 w-4" />
              Graph View
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Topology + Risk Overlay</h2>
            <p className="mt-1 text-sm text-slate-400">
              Node size tracks backend risk score. Node color tracks backend risk level and links render as directed relationships.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>Nodes {graphData.nodes.length}</Badge>
            <Badge>Edges {graphData.links.length}</Badge>
            <Button variant="secondary" onClick={fitGraphToViewport}>
              <Maximize2 className="h-4 w-4" />
              Fit View
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {Object.entries({
            low: getRiskColor('low'),
            medium: getRiskColor('medium'),
            high: getRiskColor('high'),
          }).map(([label, color]) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span>{formatLabel(label)} Risk</span>
            </div>
          ))}
        </div>

        <div
          ref={containerRef}
          className="relative mt-5 min-h-[360px] flex-1 overflow-hidden rounded-[24px] border border-slate-700 bg-[#d9d9d9]"
        >
          <div className="absolute right-4 top-4 z-10 rounded-full border border-slate-400 bg-white/90 px-4 py-2 text-xs text-slate-700">
            Drag to pan, scroll to zoom, click a node for details
          </div>

          <ForceGraph2D
            ref={graphRef}
            graphData={forceGraphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="rgba(0,0,0,0)"
            cooldownTicks={160}
            d3VelocityDecay={0.18}
            linkCurvature={0.08}
            linkWidth={(link: any) => (highlightedLinks.has(link.id) ? 2.2 : 0.9)}
            linkColor={(link: any) => (highlightedLinks.has(link.id) ? '#2563eb' : 'rgba(15, 23, 42, 0.55)')}
            linkDirectionalArrowLength={(link: any) => (highlightedLinks.has(link.id) ? 7 : 5)}
            linkDirectionalArrowRelPos={1}
            linkDirectionalArrowColor={(link: any) => (highlightedLinks.has(link.id) ? '#2563eb' : 'rgba(15, 23, 42, 0.75)')}
            nodeRelSize={1}
            nodeLabel={(node: any) => `${node.name} (${node.riskScore})`}
            nodeCanvasObjectMode={() => 'replace'}
            onNodeClick={(node: any) => {
              onNodeSelect(node.id);
              graphRef.current?.centerAt(node.x, node.y, 500);
              graphRef.current?.zoom(2, 500);
            }}
            nodePointerAreaPaint={(node: any, color, context) => {
              context.fillStyle = color;
              context.beginPath();
              context.arc(node.x, node.y, Math.max(node.val + 8, 22), 0, 2 * Math.PI);
              context.fill();
            }}
            nodeCanvasObject={(node: any, context, globalScale) => {
              const radius = node.val;
              const isSelected = node.id === selectedNodeId;
              const isConnected = connectedNodes.has(node.id);
              const fontSize = Math.max(10 / globalScale, 4);
              const shouldDrawLabel = isSelected || isConnected || globalScale >= 1.35;

              context.save();
              context.beginPath();
              context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
              context.fillStyle = getRiskColor(node.riskLevel);
              context.shadowBlur = isSelected ? 18 : isConnected ? 10 : 0;
              context.shadowColor = getRiskColor(node.riskLevel);
              context.fill();

              context.beginPath();
              context.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
              context.lineWidth = isSelected ? 4 / globalScale : 2 / globalScale;
              context.strokeStyle = isSelected ? '#111827' : 'rgba(15, 23, 42, 0.35)';
              context.stroke();

              context.shadowBlur = 0;
              if (shouldDrawLabel) {
                context.font = `${fontSize}px Inter`;
                context.fillStyle = '#111827';
                context.textAlign = 'center';
                context.textBaseline = 'top';
                context.fillText(node.name, node.x, node.y + radius + 6);
              }
              context.restore();
            }}
          />
        </div>
      </section>

      <aside className="glass-panel scrollbar-thin flex min-h-0 flex-col overflow-y-auto rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/90 pb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-blue-300">Selected Component</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{detailTitle}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {detailType ? <Badge>{formatLabel(detailType)}</Badge> : null}
              {detailRiskLevel && detailRiskScore !== null ? (
                <Badge
                  className="border-transparent text-white"
                  style={{ backgroundColor: getRiskColor(detailRiskLevel) }}
                >
                  {formatLabel(detailRiskLevel)} Risk · {detailRiskScore}
                </Badge>
              ) : null}
            </div>
          </div>

          {selectedNodeId ? (
            <button
              onClick={() => onNodeSelect(null)}
              className="rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-slate-500 hover:text-white"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-5 space-y-4">
          <section className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Description</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">{detailDescription || 'No description available.'}</p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
              <AlertTriangle className="h-4 w-4" />
              Risk Summary
            </div>
            {detailsStatus === 'loading' && selectedNodeId ? (
              <p className="mt-3 text-sm text-slate-300">Loading live risk and impact data...</p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${detailRiskScore ?? 0}%`,
                      backgroundColor: detailRiskLevel ? getRiskColor(detailRiskLevel) : '#334155',
                    }}
                  />
                </div>
                <p className="text-sm leading-7 text-slate-200">
                  {selectedNodeDetails?.explanation || fallbackNode?.riskExplanation || 'No risk explanation available.'}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
              <Link2 className="h-4 w-4" />
              Dependencies
            </div>
            <div className="mt-3 space-y-2">
              {(selectedNodeDetails?.dependencies ?? []).length === 0 ? (
                <p className="text-sm text-slate-400">No direct dependencies returned for this component.</p>
              ) : (
                selectedNodeDetails?.dependencies.map((dependency) => (
                  <button
                    key={dependency.id}
                    onClick={() => onNodeSelect(dependency.id)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-slate-600"
                  >
                    <span>{dependency.name}</span>
                    <span className="text-xs text-slate-500">{dependency.id}</span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
              <Info className="h-4 w-4" />
              Affected Systems
            </div>
            <div className="mt-3 space-y-2">
              {(selectedNodeDetails?.affectedSystems ?? []).length === 0 ? (
                <p className="text-sm text-slate-400">No downstream impact returned for this component.</p>
              ) : (
                selectedNodeDetails?.affectedSystems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200">
                    <div className="font-medium">{item.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.id} · {formatLabel(item.type)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Issues / Findings</p>
            <div className="mt-3 space-y-2">
              {(selectedNodeDetails?.issues ?? []).length === 0 ? (
                <p className="text-sm text-slate-400">No backend findings were provided for this selection.</p>
              ) : (
                selectedNodeDetails?.issues.map((issue) => (
                  <div
                    key={issue}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm leading-6 text-slate-200"
                  >
                    {issue}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Backend Metadata</p>
            {detailsStatus === 'error' && detailsError ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-red-300">{detailsError}</p>
                <Button variant="secondary" onClick={onRetryDetails}>
                  Retry Detail Load
                </Button>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(selectedNodeDetails?.metadata ?? []).map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-medium text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
