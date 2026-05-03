import { Boxes, FileText, GitBranch, Quote } from 'lucide-react';
import type { DocumentGraphData } from '../types/app';
import { formatLabel, getDocumentKindColor } from '../lib/selectors';

interface DocumentOverviewProps {
  graphData: DocumentGraphData;
}

export default function DocumentOverview({ graphData }: DocumentOverviewProps) {
  const kindCounts = graphData.nodes.reduce<Record<string, number>>((counts, node) => {
    counts[node.kind] = (counts[node.kind] ?? 0) + 1;
    return counts;
  }, {});
  const kindDistribution = Object.entries(kindCounts)
    .map(([kind, count]) => ({ kind, count }))
    .sort((left, right) => right.count - left.count);
  const totalEvidence =
    graphData.nodes.reduce((sum, node) => sum + node.evidence.length, 0) +
    graphData.links.reduce((sum, edge) => sum + edge.evidence.length, 0);
  const mostConnected = [...graphData.nodes].sort((left, right) => right.degree - left.degree).slice(0, 5);

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Document Overview</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            Summary cards and breakdowns are computed directly from the active document graph.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <Boxes className="h-8 w-8 text-blue-300" />
              <span className="text-4xl font-semibold text-white">{graphData.nodes.length}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">Document Nodes</p>
          </div>
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <GitBranch className="h-8 w-8 text-purple-300" />
              <span className="text-4xl font-semibold text-white">{graphData.links.length}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">Relationships</p>
          </div>
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <Quote className="h-8 w-8 text-orange-300" />
              <span className="text-4xl font-semibold text-white">{totalEvidence}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">Evidence Items</p>
          </div>
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <FileText className="h-8 w-8 text-emerald-300" />
              <span className="text-4xl font-semibold text-white">{graphData.kindTypes.length}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">Node Kinds</p>
          </div>
        </div>

        <section className="glass-panel rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-white">Most Connected Document Nodes</h2>
          <div className="mt-6 space-y-4">
            {mostConnected.map((node, index) => (
              <div key={node.id} className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-sm font-semibold text-blue-100">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{node.canonicalName}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {formatLabel(node.kind)} | {node.id}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-blue-300">{node.degree}</div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Connections</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-white">Kind Breakdown</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {kindDistribution.map((entry) => (
              <div key={entry.kind} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: getDocumentKindColor(entry.kind) }} />
                    <span className="font-medium text-white">{formatLabel(entry.kind)}</span>
                  </div>
                  <span className="text-lg font-semibold text-white">{entry.count}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
