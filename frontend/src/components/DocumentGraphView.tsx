import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { FileSearch, Maximize2, Network, Quote, RefreshCcw } from 'lucide-react';
import type { DocumentGraphData, DocumentNode } from '../types/app';
import { formatDocumentEvidencePages, formatLabel, getDocumentKindColor, getLinkEndpointId } from '../lib/selectors';
import Badge from './ui/Badge';
import Button from './ui/Button';

interface DocumentGraphViewProps {
  graphData: DocumentGraphData;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
}

function formatPageRange(node: DocumentNode) {
  return formatDocumentEvidencePages(node.evidence);
}

export default function DocumentGraphView({ graphData, selectedNodeId, onNodeSelect }: DocumentGraphViewProps) {
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
    const resizeObserver = new ResizeObserver(updateDimensions);
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
    graphRef.current.d3Force('charge')?.strength(-460);
    graphRef.current.d3Force('link')?.distance(() => 150);
    const timeout = window.setTimeout(fitGraphToViewport, 700);
    return () => window.clearTimeout(timeout);
  }, [fitGraphToViewport, graphData.links.length, graphData.nodes.length]);

  const selectedNode = selectedNodeId ? graphData.nodeIndex[selectedNodeId] ?? null : null;
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

  return (
    <div className="grid min-h-[720px] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="glass-panel flex min-h-[720px] min-w-0 flex-col rounded-[28px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/90 pb-4">
          <div>
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-blue-300">
              <Network className="h-4 w-4" />
              Graph View
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Document Knowledge Graph</h2>
            <p className="mt-1 text-sm text-slate-400">Node color tracks extracted kind; directed edges represent explicit relationships.</p>
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
          {graphData.kindTypes.slice(0, 8).map((kind) => (
            <div key={kind} className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getDocumentKindColor(kind) }} />
              <span>{formatLabel(kind)}</span>
            </div>
          ))}
        </div>

        <div ref={containerRef} className="relative mt-5 min-h-[560px] flex-1 overflow-hidden rounded-[24px] border border-slate-700 bg-[#d9d9d9]">
          <div className="absolute right-4 top-4 z-10 rounded-full border border-slate-400 bg-white/90 px-4 py-2 text-xs text-slate-700">
            Drag to pan, scroll to zoom, click a node for evidence
          </div>
          <ForceGraph2D
            ref={graphRef}
            graphData={forceGraphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="rgba(0,0,0,0)"
            cooldownTicks={160}
            linkCurvature={0.08}
            linkWidth={(link: any) => (getLinkEndpointId(link.source) === selectedNodeId || getLinkEndpointId(link.target) === selectedNodeId ? 2.2 : 0.9)}
            linkColor={(link: any) => (getLinkEndpointId(link.source) === selectedNodeId || getLinkEndpointId(link.target) === selectedNodeId ? '#2563eb' : 'rgba(15, 23, 42, 0.55)')}
            linkDirectionalArrowLength={5}
            linkDirectionalArrowRelPos={1}
            nodeRelSize={1}
            nodeLabel={(node: any) => `${node.canonicalName} (${formatLabel(node.kind)})`}
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

              context.save();
              context.beginPath();
              context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
              context.fillStyle = getDocumentKindColor(node.kind);
              context.shadowBlur = isSelected ? 18 : isConnected ? 10 : 0;
              context.shadowColor = getDocumentKindColor(node.kind);
              context.fill();

              context.beginPath();
              context.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
              context.lineWidth = isSelected ? 4 / globalScale : 2 / globalScale;
              context.strokeStyle = isSelected ? '#111827' : 'rgba(15, 23, 42, 0.35)';
              context.stroke();

              context.shadowBlur = 0;
              if (isSelected || isConnected || globalScale >= 1.35) {
                context.font = `${fontSize}px Inter`;
                context.fillStyle = '#111827';
                context.textAlign = 'center';
                context.textBaseline = 'top';
                context.fillText(node.label, node.x, node.y + radius + 6);
              }
              context.restore();
            }}
          />
        </div>
      </section>

      <aside className="glass-panel scrollbar-thin flex min-h-[720px] flex-col overflow-y-auto rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/90 pb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-blue-300">Evidence / Source Detail</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{selectedNode?.canonicalName ?? 'Select a node'}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedNode ? <Badge>{formatLabel(selectedNode.kind)}</Badge> : null}
              {selectedNode ? <Badge>{formatPageRange(selectedNode)}</Badge> : null}
            </div>
          </div>
          {selectedNodeId ? (
            <button onClick={() => onNodeSelect(null)} className="rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-slate-500 hover:text-white">
              <RefreshCcw className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-5 space-y-4">
          <section className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
              <FileSearch className="h-4 w-4" />
              Summary
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-200">{selectedNode?.summary || 'Select a node to inspect extracted evidence.'}</p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
              <Quote className="h-4 w-4" />
              Evidence
            </div>
            <div className="mt-3 space-y-3">
              {(selectedNode?.evidence ?? []).length === 0 ? (
                <p className="text-sm text-slate-400">No evidence attached to this selection.</p>
              ) : (
                selectedNode?.evidence.slice(0, 8).map((item, index) => (
                  <div key={`${item.quote}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-sm leading-6 text-slate-200">{item.quote}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {formatDocumentEvidencePages([item])}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Sources</p>
            <div className="mt-3 space-y-2">
              {(selectedNode?.sources ?? []).length === 0 ? (
                <p className="text-sm text-slate-400">No source chunks available.</p>
              ) : (
                selectedNode?.sources.map((source) => (
                  <div key={`${source.documentName}-${source.chunkId}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
                    <div className="font-medium">{source.documentName}</div>
                    <div className="mt-1 text-xs text-slate-500">{source.chunkId} | {source.chunkFile}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
