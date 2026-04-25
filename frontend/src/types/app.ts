import type { DocumentIngestResponse, IngestResponse, ProcessingStatus } from './api';

export type UploadPhase =
  | 'idle'
  | 'drag-hover'
  | 'file-selected'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'empty-graph'
  | 'error'
  | 'retry';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface GraphLinkEndpointRef {
  id: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  description: string;
  riskScore: number;
  riskLevel: string;
  degree: number;
  betweenness: number;
  closeness: number;
  blastRadius: number;
  dependencySpan: number;
  riskExplanation: string;
  source: string;
  dependencies: string[];
  dependents: string[];
  val: number;
}

export interface GraphEdge {
  id: string;
  source: string | GraphLinkEndpointRef;
  target: string | GraphLinkEndpointRef;
  relation: string;
  rationale: string;
}

export interface GraphData {
  source: string;
  nodes: GraphNode[];
  links: GraphEdge[];
  nodeIndex: Record<string, GraphNode>;
  relationTypes: string[];
}

export interface NodeReference {
  id: string;
  name: string;
  type: string;
}

export interface NodeDetails {
  componentId: string;
  name: string;
  type: string;
  riskScore: number;
  riskLevel: string;
  description: string;
  dependencies: NodeReference[];
  affectedSystems: NodeReference[];
  issues: string[];
  explanation: string;
  impactCount: number;
  metadata: Array<{ label: string; value: string }>;
}

export interface GraphSummary {
  totalComponents: number;
  totalRelationships: number;
  avgRisk: number;
  highRiskNodes: number;
  highestRiskNode: GraphNode | null;
  riskDistribution: Array<{ label: string; key: string; count: number }>;
  typeDistribution: Array<{ type: string; count: number }>;
  mostConnectedNodes: Array<{ node: GraphNode; connections: number }>;
  topRiskNodes: GraphNode[];
  blastRadiusLeaders: Array<{ node: GraphNode; count: number }>;
}

export interface UploadState {
  phase: UploadPhase;
  selectedFile: File | null;
  error: string | null;
  statusMessage: string;
  ingestionId: string | null;
  ingestion: IngestResponse | null;
  processingStatus: ProcessingStatus | null;
  startedAt: number | null;
  completedAt: number | null;
  retryCount: number;
}

export interface GraphState {
  status: LoadStatus;
  data: GraphData | null;
  error: string | null;
  lastLoadedAt: number | null;
}

export interface DocumentEvidence {
  quote: string;
  pageStart: number | null;
  pageEnd: number | null;
}

export interface DocumentSource {
  documentName: string;
  chunkFile: string;
  chunkId: string;
  pdfPageStart: number | null;
  pdfPageEnd: number | null;
}

export interface DocumentNode {
  id: string;
  label: string;
  kind: string;
  canonicalName: string;
  aliases: string[];
  summary: string;
  evidence: DocumentEvidence[];
  sources: DocumentSource[];
  degree: number;
  source: string;
  val: number;
}

export interface DocumentEdge {
  id: string;
  source: string | GraphLinkEndpointRef;
  target: string | GraphLinkEndpointRef;
  type: string;
  summary: string;
  evidence: DocumentEvidence[];
  sourceChunk: DocumentSource | null;
}

export interface DocumentGraphData {
  source: string;
  nodes: DocumentNode[];
  links: DocumentEdge[];
  nodeIndex: Record<string, DocumentNode>;
  kindTypes: string[];
  relationTypes: string[];
}

export interface DocumentUploadState {
  phase: UploadPhase;
  selectedFile: File | null;
  error: string | null;
  statusMessage: string;
  ingestionId: string | null;
  ingestion: DocumentIngestResponse | null;
  processingStatus: ProcessingStatus | null;
  startedAt: number | null;
  completedAt: number | null;
  retryCount: number;
}

export interface DocumentGraphState {
  status: LoadStatus;
  data: DocumentGraphData | null;
  error: string | null;
  lastLoadedAt: number | null;
}
