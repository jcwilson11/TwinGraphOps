var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/adapters.ts
function ensureString(value, label) {
  if (typeof value !== "string") {
    throw new Error(`Malformed API response: expected ${label} to be a string.`);
  }
  return value;
}
function ensureNumber(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Malformed API response: expected ${label} to be a number.`);
  }
  return value;
}
function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Malformed API response: expected ${label} to be an array.`);
  }
  return value;
}
function normalizeNode(node, dependencyMap, dependentMap) {
  return {
    id: ensureString(node.id, "node.id"),
    name: ensureString(node.name, "node.name"),
    type: ensureString(node.type, "node.type"),
    description: ensureString(node.description, "node.description"),
    riskScore: ensureNumber(node.risk_score, "node.risk_score"),
    riskLevel: ensureString(node.risk_level, "node.risk_level"),
    degree: ensureNumber(node.degree, "node.degree"),
    betweenness: ensureNumber(node.betweenness, "node.betweenness"),
    closeness: ensureNumber(node.closeness, "node.closeness"),
    blastRadius: ensureNumber(node.blast_radius, "node.blast_radius"),
    dependencySpan: ensureNumber(node.dependency_span, "node.dependency_span"),
    riskExplanation: ensureString(node.risk_explanation, "node.risk_explanation"),
    source: ensureString(node.source, "node.source"),
    dependencies: dependencyMap.get(node.id) ?? [],
    dependents: dependentMap.get(node.id) ?? [],
    val: 18 + Math.round(node.risk_score / 100 * 22)
  };
}
function normalizeEdge(edge, index) {
  return {
    id: `${ensureString(edge.source, "edge.source")}-${ensureString(edge.target, "edge.target")}-${index}`,
    source: edge.source,
    target: edge.target,
    relation: ensureString(edge.relation, "edge.relation"),
    rationale: ensureString(edge.rationale, "edge.rationale")
  };
}
function adaptGraph(apiGraph) {
  const source = ensureString(apiGraph.source, "graph.source");
  const apiNodes = ensureArray(apiGraph.nodes, "graph.nodes");
  const apiEdges = ensureArray(apiGraph.edges, "graph.edges");
  const dependencyMap = /* @__PURE__ */ new Map();
  const dependentMap = /* @__PURE__ */ new Map();
  for (const edge of apiEdges) {
    const sourceId = ensureString(edge.source, "edge.source");
    const targetId = ensureString(edge.target, "edge.target");
    dependencyMap.set(sourceId, [...dependencyMap.get(sourceId) ?? [], targetId]);
    dependentMap.set(targetId, [...dependentMap.get(targetId) ?? [], sourceId]);
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
    relationTypes
  };
}
function normalizeDocumentEvidence(evidence) {
  return {
    quote: ensureString(evidence.quote, "document.evidence.quote"),
    pageStart: evidence.page_start,
    pageEnd: evidence.page_end
  };
}
function normalizeDocumentSource(source) {
  return {
    documentName: ensureString(source.document_name, "document.source.document_name"),
    chunkFile: ensureString(source.chunk_file, "document.source.chunk_file"),
    chunkId: ensureString(source.chunk_id, "document.source.chunk_id"),
    pdfPageStart: source.pdf_page_start,
    pdfPageEnd: source.pdf_page_end
  };
}
function normalizeDocumentNode(node) {
  const degree = ensureNumber(node.degree, "document.node.degree");
  return {
    id: ensureString(node.id, "document.node.id"),
    label: ensureString(node.label, "document.node.label"),
    kind: ensureString(node.kind, "document.node.kind"),
    canonicalName: ensureString(node.canonical_name, "document.node.canonical_name"),
    aliases: ensureArray(node.aliases, "document.node.aliases"),
    summary: ensureString(node.summary, "document.node.summary"),
    evidence: ensureArray(node.evidence, "document.node.evidence").map(normalizeDocumentEvidence),
    sources: ensureArray(node.sources, "document.node.sources").map(normalizeDocumentSource),
    degree,
    source: ensureString(node.source, "document.node.source"),
    val: 16 + Math.min(18, Math.round(degree * 4))
  };
}
function normalizeDocumentEdge(edge) {
  return {
    id: ensureString(edge.id, "document.edge.id"),
    source: ensureString(edge.source, "document.edge.source"),
    target: ensureString(edge.target, "document.edge.target"),
    type: ensureString(edge.type, "document.edge.type"),
    summary: ensureString(edge.summary, "document.edge.summary"),
    evidence: ensureArray(edge.evidence, "document.edge.evidence").map(normalizeDocumentEvidence),
    sourceChunk: edge.source_chunk ? normalizeDocumentSource(edge.source_chunk) : null
  };
}
function adaptDocumentGraph(apiGraph) {
  const source = ensureString(apiGraph.source, "document.graph.source");
  const nodes = ensureArray(apiGraph.nodes, "document.graph.nodes").map(normalizeDocumentNode);
  const links = ensureArray(apiGraph.edges, "document.graph.edges").map(normalizeDocumentEdge);
  const nodeIndex = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const kindTypes = [...new Set(nodes.map((node) => node.kind))].sort();
  const relationTypes = [...new Set(links.map((edge) => edge.type))].sort();
  return {
    source,
    nodes,
    links,
    nodeIndex,
    kindTypes,
    relationTypes
  };
}
var init_adapters = __esm({
  "src/lib/adapters.ts"() {
    "use strict";
  }
});

// src/lib/config.ts
function readNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
var runtimeConfig, appConfig;
var init_config = __esm({
  "src/lib/config.ts"() {
    "use strict";
    runtimeConfig = window.__TWIN_CONFIG__ ?? {};
    appConfig = {
      apiBaseUrl: "http://localhost:8000",
      maxUploadBytes: readNumber(runtimeConfig.MAX_UPLOAD_MB || import.meta.env.VITE_MAX_UPLOAD_MB, 10) * 1024 * 1024,
      processingTimeoutMs: readNumber(
        runtimeConfig.PROCESSING_TIMEOUT_MS || import.meta.env.VITE_PROCESSING_TIMEOUT_MS,
        3e5
      ),
      environment: runtimeConfig.APP_ENV || "local"
    };
  }
});

// src/lib/api.ts
async function parseJsonSafely(response) {
  const text = await response.text();
  console.log("BACKEND RESPONSE:", text);
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("PARSE ERROR:", error);
    console.error("RAW RESPONSE TEXT:", text);
    throw new ApiClientError("The API returned malformed JSON.", {
      status: response.status,
      retryable: false
    });
  }
}
async function request(path, init = {}, timeoutMs = 3e4) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`/api${path}`, {
      ...init,
      signal: controller.signal
    });
    const payload = await parseJsonSafely(response);
    if (!payload || typeof payload !== "object") {
      throw new ApiClientError("The API returned an empty response.", {
        status: response.status,
        retryable: false
      });
    }
    if (!response.ok || payload.status !== "ok") {
      const errorPayload = payload;
      throw new ApiClientError(errorPayload.error?.message || "The request failed.", {
        code: errorPayload.error?.code,
        status: response.status,
        details: errorPayload.error?.details,
        retryable: response.status >= 500 || response.status === 0
      });
    }
    return payload.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError("Processing timed out before the backend completed the graph build.", {
        code: "request_timeout",
        retryable: true
      });
    }
    throw new ApiClientError("Network failure while contacting the TwinGraphOps API.", {
      code: "network_error",
      retryable: true
    });
  } finally {
    window.clearTimeout(timeout);
  }
}
async function uploadDocument(file, replaceExisting = true, timeoutMs = appConfig.processingTimeoutMs, ingestionId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("replace_existing", String(replaceExisting));
  if (ingestionId) {
    formData.append("ingestion_id", ingestionId);
  }
  return request(
    "/ingest",
    {
      method: "POST",
      body: formData
    },
    timeoutMs
  );
}
async function uploadKnowledgeDocument(file, replaceExisting = true, timeoutMs = appConfig.processingTimeoutMs, ingestionId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("replace_existing", String(replaceExisting));
  if (ingestionId) {
    formData.append("ingestion_id", ingestionId);
  }
  return request(
    "/document/ingest",
    {
      method: "POST",
      body: formData
    },
    timeoutMs
  );
}
async function getGraph() {
  return request("/graph");
}
async function getDocumentGraph() {
  return request("/document/graph");
}
async function getProcessingStatus(ingestionId) {
  return request(`/ingest/${encodeURIComponent(ingestionId)}/events`);
}
async function getDocumentProcessingStatus(ingestionId) {
  return request(`/document/ingest/${encodeURIComponent(ingestionId)}/events`);
}
var ApiClientError;
var init_api = __esm({
  "src/lib/api.ts"() {
    "use strict";
    init_config();
    ApiClientError = class extends Error {
      code;
      status;
      details;
      retryable;
      constructor(message, options = {}) {
        super(message);
        this.name = "ApiClientError";
        this.code = options.code;
        this.status = options.status;
        this.details = options.details;
        this.retryable = options.retryable ?? false;
      }
    };
  }
});

// src/state/AppContext.tsx
var AppContext_exports = {};
__export(AppContext_exports, {
  AppContext: () => AppContext,
  AppProvider: () => AppProvider,
  createDocumentUploadErrorState: () => createDocumentUploadErrorState,
  createSelectedDocumentFileUploadState: () => createSelectedDocumentFileUploadState,
  createSelectedFileUploadState: () => createSelectedFileUploadState,
  createUploadErrorState: () => createUploadErrorState,
  getFileExtension: () => getFileExtension,
  initialDocumentUploadState: () => initialDocumentUploadState,
  initialUploadState: () => initialUploadState,
  supportedDocumentExtensions: () => supportedDocumentExtensions,
  supportedExtensions: () => supportedExtensions,
  useAppContext: () => useAppContext,
  validateSelectedDocumentFile: () => validateSelectedDocumentFile,
  validateSelectedFile: () => validateSelectedFile
});
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { jsx } from "react/jsx-runtime";
function getFileExtension(filename) {
  const segments = filename.toLowerCase().split(".");
  return segments.length > 1 ? `.${segments.pop()}` : "";
}
function createSelectedFileUploadState(file) {
  return {
    phase: "file-selected",
    selectedFile: file,
    error: null,
    statusMessage: `Ready to analyze ${file.name}.`,
    ingestionId: null,
    ingestion: null,
    processingStatus: null,
    startedAt: null,
    completedAt: null,
    retryCount: 0
  };
}
function createUploadErrorState(error, statusMessage) {
  return {
    ...initialUploadState,
    phase: "error",
    error,
    statusMessage
  };
}
function createSelectedDocumentFileUploadState(file) {
  return {
    phase: "file-selected",
    selectedFile: file,
    error: null,
    statusMessage: `Ready to map ${file.name}.`,
    ingestionId: null,
    ingestion: null,
    processingStatus: null,
    startedAt: null,
    completedAt: null,
    retryCount: 0
  };
}
function createDocumentUploadErrorState(error, statusMessage) {
  return {
    ...initialDocumentUploadState,
    phase: "error",
    error,
    statusMessage
  };
}
function validateSelectedFile(file, maxUploadBytes) {
  if (!file) {
    return initialUploadState;
  }
  const extension = getFileExtension(file.name);
  if (!supportedExtensions.includes(extension)) {
    return createUploadErrorState("Only .md and .txt files are supported.", "Unsupported file type.");
  }
  if (file.size > maxUploadBytes) {
    return createUploadErrorState(
      `File exceeds the ${Math.round(maxUploadBytes / 1024 / 1024)} MB upload limit.`,
      "Selected file is too large."
    );
  }
  return createSelectedFileUploadState(file);
}
function validateSelectedDocumentFile(file, maxUploadBytes) {
  if (!file) {
    return initialDocumentUploadState;
  }
  const extension = getFileExtension(file.name);
  if (!supportedDocumentExtensions.includes(extension)) {
    return createDocumentUploadErrorState("Only .pdf, .md, and .txt files are supported.", "Unsupported file type.");
  }
  if (file.size > maxUploadBytes) {
    return createDocumentUploadErrorState(
      `File exceeds the ${Math.round(maxUploadBytes / 1024 / 1024)} MB upload limit.`,
      "Selected file is too large."
    );
  }
  return createSelectedDocumentFileUploadState(file);
}
function toFriendlyMessage(error) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected frontend error occurred.";
}
function AppProvider({ children }) {
  const [upload, setUpload] = useState(initialUploadState);
  const [graph, setGraph] = useState(initialGraphState);
  const [documentUpload, setDocumentUpload] = useState(initialDocumentUploadState);
  const [documentGraph, setDocumentGraph] = useState(initialDocumentGraphState);
  const processingPromiseRef = useRef(null);
  const documentProcessingPromiseRef = useRef(null);
  const setDragActive = useCallback((active) => {
    setUpload((current) => {
      if (active) {
        return { ...current, phase: "drag-hover", statusMessage: "Drop the file to queue it for ingestion." };
      }
      if (current.selectedFile) {
        return { ...current, phase: "file-selected", statusMessage: `Ready to analyze ${current.selectedFile.name}.` };
      }
      return { ...current, phase: "idle", statusMessage: initialUploadState.statusMessage };
    });
  }, []);
  const selectFile = useCallback((file) => {
    const nextState = validateSelectedFile(file, appConfig.maxUploadBytes);
    setUpload(nextState);
    return nextState.phase === "file-selected";
  }, []);
  const clearSelectedFile = useCallback(() => {
    setUpload(initialUploadState);
  }, []);
  const setDocumentDragActive = useCallback((active) => {
    setDocumentUpload((current) => {
      if (active) {
        return { ...current, phase: "drag-hover", statusMessage: "Drop the document to queue it for graph extraction." };
      }
      if (current.selectedFile) {
        return { ...current, phase: "file-selected", statusMessage: `Ready to map ${current.selectedFile.name}.` };
      }
      return { ...current, phase: "idle", statusMessage: initialDocumentUploadState.statusMessage };
    });
  }, []);
  const selectDocumentFile = useCallback((file) => {
    const nextState = validateSelectedDocumentFile(file, appConfig.maxUploadBytes);
    setDocumentUpload(nextState);
    return nextState.phase === "file-selected";
  }, []);
  const clearSelectedDocumentFile = useCallback(() => {
    setDocumentUpload(initialDocumentUploadState);
  }, []);
  const loadGraph = useCallback(async (options) => {
    setGraph((current) => ({
      ...current,
      status: "loading",
      error: null
    }));
    try {
      const payload = await getGraph();
      const adaptedGraph = adaptGraph(payload);
      setGraph({
        status: "ready",
        data: adaptedGraph,
        error: null,
        lastLoadedAt: Date.now()
      });
      if (!options?.keepStatus) {
        setUpload((current) => {
          if (current.phase === "success" || current.phase === "empty-graph") {
            return current;
          }
          return {
            ...current,
            phase: adaptedGraph.nodes.length === 0 ? "empty-graph" : current.phase
          };
        });
      }
    } catch (error) {
      const message = toFriendlyMessage(error);
      setGraph({
        status: "error",
        data: null,
        error: message,
        lastLoadedAt: null
      });
      throw error;
    }
  }, []);
  const loadDocumentGraph = useCallback(async (options) => {
    setDocumentGraph((current) => ({
      ...current,
      status: "loading",
      error: null
    }));
    try {
      const payload = await getDocumentGraph();
      const adaptedGraph = adaptDocumentGraph(payload);
      setDocumentGraph({
        status: "ready",
        data: adaptedGraph,
        error: null,
        lastLoadedAt: Date.now()
      });
      if (!options?.keepStatus) {
        setDocumentUpload((current) => {
          if (current.phase === "success" || current.phase === "empty-graph") {
            return current;
          }
          return {
            ...current,
            phase: adaptedGraph.nodes.length === 0 ? "empty-graph" : current.phase
          };
        });
      }
    } catch (error) {
      const message = toFriendlyMessage(error);
      setDocumentGraph({
        status: "error",
        data: null,
        error: message,
        lastLoadedAt: null
      });
      throw error;
    }
  }, []);
  const beginProcessing = useCallback(async () => {
    if (!upload.selectedFile) {
      setUpload((current) => ({
        ...current,
        phase: "error",
        error: "Choose a .md or .txt file before processing.",
        statusMessage: "No file selected."
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
            setUpload(
              (current) => current.ingestionId !== ingestionId ? current : {
                ...current,
                processingStatus,
                statusMessage: processingStatus.latest_event || current.statusMessage
              }
            );
          } catch {
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
          phase: "uploading",
          error: null,
          statusMessage: `Uploading ${selectedFile.name}...`,
          ingestionId,
          startedAt: Date.now(),
          completedAt: null,
          processingStatus: {
            ingestion_id: ingestionId,
            state: "pending",
            filename: selectedFile.name,
            chunks_total: null,
            current_chunk: null,
            started_at: null,
            completed_at: null,
            latest_event: `Uploading ${selectedFile.name}...`,
            events: []
          }
        }));
        const pollingTask = pollProcessing();
        processingPhaseTimer = window.setTimeout(() => {
          setUpload(
            (current) => current.phase === "uploading" ? {
              ...current,
              phase: "processing",
              statusMessage: "Extracting components, relationships, and risk metrics..."
            } : current
          );
        }, 900);
        const ingestion = await uploadDocument(selectedFile, true, appConfig.processingTimeoutMs, ingestionId);
        const latestProcessingStatus = await getProcessingStatus(ingestionId).catch(() => null);
        setUpload((current) => ({
          ...current,
          ingestion,
          phase: "processing",
          statusMessage: latestProcessingStatus?.latest_event || "Loading the generated graph workspace...",
          processingStatus: latestProcessingStatus || current.processingStatus
        }));
        const graphPayload = await getGraph();
        const adaptedGraph = adaptGraph(graphPayload);
        setGraph({
          status: "ready",
          data: adaptedGraph,
          error: null,
          lastLoadedAt: Date.now()
        });
        setUpload((current) => ({
          ...current,
          ingestion,
          ingestionId,
          phase: adaptedGraph.nodes.length === 0 ? "empty-graph" : "success",
          error: null,
          statusMessage: latestProcessingStatus?.latest_event || (adaptedGraph.nodes.length === 0 ? "Processing completed, but the active graph is empty." : "TwinGraphOps finished processing your document."),
          processingStatus: latestProcessingStatus ?? current.processingStatus,
          completedAt: Date.now()
        }));
        keepPolling = false;
        await pollingTask;
      } catch (error) {
        keepPolling = false;
        const latestProcessingStatus = await getProcessingStatus(ingestionId).catch(() => null);
        const message = toFriendlyMessage(error);
        setUpload((current) => ({
          ...current,
          phase: "retry",
          error: message,
          statusMessage: message,
          processingStatus: latestProcessingStatus || current.processingStatus,
          completedAt: Date.now(),
          retryCount: current.retryCount + 1
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
        phase: "error",
        error: "Choose a .pdf, .md, or .txt file before processing.",
        statusMessage: "No document selected."
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
            setDocumentUpload(
              (current) => current.ingestionId !== ingestionId ? current : {
                ...current,
                processingStatus,
                statusMessage: processingStatus.latest_event || current.statusMessage
              }
            );
          } catch {
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
          phase: "uploading",
          error: null,
          statusMessage: `Uploading ${selectedFile.name}...`,
          ingestionId,
          startedAt: Date.now(),
          completedAt: null,
          processingStatus: {
            ingestion_id: ingestionId,
            state: "pending",
            filename: selectedFile.name,
            chunks_total: null,
            current_chunk: null,
            started_at: null,
            completed_at: null,
            latest_event: `Uploading ${selectedFile.name}...`,
            events: []
          }
        }));
        const pollingTask = pollProcessing();
        processingPhaseTimer = window.setTimeout(() => {
          setDocumentUpload(
            (current) => current.phase === "uploading" ? {
              ...current,
              phase: "processing",
              statusMessage: "Extracting document entities, evidence, and relationships..."
            } : current
          );
        }, 900);
        const ingestion = await uploadKnowledgeDocument(selectedFile, true, appConfig.processingTimeoutMs, ingestionId);
        const latestProcessingStatus = await getDocumentProcessingStatus(ingestionId).catch(() => null);
        setDocumentUpload((current) => ({
          ...current,
          ingestion,
          phase: "processing",
          statusMessage: latestProcessingStatus?.latest_event || "Loading the generated document workspace...",
          processingStatus: latestProcessingStatus || current.processingStatus
        }));
        const graphPayload = await getDocumentGraph();
        const adaptedGraph = adaptDocumentGraph(graphPayload);
        setDocumentGraph({
          status: "ready",
          data: adaptedGraph,
          error: null,
          lastLoadedAt: Date.now()
        });
        setDocumentUpload((current) => ({
          ...current,
          ingestion,
          ingestionId,
          phase: adaptedGraph.nodes.length === 0 ? "empty-graph" : "success",
          error: null,
          statusMessage: latestProcessingStatus?.latest_event || (adaptedGraph.nodes.length === 0 ? "Processing completed, but the document graph is empty." : "TwinGraphOps finished mapping your document."),
          processingStatus: latestProcessingStatus ?? current.processingStatus,
          completedAt: Date.now()
        }));
        keepPolling = false;
        await pollingTask;
      } catch (error) {
        keepPolling = false;
        const latestProcessingStatus = await getDocumentProcessingStatus(ingestionId).catch(() => null);
        const message = toFriendlyMessage(error);
        setDocumentUpload((current) => ({
          ...current,
          phase: "retry",
          error: message,
          statusMessage: message,
          processingStatus: latestProcessingStatus || current.processingStatus,
          completedAt: Date.now(),
          retryCount: current.retryCount + 1
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
  const resetUploadState = useCallback(() => {
    setUpload(initialUploadState);
    setDocumentUpload(initialDocumentUploadState);
  }, []);
  const value = useMemo(
    () => ({
      upload,
      graph,
      documentUpload,
      documentGraph,
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
      resetUploadState
    }),
    [
      upload,
      graph,
      documentUpload,
      documentGraph,
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
      resetUploadState
    ]
  );
  return /* @__PURE__ */ jsx(AppContext.Provider, { value, children });
}
function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider.");
  }
  return context;
}
var AppContext, initialUploadState, initialGraphState, initialDocumentUploadState, initialDocumentGraphState, supportedExtensions, supportedDocumentExtensions;
var init_AppContext = __esm({
  "src/state/AppContext.tsx"() {
    "use strict";
    init_adapters();
    init_api();
    init_config();
    AppContext = createContext(null);
    initialUploadState = {
      phase: "idle",
      selectedFile: null,
      error: null,
      statusMessage: "Upload a .md or .txt file to build the graph.",
      ingestionId: null,
      ingestion: null,
      processingStatus: null,
      startedAt: null,
      completedAt: null,
      retryCount: 0
    };
    initialGraphState = {
      status: "idle",
      data: null,
      error: null,
      lastLoadedAt: null
    };
    initialDocumentUploadState = {
      phase: "idle",
      selectedFile: null,
      error: null,
      statusMessage: "Upload a .pdf, .md, or .txt file to build a document graph.",
      ingestionId: null,
      ingestion: null,
      processingStatus: null,
      startedAt: null,
      completedAt: null,
      retryCount: 0
    };
    initialDocumentGraphState = {
      status: "idle",
      data: null,
      error: null,
      lastLoadedAt: null
    };
    supportedExtensions = [".md", ".txt"];
    supportedDocumentExtensions = [".pdf", ".md", ".txt"];
  }
});

// src/lib/cn.ts
function cn(...values) {
  return values.filter(Boolean).join(" ");
}
var init_cn = __esm({
  "src/lib/cn.ts"() {
    "use strict";
  }
});

// src/components/ui/Button.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
function Button({ className, variant = "primary", children, ...props }) {
  return /* @__PURE__ */ jsx2(
    "button",
    {
      className: cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className
      ),
      ...props,
      children
    }
  );
}
var variantClasses;
var init_Button = __esm({
  "src/components/ui/Button.tsx"() {
    "use strict";
    init_cn();
    variantClasses = {
      primary: "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-950/40",
      secondary: "border border-slate-700 bg-slate-900/80 text-slate-100 hover:border-slate-500 hover:bg-slate-800",
      ghost: "text-slate-300 hover:bg-slate-800/70 hover:text-white",
      danger: "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-950/40"
    };
  }
});

// src/components/ui/Badge.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
function Badge({ className, children, ...props }) {
  return /* @__PURE__ */ jsx3(
    "span",
    {
      className: cn(
        "inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-200",
        className
      ),
      ...props,
      children
    }
  );
}
var init_Badge = __esm({
  "src/components/ui/Badge.tsx"() {
    "use strict";
    init_cn();
  }
});

// src/components/StatusBanner.tsx
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { jsx as jsx4, jsxs } from "react/jsx-runtime";
function StatusBanner({ tone = "info", message }) {
  const Icon = toneMap[tone].icon;
  return /* @__PURE__ */ jsxs("div", { className: cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", toneMap[tone].container), children: [
    /* @__PURE__ */ jsx4(Icon, { className: "mt-0.5 h-4 w-4 shrink-0" }),
    /* @__PURE__ */ jsx4("p", { className: "m-0 leading-6", children: message })
  ] });
}
var toneMap;
var init_StatusBanner = __esm({
  "src/components/StatusBanner.tsx"() {
    "use strict";
    init_cn();
    toneMap = {
      info: {
        container: "border-blue-500/30 bg-blue-500/10 text-blue-100",
        icon: Info
      },
      success: {
        container: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
        icon: CheckCircle2
      },
      error: {
        container: "border-red-500/30 bg-red-500/10 text-red-100",
        icon: AlertTriangle
      }
    };
  }
});

// src/pages/LandingPage.tsx
var LandingPage_exports = {};
__export(LandingPage_exports, {
  default: () => LandingPage
});
import { useRef as useRef2 } from "react";
import { ChevronRight, FileText, Network, Shield, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { jsx as jsx5, jsxs as jsxs2 } from "react/jsx-runtime";
function formatFileSize(size) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}
function LandingPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef2(null);
  const { upload, graph, setDragActive, selectFile, clearSelectedFile } = useAppContext();
  const selectedFile = upload.selectedFile;
  const handleFile = (file) => {
    selectFile(file);
  };
  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0] ?? null);
  };
  const handleFileInput = (event) => {
    handleFile(event.target.files?.[0] ?? null);
  };
  return /* @__PURE__ */ jsx5("div", { className: "min-h-screen bg-[#0F172A] text-white", children: /* @__PURE__ */ jsxs2("div", { className: "mx-auto max-w-7xl px-6 py-10", children: [
    /* @__PURE__ */ jsxs2("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs2("div", { className: "flex rounded-2xl border border-slate-800 bg-slate-950/70 p-1", children: [
        /* @__PURE__ */ jsx5("button", { className: "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white", children: "Risk Workspace" }),
        /* @__PURE__ */ jsx5(
          "button",
          {
            onClick: () => navigate("/documents"),
            className: "rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white",
            children: "Document Workspace"
          }
        )
      ] }),
      /* @__PURE__ */ jsx5(Button, { variant: "secondary", onClick: () => navigate("/risk"), disabled: !graph.data, children: "Open Risk Graph" })
    ] }),
    /* @__PURE__ */ jsxs2("div", { className: "grid gap-10 xl:grid-cols-[1.2fr_0.8fr]", children: [
      /* @__PURE__ */ jsxs2("section", { className: "glass-panel rounded-[32px] px-8 py-10 md:px-10 md:py-12", children: [
        /* @__PURE__ */ jsxs2("div", { className: "mb-4 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx5("div", { className: "rounded-2xl bg-blue-500/15 p-3 text-blue-300", children: /* @__PURE__ */ jsx5(Network, { className: "h-8 w-8" }) }),
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx5("div", { className: "text-sm uppercase tracking-[0.22em] text-blue-300", children: "Digital Twin Operations" }),
            /* @__PURE__ */ jsx5("h1", { className: "mt-1 text-5xl font-bold tracking-tight text-white md:text-6xl", children: "TwinGraphOps" })
          ] })
        ] }),
        /* @__PURE__ */ jsx5("p", { className: "max-w-3xl text-lg leading-8 text-slate-300", children: "Drop in your system manual and let TwinGraphOps extract the architecture, score operational risk, and turn the whole system into a graph your team can inspect in minutes." }),
        /* @__PURE__ */ jsxs2("div", { className: "mt-8 flex flex-wrap gap-3", children: [
          /* @__PURE__ */ jsxs2(Badge, { className: "border-blue-500/30 bg-blue-500/10 text-blue-100", children: [
            "API ",
            appConfig.apiBaseUrl
          ] }),
          /* @__PURE__ */ jsxs2(Badge, { className: "border-slate-700 bg-slate-900/80 text-slate-200", children: [
            "Upload limit ",
            Math.round(appConfig.maxUploadBytes / 1024 / 1024),
            " MB"
          ] }),
          /* @__PURE__ */ jsxs2(Badge, { className: "border-slate-700 bg-slate-900/80 text-slate-200", children: [
            "Timeout ",
            (appConfig.processingTimeoutMs / 1e3).toFixed(0),
            "s"
          ] })
        ] }),
        /* @__PURE__ */ jsxs2("div", { className: "mt-12 grid gap-6 md:grid-cols-3", children: [
          /* @__PURE__ */ jsxs2("div", { className: "rounded-[28px] border border-slate-800 bg-slate-950/55 p-6", children: [
            /* @__PURE__ */ jsx5("div", { className: "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300", children: /* @__PURE__ */ jsx5(Upload, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsx5("h2", { className: "text-lg font-semibold text-white", children: "1. Upload Documentation" }),
            /* @__PURE__ */ jsx5("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: "Upload a UTF-8 `.md` or `.txt` file describing the system." })
          ] }),
          /* @__PURE__ */ jsxs2("div", { className: "rounded-[28px] border border-slate-800 bg-slate-950/55 p-6", children: [
            /* @__PURE__ */ jsx5("div", { className: "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300", children: /* @__PURE__ */ jsx5(Network, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsx5("h2", { className: "text-lg font-semibold text-white", children: "2. Build Graph" }),
            /* @__PURE__ */ jsx5("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: "The backend extracts nodes, edges, and risk metrics into the active graph." })
          ] }),
          /* @__PURE__ */ jsxs2("div", { className: "rounded-[28px] border border-slate-800 bg-slate-950/55 p-6", children: [
            /* @__PURE__ */ jsx5("div", { className: "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300", children: /* @__PURE__ */ jsx5(Shield, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsx5("h2", { className: "text-lg font-semibold text-white", children: "3. Inspect Risks" }),
            /* @__PURE__ */ jsx5("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: "Explore the graph, tables, and detail panel for operational insight." })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2("aside", { className: "glass-panel rounded-[32px] p-8", children: [
        /* @__PURE__ */ jsx5("h2", { className: "text-xl font-semibold text-white", children: "Active Ingest" }),
        /* @__PURE__ */ jsx5("p", { className: "mt-3 text-sm leading-6 text-slate-300", children: "Queue one manual for ingestion. The active graph in the workspace will refresh when processing completes." }),
        /* @__PURE__ */ jsxs2(
          "div",
          {
            className: `mt-6 rounded-[28px] border-2 border-dashed p-8 text-center transition ${upload.phase === "drag-hover" ? "border-blue-400 bg-blue-500/10" : "border-slate-700 bg-slate-950/50 hover:border-slate-500"}`,
            onDragOver: (event) => {
              event.preventDefault();
              setDragActive(true);
            },
            onDragLeave: () => setDragActive(false),
            onDrop: handleDrop,
            children: [
              /* @__PURE__ */ jsx5(Upload, { className: "mx-auto h-14 w-14 text-slate-400" }),
              /* @__PURE__ */ jsx5("h3", { className: "mt-4 text-xl font-medium text-white", children: "Upload System Documentation" }),
              /* @__PURE__ */ jsx5("p", { className: "mt-2 text-sm text-slate-400", children: "Drag and drop your file here or browse locally." }),
              /* @__PURE__ */ jsx5(
                "input",
                {
                  ref: fileInputRef,
                  type: "file",
                  accept: ".md,.txt,text/plain,text/markdown",
                  className: "hidden",
                  onChange: handleFileInput
                }
              ),
              /* @__PURE__ */ jsxs2("div", { className: "mt-6 flex flex-wrap justify-center gap-3", children: [
                /* @__PURE__ */ jsxs2(Button, { variant: "secondary", onClick: () => fileInputRef.current?.click(), children: [
                  /* @__PURE__ */ jsx5(FileText, { className: "h-4 w-4" }),
                  "Choose File"
                ] }),
                /* @__PURE__ */ jsxs2(Button, { onClick: () => navigate("/processing"), disabled: !selectedFile, children: [
                  "Analyze Document",
                  /* @__PURE__ */ jsx5(ChevronRight, { className: "h-4 w-4" })
                ] })
              ] }),
              /* @__PURE__ */ jsx5("p", { className: "mt-4 text-xs uppercase tracking-[0.2em] text-slate-500", children: "Supported formats: .md and .txt" })
            ]
          }
        ),
        /* @__PURE__ */ jsx5("div", { className: "mt-6 rounded-[28px] border border-slate-800 bg-slate-950/60 p-4", children: /* @__PURE__ */ jsxs2("div", { className: "flex items-start justify-between gap-4", children: [
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx5("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Selected File" }),
            /* @__PURE__ */ jsx5("p", { className: "mt-2 text-sm font-medium text-white", children: selectedFile?.name ?? "No file selected." }),
            /* @__PURE__ */ jsx5("p", { className: "mt-1 text-sm text-slate-400", children: selectedFile ? formatFileSize(selectedFile.size) : "Choose a manual to begin." })
          ] }),
          selectedFile ? /* @__PURE__ */ jsx5(Button, { variant: "ghost", onClick: clearSelectedFile, children: "Clear" }) : null
        ] }) }),
        /* @__PURE__ */ jsx5("div", { className: "mt-6", children: /* @__PURE__ */ jsx5(
          StatusBanner,
          {
            tone: upload.error ? "error" : graph.data ? "success" : "info",
            message: upload.error || upload.statusMessage || "Upload a file to continue."
          }
        ) }),
        graph.data ? /* @__PURE__ */ jsxs2("div", { className: "mt-6 rounded-[28px] border border-slate-800 bg-slate-950/60 p-4", children: [
          /* @__PURE__ */ jsx5("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Current Workspace" }),
          /* @__PURE__ */ jsxs2("div", { className: "mt-4 grid grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxs2("div", { children: [
              /* @__PURE__ */ jsx5("p", { className: "text-2xl font-semibold text-white", children: graph.data.nodes.length }),
              /* @__PURE__ */ jsx5("p", { className: "text-sm text-slate-400", children: "Nodes" })
            ] }),
            /* @__PURE__ */ jsxs2("div", { children: [
              /* @__PURE__ */ jsx5("p", { className: "text-2xl font-semibold text-white", children: graph.data.links.length }),
              /* @__PURE__ */ jsx5("p", { className: "text-sm text-slate-400", children: "Edges" })
            ] })
          ] })
        ] }) : null
      ] })
    ] })
  ] }) });
}
var init_LandingPage = __esm({
  "src/pages/LandingPage.tsx"() {
    "use strict";
    init_Button();
    init_Badge();
    init_StatusBanner();
    init_config();
    init_AppContext();
  }
});

