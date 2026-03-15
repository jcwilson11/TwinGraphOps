import { appConfig } from './config';
import type { ApiGraphData, ApiPayload, ImpactResponse, IngestResponse, RiskResponse } from '../types/api';

export class ApiClientError extends Error {
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
  retryable: boolean;

  constructor(
    message: string,
    options: {
      code?: string;
      status?: number;
      details?: Record<string, unknown>;
      retryable?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.retryable = options.retryable ?? false;
  }
}

export class UnsupportedEndpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedEndpointError';
  }
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as ApiPayload<unknown>;
  } catch {
    throw new ApiClientError('The API returned malformed JSON.', {
      status: response.status,
      retryable: false,
    });
  }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      ...init,
      signal: controller.signal,
    });
    const payload = await parseJsonSafely(response);

    if (!payload || typeof payload !== 'object') {
      throw new ApiClientError('The API returned an empty response.', {
        status: response.status,
        retryable: false,
      });
    }

    if (!response.ok || payload.status !== 'ok') {
      const errorPayload = payload as Exclude<ApiPayload<T>, { status: 'ok' }>;
      throw new ApiClientError(errorPayload.error?.message || 'The request failed.', {
        code: errorPayload.error?.code,
        status: response.status,
        details: errorPayload.error?.details,
        retryable: response.status >= 500 || response.status === 0,
      });
    }

    return payload.data as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError('Processing timed out before the backend completed the graph build.', {
        code: 'request_timeout',
        retryable: true,
      });
    }

    throw new ApiClientError('Network failure while contacting the TwinGraphOps API.', {
      code: 'network_error',
      retryable: true,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function uploadDocument(file: File, replaceExisting = true, timeoutMs = appConfig.processingTimeoutMs) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('replace_existing', String(replaceExisting));

  return request<IngestResponse>(
    '/ingest',
    {
      method: 'POST',
      body: formData,
    },
    timeoutMs
  );
}

export async function getGraph() {
  return request<ApiGraphData>('/graph');
}

export async function getRisk(componentId: string) {
  return request<RiskResponse>(`/risk?component_id=${encodeURIComponent(componentId)}`);
}

export async function getImpact(componentId: string) {
  return request<ImpactResponse>(`/impact?component_id=${encodeURIComponent(componentId)}`);
}

export async function seedDemoGraph() {
  return request<{ source: string; nodes_created: number; edges_created: number; risk_nodes_scored: number }>(
    '/seed',
    { method: 'POST' }
  );
}

export async function getProcessingStatus(_ingestionId: string): Promise<never> {
  // TODO: add backend polling integration when a job status endpoint is introduced.
  throw new UnsupportedEndpointError('The current backend contract does not expose a processing status endpoint.');
}

export async function getRiskRankedItems(): Promise<never> {
  // TODO: replace client-side risk ranking when the backend exposes a dedicated risk list endpoint.
  throw new UnsupportedEndpointError('The current backend contract does not expose a ranked risk list endpoint.');
}

export async function getArchitectureSummary(): Promise<never> {
  // TODO: replace client-side summary derivation when the backend exposes a dedicated summary endpoint.
  throw new UnsupportedEndpointError('The current backend contract does not expose an architecture summary endpoint.');
}
