import { Activity, AlertTriangle, Boxes, GitBranch } from 'lucide-react';
import type { GraphData } from '../types/app';
import { buildGraphSummary, formatLabel, getRiskColor, getTypeColor } from '../lib/selectors';

interface SystemOverviewProps {
  graphData: GraphData;
}

export default function SystemOverview({ graphData }: SystemOverviewProps) {
  const summary = buildGraphSummary(graphData);

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">System Overview</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            Summary cards and breakdowns are computed directly from the active graph because the current backend contract does not provide a separate architecture summary endpoint yet.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <Boxes className="h-8 w-8 text-blue-300" />
              <span className="text-4xl font-semibold text-white">{summary.totalComponents}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">Total Components</p>
          </div>
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <GitBranch className="h-8 w-8 text-purple-300" />
              <span className="text-4xl font-semibold text-white">{summary.totalRelationships}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">Relationships</p>
          </div>
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-8 w-8 text-orange-300" />
              <span className="text-4xl font-semibold text-white">{summary.highRiskNodes}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">High Risk Components</p>
          </div>
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <Activity className="h-8 w-8 text-emerald-300" />
              <span className="text-4xl font-semibold text-white">{summary.avgRisk}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">Average Risk</p>
          </div>
        </div>

        <section className="glass-panel rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-white">Most Connected Components</h2>
          <div className="mt-6 space-y-4">
            {summary.mostConnectedNodes.map(({ node, connections }, index) => (
              <div key={node.id} className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-sm font-semibold text-blue-100">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{node.name}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {formatLabel(node.type)} · {node.id}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-blue-300">{connections}</div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Connections</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
          <section className="glass-panel rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-white">Component Type Breakdown</h2>
            <div className="mt-6 space-y-4">
              {summary.typeDistribution.map((entry) => (
                <div key={entry.type} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: getTypeColor(entry.type) }} />
                      <span className="font-medium text-white">{formatLabel(entry.type)}</span>
                    </div>
                    <span className="text-lg font-semibold text-white">{entry.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-white">Risk Distribution</h2>
            <div className="mt-6 space-y-4">
              {summary.riskDistribution.map((entry) => (
                <div key={entry.key} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{entry.label}</span>
                    <span className="text-lg font-semibold text-white">{entry.count}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${summary.totalComponents === 0 ? 0 : (entry.count / summary.totalComponents) * 100}%`,
                        backgroundColor: getRiskColor(entry.key),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