// src/components/ProcessingActivityPanel.tsx
import { CheckCircle2 as CheckCircle22, Clock3, Loader2, TerminalSquare, XCircle } from "lucide-react";
import { jsx as jsx6, jsxs as jsxs3 } from "react/jsx-runtime";
function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Pending";
  }
  return new Intl.DateTimeFormat(void 0, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(timestamp));
}
function ProcessingActivityPanel({ status }) {
  const events = status?.events ?? [];
  const visibleEvents = [...events].reverse().slice(0, 8);
  const state = status?.state ?? "pending";
  return /* @__PURE__ */ jsxs3("section", { className: "glass-panel rounded-[28px] p-6", children: [
    /* @__PURE__ */ jsxs3("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [
      /* @__PURE__ */ jsx6("div", { children: /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx6(TerminalSquare, { className: "h-5 w-5 text-cyan-300" }),
        /* @__PURE__ */ jsx6("h2", { className: "text-lg font-semibold text-white", children: "Processing Activity" })
      ] }) }),
      /* @__PURE__ */ jsx6("div", { className: "rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300", children: state })
    ] }),
    /* @__PURE__ */ jsxs3("div", { className: "mt-5 grid gap-3 sm:grid-cols-3", children: [
      /* @__PURE__ */ jsxs3("div", { className: "rounded-[22px] border border-slate-800 bg-slate-950/70 p-4", children: [
        /* @__PURE__ */ jsx6("div", { className: "text-xs uppercase tracking-[0.18em] text-slate-500", children: "Current Step" }),
        /* @__PURE__ */ jsx6("div", { className: "mt-2 text-sm font-medium text-white", children: status?.latest_event ?? "Waiting for upload to begin." })
      ] }),
      /* @__PURE__ */ jsxs3("div", { className: "rounded-[22px] border border-slate-800 bg-slate-950/70 p-4", children: [
        /* @__PURE__ */ jsx6("div", { className: "text-xs uppercase tracking-[0.18em] text-slate-500", children: "Chunk Progress" }),
        /* @__PURE__ */ jsx6("div", { className: "mt-2 text-sm font-medium text-white", children: status?.current_chunk && status?.chunks_total ? `${Math.min(status.current_chunk, status.chunks_total)} of ${status.chunks_total}` : status?.chunks_total ? `0 of ${status.chunks_total}` : "Waiting" })
      ] }),
      /* @__PURE__ */ jsxs3("div", { className: "rounded-[22px] border border-slate-800 bg-slate-950/70 p-4", children: [
        /* @__PURE__ */ jsx6("div", { className: "text-xs uppercase tracking-[0.18em] text-slate-500", children: "Started" }),
        /* @__PURE__ */ jsx6("div", { className: "mt-2 text-sm font-medium text-white", children: formatTimestamp(status?.started_at ?? null) })
      ] })
    ] }),
    /* @__PURE__ */ jsx6("div", { className: "mt-5 space-y-3", children: visibleEvents.length === 0 ? /* @__PURE__ */ jsx6("div", { className: "rounded-[22px] border border-dashed border-slate-800 bg-slate-950/45 px-4 py-5 text-sm text-slate-400", children: "Waiting for backend activity..." }) : visibleEvents.map((event) => {
      const tone = event.level === "ERROR" ? {
        icon: /* @__PURE__ */ jsx6(XCircle, { className: "h-4 w-4 text-red-300" }),
        border: "border-red-500/20",
        bg: "bg-red-500/8"
      } : event.event.endsWith("_completed") || event.event.endsWith("_succeeded") ? {
        icon: /* @__PURE__ */ jsx6(CheckCircle22, { className: "h-4 w-4 text-emerald-300" }),
        border: "border-emerald-500/20",
        bg: "bg-emerald-500/8"
      } : state === "running" ? {
        icon: /* @__PURE__ */ jsx6(Loader2, { className: "h-4 w-4 animate-spin text-blue-300" }),
        border: "border-blue-500/20",
        bg: "bg-blue-500/8"
      } : {
        icon: /* @__PURE__ */ jsx6(Clock3, { className: "h-4 w-4 text-slate-300" }),
        border: "border-slate-700",
        bg: "bg-slate-900/70"
      };
      return /* @__PURE__ */ jsxs3(
        "div",
        {
          className: `flex items-start gap-3 rounded-[22px] border px-4 py-3 ${tone.border} ${tone.bg}`,
          children: [
            /* @__PURE__ */ jsx6("div", { className: "mt-0.5", children: tone.icon }),
            /* @__PURE__ */ jsxs3("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxs3("div", { className: "flex flex-wrap items-center gap-2", children: [
                /* @__PURE__ */ jsx6("span", { className: "text-sm font-medium text-white", children: event.message }),
                /* @__PURE__ */ jsx6("span", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: formatTimestamp(event.timestamp) })
              ] }),
              /* @__PURE__ */ jsx6("div", { className: "mt-1 text-xs uppercase tracking-[0.16em] text-slate-500", children: event.event })
            ] })
          ]
        },
        `${event.timestamp ?? "pending"}-${event.event}`
      );
    }) })
  ] });
}
var init_ProcessingActivityPanel = __esm({
  "src/components/ProcessingActivityPanel.tsx"() {
    "use strict";
  }
});

// src/pages/ProcessingPage.tsx
var ProcessingPage_exports = {};
__export(ProcessingPage_exports, {
  default: () => ProcessingPage
});
import { useEffect, useMemo as useMemo2, useState as useState2 } from "react";
import { CheckCircle2 as CheckCircle23, Loader2 as Loader22, Network as Network2 } from "lucide-react";
import { useNavigate as useNavigate2 } from "react-router-dom";
import { jsx as jsx7, jsxs as jsxs4 } from "react/jsx-runtime";
function ProcessingPage() {
  const navigate = useNavigate2();
  const { upload, graph, beginProcessing } = useAppContext();
  const [elapsed, setElapsed] = useState2(0);
  useEffect(() => {
    if (!upload.selectedFile && !upload.ingestion && !graph.data) {
      navigate("/");
      return;
    }
    if (upload.phase === "file-selected") {
      beginProcessing().catch(() => void 0);
    }
  }, [beginProcessing, graph.data, navigate, upload.ingestion, upload.phase, upload.selectedFile]);
  useEffect(() => {
    if (!(upload.phase === "uploading" || upload.phase === "processing") || !upload.startedAt) {
      return;
    }
    const interval = window.setInterval(() => {
      setElapsed(Date.now() - upload.startedAt);
    }, 200);
    return () => window.clearInterval(interval);
  }, [upload.phase, upload.startedAt]);
  useEffect(() => {
    if ((upload.phase === "success" || upload.phase === "empty-graph") && graph.status === "ready") {
      const timeout = window.setTimeout(() => navigate("/app"), 700);
      return () => window.clearTimeout(timeout);
    }
  }, [graph.status, navigate, upload.phase]);
  const currentStep = useMemo2(() => {
    if (upload.phase === "success" || upload.phase === "empty-graph") {
      return steps.length;
    }
    if (upload.processingStatus?.state === "running" && upload.processingStatus.current_chunk) {
      return upload.processingStatus.current_chunk >= (upload.processingStatus.chunks_total ?? 1) ? 3 : 2;
    }
    if (upload.phase === "processing") {
      return elapsed > 2500 ? 3 : 2;
    }
    if (upload.phase === "uploading") {
      return 1;
    }
    return 0;
  }, [elapsed, upload.phase, upload.processingStatus?.chunks_total, upload.processingStatus?.current_chunk, upload.processingStatus?.state]);
  const progress = useMemo2(() => {
    if (upload.phase === "success" || upload.phase === "empty-graph") {
      return 100;
    }
    if (upload.processingStatus?.chunks_total) {
      const chunkProgress = (upload.processingStatus.current_chunk ?? 0) / upload.processingStatus.chunks_total * 100;
      return Math.max(18, Math.min(94, Math.round(20 + chunkProgress * 0.7)));
    }
    if (upload.phase === "processing") {
      return Math.min(92, elapsed > 2500 ? 82 : 58);
    }
    if (upload.phase === "uploading") {
      return 24;
    }
    return 0;
  }, [elapsed, upload.phase, upload.processingStatus?.chunks_total, upload.processingStatus?.current_chunk]);
  const isRetryState = upload.phase === "retry" || upload.phase === "error";
  return /* @__PURE__ */ jsx7("div", { className: "min-h-screen bg-[#0F172A] px-6 py-16 text-white", children: /* @__PURE__ */ jsx7("div", { className: "mx-auto max-w-6xl", children: /* @__PURE__ */ jsxs4("div", { className: "grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]", children: [
    /* @__PURE__ */ jsxs4("div", { className: "glass-panel rounded-[32px] p-8 md:p-10", children: [
      /* @__PURE__ */ jsxs4("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxs4("div", { className: "relative inline-flex items-center justify-center rounded-full bg-blue-500/10 p-6 text-blue-300", children: [
          /* @__PURE__ */ jsx7(Network2, { className: "h-14 w-14" }),
          /* @__PURE__ */ jsx7("div", { className: "absolute inset-0 rounded-full bg-blue-500/10 blur-2xl" })
        ] }),
        /* @__PURE__ */ jsx7("h1", { className: "mt-6 text-3xl font-semibold text-white", children: "Processing Your Documentation" })
      ] }),
      /* @__PURE__ */ jsx7("div", { className: "mt-10 space-y-4", children: steps.map((label, index) => {
        const completed = currentStep > index + 1;
        const active = currentStep === index + 1;
        return /* @__PURE__ */ jsxs4(
          "div",
          {
            className: `flex items-center gap-4 rounded-[24px] border px-5 py-4 transition ${completed ? "border-emerald-500/30 bg-emerald-500/10" : active ? "border-blue-500/30 bg-blue-500/10" : "border-slate-800 bg-slate-950/55"}`,
            children: [
              /* @__PURE__ */ jsx7("div", { className: "flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/70", children: completed ? /* @__PURE__ */ jsx7(CheckCircle23, { className: "h-5 w-5 text-emerald-300" }) : active ? /* @__PURE__ */ jsx7(Loader22, { className: "h-5 w-5 animate-spin text-blue-300" }) : /* @__PURE__ */ jsx7("div", { className: "h-3 w-3 rounded-full border border-slate-600" }) }),
              /* @__PURE__ */ jsxs4("div", { className: "flex-1", children: [
                /* @__PURE__ */ jsx7("p", { className: "font-medium text-white", children: label }),
                /* @__PURE__ */ jsx7("p", { className: "mt-1 text-sm text-slate-400", children: completed ? "Completed" : active ? upload.statusMessage : "Waiting" })
              ] })
            ]
          },
          label
        );
      }) }),
      /* @__PURE__ */ jsxs4("div", { className: "mt-8", children: [
        /* @__PURE__ */ jsx7("div", { className: "h-2 overflow-hidden rounded-full bg-slate-800", children: /* @__PURE__ */ jsx7(
          "div",
          {
            className: "h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-orange-400 transition-all",
            style: { width: `${progress}%` }
          }
        ) }),
        /* @__PURE__ */ jsxs4("p", { className: "mt-3 text-sm text-slate-400", children: [
          progress,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsx7("div", { className: "mt-8", children: /* @__PURE__ */ jsx7(
        StatusBanner,
        {
          tone: isRetryState ? "error" : upload.phase === "success" || upload.phase === "empty-graph" ? "success" : "info",
          message: upload.error || upload.statusMessage
        }
      ) }),
      /* @__PURE__ */ jsxs4("div", { className: "mt-8 flex flex-wrap justify-center gap-3", children: [
        isRetryState ? /* @__PURE__ */ jsx7(Button, { onClick: () => beginProcessing().catch(() => void 0), children: "Retry Processing" }) : null,
        (upload.phase === "success" || upload.phase === "empty-graph") && graph.status === "ready" ? /* @__PURE__ */ jsx7(Button, { onClick: () => navigate("/app"), children: "Open Workspace" }) : null,
        /* @__PURE__ */ jsx7(Button, { variant: "secondary", onClick: () => navigate("/"), children: "Back to Upload" })
      ] })
    ] }),
    /* @__PURE__ */ jsx7(ProcessingActivityPanel, { status: upload.processingStatus })
  ] }) }) });
}
var steps;
var init_ProcessingPage = __esm({
  "src/pages/ProcessingPage.tsx"() {
    "use strict";
    init_ProcessingActivityPanel();
    init_Button();
    init_StatusBanner();
    init_AppContext();
    steps = [
      "Uploading document",
      "Extracting architecture graph",
      "Calculating risk metrics and loading workspace"
    ];
  }
});

// src/lib/selectors.ts
function getTypeColor(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.other;
}
function getRiskColor(level) {
  return RISK_COLORS[level] || "#94a3b8";
}
function getDocumentKindColor(kind) {
  return DOCUMENT_KIND_COLORS[kind] || DOCUMENT_KIND_COLORS.other;
}
function formatLabel(value) {
  return value.split(/[_-\s]+/).filter(Boolean).map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join(" ");
}
function getLinkEndpointId(endpoint) {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}
function getConnectionCount(graph, nodeId) {
  return graph.links.filter((link) => getLinkEndpointId(link.source) === nodeId || getLinkEndpointId(link.target) === nodeId).length;
}
function buildGraphSummary(graph) {
  const totalComponents = graph.nodes.length;
  const totalRelationships = graph.links.length;
  const avgRisk = totalComponents === 0 ? 0 : Number((graph.nodes.reduce((sum, node) => sum + node.riskScore, 0) / totalComponents).toFixed(1));
  const highRiskNodes = graph.nodes.filter((node) => node.riskLevel === "high").length;
  const highestRiskNode = [...graph.nodes].sort((left, right) => right.riskScore - left.riskScore)[0] ?? null;
  const riskDistribution = [
    { label: "Low", key: "low", count: graph.nodes.filter((node) => node.riskLevel === "low").length },
    { label: "Medium", key: "medium", count: graph.nodes.filter((node) => node.riskLevel === "medium").length },
    { label: "High", key: "high", count: graph.nodes.filter((node) => node.riskLevel === "high").length }
  ];
  const typeCounts = graph.nodes.reduce((accumulator, node) => {
    accumulator[node.type] = (accumulator[node.type] ?? 0) + 1;
    return accumulator;
  }, {});
  const typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({ type, count })).sort((left, right) => right.count - left.count);
  const mostConnectedNodes = [...graph.nodes].map((node) => ({ node, connections: getConnectionCount(graph, node.id) })).sort((left, right) => right.connections - left.connections).slice(0, 5);
  const topRiskNodes = [...graph.nodes].sort((left, right) => right.riskScore - left.riskScore).slice(0, 8);
  const blastRadiusLeaders = [...graph.nodes].map((node) => ({ node, count: node.blastRadius })).sort((left, right) => right.count - left.count).slice(0, 6);
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
    blastRadiusLeaders
  };
}
var TYPE_COLORS, RISK_COLORS, DOCUMENT_KIND_COLORS;
var init_selectors = __esm({
  "src/lib/selectors.ts"() {
    "use strict";
    TYPE_COLORS = {
      software: "#60a5fa",
      data: "#34d399",
      interface: "#c084fc",
      hardware: "#fb923c",
      human: "#f472b6",
      other: "#94a3b8"
    };
    RISK_COLORS = {
      low: "#22c55e",
      medium: "#f59e0b",
      high: "#ef4444"
    };
    DOCUMENT_KIND_COLORS = {
      entity: "#60a5fa",
      concept: "#34d399",
      section: "#a78bfa",
      claim: "#f59e0b",
      obligation: "#fb7185",
      requirement: "#38bdf8",
      date: "#f97316",
      metric: "#22c55e",
      process: "#c084fc",
      role: "#f472b6",
      system: "#2dd4bf",
      risk: "#ef4444",
      other: "#94a3b8"
    };
  }
});

// src/components/SystemOverview.tsx
var SystemOverview_exports = {};
__export(SystemOverview_exports, {
  default: () => SystemOverview
});
import { Activity, AlertTriangle as AlertTriangle2, Boxes, GitBranch } from "lucide-react";
import { jsx as jsx8, jsxs as jsxs5 } from "react/jsx-runtime";
function SystemOverview({ graphData }) {
  const summary = buildGraphSummary(graphData);
  return /* @__PURE__ */ jsx8("div", { className: "h-full overflow-y-auto p-6 md:p-8", children: /* @__PURE__ */ jsxs5("div", { className: "mx-auto max-w-7xl space-y-8", children: [
    /* @__PURE__ */ jsxs5("div", { children: [
      /* @__PURE__ */ jsx8("h1", { className: "text-3xl font-bold text-white", children: "System Overview" }),
      /* @__PURE__ */ jsx8("p", { className: "mt-2 max-w-3xl text-sm leading-7 text-slate-300", children: "Summary cards and breakdowns are computed directly from the active graph because the current backend contract does not provide a separate architecture summary endpoint yet." })
    ] }),
    /* @__PURE__ */ jsxs5("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [
      /* @__PURE__ */ jsxs5("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsxs5("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx8(Boxes, { className: "h-8 w-8 text-blue-300" }),
          /* @__PURE__ */ jsx8("span", { className: "text-4xl font-semibold text-white", children: summary.totalComponents })
        ] }),
        /* @__PURE__ */ jsx8("p", { className: "mt-3 text-sm text-slate-400", children: "Total Components" })
      ] }),
      /* @__PURE__ */ jsxs5("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsxs5("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx8(GitBranch, { className: "h-8 w-8 text-purple-300" }),
          /* @__PURE__ */ jsx8("span", { className: "text-4xl font-semibold text-white", children: summary.totalRelationships })
        ] }),
        /* @__PURE__ */ jsx8("p", { className: "mt-3 text-sm text-slate-400", children: "Relationships" })
      ] }),
      /* @__PURE__ */ jsxs5("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsxs5("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx8(AlertTriangle2, { className: "h-8 w-8 text-orange-300" }),
          /* @__PURE__ */ jsx8("span", { className: "text-4xl font-semibold text-white", children: summary.highRiskNodes })
        ] }),
        /* @__PURE__ */ jsx8("p", { className: "mt-3 text-sm text-slate-400", children: "High Risk Components" })
      ] }),
      /* @__PURE__ */ jsxs5("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsxs5("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx8(Activity, { className: "h-8 w-8 text-emerald-300" }),
          /* @__PURE__ */ jsx8("span", { className: "text-4xl font-semibold text-white", children: summary.avgRisk })
        ] }),
        /* @__PURE__ */ jsx8("p", { className: "mt-3 text-sm text-slate-400", children: "Average Risk" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs5("section", { className: "glass-panel rounded-3xl p-6", children: [
      /* @__PURE__ */ jsx8("h2", { className: "text-xl font-semibold text-white", children: "Most Connected Components" }),
      /* @__PURE__ */ jsx8("div", { className: "mt-6 space-y-4", children: summary.mostConnectedNodes.map(({ node, connections }, index) => /* @__PURE__ */ jsxs5("div", { className: "flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-950/70 p-4", children: [
        /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx8("div", { className: "flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-sm font-semibold text-blue-100", children: index + 1 }),
          /* @__PURE__ */ jsxs5("div", { children: [
            /* @__PURE__ */ jsx8("div", { className: "font-semibold text-white", children: node.name }),
            /* @__PURE__ */ jsxs5("div", { className: "mt-1 text-sm text-slate-400", children: [
              formatLabel(node.type),
              " \xB7 ",
              node.id
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs5("div", { className: "text-right", children: [
          /* @__PURE__ */ jsx8("div", { className: "text-2xl font-semibold text-blue-300", children: connections }),
          /* @__PURE__ */ jsx8("div", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Connections" })
        ] })
      ] }, node.id)) })
    ] }),
    /* @__PURE__ */ jsxs5("div", { className: "grid gap-8 xl:grid-cols-[1fr_1fr]", children: [
      /* @__PURE__ */ jsxs5("section", { className: "glass-panel rounded-3xl p-6", children: [
        /* @__PURE__ */ jsx8("h2", { className: "text-xl font-semibold text-white", children: "Component Type Breakdown" }),
        /* @__PURE__ */ jsx8("div", { className: "mt-6 space-y-4", children: summary.typeDistribution.map((entry) => /* @__PURE__ */ jsx8("div", { className: "rounded-3xl border border-slate-800 bg-slate-950/70 p-4", children: /* @__PURE__ */ jsxs5("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx8("span", { className: "h-3 w-3 rounded-full", style: { backgroundColor: getTypeColor(entry.type) } }),
            /* @__PURE__ */ jsx8("span", { className: "font-medium text-white", children: formatLabel(entry.type) })
          ] }),
          /* @__PURE__ */ jsx8("span", { className: "text-lg font-semibold text-white", children: entry.count })
        ] }) }, entry.type)) })
      ] }),
      /* @__PURE__ */ jsxs5("section", { className: "glass-panel rounded-3xl p-6", children: [
        /* @__PURE__ */ jsx8("h2", { className: "text-xl font-semibold text-white", children: "Risk Distribution" }),
        /* @__PURE__ */ jsx8("div", { className: "mt-6 space-y-4", children: summary.riskDistribution.map((entry) => /* @__PURE__ */ jsxs5("div", { className: "rounded-3xl border border-slate-800 bg-slate-950/70 p-4", children: [
          /* @__PURE__ */ jsxs5("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx8("span", { className: "font-medium text-white", children: entry.label }),
            /* @__PURE__ */ jsx8("span", { className: "text-lg font-semibold text-white", children: entry.count })
          ] }),
          /* @__PURE__ */ jsx8("div", { className: "mt-3 h-2 overflow-hidden rounded-full bg-slate-800", children: /* @__PURE__ */ jsx8(
            "div",
            {
              className: "h-full rounded-full",
              style: {
                width: `${summary.totalComponents === 0 ? 0 : entry.count / summary.totalComponents * 100}%`,
                backgroundColor: getRiskColor(entry.key)
              }
            }
          ) })
        ] }, entry.key)) })
      ] })
    ] })
  ] }) });
}
var init_SystemOverview = __esm({
  "src/components/SystemOverview.tsx"() {
    "use strict";
    init_selectors();
  }
});

// src/pages/DocumentUploadPage.tsx
var DocumentUploadPage_exports = {};
__export(DocumentUploadPage_exports, {
  default: () => DocumentUploadPage
});
import { useRef as useRef3 } from "react";
import { ChevronRight as ChevronRight2, FileText as FileText2, Network as Network3, Shield as Shield2, Upload as Upload2 } from "lucide-react";
import { useNavigate as useNavigate3 } from "react-router-dom";
import { jsx as jsx9, jsxs as jsxs6 } from "react/jsx-runtime";
function formatFileSize2(size) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}
function DocumentUploadPage() {
  const navigate = useNavigate3();
  const fileInputRef = useRef3(null);
  const {
    documentUpload,
    documentGraph,
    setDocumentDragActive,
    selectDocumentFile,
    clearSelectedDocumentFile
  } = useAppContext();
  const selectedFile = documentUpload.selectedFile;
  const handleFile = (file) => {
    selectDocumentFile(file);
  };
  const handleDrop = (event) => {
    event.preventDefault();
    setDocumentDragActive(false);
    handleFile(event.dataTransfer.files?.[0] ?? null);
  };
  const handleFileInput = (event) => {
    handleFile(event.target.files?.[0] ?? null);
  };
  return /* @__PURE__ */ jsx9("div", { className: "min-h-screen bg-[#0F172A] text-white", children: /* @__PURE__ */ jsxs6("div", { className: "mx-auto max-w-7xl px-6 py-10", children: [
    /* @__PURE__ */ jsxs6("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs6("div", { className: "flex rounded-2xl border border-slate-800 bg-slate-950/70 p-1", children: [
        /* @__PURE__ */ jsx9("button", { onClick: () => navigate("/"), className: "rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white", children: "Risk Workspace" }),
        /* @__PURE__ */ jsx9("button", { className: "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white", children: "Document Workspace" })
      ] }),
      /* @__PURE__ */ jsx9(Button, { variant: "secondary", onClick: () => navigate("/documents/workspace"), disabled: !documentGraph.data, children: "Open Document Graph" })
    ] }),
    /* @__PURE__ */ jsxs6("div", { className: "grid gap-10 xl:grid-cols-[1.2fr_0.8fr]", children: [
      /* @__PURE__ */ jsxs6("section", { className: "glass-panel rounded-[32px] px-8 py-10 md:px-10 md:py-12", children: [
        /* @__PURE__ */ jsxs6("div", { className: "mb-4 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx9("div", { className: "rounded-2xl bg-blue-500/15 p-3 text-blue-300", children: /* @__PURE__ */ jsx9(FileText2, { className: "h-8 w-8" }) }),
          /* @__PURE__ */ jsxs6("div", { children: [
            /* @__PURE__ */ jsx9("div", { className: "text-sm uppercase tracking-[0.22em] text-blue-300", children: "Document Knowledge Graphs" }),
            /* @__PURE__ */ jsx9("h1", { className: "mt-1 text-5xl font-bold tracking-tight text-white md:text-6xl", children: "TwinGraphOps" })
          ] })
        ] }),
        /* @__PURE__ */ jsx9("p", { className: "max-w-3xl text-lg leading-8 text-slate-300", children: "Upload a PDF, markdown, or text document and extract a generic knowledge graph with evidence-backed nodes, relationships, and source chunks." }),
        /* @__PURE__ */ jsxs6("div", { className: "mt-8 flex flex-wrap gap-3", children: [
          /* @__PURE__ */ jsxs6(Badge, { className: "border-blue-500/30 bg-blue-500/10 text-blue-100", children: [
            "API ",
            appConfig.apiBaseUrl
          ] }),
          /* @__PURE__ */ jsxs6(Badge, { className: "border-slate-700 bg-slate-900/80 text-slate-200", children: [
            "Upload limit ",
            Math.round(appConfig.maxUploadBytes / 1024 / 1024),
            " MB"
          ] }),
          /* @__PURE__ */ jsx9(Badge, { className: "border-slate-700 bg-slate-900/80 text-slate-200", children: "PDF auto-convert" })
        ] }),
        /* @__PURE__ */ jsxs6("div", { className: "mt-12 grid gap-6 md:grid-cols-3", children: [
          /* @__PURE__ */ jsxs6("div", { className: "rounded-[28px] border border-slate-800 bg-slate-950/55 p-6", children: [
            /* @__PURE__ */ jsx9("div", { className: "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300", children: /* @__PURE__ */ jsx9(Upload2, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsx9("h2", { className: "text-lg font-semibold text-white", children: "1. Upload Document" }),
            /* @__PURE__ */ jsx9("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: "Use `.pdf`, `.md`, or `.txt`; PDFs become page-marked markdown first." })
          ] }),
          /* @__PURE__ */ jsxs6("div", { className: "rounded-[28px] border border-slate-800 bg-slate-950/55 p-6", children: [
            /* @__PURE__ */ jsx9("div", { className: "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300", children: /* @__PURE__ */ jsx9(Network3, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsx9("h2", { className: "text-lg font-semibold text-white", children: "2. Build Graph" }),
            /* @__PURE__ */ jsx9("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: "The backend extracts entities, concepts, claims, requirements, and relationships." })
          ] }),
          /* @__PURE__ */ jsxs6("div", { className: "rounded-[28px] border border-slate-800 bg-slate-950/55 p-6", children: [
            /* @__PURE__ */ jsx9("div", { className: "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300", children: /* @__PURE__ */ jsx9(Shield2, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsx9("h2", { className: "text-lg font-semibold text-white", children: "3. Inspect Evidence" }),
            /* @__PURE__ */ jsx9("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: "Review graph nodes, edges, quotes, and page references in a dedicated workspace." })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs6("aside", { className: "glass-panel rounded-[32px] p-8", children: [
        /* @__PURE__ */ jsx9("h2", { className: "text-xl font-semibold text-white", children: "Document Ingest" }),
        /* @__PURE__ */ jsx9("p", { className: "mt-3 text-sm leading-6 text-slate-300", children: "Queue one document for extraction. The document graph workspace refreshes when processing completes." }),
        /* @__PURE__ */ jsxs6(
          "div",
          {
            className: `mt-6 rounded-[28px] border-2 border-dashed p-8 text-center transition ${documentUpload.phase === "drag-hover" ? "border-blue-400 bg-blue-500/10" : "border-slate-700 bg-slate-950/50 hover:border-slate-500"}`,
            onDragOver: (event) => {
              event.preventDefault();
              setDocumentDragActive(true);
            },
            onDragLeave: () => setDocumentDragActive(false),
            onDrop: handleDrop,
            children: [
              /* @__PURE__ */ jsx9(Upload2, { className: "mx-auto h-14 w-14 text-slate-400" }),
              /* @__PURE__ */ jsx9("h3", { className: "mt-4 text-xl font-medium text-white", children: "Upload Document" }),
              /* @__PURE__ */ jsx9("p", { className: "mt-2 text-sm text-slate-400", children: "Drag and drop your file here or browse locally." }),
              /* @__PURE__ */ jsx9(
                "input",
                {
                  ref: fileInputRef,
                  type: "file",
                  accept: ".pdf,.md,.txt,application/pdf,text/plain,text/markdown",
                  className: "hidden",
                  onChange: handleFileInput
                }
              ),
              /* @__PURE__ */ jsxs6("div", { className: "mt-6 flex flex-wrap justify-center gap-3", children: [
                /* @__PURE__ */ jsxs6(Button, { variant: "secondary", onClick: () => fileInputRef.current?.click(), children: [
                  /* @__PURE__ */ jsx9(FileText2, { className: "h-4 w-4" }),
                  "Choose File"
                ] }),
                /* @__PURE__ */ jsxs6(Button, { onClick: () => navigate("/documents/processing"), disabled: !selectedFile, children: [
                  "Map Document",
                  /* @__PURE__ */ jsx9(ChevronRight2, { className: "h-4 w-4" })
                ] })
              ] }),
              /* @__PURE__ */ jsx9("p", { className: "mt-4 text-xs uppercase tracking-[0.2em] text-slate-500", children: "Supported formats: .pdf, .md, and .txt" })
            ]
          }
        ),
        /* @__PURE__ */ jsx9("div", { className: "mt-6 rounded-[28px] border border-slate-800 bg-slate-950/60 p-4", children: /* @__PURE__ */ jsxs6("div", { className: "flex items-start justify-between gap-4", children: [
          /* @__PURE__ */ jsxs6("div", { children: [
            /* @__PURE__ */ jsx9("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Selected File" }),
            /* @__PURE__ */ jsx9("p", { className: "mt-2 text-sm font-medium text-white", children: selectedFile?.name ?? "No file selected." }),
            /* @__PURE__ */ jsx9("p", { className: "mt-1 text-sm text-slate-400", children: selectedFile ? formatFileSize2(selectedFile.size) : "Choose a document to begin." })
          ] }),
          selectedFile ? /* @__PURE__ */ jsx9(Button, { variant: "ghost", onClick: clearSelectedDocumentFile, children: "Clear" }) : null
        ] }) }),
        /* @__PURE__ */ jsx9("div", { className: "mt-6", children: /* @__PURE__ */ jsx9(
          StatusBanner,
          {
            tone: documentUpload.error ? "error" : documentGraph.data ? "success" : "info",
            message: documentUpload.error || documentUpload.statusMessage || "Upload a document to continue."
          }
        ) })
      ] })
    ] })
  ] }) });
}
var init_DocumentUploadPage = __esm({
  "src/pages/DocumentUploadPage.tsx"() {
    "use strict";
    init_Badge();
    init_Button();
    init_StatusBanner();
    init_config();
    init_AppContext();
  }
});

// src/components/DocumentOverview.tsx
var DocumentOverview_exports = {};
__export(DocumentOverview_exports, {
  default: () => DocumentOverview
});
import { Boxes as Boxes2, FileText as FileText3, GitBranch as GitBranch2, Quote } from "lucide-react";
import { jsx as jsx10, jsxs as jsxs7 } from "react/jsx-runtime";
function DocumentOverview({ graphData }) {
  const kindCounts = graphData.nodes.reduce((counts, node) => {
    counts[node.kind] = (counts[node.kind] ?? 0) + 1;
    return counts;
  }, {});
  const kindDistribution = Object.entries(kindCounts).map(([kind, count]) => ({ kind, count })).sort((left, right) => right.count - left.count);
  const totalEvidence = graphData.nodes.reduce((sum, node) => sum + node.evidence.length, 0) + graphData.links.reduce((sum, edge) => sum + edge.evidence.length, 0);
  const mostConnected = [...graphData.nodes].sort((left, right) => right.degree - left.degree).slice(0, 5);
  return /* @__PURE__ */ jsx10("div", { className: "h-full overflow-y-auto p-6 md:p-8", children: /* @__PURE__ */ jsxs7("div", { className: "mx-auto max-w-7xl space-y-8", children: [
    /* @__PURE__ */ jsxs7("div", { children: [
      /* @__PURE__ */ jsx10("h1", { className: "text-3xl font-bold text-white", children: "Document Overview" }),
      /* @__PURE__ */ jsx10("p", { className: "mt-2 max-w-3xl text-sm leading-7 text-slate-300", children: "Summary cards and breakdowns are computed directly from the active document graph." })
    ] }),
    /* @__PURE__ */ jsxs7("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [
      /* @__PURE__ */ jsxs7("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsxs7("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx10(Boxes2, { className: "h-8 w-8 text-blue-300" }),
          /* @__PURE__ */ jsx10("span", { className: "text-4xl font-semibold text-white", children: graphData.nodes.length })
        ] }),
        /* @__PURE__ */ jsx10("p", { className: "mt-3 text-sm text-slate-400", children: "Document Nodes" })
      ] }),
      /* @__PURE__ */ jsxs7("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsxs7("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx10(GitBranch2, { className: "h-8 w-8 text-purple-300" }),
          /* @__PURE__ */ jsx10("span", { className: "text-4xl font-semibold text-white", children: graphData.links.length })
        ] }),
        /* @__PURE__ */ jsx10("p", { className: "mt-3 text-sm text-slate-400", children: "Relationships" })
      ] }),
      /* @__PURE__ */ jsxs7("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsxs7("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx10(Quote, { className: "h-8 w-8 text-orange-300" }),
          /* @__PURE__ */ jsx10("span", { className: "text-4xl font-semibold text-white", children: totalEvidence })
        ] }),
        /* @__PURE__ */ jsx10("p", { className: "mt-3 text-sm text-slate-400", children: "Evidence Items" })
      ] }),
      /* @__PURE__ */ jsxs7("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsxs7("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx10(FileText3, { className: "h-8 w-8 text-emerald-300" }),
          /* @__PURE__ */ jsx10("span", { className: "text-4xl font-semibold text-white", children: graphData.kindTypes.length })
        ] }),
        /* @__PURE__ */ jsx10("p", { className: "mt-3 text-sm text-slate-400", children: "Node Kinds" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs7("section", { className: "glass-panel rounded-3xl p-6", children: [
      /* @__PURE__ */ jsx10("h2", { className: "text-xl font-semibold text-white", children: "Most Connected Document Nodes" }),
      /* @__PURE__ */ jsx10("div", { className: "mt-6 space-y-4", children: mostConnected.map((node, index) => /* @__PURE__ */ jsxs7("div", { className: "flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-950/70 p-4", children: [
        /* @__PURE__ */ jsxs7("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx10("div", { className: "flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-sm font-semibold text-blue-100", children: index + 1 }),
          /* @__PURE__ */ jsxs7("div", { children: [
            /* @__PURE__ */ jsx10("div", { className: "font-semibold text-white", children: node.canonicalName }),
            /* @__PURE__ */ jsxs7("div", { className: "mt-1 text-sm text-slate-400", children: [
              formatLabel(node.kind),
              " | ",
              node.id
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs7("div", { className: "text-right", children: [
          /* @__PURE__ */ jsx10("div", { className: "text-2xl font-semibold text-blue-300", children: node.degree }),
          /* @__PURE__ */ jsx10("div", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Connections" })
        ] })
      ] }, node.id)) })
    ] }),
    /* @__PURE__ */ jsxs7("section", { className: "glass-panel rounded-3xl p-6", children: [
      /* @__PURE__ */ jsx10("h2", { className: "text-xl font-semibold text-white", children: "Kind Breakdown" }),
      /* @__PURE__ */ jsx10("div", { className: "mt-6 grid gap-4 md:grid-cols-2", children: kindDistribution.map((entry) => /* @__PURE__ */ jsx10("div", { className: "rounded-3xl border border-slate-800 bg-slate-950/70 p-4", children: /* @__PURE__ */ jsxs7("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs7("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx10("span", { className: "h-3 w-3 rounded-full", style: { backgroundColor: getDocumentKindColor(entry.kind) } }),
          /* @__PURE__ */ jsx10("span", { className: "font-medium text-white", children: formatLabel(entry.kind) })
        ] }),
        /* @__PURE__ */ jsx10("span", { className: "text-lg font-semibold text-white", children: entry.count })
      ] }) }, entry.kind)) })
    ] })
  ] }) });
}
var init_DocumentOverview = __esm({
  "src/components/DocumentOverview.tsx"() {
    "use strict";
    init_selectors();
  }
});

