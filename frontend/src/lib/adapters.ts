import type {
  ApiDocumentEdge,
  ApiDocumentEvidence,
  ApiDocumentGraphData,
  ApiDocumentNode,
  ApiDocumentSource,
  ApiGraphData,
  ApiGraphEdge,
  ApiGraphNode,
  ApiMergedGraphData,
  ApiMergedGraphEdge,
  ApiMergedGraphNode,
  ImpactResponse,
  RiskResponse,
} from '../types/api';
import type {
  DocumentEdge,
  DocumentEvidence,
  DocumentGraphData,
  DocumentNode,
  DocumentSource,
  GraphData,
  GraphEdge,
  GraphNode,
  NodeDetails,
  NodeReference,
} from '../types/app';

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

function normalizeMergedNode(node: ApiMergedGraphNode, dependencyMap: Map<string, string[]>, dependentMap: Map<string, string[]>): GraphNode {
  return {
    id: ensureString(node.id, 'merged.node.id'),
    name: ensureString(node.name, 'merged.node.name'),
    type: ensureString(node.type, 'merged.node.type'),
    description: ensureString(node.description, 'merged.node.description'),
    riskScore: ensureNumber(node.risk_score, 'merged.node.risk_score'),
    riskLevel: ensureString(node.risk_level, 'merged.node.risk_level'),
    degree: ensureNumber(node.degree, 'merged.node.degree'),
    betweenness: ensureNumber(node.betweenness, 'merged.node.betweenness'),
    closeness: ensureNumber(node.closeness, 'merged.node.closeness'),
    blastRadius: ensureNumber(node.blast_radius, 'merged.node.blast_radius'),
    dependencySpan: ensureNumber(node.dependency_span, 'merged.node.dependency_span'),
    riskExplanation: ensureString(node.risk_explanation, 'merged.node.risk_explanation'),
    source: ensureString(node.source, 'merged.node.source'),
    dependencies: dependencyMap.get(node.id) ?? [],
    dependents: dependentMap.get(node.id) ?? [],
    val: 18 + Math.round((node.risk_score / 100) * 22),
  };
}

function normalizeMergedEdge(edge: ApiMergedGraphEdge, index: number): GraphEdge {
  return {
    id: `${ensureString(edge.source, 'merged.edge.source')}-${ensureString(edge.target, 'merged.edge.target')}-${index}`,
    source: edge.source,
    target: edge.target,
    relation: ensureString(edge.relation, 'merged.edge.relation'),
    rationale: ensureString(edge.rationale, 'merged.edge.rationale'),
  };
}

export function adaptMergedGraph(apiGraph: ApiMergedGraphData, sourceLabel = 'uploaded'): GraphData {
  const apiNodes = ensureArray<ApiMergedGraphNode>(apiGraph.nodes, 'merged.graph.nodes');
  const apiEdges = ensureArray<ApiMergedGraphEdge>(apiGraph.edges, 'merged.graph.edges');

  const dependencyMap = new Map<string, string[]>();
  const dependentMap = new Map<string, string[]>();

  for (const edge of apiEdges) {
    const sourceId = ensureString(edge.source, 'merged.edge.source');
    const targetId = ensureString(edge.target, 'merged.edge.target');
    dependencyMap.set(sourceId, [...(dependencyMap.get(sourceId) ?? []), targetId]);
    dependentMap.set(targetId, [...(dependentMap.get(targetId) ?? []), sourceId]);
  }

  const nodes = apiNodes.map((node) => normalizeMergedNode(node, dependencyMap, dependentMap));
  const links = apiEdges.map((edge, index) => normalizeMergedEdge(edge, index));
  const nodeIndex = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const relationTypes = [...new Set(links.map((edge) => edge.relation))].sort();

  return {
    source: nodes[0]?.source || sourceLabel,
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

function normalizeDocumentEvidence(evidence: ApiDocumentEvidence): DocumentEvidence {
  return {
    quote: ensureString(evidence.quote, 'document.evidence.quote'),
    pageStart: evidence.page_start,
    pageEnd: evidence.page_end,
  };
}

function normalizeDocumentSource(source: ApiDocumentSource): DocumentSource {
  return {
    documentName: ensureString(source.document_name, 'document.source.document_name'),
    chunkFile: ensureString(source.chunk_file, 'document.source.chunk_file'),
    chunkId: ensureString(source.chunk_id, 'document.source.chunk_id'),
    pdfPageStart: source.pdf_page_start,
    pdfPageEnd: source.pdf_page_end,
  };
}

function normalizeDocumentNode(node: ApiDocumentNode): DocumentNode {
  const degree = ensureNumber(node.degree, 'document.node.degree');
  return {
    id: ensureString(node.id, 'document.node.id'),
    label: ensureString(node.label, 'document.node.label'),
    kind: ensureString(node.kind, 'document.node.kind'),
    canonicalName: ensureString(node.canonical_name, 'document.node.canonical_name'),
    aliases: ensureArray<string>(node.aliases, 'document.node.aliases'),
    summary: ensureString(node.summary, 'document.node.summary'),
    evidence: ensureArray<ApiDocumentEvidence>(node.evidence, 'document.node.evidence').map(normalizeDocumentEvidence),
    sources: ensureArray<ApiDocumentSource>(node.sources, 'document.node.sources').map(normalizeDocumentSource),
    degree,
    source: ensureString(node.source, 'document.node.source'),
    val: 16 + Math.min(18, Math.round(degree * 4)),
  };
}

function normalizeDocumentEdge(edge: ApiDocumentEdge): DocumentEdge {
  return {
    id: ensureString(edge.id, 'document.edge.id'),
    source: ensureString(edge.source, 'document.edge.source'),
    target: ensureString(edge.target, 'document.edge.target'),
    type: ensureString(edge.type, 'document.edge.type'),
    summary: ensureString(edge.summary, 'document.edge.summary'),
    evidence: ensureArray<ApiDocumentEvidence>(edge.evidence, 'document.edge.evidence').map(normalizeDocumentEvidence),
    sourceChunk: edge.source_chunk ? normalizeDocumentSource(edge.source_chunk) : null,
  };
}

export function adaptDocumentGraph(apiGraph: ApiDocumentGraphData): DocumentGraphData {
  const source = ensureString(apiGraph.source, 'document.graph.source');
  const nodes = ensureArray<ApiDocumentNode>(apiGraph.nodes, 'document.graph.nodes').map(normalizeDocumentNode);
  const links = ensureArray<ApiDocumentEdge>(apiGraph.edges, 'document.graph.edges').map(normalizeDocumentEdge);
  const nodeIndex = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const kindTypes = [...new Set(nodes.map((node) => node.kind))].sort();
  const relationTypes = [...new Set(links.map((edge) => edge.type))].sort();

  return {
    source,
    ingestionId: apiGraph.ingestion_id ?? null,
    nodes,
    links,
    nodeIndex,
    kindTypes,
    relationTypes,
  };
}
