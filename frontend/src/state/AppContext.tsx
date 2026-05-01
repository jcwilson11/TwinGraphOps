import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { adaptDocumentGraph, adaptGraph, adaptMergedGraph } from '../lib/adapters';
import {
  ApiClientError,
  getDocumentArtifacts,
  getDocumentGraph,
  getDocumentProcessingStatus,
  getGraph,
  getProcessingStatus,
  uploadDocument,
  uploadKnowledgeDocument,
} from '../lib/api';
import { appConfig } from '../lib/config';
import type {
  DocumentGraphState,
  DocumentUploadState,
  GraphState,
  UploadState,
  UploadedArtifactKind,
  UploadedGraphState,
  UploadedGraphUploadState,
} from '../types/app';
import type { ApiDocumentGraphData, ApiMergedGraphData } from '../types/api';

export interface AppContextValue {
  upload: UploadState;
  graph: GraphState;
  documentUpload: DocumentUploadState;
  documentGraph: DocumentGraphState;
  uploadedGraphUpload: UploadedGraphUploadState;
  uploadedGraph: UploadedGraphState;
  setDragActive: (active: boolean) => void;
  selectFile: (file: File | null) => boolean;
  clearSelectedFile: () => void;
  beginProcessing: () => Promise<void>;
  loadGraph: (options?: { keepStatus?: boolean }) => Promise<void>;
  setDocumentDragActive: (active: boolean) => void;
  selectDocumentFile: (file: File | null) => boolean;
  clearSelectedDocumentFile: () => void;
  beginDocumentProcessing: () => Promise<void>;
  loadDocumentGraph: (options?: { keepStatus?: boolean }) => Promise<void>;
  setUploadedGraphDragActive: (active: boolean) => void;
  selectUploadedGraphFile: (file: File | null) => boolean;
  clearSelectedUploadedGraphFile: () => void;
  loadUploadedGraphFromSelectedFile: () => Promise<void>;
  resetUploadState: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export const initialUploadState: UploadState = {
  phase: 'idle',
  selectedFile: null,
  error: null,
  statusMessage: 'Upload a .md or .txt file to build the graph.',
  ingestionId: null,
  ingestion: null,
  processingStatus: null,
  startedAt: null,
  completedAt: null,
  retryCount: 0,
};

const initialGraphState: GraphState = {
  status: 'idle',
  data: null,
  error: null,
  lastLoadedAt: null,
};

export const initialUploadedGraphUploadState: UploadedGraphUploadState = {
  phase: 'idle',
  selectedFile: null,
  error: null,
  statusMessage: 'Upload a merged_graph.json file to inspect a finalized knowledge graph.',
};

const initialUploadedGraphState: UploadedGraphState = {
  status: 'idle',
  kind: null,
  operationalData: null,
  documentData: null,
  error: null,
  lastLoadedAt: null,
  filename: null,
  rawData: null,
};

export const initialDocumentUploadState: DocumentUploadState = {
  phase: 'idle',
  selectedFile: null,
  error: null,
  statusMessage: 'Upload a .pdf, .md, or .txt file to build a document graph.',
  ingestionId: null,
  ingestion: null,
  processingStatus: null,
  startedAt: null,
  completedAt: null,
  retryCount: 0,
};

const initialDocumentGraphState: DocumentGraphState = {
  status: 'idle',
  data: null,
  error: null,
  lastLoadedAt: null,
  artifacts: null,
  artifactsError: null,
};

const DOCUMENT_ARTIFACT_FETCH_ATTEMPTS = 5;
const DOCUMENT_ARTIFACT_FETCH_DELAY_MS = 800;

export const supportedExtensions = ['.md', '.txt'];
export const supportedDocumentExtensions = ['.pdf', '.md', '.txt'];
export const supportedUploadedGraphExtensions = ['.json'];

export function getFileExtension(filename: string) {
  const segments = filename.toLowerCase().split('.');
  return segments.length > 1 ? `.${segments.pop()}` : '';
}

export function createSelectedFileUploadState(file: File): UploadState {
  return {
    phase: 'file-selected',
    selectedFile: file,
    error: null,
    statusMessage: `Ready to analyze ${file.name}.`,
    ingestionId: null,
    ingestion: null,
    processingStatus: null,
    startedAt: null,
    completedAt: null,
    retryCount: 0,
  };
}

export function createUploadErrorState(error: string, statusMessage: string): UploadState {
  return {
    ...initialUploadState,
    phase: 'error',
    error,
    statusMessage,
  };
}

export function createSelectedDocumentFileUploadState(file: File): DocumentUploadState {
  return {
    phase: 'file-selected',
    selectedFile: file,
    error: null,
    statusMessage: `Ready to map ${file.name}.`,
    ingestionId: null,
    ingestion: null,
    processingStatus: null,
    startedAt: null,
    completedAt: null,
    retryCount: 0,
  };
}

export function createDocumentUploadErrorState(error: string, statusMessage: string): DocumentUploadState {
  return {
    ...initialDocumentUploadState,
    phase: 'error',
    error,
    statusMessage,
  };
}

export function createSelectedUploadedGraphFileState(file: File): UploadedGraphUploadState {
  return {
    phase: 'file-selected',
    selectedFile: file,
    error: null,
    statusMessage: `Ready to inspect ${file.name}.`,
  };
}

export function createUploadedGraphErrorState(error: string, statusMessage: string): UploadedGraphUploadState {
  return {
    ...initialUploadedGraphUploadState,
    phase: 'error',
    error,
    statusMessage,
  };
}

export function validateSelectedFile(file: File | null, maxUploadBytes: number): UploadState {
  if (!file) {
    return initialUploadState;
  }

  const extension = getFileExtension(file.name);
  if (!supportedExtensions.includes(extension)) {
    return createUploadErrorState('Only .md and .txt files are supported.', 'Unsupported file type.');
  }

  if (file.size > maxUploadBytes) {
    return createUploadErrorState(
      `File exceeds the ${Math.round(maxUploadBytes / 1024 / 1024)} MB upload limit.`,
      'Selected file is too large.'
    );
  }

  return createSelectedFileUploadState(file);
}

export function validateSelectedDocumentFile(file: File | null, maxUploadBytes: number): DocumentUploadState {
  if (!file) {
    return initialDocumentUploadState;
  }

  const extension = getFileExtension(file.name);
  if (!supportedDocumentExtensions.includes(extension)) {
    return createDocumentUploadErrorState('Only .pdf, .md, and .txt files are supported.', 'Unsupported file type.');
  }

  if (file.size > maxUploadBytes) {
    return createDocumentUploadErrorState(
      `File exceeds the ${Math.round(maxUploadBytes / 1024 / 1024)} MB upload limit.`,
      'Selected file is too large.'
    );
  }

  return createSelectedDocumentFileUploadState(file);
}

export function validateSelectedUploadedGraphFile(file: File | null, maxUploadBytes: number): UploadedGraphUploadState {
  if (!file) {
    return initialUploadedGraphUploadState;
  }

  const extension = getFileExtension(file.name);
  if (!supportedUploadedGraphExtensions.includes(extension)) {
    return createUploadedGraphErrorState('Only .json graph artifact files are supported.', 'Unsupported file type.');
  }

  if (file.size > maxUploadBytes) {
    return createUploadedGraphErrorState(
      `File exceeds the ${Math.round(maxUploadBytes / 1024 / 1024)} MB upload limit.`,
      'Selected file is too large.'
    );
  }

  return createSelectedUploadedGraphFileState(file);
}

function ensureOperationalUploadedGraphShape(payload: unknown): ApiMergedGraphData {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('The uploaded file must be a JSON object with nodes and edges.');
  }