// tests/pages.test.tsx
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// tests/test-utils.tsx
function installRuntimeWindowConfig(overrides = {}) {
  const requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
  const cancelAnimationFrame = (handle) => clearTimeout(handle);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: {
      __TWIN_CONFIG__: {
        MAX_UPLOAD_MB: 10,
        PROCESSING_TIMEOUT_MS: 9e4,
        APP_ENV: "test",
        ...overrides
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      addEventListener: () => {
      },
      removeEventListener: () => {
      },
      requestAnimationFrame,
      cancelAnimationFrame,
      devicePixelRatio: 1
    }
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: {
      createElement: () => ({
        getContext: () => ({}),
        style: {},
        setAttribute: () => {
        },
        appendChild: () => {
        }
      }),
      body: {
        appendChild: () => {
        }
      }
    }
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: {
      userAgent: "node.js"
    }
  });
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    writable: true,
    value: requestAnimationFrame
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    writable: true,
    value: cancelAnimationFrame
  });
  if (!("ResizeObserver" in globalThis)) {
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: class ResizeObserver {
        observe() {
        }
        unobserve() {
        }
        disconnect() {
        }
      }
    });
  }
}
function createSampleGraphData() {
  const nodes = [
    {
      id: "api",
      name: "API Service",
      type: "software",
      description: "Core API",
      riskScore: 82,
      riskLevel: "high",
      degree: 2,
      betweenness: 0.55,
      closeness: 0.67,
      blastRadius: 3,
      dependencySpan: 2,
      riskExplanation: "Handles core requests.",
      source: "sample",
      dependencies: ["db"],
      dependents: ["frontend"],
      val: 36
    },
    {
      id: "db",
      name: "Database",
      type: "data",
      description: "Persistence layer",
      riskScore: 44,
      riskLevel: "medium",
      degree: 1,
      betweenness: 0.22,
      closeness: 0.44,
      blastRadius: 1,
      dependencySpan: 1,
      riskExplanation: "Stores records.",
      source: "sample",
      dependencies: [],
      dependents: ["api"],
      val: 28
    }
  ];
  return {
    source: "sample",
    nodes,
    links: [
      {
        id: "api-db-0",
        source: "api",
        target: "db",
        relation: "depends_on",
        rationale: "Reads and writes records."
      }
    ],
    nodeIndex: Object.fromEntries(nodes.map((node) => [node.id, node])),
    relationTypes: ["depends_on"]
  };
}
function createSampleDocumentGraphData() {
  const nodes = [
    {
      id: "D1",
      label: "Retention Policy",
      kind: "requirement",
      canonicalName: "Retention Policy",
      aliases: ["records policy"],
      summary: "Defines record retention.",
      evidence: [{ quote: "Records are retained for 7 years.", pageStart: 1, pageEnd: 1 }],
      sources: [
        {
          documentName: "policy.pdf",
          chunkFile: "chunk_01.txt",
          chunkId: "chunk_01",
          pdfPageStart: 1,
          pdfPageEnd: 1
        }
      ],
      degree: 1,
      source: "document",
      val: 20
    },
    {
      id: "D2",
      label: "Seven Years",
      kind: "date",
      canonicalName: "Seven Years",
      aliases: [],
      summary: "Retention duration.",
      evidence: [{ quote: "7 years", pageStart: 1, pageEnd: 1 }],
      sources: [],
      degree: 1,
      source: "document",
      val: 20
    }
  ];
  return {
    source: "document",
    nodes,
    links: [
      {
        id: "DE1",
        source: "D1",
        target: "D2",
        type: "requires",
        summary: "Retention policy requires seven years.",
        evidence: [{ quote: "retained for 7 years", pageStart: 1, pageEnd: 1 }],
        sourceChunk: {
          documentName: "policy.pdf",
          chunkFile: "chunk_01.txt",
          chunkId: "chunk_01",
          pdfPageStart: 1,
          pdfPageEnd: 1
        }
      }
    ],
    nodeIndex: Object.fromEntries(nodes.map((node) => [node.id, node])),
    kindTypes: ["date", "requirement"],
    relationTypes: ["requires"]
  };
}
function createMockContext(overrides = {}) {
  return {
    upload: {
      phase: "idle",
      selectedFile: null,
      error: null,
      statusMessage: "Upload a .md or .txt file to build the graph.",
      ingestionId: null,
      ingestion: null,
      processingStatus: null,
      startedAt: null,
      completedAt: null,
      retryCount: 0
    },
    graph: {
      status: "idle",
      data: null,
      error: null,
      lastLoadedAt: null
    },
    documentUpload: {
      phase: "idle",
      selectedFile: null,
      error: null,
      statusMessage: "Upload a .pdf, .md, or .txt file to build a document graph.",
      ingestionId: null,
      ingestion: null,
      processingStatus: null,
      startedAt: null,
      completedAt: null,
      retryCount: 0
    },
    documentGraph: {
      status: "idle",
      data: null,
      error: null,
      lastLoadedAt: null
    },
    setDragActive: () => {
    },
    selectFile: () => true,
    clearSelectedFile: () => {
    },
    beginProcessing: async () => {
    },
    loadGraph: async () => {
    },
    setDocumentDragActive: () => {
    },
    selectDocumentFile: () => true,
    clearSelectedDocumentFile: () => {
    },
    beginDocumentProcessing: async () => {
    },
    loadDocumentGraph: async () => {
    },
    resetUploadState: () => {
    },
    ...overrides
  };
}

