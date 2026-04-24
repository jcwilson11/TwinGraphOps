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