  const candidate = payload as Record<string, unknown>;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) {
    throw new Error('The uploaded file must include top-level nodes and edges arrays.');
  }

  return {
    nodes: candidate.nodes as ApiMergedGraphData['nodes'],
    edges: candidate.edges as ApiMergedGraphData['edges'],
  };
}

function ensureDocumentUploadedGraphShape(payload: unknown): ApiDocumentGraphData {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('The uploaded file must be a document graph JSON object with nodes and edges.');
  }

  const candidate = payload as Record<string, unknown>;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges) || typeof candidate.source !== 'string') {
    throw new Error('The uploaded document artifact must include source, nodes, and edges.');
  }

  return {
    source: candidate.source as ApiDocumentGraphData['source'],
    ingestion_id: null,
    nodes: candidate.nodes as ApiDocumentGraphData['nodes'],
    edges: candidate.edges as ApiDocumentGraphData['edges'],
  };
}

function isOperationalArtifactPayload(payload: Record<string, unknown>) {
  const firstNode = Array.isArray(payload.nodes) ? payload.nodes[0] : null;
  const firstEdge = Array.isArray(payload.edges) ? payload.edges[0] : null;
  if (Array.isArray(payload.nodes) && payload.nodes.length === 0 && Array.isArray(payload.edges) && payload.edges.length === 0) {
    return typeof payload.source !== 'string';
  }
  return (
    !!firstNode &&
    typeof firstNode === 'object' &&
    firstNode !== null &&
    'name' in firstNode &&
    'type' in firstNode &&
    'risk_score' in firstNode &&
    (!!firstEdge
      ? typeof firstEdge === 'object' && firstEdge !== null && 'relation' in firstEdge && 'rationale' in firstEdge
      : true)
  );
}

