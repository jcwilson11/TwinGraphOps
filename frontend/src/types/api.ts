export interface ApiErrorPayload {
  status: 'error';
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiSuccessPayload<T> {
  status: 'ok';
  data: T;
}

export type ApiPayload<T> = ApiSuccessPayload<T> | ApiErrorPayload;

export interface IngestResponse {
  ingestion_id: string;
  filename: string;
  source: string;
  chunks_total: number;
  artifacts_path: string;
  replaced_existing: boolean;
  nodes_created: number;
  edges_created: number;
  risk_nodes_scored: number;
}

export interface DocumentIngestResponse {
  ingestion_id: string;
  filename: string;
  source: string;
  chunks_total: number | null;
  markdown_parts_created: number | null;
  page_markers_detected: boolean | null;
  total_pages: number | null;
  artifacts_path: string;
  replaced_existing: boolean;
  nodes_created: number | null;
  edges_created: number | null;
  evidence_items: number | null;
}

export interface ProcessingEvent {
  timestamp: string | null;
  level: string | null;
  event: string;
  message: string;
  chunk_index?: number | null;
}

export interface ProcessingStatus {
  ingestion_id: string;
  state: 'pending' | 'running' | 'succeeded' | 'failed';
  filename: string | null;
  chunks_total: number | null;
  current_chunk: number | null;
  started_at: string | null;
  completed_at: string | null;
  latest_event: string;
  events: ProcessingEvent[];
}

export interface ApiGraphNode {
  id: string;
  name: string;
  type: string;
  description: string;
  risk_score: number;
  risk_level: string;
  degree: number;
  betweenness: number;
  closeness: number;
  blast_radius: number;
  dependency_span: number;
  risk_explanation: string;
  source: string;
}

export interface ApiGraphEdge {
  source: string;
  target: string;
  relation: string;
  rationale: string;
}

export interface ApiGraphData {
  source: string;
  nodes: ApiGraphNode[];
  edges: ApiGraphEdge[];
}

export interface RiskResponse {
  component_id: string;
  score: number;
  level: string;
  impacted_components: string[];
  explanation: string;
}

export interface ImpactResponse {
  component_id: string;
  impacted_components: string[];
  impact_count: number;
}

export interface ApiDocumentEvidence {
  quote: string;
  page_start: number | null;
  page_end: number | null;
}

export interface ApiDocumentSource {
  document_name: string;
  chunk_file: string;
  chunk_id: string;
  pdf_page_start: number | null;
  pdf_page_end: number | null;
}

export interface ApiDocumentNode {
  id: string;
  label: string;
  kind: string;
  canonical_name: string;
  aliases: string[];
  summary: string;
  evidence: ApiDocumentEvidence[];
  sources: ApiDocumentSource[];
  degree: number;
  source: string;
}

export interface ApiDocumentEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  summary: string;
  evidence: ApiDocumentEvidence[];
  source_chunk: ApiDocumentSource | null;
}

export interface ApiDocumentGraphData {
  source: string;
  nodes: ApiDocumentNode[];
  edges: ApiDocumentEdge[];
}
