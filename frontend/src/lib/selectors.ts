import type { GraphData, GraphEdge, GraphNode, GraphSummary } from '../types/app';

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

export function getTypeColor(type: string) {
  return TYPE_COLORS[type] || TYPE_COLORS.other;
}

export function getRiskColor(level: string) {
  return RISK_COLORS[level] || '#94a3b8';
}

export function formatLabel(value: string) {
  return value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
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