// tests/pages.test.tsx
import { jsx as jsx11 } from "react/jsx-runtime";
installRuntimeWindowConfig();
var { AppContext: AppContext2 } = await Promise.resolve().then(() => (init_AppContext(), AppContext_exports));
var { default: LandingPage2 } = await Promise.resolve().then(() => (init_LandingPage(), LandingPage_exports));
var { default: ProcessingPage2 } = await Promise.resolve().then(() => (init_ProcessingPage(), ProcessingPage_exports));
var { default: SystemOverview2 } = await Promise.resolve().then(() => (init_SystemOverview(), SystemOverview_exports));
var { default: DocumentUploadPage2 } = await Promise.resolve().then(() => (init_DocumentUploadPage(), DocumentUploadPage_exports));
var { default: DocumentOverview2 } = await Promise.resolve().then(() => (init_DocumentOverview(), DocumentOverview_exports));
function renderWithContext(element, contextOverrides = {}, initialEntries = ["/"]) {
  return renderToStaticMarkup(
    /* @__PURE__ */ jsx11(MemoryRouter, { initialEntries, children: /* @__PURE__ */ jsx11(AppContext2.Provider, { value: createMockContext(contextOverrides), children: element }) })
  );
}
test("landing page renders the upload workspace content", () => {
  const html = renderWithContext(/* @__PURE__ */ jsx11(LandingPage2, {}));
  assert.match(html, /TwinGraphOps/);
  assert.match(html, /Upload System Documentation/);
  assert.match(html, /Supported formats: \.md and \.txt/);
  assert.match(html, /Document Workspace/);
});
test("processing page renders the active processing state", () => {
  const html = renderWithContext(
    /* @__PURE__ */ jsx11(ProcessingPage2, {}),
    {
      upload: {
        ...createMockContext().upload,
        phase: "uploading",
        selectedFile: new File(["hello"], "system.md", { type: "text/markdown" }),
        statusMessage: "Uploading system.md...",
        startedAt: Date.now()
      }
    },
    ["/processing"]
  );
  assert.match(html, /Processing Your Documentation/);
  assert.match(html, /Uploading document/);
  assert.match(html, /Uploading system\.md/);
});
test("system overview renders the loaded workspace summary", () => {
  const graphData = createSampleGraphData();
  const html = renderToStaticMarkup(/* @__PURE__ */ jsx11(SystemOverview2, { graphData }));
  assert.match(html, /System Overview/);
  assert.match(html, /Total Components/);
  assert.match(html, /Relationships/);
  assert.match(html, /Most Connected Components/);
  assert.match(html, /API Service/);
});
test("document upload page renders pdf markdown and text support", () => {
  const html = renderWithContext(/* @__PURE__ */ jsx11(DocumentUploadPage2, {}), {}, ["/documents"]);
  assert.match(html, /Document Knowledge Graphs/);
  assert.match(html, /Supported formats: \.pdf, \.md, and \.txt/);
  assert.match(html, /Risk Workspace/);
});
test("document overview renders the loaded document graph summary", () => {
  const graphData = createSampleDocumentGraphData();
  const html = renderToStaticMarkup(/* @__PURE__ */ jsx11(DocumentOverview2, { graphData }));
  assert.match(html, /Document Overview/);
  assert.match(html, /Document Nodes/);
  assert.match(html, /Evidence Items/);
  assert.match(html, /Retention Policy/);
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2xpYi9hZGFwdGVycy50cyIsICIuLi9zcmMvbGliL2NvbmZpZy50cyIsICIuLi9zcmMvbGliL2FwaS50cyIsICIuLi9zcmMvc3RhdGUvQXBwQ29udGV4dC50c3giLCAiLi4vc3JjL2xpYi9jbi50cyIsICIuLi9zcmMvY29tcG9uZW50cy91aS9CdXR0b24udHN4IiwgIi4uL3NyYy9jb21wb25lbnRzL3VpL0JhZGdlLnRzeCIsICIuLi9zcmMvY29tcG9uZW50cy9TdGF0dXNCYW5uZXIudHN4IiwgIi4uL3NyYy9wYWdlcy9MYW5kaW5nUGFnZS50c3giLCAiLi4vc3JjL2NvbXBvbmVudHMvUHJvY2Vzc2luZ0FjdGl2aXR5UGFuZWwudHN4IiwgIi4uL3NyYy9wYWdlcy9Qcm9jZXNzaW5nUGFnZS50c3giLCAiLi4vc3JjL2xpYi9zZWxlY3RvcnMudHMiLCAiLi4vc3JjL2NvbXBvbmVudHMvU3lzdGVtT3ZlcnZpZXcudHN4IiwgIi4uL3NyYy9wYWdlcy9Eb2N1bWVudFVwbG9hZFBhZ2UudHN4IiwgIi4uL3NyYy9jb21wb25lbnRzL0RvY3VtZW50T3ZlcnZpZXcudHN4IiwgIi4uL3Rlc3RzL3BhZ2VzLnRlc3QudHN4IiwgIi4uL3Rlc3RzL3Rlc3QtdXRpbHMudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgdHlwZSB7XG4gIEFwaURvY3VtZW50RWRnZSxcbiAgQXBpRG9jdW1lbnRFdmlkZW5jZSxcbiAgQXBpRG9jdW1lbnRHcmFwaERhdGEsXG4gIEFwaURvY3VtZW50Tm9kZSxcbiAgQXBpRG9jdW1lbnRTb3VyY2UsXG4gIEFwaUdyYXBoRGF0YSxcbiAgQXBpR3JhcGhFZGdlLFxuICBBcGlHcmFwaE5vZGUsXG4gIEltcGFjdFJlc3BvbnNlLFxuICBSaXNrUmVzcG9uc2UsXG59IGZyb20gJy4uL3R5cGVzL2FwaSc7XG5pbXBvcnQgdHlwZSB7XG4gIERvY3VtZW50RWRnZSxcbiAgRG9jdW1lbnRFdmlkZW5jZSxcbiAgRG9jdW1lbnRHcmFwaERhdGEsXG4gIERvY3VtZW50Tm9kZSxcbiAgRG9jdW1lbnRTb3VyY2UsXG4gIEdyYXBoRGF0YSxcbiAgR3JhcGhFZGdlLFxuICBHcmFwaE5vZGUsXG4gIE5vZGVEZXRhaWxzLFxuICBOb2RlUmVmZXJlbmNlLFxufSBmcm9tICcuLi90eXBlcy9hcHAnO1xuXHJcbmZ1bmN0aW9uIGVuc3VyZVN0cmluZyh2YWx1ZTogdW5rbm93biwgbGFiZWw6IHN0cmluZykge1xyXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1hbGZvcm1lZCBBUEkgcmVzcG9uc2U6IGV4cGVjdGVkICR7bGFiZWx9IHRvIGJlIGEgc3RyaW5nLmApO1xyXG4gIH1cclxuICByZXR1cm4gdmFsdWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVuc3VyZU51bWJlcih2YWx1ZTogdW5rbm93biwgbGFiZWw6IHN0cmluZykge1xyXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInIHx8IE51bWJlci5pc05hTih2YWx1ZSkpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgTWFsZm9ybWVkIEFQSSByZXNwb25zZTogZXhwZWN0ZWQgJHtsYWJlbH0gdG8gYmUgYSBudW1iZXIuYCk7XHJcbiAgfVxyXG4gIHJldHVybiB2YWx1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZW5zdXJlQXJyYXk8VD4odmFsdWU6IHVua25vd24sIGxhYmVsOiBzdHJpbmcpIHtcclxuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1hbGZvcm1lZCBBUEkgcmVzcG9uc2U6IGV4cGVjdGVkICR7bGFiZWx9IHRvIGJlIGFuIGFycmF5LmApO1xyXG4gIH1cclxuICByZXR1cm4gdmFsdWUgYXMgVFtdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBub3JtYWxpemVOb2RlKG5vZGU6IEFwaUdyYXBoTm9kZSwgZGVwZW5kZW5jeU1hcDogTWFwPHN0cmluZywgc3RyaW5nW10+LCBkZXBlbmRlbnRNYXA6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPik6IEdyYXBoTm9kZSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIGlkOiBlbnN1cmVTdHJpbmcobm9kZS5pZCwgJ25vZGUuaWQnKSxcclxuICAgIG5hbWU6IGVuc3VyZVN0cmluZyhub2RlLm5hbWUsICdub2RlLm5hbWUnKSxcclxuICAgIHR5cGU6IGVuc3VyZVN0cmluZyhub2RlLnR5cGUsICdub2RlLnR5cGUnKSxcclxuICAgIGRlc2NyaXB0aW9uOiBlbnN1cmVTdHJpbmcobm9kZS5kZXNjcmlwdGlvbiwgJ25vZGUuZGVzY3JpcHRpb24nKSxcclxuICAgIHJpc2tTY29yZTogZW5zdXJlTnVtYmVyKG5vZGUucmlza19zY29yZSwgJ25vZGUucmlza19zY29yZScpLFxyXG4gICAgcmlza0xldmVsOiBlbnN1cmVTdHJpbmcobm9kZS5yaXNrX2xldmVsLCAnbm9kZS5yaXNrX2xldmVsJyksXHJcbiAgICBkZWdyZWU6IGVuc3VyZU51bWJlcihub2RlLmRlZ3JlZSwgJ25vZGUuZGVncmVlJyksXHJcbiAgICBiZXR3ZWVubmVzczogZW5zdXJlTnVtYmVyKG5vZGUuYmV0d2Vlbm5lc3MsICdub2RlLmJldHdlZW5uZXNzJyksXHJcbiAgICBjbG9zZW5lc3M6IGVuc3VyZU51bWJlcihub2RlLmNsb3NlbmVzcywgJ25vZGUuY2xvc2VuZXNzJyksXHJcbiAgICBibGFzdFJhZGl1czogZW5zdXJlTnVtYmVyKG5vZGUuYmxhc3RfcmFkaXVzLCAnbm9kZS5ibGFzdF9yYWRpdXMnKSxcclxuICAgIGRlcGVuZGVuY3lTcGFuOiBlbnN1cmVOdW1iZXIobm9kZS5kZXBlbmRlbmN5X3NwYW4sICdub2RlLmRlcGVuZGVuY3lfc3BhbicpLFxyXG4gICAgcmlza0V4cGxhbmF0aW9uOiBlbnN1cmVTdHJpbmcobm9kZS5yaXNrX2V4cGxhbmF0aW9uLCAnbm9kZS5yaXNrX2V4cGxhbmF0aW9uJyksXHJcbiAgICBzb3VyY2U6IGVuc3VyZVN0cmluZyhub2RlLnNvdXJjZSwgJ25vZGUuc291cmNlJyksXHJcbiAgICBkZXBlbmRlbmNpZXM6IGRlcGVuZGVuY3lNYXAuZ2V0KG5vZGUuaWQpID8/IFtdLFxyXG4gICAgZGVwZW5kZW50czogZGVwZW5kZW50TWFwLmdldChub2RlLmlkKSA/PyBbXSxcclxuICAgIHZhbDogMTggKyBNYXRoLnJvdW5kKChub2RlLnJpc2tfc2NvcmUgLyAxMDApICogMjIpLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5vcm1hbGl6ZUVkZ2UoZWRnZTogQXBpR3JhcGhFZGdlLCBpbmRleDogbnVtYmVyKTogR3JhcGhFZGdlIHtcclxuICByZXR1cm4ge1xyXG4gICAgaWQ6IGAke2Vuc3VyZVN0cmluZyhlZGdlLnNvdXJjZSwgJ2VkZ2Uuc291cmNlJyl9LSR7ZW5zdXJlU3RyaW5nKGVkZ2UudGFyZ2V0LCAnZWRnZS50YXJnZXQnKX0tJHtpbmRleH1gLFxyXG4gICAgc291cmNlOiBlZGdlLnNvdXJjZSxcclxuICAgIHRhcmdldDogZWRnZS50YXJnZXQsXHJcbiAgICByZWxhdGlvbjogZW5zdXJlU3RyaW5nKGVkZ2UucmVsYXRpb24sICdlZGdlLnJlbGF0aW9uJyksXHJcbiAgICByYXRpb25hbGU6IGVuc3VyZVN0cmluZyhlZGdlLnJhdGlvbmFsZSwgJ2VkZ2UucmF0aW9uYWxlJyksXHJcbiAgfTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0R3JhcGgoYXBpR3JhcGg6IEFwaUdyYXBoRGF0YSk6IEdyYXBoRGF0YSB7XHJcbiAgY29uc3Qgc291cmNlID0gZW5zdXJlU3RyaW5nKGFwaUdyYXBoLnNvdXJjZSwgJ2dyYXBoLnNvdXJjZScpO1xyXG4gIGNvbnN0IGFwaU5vZGVzID0gZW5zdXJlQXJyYXk8QXBpR3JhcGhOb2RlPihhcGlHcmFwaC5ub2RlcywgJ2dyYXBoLm5vZGVzJyk7XHJcbiAgY29uc3QgYXBpRWRnZXMgPSBlbnN1cmVBcnJheTxBcGlHcmFwaEVkZ2U+KGFwaUdyYXBoLmVkZ2VzLCAnZ3JhcGguZWRnZXMnKTtcclxuXHJcbiAgY29uc3QgZGVwZW5kZW5jeU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcclxuICBjb25zdCBkZXBlbmRlbnRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XHJcblxyXG4gIGZvciAoY29uc3QgZWRnZSBvZiBhcGlFZGdlcykge1xyXG4gICAgY29uc3Qgc291cmNlSWQgPSBlbnN1cmVTdHJpbmcoZWRnZS5zb3VyY2UsICdlZGdlLnNvdXJjZScpO1xyXG4gICAgY29uc3QgdGFyZ2V0SWQgPSBlbnN1cmVTdHJpbmcoZWRnZS50YXJnZXQsICdlZGdlLnRhcmdldCcpO1xyXG4gICAgZGVwZW5kZW5jeU1hcC5zZXQoc291cmNlSWQsIFsuLi4oZGVwZW5kZW5jeU1hcC5nZXQoc291cmNlSWQpID8/IFtdKSwgdGFyZ2V0SWRdKTtcclxuICAgIGRlcGVuZGVudE1hcC5zZXQodGFyZ2V0SWQsIFsuLi4oZGVwZW5kZW50TWFwLmdldCh0YXJnZXRJZCkgPz8gW10pLCBzb3VyY2VJZF0pO1xyXG4gIH1cclxuXHJcbiAgY29uc3Qgbm9kZXMgPSBhcGlOb2Rlcy5tYXAoKG5vZGUpID0+IG5vcm1hbGl6ZU5vZGUobm9kZSwgZGVwZW5kZW5jeU1hcCwgZGVwZW5kZW50TWFwKSk7XHJcbiAgY29uc3QgbGlua3MgPSBhcGlFZGdlcy5tYXAoKGVkZ2UsIGluZGV4KSA9PiBub3JtYWxpemVFZGdlKGVkZ2UsIGluZGV4KSk7XHJcbiAgY29uc3Qgbm9kZUluZGV4ID0gT2JqZWN0LmZyb21FbnRyaWVzKG5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUuaWQsIG5vZGVdKSk7XHJcbiAgY29uc3QgcmVsYXRpb25UeXBlcyA9IFsuLi5uZXcgU2V0KGxpbmtzLm1hcCgoZWRnZSkgPT4gZWRnZS5yZWxhdGlvbikpXS5zb3J0KCk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBzb3VyY2UsXHJcbiAgICBub2RlcyxcclxuICAgIGxpbmtzLFxyXG4gICAgbm9kZUluZGV4LFxyXG4gICAgcmVsYXRpb25UeXBlcyxcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiB0b05vZGVSZWZlcmVuY2Uobm9kZT86IEdyYXBoTm9kZSB8IG51bGwpOiBOb2RlUmVmZXJlbmNlIHwgbnVsbCB7XHJcbiAgaWYgKCFub2RlKSB7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBpZDogbm9kZS5pZCxcclxuICAgIG5hbWU6IG5vZGUubmFtZSxcclxuICAgIHR5cGU6IG5vZGUudHlwZSxcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JtYXRNZXRyaWModmFsdWU6IG51bWJlcikge1xyXG4gIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKHZhbHVlKSA/IFN0cmluZyh2YWx1ZSkgOiB2YWx1ZS50b0ZpeGVkKDMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYWRhcHROb2RlRGV0YWlscyhcbiAgZ3JhcGg6IEdyYXBoRGF0YSxcclxuICBjb21wb25lbnRJZDogc3RyaW5nLFxyXG4gIHJpc2s6IFJpc2tSZXNwb25zZSxcclxuICBpbXBhY3Q6IEltcGFjdFJlc3BvbnNlXHJcbik6IE5vZGVEZXRhaWxzIHtcclxuICBjb25zdCBub2RlID0gZ3JhcGgubm9kZUluZGV4W2NvbXBvbmVudElkXTtcclxuICBpZiAoIW5vZGUpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgQ29tcG9uZW50ICcke2NvbXBvbmVudElkfScgaXMgbWlzc2luZyBmcm9tIHRoZSBhY3RpdmUgZ3JhcGguYCk7XHJcbiAgfVxyXG5cclxuICBjb25zdCBkZXBlbmRlbmNpZXMgPSBub2RlLmRlcGVuZGVuY2llc1xyXG4gICAgLm1hcCgoZGVwZW5kZW5jeUlkKSA9PiB0b05vZGVSZWZlcmVuY2UoZ3JhcGgubm9kZUluZGV4W2RlcGVuZGVuY3lJZF0pKVxyXG4gICAgLmZpbHRlcigoY2FuZGlkYXRlKTogY2FuZGlkYXRlIGlzIE5vZGVSZWZlcmVuY2UgPT4gQm9vbGVhbihjYW5kaWRhdGUpKTtcclxuXHJcbiAgY29uc3QgYWZmZWN0ZWRTeXN0ZW1zID0gaW1wYWN0LmltcGFjdGVkX2NvbXBvbmVudHNcclxuICAgIC5tYXAoKGFmZmVjdGVkSWQpID0+IHRvTm9kZVJlZmVyZW5jZShncmFwaC5ub2RlSW5kZXhbYWZmZWN0ZWRJZF0pID8/IHsgaWQ6IGFmZmVjdGVkSWQsIG5hbWU6IGFmZmVjdGVkSWQsIHR5cGU6ICd1bmtub3duJyB9KVxyXG4gICAgLmZpbHRlcigoY2FuZGlkYXRlKTogY2FuZGlkYXRlIGlzIE5vZGVSZWZlcmVuY2UgPT4gQm9vbGVhbihjYW5kaWRhdGUpKTtcclxuXHJcbiAgY29uc3QgcmVsYXRlZFJhdGlvbmFsZXMgPSBncmFwaC5saW5rc1xyXG4gICAgLmZpbHRlcigobGluaykgPT4gbGluay5zb3VyY2UgPT09IGNvbXBvbmVudElkIHx8IGxpbmsudGFyZ2V0ID09PSBjb21wb25lbnRJZClcclxuICAgIC5tYXAoKGxpbmspID0+IGxpbmsucmF0aW9uYWxlKVxyXG4gICAgLmZpbHRlcigocmF0aW9uYWxlKSA9PiByYXRpb25hbGUudHJpbSgpLmxlbmd0aCA+IDApO1xyXG5cclxuICBjb25zdCBpc3N1ZXMgPSBbcmlzay5leHBsYW5hdGlvbiwgLi4ucmVsYXRlZFJhdGlvbmFsZXNdLmZpbHRlcihcclxuICAgICh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pOiB2YWx1ZSBpcyBzdHJpbmcgPT4gdmFsdWUudHJpbSgpLmxlbmd0aCA+IDAgJiYgY29sbGVjdGlvbi5pbmRleE9mKHZhbHVlKSA9PT0gaW5kZXhcclxuICApO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgY29tcG9uZW50SWQ6IG5vZGUuaWQsXHJcbiAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICB0eXBlOiBub2RlLnR5cGUsXHJcbiAgICByaXNrU2NvcmU6IHJpc2suc2NvcmUsXHJcbiAgICByaXNrTGV2ZWw6IHJpc2subGV2ZWwsXHJcbiAgICBkZXNjcmlwdGlvbjogbm9kZS5kZXNjcmlwdGlvbixcclxuICAgIGRlcGVuZGVuY2llcyxcclxuICAgIGFmZmVjdGVkU3lzdGVtcyxcclxuICAgIGlzc3VlcyxcclxuICAgIGV4cGxhbmF0aW9uOiByaXNrLmV4cGxhbmF0aW9uLFxyXG4gICAgaW1wYWN0Q291bnQ6IGltcGFjdC5pbXBhY3RfY291bnQsXHJcbiAgICBtZXRhZGF0YTogW1xyXG4gICAgICB7IGxhYmVsOiAnRGVncmVlJywgdmFsdWU6IGZvcm1hdE1ldHJpYyhub2RlLmRlZ3JlZSkgfSxcclxuICAgICAgeyBsYWJlbDogJ0JldHdlZW5uZXNzJywgdmFsdWU6IGZvcm1hdE1ldHJpYyhub2RlLmJldHdlZW5uZXNzKSB9LFxyXG4gICAgICB7IGxhYmVsOiAnQ2xvc2VuZXNzJywgdmFsdWU6IGZvcm1hdE1ldHJpYyhub2RlLmNsb3NlbmVzcykgfSxcclxuICAgICAgeyBsYWJlbDogJ0JsYXN0IFJhZGl1cycsIHZhbHVlOiBTdHJpbmcobm9kZS5ibGFzdFJhZGl1cykgfSxcclxuICAgICAgeyBsYWJlbDogJ0RlcGVuZGVuY3kgU3BhbicsIHZhbHVlOiBTdHJpbmcobm9kZS5kZXBlbmRlbmN5U3BhbikgfSxcclxuICAgICAgeyBsYWJlbDogJ1NvdXJjZScsIHZhbHVlOiBub2RlLnNvdXJjZSB9LFxyXG4gICAgXSxcclxuICB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVEb2N1bWVudEV2aWRlbmNlKGV2aWRlbmNlOiBBcGlEb2N1bWVudEV2aWRlbmNlKTogRG9jdW1lbnRFdmlkZW5jZSB7XG4gIHJldHVybiB7XG4gICAgcXVvdGU6IGVuc3VyZVN0cmluZyhldmlkZW5jZS5xdW90ZSwgJ2RvY3VtZW50LmV2aWRlbmNlLnF1b3RlJyksXG4gICAgcGFnZVN0YXJ0OiBldmlkZW5jZS5wYWdlX3N0YXJ0LFxuICAgIHBhZ2VFbmQ6IGV2aWRlbmNlLnBhZ2VfZW5kLFxuICB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVEb2N1bWVudFNvdXJjZShzb3VyY2U6IEFwaURvY3VtZW50U291cmNlKTogRG9jdW1lbnRTb3VyY2Uge1xuICByZXR1cm4ge1xuICAgIGRvY3VtZW50TmFtZTogZW5zdXJlU3RyaW5nKHNvdXJjZS5kb2N1bWVudF9uYW1lLCAnZG9jdW1lbnQuc291cmNlLmRvY3VtZW50X25hbWUnKSxcbiAgICBjaHVua0ZpbGU6IGVuc3VyZVN0cmluZyhzb3VyY2UuY2h1bmtfZmlsZSwgJ2RvY3VtZW50LnNvdXJjZS5jaHVua19maWxlJyksXG4gICAgY2h1bmtJZDogZW5zdXJlU3RyaW5nKHNvdXJjZS5jaHVua19pZCwgJ2RvY3VtZW50LnNvdXJjZS5jaHVua19pZCcpLFxuICAgIHBkZlBhZ2VTdGFydDogc291cmNlLnBkZl9wYWdlX3N0YXJ0LFxuICAgIHBkZlBhZ2VFbmQ6IHNvdXJjZS5wZGZfcGFnZV9lbmQsXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZURvY3VtZW50Tm9kZShub2RlOiBBcGlEb2N1bWVudE5vZGUpOiBEb2N1bWVudE5vZGUge1xuICBjb25zdCBkZWdyZWUgPSBlbnN1cmVOdW1iZXIobm9kZS5kZWdyZWUsICdkb2N1bWVudC5ub2RlLmRlZ3JlZScpO1xuICByZXR1cm4ge1xuICAgIGlkOiBlbnN1cmVTdHJpbmcobm9kZS5pZCwgJ2RvY3VtZW50Lm5vZGUuaWQnKSxcbiAgICBsYWJlbDogZW5zdXJlU3RyaW5nKG5vZGUubGFiZWwsICdkb2N1bWVudC5ub2RlLmxhYmVsJyksXG4gICAga2luZDogZW5zdXJlU3RyaW5nKG5vZGUua2luZCwgJ2RvY3VtZW50Lm5vZGUua2luZCcpLFxuICAgIGNhbm9uaWNhbE5hbWU6IGVuc3VyZVN0cmluZyhub2RlLmNhbm9uaWNhbF9uYW1lLCAnZG9jdW1lbnQubm9kZS5jYW5vbmljYWxfbmFtZScpLFxuICAgIGFsaWFzZXM6IGVuc3VyZUFycmF5PHN0cmluZz4obm9kZS5hbGlhc2VzLCAnZG9jdW1lbnQubm9kZS5hbGlhc2VzJyksXG4gICAgc3VtbWFyeTogZW5zdXJlU3RyaW5nKG5vZGUuc3VtbWFyeSwgJ2RvY3VtZW50Lm5vZGUuc3VtbWFyeScpLFxuICAgIGV2aWRlbmNlOiBlbnN1cmVBcnJheTxBcGlEb2N1bWVudEV2aWRlbmNlPihub2RlLmV2aWRlbmNlLCAnZG9jdW1lbnQubm9kZS5ldmlkZW5jZScpLm1hcChub3JtYWxpemVEb2N1bWVudEV2aWRlbmNlKSxcbiAgICBzb3VyY2VzOiBlbnN1cmVBcnJheTxBcGlEb2N1bWVudFNvdXJjZT4obm9kZS5zb3VyY2VzLCAnZG9jdW1lbnQubm9kZS5zb3VyY2VzJykubWFwKG5vcm1hbGl6ZURvY3VtZW50U291cmNlKSxcbiAgICBkZWdyZWUsXG4gICAgc291cmNlOiBlbnN1cmVTdHJpbmcobm9kZS5zb3VyY2UsICdkb2N1bWVudC5ub2RlLnNvdXJjZScpLFxuICAgIHZhbDogMTYgKyBNYXRoLm1pbigxOCwgTWF0aC5yb3VuZChkZWdyZWUgKiA0KSksXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZURvY3VtZW50RWRnZShlZGdlOiBBcGlEb2N1bWVudEVkZ2UpOiBEb2N1bWVudEVkZ2Uge1xuICByZXR1cm4ge1xuICAgIGlkOiBlbnN1cmVTdHJpbmcoZWRnZS5pZCwgJ2RvY3VtZW50LmVkZ2UuaWQnKSxcbiAgICBzb3VyY2U6IGVuc3VyZVN0cmluZyhlZGdlLnNvdXJjZSwgJ2RvY3VtZW50LmVkZ2Uuc291cmNlJyksXG4gICAgdGFyZ2V0OiBlbnN1cmVTdHJpbmcoZWRnZS50YXJnZXQsICdkb2N1bWVudC5lZGdlLnRhcmdldCcpLFxuICAgIHR5cGU6IGVuc3VyZVN0cmluZyhlZGdlLnR5cGUsICdkb2N1bWVudC5lZGdlLnR5cGUnKSxcbiAgICBzdW1tYXJ5OiBlbnN1cmVTdHJpbmcoZWRnZS5zdW1tYXJ5LCAnZG9jdW1lbnQuZWRnZS5zdW1tYXJ5JyksXG4gICAgZXZpZGVuY2U6IGVuc3VyZUFycmF5PEFwaURvY3VtZW50RXZpZGVuY2U+KGVkZ2UuZXZpZGVuY2UsICdkb2N1bWVudC5lZGdlLmV2aWRlbmNlJykubWFwKG5vcm1hbGl6ZURvY3VtZW50RXZpZGVuY2UpLFxuICAgIHNvdXJjZUNodW5rOiBlZGdlLnNvdXJjZV9jaHVuayA/IG5vcm1hbGl6ZURvY3VtZW50U291cmNlKGVkZ2Uuc291cmNlX2NodW5rKSA6IG51bGwsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGFwdERvY3VtZW50R3JhcGgoYXBpR3JhcGg6IEFwaURvY3VtZW50R3JhcGhEYXRhKTogRG9jdW1lbnRHcmFwaERhdGEge1xuICBjb25zdCBzb3VyY2UgPSBlbnN1cmVTdHJpbmcoYXBpR3JhcGguc291cmNlLCAnZG9jdW1lbnQuZ3JhcGguc291cmNlJyk7XG4gIGNvbnN0IG5vZGVzID0gZW5zdXJlQXJyYXk8QXBpRG9jdW1lbnROb2RlPihhcGlHcmFwaC5ub2RlcywgJ2RvY3VtZW50LmdyYXBoLm5vZGVzJykubWFwKG5vcm1hbGl6ZURvY3VtZW50Tm9kZSk7XG4gIGNvbnN0IGxpbmtzID0gZW5zdXJlQXJyYXk8QXBpRG9jdW1lbnRFZGdlPihhcGlHcmFwaC5lZGdlcywgJ2RvY3VtZW50LmdyYXBoLmVkZ2VzJykubWFwKG5vcm1hbGl6ZURvY3VtZW50RWRnZSk7XG4gIGNvbnN0IG5vZGVJbmRleCA9IE9iamVjdC5mcm9tRW50cmllcyhub2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLmlkLCBub2RlXSkpO1xuICBjb25zdCBraW5kVHlwZXMgPSBbLi4ubmV3IFNldChub2Rlcy5tYXAoKG5vZGUpID0+IG5vZGUua2luZCkpXS5zb3J0KCk7XG4gIGNvbnN0IHJlbGF0aW9uVHlwZXMgPSBbLi4ubmV3IFNldChsaW5rcy5tYXAoKGVkZ2UpID0+IGVkZ2UudHlwZSkpXS5zb3J0KCk7XG5cbiAgcmV0dXJuIHtcbiAgICBzb3VyY2UsXG4gICAgbm9kZXMsXG4gICAgbGlua3MsXG4gICAgbm9kZUluZGV4LFxuICAgIGtpbmRUeXBlcyxcbiAgICByZWxhdGlvblR5cGVzLFxuICB9O1xufVxuIiwgImNvbnN0IHJ1bnRpbWVDb25maWcgPSB3aW5kb3cuX19UV0lOX0NPTkZJR19fID8/IHt9O1xyXG5cclxuZnVuY3Rpb24gcmVhZE51bWJlcih2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgdW5kZWZpbmVkLCBmYWxsYmFjazogbnVtYmVyKSB7XHJcbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHZhbHVlKTtcclxuICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgJiYgcGFyc2VkID4gMCA/IHBhcnNlZCA6IGZhbGxiYWNrO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgYXBwQ29uZmlnID0ge1xyXG4gIGFwaUJhc2VVcmw6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxyXG4gIG1heFVwbG9hZEJ5dGVzOlxyXG4gICAgcmVhZE51bWJlcihydW50aW1lQ29uZmlnLk1BWF9VUExPQURfTUIgfHwgaW1wb3J0Lm1ldGEuZW52LlZJVEVfTUFYX1VQTE9BRF9NQiwgMTApICogMTAyNCAqIDEwMjQsXHJcbiAgcHJvY2Vzc2luZ1RpbWVvdXRNczogcmVhZE51bWJlcihcclxuICAgIHJ1bnRpbWVDb25maWcuUFJPQ0VTU0lOR19USU1FT1VUX01TIHx8IGltcG9ydC5tZXRhLmVudi5WSVRFX1BST0NFU1NJTkdfVElNRU9VVF9NUyxcclxuICAgIDMwMDAwMFxyXG4gICksXHJcbiAgZW52aXJvbm1lbnQ6IHJ1bnRpbWVDb25maWcuQVBQX0VOViB8fCAnbG9jYWwnLFxyXG59O1xyXG4iLCAiaW1wb3J0IHsgYXBwQ29uZmlnIH0gZnJvbSAnLi9jb25maWcnO1xyXG5pbXBvcnQgdHlwZSB7XHJcbiAgQXBpR3JhcGhEYXRhLFxuICBBcGlQYXlsb2FkLFxuICBBcGlEb2N1bWVudEdyYXBoRGF0YSxcbiAgRG9jdW1lbnRJbmdlc3RSZXNwb25zZSxcbiAgSW1wYWN0UmVzcG9uc2UsXG4gIEluZ2VzdFJlc3BvbnNlLFxuICBQcm9jZXNzaW5nU3RhdHVzLFxuICBSaXNrUmVzcG9uc2UsXG59IGZyb20gJy4uL3R5cGVzL2FwaSc7XG5cclxuZXhwb3J0IGNsYXNzIEFwaUNsaWVudEVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gIGNvZGU/OiBzdHJpbmc7XHJcbiAgc3RhdHVzPzogbnVtYmVyO1xyXG4gIGRldGFpbHM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxuICByZXRyeWFibGU6IGJvb2xlYW47XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgbWVzc2FnZTogc3RyaW5nLFxyXG4gICAgb3B0aW9uczoge1xyXG4gICAgICBjb2RlPzogc3RyaW5nO1xyXG4gICAgICBzdGF0dXM/OiBudW1iZXI7XHJcbiAgICAgIGRldGFpbHM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxuICAgICAgcmV0cnlhYmxlPzogYm9vbGVhbjtcclxuICAgIH0gPSB7fVxyXG4gICkge1xyXG4gICAgc3VwZXIobWVzc2FnZSk7XHJcbiAgICB0aGlzLm5hbWUgPSAnQXBpQ2xpZW50RXJyb3InO1xyXG4gICAgdGhpcy5jb2RlID0gb3B0aW9ucy5jb2RlO1xyXG4gICAgdGhpcy5zdGF0dXMgPSBvcHRpb25zLnN0YXR1cztcclxuICAgIHRoaXMuZGV0YWlscyA9IG9wdGlvbnMuZGV0YWlscztcclxuICAgIHRoaXMucmV0cnlhYmxlID0gb3B0aW9ucy5yZXRyeWFibGUgPz8gZmFsc2U7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVW5zdXBwb3J0ZWRFbmRwb2ludEVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZykge1xyXG4gICAgc3VwZXIobWVzc2FnZSk7XHJcbiAgICB0aGlzLm5hbWUgPSAnVW5zdXBwb3J0ZWRFbmRwb2ludEVycm9yJztcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHBhcnNlSnNvblNhZmVseShyZXNwb25zZTogUmVzcG9uc2UpIHtcclxuICBjb25zdCB0ZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG4gIGNvbnNvbGUubG9nKCdCQUNLRU5EIFJFU1BPTlNFOicsIHRleHQpO1xyXG5cclxuICBpZiAoIXRleHQpIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuXHJcbiAgdHJ5IHtcclxuICAgIHJldHVybiBKU09OLnBhcnNlKHRleHQpIGFzIEFwaVBheWxvYWQ8dW5rbm93bj47XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1BBUlNFIEVSUk9SOicsIGVycm9yKTtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1JBVyBSRVNQT05TRSBURVhUOicsIHRleHQpO1xyXG4gICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdUaGUgQVBJIHJldHVybmVkIG1hbGZvcm1lZCBKU09OLicsIHtcclxuICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXHJcbiAgICAgIHJldHJ5YWJsZTogZmFsc2UsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHJlcXVlc3Q8VD4ocGF0aDogc3RyaW5nLCBpbml0OiBSZXF1ZXN0SW5pdCA9IHt9LCB0aW1lb3V0TXMgPSAzMDAwMCk6IFByb21pc2U8VD4ge1xyXG4gIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XHJcbiAgY29uc3QgdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgdGltZW91dE1zKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYC9hcGkke3BhdGh9YCwge1xyXG4gICAgICAuLi5pbml0LFxyXG4gICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxyXG4gICAgfSk7XHJcbiAgICBjb25zdCBwYXlsb2FkID0gYXdhaXQgcGFyc2VKc29uU2FmZWx5KHJlc3BvbnNlKTtcclxuXHJcbiAgICBpZiAoIXBheWxvYWQgfHwgdHlwZW9mIHBheWxvYWQgIT09ICdvYmplY3QnKSB7XHJcbiAgICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcignVGhlIEFQSSByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS4nLCB7XHJcbiAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXHJcbiAgICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5vayB8fCBwYXlsb2FkLnN0YXR1cyAhPT0gJ29rJykge1xyXG4gICAgICBjb25zdCBlcnJvclBheWxvYWQgPSBwYXlsb2FkIGFzIEV4Y2x1ZGU8QXBpUGF5bG9hZDxUPiwgeyBzdGF0dXM6ICdvaycgfT47XHJcbiAgICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcihlcnJvclBheWxvYWQuZXJyb3I/Lm1lc3NhZ2UgfHwgJ1RoZSByZXF1ZXN0IGZhaWxlZC4nLCB7XHJcbiAgICAgICAgY29kZTogZXJyb3JQYXlsb2FkLmVycm9yPy5jb2RlLFxyXG4gICAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxyXG4gICAgICAgIGRldGFpbHM6IGVycm9yUGF5bG9hZC5lcnJvcj8uZGV0YWlscyxcclxuICAgICAgICByZXRyeWFibGU6IHJlc3BvbnNlLnN0YXR1cyA+PSA1MDAgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSAwLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcGF5bG9hZC5kYXRhIGFzIFQ7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEFwaUNsaWVudEVycm9yKSB7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnJvci5uYW1lID09PSAnQWJvcnRFcnJvcicpIHtcclxuICAgICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdQcm9jZXNzaW5nIHRpbWVkIG91dCBiZWZvcmUgdGhlIGJhY2tlbmQgY29tcGxldGVkIHRoZSBncmFwaCBidWlsZC4nLCB7XHJcbiAgICAgICAgY29kZTogJ3JlcXVlc3RfdGltZW91dCcsXHJcbiAgICAgICAgcmV0cnlhYmxlOiB0cnVlLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoJ05ldHdvcmsgZmFpbHVyZSB3aGlsZSBjb250YWN0aW5nIHRoZSBUd2luR3JhcGhPcHMgQVBJLicsIHtcclxuICAgICAgY29kZTogJ25ldHdvcmtfZXJyb3InLFxyXG4gICAgICByZXRyeWFibGU6IHRydWUsXHJcbiAgICB9KTtcclxuICB9IGZpbmFsbHkge1xyXG4gICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0KTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWREb2N1bWVudChcbiAgZmlsZTogRmlsZSxcclxuICByZXBsYWNlRXhpc3RpbmcgPSB0cnVlLFxyXG4gIHRpbWVvdXRNcyA9IGFwcENvbmZpZy5wcm9jZXNzaW5nVGltZW91dE1zLFxyXG4gIGluZ2VzdGlvbklkPzogc3RyaW5nXHJcbikge1xyXG4gIGNvbnN0IGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKCk7XHJcbiAgZm9ybURhdGEuYXBwZW5kKCdmaWxlJywgZmlsZSk7XHJcbiAgZm9ybURhdGEuYXBwZW5kKCdyZXBsYWNlX2V4aXN0aW5nJywgU3RyaW5nKHJlcGxhY2VFeGlzdGluZykpO1xyXG4gIGlmIChpbmdlc3Rpb25JZCkge1xyXG4gICAgZm9ybURhdGEuYXBwZW5kKCdpbmdlc3Rpb25faWQnLCBpbmdlc3Rpb25JZCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVxdWVzdDxJbmdlc3RSZXNwb25zZT4oXHJcbiAgICAnL2luZ2VzdCcsXHJcbiAgICB7XHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICBib2R5OiBmb3JtRGF0YSxcclxuICAgIH0sXHJcbiAgICB0aW1lb3V0TXNcclxuICApO1xyXG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWRLbm93bGVkZ2VEb2N1bWVudChcbiAgZmlsZTogRmlsZSxcbiAgcmVwbGFjZUV4aXN0aW5nID0gdHJ1ZSxcbiAgdGltZW91dE1zID0gYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMsXG4gIGluZ2VzdGlvbklkPzogc3RyaW5nXG4pIHtcbiAgY29uc3QgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgZm9ybURhdGEuYXBwZW5kKCdmaWxlJywgZmlsZSk7XG4gIGZvcm1EYXRhLmFwcGVuZCgncmVwbGFjZV9leGlzdGluZycsIFN0cmluZyhyZXBsYWNlRXhpc3RpbmcpKTtcbiAgaWYgKGluZ2VzdGlvbklkKSB7XG4gICAgZm9ybURhdGEuYXBwZW5kKCdpbmdlc3Rpb25faWQnLCBpbmdlc3Rpb25JZCk7XG4gIH1cblxuICByZXR1cm4gcmVxdWVzdDxEb2N1bWVudEluZ2VzdFJlc3BvbnNlPihcbiAgICAnL2RvY3VtZW50L2luZ2VzdCcsXG4gICAge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBib2R5OiBmb3JtRGF0YSxcbiAgICB9LFxuICAgIHRpbWVvdXRNc1xuICApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0R3JhcGgoKSB7XG4gIHJldHVybiByZXF1ZXN0PEFwaUdyYXBoRGF0YT4oJy9ncmFwaCcpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0RG9jdW1lbnRHcmFwaCgpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8QXBpRG9jdW1lbnRHcmFwaERhdGE+KCcvZG9jdW1lbnQvZ3JhcGgnKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFJpc2soY29tcG9uZW50SWQ6IHN0cmluZykge1xyXG4gIHJldHVybiByZXF1ZXN0PFJpc2tSZXNwb25zZT4oYC9yaXNrP2NvbXBvbmVudF9pZD0ke2VuY29kZVVSSUNvbXBvbmVudChjb21wb25lbnRJZCl9YCk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRJbXBhY3QoY29tcG9uZW50SWQ6IHN0cmluZykge1xyXG4gIHJldHVybiByZXF1ZXN0PEltcGFjdFJlc3BvbnNlPihgL2ltcGFjdD9jb21wb25lbnRfaWQ9JHtlbmNvZGVVUklDb21wb25lbnQoY29tcG9uZW50SWQpfWApO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VlZERlbW9HcmFwaCgpIHtcclxuICByZXR1cm4gcmVxdWVzdDx7IHNvdXJjZTogc3RyaW5nOyBub2Rlc19jcmVhdGVkOiBudW1iZXI7IGVkZ2VzX2NyZWF0ZWQ6IG51bWJlcjsgcmlza19ub2Rlc19zY29yZWQ6IG51bWJlciB9PihcclxuICAgICcvc2VlZCcsXHJcbiAgICB7IG1ldGhvZDogJ1BPU1QnIH1cclxuICApO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZDogc3RyaW5nKSB7XG4gIHJldHVybiByZXF1ZXN0PFByb2Nlc3NpbmdTdGF0dXM+KGAvaW5nZXN0LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGluZ2VzdGlvbklkKX0vZXZlbnRzYCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXREb2N1bWVudFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQ6IHN0cmluZykge1xuICByZXR1cm4gcmVxdWVzdDxQcm9jZXNzaW5nU3RhdHVzPihgL2RvY3VtZW50L2luZ2VzdC8ke2VuY29kZVVSSUNvbXBvbmVudChpbmdlc3Rpb25JZCl9L2V2ZW50c2ApO1xufVxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRSaXNrUmFua2VkSXRlbXMoKTogUHJvbWlzZTxuZXZlcj4ge1xyXG4gIC8vIFRPRE86IHJlcGxhY2UgY2xpZW50LXNpZGUgcmlzayByYW5raW5nIHdoZW4gdGhlIGJhY2tlbmQgZXhwb3NlcyBhIGRlZGljYXRlZCByaXNrIGxpc3QgZW5kcG9pbnQuXHJcbiAgdGhyb3cgbmV3IFVuc3VwcG9ydGVkRW5kcG9pbnRFcnJvcignVGhlIGN1cnJlbnQgYmFja2VuZCBjb250cmFjdCBkb2VzIG5vdCBleHBvc2UgYSByYW5rZWQgcmlzayBsaXN0IGVuZHBvaW50LicpO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXJjaGl0ZWN0dXJlU3VtbWFyeSgpOiBQcm9taXNlPG5ldmVyPiB7XHJcbiAgLy8gVE9ETzogcmVwbGFjZSBjbGllbnQtc2lkZSBzdW1tYXJ5IGRlcml2YXRpb24gd2hlbiB0aGUgYmFja2VuZCBleHBvc2VzIGEgZGVkaWNhdGVkIHN1bW1hcnkgZW5kcG9pbnQuXHJcbiAgdGhyb3cgbmV3IFVuc3VwcG9ydGVkRW5kcG9pbnRFcnJvcignVGhlIGN1cnJlbnQgYmFja2VuZCBjb250cmFjdCBkb2VzIG5vdCBleHBvc2UgYW4gYXJjaGl0ZWN0dXJlIHN1bW1hcnkgZW5kcG9pbnQuJyk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUNvbnRleHQsIHVzZUNhbGxiYWNrLCB1c2VDb250ZXh0LCB1c2VNZW1vLCB1c2VSZWYsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xyXG5pbXBvcnQgdHlwZSB7IFJlYWN0Tm9kZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGFkYXB0RG9jdW1lbnRHcmFwaCwgYWRhcHRHcmFwaCB9IGZyb20gJy4uL2xpYi9hZGFwdGVycyc7XG5pbXBvcnQge1xuICBBcGlDbGllbnRFcnJvcixcbiAgZ2V0RG9jdW1lbnRHcmFwaCxcbiAgZ2V0RG9jdW1lbnRQcm9jZXNzaW5nU3RhdHVzLFxuICBnZXRHcmFwaCxcbiAgZ2V0UHJvY2Vzc2luZ1N0YXR1cyxcbiAgdXBsb2FkRG9jdW1lbnQsXG4gIHVwbG9hZEtub3dsZWRnZURvY3VtZW50LFxufSBmcm9tICcuLi9saWIvYXBpJztcbmltcG9ydCB7IGFwcENvbmZpZyB9IGZyb20gJy4uL2xpYi9jb25maWcnO1xuaW1wb3J0IHR5cGUgeyBEb2N1bWVudEdyYXBoU3RhdGUsIERvY3VtZW50VXBsb2FkU3RhdGUsIEdyYXBoU3RhdGUsIFVwbG9hZFN0YXRlIH0gZnJvbSAnLi4vdHlwZXMvYXBwJztcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHRWYWx1ZSB7XHJcbiAgdXBsb2FkOiBVcGxvYWRTdGF0ZTtcbiAgZ3JhcGg6IEdyYXBoU3RhdGU7XG4gIGRvY3VtZW50VXBsb2FkOiBEb2N1bWVudFVwbG9hZFN0YXRlO1xuICBkb2N1bWVudEdyYXBoOiBEb2N1bWVudEdyYXBoU3RhdGU7XG4gIHNldERyYWdBY3RpdmU6IChhY3RpdmU6IGJvb2xlYW4pID0+IHZvaWQ7XG4gIHNlbGVjdEZpbGU6IChmaWxlOiBGaWxlIHwgbnVsbCkgPT4gYm9vbGVhbjtcbiAgY2xlYXJTZWxlY3RlZEZpbGU6ICgpID0+IHZvaWQ7XG4gIGJlZ2luUHJvY2Vzc2luZzogKCkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgbG9hZEdyYXBoOiAob3B0aW9ucz86IHsga2VlcFN0YXR1cz86IGJvb2xlYW4gfSkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgc2V0RG9jdW1lbnREcmFnQWN0aXZlOiAoYWN0aXZlOiBib29sZWFuKSA9PiB2b2lkO1xuICBzZWxlY3REb2N1bWVudEZpbGU6IChmaWxlOiBGaWxlIHwgbnVsbCkgPT4gYm9vbGVhbjtcbiAgY2xlYXJTZWxlY3RlZERvY3VtZW50RmlsZTogKCkgPT4gdm9pZDtcbiAgYmVnaW5Eb2N1bWVudFByb2Nlc3Npbmc6ICgpID0+IFByb21pc2U8dm9pZD47XG4gIGxvYWREb2N1bWVudEdyYXBoOiAob3B0aW9ucz86IHsga2VlcFN0YXR1cz86IGJvb2xlYW4gfSkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgcmVzZXRVcGxvYWRTdGF0ZTogKCkgPT4gdm9pZDtcbn1cblxyXG5leHBvcnQgY29uc3QgQXBwQ29udGV4dCA9IGNyZWF0ZUNvbnRleHQ8QXBwQ29udGV4dFZhbHVlIHwgbnVsbD4obnVsbCk7XHJcblxyXG5leHBvcnQgY29uc3QgaW5pdGlhbFVwbG9hZFN0YXRlOiBVcGxvYWRTdGF0ZSA9IHtcclxuICBwaGFzZTogJ2lkbGUnLFxyXG4gIHNlbGVjdGVkRmlsZTogbnVsbCxcclxuICBlcnJvcjogbnVsbCxcclxuICBzdGF0dXNNZXNzYWdlOiAnVXBsb2FkIGEgLm1kIG9yIC50eHQgZmlsZSB0byBidWlsZCB0aGUgZ3JhcGguJyxcclxuICBpbmdlc3Rpb25JZDogbnVsbCxcclxuICBpbmdlc3Rpb246IG51bGwsXHJcbiAgcHJvY2Vzc2luZ1N0YXR1czogbnVsbCxcclxuICBzdGFydGVkQXQ6IG51bGwsXHJcbiAgY29tcGxldGVkQXQ6IG51bGwsXHJcbiAgcmV0cnlDb3VudDogMCxcclxufTtcclxuXHJcbmNvbnN0IGluaXRpYWxHcmFwaFN0YXRlOiBHcmFwaFN0YXRlID0ge1xuICBzdGF0dXM6ICdpZGxlJyxcclxuICBkYXRhOiBudWxsLFxyXG4gIGVycm9yOiBudWxsLFxyXG4gIGxhc3RMb2FkZWRBdDogbnVsbCxcclxufTtcblxuZXhwb3J0IGNvbnN0IGluaXRpYWxEb2N1bWVudFVwbG9hZFN0YXRlOiBEb2N1bWVudFVwbG9hZFN0YXRlID0ge1xuICBwaGFzZTogJ2lkbGUnLFxuICBzZWxlY3RlZEZpbGU6IG51bGwsXG4gIGVycm9yOiBudWxsLFxuICBzdGF0dXNNZXNzYWdlOiAnVXBsb2FkIGEgLnBkZiwgLm1kLCBvciAudHh0IGZpbGUgdG8gYnVpbGQgYSBkb2N1bWVudCBncmFwaC4nLFxuICBpbmdlc3Rpb25JZDogbnVsbCxcbiAgaW5nZXN0aW9uOiBudWxsLFxuICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxuICBzdGFydGVkQXQ6IG51bGwsXG4gIGNvbXBsZXRlZEF0OiBudWxsLFxuICByZXRyeUNvdW50OiAwLFxufTtcblxuY29uc3QgaW5pdGlhbERvY3VtZW50R3JhcGhTdGF0ZTogRG9jdW1lbnRHcmFwaFN0YXRlID0ge1xuICBzdGF0dXM6ICdpZGxlJyxcbiAgZGF0YTogbnVsbCxcbiAgZXJyb3I6IG51bGwsXG4gIGxhc3RMb2FkZWRBdDogbnVsbCxcbn07XG5cbmV4cG9ydCBjb25zdCBzdXBwb3J0ZWRFeHRlbnNpb25zID0gWycubWQnLCAnLnR4dCddO1xuZXhwb3J0IGNvbnN0IHN1cHBvcnRlZERvY3VtZW50RXh0ZW5zaW9ucyA9IFsnLnBkZicsICcubWQnLCAnLnR4dCddO1xuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlRXh0ZW5zaW9uKGZpbGVuYW1lOiBzdHJpbmcpIHtcclxuICBjb25zdCBzZWdtZW50cyA9IGZpbGVuYW1lLnRvTG93ZXJDYXNlKCkuc3BsaXQoJy4nKTtcclxuICByZXR1cm4gc2VnbWVudHMubGVuZ3RoID4gMSA/IGAuJHtzZWdtZW50cy5wb3AoKX1gIDogJyc7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZWxlY3RlZEZpbGVVcGxvYWRTdGF0ZShmaWxlOiBGaWxlKTogVXBsb2FkU3RhdGUge1xyXG4gIHJldHVybiB7XHJcbiAgICBwaGFzZTogJ2ZpbGUtc2VsZWN0ZWQnLFxyXG4gICAgc2VsZWN0ZWRGaWxlOiBmaWxlLFxyXG4gICAgZXJyb3I6IG51bGwsXHJcbiAgICBzdGF0dXNNZXNzYWdlOiBgUmVhZHkgdG8gYW5hbHl6ZSAke2ZpbGUubmFtZX0uYCxcclxuICAgIGluZ2VzdGlvbklkOiBudWxsLFxyXG4gICAgaW5nZXN0aW9uOiBudWxsLFxyXG4gICAgcHJvY2Vzc2luZ1N0YXR1czogbnVsbCxcclxuICAgIHN0YXJ0ZWRBdDogbnVsbCxcclxuICAgIGNvbXBsZXRlZEF0OiBudWxsLFxyXG4gICAgcmV0cnlDb3VudDogMCxcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVXBsb2FkRXJyb3JTdGF0ZShlcnJvcjogc3RyaW5nLCBzdGF0dXNNZXNzYWdlOiBzdHJpbmcpOiBVcGxvYWRTdGF0ZSB7XG4gIHJldHVybiB7XHJcbiAgICAuLi5pbml0aWFsVXBsb2FkU3RhdGUsXHJcbiAgICBwaGFzZTogJ2Vycm9yJyxcclxuICAgIGVycm9yLFxyXG4gICAgc3RhdHVzTWVzc2FnZSxcclxuICB9O1xyXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZWxlY3RlZERvY3VtZW50RmlsZVVwbG9hZFN0YXRlKGZpbGU6IEZpbGUpOiBEb2N1bWVudFVwbG9hZFN0YXRlIHtcbiAgcmV0dXJuIHtcbiAgICBwaGFzZTogJ2ZpbGUtc2VsZWN0ZWQnLFxuICAgIHNlbGVjdGVkRmlsZTogZmlsZSxcbiAgICBlcnJvcjogbnVsbCxcbiAgICBzdGF0dXNNZXNzYWdlOiBgUmVhZHkgdG8gbWFwICR7ZmlsZS5uYW1lfS5gLFxuICAgIGluZ2VzdGlvbklkOiBudWxsLFxuICAgIGluZ2VzdGlvbjogbnVsbCxcbiAgICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxuICAgIHN0YXJ0ZWRBdDogbnVsbCxcbiAgICBjb21wbGV0ZWRBdDogbnVsbCxcbiAgICByZXRyeUNvdW50OiAwLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnRVcGxvYWRFcnJvclN0YXRlKGVycm9yOiBzdHJpbmcsIHN0YXR1c01lc3NhZ2U6IHN0cmluZyk6IERvY3VtZW50VXBsb2FkU3RhdGUge1xuICByZXR1cm4ge1xuICAgIC4uLmluaXRpYWxEb2N1bWVudFVwbG9hZFN0YXRlLFxuICAgIHBoYXNlOiAnZXJyb3InLFxuICAgIGVycm9yLFxuICAgIHN0YXR1c01lc3NhZ2UsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVNlbGVjdGVkRmlsZShmaWxlOiBGaWxlIHwgbnVsbCwgbWF4VXBsb2FkQnl0ZXM6IG51bWJlcik6IFVwbG9hZFN0YXRlIHtcbiAgaWYgKCFmaWxlKSB7XHJcbiAgICByZXR1cm4gaW5pdGlhbFVwbG9hZFN0YXRlO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgZXh0ZW5zaW9uID0gZ2V0RmlsZUV4dGVuc2lvbihmaWxlLm5hbWUpO1xyXG4gIGlmICghc3VwcG9ydGVkRXh0ZW5zaW9ucy5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICByZXR1cm4gY3JlYXRlVXBsb2FkRXJyb3JTdGF0ZSgnT25seSAubWQgYW5kIC50eHQgZmlsZXMgYXJlIHN1cHBvcnRlZC4nLCAnVW5zdXBwb3J0ZWQgZmlsZSB0eXBlLicpO1xyXG4gIH1cclxuXHJcbiAgaWYgKGZpbGUuc2l6ZSA+IG1heFVwbG9hZEJ5dGVzKSB7XHJcbiAgICByZXR1cm4gY3JlYXRlVXBsb2FkRXJyb3JTdGF0ZShcclxuICAgICAgYEZpbGUgZXhjZWVkcyB0aGUgJHtNYXRoLnJvdW5kKG1heFVwbG9hZEJ5dGVzIC8gMTAyNCAvIDEwMjQpfSBNQiB1cGxvYWQgbGltaXQuYCxcclxuICAgICAgJ1NlbGVjdGVkIGZpbGUgaXMgdG9vIGxhcmdlLidcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gY3JlYXRlU2VsZWN0ZWRGaWxlVXBsb2FkU3RhdGUoZmlsZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVNlbGVjdGVkRG9jdW1lbnRGaWxlKGZpbGU6IEZpbGUgfCBudWxsLCBtYXhVcGxvYWRCeXRlczogbnVtYmVyKTogRG9jdW1lbnRVcGxvYWRTdGF0ZSB7XG4gIGlmICghZmlsZSkge1xuICAgIHJldHVybiBpbml0aWFsRG9jdW1lbnRVcGxvYWRTdGF0ZTtcbiAgfVxuXG4gIGNvbnN0IGV4dGVuc2lvbiA9IGdldEZpbGVFeHRlbnNpb24oZmlsZS5uYW1lKTtcbiAgaWYgKCFzdXBwb3J0ZWREb2N1bWVudEV4dGVuc2lvbnMuaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xuICAgIHJldHVybiBjcmVhdGVEb2N1bWVudFVwbG9hZEVycm9yU3RhdGUoJ09ubHkgLnBkZiwgLm1kLCBhbmQgLnR4dCBmaWxlcyBhcmUgc3VwcG9ydGVkLicsICdVbnN1cHBvcnRlZCBmaWxlIHR5cGUuJyk7XG4gIH1cblxuICBpZiAoZmlsZS5zaXplID4gbWF4VXBsb2FkQnl0ZXMpIHtcbiAgICByZXR1cm4gY3JlYXRlRG9jdW1lbnRVcGxvYWRFcnJvclN0YXRlKFxuICAgICAgYEZpbGUgZXhjZWVkcyB0aGUgJHtNYXRoLnJvdW5kKG1heFVwbG9hZEJ5dGVzIC8gMTAyNCAvIDEwMjQpfSBNQiB1cGxvYWQgbGltaXQuYCxcbiAgICAgICdTZWxlY3RlZCBmaWxlIGlzIHRvbyBsYXJnZS4nXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVTZWxlY3RlZERvY3VtZW50RmlsZVVwbG9hZFN0YXRlKGZpbGUpO1xufVxuXG5mdW5jdGlvbiB0b0ZyaWVuZGx5TWVzc2FnZShlcnJvcjogdW5rbm93bikge1xyXG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEFwaUNsaWVudEVycm9yKSB7XHJcbiAgICByZXR1cm4gZXJyb3IubWVzc2FnZTtcclxuICB9XHJcblxyXG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICByZXR1cm4gZXJyb3IubWVzc2FnZTtcclxuICB9XHJcblxyXG4gIHJldHVybiAnQW4gdW5leHBlY3RlZCBmcm9udGVuZCBlcnJvciBvY2N1cnJlZC4nO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gQXBwUHJvdmlkZXIoeyBjaGlsZHJlbiB9OiB7IGNoaWxkcmVuOiBSZWFjdE5vZGUgfSkge1xuICBjb25zdCBbdXBsb2FkLCBzZXRVcGxvYWRdID0gdXNlU3RhdGU8VXBsb2FkU3RhdGU+KGluaXRpYWxVcGxvYWRTdGF0ZSk7XG4gIGNvbnN0IFtncmFwaCwgc2V0R3JhcGhdID0gdXNlU3RhdGU8R3JhcGhTdGF0ZT4oaW5pdGlhbEdyYXBoU3RhdGUpO1xuICBjb25zdCBbZG9jdW1lbnRVcGxvYWQsIHNldERvY3VtZW50VXBsb2FkXSA9IHVzZVN0YXRlPERvY3VtZW50VXBsb2FkU3RhdGU+KGluaXRpYWxEb2N1bWVudFVwbG9hZFN0YXRlKTtcbiAgY29uc3QgW2RvY3VtZW50R3JhcGgsIHNldERvY3VtZW50R3JhcGhdID0gdXNlU3RhdGU8RG9jdW1lbnRHcmFwaFN0YXRlPihpbml0aWFsRG9jdW1lbnRHcmFwaFN0YXRlKTtcbiAgY29uc3QgcHJvY2Vzc2luZ1Byb21pc2VSZWYgPSB1c2VSZWY8UHJvbWlzZTx2b2lkPiB8IG51bGw+KG51bGwpO1xuICBjb25zdCBkb2N1bWVudFByb2Nlc3NpbmdQcm9taXNlUmVmID0gdXNlUmVmPFByb21pc2U8dm9pZD4gfCBudWxsPihudWxsKTtcblxyXG4gIGNvbnN0IHNldERyYWdBY3RpdmUgPSB1c2VDYWxsYmFjaygoYWN0aXZlOiBib29sZWFuKSA9PiB7XHJcbiAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+IHtcclxuICAgICAgaWYgKGFjdGl2ZSkge1xyXG4gICAgICAgIHJldHVybiB7IC4uLmN1cnJlbnQsIHBoYXNlOiAnZHJhZy1ob3ZlcicsIHN0YXR1c01lc3NhZ2U6ICdEcm9wIHRoZSBmaWxlIHRvIHF1ZXVlIGl0IGZvciBpbmdlc3Rpb24uJyB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoY3VycmVudC5zZWxlY3RlZEZpbGUpIHtcclxuICAgICAgICByZXR1cm4geyAuLi5jdXJyZW50LCBwaGFzZTogJ2ZpbGUtc2VsZWN0ZWQnLCBzdGF0dXNNZXNzYWdlOiBgUmVhZHkgdG8gYW5hbHl6ZSAke2N1cnJlbnQuc2VsZWN0ZWRGaWxlLm5hbWV9LmAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdpZGxlJywgc3RhdHVzTWVzc2FnZTogaW5pdGlhbFVwbG9hZFN0YXRlLnN0YXR1c01lc3NhZ2UgfTtcclxuICAgIH0pO1xyXG4gIH0sIFtdKTtcclxuXHJcbiAgY29uc3Qgc2VsZWN0RmlsZSA9IHVzZUNhbGxiYWNrKChmaWxlOiBGaWxlIHwgbnVsbCkgPT4ge1xyXG4gICAgY29uc3QgbmV4dFN0YXRlID0gdmFsaWRhdGVTZWxlY3RlZEZpbGUoZmlsZSwgYXBwQ29uZmlnLm1heFVwbG9hZEJ5dGVzKTtcclxuICAgIHNldFVwbG9hZChuZXh0U3RhdGUpO1xyXG4gICAgcmV0dXJuIG5leHRTdGF0ZS5waGFzZSA9PT0gJ2ZpbGUtc2VsZWN0ZWQnO1xyXG4gIH0sIFtdKTtcclxuXHJcbiAgY29uc3QgY2xlYXJTZWxlY3RlZEZpbGUgPSB1c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgc2V0VXBsb2FkKGluaXRpYWxVcGxvYWRTdGF0ZSk7XG4gIH0sIFtdKTtcblxuICBjb25zdCBzZXREb2N1bWVudERyYWdBY3RpdmUgPSB1c2VDYWxsYmFjaygoYWN0aXZlOiBib29sZWFuKSA9PiB7XG4gICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+IHtcbiAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdkcmFnLWhvdmVyJywgc3RhdHVzTWVzc2FnZTogJ0Ryb3AgdGhlIGRvY3VtZW50IHRvIHF1ZXVlIGl0IGZvciBncmFwaCBleHRyYWN0aW9uLicgfTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnQuc2VsZWN0ZWRGaWxlKSB7XG4gICAgICAgIHJldHVybiB7IC4uLmN1cnJlbnQsIHBoYXNlOiAnZmlsZS1zZWxlY3RlZCcsIHN0YXR1c01lc3NhZ2U6IGBSZWFkeSB0byBtYXAgJHtjdXJyZW50LnNlbGVjdGVkRmlsZS5uYW1lfS5gIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IC4uLmN1cnJlbnQsIHBoYXNlOiAnaWRsZScsIHN0YXR1c01lc3NhZ2U6IGluaXRpYWxEb2N1bWVudFVwbG9hZFN0YXRlLnN0YXR1c01lc3NhZ2UgfTtcbiAgICB9KTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHNlbGVjdERvY3VtZW50RmlsZSA9IHVzZUNhbGxiYWNrKChmaWxlOiBGaWxlIHwgbnVsbCkgPT4ge1xuICAgIGNvbnN0IG5leHRTdGF0ZSA9IHZhbGlkYXRlU2VsZWN0ZWREb2N1bWVudEZpbGUoZmlsZSwgYXBwQ29uZmlnLm1heFVwbG9hZEJ5dGVzKTtcbiAgICBzZXREb2N1bWVudFVwbG9hZChuZXh0U3RhdGUpO1xuICAgIHJldHVybiBuZXh0U3RhdGUucGhhc2UgPT09ICdmaWxlLXNlbGVjdGVkJztcbiAgfSwgW10pO1xuXG4gIGNvbnN0IGNsZWFyU2VsZWN0ZWREb2N1bWVudEZpbGUgPSB1c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgc2V0RG9jdW1lbnRVcGxvYWQoaW5pdGlhbERvY3VtZW50VXBsb2FkU3RhdGUpO1xuICB9LCBbXSk7XG5cclxuICBjb25zdCBsb2FkR3JhcGggPSB1c2VDYWxsYmFjayhhc3luYyAob3B0aW9ucz86IHsga2VlcFN0YXR1cz86IGJvb2xlYW4gfSkgPT4ge1xuICAgIHNldEdyYXBoKChjdXJyZW50KSA9PiAoe1xyXG4gICAgICAuLi5jdXJyZW50LFxyXG4gICAgICBzdGF0dXM6ICdsb2FkaW5nJyxcclxuICAgICAgZXJyb3I6IG51bGwsXHJcbiAgICB9KSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IGdldEdyYXBoKCk7XHJcbiAgICAgIGNvbnN0IGFkYXB0ZWRHcmFwaCA9IGFkYXB0R3JhcGgocGF5bG9hZCk7XHJcbiAgICAgIHNldEdyYXBoKHtcclxuICAgICAgICBzdGF0dXM6ICdyZWFkeScsXHJcbiAgICAgICAgZGF0YTogYWRhcHRlZEdyYXBoLFxyXG4gICAgICAgIGVycm9yOiBudWxsLFxyXG4gICAgICAgIGxhc3RMb2FkZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAoIW9wdGlvbnM/LmtlZXBTdGF0dXMpIHtcclxuICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+IHtcclxuICAgICAgICAgIGlmIChjdXJyZW50LnBoYXNlID09PSAnc3VjY2VzcycgfHwgY3VycmVudC5waGFzZSA9PT0gJ2VtcHR5LWdyYXBoJykge1xyXG4gICAgICAgICAgICByZXR1cm4gY3VycmVudDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgICAgICBwaGFzZTogYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMCA/ICdlbXB0eS1ncmFwaCcgOiBjdXJyZW50LnBoYXNlLFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgbWVzc2FnZSA9IHRvRnJpZW5kbHlNZXNzYWdlKGVycm9yKTtcclxuICAgICAgc2V0R3JhcGgoe1xyXG4gICAgICAgIHN0YXR1czogJ2Vycm9yJyxcclxuICAgICAgICBkYXRhOiBudWxsLFxyXG4gICAgICAgIGVycm9yOiBtZXNzYWdlLFxyXG4gICAgICAgIGxhc3RMb2FkZWRBdDogbnVsbCxcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH0sIFtdKTtcblxuICBjb25zdCBsb2FkRG9jdW1lbnRHcmFwaCA9IHVzZUNhbGxiYWNrKGFzeW5jIChvcHRpb25zPzogeyBrZWVwU3RhdHVzPzogYm9vbGVhbiB9KSA9PiB7XG4gICAgc2V0RG9jdW1lbnRHcmFwaCgoY3VycmVudCkgPT4gKHtcbiAgICAgIC4uLmN1cnJlbnQsXG4gICAgICBzdGF0dXM6ICdsb2FkaW5nJyxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgIH0pKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYXlsb2FkID0gYXdhaXQgZ2V0RG9jdW1lbnRHcmFwaCgpO1xuICAgICAgY29uc3QgYWRhcHRlZEdyYXBoID0gYWRhcHREb2N1bWVudEdyYXBoKHBheWxvYWQpO1xuICAgICAgc2V0RG9jdW1lbnRHcmFwaCh7XG4gICAgICAgIHN0YXR1czogJ3JlYWR5JyxcbiAgICAgICAgZGF0YTogYWRhcHRlZEdyYXBoLFxuICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgbGFzdExvYWRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgfSk7XG5cbiAgICAgIGlmICghb3B0aW9ucz8ua2VlcFN0YXR1cykge1xuICAgICAgICBzZXREb2N1bWVudFVwbG9hZCgoY3VycmVudCkgPT4ge1xuICAgICAgICAgIGlmIChjdXJyZW50LnBoYXNlID09PSAnc3VjY2VzcycgfHwgY3VycmVudC5waGFzZSA9PT0gJ2VtcHR5LWdyYXBoJykge1xuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgICBwaGFzZTogYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMCA/ICdlbXB0eS1ncmFwaCcgOiBjdXJyZW50LnBoYXNlLFxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gdG9GcmllbmRseU1lc3NhZ2UoZXJyb3IpO1xuICAgICAgc2V0RG9jdW1lbnRHcmFwaCh7XG4gICAgICAgIHN0YXR1czogJ2Vycm9yJyxcbiAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgZXJyb3I6IG1lc3NhZ2UsXG4gICAgICAgIGxhc3RMb2FkZWRBdDogbnVsbCxcbiAgICAgIH0pO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9LCBbXSk7XG5cclxuICBjb25zdCBiZWdpblByb2Nlc3NpbmcgPSB1c2VDYWxsYmFjayhhc3luYyAoKSA9PiB7XG4gICAgaWYgKCF1cGxvYWQuc2VsZWN0ZWRGaWxlKSB7XHJcbiAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4gKHtcclxuICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgIHBoYXNlOiAnZXJyb3InLFxyXG4gICAgICAgIGVycm9yOiAnQ2hvb3NlIGEgLm1kIG9yIC50eHQgZmlsZSBiZWZvcmUgcHJvY2Vzc2luZy4nLFxyXG4gICAgICAgIHN0YXR1c01lc3NhZ2U6ICdObyBmaWxlIHNlbGVjdGVkLicsXHJcbiAgICAgIH0pKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChwcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50KSB7XHJcbiAgICAgIHJldHVybiBwcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHNlbGVjdGVkRmlsZSA9IHVwbG9hZC5zZWxlY3RlZEZpbGU7XHJcblxyXG4gICAgY29uc3QgdGFzayA9IChhc3luYyAoKSA9PiB7XHJcbiAgICAgIGxldCBwcm9jZXNzaW5nUGhhc2VUaW1lciA9IDA7XHJcbiAgICAgIGNvbnN0IGluZ2VzdGlvbklkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcclxuICAgICAgbGV0IGtlZXBQb2xsaW5nID0gdHJ1ZTtcclxuXHJcbiAgICAgIGNvbnN0IHBvbGxQcm9jZXNzaW5nID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIHdoaWxlIChrZWVwUG9sbGluZykge1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc2luZ1N0YXR1cyA9IGF3YWl0IGdldFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQpO1xyXG4gICAgICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+XHJcbiAgICAgICAgICAgICAgY3VycmVudC5pbmdlc3Rpb25JZCAhPT0gaW5nZXN0aW9uSWRcclxuICAgICAgICAgICAgICAgID8gY3VycmVudFxyXG4gICAgICAgICAgICAgICAgOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uY3VycmVudCxcclxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c01lc3NhZ2U6IHByb2Nlc3NpbmdTdGF0dXMubGF0ZXN0X2V2ZW50IHx8IGN1cnJlbnQuc3RhdHVzTWVzc2FnZSxcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIC8vIFBvbGxpbmcgaXMgYmVzdC1lZmZvcnQgc28gdGhlIG1haW4gdXBsb2FkIGZsb3cgY2FuIGNvbnRpbnVlIGV2ZW4gaWYgc3RhdHVzIHJlZnJlc2ggZmFpbHMuXHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKCFrZWVwUG9sbGluZykge1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gd2luZG93LnNldFRpbWVvdXQocmVzb2x2ZSwgODAwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XHJcbiAgICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgICAgcGhhc2U6ICd1cGxvYWRpbmcnLFxyXG4gICAgICAgICAgZXJyb3I6IG51bGwsXHJcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBgVXBsb2FkaW5nICR7c2VsZWN0ZWRGaWxlLm5hbWV9Li4uYCxcclxuICAgICAgICAgIGluZ2VzdGlvbklkLFxyXG4gICAgICAgICAgc3RhcnRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgY29tcGxldGVkQXQ6IG51bGwsXHJcbiAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzOiB7XHJcbiAgICAgICAgICAgIGluZ2VzdGlvbl9pZDogaW5nZXN0aW9uSWQsXHJcbiAgICAgICAgICAgIHN0YXRlOiAncGVuZGluZycsXHJcbiAgICAgICAgICAgIGZpbGVuYW1lOiBzZWxlY3RlZEZpbGUubmFtZSxcclxuICAgICAgICAgICAgY2h1bmtzX3RvdGFsOiBudWxsLFxyXG4gICAgICAgICAgICBjdXJyZW50X2NodW5rOiBudWxsLFxyXG4gICAgICAgICAgICBzdGFydGVkX2F0OiBudWxsLFxyXG4gICAgICAgICAgICBjb21wbGV0ZWRfYXQ6IG51bGwsXHJcbiAgICAgICAgICAgIGxhdGVzdF9ldmVudDogYFVwbG9hZGluZyAke3NlbGVjdGVkRmlsZS5uYW1lfS4uLmAsXHJcbiAgICAgICAgICAgIGV2ZW50czogW10sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgY29uc3QgcG9sbGluZ1Rhc2sgPSBwb2xsUHJvY2Vzc2luZygpO1xyXG5cclxuICAgICAgICBwcm9jZXNzaW5nUGhhc2VUaW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT5cclxuICAgICAgICAgICAgY3VycmVudC5waGFzZSA9PT0gJ3VwbG9hZGluZydcclxuICAgICAgICAgICAgICA/IHtcclxuICAgICAgICAgICAgICAgICAgLi4uY3VycmVudCxcclxuICAgICAgICAgICAgICAgICAgcGhhc2U6ICdwcm9jZXNzaW5nJyxcclxuICAgICAgICAgICAgICAgICAgc3RhdHVzTWVzc2FnZTogJ0V4dHJhY3RpbmcgY29tcG9uZW50cywgcmVsYXRpb25zaGlwcywgYW5kIHJpc2sgbWV0cmljcy4uLicsXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgOiBjdXJyZW50XHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH0sIDkwMCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGluZ2VzdGlvbiA9IGF3YWl0IHVwbG9hZERvY3VtZW50KHNlbGVjdGVkRmlsZSwgdHJ1ZSwgYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMsIGluZ2VzdGlvbklkKTtcclxuICAgICAgICBjb25zdCBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzID0gYXdhaXQgZ2V0UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZCkuY2F0Y2goKCkgPT4gbnVsbCk7XHJcblxyXG4gICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4gKHtcclxuICAgICAgICAgIC4uLmN1cnJlbnQsXHJcbiAgICAgICAgICBpbmdlc3Rpb24sXHJcbiAgICAgICAgICBwaGFzZTogJ3Byb2Nlc3NpbmcnLFxyXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTogbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cz8ubGF0ZXN0X2V2ZW50IHx8ICdMb2FkaW5nIHRoZSBnZW5lcmF0ZWQgZ3JhcGggd29ya3NwYWNlLi4uJyxcclxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgfHwgY3VycmVudC5wcm9jZXNzaW5nU3RhdHVzLFxyXG4gICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgY29uc3QgZ3JhcGhQYXlsb2FkID0gYXdhaXQgZ2V0R3JhcGgoKTtcclxuICAgICAgICBjb25zdCBhZGFwdGVkR3JhcGggPSBhZGFwdEdyYXBoKGdyYXBoUGF5bG9hZCk7XHJcblxyXG4gICAgICAgIHNldEdyYXBoKHtcclxuICAgICAgICAgIHN0YXR1czogJ3JlYWR5JyxcclxuICAgICAgICAgIGRhdGE6IGFkYXB0ZWRHcmFwaCxcclxuICAgICAgICAgIGVycm9yOiBudWxsLFxyXG4gICAgICAgICAgbGFzdExvYWRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XHJcbiAgICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgICAgaW5nZXN0aW9uLFxyXG4gICAgICAgICAgaW5nZXN0aW9uSWQsXHJcbiAgICAgICAgICBwaGFzZTogYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMCA/ICdlbXB0eS1ncmFwaCcgOiAnc3VjY2VzcycsXHJcbiAgICAgICAgICBlcnJvcjogbnVsbCxcclxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6XHJcbiAgICAgICAgICAgIGxhdGVzdFByb2Nlc3NpbmdTdGF0dXM/LmxhdGVzdF9ldmVudCB8fFxyXG4gICAgICAgICAgICAoYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMFxyXG4gICAgICAgICAgICAgID8gJ1Byb2Nlc3NpbmcgY29tcGxldGVkLCBidXQgdGhlIGFjdGl2ZSBncmFwaCBpcyBlbXB0eS4nXHJcbiAgICAgICAgICAgICAgOiAnVHdpbkdyYXBoT3BzIGZpbmlzaGVkIHByb2Nlc3NpbmcgeW91ciBkb2N1bWVudC4nKSxcclxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6XHJcbiAgICAgICAgICAgIGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgPz9cclxuICAgICAgICAgICAgY3VycmVudC5wcm9jZXNzaW5nU3RhdHVzLFxyXG4gICAgICAgICAgY29tcGxldGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICAgIGtlZXBQb2xsaW5nID0gZmFsc2U7XHJcbiAgICAgICAgYXdhaXQgcG9sbGluZ1Rhc2s7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAga2VlcFBvbGxpbmcgPSBmYWxzZTtcclxuICAgICAgICBjb25zdCBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzID0gYXdhaXQgZ2V0UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZCkuY2F0Y2goKCkgPT4gbnVsbCk7XHJcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRvRnJpZW5kbHlNZXNzYWdlKGVycm9yKTtcclxuICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XHJcbiAgICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgICAgcGhhc2U6ICdyZXRyeScsXHJcbiAgICAgICAgICBlcnJvcjogbWVzc2FnZSxcclxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6IG1lc3NhZ2UsXHJcbiAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzOiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzIHx8IGN1cnJlbnQucHJvY2Vzc2luZ1N0YXR1cyxcclxuICAgICAgICAgIGNvbXBsZXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgcmV0cnlDb3VudDogY3VycmVudC5yZXRyeUNvdW50ICsgMSxcclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAga2VlcFBvbGxpbmcgPSBmYWxzZTtcclxuICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHByb2Nlc3NpbmdQaGFzZVRpbWVyKTtcclxuICAgICAgICBwcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50ID0gbnVsbDtcclxuICAgICAgfVxyXG4gICAgfSkoKTtcclxuXHJcbiAgICBwcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50ID0gdGFzaztcclxuICAgIHJldHVybiB0YXNrO1xyXG4gIH0sIFt1cGxvYWQuc2VsZWN0ZWRGaWxlXSk7XG5cbiAgY29uc3QgYmVnaW5Eb2N1bWVudFByb2Nlc3NpbmcgPSB1c2VDYWxsYmFjayhhc3luYyAoKSA9PiB7XG4gICAgaWYgKCFkb2N1bWVudFVwbG9hZC5zZWxlY3RlZEZpbGUpIHtcbiAgICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICBwaGFzZTogJ2Vycm9yJyxcbiAgICAgICAgZXJyb3I6ICdDaG9vc2UgYSAucGRmLCAubWQsIG9yIC50eHQgZmlsZSBiZWZvcmUgcHJvY2Vzc2luZy4nLFxuICAgICAgICBzdGF0dXNNZXNzYWdlOiAnTm8gZG9jdW1lbnQgc2VsZWN0ZWQuJyxcbiAgICAgIH0pKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZG9jdW1lbnRQcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50KSB7XG4gICAgICByZXR1cm4gZG9jdW1lbnRQcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50O1xuICAgIH1cblxuICAgIGNvbnN0IHNlbGVjdGVkRmlsZSA9IGRvY3VtZW50VXBsb2FkLnNlbGVjdGVkRmlsZTtcblxuICAgIGNvbnN0IHRhc2sgPSAoYXN5bmMgKCkgPT4ge1xuICAgICAgbGV0IHByb2Nlc3NpbmdQaGFzZVRpbWVyID0gMDtcbiAgICAgIGNvbnN0IGluZ2VzdGlvbklkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICAgIGxldCBrZWVwUG9sbGluZyA9IHRydWU7XG5cbiAgICAgIGNvbnN0IHBvbGxQcm9jZXNzaW5nID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICB3aGlsZSAoa2VlcFBvbGxpbmcpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc2luZ1N0YXR1cyA9IGF3YWl0IGdldERvY3VtZW50UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZCk7XG4gICAgICAgICAgICBzZXREb2N1bWVudFVwbG9hZCgoY3VycmVudCkgPT5cbiAgICAgICAgICAgICAgY3VycmVudC5pbmdlc3Rpb25JZCAhPT0gaW5nZXN0aW9uSWRcbiAgICAgICAgICAgICAgICA/IGN1cnJlbnRcbiAgICAgICAgICAgICAgICA6IHtcbiAgICAgICAgICAgICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1cyxcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzTWVzc2FnZTogcHJvY2Vzc2luZ1N0YXR1cy5sYXRlc3RfZXZlbnQgfHwgY3VycmVudC5zdGF0dXNNZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIFBvbGxpbmcgaXMgYmVzdC1lZmZvcnQgc28gdGhlIG1haW4gdXBsb2FkIGZsb3cgY2FuIGNvbnRpbnVlLlxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICgha2VlcFBvbGxpbmcpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB3aW5kb3cuc2V0VGltZW91dChyZXNvbHZlLCA4MDApKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBwaGFzZTogJ3VwbG9hZGluZycsXG4gICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTogYFVwbG9hZGluZyAke3NlbGVjdGVkRmlsZS5uYW1lfS4uLmAsXG4gICAgICAgICAgaW5nZXN0aW9uSWQsXG4gICAgICAgICAgc3RhcnRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICAgIGNvbXBsZXRlZEF0OiBudWxsLFxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IHtcbiAgICAgICAgICAgIGluZ2VzdGlvbl9pZDogaW5nZXN0aW9uSWQsXG4gICAgICAgICAgICBzdGF0ZTogJ3BlbmRpbmcnLFxuICAgICAgICAgICAgZmlsZW5hbWU6IHNlbGVjdGVkRmlsZS5uYW1lLFxuICAgICAgICAgICAgY2h1bmtzX3RvdGFsOiBudWxsLFxuICAgICAgICAgICAgY3VycmVudF9jaHVuazogbnVsbCxcbiAgICAgICAgICAgIHN0YXJ0ZWRfYXQ6IG51bGwsXG4gICAgICAgICAgICBjb21wbGV0ZWRfYXQ6IG51bGwsXG4gICAgICAgICAgICBsYXRlc3RfZXZlbnQ6IGBVcGxvYWRpbmcgJHtzZWxlY3RlZEZpbGUubmFtZX0uLi5gLFxuICAgICAgICAgICAgZXZlbnRzOiBbXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KSk7XG5cbiAgICAgICAgY29uc3QgcG9sbGluZ1Rhc2sgPSBwb2xsUHJvY2Vzc2luZygpO1xuXG4gICAgICAgIHByb2Nlc3NpbmdQaGFzZVRpbWVyID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PlxuICAgICAgICAgICAgY3VycmVudC5waGFzZSA9PT0gJ3VwbG9hZGluZydcbiAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgICAgICAgICAgcGhhc2U6ICdwcm9jZXNzaW5nJyxcbiAgICAgICAgICAgICAgICAgIHN0YXR1c01lc3NhZ2U6ICdFeHRyYWN0aW5nIGRvY3VtZW50IGVudGl0aWVzLCBldmlkZW5jZSwgYW5kIHJlbGF0aW9uc2hpcHMuLi4nLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgOiBjdXJyZW50XG4gICAgICAgICAgKTtcbiAgICAgICAgfSwgOTAwKTtcblxuICAgICAgICBjb25zdCBpbmdlc3Rpb24gPSBhd2FpdCB1cGxvYWRLbm93bGVkZ2VEb2N1bWVudChzZWxlY3RlZEZpbGUsIHRydWUsIGFwcENvbmZpZy5wcm9jZXNzaW5nVGltZW91dE1zLCBpbmdlc3Rpb25JZCk7XG4gICAgICAgIGNvbnN0IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgPSBhd2FpdCBnZXREb2N1bWVudFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQpLmNhdGNoKCgpID0+IG51bGwpO1xuXG4gICAgICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgaW5nZXN0aW9uLFxuICAgICAgICAgIHBoYXNlOiAncHJvY2Vzc2luZycsXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTogbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cz8ubGF0ZXN0X2V2ZW50IHx8ICdMb2FkaW5nIHRoZSBnZW5lcmF0ZWQgZG9jdW1lbnQgd29ya3NwYWNlLi4uJyxcbiAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzOiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzIHx8IGN1cnJlbnQucHJvY2Vzc2luZ1N0YXR1cyxcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIGNvbnN0IGdyYXBoUGF5bG9hZCA9IGF3YWl0IGdldERvY3VtZW50R3JhcGgoKTtcbiAgICAgICAgY29uc3QgYWRhcHRlZEdyYXBoID0gYWRhcHREb2N1bWVudEdyYXBoKGdyYXBoUGF5bG9hZCk7XG5cbiAgICAgICAgc2V0RG9jdW1lbnRHcmFwaCh7XG4gICAgICAgICAgc3RhdHVzOiAncmVhZHknLFxuICAgICAgICAgIGRhdGE6IGFkYXB0ZWRHcmFwaCxcbiAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICBsYXN0TG9hZGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgaW5nZXN0aW9uLFxuICAgICAgICAgIGluZ2VzdGlvbklkLFxuICAgICAgICAgIHBoYXNlOiBhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwID8gJ2VtcHR5LWdyYXBoJyA6ICdzdWNjZXNzJyxcbiAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOlxuICAgICAgICAgICAgbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cz8ubGF0ZXN0X2V2ZW50IHx8XG4gICAgICAgICAgICAoYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICAgICA/ICdQcm9jZXNzaW5nIGNvbXBsZXRlZCwgYnV0IHRoZSBkb2N1bWVudCBncmFwaCBpcyBlbXB0eS4nXG4gICAgICAgICAgICAgIDogJ1R3aW5HcmFwaE9wcyBmaW5pc2hlZCBtYXBwaW5nIHlvdXIgZG9jdW1lbnQuJyksXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czogbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyA/PyBjdXJyZW50LnByb2Nlc3NpbmdTdGF0dXMsXG4gICAgICAgICAgY29tcGxldGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgIH0pKTtcbiAgICAgICAga2VlcFBvbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgYXdhaXQgcG9sbGluZ1Rhc2s7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBrZWVwUG9sbGluZyA9IGZhbHNlO1xuICAgICAgICBjb25zdCBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzID0gYXdhaXQgZ2V0RG9jdW1lbnRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkKS5jYXRjaCgoKSA9PiBudWxsKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRvRnJpZW5kbHlNZXNzYWdlKGVycm9yKTtcbiAgICAgICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBwaGFzZTogJ3JldHJ5JyxcbiAgICAgICAgICBlcnJvcjogbWVzc2FnZSxcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgfHwgY3VycmVudC5wcm9jZXNzaW5nU3RhdHVzLFxuICAgICAgICAgIGNvbXBsZXRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICAgIHJldHJ5Q291bnQ6IGN1cnJlbnQucmV0cnlDb3VudCArIDEsXG4gICAgICAgIH0pKTtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBrZWVwUG9sbGluZyA9IGZhbHNlO1xuICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHByb2Nlc3NpbmdQaGFzZVRpbWVyKTtcbiAgICAgICAgZG9jdW1lbnRQcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9KSgpO1xuXG4gICAgZG9jdW1lbnRQcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50ID0gdGFzaztcbiAgICByZXR1cm4gdGFzaztcbiAgfSwgW2RvY3VtZW50VXBsb2FkLnNlbGVjdGVkRmlsZV0pO1xuXHJcbiAgY29uc3QgcmVzZXRVcGxvYWRTdGF0ZSA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBzZXRVcGxvYWQoaW5pdGlhbFVwbG9hZFN0YXRlKTtcbiAgICBzZXREb2N1bWVudFVwbG9hZChpbml0aWFsRG9jdW1lbnRVcGxvYWRTdGF0ZSk7XG4gIH0sIFtdKTtcblxyXG4gIGNvbnN0IHZhbHVlID0gdXNlTWVtbzxBcHBDb250ZXh0VmFsdWU+KFxyXG4gICAgKCkgPT4gKHtcclxuICAgICAgdXBsb2FkLFxuICAgICAgZ3JhcGgsXG4gICAgICBkb2N1bWVudFVwbG9hZCxcbiAgICAgIGRvY3VtZW50R3JhcGgsXG4gICAgICBzZXREcmFnQWN0aXZlLFxuICAgICAgc2VsZWN0RmlsZSxcbiAgICAgIGNsZWFyU2VsZWN0ZWRGaWxlLFxuICAgICAgYmVnaW5Qcm9jZXNzaW5nLFxuICAgICAgbG9hZEdyYXBoLFxuICAgICAgc2V0RG9jdW1lbnREcmFnQWN0aXZlLFxuICAgICAgc2VsZWN0RG9jdW1lbnRGaWxlLFxuICAgICAgY2xlYXJTZWxlY3RlZERvY3VtZW50RmlsZSxcbiAgICAgIGJlZ2luRG9jdW1lbnRQcm9jZXNzaW5nLFxuICAgICAgbG9hZERvY3VtZW50R3JhcGgsXG4gICAgICByZXNldFVwbG9hZFN0YXRlLFxuICAgIH0pLFxuICAgIFtcbiAgICAgIHVwbG9hZCxcbiAgICAgIGdyYXBoLFxuICAgICAgZG9jdW1lbnRVcGxvYWQsXG4gICAgICBkb2N1bWVudEdyYXBoLFxuICAgICAgc2V0RHJhZ0FjdGl2ZSxcbiAgICAgIHNlbGVjdEZpbGUsXG4gICAgICBjbGVhclNlbGVjdGVkRmlsZSxcbiAgICAgIGJlZ2luUHJvY2Vzc2luZyxcbiAgICAgIGxvYWRHcmFwaCxcbiAgICAgIHNldERvY3VtZW50RHJhZ0FjdGl2ZSxcbiAgICAgIHNlbGVjdERvY3VtZW50RmlsZSxcbiAgICAgIGNsZWFyU2VsZWN0ZWREb2N1bWVudEZpbGUsXG4gICAgICBiZWdpbkRvY3VtZW50UHJvY2Vzc2luZyxcbiAgICAgIGxvYWREb2N1bWVudEdyYXBoLFxuICAgICAgcmVzZXRVcGxvYWRTdGF0ZSxcbiAgICBdXG4gICk7XG5cclxuICByZXR1cm4gPEFwcENvbnRleHQuUHJvdmlkZXIgdmFsdWU9e3ZhbHVlfT57Y2hpbGRyZW59PC9BcHBDb250ZXh0LlByb3ZpZGVyPjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVzZUFwcENvbnRleHQoKSB7XHJcbiAgY29uc3QgY29udGV4dCA9IHVzZUNvbnRleHQoQXBwQ29udGV4dCk7XHJcbiAgaWYgKCFjb250ZXh0KSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3VzZUFwcENvbnRleHQgbXVzdCBiZSB1c2VkIHdpdGhpbiBBcHBQcm92aWRlci4nKTtcclxuICB9XHJcbiAgcmV0dXJuIGNvbnRleHQ7XHJcbn1cclxuIiwgImV4cG9ydCBmdW5jdGlvbiBjbiguLi52YWx1ZXM6IEFycmF5PHN0cmluZyB8IGZhbHNlIHwgbnVsbCB8IHVuZGVmaW5lZD4pIHtcclxuICByZXR1cm4gdmFsdWVzLmZpbHRlcihCb29sZWFuKS5qb2luKCcgJyk7XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgQnV0dG9uSFRNTEF0dHJpYnV0ZXMsIFJlYWN0Tm9kZSB9IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IHsgY24gfSBmcm9tICcuLi8uLi9saWIvY24nO1xyXG5cclxudHlwZSBCdXR0b25WYXJpYW50ID0gJ3ByaW1hcnknIHwgJ3NlY29uZGFyeScgfCAnZ2hvc3QnIHwgJ2Rhbmdlcic7XHJcblxyXG5pbnRlcmZhY2UgQnV0dG9uUHJvcHMgZXh0ZW5kcyBCdXR0b25IVE1MQXR0cmlidXRlczxIVE1MQnV0dG9uRWxlbWVudD4ge1xyXG4gIHZhcmlhbnQ/OiBCdXR0b25WYXJpYW50O1xyXG4gIGNoaWxkcmVuOiBSZWFjdE5vZGU7XHJcbn1cclxuXHJcbmNvbnN0IHZhcmlhbnRDbGFzc2VzOiBSZWNvcmQ8QnV0dG9uVmFyaWFudCwgc3RyaW5nPiA9IHtcclxuICBwcmltYXJ5OiAnYmctYmx1ZS02MDAgdGV4dC13aGl0ZSBob3ZlcjpiZy1ibHVlLTUwMCBzaGFkb3ctbGcgc2hhZG93LWJsdWUtOTUwLzQwJyxcclxuICBzZWNvbmRhcnk6ICdib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05MDAvODAgdGV4dC1zbGF0ZS0xMDAgaG92ZXI6Ym9yZGVyLXNsYXRlLTUwMCBob3ZlcjpiZy1zbGF0ZS04MDAnLFxyXG4gIGdob3N0OiAndGV4dC1zbGF0ZS0zMDAgaG92ZXI6Ymctc2xhdGUtODAwLzcwIGhvdmVyOnRleHQtd2hpdGUnLFxyXG4gIGRhbmdlcjogJ2JnLXJlZC02MDAgdGV4dC13aGl0ZSBob3ZlcjpiZy1yZWQtNTAwIHNoYWRvdy1sZyBzaGFkb3ctcmVkLTk1MC80MCcsXHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBCdXR0b24oeyBjbGFzc05hbWUsIHZhcmlhbnQgPSAncHJpbWFyeScsIGNoaWxkcmVuLCAuLi5wcm9wcyB9OiBCdXR0b25Qcm9wcykge1xyXG4gIHJldHVybiAoXHJcbiAgICA8YnV0dG9uXHJcbiAgICAgIGNsYXNzTmFtZT17Y24oXHJcbiAgICAgICAgJ2lubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiByb3VuZGVkLXhsIHB4LTQgcHktMi41IHRleHQtc20gZm9udC1zZW1pYm9sZCB0cmFuc2l0aW9uLWFsbCBkaXNhYmxlZDpjdXJzb3Itbm90LWFsbG93ZWQgZGlzYWJsZWQ6b3BhY2l0eS01MCcsXHJcbiAgICAgICAgdmFyaWFudENsYXNzZXNbdmFyaWFudF0sXHJcbiAgICAgICAgY2xhc3NOYW1lXHJcbiAgICAgICl9XHJcbiAgICAgIHsuLi5wcm9wc31cclxuICAgID5cclxuICAgICAge2NoaWxkcmVufVxyXG4gICAgPC9idXR0b24+XHJcbiAgKTtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBIVE1MQXR0cmlidXRlcywgUmVhY3ROb2RlIH0gZnJvbSAncmVhY3QnO1xyXG5pbXBvcnQgeyBjbiB9IGZyb20gJy4uLy4uL2xpYi9jbic7XHJcblxyXG5pbnRlcmZhY2UgQmFkZ2VQcm9wcyBleHRlbmRzIEhUTUxBdHRyaWJ1dGVzPEhUTUxTcGFuRWxlbWVudD4ge1xyXG4gIGNoaWxkcmVuOiBSZWFjdE5vZGU7XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEJhZGdlKHsgY2xhc3NOYW1lLCBjaGlsZHJlbiwgLi4ucHJvcHMgfTogQmFkZ2VQcm9wcykge1xyXG4gIHJldHVybiAoXHJcbiAgICA8c3BhblxyXG4gICAgICBjbGFzc05hbWU9e2NuKFxyXG4gICAgICAgICdpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgcm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIGJnLXNsYXRlLTkwMC84MCBweC0yLjUgcHktMSB0ZXh0LXhzIGZvbnQtbWVkaXVtIHRleHQtc2xhdGUtMjAwJyxcclxuICAgICAgICBjbGFzc05hbWVcclxuICAgICAgKX1cclxuICAgICAgey4uLnByb3BzfVxyXG4gICAgPlxyXG4gICAgICB7Y2hpbGRyZW59XHJcbiAgICA8L3NwYW4+XHJcbiAgKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgQWxlcnRUcmlhbmdsZSwgQ2hlY2tDaXJjbGUyLCBJbmZvIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcclxuaW1wb3J0IHsgY24gfSBmcm9tICcuLi9saWIvY24nO1xyXG5cclxuaW50ZXJmYWNlIFN0YXR1c0Jhbm5lclByb3BzIHtcclxuICB0b25lPzogJ2luZm8nIHwgJ3N1Y2Nlc3MnIHwgJ2Vycm9yJztcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmNvbnN0IHRvbmVNYXAgPSB7XHJcbiAgaW5mbzoge1xyXG4gICAgY29udGFpbmVyOiAnYm9yZGVyLWJsdWUtNTAwLzMwIGJnLWJsdWUtNTAwLzEwIHRleHQtYmx1ZS0xMDAnLFxyXG4gICAgaWNvbjogSW5mbyxcclxuICB9LFxyXG4gIHN1Y2Nlc3M6IHtcclxuICAgIGNvbnRhaW5lcjogJ2JvcmRlci1lbWVyYWxkLTUwMC8zMCBiZy1lbWVyYWxkLTUwMC8xMCB0ZXh0LWVtZXJhbGQtMTAwJyxcclxuICAgIGljb246IENoZWNrQ2lyY2xlMixcclxuICB9LFxyXG4gIGVycm9yOiB7XHJcbiAgICBjb250YWluZXI6ICdib3JkZXItcmVkLTUwMC8zMCBiZy1yZWQtNTAwLzEwIHRleHQtcmVkLTEwMCcsXHJcbiAgICBpY29uOiBBbGVydFRyaWFuZ2xlLFxyXG4gIH0sXHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTdGF0dXNCYW5uZXIoeyB0b25lID0gJ2luZm8nLCBtZXNzYWdlIH06IFN0YXR1c0Jhbm5lclByb3BzKSB7XHJcbiAgY29uc3QgSWNvbiA9IHRvbmVNYXBbdG9uZV0uaWNvbjtcclxuXHJcbiAgcmV0dXJuIChcclxuICAgIDxkaXYgY2xhc3NOYW1lPXtjbignZmxleCBpdGVtcy1zdGFydCBnYXAtMyByb3VuZGVkLTJ4bCBib3JkZXIgcHgtNCBweS0zIHRleHQtc20nLCB0b25lTWFwW3RvbmVdLmNvbnRhaW5lcil9PlxyXG4gICAgICA8SWNvbiBjbGFzc05hbWU9XCJtdC0wLjUgaC00IHctNCBzaHJpbmstMFwiIC8+XHJcbiAgICAgIDxwIGNsYXNzTmFtZT1cIm0tMCBsZWFkaW5nLTZcIj57bWVzc2FnZX08L3A+XHJcbiAgICA8L2Rpdj5cclxuICApO1xyXG59XHJcbiIsICJpbXBvcnQgeyB1c2VSZWYgfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCB0eXBlIHsgQ2hhbmdlRXZlbnQsIERyYWdFdmVudCB9IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IHsgQ2hldnJvblJpZ2h0LCBGaWxlVGV4dCwgTmV0d29yaywgU2hpZWxkLCBVcGxvYWQgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xyXG5pbXBvcnQgeyB1c2VOYXZpZ2F0ZSB9IGZyb20gJ3JlYWN0LXJvdXRlci1kb20nO1xyXG5pbXBvcnQgQnV0dG9uIGZyb20gJy4uL2NvbXBvbmVudHMvdWkvQnV0dG9uJztcclxuaW1wb3J0IEJhZGdlIGZyb20gJy4uL2NvbXBvbmVudHMvdWkvQmFkZ2UnO1xyXG5pbXBvcnQgU3RhdHVzQmFubmVyIGZyb20gJy4uL2NvbXBvbmVudHMvU3RhdHVzQmFubmVyJztcclxuaW1wb3J0IHsgYXBwQ29uZmlnIH0gZnJvbSAnLi4vbGliL2NvbmZpZyc7XHJcbmltcG9ydCB7IHVzZUFwcENvbnRleHQgfSBmcm9tICcuLi9zdGF0ZS9BcHBDb250ZXh0JztcclxuXHJcbmZ1bmN0aW9uIGZvcm1hdEZpbGVTaXplKHNpemU6IG51bWJlcikge1xyXG4gIGlmIChzaXplIDwgMTAyNCAqIDEwMjQpIHtcclxuICAgIHJldHVybiBgJHsoc2l6ZSAvIDEwMjQpLnRvRml4ZWQoMSl9IEtCYDtcclxuICB9XHJcbiAgcmV0dXJuIGAkeyhzaXplIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoMil9IE1CYDtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTGFuZGluZ1BhZ2UoKSB7XHJcbiAgY29uc3QgbmF2aWdhdGUgPSB1c2VOYXZpZ2F0ZSgpO1xyXG4gIGNvbnN0IGZpbGVJbnB1dFJlZiA9IHVzZVJlZjxIVE1MSW5wdXRFbGVtZW50IHwgbnVsbD4obnVsbCk7XHJcbiAgY29uc3QgeyB1cGxvYWQsIGdyYXBoLCBzZXREcmFnQWN0aXZlLCBzZWxlY3RGaWxlLCBjbGVhclNlbGVjdGVkRmlsZSB9ID0gdXNlQXBwQ29udGV4dCgpO1xyXG5cclxuICBjb25zdCBzZWxlY3RlZEZpbGUgPSB1cGxvYWQuc2VsZWN0ZWRGaWxlO1xyXG5cclxuICBjb25zdCBoYW5kbGVGaWxlID0gKGZpbGU6IEZpbGUgfCBudWxsKSA9PiB7XHJcbiAgICBzZWxlY3RGaWxlKGZpbGUpO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IGhhbmRsZURyb3AgPSAoZXZlbnQ6IERyYWdFdmVudDxIVE1MRGl2RWxlbWVudD4pID0+IHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBzZXREcmFnQWN0aXZlKGZhbHNlKTtcclxuICAgIGhhbmRsZUZpbGUoZXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzPy5bMF0gPz8gbnVsbCk7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgaGFuZGxlRmlsZUlucHV0ID0gKGV2ZW50OiBDaGFuZ2VFdmVudDxIVE1MSW5wdXRFbGVtZW50PikgPT4ge1xyXG4gICAgaGFuZGxlRmlsZShldmVudC50YXJnZXQuZmlsZXM/LlswXSA/PyBudWxsKTtcclxuICB9O1xyXG5cclxuICByZXR1cm4gKFxyXG4gICAgPGRpdiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gYmctWyMwRjE3MkFdIHRleHQtd2hpdGVcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXgtYXV0byBtYXgtdy03eGwgcHgtNiBweS0xMFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTYgZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtM1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCByb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNzAgcC0xXCI+XG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cInJvdW5kZWQteGwgYmctYmx1ZS02MDAgcHgtNCBweS0yIHRleHQtc20gZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+UmlzayBXb3Jrc3BhY2U8L2J1dHRvbj5cbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9kb2N1bWVudHMnKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicm91bmRlZC14bCBweC00IHB5LTIgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtc2xhdGUtMzAwIHRyYW5zaXRpb24gaG92ZXI6dGV4dC13aGl0ZVwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIERvY3VtZW50IFdvcmtzcGFjZVxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PVwic2Vjb25kYXJ5XCIgb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9yaXNrJyl9IGRpc2FibGVkPXshZ3JhcGguZGF0YX0+XG4gICAgICAgICAgICBPcGVuIFJpc2sgR3JhcGhcbiAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBnYXAtMTAgeGw6Z3JpZC1jb2xzLVsxLjJmcl8wLjhmcl1cIj5cbiAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLVszMnB4XSBweC04IHB5LTEwIG1kOnB4LTEwIG1kOnB5LTEyXCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWItNCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYmctYmx1ZS01MDAvMTUgcC0zIHRleHQtYmx1ZS0zMDBcIj5cclxuICAgICAgICAgICAgICAgIDxOZXR3b3JrIGNsYXNzTmFtZT1cImgtOCB3LThcIiAvPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDxkaXY+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc20gdXBwZXJjYXNlIHRyYWNraW5nLVswLjIyZW1dIHRleHQtYmx1ZS0zMDBcIj5EaWdpdGFsIFR3aW4gT3BlcmF0aW9uczwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPGgxIGNsYXNzTmFtZT1cIm10LTEgdGV4dC01eGwgZm9udC1ib2xkIHRyYWNraW5nLXRpZ2h0IHRleHQtd2hpdGUgbWQ6dGV4dC02eGxcIj5Ud2luR3JhcGhPcHM8L2gxPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm1heC13LTN4bCB0ZXh0LWxnIGxlYWRpbmctOCB0ZXh0LXNsYXRlLTMwMFwiPlxyXG4gICAgICAgICAgICAgIERyb3AgaW4geW91ciBzeXN0ZW0gbWFudWFsIGFuZCBsZXQgVHdpbkdyYXBoT3BzIGV4dHJhY3QgdGhlIGFyY2hpdGVjdHVyZSwgc2NvcmUgb3BlcmF0aW9uYWwgcmlzaywgYW5kIHR1cm4gdGhlIHdob2xlIHN5c3RlbSBpbnRvIGEgZ3JhcGggeW91ciB0ZWFtIGNhbiBpbnNwZWN0IGluIG1pbnV0ZXMuXHJcbiAgICAgICAgICAgIDwvcD5cclxuXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtOCBmbGV4IGZsZXgtd3JhcCBnYXAtM1wiPlxyXG4gICAgICAgICAgICAgIDxCYWRnZSBjbGFzc05hbWU9XCJib3JkZXItYmx1ZS01MDAvMzAgYmctYmx1ZS01MDAvMTAgdGV4dC1ibHVlLTEwMFwiPkFQSSB7YXBwQ29uZmlnLmFwaUJhc2VVcmx9PC9CYWRnZT5cclxuICAgICAgICAgICAgICA8QmFkZ2UgY2xhc3NOYW1lPVwiYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05MDAvODAgdGV4dC1zbGF0ZS0yMDBcIj5cclxuICAgICAgICAgICAgICAgIFVwbG9hZCBsaW1pdCB7TWF0aC5yb3VuZChhcHBDb25maWcubWF4VXBsb2FkQnl0ZXMgLyAxMDI0IC8gMTAyNCl9IE1CXHJcbiAgICAgICAgICAgICAgPC9CYWRnZT5cclxuICAgICAgICAgICAgICA8QmFkZ2UgY2xhc3NOYW1lPVwiYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05MDAvODAgdGV4dC1zbGF0ZS0yMDBcIj5cclxuICAgICAgICAgICAgICAgIFRpbWVvdXQgeyhhcHBDb25maWcucHJvY2Vzc2luZ1RpbWVvdXRNcyAvIDEwMDApLnRvRml4ZWQoMCl9c1xyXG4gICAgICAgICAgICAgIDwvQmFkZ2U+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0xMiBncmlkIGdhcC02IG1kOmdyaWQtY29scy0zXCI+XHJcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLVsyOHB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNTUgcC02XCI+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgZmxleCBoLTEyIHctMTIgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtMnhsIGJnLWJsdWUtNTAwLzE1IHRleHQtYmx1ZS0zMDBcIj5cclxuICAgICAgICAgICAgICAgICAgPFVwbG9hZCBjbGFzc05hbWU9XCJoLTYgdy02XCIgLz5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+MS4gVXBsb2FkIERvY3VtZW50YXRpb248L2gyPlxyXG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTQwMFwiPlVwbG9hZCBhIFVURi04IGAubWRgIG9yIGAudHh0YCBmaWxlIGRlc2NyaWJpbmcgdGhlIHN5c3RlbS48L3A+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLVsyOHB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNTUgcC02XCI+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgZmxleCBoLTEyIHctMTIgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtMnhsIGJnLXB1cnBsZS01MDAvMTUgdGV4dC1wdXJwbGUtMzAwXCI+XHJcbiAgICAgICAgICAgICAgICAgIDxOZXR3b3JrIGNsYXNzTmFtZT1cImgtNiB3LTZcIiAvPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj4yLiBCdWlsZCBHcmFwaDwvaDI+XHJcbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gbGVhZGluZy02IHRleHQtc2xhdGUtNDAwXCI+VGhlIGJhY2tlbmQgZXh0cmFjdHMgbm9kZXMsIGVkZ2VzLCBhbmQgcmlzayBtZXRyaWNzIGludG8gdGhlIGFjdGl2ZSBncmFwaC48L3A+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLVsyOHB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNTUgcC02XCI+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgZmxleCBoLTEyIHctMTIgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtMnhsIGJnLW9yYW5nZS01MDAvMTUgdGV4dC1vcmFuZ2UtMzAwXCI+XHJcbiAgICAgICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwiaC02IHctNlwiIC8+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPjMuIEluc3BlY3QgUmlza3M8L2gyPlxyXG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTQwMFwiPkV4cGxvcmUgdGhlIGdyYXBoLCB0YWJsZXMsIGFuZCBkZXRhaWwgcGFuZWwgZm9yIG9wZXJhdGlvbmFsIGluc2lnaHQuPC9wPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDwvc2VjdGlvbj5cclxuXHJcbiAgICAgICAgICA8YXNpZGUgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC1bMzJweF0gcC04XCI+XHJcbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPkFjdGl2ZSBJbmdlc3Q8L2gyPlxyXG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gbGVhZGluZy02IHRleHQtc2xhdGUtMzAwXCI+XHJcbiAgICAgICAgICAgICAgUXVldWUgb25lIG1hbnVhbCBmb3IgaW5nZXN0aW9uLiBUaGUgYWN0aXZlIGdyYXBoIGluIHRoZSB3b3Jrc3BhY2Ugd2lsbCByZWZyZXNoIHdoZW4gcHJvY2Vzc2luZyBjb21wbGV0ZXMuXHJcbiAgICAgICAgICAgIDwvcD5cclxuXHJcbiAgICAgICAgICAgIDxkaXZcclxuICAgICAgICAgICAgICBjbGFzc05hbWU9e2BtdC02IHJvdW5kZWQtWzI4cHhdIGJvcmRlci0yIGJvcmRlci1kYXNoZWQgcC04IHRleHQtY2VudGVyIHRyYW5zaXRpb24gJHtcclxuICAgICAgICAgICAgICAgIHVwbG9hZC5waGFzZSA9PT0gJ2RyYWctaG92ZXInXHJcbiAgICAgICAgICAgICAgICAgID8gJ2JvcmRlci1ibHVlLTQwMCBiZy1ibHVlLTUwMC8xMCdcclxuICAgICAgICAgICAgICAgICAgOiAnYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05NTAvNTAgaG92ZXI6Ym9yZGVyLXNsYXRlLTUwMCdcclxuICAgICAgICAgICAgICB9YH1cclxuICAgICAgICAgICAgICBvbkRyYWdPdmVyPXsoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBzZXREcmFnQWN0aXZlKHRydWUpO1xyXG4gICAgICAgICAgICAgIH19XHJcbiAgICAgICAgICAgICAgb25EcmFnTGVhdmU9eygpID0+IHNldERyYWdBY3RpdmUoZmFsc2UpfVxyXG4gICAgICAgICAgICAgIG9uRHJvcD17aGFuZGxlRHJvcH1cclxuICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgIDxVcGxvYWQgY2xhc3NOYW1lPVwibXgtYXV0byBoLTE0IHctMTQgdGV4dC1zbGF0ZS00MDBcIiAvPlxyXG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJtdC00IHRleHQteGwgZm9udC1tZWRpdW0gdGV4dC13aGl0ZVwiPlVwbG9hZCBTeXN0ZW0gRG9jdW1lbnRhdGlvbjwvaDM+XHJcbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+RHJhZyBhbmQgZHJvcCB5b3VyIGZpbGUgaGVyZSBvciBicm93c2UgbG9jYWxseS48L3A+XHJcbiAgICAgICAgICAgICAgPGlucHV0XHJcbiAgICAgICAgICAgICAgICByZWY9e2ZpbGVJbnB1dFJlZn1cclxuICAgICAgICAgICAgICAgIHR5cGU9XCJmaWxlXCJcclxuICAgICAgICAgICAgICAgIGFjY2VwdD1cIi5tZCwudHh0LHRleHQvcGxhaW4sdGV4dC9tYXJrZG93blwiXHJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoaWRkZW5cIlxyXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9e2hhbmRsZUZpbGVJbnB1dH1cclxuICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiBmbGV4IGZsZXgtd3JhcCBqdXN0aWZ5LWNlbnRlciBnYXAtM1wiPlxyXG4gICAgICAgICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PVwic2Vjb25kYXJ5XCIgb25DbGljaz17KCkgPT4gZmlsZUlucHV0UmVmLmN1cnJlbnQ/LmNsaWNrKCl9PlxyXG4gICAgICAgICAgICAgICAgICA8RmlsZVRleHQgY2xhc3NOYW1lPVwiaC00IHctNFwiIC8+XHJcbiAgICAgICAgICAgICAgICAgIENob29zZSBGaWxlXHJcbiAgICAgICAgICAgICAgICA8L0J1dHRvbj5cclxuICAgICAgICAgICAgICAgIDxCdXR0b24gb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9wcm9jZXNzaW5nJyl9IGRpc2FibGVkPXshc2VsZWN0ZWRGaWxlfT5cclxuICAgICAgICAgICAgICAgICAgQW5hbHl6ZSBEb2N1bWVudFxyXG4gICAgICAgICAgICAgICAgICA8Q2hldnJvblJpZ2h0IGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPlxyXG4gICAgICAgICAgICAgICAgPC9CdXR0b24+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtNCB0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yZW1dIHRleHQtc2xhdGUtNTAwXCI+U3VwcG9ydGVkIGZvcm1hdHM6IC5tZCBhbmQgLnR4dDwvcD5cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgcm91bmRlZC1bMjhweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzYwIHAtNFwiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTRcIj5cclxuICAgICAgICAgICAgICAgIDxkaXY+XHJcbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNTAwXCI+U2VsZWN0ZWQgRmlsZTwvcD5cclxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj57c2VsZWN0ZWRGaWxlPy5uYW1lID8/ICdObyBmaWxlIHNlbGVjdGVkLid9PC9wPlxyXG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0xIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICB7c2VsZWN0ZWRGaWxlID8gZm9ybWF0RmlsZVNpemUoc2VsZWN0ZWRGaWxlLnNpemUpIDogJ0Nob29zZSBhIG1hbnVhbCB0byBiZWdpbi4nfVxyXG4gICAgICAgICAgICAgICAgICA8L3A+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIHtzZWxlY3RlZEZpbGUgPyAoXHJcbiAgICAgICAgICAgICAgICAgIDxCdXR0b24gdmFyaWFudD1cImdob3N0XCIgb25DbGljaz17Y2xlYXJTZWxlY3RlZEZpbGV9PlxyXG4gICAgICAgICAgICAgICAgICAgIENsZWFyXHJcbiAgICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgKSA6IG51bGx9XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC02XCI+XHJcbiAgICAgICAgICAgICAgPFN0YXR1c0Jhbm5lclxyXG4gICAgICAgICAgICAgICAgdG9uZT17dXBsb2FkLmVycm9yID8gJ2Vycm9yJyA6IGdyYXBoLmRhdGEgPyAnc3VjY2VzcycgOiAnaW5mbyd9XHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlPXt1cGxvYWQuZXJyb3IgfHwgdXBsb2FkLnN0YXR1c01lc3NhZ2UgfHwgJ1VwbG9hZCBhIGZpbGUgdG8gY29udGludWUuJ31cclxuICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIHtncmFwaC5kYXRhID8gKFxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiByb3VuZGVkLVsyOHB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNjAgcC00XCI+XHJcbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPkN1cnJlbnQgV29ya3NwYWNlPC9wPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC00IGdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTRcIj5cclxuICAgICAgICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LTJ4bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57Z3JhcGguZGF0YS5ub2Rlcy5sZW5ndGh9PC9wPlxyXG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5Ob2RlczwvcD5cclxuICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgIDxkaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC0yeGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+e2dyYXBoLmRhdGEubGlua3MubGVuZ3RofTwvcD5cclxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+RWRnZXM8L3A+XHJcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICkgOiBudWxsfVxyXG4gICAgICAgICAgPC9hc2lkZT5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgPC9kaXY+XHJcbiAgICA8L2Rpdj5cclxuICApO1xyXG59XHJcbiIsICJpbXBvcnQgeyBDaGVja0NpcmNsZTIsIENsb2NrMywgTG9hZGVyMiwgVGVybWluYWxTcXVhcmUsIFhDaXJjbGUgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xyXG5pbXBvcnQgdHlwZSB7IFByb2Nlc3NpbmdTdGF0dXMgfSBmcm9tICcuLi90eXBlcy9hcGknO1xyXG5cclxuaW50ZXJmYWNlIFByb2Nlc3NpbmdBY3Rpdml0eVBhbmVsUHJvcHMge1xyXG4gIHN0YXR1czogUHJvY2Vzc2luZ1N0YXR1cyB8IG51bGw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZvcm1hdFRpbWVzdGFtcCh0aW1lc3RhbXA6IHN0cmluZyB8IG51bGwpIHtcclxuICBpZiAoIXRpbWVzdGFtcCkge1xyXG4gICAgcmV0dXJuICdQZW5kaW5nJztcclxuICB9XHJcblxyXG4gIHJldHVybiBuZXcgSW50bC5EYXRlVGltZUZvcm1hdCh1bmRlZmluZWQsIHtcclxuICAgIGhvdXI6ICdudW1lcmljJyxcclxuICAgIG1pbnV0ZTogJzItZGlnaXQnLFxyXG4gICAgc2Vjb25kOiAnMi1kaWdpdCcsXHJcbiAgfSkuZm9ybWF0KG5ldyBEYXRlKHRpbWVzdGFtcCkpO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBQcm9jZXNzaW5nQWN0aXZpdHlQYW5lbCh7IHN0YXR1cyB9OiBQcm9jZXNzaW5nQWN0aXZpdHlQYW5lbFByb3BzKSB7XHJcbiAgY29uc3QgZXZlbnRzID0gc3RhdHVzPy5ldmVudHMgPz8gW107XHJcbiAgY29uc3QgdmlzaWJsZUV2ZW50cyA9IFsuLi5ldmVudHNdLnJldmVyc2UoKS5zbGljZSgwLCA4KTtcclxuICBjb25zdCBzdGF0ZSA9IHN0YXR1cz8uc3RhdGUgPz8gJ3BlbmRpbmcnO1xyXG5cclxuICByZXR1cm4gKFxyXG4gICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC1bMjhweF0gcC02XCI+XHJcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LXdyYXAgaXRlbXMtc3RhcnQganVzdGlmeS1iZXR3ZWVuIGdhcC00XCI+XHJcbiAgICAgICAgPGRpdj5cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTNcIj5cclxuICAgICAgICAgICAgPFRlcm1pbmFsU3F1YXJlIGNsYXNzTmFtZT1cImgtNSB3LTUgdGV4dC1jeWFuLTMwMFwiIC8+XHJcbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPlByb2Nlc3NpbmcgQWN0aXZpdHk8L2gyPlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIGJnLXNsYXRlLTk1MC83MCBweC0zIHB5LTEgdGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMThlbV0gdGV4dC1zbGF0ZS0zMDBcIj5cclxuICAgICAgICAgIHtzdGF0ZX1cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgPC9kaXY+XHJcblxyXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTUgZ3JpZCBnYXAtMyBzbTpncmlkLWNvbHMtM1wiPlxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMjJweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzcwIHAtNFwiPlxyXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LXNsYXRlLTUwMFwiPkN1cnJlbnQgU3RlcDwvZGl2PlxyXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gZm9udC1tZWRpdW0gdGV4dC13aGl0ZVwiPntzdGF0dXM/LmxhdGVzdF9ldmVudCA/PyAnV2FpdGluZyBmb3IgdXBsb2FkIHRvIGJlZ2luLid9PC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLVsyMnB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNzAgcC00XCI+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtc2xhdGUtNTAwXCI+Q2h1bmsgUHJvZ3Jlc3M8L2Rpdj5cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj5cclxuICAgICAgICAgICAge3N0YXR1cz8uY3VycmVudF9jaHVuayAmJiBzdGF0dXM/LmNodW5rc190b3RhbFxyXG4gICAgICAgICAgICAgID8gYCR7TWF0aC5taW4oc3RhdHVzLmN1cnJlbnRfY2h1bmssIHN0YXR1cy5jaHVua3NfdG90YWwpfSBvZiAke3N0YXR1cy5jaHVua3NfdG90YWx9YFxyXG4gICAgICAgICAgICAgIDogc3RhdHVzPy5jaHVua3NfdG90YWxcclxuICAgICAgICAgICAgICAgID8gYDAgb2YgJHtzdGF0dXMuY2h1bmtzX3RvdGFsfWBcclxuICAgICAgICAgICAgICAgIDogJ1dhaXRpbmcnfVxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLVsyMnB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNzAgcC00XCI+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtc2xhdGUtNTAwXCI+U3RhcnRlZDwvZGl2PlxyXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gZm9udC1tZWRpdW0gdGV4dC13aGl0ZVwiPntmb3JtYXRUaW1lc3RhbXAoc3RhdHVzPy5zdGFydGVkX2F0ID8/IG51bGwpfTwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICA8L2Rpdj5cclxuXHJcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNSBzcGFjZS15LTNcIj5cclxuICAgICAgICB7dmlzaWJsZUV2ZW50cy5sZW5ndGggPT09IDAgPyAoXHJcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtWzIycHhdIGJvcmRlciBib3JkZXItZGFzaGVkIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzQ1IHB4LTQgcHktNSB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+XHJcbiAgICAgICAgICAgIFdhaXRpbmcgZm9yIGJhY2tlbmQgYWN0aXZpdHkuLi5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICkgOiAoXHJcbiAgICAgICAgICB2aXNpYmxlRXZlbnRzLm1hcCgoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdG9uZSA9XHJcbiAgICAgICAgICAgICAgZXZlbnQubGV2ZWwgPT09ICdFUlJPUidcclxuICAgICAgICAgICAgICAgID8ge1xyXG4gICAgICAgICAgICAgICAgICAgIGljb246IDxYQ2lyY2xlIGNsYXNzTmFtZT1cImgtNCB3LTQgdGV4dC1yZWQtMzAwXCIgLz4sXHJcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAnYm9yZGVyLXJlZC01MDAvMjAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGJnOiAnYmctcmVkLTUwMC84JyxcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgOiBldmVudC5ldmVudC5lbmRzV2l0aCgnX2NvbXBsZXRlZCcpIHx8IGV2ZW50LmV2ZW50LmVuZHNXaXRoKCdfc3VjY2VlZGVkJylcclxuICAgICAgICAgICAgICAgICAgPyB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBpY29uOiA8Q2hlY2tDaXJjbGUyIGNsYXNzTmFtZT1cImgtNCB3LTQgdGV4dC1lbWVyYWxkLTMwMFwiIC8+LFxyXG4gICAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAnYm9yZGVyLWVtZXJhbGQtNTAwLzIwJyxcclxuICAgICAgICAgICAgICAgICAgICAgIGJnOiAnYmctZW1lcmFsZC01MDAvOCcsXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICA6IHN0YXRlID09PSAncnVubmluZydcclxuICAgICAgICAgICAgICAgICAgICA/IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogPExvYWRlcjIgY2xhc3NOYW1lPVwiaC00IHctNCBhbmltYXRlLXNwaW4gdGV4dC1ibHVlLTMwMFwiIC8+LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXI6ICdib3JkZXItYmx1ZS01MDAvMjAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBiZzogJ2JnLWJsdWUtNTAwLzgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uOiA8Q2xvY2szIGNsYXNzTmFtZT1cImgtNCB3LTQgdGV4dC1zbGF0ZS0zMDBcIiAvPixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAnYm9yZGVyLXNsYXRlLTcwMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJnOiAnYmctc2xhdGUtOTAwLzcwJyxcclxuICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgIDxkaXZcclxuICAgICAgICAgICAgICAgIGtleT17YCR7ZXZlbnQudGltZXN0YW1wID8/ICdwZW5kaW5nJ30tJHtldmVudC5ldmVudH1gfVxyXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgZmxleCBpdGVtcy1zdGFydCBnYXAtMyByb3VuZGVkLVsyMnB4XSBib3JkZXIgcHgtNCBweS0zICR7dG9uZS5ib3JkZXJ9ICR7dG9uZS5iZ31gfVxyXG4gICAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMC41XCI+e3RvbmUuaWNvbn08L2Rpdj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLXctMCBmbGV4LTFcIj5cclxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cclxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj57ZXZlbnQubWVzc2FnZX08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS01MDBcIj57Zm9ybWF0VGltZXN0YW1wKGV2ZW50LnRpbWVzdGFtcCl9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0xIHRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNTAwXCI+e2V2ZW50LmV2ZW50fTwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICl9XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgPC9zZWN0aW9uPlxyXG4gICk7XHJcbn1cclxuIiwgImltcG9ydCB7IHVzZUVmZmVjdCwgdXNlTWVtbywgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCB7IENoZWNrQ2lyY2xlMiwgTG9hZGVyMiwgTmV0d29yayB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XHJcbmltcG9ydCB7IHVzZU5hdmlnYXRlIH0gZnJvbSAncmVhY3Qtcm91dGVyLWRvbSc7XHJcbmltcG9ydCBQcm9jZXNzaW5nQWN0aXZpdHlQYW5lbCBmcm9tICcuLi9jb21wb25lbnRzL1Byb2Nlc3NpbmdBY3Rpdml0eVBhbmVsJztcclxuaW1wb3J0IEJ1dHRvbiBmcm9tICcuLi9jb21wb25lbnRzL3VpL0J1dHRvbic7XHJcbmltcG9ydCBTdGF0dXNCYW5uZXIgZnJvbSAnLi4vY29tcG9uZW50cy9TdGF0dXNCYW5uZXInO1xyXG5pbXBvcnQgeyB1c2VBcHBDb250ZXh0IH0gZnJvbSAnLi4vc3RhdGUvQXBwQ29udGV4dCc7XHJcblxyXG5jb25zdCBzdGVwcyA9IFtcclxuICAnVXBsb2FkaW5nIGRvY3VtZW50JyxcclxuICAnRXh0cmFjdGluZyBhcmNoaXRlY3R1cmUgZ3JhcGgnLFxyXG4gICdDYWxjdWxhdGluZyByaXNrIG1ldHJpY3MgYW5kIGxvYWRpbmcgd29ya3NwYWNlJyxcclxuXTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFByb2Nlc3NpbmdQYWdlKCkge1xyXG4gIGNvbnN0IG5hdmlnYXRlID0gdXNlTmF2aWdhdGUoKTtcclxuICBjb25zdCB7IHVwbG9hZCwgZ3JhcGgsIGJlZ2luUHJvY2Vzc2luZyB9ID0gdXNlQXBwQ29udGV4dCgpO1xyXG4gIGNvbnN0IFtlbGFwc2VkLCBzZXRFbGFwc2VkXSA9IHVzZVN0YXRlKDApO1xyXG5cclxuICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgaWYgKCF1cGxvYWQuc2VsZWN0ZWRGaWxlICYmICF1cGxvYWQuaW5nZXN0aW9uICYmICFncmFwaC5kYXRhKSB7XHJcbiAgICAgIG5hdmlnYXRlKCcvJyk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodXBsb2FkLnBoYXNlID09PSAnZmlsZS1zZWxlY3RlZCcpIHtcclxuICAgICAgYmVnaW5Qcm9jZXNzaW5nKCkuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKTtcclxuICAgIH1cclxuICB9LCBbYmVnaW5Qcm9jZXNzaW5nLCBncmFwaC5kYXRhLCBuYXZpZ2F0ZSwgdXBsb2FkLmluZ2VzdGlvbiwgdXBsb2FkLnBoYXNlLCB1cGxvYWQuc2VsZWN0ZWRGaWxlXSk7XHJcblxyXG4gIHVzZUVmZmVjdCgoKSA9PiB7XHJcbiAgICBpZiAoISh1cGxvYWQucGhhc2UgPT09ICd1cGxvYWRpbmcnIHx8IHVwbG9hZC5waGFzZSA9PT0gJ3Byb2Nlc3NpbmcnKSB8fCAhdXBsb2FkLnN0YXJ0ZWRBdCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgaW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgICBzZXRFbGFwc2VkKERhdGUubm93KCkgLSB1cGxvYWQuc3RhcnRlZEF0ISk7XHJcbiAgICB9LCAyMDApO1xyXG5cclxuICAgIHJldHVybiAoKSA9PiB3aW5kb3cuY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XHJcbiAgfSwgW3VwbG9hZC5waGFzZSwgdXBsb2FkLnN0YXJ0ZWRBdF0pO1xyXG5cclxuICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgaWYgKCh1cGxvYWQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCB1cGxvYWQucGhhc2UgPT09ICdlbXB0eS1ncmFwaCcpICYmIGdyYXBoLnN0YXR1cyA9PT0gJ3JlYWR5Jykge1xyXG4gICAgICBjb25zdCB0aW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4gbmF2aWdhdGUoJy9hcHAnKSwgNzAwKTtcclxuICAgICAgcmV0dXJuICgpID0+IHdpbmRvdy5jbGVhclRpbWVvdXQodGltZW91dCk7XHJcbiAgICB9XHJcbiAgfSwgW2dyYXBoLnN0YXR1cywgbmF2aWdhdGUsIHVwbG9hZC5waGFzZV0pO1xyXG5cclxuICBjb25zdCBjdXJyZW50U3RlcCA9IHVzZU1lbW8oKCkgPT4ge1xyXG4gICAgaWYgKHVwbG9hZC5waGFzZSA9PT0gJ3N1Y2Nlc3MnIHx8IHVwbG9hZC5waGFzZSA9PT0gJ2VtcHR5LWdyYXBoJykge1xyXG4gICAgICByZXR1cm4gc3RlcHMubGVuZ3RoO1xyXG4gICAgfVxyXG4gICAgaWYgKHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzPy5zdGF0ZSA9PT0gJ3J1bm5pbmcnICYmIHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzLmN1cnJlbnRfY2h1bmspIHtcclxuICAgICAgcmV0dXJuIHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzLmN1cnJlbnRfY2h1bmsgPj0gKHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzLmNodW5rc190b3RhbCA/PyAxKSA/IDMgOiAyO1xyXG4gICAgfVxyXG4gICAgaWYgKHVwbG9hZC5waGFzZSA9PT0gJ3Byb2Nlc3NpbmcnKSB7XHJcbiAgICAgIHJldHVybiBlbGFwc2VkID4gMjUwMCA/IDMgOiAyO1xyXG4gICAgfVxyXG4gICAgaWYgKHVwbG9hZC5waGFzZSA9PT0gJ3VwbG9hZGluZycpIHtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gMDtcclxuICB9LCBbZWxhcHNlZCwgdXBsb2FkLnBoYXNlLCB1cGxvYWQucHJvY2Vzc2luZ1N0YXR1cz8uY2h1bmtzX3RvdGFsLCB1cGxvYWQucHJvY2Vzc2luZ1N0YXR1cz8uY3VycmVudF9jaHVuaywgdXBsb2FkLnByb2Nlc3NpbmdTdGF0dXM/LnN0YXRlXSk7XHJcblxyXG4gIGNvbnN0IHByb2dyZXNzID0gdXNlTWVtbygoKSA9PiB7XHJcbiAgICBpZiAodXBsb2FkLnBoYXNlID09PSAnc3VjY2VzcycgfHwgdXBsb2FkLnBoYXNlID09PSAnZW1wdHktZ3JhcGgnKSB7XHJcbiAgICAgIHJldHVybiAxMDA7XHJcbiAgICB9XHJcbiAgICBpZiAodXBsb2FkLnByb2Nlc3NpbmdTdGF0dXM/LmNodW5rc190b3RhbCkge1xyXG4gICAgICBjb25zdCBjaHVua1Byb2dyZXNzID0gKCh1cGxvYWQucHJvY2Vzc2luZ1N0YXR1cy5jdXJyZW50X2NodW5rID8/IDApIC8gdXBsb2FkLnByb2Nlc3NpbmdTdGF0dXMuY2h1bmtzX3RvdGFsKSAqIDEwMDtcclxuICAgICAgcmV0dXJuIE1hdGgubWF4KDE4LCBNYXRoLm1pbig5NCwgTWF0aC5yb3VuZCgyMCArIGNodW5rUHJvZ3Jlc3MgKiAwLjcpKSk7XHJcbiAgICB9XHJcbiAgICBpZiAodXBsb2FkLnBoYXNlID09PSAncHJvY2Vzc2luZycpIHtcclxuICAgICAgcmV0dXJuIE1hdGgubWluKDkyLCBlbGFwc2VkID4gMjUwMCA/IDgyIDogNTgpO1xyXG4gICAgfVxyXG4gICAgaWYgKHVwbG9hZC5waGFzZSA9PT0gJ3VwbG9hZGluZycpIHtcclxuICAgICAgcmV0dXJuIDI0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDA7XHJcbiAgfSwgW2VsYXBzZWQsIHVwbG9hZC5waGFzZSwgdXBsb2FkLnByb2Nlc3NpbmdTdGF0dXM/LmNodW5rc190b3RhbCwgdXBsb2FkLnByb2Nlc3NpbmdTdGF0dXM/LmN1cnJlbnRfY2h1bmtdKTtcclxuXHJcbiAgY29uc3QgaXNSZXRyeVN0YXRlID0gdXBsb2FkLnBoYXNlID09PSAncmV0cnknIHx8IHVwbG9hZC5waGFzZSA9PT0gJ2Vycm9yJztcclxuXHJcbiAgcmV0dXJuIChcclxuICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLVsjMEYxNzJBXSBweC02IHB5LTE2IHRleHQtd2hpdGVcIj5cclxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJteC1hdXRvIG1heC13LTZ4bFwiPlxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBnYXAtNiB4bDpncmlkLWNvbHMtW21pbm1heCgwLDEuMWZyKV9taW5tYXgoMzQwcHgsMC45ZnIpXVwiPlxyXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLVszMnB4XSBwLTggbWQ6cC0xMFwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtY2VudGVyXCI+XHJcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyZWxhdGl2ZSBpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC1mdWxsIGJnLWJsdWUtNTAwLzEwIHAtNiB0ZXh0LWJsdWUtMzAwXCI+XHJcbiAgICAgICAgICAgICAgICA8TmV0d29yayBjbGFzc05hbWU9XCJoLTE0IHctMTRcIiAvPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIHJvdW5kZWQtZnVsbCBiZy1ibHVlLTUwMC8xMCBibHVyLTJ4bFwiIC8+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPGgxIGNsYXNzTmFtZT1cIm10LTYgdGV4dC0zeGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+UHJvY2Vzc2luZyBZb3VyIERvY3VtZW50YXRpb248L2gxPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMTAgc3BhY2UteS00XCI+XHJcbiAgICAgICAgICAgICAge3N0ZXBzLm1hcCgobGFiZWwsIGluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb21wbGV0ZWQgPSBjdXJyZW50U3RlcCA+IGluZGV4ICsgMTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGl2ZSA9IGN1cnJlbnRTdGVwID09PSBpbmRleCArIDE7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICAgICAgPGRpdlxyXG4gICAgICAgICAgICAgICAgICAgIGtleT17bGFiZWx9XHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTQgcm91bmRlZC1bMjRweF0gYm9yZGVyIHB4LTUgcHktNCB0cmFuc2l0aW9uICR7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyAnYm9yZGVyLWVtZXJhbGQtNTAwLzMwIGJnLWVtZXJhbGQtNTAwLzEwJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICA6IGFjdGl2ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgID8gJ2JvcmRlci1ibHVlLTUwMC8zMCBiZy1ibHVlLTUwMC8xMCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICA6ICdib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC81NSdcclxuICAgICAgICAgICAgICAgICAgICB9YH1cclxuICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBoLTEwIHctMTAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtZnVsbCBiZy1zbGF0ZS05NTAvNzBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgIHtjb21wbGV0ZWQgPyAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxDaGVja0NpcmNsZTIgY2xhc3NOYW1lPVwiaC01IHctNSB0ZXh0LWVtZXJhbGQtMzAwXCIgLz5cclxuICAgICAgICAgICAgICAgICAgICAgICkgOiBhY3RpdmUgPyAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxMb2FkZXIyIGNsYXNzTmFtZT1cImgtNSB3LTUgYW5pbWF0ZS1zcGluIHRleHQtYmx1ZS0zMDBcIiAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgKSA6IChcclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTMgdy0zIHJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXNsYXRlLTYwMFwiIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICApfVxyXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+e2xhYmVsfTwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTEgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7Y29tcGxldGVkID8gJ0NvbXBsZXRlZCcgOiBhY3RpdmUgPyB1cGxvYWQuc3RhdHVzTWVzc2FnZSA6ICdXYWl0aW5nJ31cclxuICAgICAgICAgICAgICAgICAgICAgIDwvcD5cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIH0pfVxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtOFwiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC0yIG92ZXJmbG93LWhpZGRlbiByb3VuZGVkLWZ1bGwgYmctc2xhdGUtODAwXCI+XHJcbiAgICAgICAgICAgICAgICA8ZGl2XHJcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImgtZnVsbCByb3VuZGVkLWZ1bGwgYmctZ3JhZGllbnQtdG8tciBmcm9tLWJsdWUtNTAwIHZpYS1jeWFuLTQwMCB0by1vcmFuZ2UtNDAwIHRyYW5zaXRpb24tYWxsXCJcclxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgd2lkdGg6IGAke3Byb2dyZXNzfSVgIH19XHJcbiAgICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPntwcm9ncmVzc30lPC9wPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtOFwiPlxyXG4gICAgICAgICAgICAgIDxTdGF0dXNCYW5uZXJcclxuICAgICAgICAgICAgICAgIHRvbmU9e2lzUmV0cnlTdGF0ZSA/ICdlcnJvcicgOiB1cGxvYWQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCB1cGxvYWQucGhhc2UgPT09ICdlbXB0eS1ncmFwaCcgPyAnc3VjY2VzcycgOiAnaW5mbyd9XHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlPXt1cGxvYWQuZXJyb3IgfHwgdXBsb2FkLnN0YXR1c01lc3NhZ2V9XHJcbiAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTggZmxleCBmbGV4LXdyYXAganVzdGlmeS1jZW50ZXIgZ2FwLTNcIj5cclxuICAgICAgICAgICAgICB7aXNSZXRyeVN0YXRlID8gKFxyXG4gICAgICAgICAgICAgICAgPEJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBiZWdpblByb2Nlc3NpbmcoKS5jYXRjaCgoKSA9PiB1bmRlZmluZWQpfT5SZXRyeSBQcm9jZXNzaW5nPC9CdXR0b24+XHJcbiAgICAgICAgICAgICAgKSA6IG51bGx9XHJcbiAgICAgICAgICAgICAgeyh1cGxvYWQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCB1cGxvYWQucGhhc2UgPT09ICdlbXB0eS1ncmFwaCcpICYmIGdyYXBoLnN0YXR1cyA9PT0gJ3JlYWR5JyA/IChcclxuICAgICAgICAgICAgICAgIDxCdXR0b24gb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9hcHAnKX0+T3BlbiBXb3Jrc3BhY2U8L0J1dHRvbj5cclxuICAgICAgICAgICAgICApIDogbnVsbH1cclxuICAgICAgICAgICAgICA8QnV0dG9uIHZhcmlhbnQ9XCJzZWNvbmRhcnlcIiBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnLycpfT5cclxuICAgICAgICAgICAgICAgIEJhY2sgdG8gVXBsb2FkXHJcbiAgICAgICAgICAgICAgPC9CdXR0b24+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgPFByb2Nlc3NpbmdBY3Rpdml0eVBhbmVsIHN0YXR1cz17dXBsb2FkLnByb2Nlc3NpbmdTdGF0dXN9IC8+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgPC9kaXY+XHJcbiAgKTtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBEb2N1bWVudEV2aWRlbmNlLCBHcmFwaERhdGEsIEdyYXBoRWRnZSwgR3JhcGhOb2RlLCBHcmFwaFN1bW1hcnkgfSBmcm9tICcuLi90eXBlcy9hcHAnO1xuXHJcbmV4cG9ydCBjb25zdCBUWVBFX0NPTE9SUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICBzb2Z0d2FyZTogJyM2MGE1ZmEnLFxyXG4gIGRhdGE6ICcjMzRkMzk5JyxcclxuICBpbnRlcmZhY2U6ICcjYzA4NGZjJyxcclxuICBoYXJkd2FyZTogJyNmYjkyM2MnLFxyXG4gIGh1bWFuOiAnI2Y0NzJiNicsXHJcbiAgb3RoZXI6ICcjOTRhM2I4JyxcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBSSVNLX0NPTE9SUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgbG93OiAnIzIyYzU1ZScsXHJcbiAgbWVkaXVtOiAnI2Y1OWUwYicsXHJcbiAgaGlnaDogJyNlZjQ0NDQnLFxyXG59O1xuXG5leHBvcnQgY29uc3QgRE9DVU1FTlRfS0lORF9DT0xPUlM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIGVudGl0eTogJyM2MGE1ZmEnLFxuICBjb25jZXB0OiAnIzM0ZDM5OScsXG4gIHNlY3Rpb246ICcjYTc4YmZhJyxcbiAgY2xhaW06ICcjZjU5ZTBiJyxcbiAgb2JsaWdhdGlvbjogJyNmYjcxODUnLFxuICByZXF1aXJlbWVudDogJyMzOGJkZjgnLFxuICBkYXRlOiAnI2Y5NzMxNicsXG4gIG1ldHJpYzogJyMyMmM1NWUnLFxuICBwcm9jZXNzOiAnI2MwODRmYycsXG4gIHJvbGU6ICcjZjQ3MmI2JyxcbiAgc3lzdGVtOiAnIzJkZDRiZicsXG4gIHJpc2s6ICcjZWY0NDQ0JyxcbiAgb3RoZXI6ICcjOTRhM2I4Jyxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlQ29sb3IodHlwZTogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIFRZUEVfQ09MT1JTW3R5cGVdIHx8IFRZUEVfQ09MT1JTLm90aGVyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Umlza0NvbG9yKGxldmVsOiBzdHJpbmcpIHtcbiAgcmV0dXJuIFJJU0tfQ09MT1JTW2xldmVsXSB8fCAnIzk0YTNiOCc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREb2N1bWVudEtpbmRDb2xvcihraW5kOiBzdHJpbmcpIHtcbiAgcmV0dXJuIERPQ1VNRU5UX0tJTkRfQ09MT1JTW2tpbmRdIHx8IERPQ1VNRU5UX0tJTkRfQ09MT1JTLm90aGVyO1xufVxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRMYWJlbCh2YWx1ZTogc3RyaW5nKSB7XG4gIHJldHVybiB2YWx1ZVxuICAgIC5zcGxpdCgvW18tXFxzXSsvKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChzZWdtZW50KSA9PiBzZWdtZW50LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc2VnbWVudC5zbGljZSgxKSlcbiAgICAuam9pbignICcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RG9jdW1lbnRFdmlkZW5jZVBhZ2VzKGV2aWRlbmNlOiBEb2N1bWVudEV2aWRlbmNlW10pIHtcbiAgY29uc3QgcmFuZ2VzID0gZXZpZGVuY2VcbiAgICAubWFwKChpdGVtKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIGl0ZW0ucGFnZVN0YXJ0ICE9PSAnbnVtYmVyJyAmJiB0eXBlb2YgaXRlbS5wYWdlRW5kICE9PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHN0YXJ0ID0gaXRlbS5wYWdlU3RhcnQgPz8gaXRlbS5wYWdlRW5kO1xuICAgICAgY29uc3QgZW5kID0gaXRlbS5wYWdlRW5kID8/IGl0ZW0ucGFnZVN0YXJ0O1xuICAgICAgaWYgKHR5cGVvZiBzdGFydCAhPT0gJ251bWJlcicgfHwgdHlwZW9mIGVuZCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGFydDogTWF0aC5taW4oc3RhcnQsIGVuZCksXG4gICAgICAgIGVuZDogTWF0aC5tYXgoc3RhcnQsIGVuZCksXG4gICAgICB9O1xuICAgIH0pXG4gICAgLmZpbHRlcigocmFuZ2UpOiByYW5nZSBpcyB7IHN0YXJ0OiBudW1iZXI7IGVuZDogbnVtYmVyIH0gPT4gcmFuZ2UgIT09IG51bGwpXG4gICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0LnN0YXJ0IC0gcmlnaHQuc3RhcnQgfHwgbGVmdC5lbmQgLSByaWdodC5lbmQpO1xuXG4gIGNvbnN0IHVuaXF1ZVJhbmdlcyA9IHJhbmdlcy5maWx0ZXIoXG4gICAgKHJhbmdlLCBpbmRleCkgPT4gaW5kZXggPT09IDAgfHwgcmFuZ2Uuc3RhcnQgIT09IHJhbmdlc1tpbmRleCAtIDFdLnN0YXJ0IHx8IHJhbmdlLmVuZCAhPT0gcmFuZ2VzW2luZGV4IC0gMV0uZW5kXG4gICk7XG5cbiAgaWYgKHVuaXF1ZVJhbmdlcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gJ05vIHBhZ2UgbWFya2VyJztcbiAgfVxuXG4gIGNvbnN0IHBhZ2VzID0gdW5pcXVlUmFuZ2VzLm1hcCgocmFuZ2UpID0+IChyYW5nZS5zdGFydCA9PT0gcmFuZ2UuZW5kID8gYCR7cmFuZ2Uuc3RhcnR9YCA6IGAke3JhbmdlLnN0YXJ0fS0ke3JhbmdlLmVuZH1gKSk7XG4gIHJldHVybiBgJHt1bmlxdWVSYW5nZXMubGVuZ3RoID09PSAxICYmIHVuaXF1ZVJhbmdlc1swXS5zdGFydCA9PT0gdW5pcXVlUmFuZ2VzWzBdLmVuZCA/ICdQYWdlJyA6ICdQYWdlcyd9ICR7cGFnZXMuam9pbignLCAnKX1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TGlua0VuZHBvaW50SWQoZW5kcG9pbnQ6IEdyYXBoRWRnZVsnc291cmNlJ10gfCBHcmFwaEVkZ2VbJ3RhcmdldCddKSB7XG4gIHJldHVybiB0eXBlb2YgZW5kcG9pbnQgPT09ICdzdHJpbmcnID8gZW5kcG9pbnQgOiBlbmRwb2ludC5pZDtcbn1cblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29ubmVjdGlvbkNvdW50KGdyYXBoOiBHcmFwaERhdGEsIG5vZGVJZDogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIGdyYXBoLmxpbmtzLmZpbHRlcigobGluaykgPT4gZ2V0TGlua0VuZHBvaW50SWQobGluay5zb3VyY2UpID09PSBub2RlSWQgfHwgZ2V0TGlua0VuZHBvaW50SWQobGluay50YXJnZXQpID09PSBub2RlSWQpLmxlbmd0aDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkR3JhcGhTdW1tYXJ5KGdyYXBoOiBHcmFwaERhdGEpOiBHcmFwaFN1bW1hcnkge1xyXG4gIGNvbnN0IHRvdGFsQ29tcG9uZW50cyA9IGdyYXBoLm5vZGVzLmxlbmd0aDtcclxuICBjb25zdCB0b3RhbFJlbGF0aW9uc2hpcHMgPSBncmFwaC5saW5rcy5sZW5ndGg7XHJcbiAgY29uc3QgYXZnUmlzayA9XHJcbiAgICB0b3RhbENvbXBvbmVudHMgPT09IDBcclxuICAgICAgPyAwXHJcbiAgICAgIDogTnVtYmVyKChncmFwaC5ub2Rlcy5yZWR1Y2UoKHN1bSwgbm9kZSkgPT4gc3VtICsgbm9kZS5yaXNrU2NvcmUsIDApIC8gdG90YWxDb21wb25lbnRzKS50b0ZpeGVkKDEpKTtcclxuICBjb25zdCBoaWdoUmlza05vZGVzID0gZ3JhcGgubm9kZXMuZmlsdGVyKChub2RlKSA9PiBub2RlLnJpc2tMZXZlbCA9PT0gJ2hpZ2gnKS5sZW5ndGg7XHJcbiAgY29uc3QgaGlnaGVzdFJpc2tOb2RlID0gWy4uLmdyYXBoLm5vZGVzXS5zb3J0KChsZWZ0LCByaWdodCkgPT4gcmlnaHQucmlza1Njb3JlIC0gbGVmdC5yaXNrU2NvcmUpWzBdID8/IG51bGw7XHJcblxyXG4gIGNvbnN0IHJpc2tEaXN0cmlidXRpb24gPSBbXHJcbiAgICB7IGxhYmVsOiAnTG93Jywga2V5OiAnbG93JywgY291bnQ6IGdyYXBoLm5vZGVzLmZpbHRlcigobm9kZSkgPT4gbm9kZS5yaXNrTGV2ZWwgPT09ICdsb3cnKS5sZW5ndGggfSxcclxuICAgIHsgbGFiZWw6ICdNZWRpdW0nLCBrZXk6ICdtZWRpdW0nLCBjb3VudDogZ3JhcGgubm9kZXMuZmlsdGVyKChub2RlKSA9PiBub2RlLnJpc2tMZXZlbCA9PT0gJ21lZGl1bScpLmxlbmd0aCB9LFxyXG4gICAgeyBsYWJlbDogJ0hpZ2gnLCBrZXk6ICdoaWdoJywgY291bnQ6IGdyYXBoLm5vZGVzLmZpbHRlcigobm9kZSkgPT4gbm9kZS5yaXNrTGV2ZWwgPT09ICdoaWdoJykubGVuZ3RoIH0sXHJcbiAgXTtcclxuXHJcbiAgY29uc3QgdHlwZUNvdW50cyA9IGdyYXBoLm5vZGVzLnJlZHVjZTxSZWNvcmQ8c3RyaW5nLCBudW1iZXI+PigoYWNjdW11bGF0b3IsIG5vZGUpID0+IHtcclxuICAgIGFjY3VtdWxhdG9yW25vZGUudHlwZV0gPSAoYWNjdW11bGF0b3Jbbm9kZS50eXBlXSA/PyAwKSArIDE7XHJcbiAgICByZXR1cm4gYWNjdW11bGF0b3I7XHJcbiAgfSwge30pO1xyXG5cclxuICBjb25zdCB0eXBlRGlzdHJpYnV0aW9uID0gT2JqZWN0LmVudHJpZXModHlwZUNvdW50cylcclxuICAgIC5tYXAoKFt0eXBlLCBjb3VudF0pID0+ICh7IHR5cGUsIGNvdW50IH0pKVxyXG4gICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5jb3VudCAtIGxlZnQuY291bnQpO1xyXG5cclxuICBjb25zdCBtb3N0Q29ubmVjdGVkTm9kZXMgPSBbLi4uZ3JhcGgubm9kZXNdXHJcbiAgICAubWFwKChub2RlKSA9PiAoeyBub2RlLCBjb25uZWN0aW9uczogZ2V0Q29ubmVjdGlvbkNvdW50KGdyYXBoLCBub2RlLmlkKSB9KSlcclxuICAgIC5zb3J0KChsZWZ0LCByaWdodCkgPT4gcmlnaHQuY29ubmVjdGlvbnMgLSBsZWZ0LmNvbm5lY3Rpb25zKVxyXG4gICAgLnNsaWNlKDAsIDUpO1xyXG5cclxuICBjb25zdCB0b3BSaXNrTm9kZXMgPSBbLi4uZ3JhcGgubm9kZXNdLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5yaXNrU2NvcmUgLSBsZWZ0LnJpc2tTY29yZSkuc2xpY2UoMCwgOCk7XHJcblxyXG4gIGNvbnN0IGJsYXN0UmFkaXVzTGVhZGVycyA9IFsuLi5ncmFwaC5ub2Rlc11cclxuICAgIC5tYXAoKG5vZGUpID0+ICh7IG5vZGUsIGNvdW50OiBub2RlLmJsYXN0UmFkaXVzIH0pKVxyXG4gICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5jb3VudCAtIGxlZnQuY291bnQpXHJcbiAgICAuc2xpY2UoMCwgNik7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICB0b3RhbENvbXBvbmVudHMsXHJcbiAgICB0b3RhbFJlbGF0aW9uc2hpcHMsXHJcbiAgICBhdmdSaXNrLFxyXG4gICAgaGlnaFJpc2tOb2RlcyxcclxuICAgIGhpZ2hlc3RSaXNrTm9kZSxcclxuICAgIHJpc2tEaXN0cmlidXRpb24sXHJcbiAgICB0eXBlRGlzdHJpYnV0aW9uLFxyXG4gICAgbW9zdENvbm5lY3RlZE5vZGVzLFxyXG4gICAgdG9wUmlza05vZGVzLFxyXG4gICAgYmxhc3RSYWRpdXNMZWFkZXJzLFxyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXROb2RlQnlJZChncmFwaDogR3JhcGhEYXRhLCBub2RlSWQ6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQpOiBHcmFwaE5vZGUgfCBudWxsIHtcclxuICBpZiAoIW5vZGVJZCkge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG4gIHJldHVybiBncmFwaC5ub2RlSW5kZXhbbm9kZUlkXSA/PyBudWxsO1xyXG59XHJcbiIsICJpbXBvcnQgeyBBY3Rpdml0eSwgQWxlcnRUcmlhbmdsZSwgQm94ZXMsIEdpdEJyYW5jaCB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XHJcbmltcG9ydCB0eXBlIHsgR3JhcGhEYXRhIH0gZnJvbSAnLi4vdHlwZXMvYXBwJztcclxuaW1wb3J0IHsgYnVpbGRHcmFwaFN1bW1hcnksIGZvcm1hdExhYmVsLCBnZXRSaXNrQ29sb3IsIGdldFR5cGVDb2xvciB9IGZyb20gJy4uL2xpYi9zZWxlY3RvcnMnO1xyXG5cclxuaW50ZXJmYWNlIFN5c3RlbU92ZXJ2aWV3UHJvcHMge1xyXG4gIGdyYXBoRGF0YTogR3JhcGhEYXRhO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTeXN0ZW1PdmVydmlldyh7IGdyYXBoRGF0YSB9OiBTeXN0ZW1PdmVydmlld1Byb3BzKSB7XHJcbiAgY29uc3Qgc3VtbWFyeSA9IGJ1aWxkR3JhcGhTdW1tYXJ5KGdyYXBoRGF0YSk7XHJcblxyXG4gIHJldHVybiAoXHJcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBvdmVyZmxvdy15LWF1dG8gcC02IG1kOnAtOFwiPlxyXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gbWF4LXctN3hsIHNwYWNlLXktOFwiPlxyXG4gICAgICAgIDxkaXY+XHJcbiAgICAgICAgICA8aDEgY2xhc3NOYW1lPVwidGV4dC0zeGwgZm9udC1ib2xkIHRleHQtd2hpdGVcIj5TeXN0ZW0gT3ZlcnZpZXc8L2gxPlxyXG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiBtYXgtdy0zeGwgdGV4dC1zbSBsZWFkaW5nLTcgdGV4dC1zbGF0ZS0zMDBcIj5cclxuICAgICAgICAgICAgU3VtbWFyeSBjYXJkcyBhbmQgYnJlYWtkb3ducyBhcmUgY29tcHV0ZWQgZGlyZWN0bHkgZnJvbSB0aGUgYWN0aXZlIGdyYXBoIGJlY2F1c2UgdGhlIGN1cnJlbnQgYmFja2VuZCBjb250cmFjdCBkb2VzIG5vdCBwcm92aWRlIGEgc2VwYXJhdGUgYXJjaGl0ZWN0dXJlIHN1bW1hcnkgZW5kcG9pbnQgeWV0LlxyXG4gICAgICAgICAgPC9wPlxyXG4gICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ2FwLTQgbWQ6Z3JpZC1jb2xzLTIgeGw6Z3JpZC1jb2xzLTRcIj5cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC01XCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XHJcbiAgICAgICAgICAgICAgPEJveGVzIGNsYXNzTmFtZT1cImgtOCB3LTggdGV4dC1ibHVlLTMwMFwiIC8+XHJcbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC00eGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+e3N1bW1hcnkudG90YWxDb21wb25lbnRzfTwvc3Bhbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlRvdGFsIENvbXBvbmVudHM8L3A+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC01XCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XHJcbiAgICAgICAgICAgICAgPEdpdEJyYW5jaCBjbGFzc05hbWU9XCJoLTggdy04IHRleHQtcHVycGxlLTMwMFwiIC8+XHJcbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC00eGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+e3N1bW1hcnkudG90YWxSZWxhdGlvbnNoaXBzfTwvc3Bhbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlJlbGF0aW9uc2hpcHM8L3A+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC01XCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XHJcbiAgICAgICAgICAgICAgPEFsZXJ0VHJpYW5nbGUgY2xhc3NOYW1lPVwiaC04IHctOCB0ZXh0LW9yYW5nZS0zMDBcIiAvPlxyXG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntzdW1tYXJ5LmhpZ2hSaXNrTm9kZXN9PC9zcGFuPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMyB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+SGlnaCBSaXNrIENvbXBvbmVudHM8L3A+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC01XCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XHJcbiAgICAgICAgICAgICAgPEFjdGl2aXR5IGNsYXNzTmFtZT1cImgtOCB3LTggdGV4dC1lbWVyYWxkLTMwMFwiIC8+XHJcbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC00eGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+e3N1bW1hcnkuYXZnUmlza308L3NwYW4+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5BdmVyYWdlIFJpc2s8L3A+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC02XCI+XHJcbiAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC14bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj5Nb3N0IENvbm5lY3RlZCBDb21wb25lbnRzPC9oMj5cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiBzcGFjZS15LTRcIj5cclxuICAgICAgICAgICAge3N1bW1hcnkubW9zdENvbm5lY3RlZE5vZGVzLm1hcCgoeyBub2RlLCBjb25uZWN0aW9ucyB9LCBpbmRleCkgPT4gKFxyXG4gICAgICAgICAgICAgIDxkaXYga2V5PXtub2RlLmlkfSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gcm91bmRlZC0zeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzcwIHAtNFwiPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtNFwiPlxyXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaC0xMCB3LTEwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLTJ4bCBiZy1ibHVlLTUwMC8xNSB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1ibHVlLTEwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgIHtpbmRleCArIDF9XHJcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+e25vZGUubmFtZX08L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTEgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAge2Zvcm1hdExhYmVsKG5vZGUudHlwZSl9IFx1MDBCNyB7bm9kZS5pZH1cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1yaWdodFwiPlxyXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC1ibHVlLTMwMFwiPntjb25uZWN0aW9uc308L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPkNvbm5lY3Rpb25zPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgKSl9XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L3NlY3Rpb24+XHJcblxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBnYXAtOCB4bDpncmlkLWNvbHMtWzFmcl8xZnJdXCI+XHJcbiAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLTN4bCBwLTZcIj5cclxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+Q29tcG9uZW50IFR5cGUgQnJlYWtkb3duPC9oMj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC02IHNwYWNlLXktNFwiPlxyXG4gICAgICAgICAgICAgIHtzdW1tYXJ5LnR5cGVEaXN0cmlidXRpb24ubWFwKChlbnRyeSkgPT4gKFxyXG4gICAgICAgICAgICAgICAgPGRpdiBrZXk9e2VudHJ5LnR5cGV9IGNsYXNzTmFtZT1cInJvdW5kZWQtM3hsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC83MCBwLTRcIj5cclxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cIj5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJoLTMgdy0zIHJvdW5kZWQtZnVsbFwiIHN0eWxlPXt7IGJhY2tncm91bmRDb2xvcjogZ2V0VHlwZUNvbG9yKGVudHJ5LnR5cGUpIH19IC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+e2Zvcm1hdExhYmVsKGVudHJ5LnR5cGUpfTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntlbnRyeS5jb3VudH08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgKSl9XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgPC9zZWN0aW9uPlxyXG5cclxuICAgICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNlwiPlxyXG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC14bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj5SaXNrIERpc3RyaWJ1dGlvbjwvaDI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiBzcGFjZS15LTRcIj5cclxuICAgICAgICAgICAgICB7c3VtbWFyeS5yaXNrRGlzdHJpYnV0aW9uLm1hcCgoZW50cnkpID0+IChcclxuICAgICAgICAgICAgICAgIDxkaXYga2V5PXtlbnRyeS5rZXl9IGNsYXNzTmFtZT1cInJvdW5kZWQtM3hsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC83MCBwLTRcIj5cclxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cIj5cclxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+e2VudHJ5LmxhYmVsfTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntlbnRyeS5jb3VudH08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTMgaC0yIG92ZXJmbG93LWhpZGRlbiByb3VuZGVkLWZ1bGwgYmctc2xhdGUtODAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPGRpdlxyXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaC1mdWxsIHJvdW5kZWQtZnVsbFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogYCR7c3VtbWFyeS50b3RhbENvbXBvbmVudHMgPT09IDAgPyAwIDogKGVudHJ5LmNvdW50IC8gc3VtbWFyeS50b3RhbENvbXBvbmVudHMpICogMTAwfSVgLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IGdldFJpc2tDb2xvcihlbnRyeS5rZXkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfX1cclxuICAgICAgICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICkpfVxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDwvc2VjdGlvbj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgPC9kaXY+XHJcbiAgICA8L2Rpdj5cclxuICApO1xyXG59XHJcbiIsICJpbXBvcnQgeyB1c2VSZWYgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgdHlwZSB7IENoYW5nZUV2ZW50LCBEcmFnRXZlbnQgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBDaGV2cm9uUmlnaHQsIEZpbGVUZXh0LCBOZXR3b3JrLCBTaGllbGQsIFVwbG9hZCB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQgeyB1c2VOYXZpZ2F0ZSB9IGZyb20gJ3JlYWN0LXJvdXRlci1kb20nO1xuaW1wb3J0IEJhZGdlIGZyb20gJy4uL2NvbXBvbmVudHMvdWkvQmFkZ2UnO1xuaW1wb3J0IEJ1dHRvbiBmcm9tICcuLi9jb21wb25lbnRzL3VpL0J1dHRvbic7XG5pbXBvcnQgU3RhdHVzQmFubmVyIGZyb20gJy4uL2NvbXBvbmVudHMvU3RhdHVzQmFubmVyJztcbmltcG9ydCB7IGFwcENvbmZpZyB9IGZyb20gJy4uL2xpYi9jb25maWcnO1xuaW1wb3J0IHsgdXNlQXBwQ29udGV4dCB9IGZyb20gJy4uL3N0YXRlL0FwcENvbnRleHQnO1xuXG5mdW5jdGlvbiBmb3JtYXRGaWxlU2l6ZShzaXplOiBudW1iZXIpIHtcbiAgaWYgKHNpemUgPCAxMDI0ICogMTAyNCkge1xuICAgIHJldHVybiBgJHsoc2l6ZSAvIDEwMjQpLnRvRml4ZWQoMSl9IEtCYDtcbiAgfVxuICByZXR1cm4gYCR7KHNpemUgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCgyKX0gTUJgO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBEb2N1bWVudFVwbG9hZFBhZ2UoKSB7XG4gIGNvbnN0IG5hdmlnYXRlID0gdXNlTmF2aWdhdGUoKTtcbiAgY29uc3QgZmlsZUlucHV0UmVmID0gdXNlUmVmPEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsPihudWxsKTtcbiAgY29uc3Qge1xuICAgIGRvY3VtZW50VXBsb2FkLFxuICAgIGRvY3VtZW50R3JhcGgsXG4gICAgc2V0RG9jdW1lbnREcmFnQWN0aXZlLFxuICAgIHNlbGVjdERvY3VtZW50RmlsZSxcbiAgICBjbGVhclNlbGVjdGVkRG9jdW1lbnRGaWxlLFxuICB9ID0gdXNlQXBwQ29udGV4dCgpO1xuICBjb25zdCBzZWxlY3RlZEZpbGUgPSBkb2N1bWVudFVwbG9hZC5zZWxlY3RlZEZpbGU7XG5cbiAgY29uc3QgaGFuZGxlRmlsZSA9IChmaWxlOiBGaWxlIHwgbnVsbCkgPT4ge1xuICAgIHNlbGVjdERvY3VtZW50RmlsZShmaWxlKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVEcm9wID0gKGV2ZW50OiBEcmFnRXZlbnQ8SFRNTERpdkVsZW1lbnQ+KSA9PiB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBzZXREb2N1bWVudERyYWdBY3RpdmUoZmFsc2UpO1xuICAgIGhhbmRsZUZpbGUoZXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzPy5bMF0gPz8gbnVsbCk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlRmlsZUlucHV0ID0gKGV2ZW50OiBDaGFuZ2VFdmVudDxIVE1MSW5wdXRFbGVtZW50PikgPT4ge1xuICAgIGhhbmRsZUZpbGUoZXZlbnQudGFyZ2V0LmZpbGVzPy5bMF0gPz8gbnVsbCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cIm1pbi1oLXNjcmVlbiBiZy1bIzBGMTcyQV0gdGV4dC13aGl0ZVwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJteC1hdXRvIG1heC13LTd4bCBweC02IHB5LTEwXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWItNiBmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC0zXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC83MCBwLTFcIj5cbiAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy8nKX0gY2xhc3NOYW1lPVwicm91bmRlZC14bCBweC00IHB5LTIgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtc2xhdGUtMzAwIHRyYW5zaXRpb24gaG92ZXI6dGV4dC13aGl0ZVwiPlxuICAgICAgICAgICAgICBSaXNrIFdvcmtzcGFjZVxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cInJvdW5kZWQteGwgYmctYmx1ZS02MDAgcHgtNCBweS0yIHRleHQtc20gZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+RG9jdW1lbnQgV29ya3NwYWNlPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PVwic2Vjb25kYXJ5XCIgb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9kb2N1bWVudHMvd29ya3NwYWNlJyl9IGRpc2FibGVkPXshZG9jdW1lbnRHcmFwaC5kYXRhfT5cbiAgICAgICAgICAgIE9wZW4gRG9jdW1lbnQgR3JhcGhcbiAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdhcC0xMCB4bDpncmlkLWNvbHMtWzEuMmZyXzAuOGZyXVwiPlxuICAgICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtWzMycHhdIHB4LTggcHktMTAgbWQ6cHgtMTAgbWQ6cHktMTJcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWItNCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJnLWJsdWUtNTAwLzE1IHAtMyB0ZXh0LWJsdWUtMzAwXCI+XG4gICAgICAgICAgICAgICAgPEZpbGVUZXh0IGNsYXNzTmFtZT1cImgtOCB3LThcIiAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc20gdXBwZXJjYXNlIHRyYWNraW5nLVswLjIyZW1dIHRleHQtYmx1ZS0zMDBcIj5Eb2N1bWVudCBLbm93bGVkZ2UgR3JhcGhzPC9kaXY+XG4gICAgICAgICAgICAgICAgPGgxIGNsYXNzTmFtZT1cIm10LTEgdGV4dC01eGwgZm9udC1ib2xkIHRyYWNraW5nLXRpZ2h0IHRleHQtd2hpdGUgbWQ6dGV4dC02eGxcIj5Ud2luR3JhcGhPcHM8L2gxPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtYXgtdy0zeGwgdGV4dC1sZyBsZWFkaW5nLTggdGV4dC1zbGF0ZS0zMDBcIj5cbiAgICAgICAgICAgICAgVXBsb2FkIGEgUERGLCBtYXJrZG93biwgb3IgdGV4dCBkb2N1bWVudCBhbmQgZXh0cmFjdCBhIGdlbmVyaWMga25vd2xlZGdlIGdyYXBoIHdpdGggZXZpZGVuY2UtYmFja2VkIG5vZGVzLCByZWxhdGlvbnNoaXBzLCBhbmQgc291cmNlIGNodW5rcy5cbiAgICAgICAgICAgIDwvcD5cblxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC04IGZsZXggZmxleC13cmFwIGdhcC0zXCI+XG4gICAgICAgICAgICAgIDxCYWRnZSBjbGFzc05hbWU9XCJib3JkZXItYmx1ZS01MDAvMzAgYmctYmx1ZS01MDAvMTAgdGV4dC1ibHVlLTEwMFwiPkFQSSB7YXBwQ29uZmlnLmFwaUJhc2VVcmx9PC9CYWRnZT5cbiAgICAgICAgICAgICAgPEJhZGdlIGNsYXNzTmFtZT1cImJvcmRlci1zbGF0ZS03MDAgYmctc2xhdGUtOTAwLzgwIHRleHQtc2xhdGUtMjAwXCI+XG4gICAgICAgICAgICAgICAgVXBsb2FkIGxpbWl0IHtNYXRoLnJvdW5kKGFwcENvbmZpZy5tYXhVcGxvYWRCeXRlcyAvIDEwMjQgLyAxMDI0KX0gTUJcbiAgICAgICAgICAgICAgPC9CYWRnZT5cbiAgICAgICAgICAgICAgPEJhZGdlIGNsYXNzTmFtZT1cImJvcmRlci1zbGF0ZS03MDAgYmctc2xhdGUtOTAwLzgwIHRleHQtc2xhdGUtMjAwXCI+UERGIGF1dG8tY29udmVydDwvQmFkZ2U+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0xMiBncmlkIGdhcC02IG1kOmdyaWQtY29scy0zXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMjhweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzU1IHAtNlwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWItNCBmbGV4IGgtMTIgdy0xMiBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC0yeGwgYmctYmx1ZS01MDAvMTUgdGV4dC1ibHVlLTMwMFwiPlxuICAgICAgICAgICAgICAgICAgPFVwbG9hZCBjbGFzc05hbWU9XCJoLTYgdy02XCIgLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj4xLiBVcGxvYWQgRG9jdW1lbnQ8L2gyPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBsZWFkaW5nLTYgdGV4dC1zbGF0ZS00MDBcIj5Vc2UgYC5wZGZgLCBgLm1kYCwgb3IgYC50eHRgOyBQREZzIGJlY29tZSBwYWdlLW1hcmtlZCBtYXJrZG93biBmaXJzdC48L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtWzI4cHhdIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC81NSBwLTZcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgZmxleCBoLTEyIHctMTIgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtMnhsIGJnLXB1cnBsZS01MDAvMTUgdGV4dC1wdXJwbGUtMzAwXCI+XG4gICAgICAgICAgICAgICAgICA8TmV0d29yayBjbGFzc05hbWU9XCJoLTYgdy02XCIgLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj4yLiBCdWlsZCBHcmFwaDwvaDI+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTQwMFwiPlRoZSBiYWNrZW5kIGV4dHJhY3RzIGVudGl0aWVzLCBjb25jZXB0cywgY2xhaW1zLCByZXF1aXJlbWVudHMsIGFuZCByZWxhdGlvbnNoaXBzLjwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMjhweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzU1IHAtNlwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWItNCBmbGV4IGgtMTIgdy0xMiBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC0yeGwgYmctb3JhbmdlLTUwMC8xNSB0ZXh0LW9yYW5nZS0zMDBcIj5cbiAgICAgICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwiaC02IHctNlwiIC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+My4gSW5zcGVjdCBFdmlkZW5jZTwvaDI+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTQwMFwiPlJldmlldyBncmFwaCBub2RlcywgZWRnZXMsIHF1b3RlcywgYW5kIHBhZ2UgcmVmZXJlbmNlcyBpbiBhIGRlZGljYXRlZCB3b3Jrc3BhY2UuPC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgICAgIDxhc2lkZSBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLVszMnB4XSBwLThcIj5cbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPkRvY3VtZW50IEluZ2VzdDwvaDI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gbGVhZGluZy02IHRleHQtc2xhdGUtMzAwXCI+XG4gICAgICAgICAgICAgIFF1ZXVlIG9uZSBkb2N1bWVudCBmb3IgZXh0cmFjdGlvbi4gVGhlIGRvY3VtZW50IGdyYXBoIHdvcmtzcGFjZSByZWZyZXNoZXMgd2hlbiBwcm9jZXNzaW5nIGNvbXBsZXRlcy5cbiAgICAgICAgICAgIDwvcD5cblxuICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICBjbGFzc05hbWU9e2BtdC02IHJvdW5kZWQtWzI4cHhdIGJvcmRlci0yIGJvcmRlci1kYXNoZWQgcC04IHRleHQtY2VudGVyIHRyYW5zaXRpb24gJHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudFVwbG9hZC5waGFzZSA9PT0gJ2RyYWctaG92ZXInXG4gICAgICAgICAgICAgICAgICA/ICdib3JkZXItYmx1ZS00MDAgYmctYmx1ZS01MDAvMTAnXG4gICAgICAgICAgICAgICAgICA6ICdib3JkZXItc2xhdGUtNzAwIGJnLXNsYXRlLTk1MC81MCBob3Zlcjpib3JkZXItc2xhdGUtNTAwJ1xuICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgICAgb25EcmFnT3Zlcj17KGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBzZXREb2N1bWVudERyYWdBY3RpdmUodHJ1ZSk7XG4gICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgIG9uRHJhZ0xlYXZlPXsoKSA9PiBzZXREb2N1bWVudERyYWdBY3RpdmUoZmFsc2UpfVxuICAgICAgICAgICAgICBvbkRyb3A9e2hhbmRsZURyb3B9XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxVcGxvYWQgY2xhc3NOYW1lPVwibXgtYXV0byBoLTE0IHctMTQgdGV4dC1zbGF0ZS00MDBcIiAvPlxuICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwibXQtNCB0ZXh0LXhsIGZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj5VcGxvYWQgRG9jdW1lbnQ8L2gzPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5EcmFnIGFuZCBkcm9wIHlvdXIgZmlsZSBoZXJlIG9yIGJyb3dzZSBsb2NhbGx5LjwvcD5cbiAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgcmVmPXtmaWxlSW5wdXRSZWZ9XG4gICAgICAgICAgICAgICAgdHlwZT1cImZpbGVcIlxuICAgICAgICAgICAgICAgIGFjY2VwdD1cIi5wZGYsLm1kLC50eHQsYXBwbGljYXRpb24vcGRmLHRleHQvcGxhaW4sdGV4dC9tYXJrZG93blwiXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaGlkZGVuXCJcbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17aGFuZGxlRmlsZUlucHV0fVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgZmxleCBmbGV4LXdyYXAganVzdGlmeS1jZW50ZXIgZ2FwLTNcIj5cbiAgICAgICAgICAgICAgICA8QnV0dG9uIHZhcmlhbnQ9XCJzZWNvbmRhcnlcIiBvbkNsaWNrPXsoKSA9PiBmaWxlSW5wdXRSZWYuY3VycmVudD8uY2xpY2soKX0+XG4gICAgICAgICAgICAgICAgICA8RmlsZVRleHQgY2xhc3NOYW1lPVwiaC00IHctNFwiIC8+XG4gICAgICAgICAgICAgICAgICBDaG9vc2UgRmlsZVxuICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgICAgIDxCdXR0b24gb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9kb2N1bWVudHMvcHJvY2Vzc2luZycpfSBkaXNhYmxlZD17IXNlbGVjdGVkRmlsZX0+XG4gICAgICAgICAgICAgICAgICBNYXAgRG9jdW1lbnRcbiAgICAgICAgICAgICAgICAgIDxDaGV2cm9uUmlnaHQgY2xhc3NOYW1lPVwiaC00IHctNFwiIC8+XG4gICAgICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC00IHRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjJlbV0gdGV4dC1zbGF0ZS01MDBcIj5TdXBwb3J0ZWQgZm9ybWF0czogLnBkZiwgLm1kLCBhbmQgLnR4dDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgcm91bmRlZC1bMjhweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzYwIHAtNFwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQganVzdGlmeS1iZXR3ZWVuIGdhcC00XCI+XG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNTAwXCI+U2VsZWN0ZWQgRmlsZTwvcD5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+e3NlbGVjdGVkRmlsZT8ubmFtZSA/PyAnTm8gZmlsZSBzZWxlY3RlZC4nfTwvcD5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTEgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICB7c2VsZWN0ZWRGaWxlID8gZm9ybWF0RmlsZVNpemUoc2VsZWN0ZWRGaWxlLnNpemUpIDogJ0Nob29zZSBhIGRvY3VtZW50IHRvIGJlZ2luLid9XG4gICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAge3NlbGVjdGVkRmlsZSA/IChcbiAgICAgICAgICAgICAgICAgIDxCdXR0b24gdmFyaWFudD1cImdob3N0XCIgb25DbGljaz17Y2xlYXJTZWxlY3RlZERvY3VtZW50RmlsZX0+XG4gICAgICAgICAgICAgICAgICAgIENsZWFyXG4gICAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC02XCI+XG4gICAgICAgICAgICAgIDxTdGF0dXNCYW5uZXJcbiAgICAgICAgICAgICAgICB0b25lPXtkb2N1bWVudFVwbG9hZC5lcnJvciA/ICdlcnJvcicgOiBkb2N1bWVudEdyYXBoLmRhdGEgPyAnc3VjY2VzcycgOiAnaW5mbyd9XG4gICAgICAgICAgICAgICAgbWVzc2FnZT17ZG9jdW1lbnRVcGxvYWQuZXJyb3IgfHwgZG9jdW1lbnRVcGxvYWQuc3RhdHVzTWVzc2FnZSB8fCAnVXBsb2FkIGEgZG9jdW1lbnQgdG8gY29udGludWUuJ31cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvYXNpZGU+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iLCAiaW1wb3J0IHsgQm94ZXMsIEZpbGVUZXh0LCBHaXRCcmFuY2gsIFF1b3RlIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB0eXBlIHsgRG9jdW1lbnRHcmFwaERhdGEgfSBmcm9tICcuLi90eXBlcy9hcHAnO1xuaW1wb3J0IHsgZm9ybWF0TGFiZWwsIGdldERvY3VtZW50S2luZENvbG9yIH0gZnJvbSAnLi4vbGliL3NlbGVjdG9ycyc7XG5cbmludGVyZmFjZSBEb2N1bWVudE92ZXJ2aWV3UHJvcHMge1xuICBncmFwaERhdGE6IERvY3VtZW50R3JhcGhEYXRhO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBEb2N1bWVudE92ZXJ2aWV3KHsgZ3JhcGhEYXRhIH06IERvY3VtZW50T3ZlcnZpZXdQcm9wcykge1xuICBjb25zdCBraW5kQ291bnRzID0gZ3JhcGhEYXRhLm5vZGVzLnJlZHVjZTxSZWNvcmQ8c3RyaW5nLCBudW1iZXI+PigoY291bnRzLCBub2RlKSA9PiB7XG4gICAgY291bnRzW25vZGUua2luZF0gPSAoY291bnRzW25vZGUua2luZF0gPz8gMCkgKyAxO1xuICAgIHJldHVybiBjb3VudHM7XG4gIH0sIHt9KTtcbiAgY29uc3Qga2luZERpc3RyaWJ1dGlvbiA9IE9iamVjdC5lbnRyaWVzKGtpbmRDb3VudHMpXG4gICAgLm1hcCgoW2tpbmQsIGNvdW50XSkgPT4gKHsga2luZCwgY291bnQgfSkpXG4gICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5jb3VudCAtIGxlZnQuY291bnQpO1xuICBjb25zdCB0b3RhbEV2aWRlbmNlID1cbiAgICBncmFwaERhdGEubm9kZXMucmVkdWNlKChzdW0sIG5vZGUpID0+IHN1bSArIG5vZGUuZXZpZGVuY2UubGVuZ3RoLCAwKSArXG4gICAgZ3JhcGhEYXRhLmxpbmtzLnJlZHVjZSgoc3VtLCBlZGdlKSA9PiBzdW0gKyBlZGdlLmV2aWRlbmNlLmxlbmd0aCwgMCk7XG4gIGNvbnN0IG1vc3RDb25uZWN0ZWQgPSBbLi4uZ3JhcGhEYXRhLm5vZGVzXS5zb3J0KChsZWZ0LCByaWdodCkgPT4gcmlnaHQuZGVncmVlIC0gbGVmdC5kZWdyZWUpLnNsaWNlKDAsIDUpO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgb3ZlcmZsb3cteS1hdXRvIHAtNiBtZDpwLThcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXgtYXV0byBtYXgtdy03eGwgc3BhY2UteS04XCI+XG4gICAgICAgIDxkaXY+XG4gICAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYm9sZCB0ZXh0LXdoaXRlXCI+RG9jdW1lbnQgT3ZlcnZpZXc8L2gxPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgbWF4LXctM3hsIHRleHQtc20gbGVhZGluZy03IHRleHQtc2xhdGUtMzAwXCI+XG4gICAgICAgICAgICBTdW1tYXJ5IGNhcmRzIGFuZCBicmVha2Rvd25zIGFyZSBjb21wdXRlZCBkaXJlY3RseSBmcm9tIHRoZSBhY3RpdmUgZG9jdW1lbnQgZ3JhcGguXG4gICAgICAgICAgPC9wPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ2FwLTQgbWQ6Z3JpZC1jb2xzLTIgeGw6Z3JpZC1jb2xzLTRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgICAgICAgPEJveGVzIGNsYXNzTmFtZT1cImgtOCB3LTggdGV4dC1ibHVlLTMwMFwiIC8+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntncmFwaERhdGEubm9kZXMubGVuZ3RofTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMyB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+RG9jdW1lbnQgTm9kZXM8L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLTN4bCBwLTVcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgICAgICAgIDxHaXRCcmFuY2ggY2xhc3NOYW1lPVwiaC04IHctOCB0ZXh0LXB1cnBsZS0zMDBcIiAvPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LTR4bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57Z3JhcGhEYXRhLmxpbmtzLmxlbmd0aH08L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlJlbGF0aW9uc2hpcHM8L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLTN4bCBwLTVcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgICAgICAgIDxRdW90ZSBjbGFzc05hbWU9XCJoLTggdy04IHRleHQtb3JhbmdlLTMwMFwiIC8+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPnt0b3RhbEV2aWRlbmNlfTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMyB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+RXZpZGVuY2UgSXRlbXM8L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLTN4bCBwLTVcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgICAgICAgIDxGaWxlVGV4dCBjbGFzc05hbWU9XCJoLTggdy04IHRleHQtZW1lcmFsZC0zMDBcIiAvPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LTR4bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57Z3JhcGhEYXRhLmtpbmRUeXBlcy5sZW5ndGh9PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5Ob2RlIEtpbmRzPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLTN4bCBwLTZcIj5cbiAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC14bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj5Nb3N0IENvbm5lY3RlZCBEb2N1bWVudCBOb2RlczwvaDI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC02IHNwYWNlLXktNFwiPlxuICAgICAgICAgICAge21vc3RDb25uZWN0ZWQubWFwKChub2RlLCBpbmRleCkgPT4gKFxuICAgICAgICAgICAgICA8ZGl2IGtleT17bm9kZS5pZH0gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHJvdW5kZWQtM3hsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC83MCBwLTRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC00XCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaC0xMCB3LTEwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLTJ4bCBiZy1ibHVlLTUwMC8xNSB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1ibHVlLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICB7aW5kZXggKyAxfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntub2RlLmNhbm9uaWNhbE5hbWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAge2Zvcm1hdExhYmVsKG5vZGUua2luZCl9IHwge25vZGUuaWR9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXJpZ2h0XCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC1ibHVlLTMwMFwiPntub2RlLmRlZ3JlZX08L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS01MDBcIj5Db25uZWN0aW9uczwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC02XCI+XG4gICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+S2luZCBCcmVha2Rvd248L2gyPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiBncmlkIGdhcC00IG1kOmdyaWQtY29scy0yXCI+XG4gICAgICAgICAgICB7a2luZERpc3RyaWJ1dGlvbi5tYXAoKGVudHJ5KSA9PiAoXG4gICAgICAgICAgICAgIDxkaXYga2V5PXtlbnRyeS5raW5kfSBjbGFzc05hbWU9XCJyb3VuZGVkLTN4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNzAgcC00XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTNcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaC0zIHctMyByb3VuZGVkLWZ1bGxcIiBzdHlsZT17eyBiYWNrZ3JvdW5kQ29sb3I6IGdldERvY3VtZW50S2luZENvbG9yKGVudHJ5LmtpbmQpIH19IC8+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj57Zm9ybWF0TGFiZWwoZW50cnkua2luZCl9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntlbnRyeS5jb3VudH08L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKSl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuIiwgImltcG9ydCBhc3NlcnQgZnJvbSAnbm9kZTphc3NlcnQvc3RyaWN0JztcclxuaW1wb3J0IHRlc3QgZnJvbSAnbm9kZTp0ZXN0JztcclxuaW1wb3J0IHR5cGUgeyBSZWFjdE5vZGUgfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCB7IHJlbmRlclRvU3RhdGljTWFya3VwIH0gZnJvbSAncmVhY3QtZG9tL3NlcnZlcic7XHJcbmltcG9ydCB7IE1lbW9yeVJvdXRlciB9IGZyb20gJ3JlYWN0LXJvdXRlci1kb20nO1xyXG5pbXBvcnQgeyBjcmVhdGVNb2NrQ29udGV4dCwgY3JlYXRlU2FtcGxlRG9jdW1lbnRHcmFwaERhdGEsIGNyZWF0ZVNhbXBsZUdyYXBoRGF0YSwgaW5zdGFsbFJ1bnRpbWVXaW5kb3dDb25maWcgfSBmcm9tICcuL3Rlc3QtdXRpbHMnO1xuXHJcbmluc3RhbGxSdW50aW1lV2luZG93Q29uZmlnKCk7XHJcblxyXG5jb25zdCB7IEFwcENvbnRleHQgfSA9IGF3YWl0IGltcG9ydCgnLi4vc3JjL3N0YXRlL0FwcENvbnRleHQnKTtcclxuY29uc3QgeyBkZWZhdWx0OiBMYW5kaW5nUGFnZSB9ID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvcGFnZXMvTGFuZGluZ1BhZ2UnKTtcclxuY29uc3QgeyBkZWZhdWx0OiBQcm9jZXNzaW5nUGFnZSB9ID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvcGFnZXMvUHJvY2Vzc2luZ1BhZ2UnKTtcbmNvbnN0IHsgZGVmYXVsdDogU3lzdGVtT3ZlcnZpZXcgfSA9IGF3YWl0IGltcG9ydCgnLi4vc3JjL2NvbXBvbmVudHMvU3lzdGVtT3ZlcnZpZXcnKTtcbmNvbnN0IHsgZGVmYXVsdDogRG9jdW1lbnRVcGxvYWRQYWdlIH0gPSBhd2FpdCBpbXBvcnQoJy4uL3NyYy9wYWdlcy9Eb2N1bWVudFVwbG9hZFBhZ2UnKTtcbmNvbnN0IHsgZGVmYXVsdDogRG9jdW1lbnRPdmVydmlldyB9ID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvY29tcG9uZW50cy9Eb2N1bWVudE92ZXJ2aWV3Jyk7XG5cclxuZnVuY3Rpb24gcmVuZGVyV2l0aENvbnRleHQoXHJcbiAgZWxlbWVudDogUmVhY3ROb2RlLFxyXG4gIGNvbnRleHRPdmVycmlkZXMgPSB7fSxcclxuICBpbml0aWFsRW50cmllcyA9IFsnLyddXHJcbikge1xyXG4gIHJldHVybiByZW5kZXJUb1N0YXRpY01hcmt1cChcclxuICAgIDxNZW1vcnlSb3V0ZXIgaW5pdGlhbEVudHJpZXM9e2luaXRpYWxFbnRyaWVzfT5cclxuICAgICAgPEFwcENvbnRleHQuUHJvdmlkZXIgdmFsdWU9e2NyZWF0ZU1vY2tDb250ZXh0KGNvbnRleHRPdmVycmlkZXMpfT57ZWxlbWVudH08L0FwcENvbnRleHQuUHJvdmlkZXI+XHJcbiAgICA8L01lbW9yeVJvdXRlcj5cclxuICApO1xyXG59XHJcblxyXG50ZXN0KCdsYW5kaW5nIHBhZ2UgcmVuZGVycyB0aGUgdXBsb2FkIHdvcmtzcGFjZSBjb250ZW50JywgKCkgPT4ge1xuICBjb25zdCBodG1sID0gcmVuZGVyV2l0aENvbnRleHQoPExhbmRpbmdQYWdlIC8+KTtcclxuXHJcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9Ud2luR3JhcGhPcHMvKTtcclxuICBhc3NlcnQubWF0Y2goaHRtbCwgL1VwbG9hZCBTeXN0ZW0gRG9jdW1lbnRhdGlvbi8pO1xyXG4gIGFzc2VydC5tYXRjaChodG1sLCAvU3VwcG9ydGVkIGZvcm1hdHM6IFxcLm1kIGFuZCBcXC50eHQvKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9Eb2N1bWVudCBXb3Jrc3BhY2UvKTtcbn0pO1xuXHJcbnRlc3QoJ3Byb2Nlc3NpbmcgcGFnZSByZW5kZXJzIHRoZSBhY3RpdmUgcHJvY2Vzc2luZyBzdGF0ZScsICgpID0+IHtcclxuICBjb25zdCBodG1sID0gcmVuZGVyV2l0aENvbnRleHQoXHJcbiAgICA8UHJvY2Vzc2luZ1BhZ2UgLz4sXHJcbiAgICB7XHJcbiAgICAgIHVwbG9hZDoge1xyXG4gICAgICAgIC4uLmNyZWF0ZU1vY2tDb250ZXh0KCkudXBsb2FkLFxyXG4gICAgICAgIHBoYXNlOiAndXBsb2FkaW5nJyxcclxuICAgICAgICBzZWxlY3RlZEZpbGU6IG5ldyBGaWxlKFsnaGVsbG8nXSwgJ3N5c3RlbS5tZCcsIHsgdHlwZTogJ3RleHQvbWFya2Rvd24nIH0pLFxyXG4gICAgICAgIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWRpbmcgc3lzdGVtLm1kLi4uJyxcclxuICAgICAgICBzdGFydGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgWycvcHJvY2Vzc2luZyddXHJcbiAgKTtcclxuXHJcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9Qcm9jZXNzaW5nIFlvdXIgRG9jdW1lbnRhdGlvbi8pO1xyXG4gIGFzc2VydC5tYXRjaChodG1sLCAvVXBsb2FkaW5nIGRvY3VtZW50Lyk7XHJcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9VcGxvYWRpbmcgc3lzdGVtXFwubWQvKTtcclxufSk7XHJcblxyXG50ZXN0KCdzeXN0ZW0gb3ZlcnZpZXcgcmVuZGVycyB0aGUgbG9hZGVkIHdvcmtzcGFjZSBzdW1tYXJ5JywgKCkgPT4ge1xuICBjb25zdCBncmFwaERhdGEgPSBjcmVhdGVTYW1wbGVHcmFwaERhdGEoKTtcclxuICBjb25zdCBodG1sID0gcmVuZGVyVG9TdGF0aWNNYXJrdXAoPFN5c3RlbU92ZXJ2aWV3IGdyYXBoRGF0YT17Z3JhcGhEYXRhfSAvPik7XHJcblxyXG4gIGFzc2VydC5tYXRjaChodG1sLCAvU3lzdGVtIE92ZXJ2aWV3Lyk7XHJcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9Ub3RhbCBDb21wb25lbnRzLyk7XHJcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9SZWxhdGlvbnNoaXBzLyk7XHJcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9Nb3N0IENvbm5lY3RlZCBDb21wb25lbnRzLyk7XHJcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9BUEkgU2VydmljZS8pO1xyXG59KTtcblxudGVzdCgnZG9jdW1lbnQgdXBsb2FkIHBhZ2UgcmVuZGVycyBwZGYgbWFya2Rvd24gYW5kIHRleHQgc3VwcG9ydCcsICgpID0+IHtcbiAgY29uc3QgaHRtbCA9IHJlbmRlcldpdGhDb250ZXh0KDxEb2N1bWVudFVwbG9hZFBhZ2UgLz4sIHt9LCBbJy9kb2N1bWVudHMnXSk7XG5cbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9Eb2N1bWVudCBLbm93bGVkZ2UgR3JhcGhzLyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvU3VwcG9ydGVkIGZvcm1hdHM6IFxcLnBkZiwgXFwubWQsIGFuZCBcXC50eHQvKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9SaXNrIFdvcmtzcGFjZS8pO1xufSk7XG5cbnRlc3QoJ2RvY3VtZW50IG92ZXJ2aWV3IHJlbmRlcnMgdGhlIGxvYWRlZCBkb2N1bWVudCBncmFwaCBzdW1tYXJ5JywgKCkgPT4ge1xuICBjb25zdCBncmFwaERhdGEgPSBjcmVhdGVTYW1wbGVEb2N1bWVudEdyYXBoRGF0YSgpO1xuICBjb25zdCBodG1sID0gcmVuZGVyVG9TdGF0aWNNYXJrdXAoPERvY3VtZW50T3ZlcnZpZXcgZ3JhcGhEYXRhPXtncmFwaERhdGF9IC8+KTtcblxuICBhc3NlcnQubWF0Y2goaHRtbCwgL0RvY3VtZW50IE92ZXJ2aWV3Lyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvRG9jdW1lbnQgTm9kZXMvKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9FdmlkZW5jZSBJdGVtcy8pO1xuICBhc3NlcnQubWF0Y2goaHRtbCwgL1JldGVudGlvbiBQb2xpY3kvKTtcbn0pO1xuIiwgImV4cG9ydCBmdW5jdGlvbiBpbnN0YWxsUnVudGltZVdpbmRvd0NvbmZpZyhvdmVycmlkZXM6IFBhcnRpYWw8UmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyPj4gPSB7fSkge1xyXG4gIGNvbnN0IHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IChjYWxsYmFjazogRnJhbWVSZXF1ZXN0Q2FsbGJhY2spID0+IHNldFRpbWVvdXQoKCkgPT4gY2FsbGJhY2soRGF0ZS5ub3coKSksIDApO1xyXG4gIGNvbnN0IGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKGhhbmRsZTogbnVtYmVyKSA9PiBjbGVhclRpbWVvdXQoaGFuZGxlKTtcclxuXHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICd3aW5kb3cnLCB7XHJcbiAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICB3cml0YWJsZTogdHJ1ZSxcclxuICAgIHZhbHVlOiB7XHJcbiAgICAgIF9fVFdJTl9DT05GSUdfXzoge1xyXG4gICAgICAgIE1BWF9VUExPQURfTUI6IDEwLFxyXG4gICAgICAgIFBST0NFU1NJTkdfVElNRU9VVF9NUzogOTAwMDAsXHJcbiAgICAgICAgQVBQX0VOVjogJ3Rlc3QnLFxyXG4gICAgICAgIC4uLm92ZXJyaWRlcyxcclxuICAgICAgfSxcclxuICAgICAgc2V0VGltZW91dCxcclxuICAgICAgY2xlYXJUaW1lb3V0LFxyXG4gICAgICBzZXRJbnRlcnZhbCxcclxuICAgICAgY2xlYXJJbnRlcnZhbCxcclxuICAgICAgYWRkRXZlbnRMaXN0ZW5lcjogKCkgPT4ge30sXHJcbiAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6ICgpID0+IHt9LFxyXG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXHJcbiAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lLFxyXG4gICAgICBkZXZpY2VQaXhlbFJhdGlvOiAxLFxyXG4gICAgfSxcclxuICB9KTtcclxuXHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICdkb2N1bWVudCcsIHtcclxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIHdyaXRhYmxlOiB0cnVlLFxyXG4gICAgdmFsdWU6IHtcclxuICAgICAgY3JlYXRlRWxlbWVudDogKCkgPT4gKHtcclxuICAgICAgICBnZXRDb250ZXh0OiAoKSA9PiAoe30pLFxyXG4gICAgICAgIHN0eWxlOiB7fSxcclxuICAgICAgICBzZXRBdHRyaWJ1dGU6ICgpID0+IHt9LFxyXG4gICAgICAgIGFwcGVuZENoaWxkOiAoKSA9PiB7fSxcclxuICAgICAgfSksXHJcbiAgICAgIGJvZHk6IHtcclxuICAgICAgICBhcHBlbmRDaGlsZDogKCkgPT4ge30sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0pO1xyXG5cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ25hdmlnYXRvcicsIHtcclxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIHdyaXRhYmxlOiB0cnVlLFxyXG4gICAgdmFsdWU6IHtcclxuICAgICAgdXNlckFnZW50OiAnbm9kZS5qcycsXHJcbiAgICB9LFxyXG4gIH0pO1xyXG5cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ3JlcXVlc3RBbmltYXRpb25GcmFtZScsIHtcclxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIHdyaXRhYmxlOiB0cnVlLFxyXG4gICAgdmFsdWU6IHJlcXVlc3RBbmltYXRpb25GcmFtZSxcclxuICB9KTtcclxuXHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICdjYW5jZWxBbmltYXRpb25GcmFtZScsIHtcclxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIHdyaXRhYmxlOiB0cnVlLFxyXG4gICAgdmFsdWU6IGNhbmNlbEFuaW1hdGlvbkZyYW1lLFxyXG4gIH0pO1xyXG5cclxuICBpZiAoISgnUmVzaXplT2JzZXJ2ZXInIGluIGdsb2JhbFRoaXMpKSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ1Jlc2l6ZU9ic2VydmVyJywge1xyXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxyXG4gICAgICB2YWx1ZTogY2xhc3MgUmVzaXplT2JzZXJ2ZXIge1xyXG4gICAgICAgIG9ic2VydmUoKSB7fVxyXG4gICAgICAgIHVub2JzZXJ2ZSgpIHt9XHJcbiAgICAgICAgZGlzY29ubmVjdCgpIHt9XHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTYW1wbGVHcmFwaERhdGEoKSB7XG4gIGNvbnN0IG5vZGVzID0gW1xyXG4gICAge1xyXG4gICAgICBpZDogJ2FwaScsXHJcbiAgICAgIG5hbWU6ICdBUEkgU2VydmljZScsXHJcbiAgICAgIHR5cGU6ICdzb2Z0d2FyZScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29yZSBBUEknLFxyXG4gICAgICByaXNrU2NvcmU6IDgyLFxyXG4gICAgICByaXNrTGV2ZWw6ICdoaWdoJyxcclxuICAgICAgZGVncmVlOiAyLFxyXG4gICAgICBiZXR3ZWVubmVzczogMC41NSxcclxuICAgICAgY2xvc2VuZXNzOiAwLjY3LFxyXG4gICAgICBibGFzdFJhZGl1czogMyxcclxuICAgICAgZGVwZW5kZW5jeVNwYW46IDIsXHJcbiAgICAgIHJpc2tFeHBsYW5hdGlvbjogJ0hhbmRsZXMgY29yZSByZXF1ZXN0cy4nLFxyXG4gICAgICBzb3VyY2U6ICdzYW1wbGUnLFxyXG4gICAgICBkZXBlbmRlbmNpZXM6IFsnZGInXSxcclxuICAgICAgZGVwZW5kZW50czogWydmcm9udGVuZCddLFxyXG4gICAgICB2YWw6IDM2LFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgaWQ6ICdkYicsXHJcbiAgICAgIG5hbWU6ICdEYXRhYmFzZScsXHJcbiAgICAgIHR5cGU6ICdkYXRhJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdQZXJzaXN0ZW5jZSBsYXllcicsXHJcbiAgICAgIHJpc2tTY29yZTogNDQsXHJcbiAgICAgIHJpc2tMZXZlbDogJ21lZGl1bScsXHJcbiAgICAgIGRlZ3JlZTogMSxcclxuICAgICAgYmV0d2Vlbm5lc3M6IDAuMjIsXHJcbiAgICAgIGNsb3NlbmVzczogMC40NCxcclxuICAgICAgYmxhc3RSYWRpdXM6IDEsXHJcbiAgICAgIGRlcGVuZGVuY3lTcGFuOiAxLFxyXG4gICAgICByaXNrRXhwbGFuYXRpb246ICdTdG9yZXMgcmVjb3Jkcy4nLFxyXG4gICAgICBzb3VyY2U6ICdzYW1wbGUnLFxyXG4gICAgICBkZXBlbmRlbmNpZXM6IFtdLFxyXG4gICAgICBkZXBlbmRlbnRzOiBbJ2FwaSddLFxyXG4gICAgICB2YWw6IDI4LFxyXG4gICAgfSxcclxuICBdO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgc291cmNlOiAnc2FtcGxlJyxcclxuICAgIG5vZGVzLFxyXG4gICAgbGlua3M6IFtcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAnYXBpLWRiLTAnLFxyXG4gICAgICAgIHNvdXJjZTogJ2FwaScsXHJcbiAgICAgICAgdGFyZ2V0OiAnZGInLFxyXG4gICAgICAgIHJlbGF0aW9uOiAnZGVwZW5kc19vbicsXHJcbiAgICAgICAgcmF0aW9uYWxlOiAnUmVhZHMgYW5kIHdyaXRlcyByZWNvcmRzLicsXHJcbiAgICAgIH0sXHJcbiAgICBdLFxyXG4gICAgbm9kZUluZGV4OiBPYmplY3QuZnJvbUVudHJpZXMobm9kZXMubWFwKChub2RlKSA9PiBbbm9kZS5pZCwgbm9kZV0pKSxcclxuICAgIHJlbGF0aW9uVHlwZXM6IFsnZGVwZW5kc19vbiddLFxyXG4gIH07XHJcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNhbXBsZURvY3VtZW50R3JhcGhEYXRhKCkge1xuICBjb25zdCBub2RlcyA9IFtcbiAgICB7XG4gICAgICBpZDogJ0QxJyxcbiAgICAgIGxhYmVsOiAnUmV0ZW50aW9uIFBvbGljeScsXG4gICAgICBraW5kOiAncmVxdWlyZW1lbnQnLFxuICAgICAgY2Fub25pY2FsTmFtZTogJ1JldGVudGlvbiBQb2xpY3knLFxuICAgICAgYWxpYXNlczogWydyZWNvcmRzIHBvbGljeSddLFxuICAgICAgc3VtbWFyeTogJ0RlZmluZXMgcmVjb3JkIHJldGVudGlvbi4nLFxuICAgICAgZXZpZGVuY2U6IFt7IHF1b3RlOiAnUmVjb3JkcyBhcmUgcmV0YWluZWQgZm9yIDcgeWVhcnMuJywgcGFnZVN0YXJ0OiAxLCBwYWdlRW5kOiAxIH1dLFxuICAgICAgc291cmNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgZG9jdW1lbnROYW1lOiAncG9saWN5LnBkZicsXG4gICAgICAgICAgY2h1bmtGaWxlOiAnY2h1bmtfMDEudHh0JyxcbiAgICAgICAgICBjaHVua0lkOiAnY2h1bmtfMDEnLFxuICAgICAgICAgIHBkZlBhZ2VTdGFydDogMSxcbiAgICAgICAgICBwZGZQYWdlRW5kOiAxLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGRlZ3JlZTogMSxcbiAgICAgIHNvdXJjZTogJ2RvY3VtZW50JyxcbiAgICAgIHZhbDogMjAsXG4gICAgfSxcbiAgICB7XG4gICAgICBpZDogJ0QyJyxcbiAgICAgIGxhYmVsOiAnU2V2ZW4gWWVhcnMnLFxuICAgICAga2luZDogJ2RhdGUnLFxuICAgICAgY2Fub25pY2FsTmFtZTogJ1NldmVuIFllYXJzJyxcbiAgICAgIGFsaWFzZXM6IFtdLFxuICAgICAgc3VtbWFyeTogJ1JldGVudGlvbiBkdXJhdGlvbi4nLFxuICAgICAgZXZpZGVuY2U6IFt7IHF1b3RlOiAnNyB5ZWFycycsIHBhZ2VTdGFydDogMSwgcGFnZUVuZDogMSB9XSxcbiAgICAgIHNvdXJjZXM6IFtdLFxuICAgICAgZGVncmVlOiAxLFxuICAgICAgc291cmNlOiAnZG9jdW1lbnQnLFxuICAgICAgdmFsOiAyMCxcbiAgICB9LFxuICBdO1xuXG4gIHJldHVybiB7XG4gICAgc291cmNlOiAnZG9jdW1lbnQnLFxuICAgIG5vZGVzLFxuICAgIGxpbmtzOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnREUxJyxcbiAgICAgICAgc291cmNlOiAnRDEnLFxuICAgICAgICB0YXJnZXQ6ICdEMicsXG4gICAgICAgIHR5cGU6ICdyZXF1aXJlcycsXG4gICAgICAgIHN1bW1hcnk6ICdSZXRlbnRpb24gcG9saWN5IHJlcXVpcmVzIHNldmVuIHllYXJzLicsXG4gICAgICAgIGV2aWRlbmNlOiBbeyBxdW90ZTogJ3JldGFpbmVkIGZvciA3IHllYXJzJywgcGFnZVN0YXJ0OiAxLCBwYWdlRW5kOiAxIH1dLFxuICAgICAgICBzb3VyY2VDaHVuazoge1xuICAgICAgICAgIGRvY3VtZW50TmFtZTogJ3BvbGljeS5wZGYnLFxuICAgICAgICAgIGNodW5rRmlsZTogJ2NodW5rXzAxLnR4dCcsXG4gICAgICAgICAgY2h1bmtJZDogJ2NodW5rXzAxJyxcbiAgICAgICAgICBwZGZQYWdlU3RhcnQ6IDEsXG4gICAgICAgICAgcGRmUGFnZUVuZDogMSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgXSxcbiAgICBub2RlSW5kZXg6IE9iamVjdC5mcm9tRW50cmllcyhub2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLmlkLCBub2RlXSkpLFxuICAgIGtpbmRUeXBlczogWydkYXRlJywgJ3JlcXVpcmVtZW50J10sXG4gICAgcmVsYXRpb25UeXBlczogWydyZXF1aXJlcyddLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTW9ja0NvbnRleHQob3ZlcnJpZGVzID0ge30pIHtcbiAgcmV0dXJuIHtcclxuICAgIHVwbG9hZDoge1xyXG4gICAgICBwaGFzZTogJ2lkbGUnLFxyXG4gICAgICBzZWxlY3RlZEZpbGU6IG51bGwsXHJcbiAgICAgIGVycm9yOiBudWxsLFxyXG4gICAgICBzdGF0dXNNZXNzYWdlOiAnVXBsb2FkIGEgLm1kIG9yIC50eHQgZmlsZSB0byBidWlsZCB0aGUgZ3JhcGguJyxcclxuICAgICAgaW5nZXN0aW9uSWQ6IG51bGwsXHJcbiAgICAgIGluZ2VzdGlvbjogbnVsbCxcclxuICAgICAgcHJvY2Vzc2luZ1N0YXR1czogbnVsbCxcclxuICAgICAgc3RhcnRlZEF0OiBudWxsLFxyXG4gICAgICBjb21wbGV0ZWRBdDogbnVsbCxcclxuICAgICAgcmV0cnlDb3VudDogMCxcclxuICAgIH0sXHJcbiAgICBncmFwaDoge1xuICAgICAgc3RhdHVzOiAnaWRsZScsXG4gICAgICBkYXRhOiBudWxsLFxuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBsYXN0TG9hZGVkQXQ6IG51bGwsXG4gICAgfSxcbiAgICBkb2N1bWVudFVwbG9hZDoge1xuICAgICAgcGhhc2U6ICdpZGxlJyxcbiAgICAgIHNlbGVjdGVkRmlsZTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgc3RhdHVzTWVzc2FnZTogJ1VwbG9hZCBhIC5wZGYsIC5tZCwgb3IgLnR4dCBmaWxlIHRvIGJ1aWxkIGEgZG9jdW1lbnQgZ3JhcGguJyxcbiAgICAgIGluZ2VzdGlvbklkOiBudWxsLFxuICAgICAgaW5nZXN0aW9uOiBudWxsLFxuICAgICAgcHJvY2Vzc2luZ1N0YXR1czogbnVsbCxcbiAgICAgIHN0YXJ0ZWRBdDogbnVsbCxcbiAgICAgIGNvbXBsZXRlZEF0OiBudWxsLFxuICAgICAgcmV0cnlDb3VudDogMCxcbiAgICB9LFxuICAgIGRvY3VtZW50R3JhcGg6IHtcbiAgICAgIHN0YXR1czogJ2lkbGUnLFxuICAgICAgZGF0YTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxuICAgIH0sXG4gICAgc2V0RHJhZ0FjdGl2ZTogKCkgPT4ge30sXG4gICAgc2VsZWN0RmlsZTogKCkgPT4gdHJ1ZSxcbiAgICBjbGVhclNlbGVjdGVkRmlsZTogKCkgPT4ge30sXG4gICAgYmVnaW5Qcm9jZXNzaW5nOiBhc3luYyAoKSA9PiB7fSxcbiAgICBsb2FkR3JhcGg6IGFzeW5jICgpID0+IHt9LFxuICAgIHNldERvY3VtZW50RHJhZ0FjdGl2ZTogKCkgPT4ge30sXG4gICAgc2VsZWN0RG9jdW1lbnRGaWxlOiAoKSA9PiB0cnVlLFxuICAgIGNsZWFyU2VsZWN0ZWREb2N1bWVudEZpbGU6ICgpID0+IHt9LFxuICAgIGJlZ2luRG9jdW1lbnRQcm9jZXNzaW5nOiBhc3luYyAoKSA9PiB7fSxcbiAgICBsb2FkRG9jdW1lbnRHcmFwaDogYXN5bmMgKCkgPT4ge30sXG4gICAgcmVzZXRVcGxvYWRTdGF0ZTogKCkgPT4ge30sXG4gICAgLi4ub3ZlcnJpZGVzLFxuICB9O1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUF5QkEsU0FBUyxhQUFhLE9BQWdCLE9BQWU7QUFDbkQsTUFBSSxPQUFPLFVBQVUsVUFBVTtBQUM3QixVQUFNLElBQUksTUFBTSxvQ0FBb0MsS0FBSyxrQkFBa0I7QUFBQSxFQUM3RTtBQUNBLFNBQU87QUFDVDtBQUVBLFNBQVMsYUFBYSxPQUFnQixPQUFlO0FBQ25ELE1BQUksT0FBTyxVQUFVLFlBQVksT0FBTyxNQUFNLEtBQUssR0FBRztBQUNwRCxVQUFNLElBQUksTUFBTSxvQ0FBb0MsS0FBSyxrQkFBa0I7QUFBQSxFQUM3RTtBQUNBLFNBQU87QUFDVDtBQUVBLFNBQVMsWUFBZSxPQUFnQixPQUFlO0FBQ3JELE1BQUksQ0FBQyxNQUFNLFFBQVEsS0FBSyxH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RCxRQUFNLE9BQU8scUJBQXFCLGdCQUFBTCxNQUFDTSxtQkFBQSxFQUFpQixXQUFzQixDQUFFO0FBRTVFLFNBQU8sTUFBTSxNQUFNLG1CQUFtQjtBQUN0QyxTQUFPLE1BQU0sTUFBTSxnQkFBZ0I7QUFDbkMsU0FBTyxNQUFNLE1BQU0sZ0JBQWdCO0FBQ25DLFNBQU8sTUFBTSxNQUFNLGtCQUFrQjtBQUN2QyxDQUFDOyIsCiAgIm5hbWVzIjogWyJqc3giLCAianN4IiwgImpzeCIsICJ1c2VSZWYiLCAianN4IiwgImpzeHMiLCAiQ2hlY2tDaXJjbGUyIiwgImpzeCIsICJqc3hzIiwgInVzZU1lbW8iLCAidXNlU3RhdGUiLCAiQ2hlY2tDaXJjbGUyIiwgIkxvYWRlcjIiLCAiTmV0d29yayIsICJ1c2VOYXZpZ2F0ZSIsICJqc3giLCAianN4cyIsICJBbGVydFRyaWFuZ2xlIiwgImpzeCIsICJqc3hzIiwgInVzZVJlZiIsICJDaGV2cm9uUmlnaHQiLCAiRmlsZVRleHQiLCAiTmV0d29yayIsICJTaGllbGQiLCAiVXBsb2FkIiwgInVzZU5hdmlnYXRlIiwgImpzeCIsICJqc3hzIiwgImZvcm1hdEZpbGVTaXplIiwgIkJveGVzIiwgIkZpbGVUZXh0IiwgIkdpdEJyYW5jaCIsICJqc3giLCAianN4cyIsICJqc3giLCAiQXBwQ29udGV4dCIsICJMYW5kaW5nUGFnZSIsICJQcm9jZXNzaW5nUGFnZSIsICJTeXN0ZW1PdmVydmlldyIsICJEb2N1bWVudFVwbG9hZFBhZ2UiLCAiRG9jdW1lbnRPdmVydmlldyJdCn0K
