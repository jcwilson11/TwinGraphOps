import { AlertTriangle, GitBranch, Shield, Target } from 'lucide-react';
import type { GraphData } from '../types/app';
import { buildGraphSummary, formatLabel, getRiskColor, getTypeColor } from '../lib/selectors';

interface RiskAnalysisProps {
  graphData: GraphData;
  sourceLabel?: string;
}

export default function RiskAnalysis({ graphData, sourceLabel = 'active graph' }: RiskAnalysisProps) {
  const summary = buildGraphSummary(graphData);
  const maxRiskBucket = Math.max(...summary.riskDistribution.map((item) => item.count), 1);
  const maxTypeCount = Math.max(...summary.typeDistribution.map((item) => item.count), 1);

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.18em] text-orange-300">
            <Shield className="h-4 w-4" />
            Risk Analysis
          </div>
          <h1 className="mt-2 text-3xl font-bold text-white">Operational Risk Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            Dashboard values are derived directly from the {sourceLabel} because the current frontend does not depend on a separate ranked-risk endpoint here.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="glass-panel rounded-3xl p-5">
            <p className="text-sm text-slate-400">Average Risk</p>
            <p className="mt-3 text-4xl font-semibold text-white">{summary.avgRisk}</p>
          </div>
          <div className="glass-panel rounded-3xl p-5">
            <p className="text-sm text-slate-400">High Risk Nodes</p>
            <p className="mt-3 text-4xl font-semibold text-red-400">{summary.highRiskNodes}</p>
          </div>
          <div className="glass-panel rounded-3xl p-5">
            <p className="text-sm text-slate-400">Relationships</p>
            <p className="mt-3 text-4xl font-semibold text-white">{summary.totalRelationships}</p>
          </div>
          <div className="glass-panel rounded-3xl p-5">
            <p className="text-sm text-slate-400">Highest Risk Component</p>
            <p className="mt-3 text-lg font-semibold text-white">{summary.highestRiskNode?.name ?? 'n/a'}</p>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="glass-panel rounded-3xl p-6">
            <div className="flex items-center gap-3 text-white">
              <AlertTriangle className="h-5 w-5 text-orange-300" />
              <h2 className="text-xl font-semibold">Risk Distribution</h2>
            </div>
            <div className="mt-6 space-y-4">
              {summary.riskDistribution.map((bucket) => (
                <div key={bucket.key}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-200">{bucket.label}</span>
                    <span className="text-slate-400">{bucket.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(bucket.count / maxRiskBucket) * 100}%`,
                        backgroundColor: getRiskColor(bucket.key),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <div className="flex items-center gap-3 text-white">
                <GitBranch className="h-5 w-5 text-blue-300" />
                <h3 className="text-lg font-semibold">Component Types</h3>
              </div>
              <div className="mt-4 space-y-4">
                {summary.typeDistribution.map((entry) => (
                  <div key={entry.type}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-slate-200">{formatLabel(entry.type)}</span>
                      <span className="text-slate-400">{entry.count}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(entry.count / maxTypeCount) * 100}%`,
                          backgroundColor: getTypeColor(entry.type),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-3xl p-6">
            <div className="flex items-center gap-3 text-white">
              <Target className="h-5 w-5 text-red-300" />
              <h2 className="text-xl font-semibold">Top Risk Components</h2>
            </div>
            <div className="mt-6 space-y-4">
              {summary.topRiskNodes.map((node, index) => (
                <div key={node.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">#{index + 1}</span>
                        <h3 className="font-semibold text-white">{node.name}</h3>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{node.description || 'No description available.'}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span>Type: {formatLabel(node.type)}</span>
                        <span>Dependencies: {node.dependencies.length}</span>
                        <span>Blast Radius: {node.blastRadius}</span>
                      </div>
                    </div>
                    <div
                      className="rounded-2xl px-3 py-2 text-sm font-semibold text-white"
                      style={{ backgroundColor: getRiskColor(node.riskLevel) }}
                    >
                      {node.riskScore}
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${node.riskScore}%`,
                        backgroundColor: getRiskColor(node.riskLevel),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-3 text-white">
            <AlertTriangle className="h-5 w-5 text-purple-300" />
            <h2 className="text-xl font-semibold">Blast Radius Leaders</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summary.blastRadiusLeaders.map(({ node, count }) => (
              <div key={node.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="font-semibold text-white">{node.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{formatLabel(node.type)}</p>
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-sm text-slate-400">Potentially impacted components</span>
                  <span className="text-3xl font-semibold text-orange-300">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
