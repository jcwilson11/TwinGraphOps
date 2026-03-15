import type { ApiGraphData, ApiGraphEdge, ApiGraphNode, ImpactResponse, RiskResponse } from '../types/api';
import type { GraphData, GraphEdge, GraphNode, NodeDetails, NodeReference } from '../types/app';

function ensureString(value: unknown, label: string) {
  if (typeof value !== 'string') {
    throw new Error(`Malformed API response: expected ${label} to be a string.`);
  }
  return value;
}

function ensureNumber(value: unknown, label: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Malformed API response: expected ${label} to be a number.`);
  }
  return value;
}

function ensureArray<T>(value: unknown, label: string) {
  if (!Array.isArray(value)) {
    throw new Error(`Malformed API response: expected ${label} to be an array.`);
  }
  return value as T[];
}

function normalizeNode(node: ApiGraphNode, dependencyMap: Map<string, string[]>, dependentMap: Map<string, string[]>): GraphNode {
  return {
    id: ensureString(node.id, 'node.id'),
    name: ensureString(node.name, 'node.name'),
    type: ensureString(node.type, 'node.type'),
    description: ensureString(node.description, 'node.description'),
    riskScore: ensureNumber(node.risk_score, 'node.risk_score'),
    riskLevel: ensureString(node.risk_level, 'node.risk_level'),
    degree: ensureNumber(node.degree, 'node.degree'),
    betweenness: ensureNumber(node.betweenness, 'node.betweenness'),
    closeness: ensureNumber(node.closeness, 'node.closeness'),
    blastRadius: ensureNumber(node.blast_radius, 'node.blast_radius'),
    dependencySpan: ensureNumber(node.dependency_span, 'node.dependency_span'),
    riskExplanation: ensureString(node.risk_explanation, 'node.risk_explanation'),
    source: ensureString(node.source, 'node.source'),
    dependencies: dependencyMap.get(node.id) ?? [],
    dependents: dependentMap.get(node.id) ?? [],
    val: 18 + Math.round((node.risk_score / 100) * 22),
  };
}

function normalizeEdge(edge: ApiGraphEdge, index: number): GraphEdge {
  return {
    id: `${ensureString(edge.source, 'edge.source')}-${ensureString(edge.target, 'edge.target')}-${index}`,
    source: edge.source,
    target: edge.target,
    relation: ensureString(edge.relation, 'edge.relation'),
    rationale: ensureString(edge.rationale, 'edge.rationale'),
  };
}

export function adaptGraph(apiGraph: ApiGraphData): GraphData {
  const source = ensureString(apiGraph.source, 'graph.source');
  const apiNodes = ensureArray<ApiGraphNode>(apiGraph.nodes, 'graph.nodes');
  const apiEdges = ensureArray<ApiGraphEdge>(apiGraph.edges, 'graph.edges');

  const dependencyMap = new Map<string, string[]>();
  const dependentMap = new Map<string, string[]>();

  for (const edge of apiEdges) {
    const sourceId = ensureString(edge.source, 'edge.source');
    const targetId = ensureString(edge.target, 'edge.target');
    dependencyMap.set(sourceId, [...(dependencyMap.get(sourceId) ?? []), targetId]);
    dependentMap.set(targetId, [...(dependentMap.get(targetId) ?? []), sourceId]);
  }

  const nodes = apiNodes.map((node) => normalizeNode(node, dependencyMap, dependentMap));
  const links = apiEdges.map((edge, index) => normalizeEdge(edge, index));
  const nodeIndex = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const relationTypes = [...new Set(links.map((edge) => edge.relation))].sort();

  return {
    source,
    nodes,
    links,
    nodeIndex,
    relationTypes,
  };
}

function toNodeReference(node?: GraphNode | null): NodeReference | null {
  if (!node) {
    return null;
  }

  return {
    id: node.id,
    name: node.name,
    type: node.type,
  };
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

export function adaptNodeDetails(
  graph: GraphData,
  componentId: string,
  risk: RiskResponse,
  impact: ImpactResponse
): NodeDetails {
  const node = graph.nodeIndex[componentId];
  if (!node) {
    throw new Error(`Component '${componentId}' is missing from the active graph.`);
  }

  const dependencies = node.dependencies
    .map((dependencyId) => toNodeReference(graph.nodeIndex[dependencyId]))
    .filter((candidate): candidate is NodeReference => Boolean(candidate));

  const affectedSystems = impact.impacted_components
    .map((affectedId) => toNodeReference(graph.nodeIndex[affectedId]) ?? { id: affectedId, name: affectedId, type: 'unknown' })
    .filter((candidate): candidate is NodeReference => Boolean(candidate));

  const relatedRationales = graph.links
    .filter((link) => link.source === componentId || link.target === componentId)
    .map((link) => link.rationale)
    .filter((rationale) => rationale.trim().length > 0);

  const issues = [risk.explanation, ...relatedRationales].filter(
    (value, index, collection): value is string => value.trim().length > 0 && collection.indexOf(value) === index
  );

  return {
    componentId: node.id,
    name: node.name,
    type: node.type,
    riskScore: risk.score,
    riskLevel: risk.level,
    description: node.description,
    dependencies,
    affectedSystems,
    issues,
    explanation: risk.explanation,
    impactCount: impact.impact_count,
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