function isDocumentArtifactPayload(payload: Record<string, unknown>) {
  const firstNode = Array.isArray(payload.nodes) ? payload.nodes[0] : null;
  const firstEdge = Array.isArray(payload.edges) ? payload.edges[0] : null;
  if (Array.isArray(payload.nodes) && payload.nodes.length === 0 && Array.isArray(payload.edges) && payload.edges.length === 0) {
    return typeof payload.source === 'string';
  }
  return (
    typeof payload.source === 'string' &&
    !!firstNode &&
    typeof firstNode === 'object' &&
    firstNode !== null &&
    'label' in firstNode &&
    'kind' in firstNode &&
    'canonical_name' in firstNode &&
    (!!firstEdge
      ? typeof firstEdge === 'object' && firstEdge !== null && 'type' in firstEdge && 'summary' in firstEdge
      : true)
  );
}

export function parseUploadedGraphJson(fileContents: string): {
  kind: UploadedArtifactKind;
  rawData: ApiMergedGraphData | ApiDocumentGraphData;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContents);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The uploaded file must be a JSON object with graph nodes and edges.');
  }

  const candidate = parsed as Record<string, unknown>;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) {
    throw new Error('The uploaded file must include top-level nodes and edges arrays.');
  }

  if (isOperationalArtifactPayload(candidate)) {
    return {
      kind: 'operational',
      rawData: ensureOperationalUploadedGraphShape(candidate),
    };
  }

  if (isDocumentArtifactPayload(candidate)) {
    return {
      kind: 'document',
      rawData: ensureDocumentUploadedGraphShape(candidate),
    };
  }

  throw new Error('The uploaded JSON does not match a supported operational or document graph artifact schema.');
}

function toFriendlyMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected frontend error occurred.';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [upload, setUpload] = useState<UploadState>(initialUploadState);
  const [graph, setGraph] = useState<GraphState>(initialGraphState);
  const [documentUpload, setDocumentUpload] = useState<DocumentUploadState>(initialDocumentUploadState);
  const [documentGraph, setDocumentGraph] = useState<DocumentGraphState>(initialDocumentGraphState);
  const [uploadedGraphUpload, setUploadedGraphUpload] = useState<UploadedGraphUploadState>(initialUploadedGraphUploadState);
  const [uploadedGraph, setUploadedGraph] = useState<UploadedGraphState>(initialUploadedGraphState);
  const processingPromiseRef = useRef<Promise<void> | null>(null);
  const documentProcessingPromiseRef = useRef<Promise<void> | null>(null);

  const getDocumentArtifactsWithRetry = useCallback(async (ingestionId: string) => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < DOCUMENT_ARTIFACT_FETCH_ATTEMPTS; attempt += 1) {
      try {
        return await getDocumentArtifacts(ingestionId);
      } catch (error) {
        lastError = error;
        if (attempt < DOCUMENT_ARTIFACT_FETCH_ATTEMPTS - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, DOCUMENT_ARTIFACT_FETCH_DELAY_MS));
        }
      }
    }
    throw lastError;
  }, []);

  const setDragActive = useCallback((active: boolean) => {
    setUpload((current) => {
      if (active) {
        return { ...current, phase: 'drag-hover', statusMessage: 'Drop the file to queue it for ingestion.' };
      }

      if (current.selectedFile) {
        return { ...current, phase: 'file-selected', statusMessage: `Ready to analyze ${current.selectedFile.name}.` };
      }

      return { ...current, phase: 'idle', statusMessage: initialUploadState.statusMessage };
    });
  }, []);

  const selectFile = useCallback((file: File | null) => {
    const nextState = validateSelectedFile(file, appConfig.maxUploadBytes);
    setUpload(nextState);
    return nextState.phase === 'file-selected';
  }, []);

  const clearSelectedFile = useCallback(() => {
    setUpload(initialUploadState);
  }, []);

  const setDocumentDragActive = useCallback((active: boolean) => {
    setDocumentUpload((current) => {
      if (active) {
        return { ...current, phase: 'drag-hover', statusMessage: 'Drop the document to queue it for graph extraction.' };
      }

      if (current.selectedFile) {
        return { ...current, phase: 'file-selected', statusMessage: `Ready to map ${current.selectedFile.name}.` };
      }

      return { ...current, phase: 'idle', statusMessage: initialDocumentUploadState.statusMessage };
    });
  }, []);

  const selectDocumentFile = useCallback((file: File | null) => {
    const nextState = validateSelectedDocumentFile(file, appConfig.maxUploadBytes);
    setDocumentUpload(nextState);
    return nextState.phase === 'file-selected';
  }, []);

  const clearSelectedDocumentFile = useCallback(() => {
    setDocumentUpload(initialDocumentUploadState);
  }, []);

  const setUploadedGraphDragActive = useCallback((active: boolean) => {
    setUploadedGraphUpload((current) => {
      if (active) {
        return { ...current, phase: 'drag-hover', statusMessage: 'Drop merged_graph.json to open it locally.' };
      }

      if (current.selectedFile) {
        return { ...current, phase: 'file-selected', statusMessage: `Ready to inspect ${current.selectedFile.name}.` };
      }

      return { ...current, phase: 'idle', statusMessage: initialUploadedGraphUploadState.statusMessage };
    });
  }, []);

  const selectUploadedGraphFile = useCallback((file: File | null) => {
    const nextState = validateSelectedUploadedGraphFile(file, appConfig.maxUploadBytes);
    setUploadedGraphUpload(nextState);
    if (nextState.phase !== 'file-selected') {
      setUploadedGraph(initialUploadedGraphState);
    }
    return nextState.phase === 'file-selected';
  }, []);

  const clearSelectedUploadedGraphFile = useCallback(() => {
    setUploadedGraphUpload(initialUploadedGraphUploadState);
    setUploadedGraph(initialUploadedGraphState);
  }, []);

  const loadGraph = useCallback(async (options?: { keepStatus?: boolean }) => {
    setGraph((current) => ({
      ...current,
      status: 'loading',
      error: null,
    }));

    try {
      const payload = await getGraph();
      const adaptedGraph = adaptGraph(payload);
      setGraph({
        status: 'ready',
        data: adaptedGraph,
        error: null,
        lastLoadedAt: Date.now(),
      });

      if (!options?.keepStatus) {
        setUpload((current) => {
          if (current.phase === 'success' || current.phase === 'empty-graph') {
            return current;
          }

          return {
            ...current,
            phase: adaptedGraph.nodes.length === 0 ? 'empty-graph' : current.phase,
          };
        });
      }
    } catch (error) {
      const message = toFriendlyMessage(error);
      setGraph({
        status: 'error',
        data: null,
        error: message,
        lastLoadedAt: null,
      });
      throw error;
    }
  }, []);

  const loadDocumentGraph = useCallback(async (options?: { keepStatus?: boolean }) => {
    setDocumentGraph((current) => ({
      ...current,
      status: 'loading',
      error: null,
      artifactsError: current.artifactsError,
    }));

    try {
      const payload = await getDocumentGraph();
      const adaptedGraph = adaptDocumentGraph(payload);
      const artifactManifest = adaptedGraph.ingestionId
        ? await getDocumentArtifactsWithRetry(adaptedGraph.ingestionId).catch(() => null)
        : null;
      setDocumentGraph({
        status: 'ready',
        data: adaptedGraph,
        error: null,
        lastLoadedAt: Date.now(),
        artifacts: artifactManifest,
        artifactsError:
          adaptedGraph.ingestionId && !artifactManifest
            ? 'Source materials are temporarily unavailable for this document right now.'
            : !adaptedGraph.ingestionId
              ? 'Source material downloads are unavailable because this document graph was loaded without an ingestion ID.'
              : null,
      });

      if (!options?.keepStatus) {
        setDocumentUpload((current) => {
          if (current.phase === 'success' || current.phase === 'empty-graph') {
            return current;
          }

          return {
            ...current,
            phase: adaptedGraph.nodes.length === 0 ? 'empty-graph' : current.phase,
          };
        });
      }
    } catch (error) {
      const message = toFriendlyMessage(error);
      setDocumentGraph({
        status: 'error',
        data: null,
        error: message,
        lastLoadedAt: null,
        artifacts: null,
        artifactsError: null,
      });
      throw error;
    }
  }, []);

  const beginProcessing = useCallback(async () => {
    if (!upload.selectedFile) {
      setUpload((current) => ({
        ...current,
        phase: 'error',
        error: 'Choose a .md or .txt file before processing.',
        statusMessage: 'No file selected.',
      }));
      return;
    }

    if (processingPromiseRef.current) {
      return processingPromiseRef.current;
    }

    const selectedFile = upload.selectedFile;

    const task = (async () => {
      let processingPhaseTimer = 0;
      const ingestionId = crypto.randomUUID();
      let keepPolling = true;

      const pollProcessing = async () => {
        while (keepPolling) {
          try {
            const processingStatus = await getProcessingStatus(ingestionId);
            setUpload((current) =>
              current.ingestionId !== ingestionId
                ? current
                : {
                    ...current,
                    processingStatus,
                    statusMessage: processingStatus.latest_event || current.statusMessage,
                  }
            );
          } catch {
            // Polling is best-effort so the main upload flow can continue even if status refresh fails.
          }

          if (!keepPolling) {
            break;
          }

          await new Promise((resolve) => window.setTimeout(resolve, 800));
        }
      };

      try {
        setUpload((current) => ({
          ...current,
          phase: 'uploading',
          error: null,
          statusMessage: `Uploading ${selectedFile.name}...`,
          ingestionId,
          startedAt: Date.now(),
          completedAt: null,
          processingStatus: {
            ingestion_id: ingestionId,
            state: 'pending',
            filename: selectedFile.name,
            chunks_total: null,
            current_chunk: null,
            started_at: null,
            completed_at: null,
            latest_event: `Uploading ${selectedFile.name}...`,
            events: [],
          },
        }));

        const pollingTask = pollProcessing();

        processingPhaseTimer = window.setTimeout(() => {
          setUpload((current) =>
            current.phase === 'uploading'
              ? {
                  ...current,
                  phase: 'processing',
                  statusMessage: 'Extracting components, relationships, and risk metrics...',
                }
              : current
          );
        }, 900);

        const ingestion = await uploadDocument(selectedFile, true, appConfig.processingTimeoutMs, ingestionId);
        const latestProcessingStatus = await getProcessingStatus(ingestionId).catch(() => null);

        setUpload((current) => ({
          ...current,
          ingestion,
          phase: 'processing',
          statusMessage: latestProcessingStatus?.latest_event || 'Loading the generated graph workspace...',
          processingStatus: latestProcessingStatus || current.processingStatus,
        }));

        const graphPayload = await getGraph();
        const adaptedGraph = adaptGraph(graphPayload);

        setGraph({
          status: 'ready',
          data: adaptedGraph,
          error: null,
          lastLoadedAt: Date.now(),
        });

        setUpload((current) => ({
          ...current,
          ingestion,
          ingestionId,
          phase: adaptedGraph.nodes.length === 0 ? 'empty-graph' : 'success',
          error: null,
          statusMessage:
            latestProcessingStatus?.latest_event ||
            (adaptedGraph.nodes.length === 0
              ? 'Processing completed, but the active graph is empty.'
              : 'TwinGraphOps finished processing your document.'),
          processingStatus:
            latestProcessingStatus ??
            current.processingStatus,
          completedAt: Date.now(),
        }));
        keepPolling = false;
        await pollingTask;
      } catch (error) {
        keepPolling = false;
        const latestProcessingStatus = await getProcessingStatus(ingestionId).catch(() => null);
        const message = toFriendlyMessage(error);
        setUpload((current) => ({
          ...current,
          phase: 'retry',
          error: message,
          statusMessage: message,
          processingStatus: latestProcessingStatus || current.processingStatus,
          completedAt: Date.now(),
          retryCount: current.retryCount + 1,
        }));
        throw error;
      } finally {
        keepPolling = false;
        window.clearTimeout(processingPhaseTimer);
        processingPromiseRef.current = null;
      }
    })();

    processingPromiseRef.current = task;
    return task;
  }, [upload.selectedFile]);

  const beginDocumentProcessing = useCallback(async () => {
    if (!documentUpload.selectedFile) {
      setDocumentUpload((current) => ({
        ...current,
        phase: 'error',
        error: 'Choose a .pdf, .md, or .txt file before processing.',
        statusMessage: 'No document selected.',
      }));
      return;
    }

    if (documentProcessingPromiseRef.current) {
      return documentProcessingPromiseRef.current;
    }

    const selectedFile = documentUpload.selectedFile;

    const task = (async () => {
      let processingPhaseTimer = 0;
      const ingestionId = crypto.randomUUID();
      let keepPolling = true;

      const pollProcessing = async () => {
        while (keepPolling) {
          try {
            const processingStatus = await getDocumentProcessingStatus(ingestionId);
            setDocumentUpload((current) =>
              current.ingestionId !== ingestionId
                ? current
                : {
                    ...current,
                    processingStatus,
                    statusMessage: processingStatus.latest_event || current.statusMessage,
                  }
            );
          } catch {
            // Polling is best-effort so the main upload flow can continue.
          }

          if (!keepPolling) {
            break;
          }

          await new Promise((resolve) => window.setTimeout(resolve, 800));
        }
      };

      try {
        setDocumentUpload((current) => ({
          ...current,
          phase: 'uploading',
          error: null,
          statusMessage: `Uploading ${selectedFile.name}...`,
          ingestionId,
          startedAt: Date.now(),
          completedAt: null,
          processingStatus: {
            ingestion_id: ingestionId,
            state: 'pending',
            filename: selectedFile.name,
            chunks_total: null,
            current_chunk: null,
            started_at: null,
            completed_at: null,
            latest_event: `Uploading ${selectedFile.name}...`,
            events: [],
          },
        }));

        const pollingTask = pollProcessing();

        processingPhaseTimer = window.setTimeout(() => {
          setDocumentUpload((current) =>
            current.phase === 'uploading'
              ? {
                  ...current,
                  phase: 'processing',
                  statusMessage: 'Extracting document entities, evidence, and relationships...',
                }
              : current
          );
        }, 900);

        const ingestion = await uploadKnowledgeDocument(selectedFile, true, appConfig.processingTimeoutMs, ingestionId);
        setDocumentUpload((current) => ({
          ...current,
          ingestion,
          phase: 'processing',
          statusMessage: 'Document accepted. Waiting for processing progress...',
        }));

        let latestProcessingStatus = await getDocumentProcessingStatus(ingestionId).catch(() => null);
        while (keepPolling && latestProcessingStatus?.state !== 'succeeded' && latestProcessingStatus?.state !== 'failed') {
          await new Promise((resolve) => window.setTimeout(resolve, 800));
          latestProcessingStatus = await getDocumentProcessingStatus(ingestionId).catch(() => latestProcessingStatus);
        }

        if (latestProcessingStatus?.state === 'failed') {
          throw new ApiClientError(
            latestProcessingStatus.latest_event || 'Document processing failed before the graph was ready.',
            {
              code: 'document_processing_failed',
              retryable: true,
            }
          );
        }

        const graphPayload = await getDocumentGraph();
        const adaptedGraph = adaptDocumentGraph(graphPayload);
        const artifactManifest = adaptedGraph.ingestionId
          ? await getDocumentArtifactsWithRetry(adaptedGraph.ingestionId).catch(() => null)
          : null;

        setDocumentGraph({
          status: 'ready',
          data: adaptedGraph,
          error: null,
          lastLoadedAt: Date.now(),
          artifacts: artifactManifest,
          artifactsError:
            adaptedGraph.ingestionId && !artifactManifest
              ? 'Source materials are temporarily unavailable for this document right now.'
              : !adaptedGraph.ingestionId
                ? 'Source material downloads are unavailable because this document graph was loaded without an ingestion ID.'
                : null,
        });

        setDocumentUpload((current) => ({
          ...current,
          ingestion,
          ingestionId,
          phase: adaptedGraph.nodes.length === 0 ? 'empty-graph' : 'success',
          error: null,
          statusMessage:
            latestProcessingStatus?.latest_event ||
            (adaptedGraph.nodes.length === 0
              ? 'Processing completed, but the document graph is empty.'
              : 'TwinGraphOps finished mapping your document.'),
          processingStatus: latestProcessingStatus ?? current.processingStatus,
          completedAt: Date.now(),
        }));
        keepPolling = false;
        await pollingTask;
      } catch (error) {
        keepPolling = false;
        const latestProcessingStatus = await getDocumentProcessingStatus(ingestionId).catch(() => null);
        const message = toFriendlyMessage(error);
        setDocumentUpload((current) => ({
          ...current,
          phase: 'retry',
          error: message,
          statusMessage: message,
          processingStatus: latestProcessingStatus || current.processingStatus,
          completedAt: Date.now(),
          retryCount: current.retryCount + 1,
        }));
        throw error;
      } finally {
        keepPolling = false;
        window.clearTimeout(processingPhaseTimer);
        documentProcessingPromiseRef.current = null;
      }
    })();

    documentProcessingPromiseRef.current = task;
    return task;
  }, [documentUpload.selectedFile]);

  const loadUploadedGraphFromSelectedFile = useCallback(async () => {
    const selectedFile = uploadedGraphUpload.selectedFile;
    if (!selectedFile) {
      setUploadedGraphUpload((current) => ({
        ...current,
        phase: 'error',
        error: 'Choose a graph artifact JSON file before opening the graph workspace.',
        statusMessage: 'No graph file selected.',
      }));
      return;
    }

    setUploadedGraph((current) => ({
      ...current,
      status: 'loading',
      error: null,
      filename: selectedFile.name,
    }));
    setUploadedGraphUpload((current) => ({
      ...current,
      phase: 'uploading',
      error: null,
      statusMessage: `Loading ${selectedFile.name} locally...`,
    }));

    try {
      const fileContents = await selectedFile.text();
      const parsedArtifact = parseUploadedGraphJson(fileContents);
      if (parsedArtifact.kind === 'operational') {
        const adaptedGraph = adaptMergedGraph(parsedArtifact.rawData as ApiMergedGraphData, selectedFile.name);
        setUploadedGraph({
          status: 'ready',
          kind: 'operational',
          operationalData: adaptedGraph,
          documentData: null,
          error: null,
          lastLoadedAt: Date.now(),
          filename: selectedFile.name,
          rawData: parsedArtifact.rawData,
        });
        setUploadedGraphUpload((current) => ({
          ...current,
          phase: adaptedGraph.nodes.length === 0 ? 'empty-graph' : 'success',
          error: null,
          statusMessage:
            adaptedGraph.nodes.length === 0
              ? 'The uploaded operational graph contains no nodes.'
              : `Loaded operational graph artifact ${selectedFile.name}.`,
        }));
      } else {
        const adaptedGraph = adaptDocumentGraph(parsedArtifact.rawData as ApiDocumentGraphData);
        setUploadedGraph({
          status: 'ready',
          kind: 'document',
          operationalData: null,
          documentData: adaptedGraph,
          error: null,
          lastLoadedAt: Date.now(),
          filename: selectedFile.name,
          rawData: parsedArtifact.rawData,
        });
        setUploadedGraphUpload((current) => ({
          ...current,
          phase: adaptedGraph.nodes.length === 0 ? 'empty-graph' : 'success',
          error: null,
          statusMessage:
            adaptedGraph.nodes.length === 0
              ? 'The uploaded document graph contains no nodes.'
              : `Loaded document graph artifact ${selectedFile.name}.`,
        }));
      }
    } catch (error) {
      const message = toFriendlyMessage(error);
      setUploadedGraph({
        status: 'error',
        kind: null,
        operationalData: null,
        documentData: null,
        error: message,
        lastLoadedAt: null,
        filename: selectedFile.name,
        rawData: null,
      });
      setUploadedGraphUpload((current) => ({
        ...current,
        phase: 'error',
        error: message,
        statusMessage: message,
      }));
      throw error;
    }
  }, [uploadedGraphUpload.selectedFile]);

  const resetUploadState = useCallback(() => {
    setUpload(initialUploadState);
    setDocumentUpload(initialDocumentUploadState);
    setUploadedGraphUpload(initialUploadedGraphUploadState);
    setUploadedGraph(initialUploadedGraphState);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      upload,
      graph,
      documentUpload,
      documentGraph,
      uploadedGraphUpload,
      uploadedGraph,
      setDragActive,
      selectFile,
      clearSelectedFile,
      beginProcessing,
      loadGraph,
      setDocumentDragActive,
      selectDocumentFile,
      clearSelectedDocumentFile,
      beginDocumentProcessing,
      loadDocumentGraph,
      setUploadedGraphDragActive,
      selectUploadedGraphFile,
      clearSelectedUploadedGraphFile,
      loadUploadedGraphFromSelectedFile,
      resetUploadState,
    }),
    [
      upload,
      graph,
      documentUpload,
      documentGraph,
      uploadedGraphUpload,
      uploadedGraph,
      setDragActive,
      selectFile,
      clearSelectedFile,
      beginProcessing,
      loadGraph,
      setDocumentDragActive,
      selectDocumentFile,
      clearSelectedDocumentFile,
      beginDocumentProcessing,
      loadDocumentGraph,
      setUploadedGraphDragActive,
      selectUploadedGraphFile,
      clearSelectedUploadedGraphFile,
      loadUploadedGraphFromSelectedFile,
      resetUploadState,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider.');
  }
  return context;
}
