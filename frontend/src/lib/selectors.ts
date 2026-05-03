import type { DocumentEvidence, GraphData, GraphEdge, GraphNode, GraphSummary } from '../types/app';

export const TYPE_COLORS: Record<string, string> = {
  software: '#60a5fa',
  data: '#34d399',
  interface: '#c084fc',
  hardware: '#fb923c',
  human: '#f472b6',
  other: '#94a3b8',
};

export const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

export const DOCUMENT_KIND_COLORS: Record<string, string> = {
  entity: '#60a5fa',
  concept: '#34d399',
  section: '#a78bfa',
  claim: '#f59e0b',
  obligation: '#fb7185',
  requirement: '#38bdf8',
  date: '#f97316',
  metric: '#22c55e',
  process: '#c084fc',
  role: '#f472b6',
  system: '#2dd4bf',
  risk: '#ef4444',
  other: '#94a3b8',
};

export function getTypeColor(type: string) {
  return TYPE_COLORS[type] || TYPE_COLORS.other;
}

export function getRiskColor(level: string) {
  return RISK_COLORS[level] || '#94a3b8';
}

export function getDocumentKindColor(kind: string) {
  return DOCUMENT_KIND_COLORS[kind] || DOCUMENT_KIND_COLORS.other;
}

export function formatLabel(value: string) {
  return value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function formatDocumentEvidencePages(evidence: DocumentEvidence[]) {
  const ranges = evidence
    .map((item) => {
      if (typeof item.pageStart !== 'number' && typeof item.pageEnd !== 'number') {
        return null;
      }
      const start = item.pageStart ?? item.pageEnd;
      const end = item.pageEnd ?? item.pageStart;
      if (typeof start !== 'number' || typeof end !== 'number') {
        return null;
      }
      return {
        start: Math.min(start, end),
        end: Math.max(start, end),
      };
    })
    .filter((range): range is { start: number; end: number } => range !== null)
    .sort((left, right) => left.start - right.start || left.end - right.end);

  const uniqueRanges = ranges.filter(
    (range, index) => index === 0 || range.start !== ranges[index - 1].start || range.end !== ranges[index - 1].end
  );

  if (uniqueRanges.length === 0) {
    return 'No page marker';
  }

  const pages = uniqueRanges.map((range) => (range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`));
  return `${uniqueRanges.length === 1 && uniqueRanges[0].start === uniqueRanges[0].end ? 'Page' : 'Pages'} ${pages.join(', ')}`;
}

export function getLinkEndpointId(endpoint: GraphEdge['source'] | GraphEdge['target']) {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}

export function getConnectionCount(graph: GraphData, nodeId: string) {
  return graph.links.filter((link) => getLinkEndpointId(link.source) === nodeId || getLinkEndpointId(link.target) === nodeId).length;
}

export function buildGraphSummary(graph: GraphData): GraphSummary {
  const totalComponents = graph.nodes.length;
  const totalRelationships = graph.links.length;
  const avgRisk =
    totalComponents === 0
      ? 0
      : Number((graph.nodes.reduce((sum, node) => sum + node.riskScore, 0) / totalComponents).toFixed(1));
  const highRiskNodes = graph.nodes.filter((node) => node.riskLevel === 'high').length;
  const highestRiskNode = [...graph.nodes].sort((left, right) => right.riskScore - left.riskScore)[0] ?? null;

  const riskDistribution = [
    { label: 'Low', key: 'low', count: graph.nodes.filter((node) => node.riskLevel === 'low').length },
    { label: 'Medium', key: 'medium', count: graph.nodes.filter((node) => node.riskLevel === 'medium').length },
    { label: 'High', key: 'high', count: graph.nodes.filter((node) => node.riskLevel === 'high').length },
  ];

  const typeCounts = graph.nodes.reduce<Record<string, number>>((accumulator, node) => {
    accumulator[node.type] = (accumulator[node.type] ?? 0) + 1;
    return accumulator;
  }, {});

  const typeDistribution = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => right.count - left.count);

  const mostConnectedNodes = [...graph.nodes]
    .map((node) => ({ node, connections: getConnectionCount(graph, node.id) }))
    .sort((left, right) => right.connections - left.connections)
    .slice(0, 5);

  const topRiskNodes = [...graph.nodes].sort((left, right) => right.riskScore - left.riskScore).slice(0, 8);

  const blastRadiusLeaders = [...graph.nodes]
    .map((node) => ({ node, count: node.blastRadius }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  return {
    totalComponents,
    totalRelationships,
    avgRisk,
    highRiskNodes,
    highestRiskNode,
    riskDistribution,
    typeDistribution,
    mostConnectedNodes,
    topRiskNodes,
    blastRadiusLeaders,
  };
}

export function getNodeById(graph: GraphData, nodeId: string | null | undefined): GraphNode | null {
  if (!nodeId) {
    return null;
  }
  return graph.nodeIndex[nodeId] ?? null;
}
