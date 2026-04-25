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

// tests/upload-state.test.ts
import assert from "node:assert/strict";
import test from "node:test";

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

// tests/upload-state.test.ts
installRuntimeWindowConfig();
var stateModule = await Promise.resolve().then(() => (init_AppContext(), AppContext_exports));
var {
  createSelectedDocumentFileUploadState: createSelectedDocumentFileUploadState2,
  createSelectedFileUploadState: createSelectedFileUploadState2,
  getFileExtension: getFileExtension2,
  validateSelectedDocumentFile: validateSelectedDocumentFile2,
  validateSelectedFile: validateSelectedFile2
} = stateModule;
test("getFileExtension normalizes file extensions", () => {
  assert.equal(getFileExtension2("manual.MD"), ".md");
  assert.equal(getFileExtension2("notes.txt"), ".txt");
  assert.equal(getFileExtension2("README"), "");
});
test("validateSelectedFile rejects unsupported file types", () => {
  const file = new File(["bad"], "diagram.pdf", { type: "application/pdf" });
  const result = validateSelectedFile2(file, 10 * 1024 * 1024);
  assert.equal(result.phase, "error");
  assert.equal(result.error, "Only .md and .txt files are supported.");
  assert.equal(result.statusMessage, "Unsupported file type.");
});
test("validateSelectedFile rejects oversized files", () => {
  const file = new File([new Uint8Array(12)], "system.md", { type: "text/markdown" });
  Object.defineProperty(file, "size", { configurable: true, value: 12 * 1024 * 1024 });
  const result = validateSelectedFile2(file, 10 * 1024 * 1024);
  assert.equal(result.phase, "error");
  assert.match(result.error || "", /10 MB upload limit/);
  assert.equal(result.statusMessage, "Selected file is too large.");
});
test("validateSelectedFile accepts supported files and returns the selected-file state", () => {
  const file = new File(["hello"], "system.md", { type: "text/markdown" });
  const result = validateSelectedFile2(file, 10 * 1024 * 1024);
  assert.deepEqual(result, createSelectedFileUploadState2(file));
});
test("validateSelectedDocumentFile accepts pdf markdown and text files", () => {
  for (const filename of ["policy.pdf", "policy.md", "policy.txt"]) {
    const file = new File(["hello"], filename);
    const result = validateSelectedDocumentFile2(file, 10 * 1024 * 1024);
    assert.deepEqual(result, createSelectedDocumentFileUploadState2(file));
  }
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2xpYi9hZGFwdGVycy50cyIsICIuLi9zcmMvbGliL2NvbmZpZy50cyIsICIuLi9zcmMvbGliL2FwaS50cyIsICIuLi9zcmMvc3RhdGUvQXBwQ29udGV4dC50c3giLCAiLi4vdGVzdHMvdXBsb2FkLXN0YXRlLnRlc3QudHMiLCAiLi4vdGVzdHMvdGVzdC11dGlscy50c3giXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB0eXBlIHtcbiAgQXBpRG9jdW1lbnRFZGdlLFxuICBBcGlEb2N1bWVudEV2aWRlbmNlLFxuICBBcGlEb2N1bWVudEdyYXBoRGF0YSxcbiAgQXBpRG9jdW1lbnROb2RlLFxuICBBcGlEb2N1bWVudFNvdXJjZSxcbiAgQXBpR3JhcGhEYXRhLFxuICBBcGlHcmFwaEVkZ2UsXG4gIEFwaUdyYXBoTm9kZSxcbiAgSW1wYWN0UmVzcG9uc2UsXG4gIFJpc2tSZXNwb25zZSxcbn0gZnJvbSAnLi4vdHlwZXMvYXBpJztcbmltcG9ydCB0eXBlIHtcbiAgRG9jdW1lbnRFZGdlLFxuICBEb2N1bWVudEV2aWRlbmNlLFxuICBEb2N1bWVudEdyYXBoRGF0YSxcbiAgRG9jdW1lbnROb2RlLFxuICBEb2N1bWVudFNvdXJjZSxcbiAgR3JhcGhEYXRhLFxuICBHcmFwaEVkZ2UsXG4gIEdyYXBoTm9kZSxcbiAgTm9kZURldGFpbHMsXG4gIE5vZGVSZWZlcmVuY2UsXG59IGZyb20gJy4uL3R5cGVzL2FwcCc7XG5cclxuZnVuY3Rpb24gZW5zdXJlU3RyaW5nKHZhbHVlOiB1bmtub3duLCBsYWJlbDogc3RyaW5nKSB7XHJcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgTWFsZm9ybWVkIEFQSSByZXNwb25zZTogZXhwZWN0ZWQgJHtsYWJlbH0gdG8gYmUgYSBzdHJpbmcuYCk7XHJcbiAgfVxyXG4gIHJldHVybiB2YWx1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZW5zdXJlTnVtYmVyKHZhbHVlOiB1bmtub3duLCBsYWJlbDogc3RyaW5nKSB7XHJcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicgfHwgTnVtYmVyLmlzTmFOKHZhbHVlKSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBNYWxmb3JtZWQgQVBJIHJlc3BvbnNlOiBleHBlY3RlZCAke2xhYmVsfSB0byBiZSBhIG51bWJlci5gKTtcclxuICB9XHJcbiAgcmV0dXJuIHZhbHVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlbnN1cmVBcnJheTxUPih2YWx1ZTogdW5rbm93biwgbGFiZWw6IHN0cmluZykge1xyXG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgTWFsZm9ybWVkIEFQSSByZXNwb25zZTogZXhwZWN0ZWQgJHtsYWJlbH0gdG8gYmUgYW4gYXJyYXkuYCk7XHJcbiAgfVxyXG4gIHJldHVybiB2YWx1ZSBhcyBUW107XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5vcm1hbGl6ZU5vZGUobm9kZTogQXBpR3JhcGhOb2RlLCBkZXBlbmRlbmN5TWFwOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT4sIGRlcGVuZGVudE1hcDogTWFwPHN0cmluZywgc3RyaW5nW10+KTogR3JhcGhOb2RlIHtcclxuICByZXR1cm4ge1xyXG4gICAgaWQ6IGVuc3VyZVN0cmluZyhub2RlLmlkLCAnbm9kZS5pZCcpLFxyXG4gICAgbmFtZTogZW5zdXJlU3RyaW5nKG5vZGUubmFtZSwgJ25vZGUubmFtZScpLFxyXG4gICAgdHlwZTogZW5zdXJlU3RyaW5nKG5vZGUudHlwZSwgJ25vZGUudHlwZScpLFxyXG4gICAgZGVzY3JpcHRpb246IGVuc3VyZVN0cmluZyhub2RlLmRlc2NyaXB0aW9uLCAnbm9kZS5kZXNjcmlwdGlvbicpLFxyXG4gICAgcmlza1Njb3JlOiBlbnN1cmVOdW1iZXIobm9kZS5yaXNrX3Njb3JlLCAnbm9kZS5yaXNrX3Njb3JlJyksXHJcbiAgICByaXNrTGV2ZWw6IGVuc3VyZVN0cmluZyhub2RlLnJpc2tfbGV2ZWwsICdub2RlLnJpc2tfbGV2ZWwnKSxcclxuICAgIGRlZ3JlZTogZW5zdXJlTnVtYmVyKG5vZGUuZGVncmVlLCAnbm9kZS5kZWdyZWUnKSxcclxuICAgIGJldHdlZW5uZXNzOiBlbnN1cmVOdW1iZXIobm9kZS5iZXR3ZWVubmVzcywgJ25vZGUuYmV0d2Vlbm5lc3MnKSxcclxuICAgIGNsb3NlbmVzczogZW5zdXJlTnVtYmVyKG5vZGUuY2xvc2VuZXNzLCAnbm9kZS5jbG9zZW5lc3MnKSxcclxuICAgIGJsYXN0UmFkaXVzOiBlbnN1cmVOdW1iZXIobm9kZS5ibGFzdF9yYWRpdXMsICdub2RlLmJsYXN0X3JhZGl1cycpLFxyXG4gICAgZGVwZW5kZW5jeVNwYW46IGVuc3VyZU51bWJlcihub2RlLmRlcGVuZGVuY3lfc3BhbiwgJ25vZGUuZGVwZW5kZW5jeV9zcGFuJyksXHJcbiAgICByaXNrRXhwbGFuYXRpb246IGVuc3VyZVN0cmluZyhub2RlLnJpc2tfZXhwbGFuYXRpb24sICdub2RlLnJpc2tfZXhwbGFuYXRpb24nKSxcclxuICAgIHNvdXJjZTogZW5zdXJlU3RyaW5nKG5vZGUuc291cmNlLCAnbm9kZS5zb3VyY2UnKSxcclxuICAgIGRlcGVuZGVuY2llczogZGVwZW5kZW5jeU1hcC5nZXQobm9kZS5pZCkgPz8gW10sXHJcbiAgICBkZXBlbmRlbnRzOiBkZXBlbmRlbnRNYXAuZ2V0KG5vZGUuaWQpID8/IFtdLFxyXG4gICAgdmFsOiAxOCArIE1hdGgucm91bmQoKG5vZGUucmlza19zY29yZSAvIDEwMCkgKiAyMiksXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gbm9ybWFsaXplRWRnZShlZGdlOiBBcGlHcmFwaEVkZ2UsIGluZGV4OiBudW1iZXIpOiBHcmFwaEVkZ2Uge1xyXG4gIHJldHVybiB7XHJcbiAgICBpZDogYCR7ZW5zdXJlU3RyaW5nKGVkZ2Uuc291cmNlLCAnZWRnZS5zb3VyY2UnKX0tJHtlbnN1cmVTdHJpbmcoZWRnZS50YXJnZXQsICdlZGdlLnRhcmdldCcpfS0ke2luZGV4fWAsXHJcbiAgICBzb3VyY2U6IGVkZ2Uuc291cmNlLFxyXG4gICAgdGFyZ2V0OiBlZGdlLnRhcmdldCxcclxuICAgIHJlbGF0aW9uOiBlbnN1cmVTdHJpbmcoZWRnZS5yZWxhdGlvbiwgJ2VkZ2UucmVsYXRpb24nKSxcclxuICAgIHJhdGlvbmFsZTogZW5zdXJlU3RyaW5nKGVkZ2UucmF0aW9uYWxlLCAnZWRnZS5yYXRpb25hbGUnKSxcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYWRhcHRHcmFwaChhcGlHcmFwaDogQXBpR3JhcGhEYXRhKTogR3JhcGhEYXRhIHtcclxuICBjb25zdCBzb3VyY2UgPSBlbnN1cmVTdHJpbmcoYXBpR3JhcGguc291cmNlLCAnZ3JhcGguc291cmNlJyk7XHJcbiAgY29uc3QgYXBpTm9kZXMgPSBlbnN1cmVBcnJheTxBcGlHcmFwaE5vZGU+KGFwaUdyYXBoLm5vZGVzLCAnZ3JhcGgubm9kZXMnKTtcclxuICBjb25zdCBhcGlFZGdlcyA9IGVuc3VyZUFycmF5PEFwaUdyYXBoRWRnZT4oYXBpR3JhcGguZWRnZXMsICdncmFwaC5lZGdlcycpO1xyXG5cclxuICBjb25zdCBkZXBlbmRlbmN5TWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xyXG4gIGNvbnN0IGRlcGVuZGVudE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcclxuXHJcbiAgZm9yIChjb25zdCBlZGdlIG9mIGFwaUVkZ2VzKSB7XHJcbiAgICBjb25zdCBzb3VyY2VJZCA9IGVuc3VyZVN0cmluZyhlZGdlLnNvdXJjZSwgJ2VkZ2Uuc291cmNlJyk7XHJcbiAgICBjb25zdCB0YXJnZXRJZCA9IGVuc3VyZVN0cmluZyhlZGdlLnRhcmdldCwgJ2VkZ2UudGFyZ2V0Jyk7XHJcbiAgICBkZXBlbmRlbmN5TWFwLnNldChzb3VyY2VJZCwgWy4uLihkZXBlbmRlbmN5TWFwLmdldChzb3VyY2VJZCkgPz8gW10pLCB0YXJnZXRJZF0pO1xyXG4gICAgZGVwZW5kZW50TWFwLnNldCh0YXJnZXRJZCwgWy4uLihkZXBlbmRlbnRNYXAuZ2V0KHRhcmdldElkKSA/PyBbXSksIHNvdXJjZUlkXSk7XHJcbiAgfVxyXG5cclxuICBjb25zdCBub2RlcyA9IGFwaU5vZGVzLm1hcCgobm9kZSkgPT4gbm9ybWFsaXplTm9kZShub2RlLCBkZXBlbmRlbmN5TWFwLCBkZXBlbmRlbnRNYXApKTtcclxuICBjb25zdCBsaW5rcyA9IGFwaUVkZ2VzLm1hcCgoZWRnZSwgaW5kZXgpID0+IG5vcm1hbGl6ZUVkZ2UoZWRnZSwgaW5kZXgpKTtcclxuICBjb25zdCBub2RlSW5kZXggPSBPYmplY3QuZnJvbUVudHJpZXMobm9kZXMubWFwKChub2RlKSA9PiBbbm9kZS5pZCwgbm9kZV0pKTtcclxuICBjb25zdCByZWxhdGlvblR5cGVzID0gWy4uLm5ldyBTZXQobGlua3MubWFwKChlZGdlKSA9PiBlZGdlLnJlbGF0aW9uKSldLnNvcnQoKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHNvdXJjZSxcclxuICAgIG5vZGVzLFxyXG4gICAgbGlua3MsXHJcbiAgICBub2RlSW5kZXgsXHJcbiAgICByZWxhdGlvblR5cGVzLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRvTm9kZVJlZmVyZW5jZShub2RlPzogR3JhcGhOb2RlIHwgbnVsbCk6IE5vZGVSZWZlcmVuY2UgfCBudWxsIHtcclxuICBpZiAoIW5vZGUpIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGlkOiBub2RlLmlkLFxyXG4gICAgbmFtZTogbm9kZS5uYW1lLFxyXG4gICAgdHlwZTogbm9kZS50eXBlLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZvcm1hdE1ldHJpYyh2YWx1ZTogbnVtYmVyKSB7XHJcbiAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIodmFsdWUpID8gU3RyaW5nKHZhbHVlKSA6IHZhbHVlLnRvRml4ZWQoMyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGFwdE5vZGVEZXRhaWxzKFxuICBncmFwaDogR3JhcGhEYXRhLFxyXG4gIGNvbXBvbmVudElkOiBzdHJpbmcsXHJcbiAgcmlzazogUmlza1Jlc3BvbnNlLFxyXG4gIGltcGFjdDogSW1wYWN0UmVzcG9uc2VcclxuKTogTm9kZURldGFpbHMge1xyXG4gIGNvbnN0IG5vZGUgPSBncmFwaC5ub2RlSW5kZXhbY29tcG9uZW50SWRdO1xyXG4gIGlmICghbm9kZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb21wb25lbnQgJyR7Y29tcG9uZW50SWR9JyBpcyBtaXNzaW5nIGZyb20gdGhlIGFjdGl2ZSBncmFwaC5gKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGRlcGVuZGVuY2llcyA9IG5vZGUuZGVwZW5kZW5jaWVzXHJcbiAgICAubWFwKChkZXBlbmRlbmN5SWQpID0+IHRvTm9kZVJlZmVyZW5jZShncmFwaC5ub2RlSW5kZXhbZGVwZW5kZW5jeUlkXSkpXHJcbiAgICAuZmlsdGVyKChjYW5kaWRhdGUpOiBjYW5kaWRhdGUgaXMgTm9kZVJlZmVyZW5jZSA9PiBCb29sZWFuKGNhbmRpZGF0ZSkpO1xyXG5cclxuICBjb25zdCBhZmZlY3RlZFN5c3RlbXMgPSBpbXBhY3QuaW1wYWN0ZWRfY29tcG9uZW50c1xyXG4gICAgLm1hcCgoYWZmZWN0ZWRJZCkgPT4gdG9Ob2RlUmVmZXJlbmNlKGdyYXBoLm5vZGVJbmRleFthZmZlY3RlZElkXSkgPz8geyBpZDogYWZmZWN0ZWRJZCwgbmFtZTogYWZmZWN0ZWRJZCwgdHlwZTogJ3Vua25vd24nIH0pXHJcbiAgICAuZmlsdGVyKChjYW5kaWRhdGUpOiBjYW5kaWRhdGUgaXMgTm9kZVJlZmVyZW5jZSA9PiBCb29sZWFuKGNhbmRpZGF0ZSkpO1xyXG5cclxuICBjb25zdCByZWxhdGVkUmF0aW9uYWxlcyA9IGdyYXBoLmxpbmtzXHJcbiAgICAuZmlsdGVyKChsaW5rKSA9PiBsaW5rLnNvdXJjZSA9PT0gY29tcG9uZW50SWQgfHwgbGluay50YXJnZXQgPT09IGNvbXBvbmVudElkKVxyXG4gICAgLm1hcCgobGluaykgPT4gbGluay5yYXRpb25hbGUpXHJcbiAgICAuZmlsdGVyKChyYXRpb25hbGUpID0+IHJhdGlvbmFsZS50cmltKCkubGVuZ3RoID4gMCk7XHJcblxyXG4gIGNvbnN0IGlzc3VlcyA9IFtyaXNrLmV4cGxhbmF0aW9uLCAuLi5yZWxhdGVkUmF0aW9uYWxlc10uZmlsdGVyKFxyXG4gICAgKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik6IHZhbHVlIGlzIHN0cmluZyA9PiB2YWx1ZS50cmltKCkubGVuZ3RoID4gMCAmJiBjb2xsZWN0aW9uLmluZGV4T2YodmFsdWUpID09PSBpbmRleFxyXG4gICk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBjb21wb25lbnRJZDogbm9kZS5pZCxcclxuICAgIG5hbWU6IG5vZGUubmFtZSxcclxuICAgIHR5cGU6IG5vZGUudHlwZSxcclxuICAgIHJpc2tTY29yZTogcmlzay5zY29yZSxcclxuICAgIHJpc2tMZXZlbDogcmlzay5sZXZlbCxcclxuICAgIGRlc2NyaXB0aW9uOiBub2RlLmRlc2NyaXB0aW9uLFxyXG4gICAgZGVwZW5kZW5jaWVzLFxyXG4gICAgYWZmZWN0ZWRTeXN0ZW1zLFxyXG4gICAgaXNzdWVzLFxyXG4gICAgZXhwbGFuYXRpb246IHJpc2suZXhwbGFuYXRpb24sXHJcbiAgICBpbXBhY3RDb3VudDogaW1wYWN0LmltcGFjdF9jb3VudCxcclxuICAgIG1ldGFkYXRhOiBbXHJcbiAgICAgIHsgbGFiZWw6ICdEZWdyZWUnLCB2YWx1ZTogZm9ybWF0TWV0cmljKG5vZGUuZGVncmVlKSB9LFxyXG4gICAgICB7IGxhYmVsOiAnQmV0d2Vlbm5lc3MnLCB2YWx1ZTogZm9ybWF0TWV0cmljKG5vZGUuYmV0d2Vlbm5lc3MpIH0sXHJcbiAgICAgIHsgbGFiZWw6ICdDbG9zZW5lc3MnLCB2YWx1ZTogZm9ybWF0TWV0cmljKG5vZGUuY2xvc2VuZXNzKSB9LFxyXG4gICAgICB7IGxhYmVsOiAnQmxhc3QgUmFkaXVzJywgdmFsdWU6IFN0cmluZyhub2RlLmJsYXN0UmFkaXVzKSB9LFxyXG4gICAgICB7IGxhYmVsOiAnRGVwZW5kZW5jeSBTcGFuJywgdmFsdWU6IFN0cmluZyhub2RlLmRlcGVuZGVuY3lTcGFuKSB9LFxyXG4gICAgICB7IGxhYmVsOiAnU291cmNlJywgdmFsdWU6IG5vZGUuc291cmNlIH0sXHJcbiAgICBdLFxyXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZURvY3VtZW50RXZpZGVuY2UoZXZpZGVuY2U6IEFwaURvY3VtZW50RXZpZGVuY2UpOiBEb2N1bWVudEV2aWRlbmNlIHtcbiAgcmV0dXJuIHtcbiAgICBxdW90ZTogZW5zdXJlU3RyaW5nKGV2aWRlbmNlLnF1b3RlLCAnZG9jdW1lbnQuZXZpZGVuY2UucXVvdGUnKSxcbiAgICBwYWdlU3RhcnQ6IGV2aWRlbmNlLnBhZ2Vfc3RhcnQsXG4gICAgcGFnZUVuZDogZXZpZGVuY2UucGFnZV9lbmQsXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZURvY3VtZW50U291cmNlKHNvdXJjZTogQXBpRG9jdW1lbnRTb3VyY2UpOiBEb2N1bWVudFNvdXJjZSB7XG4gIHJldHVybiB7XG4gICAgZG9jdW1lbnROYW1lOiBlbnN1cmVTdHJpbmcoc291cmNlLmRvY3VtZW50X25hbWUsICdkb2N1bWVudC5zb3VyY2UuZG9jdW1lbnRfbmFtZScpLFxuICAgIGNodW5rRmlsZTogZW5zdXJlU3RyaW5nKHNvdXJjZS5jaHVua19maWxlLCAnZG9jdW1lbnQuc291cmNlLmNodW5rX2ZpbGUnKSxcbiAgICBjaHVua0lkOiBlbnN1cmVTdHJpbmcoc291cmNlLmNodW5rX2lkLCAnZG9jdW1lbnQuc291cmNlLmNodW5rX2lkJyksXG4gICAgcGRmUGFnZVN0YXJ0OiBzb3VyY2UucGRmX3BhZ2Vfc3RhcnQsXG4gICAgcGRmUGFnZUVuZDogc291cmNlLnBkZl9wYWdlX2VuZCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplRG9jdW1lbnROb2RlKG5vZGU6IEFwaURvY3VtZW50Tm9kZSk6IERvY3VtZW50Tm9kZSB7XG4gIGNvbnN0IGRlZ3JlZSA9IGVuc3VyZU51bWJlcihub2RlLmRlZ3JlZSwgJ2RvY3VtZW50Lm5vZGUuZGVncmVlJyk7XG4gIHJldHVybiB7XG4gICAgaWQ6IGVuc3VyZVN0cmluZyhub2RlLmlkLCAnZG9jdW1lbnQubm9kZS5pZCcpLFxuICAgIGxhYmVsOiBlbnN1cmVTdHJpbmcobm9kZS5sYWJlbCwgJ2RvY3VtZW50Lm5vZGUubGFiZWwnKSxcbiAgICBraW5kOiBlbnN1cmVTdHJpbmcobm9kZS5raW5kLCAnZG9jdW1lbnQubm9kZS5raW5kJyksXG4gICAgY2Fub25pY2FsTmFtZTogZW5zdXJlU3RyaW5nKG5vZGUuY2Fub25pY2FsX25hbWUsICdkb2N1bWVudC5ub2RlLmNhbm9uaWNhbF9uYW1lJyksXG4gICAgYWxpYXNlczogZW5zdXJlQXJyYXk8c3RyaW5nPihub2RlLmFsaWFzZXMsICdkb2N1bWVudC5ub2RlLmFsaWFzZXMnKSxcbiAgICBzdW1tYXJ5OiBlbnN1cmVTdHJpbmcobm9kZS5zdW1tYXJ5LCAnZG9jdW1lbnQubm9kZS5zdW1tYXJ5JyksXG4gICAgZXZpZGVuY2U6IGVuc3VyZUFycmF5PEFwaURvY3VtZW50RXZpZGVuY2U+KG5vZGUuZXZpZGVuY2UsICdkb2N1bWVudC5ub2RlLmV2aWRlbmNlJykubWFwKG5vcm1hbGl6ZURvY3VtZW50RXZpZGVuY2UpLFxuICAgIHNvdXJjZXM6IGVuc3VyZUFycmF5PEFwaURvY3VtZW50U291cmNlPihub2RlLnNvdXJjZXMsICdkb2N1bWVudC5ub2RlLnNvdXJjZXMnKS5tYXAobm9ybWFsaXplRG9jdW1lbnRTb3VyY2UpLFxuICAgIGRlZ3JlZSxcbiAgICBzb3VyY2U6IGVuc3VyZVN0cmluZyhub2RlLnNvdXJjZSwgJ2RvY3VtZW50Lm5vZGUuc291cmNlJyksXG4gICAgdmFsOiAxNiArIE1hdGgubWluKDE4LCBNYXRoLnJvdW5kKGRlZ3JlZSAqIDQpKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplRG9jdW1lbnRFZGdlKGVkZ2U6IEFwaURvY3VtZW50RWRnZSk6IERvY3VtZW50RWRnZSB7XG4gIHJldHVybiB7XG4gICAgaWQ6IGVuc3VyZVN0cmluZyhlZGdlLmlkLCAnZG9jdW1lbnQuZWRnZS5pZCcpLFxuICAgIHNvdXJjZTogZW5zdXJlU3RyaW5nKGVkZ2Uuc291cmNlLCAnZG9jdW1lbnQuZWRnZS5zb3VyY2UnKSxcbiAgICB0YXJnZXQ6IGVuc3VyZVN0cmluZyhlZGdlLnRhcmdldCwgJ2RvY3VtZW50LmVkZ2UudGFyZ2V0JyksXG4gICAgdHlwZTogZW5zdXJlU3RyaW5nKGVkZ2UudHlwZSwgJ2RvY3VtZW50LmVkZ2UudHlwZScpLFxuICAgIHN1bW1hcnk6IGVuc3VyZVN0cmluZyhlZGdlLnN1bW1hcnksICdkb2N1bWVudC5lZGdlLnN1bW1hcnknKSxcbiAgICBldmlkZW5jZTogZW5zdXJlQXJyYXk8QXBpRG9jdW1lbnRFdmlkZW5jZT4oZWRnZS5ldmlkZW5jZSwgJ2RvY3VtZW50LmVkZ2UuZXZpZGVuY2UnKS5tYXAobm9ybWFsaXplRG9jdW1lbnRFdmlkZW5jZSksXG4gICAgc291cmNlQ2h1bms6IGVkZ2Uuc291cmNlX2NodW5rID8gbm9ybWFsaXplRG9jdW1lbnRTb3VyY2UoZWRnZS5zb3VyY2VfY2h1bmspIDogbnVsbCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0RG9jdW1lbnRHcmFwaChhcGlHcmFwaDogQXBpRG9jdW1lbnRHcmFwaERhdGEpOiBEb2N1bWVudEdyYXBoRGF0YSB7XG4gIGNvbnN0IHNvdXJjZSA9IGVuc3VyZVN0cmluZyhhcGlHcmFwaC5zb3VyY2UsICdkb2N1bWVudC5ncmFwaC5zb3VyY2UnKTtcbiAgY29uc3Qgbm9kZXMgPSBlbnN1cmVBcnJheTxBcGlEb2N1bWVudE5vZGU+KGFwaUdyYXBoLm5vZGVzLCAnZG9jdW1lbnQuZ3JhcGgubm9kZXMnKS5tYXAobm9ybWFsaXplRG9jdW1lbnROb2RlKTtcbiAgY29uc3QgbGlua3MgPSBlbnN1cmVBcnJheTxBcGlEb2N1bWVudEVkZ2U+KGFwaUdyYXBoLmVkZ2VzLCAnZG9jdW1lbnQuZ3JhcGguZWRnZXMnKS5tYXAobm9ybWFsaXplRG9jdW1lbnRFZGdlKTtcbiAgY29uc3Qgbm9kZUluZGV4ID0gT2JqZWN0LmZyb21FbnRyaWVzKG5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUuaWQsIG5vZGVdKSk7XG4gIGNvbnN0IGtpbmRUeXBlcyA9IFsuLi5uZXcgU2V0KG5vZGVzLm1hcCgobm9kZSkgPT4gbm9kZS5raW5kKSldLnNvcnQoKTtcbiAgY29uc3QgcmVsYXRpb25UeXBlcyA9IFsuLi5uZXcgU2V0KGxpbmtzLm1hcCgoZWRnZSkgPT4gZWRnZS50eXBlKSldLnNvcnQoKTtcblxuICByZXR1cm4ge1xuICAgIHNvdXJjZSxcbiAgICBub2RlcyxcbiAgICBsaW5rcyxcbiAgICBub2RlSW5kZXgsXG4gICAga2luZFR5cGVzLFxuICAgIHJlbGF0aW9uVHlwZXMsXG4gIH07XG59XG4iLCAiY29uc3QgcnVudGltZUNvbmZpZyA9IHdpbmRvdy5fX1RXSU5fQ09ORklHX18gPz8ge307XHJcblxyXG5mdW5jdGlvbiByZWFkTnVtYmVyKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCB1bmRlZmluZWQsIGZhbGxiYWNrOiBudW1iZXIpIHtcclxuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIodmFsdWUpO1xyXG4gIHJldHVybiBOdW1iZXIuaXNGaW5pdGUocGFyc2VkKSAmJiBwYXJzZWQgPiAwID8gcGFyc2VkIDogZmFsbGJhY2s7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBhcHBDb25maWcgPSB7XHJcbiAgYXBpQmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXHJcbiAgbWF4VXBsb2FkQnl0ZXM6XHJcbiAgICByZWFkTnVtYmVyKHJ1bnRpbWVDb25maWcuTUFYX1VQTE9BRF9NQiB8fCBpbXBvcnQubWV0YS5lbnYuVklURV9NQVhfVVBMT0FEX01CLCAxMCkgKiAxMDI0ICogMTAyNCxcclxuICBwcm9jZXNzaW5nVGltZW91dE1zOiByZWFkTnVtYmVyKFxyXG4gICAgcnVudGltZUNvbmZpZy5QUk9DRVNTSU5HX1RJTUVPVVRfTVMgfHwgaW1wb3J0Lm1ldGEuZW52LlZJVEVfUFJPQ0VTU0lOR19USU1FT1VUX01TLFxyXG4gICAgMzAwMDAwXHJcbiAgKSxcclxuICBlbnZpcm9ubWVudDogcnVudGltZUNvbmZpZy5BUFBfRU5WIHx8ICdsb2NhbCcsXHJcbn07XHJcbiIsICJpbXBvcnQgeyBhcHBDb25maWcgfSBmcm9tICcuL2NvbmZpZyc7XHJcbmltcG9ydCB0eXBlIHtcclxuICBBcGlHcmFwaERhdGEsXG4gIEFwaVBheWxvYWQsXG4gIEFwaURvY3VtZW50R3JhcGhEYXRhLFxuICBEb2N1bWVudEluZ2VzdFJlc3BvbnNlLFxuICBJbXBhY3RSZXNwb25zZSxcbiAgSW5nZXN0UmVzcG9uc2UsXG4gIFByb2Nlc3NpbmdTdGF0dXMsXG4gIFJpc2tSZXNwb25zZSxcbn0gZnJvbSAnLi4vdHlwZXMvYXBpJztcblxyXG5leHBvcnQgY2xhc3MgQXBpQ2xpZW50RXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgY29kZT86IHN0cmluZztcclxuICBzdGF0dXM/OiBudW1iZXI7XHJcbiAgZGV0YWlscz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xyXG4gIHJldHJ5YWJsZTogYm9vbGVhbjtcclxuXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBtZXNzYWdlOiBzdHJpbmcsXHJcbiAgICBvcHRpb25zOiB7XHJcbiAgICAgIGNvZGU/OiBzdHJpbmc7XHJcbiAgICAgIHN0YXR1cz86IG51bWJlcjtcclxuICAgICAgZGV0YWlscz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xyXG4gICAgICByZXRyeWFibGU/OiBib29sZWFuO1xyXG4gICAgfSA9IHt9XHJcbiAgKSB7XHJcbiAgICBzdXBlcihtZXNzYWdlKTtcclxuICAgIHRoaXMubmFtZSA9ICdBcGlDbGllbnRFcnJvcic7XHJcbiAgICB0aGlzLmNvZGUgPSBvcHRpb25zLmNvZGU7XHJcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzO1xyXG4gICAgdGhpcy5kZXRhaWxzID0gb3B0aW9ucy5kZXRhaWxzO1xyXG4gICAgdGhpcy5yZXRyeWFibGUgPSBvcHRpb25zLnJldHJ5YWJsZSA/PyBmYWxzZTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBVbnN1cHBvcnRlZEVuZHBvaW50RXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XHJcbiAgICBzdXBlcihtZXNzYWdlKTtcclxuICAgIHRoaXMubmFtZSA9ICdVbnN1cHBvcnRlZEVuZHBvaW50RXJyb3InO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gcGFyc2VKc29uU2FmZWx5KHJlc3BvbnNlOiBSZXNwb25zZSkge1xyXG4gIGNvbnN0IHRleHQgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcbiAgY29uc29sZS5sb2coJ0JBQ0tFTkQgUkVTUE9OU0U6JywgdGV4dCk7XHJcblxyXG4gIGlmICghdGV4dCkge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgcmV0dXJuIEpTT04ucGFyc2UodGV4dCkgYXMgQXBpUGF5bG9hZDx1bmtub3duPjtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignUEFSU0UgRVJST1I6JywgZXJyb3IpO1xyXG4gICAgY29uc29sZS5lcnJvcignUkFXIFJFU1BPTlNFIFRFWFQ6JywgdGV4dCk7XHJcbiAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoJ1RoZSBBUEkgcmV0dXJuZWQgbWFsZm9ybWVkIEpTT04uJywge1xyXG4gICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcclxuICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gcmVxdWVzdDxUPihwYXRoOiBzdHJpbmcsIGluaXQ6IFJlcXVlc3RJbml0ID0ge30sIHRpbWVvdXRNcyA9IDMwMDAwKTogUHJvbWlzZTxUPiB7XHJcbiAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcclxuICBjb25zdCB0aW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCB0aW1lb3V0TXMpO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgL2FwaSR7cGF0aH1gLCB7XHJcbiAgICAgIC4uLmluaXQsXHJcbiAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXHJcbiAgICB9KTtcclxuICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCBwYXJzZUpzb25TYWZlbHkocmVzcG9uc2UpO1xyXG5cclxuICAgIGlmICghcGF5bG9hZCB8fCB0eXBlb2YgcGF5bG9hZCAhPT0gJ29iamVjdCcpIHtcclxuICAgICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdUaGUgQVBJIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLicsIHtcclxuICAgICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcclxuICAgICAgICByZXRyeWFibGU6IGZhbHNlLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXJlc3BvbnNlLm9rIHx8IHBheWxvYWQuc3RhdHVzICE9PSAnb2snKSB7XHJcbiAgICAgIGNvbnN0IGVycm9yUGF5bG9hZCA9IHBheWxvYWQgYXMgRXhjbHVkZTxBcGlQYXlsb2FkPFQ+LCB7IHN0YXR1czogJ29rJyB9PjtcclxuICAgICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKGVycm9yUGF5bG9hZC5lcnJvcj8ubWVzc2FnZSB8fCAnVGhlIHJlcXVlc3QgZmFpbGVkLicsIHtcclxuICAgICAgICBjb2RlOiBlcnJvclBheWxvYWQuZXJyb3I/LmNvZGUsXHJcbiAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXHJcbiAgICAgICAgZGV0YWlsczogZXJyb3JQYXlsb2FkLmVycm9yPy5kZXRhaWxzLFxyXG4gICAgICAgIHJldHJ5YWJsZTogcmVzcG9uc2Uuc3RhdHVzID49IDUwMCB8fCByZXNwb25zZS5zdGF0dXMgPT09IDAsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwYXlsb2FkLmRhdGEgYXMgVDtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXBpQ2xpZW50RXJyb3IpIHtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRE9NRXhjZXB0aW9uICYmIGVycm9yLm5hbWUgPT09ICdBYm9ydEVycm9yJykge1xyXG4gICAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoJ1Byb2Nlc3NpbmcgdGltZWQgb3V0IGJlZm9yZSB0aGUgYmFja2VuZCBjb21wbGV0ZWQgdGhlIGdyYXBoIGJ1aWxkLicsIHtcclxuICAgICAgICBjb2RlOiAncmVxdWVzdF90aW1lb3V0JyxcclxuICAgICAgICByZXRyeWFibGU6IHRydWUsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcignTmV0d29yayBmYWlsdXJlIHdoaWxlIGNvbnRhY3RpbmcgdGhlIFR3aW5HcmFwaE9wcyBBUEkuJywge1xyXG4gICAgICBjb2RlOiAnbmV0d29ya19lcnJvcicsXHJcbiAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgIH0pO1xyXG4gIH0gZmluYWxseSB7XHJcbiAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZERvY3VtZW50KFxuICBmaWxlOiBGaWxlLFxyXG4gIHJlcGxhY2VFeGlzdGluZyA9IHRydWUsXHJcbiAgdGltZW91dE1zID0gYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMsXHJcbiAgaW5nZXN0aW9uSWQ/OiBzdHJpbmdcclxuKSB7XHJcbiAgY29uc3QgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoKTtcclxuICBmb3JtRGF0YS5hcHBlbmQoJ2ZpbGUnLCBmaWxlKTtcclxuICBmb3JtRGF0YS5hcHBlbmQoJ3JlcGxhY2VfZXhpc3RpbmcnLCBTdHJpbmcocmVwbGFjZUV4aXN0aW5nKSk7XHJcbiAgaWYgKGluZ2VzdGlvbklkKSB7XHJcbiAgICBmb3JtRGF0YS5hcHBlbmQoJ2luZ2VzdGlvbl9pZCcsIGluZ2VzdGlvbklkKTtcclxuICB9XHJcblxyXG4gIHJldHVybiByZXF1ZXN0PEluZ2VzdFJlc3BvbnNlPihcclxuICAgICcvaW5nZXN0JyxcclxuICAgIHtcclxuICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgIGJvZHk6IGZvcm1EYXRhLFxyXG4gICAgfSxcclxuICAgIHRpbWVvdXRNc1xyXG4gICk7XHJcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZEtub3dsZWRnZURvY3VtZW50KFxuICBmaWxlOiBGaWxlLFxuICByZXBsYWNlRXhpc3RpbmcgPSB0cnVlLFxuICB0aW1lb3V0TXMgPSBhcHBDb25maWcucHJvY2Vzc2luZ1RpbWVvdXRNcyxcbiAgaW5nZXN0aW9uSWQ/OiBzdHJpbmdcbikge1xuICBjb25zdCBmb3JtRGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuICBmb3JtRGF0YS5hcHBlbmQoJ2ZpbGUnLCBmaWxlKTtcbiAgZm9ybURhdGEuYXBwZW5kKCdyZXBsYWNlX2V4aXN0aW5nJywgU3RyaW5nKHJlcGxhY2VFeGlzdGluZykpO1xuICBpZiAoaW5nZXN0aW9uSWQpIHtcbiAgICBmb3JtRGF0YS5hcHBlbmQoJ2luZ2VzdGlvbl9pZCcsIGluZ2VzdGlvbklkKTtcbiAgfVxuXG4gIHJldHVybiByZXF1ZXN0PERvY3VtZW50SW5nZXN0UmVzcG9uc2U+KFxuICAgICcvZG9jdW1lbnQvaW5nZXN0JyxcbiAgICB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGJvZHk6IGZvcm1EYXRhLFxuICAgIH0sXG4gICAgdGltZW91dE1zXG4gICk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRHcmFwaCgpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8QXBpR3JhcGhEYXRhPignL2dyYXBoJyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXREb2N1bWVudEdyYXBoKCkge1xuICByZXR1cm4gcmVxdWVzdDxBcGlEb2N1bWVudEdyYXBoRGF0YT4oJy9kb2N1bWVudC9ncmFwaCcpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0Umlzayhjb21wb25lbnRJZDogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIHJlcXVlc3Q8Umlza1Jlc3BvbnNlPihgL3Jpc2s/Y29tcG9uZW50X2lkPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGNvbXBvbmVudElkKX1gKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEltcGFjdChjb21wb25lbnRJZDogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIHJlcXVlc3Q8SW1wYWN0UmVzcG9uc2U+KGAvaW1wYWN0P2NvbXBvbmVudF9pZD0ke2VuY29kZVVSSUNvbXBvbmVudChjb21wb25lbnRJZCl9YCk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZWVkRGVtb0dyYXBoKCkge1xyXG4gIHJldHVybiByZXF1ZXN0PHsgc291cmNlOiBzdHJpbmc7IG5vZGVzX2NyZWF0ZWQ6IG51bWJlcjsgZWRnZXNfY3JlYXRlZDogbnVtYmVyOyByaXNrX25vZGVzX3Njb3JlZDogbnVtYmVyIH0+KFxyXG4gICAgJy9zZWVkJyxcclxuICAgIHsgbWV0aG9kOiAnUE9TVCcgfVxyXG4gICk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8UHJvY2Vzc2luZ1N0YXR1cz4oYC9pbmdlc3QvJHtlbmNvZGVVUklDb21wb25lbnQoaW5nZXN0aW9uSWQpfS9ldmVudHNgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldERvY3VtZW50UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZDogc3RyaW5nKSB7XG4gIHJldHVybiByZXF1ZXN0PFByb2Nlc3NpbmdTdGF0dXM+KGAvZG9jdW1lbnQvaW5nZXN0LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGluZ2VzdGlvbklkKX0vZXZlbnRzYCk7XG59XG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFJpc2tSYW5rZWRJdGVtcygpOiBQcm9taXNlPG5ldmVyPiB7XHJcbiAgLy8gVE9ETzogcmVwbGFjZSBjbGllbnQtc2lkZSByaXNrIHJhbmtpbmcgd2hlbiB0aGUgYmFja2VuZCBleHBvc2VzIGEgZGVkaWNhdGVkIHJpc2sgbGlzdCBlbmRwb2ludC5cclxuICB0aHJvdyBuZXcgVW5zdXBwb3J0ZWRFbmRwb2ludEVycm9yKCdUaGUgY3VycmVudCBiYWNrZW5kIGNvbnRyYWN0IGRvZXMgbm90IGV4cG9zZSBhIHJhbmtlZCByaXNrIGxpc3QgZW5kcG9pbnQuJyk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBcmNoaXRlY3R1cmVTdW1tYXJ5KCk6IFByb21pc2U8bmV2ZXI+IHtcclxuICAvLyBUT0RPOiByZXBsYWNlIGNsaWVudC1zaWRlIHN1bW1hcnkgZGVyaXZhdGlvbiB3aGVuIHRoZSBiYWNrZW5kIGV4cG9zZXMgYSBkZWRpY2F0ZWQgc3VtbWFyeSBlbmRwb2ludC5cclxuICB0aHJvdyBuZXcgVW5zdXBwb3J0ZWRFbmRwb2ludEVycm9yKCdUaGUgY3VycmVudCBiYWNrZW5kIGNvbnRyYWN0IGRvZXMgbm90IGV4cG9zZSBhbiBhcmNoaXRlY3R1cmUgc3VtbWFyeSBlbmRwb2ludC4nKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgY3JlYXRlQ29udGV4dCwgdXNlQ2FsbGJhY2ssIHVzZUNvbnRleHQsIHVzZU1lbW8sIHVzZVJlZiwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCB0eXBlIHsgUmVhY3ROb2RlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgYWRhcHREb2N1bWVudEdyYXBoLCBhZGFwdEdyYXBoIH0gZnJvbSAnLi4vbGliL2FkYXB0ZXJzJztcbmltcG9ydCB7XG4gIEFwaUNsaWVudEVycm9yLFxuICBnZXREb2N1bWVudEdyYXBoLFxuICBnZXREb2N1bWVudFByb2Nlc3NpbmdTdGF0dXMsXG4gIGdldEdyYXBoLFxuICBnZXRQcm9jZXNzaW5nU3RhdHVzLFxuICB1cGxvYWREb2N1bWVudCxcbiAgdXBsb2FkS25vd2xlZGdlRG9jdW1lbnQsXG59IGZyb20gJy4uL2xpYi9hcGknO1xuaW1wb3J0IHsgYXBwQ29uZmlnIH0gZnJvbSAnLi4vbGliL2NvbmZpZyc7XG5pbXBvcnQgdHlwZSB7IERvY3VtZW50R3JhcGhTdGF0ZSwgRG9jdW1lbnRVcGxvYWRTdGF0ZSwgR3JhcGhTdGF0ZSwgVXBsb2FkU3RhdGUgfSBmcm9tICcuLi90eXBlcy9hcHAnO1xuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXBwQ29udGV4dFZhbHVlIHtcclxuICB1cGxvYWQ6IFVwbG9hZFN0YXRlO1xuICBncmFwaDogR3JhcGhTdGF0ZTtcbiAgZG9jdW1lbnRVcGxvYWQ6IERvY3VtZW50VXBsb2FkU3RhdGU7XG4gIGRvY3VtZW50R3JhcGg6IERvY3VtZW50R3JhcGhTdGF0ZTtcbiAgc2V0RHJhZ0FjdGl2ZTogKGFjdGl2ZTogYm9vbGVhbikgPT4gdm9pZDtcbiAgc2VsZWN0RmlsZTogKGZpbGU6IEZpbGUgfCBudWxsKSA9PiBib29sZWFuO1xuICBjbGVhclNlbGVjdGVkRmlsZTogKCkgPT4gdm9pZDtcbiAgYmVnaW5Qcm9jZXNzaW5nOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xuICBsb2FkR3JhcGg6IChvcHRpb25zPzogeyBrZWVwU3RhdHVzPzogYm9vbGVhbiB9KSA9PiBQcm9taXNlPHZvaWQ+O1xuICBzZXREb2N1bWVudERyYWdBY3RpdmU6IChhY3RpdmU6IGJvb2xlYW4pID0+IHZvaWQ7XG4gIHNlbGVjdERvY3VtZW50RmlsZTogKGZpbGU6IEZpbGUgfCBudWxsKSA9PiBib29sZWFuO1xuICBjbGVhclNlbGVjdGVkRG9jdW1lbnRGaWxlOiAoKSA9PiB2b2lkO1xuICBiZWdpbkRvY3VtZW50UHJvY2Vzc2luZzogKCkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgbG9hZERvY3VtZW50R3JhcGg6IChvcHRpb25zPzogeyBrZWVwU3RhdHVzPzogYm9vbGVhbiB9KSA9PiBQcm9taXNlPHZvaWQ+O1xuICByZXNldFVwbG9hZFN0YXRlOiAoKSA9PiB2b2lkO1xufVxuXHJcbmV4cG9ydCBjb25zdCBBcHBDb250ZXh0ID0gY3JlYXRlQ29udGV4dDxBcHBDb250ZXh0VmFsdWUgfCBudWxsPihudWxsKTtcclxuXHJcbmV4cG9ydCBjb25zdCBpbml0aWFsVXBsb2FkU3RhdGU6IFVwbG9hZFN0YXRlID0ge1xyXG4gIHBoYXNlOiAnaWRsZScsXHJcbiAgc2VsZWN0ZWRGaWxlOiBudWxsLFxyXG4gIGVycm9yOiBudWxsLFxyXG4gIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWQgYSAubWQgb3IgLnR4dCBmaWxlIHRvIGJ1aWxkIHRoZSBncmFwaC4nLFxyXG4gIGluZ2VzdGlvbklkOiBudWxsLFxyXG4gIGluZ2VzdGlvbjogbnVsbCxcclxuICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxyXG4gIHN0YXJ0ZWRBdDogbnVsbCxcclxuICBjb21wbGV0ZWRBdDogbnVsbCxcclxuICByZXRyeUNvdW50OiAwLFxyXG59O1xyXG5cclxuY29uc3QgaW5pdGlhbEdyYXBoU3RhdGU6IEdyYXBoU3RhdGUgPSB7XG4gIHN0YXR1czogJ2lkbGUnLFxyXG4gIGRhdGE6IG51bGwsXHJcbiAgZXJyb3I6IG51bGwsXHJcbiAgbGFzdExvYWRlZEF0OiBudWxsLFxyXG59O1xuXG5leHBvcnQgY29uc3QgaW5pdGlhbERvY3VtZW50VXBsb2FkU3RhdGU6IERvY3VtZW50VXBsb2FkU3RhdGUgPSB7XG4gIHBoYXNlOiAnaWRsZScsXG4gIHNlbGVjdGVkRmlsZTogbnVsbCxcbiAgZXJyb3I6IG51bGwsXG4gIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWQgYSAucGRmLCAubWQsIG9yIC50eHQgZmlsZSB0byBidWlsZCBhIGRvY3VtZW50IGdyYXBoLicsXG4gIGluZ2VzdGlvbklkOiBudWxsLFxuICBpbmdlc3Rpb246IG51bGwsXG4gIHByb2Nlc3NpbmdTdGF0dXM6IG51bGwsXG4gIHN0YXJ0ZWRBdDogbnVsbCxcbiAgY29tcGxldGVkQXQ6IG51bGwsXG4gIHJldHJ5Q291bnQ6IDAsXG59O1xuXG5jb25zdCBpbml0aWFsRG9jdW1lbnRHcmFwaFN0YXRlOiBEb2N1bWVudEdyYXBoU3RhdGUgPSB7XG4gIHN0YXR1czogJ2lkbGUnLFxuICBkYXRhOiBudWxsLFxuICBlcnJvcjogbnVsbCxcbiAgbGFzdExvYWRlZEF0OiBudWxsLFxufTtcblxuZXhwb3J0IGNvbnN0IHN1cHBvcnRlZEV4dGVuc2lvbnMgPSBbJy5tZCcsICcudHh0J107XG5leHBvcnQgY29uc3Qgc3VwcG9ydGVkRG9jdW1lbnRFeHRlbnNpb25zID0gWycucGRmJywgJy5tZCcsICcudHh0J107XG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVFeHRlbnNpb24oZmlsZW5hbWU6IHN0cmluZykge1xyXG4gIGNvbnN0IHNlZ21lbnRzID0gZmlsZW5hbWUudG9Mb3dlckNhc2UoKS5zcGxpdCgnLicpO1xyXG4gIHJldHVybiBzZWdtZW50cy5sZW5ndGggPiAxID8gYC4ke3NlZ21lbnRzLnBvcCgpfWAgOiAnJztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlbGVjdGVkRmlsZVVwbG9hZFN0YXRlKGZpbGU6IEZpbGUpOiBVcGxvYWRTdGF0ZSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHBoYXNlOiAnZmlsZS1zZWxlY3RlZCcsXHJcbiAgICBzZWxlY3RlZEZpbGU6IGZpbGUsXHJcbiAgICBlcnJvcjogbnVsbCxcclxuICAgIHN0YXR1c01lc3NhZ2U6IGBSZWFkeSB0byBhbmFseXplICR7ZmlsZS5uYW1lfS5gLFxyXG4gICAgaW5nZXN0aW9uSWQ6IG51bGwsXHJcbiAgICBpbmdlc3Rpb246IG51bGwsXHJcbiAgICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxyXG4gICAgc3RhcnRlZEF0OiBudWxsLFxyXG4gICAgY29tcGxldGVkQXQ6IG51bGwsXHJcbiAgICByZXRyeUNvdW50OiAwLFxyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVVcGxvYWRFcnJvclN0YXRlKGVycm9yOiBzdHJpbmcsIHN0YXR1c01lc3NhZ2U6IHN0cmluZyk6IFVwbG9hZFN0YXRlIHtcbiAgcmV0dXJuIHtcclxuICAgIC4uLmluaXRpYWxVcGxvYWRTdGF0ZSxcclxuICAgIHBoYXNlOiAnZXJyb3InLFxyXG4gICAgZXJyb3IsXHJcbiAgICBzdGF0dXNNZXNzYWdlLFxyXG4gIH07XHJcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlbGVjdGVkRG9jdW1lbnRGaWxlVXBsb2FkU3RhdGUoZmlsZTogRmlsZSk6IERvY3VtZW50VXBsb2FkU3RhdGUge1xuICByZXR1cm4ge1xuICAgIHBoYXNlOiAnZmlsZS1zZWxlY3RlZCcsXG4gICAgc2VsZWN0ZWRGaWxlOiBmaWxlLFxuICAgIGVycm9yOiBudWxsLFxuICAgIHN0YXR1c01lc3NhZ2U6IGBSZWFkeSB0byBtYXAgJHtmaWxlLm5hbWV9LmAsXG4gICAgaW5nZXN0aW9uSWQ6IG51bGwsXG4gICAgaW5nZXN0aW9uOiBudWxsLFxuICAgIHByb2Nlc3NpbmdTdGF0dXM6IG51bGwsXG4gICAgc3RhcnRlZEF0OiBudWxsLFxuICAgIGNvbXBsZXRlZEF0OiBudWxsLFxuICAgIHJldHJ5Q291bnQ6IDAsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEb2N1bWVudFVwbG9hZEVycm9yU3RhdGUoZXJyb3I6IHN0cmluZywgc3RhdHVzTWVzc2FnZTogc3RyaW5nKTogRG9jdW1lbnRVcGxvYWRTdGF0ZSB7XG4gIHJldHVybiB7XG4gICAgLi4uaW5pdGlhbERvY3VtZW50VXBsb2FkU3RhdGUsXG4gICAgcGhhc2U6ICdlcnJvcicsXG4gICAgZXJyb3IsXG4gICAgc3RhdHVzTWVzc2FnZSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlU2VsZWN0ZWRGaWxlKGZpbGU6IEZpbGUgfCBudWxsLCBtYXhVcGxvYWRCeXRlczogbnVtYmVyKTogVXBsb2FkU3RhdGUge1xuICBpZiAoIWZpbGUpIHtcclxuICAgIHJldHVybiBpbml0aWFsVXBsb2FkU3RhdGU7XHJcbiAgfVxyXG5cclxuICBjb25zdCBleHRlbnNpb24gPSBnZXRGaWxlRXh0ZW5zaW9uKGZpbGUubmFtZSk7XHJcbiAgaWYgKCFzdXBwb3J0ZWRFeHRlbnNpb25zLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcclxuICAgIHJldHVybiBjcmVhdGVVcGxvYWRFcnJvclN0YXRlKCdPbmx5IC5tZCBhbmQgLnR4dCBmaWxlcyBhcmUgc3VwcG9ydGVkLicsICdVbnN1cHBvcnRlZCBmaWxlIHR5cGUuJyk7XHJcbiAgfVxyXG5cclxuICBpZiAoZmlsZS5zaXplID4gbWF4VXBsb2FkQnl0ZXMpIHtcclxuICAgIHJldHVybiBjcmVhdGVVcGxvYWRFcnJvclN0YXRlKFxyXG4gICAgICBgRmlsZSBleGNlZWRzIHRoZSAke01hdGgucm91bmQobWF4VXBsb2FkQnl0ZXMgLyAxMDI0IC8gMTAyNCl9IE1CIHVwbG9hZCBsaW1pdC5gLFxyXG4gICAgICAnU2VsZWN0ZWQgZmlsZSBpcyB0b28gbGFyZ2UuJ1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBjcmVhdGVTZWxlY3RlZEZpbGVVcGxvYWRTdGF0ZShmaWxlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlU2VsZWN0ZWREb2N1bWVudEZpbGUoZmlsZTogRmlsZSB8IG51bGwsIG1heFVwbG9hZEJ5dGVzOiBudW1iZXIpOiBEb2N1bWVudFVwbG9hZFN0YXRlIHtcbiAgaWYgKCFmaWxlKSB7XG4gICAgcmV0dXJuIGluaXRpYWxEb2N1bWVudFVwbG9hZFN0YXRlO1xuICB9XG5cbiAgY29uc3QgZXh0ZW5zaW9uID0gZ2V0RmlsZUV4dGVuc2lvbihmaWxlLm5hbWUpO1xuICBpZiAoIXN1cHBvcnRlZERvY3VtZW50RXh0ZW5zaW9ucy5pbmNsdWRlcyhleHRlbnNpb24pKSB7XG4gICAgcmV0dXJuIGNyZWF0ZURvY3VtZW50VXBsb2FkRXJyb3JTdGF0ZSgnT25seSAucGRmLCAubWQsIGFuZCAudHh0IGZpbGVzIGFyZSBzdXBwb3J0ZWQuJywgJ1Vuc3VwcG9ydGVkIGZpbGUgdHlwZS4nKTtcbiAgfVxuXG4gIGlmIChmaWxlLnNpemUgPiBtYXhVcGxvYWRCeXRlcykge1xuICAgIHJldHVybiBjcmVhdGVEb2N1bWVudFVwbG9hZEVycm9yU3RhdGUoXG4gICAgICBgRmlsZSBleGNlZWRzIHRoZSAke01hdGgucm91bmQobWF4VXBsb2FkQnl0ZXMgLyAxMDI0IC8gMTAyNCl9IE1CIHVwbG9hZCBsaW1pdC5gLFxuICAgICAgJ1NlbGVjdGVkIGZpbGUgaXMgdG9vIGxhcmdlLidcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGNyZWF0ZVNlbGVjdGVkRG9jdW1lbnRGaWxlVXBsb2FkU3RhdGUoZmlsZSk7XG59XG5cbmZ1bmN0aW9uIHRvRnJpZW5kbHlNZXNzYWdlKGVycm9yOiB1bmtub3duKSB7XHJcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXBpQ2xpZW50RXJyb3IpIHtcclxuICAgIHJldHVybiBlcnJvci5tZXNzYWdlO1xyXG4gIH1cclxuXHJcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgIHJldHVybiBlcnJvci5tZXNzYWdlO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuICdBbiB1bmV4cGVjdGVkIGZyb250ZW5kIGVycm9yIG9jY3VycmVkLic7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBBcHBQcm92aWRlcih7IGNoaWxkcmVuIH06IHsgY2hpbGRyZW46IFJlYWN0Tm9kZSB9KSB7XG4gIGNvbnN0IFt1cGxvYWQsIHNldFVwbG9hZF0gPSB1c2VTdGF0ZTxVcGxvYWRTdGF0ZT4oaW5pdGlhbFVwbG9hZFN0YXRlKTtcbiAgY29uc3QgW2dyYXBoLCBzZXRHcmFwaF0gPSB1c2VTdGF0ZTxHcmFwaFN0YXRlPihpbml0aWFsR3JhcGhTdGF0ZSk7XG4gIGNvbnN0IFtkb2N1bWVudFVwbG9hZCwgc2V0RG9jdW1lbnRVcGxvYWRdID0gdXNlU3RhdGU8RG9jdW1lbnRVcGxvYWRTdGF0ZT4oaW5pdGlhbERvY3VtZW50VXBsb2FkU3RhdGUpO1xuICBjb25zdCBbZG9jdW1lbnRHcmFwaCwgc2V0RG9jdW1lbnRHcmFwaF0gPSB1c2VTdGF0ZTxEb2N1bWVudEdyYXBoU3RhdGU+KGluaXRpYWxEb2N1bWVudEdyYXBoU3RhdGUpO1xuICBjb25zdCBwcm9jZXNzaW5nUHJvbWlzZVJlZiA9IHVzZVJlZjxQcm9taXNlPHZvaWQ+IHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IGRvY3VtZW50UHJvY2Vzc2luZ1Byb21pc2VSZWYgPSB1c2VSZWY8UHJvbWlzZTx2b2lkPiB8IG51bGw+KG51bGwpO1xuXHJcbiAgY29uc3Qgc2V0RHJhZ0FjdGl2ZSA9IHVzZUNhbGxiYWNrKChhY3RpdmU6IGJvb2xlYW4pID0+IHtcclxuICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4ge1xyXG4gICAgICBpZiAoYWN0aXZlKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdkcmFnLWhvdmVyJywgc3RhdHVzTWVzc2FnZTogJ0Ryb3AgdGhlIGZpbGUgdG8gcXVldWUgaXQgZm9yIGluZ2VzdGlvbi4nIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChjdXJyZW50LnNlbGVjdGVkRmlsZSkge1xyXG4gICAgICAgIHJldHVybiB7IC4uLmN1cnJlbnQsIHBoYXNlOiAnZmlsZS1zZWxlY3RlZCcsIHN0YXR1c01lc3NhZ2U6IGBSZWFkeSB0byBhbmFseXplICR7Y3VycmVudC5zZWxlY3RlZEZpbGUubmFtZX0uYCB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4geyAuLi5jdXJyZW50LCBwaGFzZTogJ2lkbGUnLCBzdGF0dXNNZXNzYWdlOiBpbml0aWFsVXBsb2FkU3RhdGUuc3RhdHVzTWVzc2FnZSB9O1xyXG4gICAgfSk7XHJcbiAgfSwgW10pO1xyXG5cclxuICBjb25zdCBzZWxlY3RGaWxlID0gdXNlQ2FsbGJhY2soKGZpbGU6IEZpbGUgfCBudWxsKSA9PiB7XHJcbiAgICBjb25zdCBuZXh0U3RhdGUgPSB2YWxpZGF0ZVNlbGVjdGVkRmlsZShmaWxlLCBhcHBDb25maWcubWF4VXBsb2FkQnl0ZXMpO1xyXG4gICAgc2V0VXBsb2FkKG5leHRTdGF0ZSk7XHJcbiAgICByZXR1cm4gbmV4dFN0YXRlLnBoYXNlID09PSAnZmlsZS1zZWxlY3RlZCc7XHJcbiAgfSwgW10pO1xyXG5cclxuICBjb25zdCBjbGVhclNlbGVjdGVkRmlsZSA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBzZXRVcGxvYWQoaW5pdGlhbFVwbG9hZFN0YXRlKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHNldERvY3VtZW50RHJhZ0FjdGl2ZSA9IHVzZUNhbGxiYWNrKChhY3RpdmU6IGJvb2xlYW4pID0+IHtcbiAgICBzZXREb2N1bWVudFVwbG9hZCgoY3VycmVudCkgPT4ge1xuICAgICAgaWYgKGFjdGl2ZSkge1xuICAgICAgICByZXR1cm4geyAuLi5jdXJyZW50LCBwaGFzZTogJ2RyYWctaG92ZXInLCBzdGF0dXNNZXNzYWdlOiAnRHJvcCB0aGUgZG9jdW1lbnQgdG8gcXVldWUgaXQgZm9yIGdyYXBoIGV4dHJhY3Rpb24uJyB9O1xuICAgICAgfVxuXG4gICAgICBpZiAoY3VycmVudC5zZWxlY3RlZEZpbGUpIHtcbiAgICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdmaWxlLXNlbGVjdGVkJywgc3RhdHVzTWVzc2FnZTogYFJlYWR5IHRvIG1hcCAke2N1cnJlbnQuc2VsZWN0ZWRGaWxlLm5hbWV9LmAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdpZGxlJywgc3RhdHVzTWVzc2FnZTogaW5pdGlhbERvY3VtZW50VXBsb2FkU3RhdGUuc3RhdHVzTWVzc2FnZSB9O1xuICAgIH0pO1xuICB9LCBbXSk7XG5cbiAgY29uc3Qgc2VsZWN0RG9jdW1lbnRGaWxlID0gdXNlQ2FsbGJhY2soKGZpbGU6IEZpbGUgfCBudWxsKSA9PiB7XG4gICAgY29uc3QgbmV4dFN0YXRlID0gdmFsaWRhdGVTZWxlY3RlZERvY3VtZW50RmlsZShmaWxlLCBhcHBDb25maWcubWF4VXBsb2FkQnl0ZXMpO1xuICAgIHNldERvY3VtZW50VXBsb2FkKG5leHRTdGF0ZSk7XG4gICAgcmV0dXJuIG5leHRTdGF0ZS5waGFzZSA9PT0gJ2ZpbGUtc2VsZWN0ZWQnO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgY2xlYXJTZWxlY3RlZERvY3VtZW50RmlsZSA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBzZXREb2N1bWVudFVwbG9hZChpbml0aWFsRG9jdW1lbnRVcGxvYWRTdGF0ZSk7XG4gIH0sIFtdKTtcblxyXG4gIGNvbnN0IGxvYWRHcmFwaCA9IHVzZUNhbGxiYWNrKGFzeW5jIChvcHRpb25zPzogeyBrZWVwU3RhdHVzPzogYm9vbGVhbiB9KSA9PiB7XG4gICAgc2V0R3JhcGgoKGN1cnJlbnQpID0+ICh7XHJcbiAgICAgIC4uLmN1cnJlbnQsXHJcbiAgICAgIHN0YXR1czogJ2xvYWRpbmcnLFxyXG4gICAgICBlcnJvcjogbnVsbCxcclxuICAgIH0pKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwYXlsb2FkID0gYXdhaXQgZ2V0R3JhcGgoKTtcclxuICAgICAgY29uc3QgYWRhcHRlZEdyYXBoID0gYWRhcHRHcmFwaChwYXlsb2FkKTtcclxuICAgICAgc2V0R3JhcGgoe1xyXG4gICAgICAgIHN0YXR1czogJ3JlYWR5JyxcclxuICAgICAgICBkYXRhOiBhZGFwdGVkR3JhcGgsXHJcbiAgICAgICAgZXJyb3I6IG51bGwsXHJcbiAgICAgICAgbGFzdExvYWRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGlmICghb3B0aW9ucz8ua2VlcFN0YXR1cykge1xyXG4gICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4ge1xyXG4gICAgICAgICAgaWYgKGN1cnJlbnQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCBjdXJyZW50LnBoYXNlID09PSAnZW1wdHktZ3JhcGgnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjdXJyZW50O1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIC4uLmN1cnJlbnQsXHJcbiAgICAgICAgICAgIHBoYXNlOiBhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwID8gJ2VtcHR5LWdyYXBoJyA6IGN1cnJlbnQucGhhc2UsXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBtZXNzYWdlID0gdG9GcmllbmRseU1lc3NhZ2UoZXJyb3IpO1xyXG4gICAgICBzZXRHcmFwaCh7XHJcbiAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxyXG4gICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgZXJyb3I6IG1lc3NhZ2UsXHJcbiAgICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxyXG4gICAgICB9KTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfSwgW10pO1xuXG4gIGNvbnN0IGxvYWREb2N1bWVudEdyYXBoID0gdXNlQ2FsbGJhY2soYXN5bmMgKG9wdGlvbnM/OiB7IGtlZXBTdGF0dXM/OiBib29sZWFuIH0pID0+IHtcbiAgICBzZXREb2N1bWVudEdyYXBoKChjdXJyZW50KSA9PiAoe1xuICAgICAgLi4uY3VycmVudCxcbiAgICAgIHN0YXR1czogJ2xvYWRpbmcnLFxuICAgICAgZXJyb3I6IG51bGwsXG4gICAgfSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCBnZXREb2N1bWVudEdyYXBoKCk7XG4gICAgICBjb25zdCBhZGFwdGVkR3JhcGggPSBhZGFwdERvY3VtZW50R3JhcGgocGF5bG9hZCk7XG4gICAgICBzZXREb2N1bWVudEdyYXBoKHtcbiAgICAgICAgc3RhdHVzOiAncmVhZHknLFxuICAgICAgICBkYXRhOiBhZGFwdGVkR3JhcGgsXG4gICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICBsYXN0TG9hZGVkQXQ6IERhdGUubm93KCksXG4gICAgICB9KTtcblxuICAgICAgaWYgKCFvcHRpb25zPy5rZWVwU3RhdHVzKSB7XG4gICAgICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGN1cnJlbnQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCBjdXJyZW50LnBoYXNlID09PSAnZW1wdHktZ3JhcGgnKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VycmVudDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICAgIHBoYXNlOiBhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwID8gJ2VtcHR5LWdyYXBoJyA6IGN1cnJlbnQucGhhc2UsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0b0ZyaWVuZGx5TWVzc2FnZShlcnJvcik7XG4gICAgICBzZXREb2N1bWVudEdyYXBoKHtcbiAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICBlcnJvcjogbWVzc2FnZSxcbiAgICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxuICAgICAgfSk7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH0sIFtdKTtcblxyXG4gIGNvbnN0IGJlZ2luUHJvY2Vzc2luZyA9IHVzZUNhbGxiYWNrKGFzeW5jICgpID0+IHtcbiAgICBpZiAoIXVwbG9hZC5zZWxlY3RlZEZpbGUpIHtcclxuICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PiAoe1xyXG4gICAgICAgIC4uLmN1cnJlbnQsXHJcbiAgICAgICAgcGhhc2U6ICdlcnJvcicsXHJcbiAgICAgICAgZXJyb3I6ICdDaG9vc2UgYSAubWQgb3IgLnR4dCBmaWxlIGJlZm9yZSBwcm9jZXNzaW5nLicsXHJcbiAgICAgICAgc3RhdHVzTWVzc2FnZTogJ05vIGZpbGUgc2VsZWN0ZWQuJyxcclxuICAgICAgfSkpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQpIHtcclxuICAgICAgcmV0dXJuIHByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc2VsZWN0ZWRGaWxlID0gdXBsb2FkLnNlbGVjdGVkRmlsZTtcclxuXHJcbiAgICBjb25zdCB0YXNrID0gKGFzeW5jICgpID0+IHtcclxuICAgICAgbGV0IHByb2Nlc3NpbmdQaGFzZVRpbWVyID0gMDtcclxuICAgICAgY29uc3QgaW5nZXN0aW9uSWQgPSBjcnlwdG8ucmFuZG9tVVVJRCgpO1xyXG4gICAgICBsZXQga2VlcFBvbGxpbmcgPSB0cnVlO1xyXG5cclxuICAgICAgY29uc3QgcG9sbFByb2Nlc3NpbmcgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgd2hpbGUgKGtlZXBQb2xsaW5nKSB7XHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzaW5nU3RhdHVzID0gYXdhaXQgZ2V0UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZCk7XHJcbiAgICAgICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT5cclxuICAgICAgICAgICAgICBjdXJyZW50LmluZ2VzdGlvbklkICE9PSBpbmdlc3Rpb25JZFxyXG4gICAgICAgICAgICAgICAgPyBjdXJyZW50XHJcbiAgICAgICAgICAgICAgICA6IHtcclxuICAgICAgICAgICAgICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXMsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzTWVzc2FnZTogcHJvY2Vzc2luZ1N0YXR1cy5sYXRlc3RfZXZlbnQgfHwgY3VycmVudC5zdGF0dXNNZXNzYWdlLFxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgLy8gUG9sbGluZyBpcyBiZXN0LWVmZm9ydCBzbyB0aGUgbWFpbiB1cGxvYWQgZmxvdyBjYW4gY29udGludWUgZXZlbiBpZiBzdGF0dXMgcmVmcmVzaCBmYWlscy5cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAoIWtlZXBQb2xsaW5nKSB7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB3aW5kb3cuc2V0VGltZW91dChyZXNvbHZlLCA4MDApKTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4gKHtcclxuICAgICAgICAgIC4uLmN1cnJlbnQsXHJcbiAgICAgICAgICBwaGFzZTogJ3VwbG9hZGluZycsXHJcbiAgICAgICAgICBlcnJvcjogbnVsbCxcclxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6IGBVcGxvYWRpbmcgJHtzZWxlY3RlZEZpbGUubmFtZX0uLi5gLFxyXG4gICAgICAgICAgaW5nZXN0aW9uSWQsXHJcbiAgICAgICAgICBzdGFydGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICBjb21wbGV0ZWRBdDogbnVsbCxcclxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IHtcclxuICAgICAgICAgICAgaW5nZXN0aW9uX2lkOiBpbmdlc3Rpb25JZCxcclxuICAgICAgICAgICAgc3RhdGU6ICdwZW5kaW5nJyxcclxuICAgICAgICAgICAgZmlsZW5hbWU6IHNlbGVjdGVkRmlsZS5uYW1lLFxyXG4gICAgICAgICAgICBjaHVua3NfdG90YWw6IG51bGwsXHJcbiAgICAgICAgICAgIGN1cnJlbnRfY2h1bms6IG51bGwsXHJcbiAgICAgICAgICAgIHN0YXJ0ZWRfYXQ6IG51bGwsXHJcbiAgICAgICAgICAgIGNvbXBsZXRlZF9hdDogbnVsbCxcclxuICAgICAgICAgICAgbGF0ZXN0X2V2ZW50OiBgVXBsb2FkaW5nICR7c2VsZWN0ZWRGaWxlLm5hbWV9Li4uYCxcclxuICAgICAgICAgICAgZXZlbnRzOiBbXSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBjb25zdCBwb2xsaW5nVGFzayA9IHBvbGxQcm9jZXNzaW5nKCk7XHJcblxyXG4gICAgICAgIHByb2Nlc3NpbmdQaGFzZVRpbWVyID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PlxyXG4gICAgICAgICAgICBjdXJyZW50LnBoYXNlID09PSAndXBsb2FkaW5nJ1xyXG4gICAgICAgICAgICAgID8ge1xyXG4gICAgICAgICAgICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgICAgICAgICAgICBwaGFzZTogJ3Byb2Nlc3NpbmcnLFxyXG4gICAgICAgICAgICAgICAgICBzdGF0dXNNZXNzYWdlOiAnRXh0cmFjdGluZyBjb21wb25lbnRzLCByZWxhdGlvbnNoaXBzLCBhbmQgcmlzayBtZXRyaWNzLi4uJyxcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICA6IGN1cnJlbnRcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfSwgOTAwKTtcclxuXHJcbiAgICAgICAgY29uc3QgaW5nZXN0aW9uID0gYXdhaXQgdXBsb2FkRG9jdW1lbnQoc2VsZWN0ZWRGaWxlLCB0cnVlLCBhcHBDb25maWcucHJvY2Vzc2luZ1RpbWVvdXRNcywgaW5nZXN0aW9uSWQpO1xyXG4gICAgICAgIGNvbnN0IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgPSBhd2FpdCBnZXRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuXHJcbiAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PiAoe1xyXG4gICAgICAgICAgLi4uY3VycmVudCxcclxuICAgICAgICAgIGluZ2VzdGlvbixcclxuICAgICAgICAgIHBoYXNlOiAncHJvY2Vzc2luZycsXHJcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzPy5sYXRlc3RfZXZlbnQgfHwgJ0xvYWRpbmcgdGhlIGdlbmVyYXRlZCBncmFwaCB3b3Jrc3BhY2UuLi4nLFxyXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czogbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyB8fCBjdXJyZW50LnByb2Nlc3NpbmdTdGF0dXMsXHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBjb25zdCBncmFwaFBheWxvYWQgPSBhd2FpdCBnZXRHcmFwaCgpO1xyXG4gICAgICAgIGNvbnN0IGFkYXB0ZWRHcmFwaCA9IGFkYXB0R3JhcGgoZ3JhcGhQYXlsb2FkKTtcclxuXHJcbiAgICAgICAgc2V0R3JhcGgoe1xyXG4gICAgICAgICAgc3RhdHVzOiAncmVhZHknLFxyXG4gICAgICAgICAgZGF0YTogYWRhcHRlZEdyYXBoLFxyXG4gICAgICAgICAgZXJyb3I6IG51bGwsXHJcbiAgICAgICAgICBsYXN0TG9hZGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4gKHtcclxuICAgICAgICAgIC4uLmN1cnJlbnQsXHJcbiAgICAgICAgICBpbmdlc3Rpb24sXHJcbiAgICAgICAgICBpbmdlc3Rpb25JZCxcclxuICAgICAgICAgIHBoYXNlOiBhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwID8gJ2VtcHR5LWdyYXBoJyA6ICdzdWNjZXNzJyxcclxuICAgICAgICAgIGVycm9yOiBudWxsLFxyXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTpcclxuICAgICAgICAgICAgbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cz8ubGF0ZXN0X2V2ZW50IHx8XHJcbiAgICAgICAgICAgIChhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwXHJcbiAgICAgICAgICAgICAgPyAnUHJvY2Vzc2luZyBjb21wbGV0ZWQsIGJ1dCB0aGUgYWN0aXZlIGdyYXBoIGlzIGVtcHR5LidcclxuICAgICAgICAgICAgICA6ICdUd2luR3JhcGhPcHMgZmluaXNoZWQgcHJvY2Vzc2luZyB5b3VyIGRvY3VtZW50LicpLFxyXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czpcclxuICAgICAgICAgICAgbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyA/P1xyXG4gICAgICAgICAgICBjdXJyZW50LnByb2Nlc3NpbmdTdGF0dXMsXHJcbiAgICAgICAgICBjb21wbGV0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICB9KSk7XHJcbiAgICAgICAga2VlcFBvbGxpbmcgPSBmYWxzZTtcclxuICAgICAgICBhd2FpdCBwb2xsaW5nVGFzaztcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBrZWVwUG9sbGluZyA9IGZhbHNlO1xyXG4gICAgICAgIGNvbnN0IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgPSBhd2FpdCBnZXRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuICAgICAgICBjb25zdCBtZXNzYWdlID0gdG9GcmllbmRseU1lc3NhZ2UoZXJyb3IpO1xyXG4gICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4gKHtcclxuICAgICAgICAgIC4uLmN1cnJlbnQsXHJcbiAgICAgICAgICBwaGFzZTogJ3JldHJ5JyxcclxuICAgICAgICAgIGVycm9yOiBtZXNzYWdlLFxyXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTogbWVzc2FnZSxcclxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgfHwgY3VycmVudC5wcm9jZXNzaW5nU3RhdHVzLFxyXG4gICAgICAgICAgY29tcGxldGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICByZXRyeUNvdW50OiBjdXJyZW50LnJldHJ5Q291bnQgKyAxLFxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBrZWVwUG9sbGluZyA9IGZhbHNlO1xyXG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQocHJvY2Vzc2luZ1BoYXNlVGltZXIpO1xyXG4gICAgICAgIHByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQgPSBudWxsO1xyXG4gICAgICB9XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIHByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQgPSB0YXNrO1xyXG4gICAgcmV0dXJuIHRhc2s7XHJcbiAgfSwgW3VwbG9hZC5zZWxlY3RlZEZpbGVdKTtcblxuICBjb25zdCBiZWdpbkRvY3VtZW50UHJvY2Vzc2luZyA9IHVzZUNhbGxiYWNrKGFzeW5jICgpID0+IHtcbiAgICBpZiAoIWRvY3VtZW50VXBsb2FkLnNlbGVjdGVkRmlsZSkge1xuICAgICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgIHBoYXNlOiAnZXJyb3InLFxuICAgICAgICBlcnJvcjogJ0Nob29zZSBhIC5wZGYsIC5tZCwgb3IgLnR4dCBmaWxlIGJlZm9yZSBwcm9jZXNzaW5nLicsXG4gICAgICAgIHN0YXR1c01lc3NhZ2U6ICdObyBkb2N1bWVudCBzZWxlY3RlZC4nLFxuICAgICAgfSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChkb2N1bWVudFByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQpIHtcbiAgICAgIHJldHVybiBkb2N1bWVudFByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQ7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZWN0ZWRGaWxlID0gZG9jdW1lbnRVcGxvYWQuc2VsZWN0ZWRGaWxlO1xuXG4gICAgY29uc3QgdGFzayA9IChhc3luYyAoKSA9PiB7XG4gICAgICBsZXQgcHJvY2Vzc2luZ1BoYXNlVGltZXIgPSAwO1xuICAgICAgY29uc3QgaW5nZXN0aW9uSWQgPSBjcnlwdG8ucmFuZG9tVVVJRCgpO1xuICAgICAgbGV0IGtlZXBQb2xsaW5nID0gdHJ1ZTtcblxuICAgICAgY29uc3QgcG9sbFByb2Nlc3NpbmcgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgIHdoaWxlIChrZWVwUG9sbGluZykge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzaW5nU3RhdHVzID0gYXdhaXQgZ2V0RG9jdW1lbnRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkKTtcbiAgICAgICAgICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PlxuICAgICAgICAgICAgICBjdXJyZW50LmluZ2VzdGlvbklkICE9PSBpbmdlc3Rpb25JZFxuICAgICAgICAgICAgICAgID8gY3VycmVudFxuICAgICAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzLFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBwcm9jZXNzaW5nU3RhdHVzLmxhdGVzdF9ldmVudCB8fCBjdXJyZW50LnN0YXR1c01lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gUG9sbGluZyBpcyBiZXN0LWVmZm9ydCBzbyB0aGUgbWFpbiB1cGxvYWQgZmxvdyBjYW4gY29udGludWUuXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFrZWVwUG9sbGluZykge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHdpbmRvdy5zZXRUaW1lb3V0KHJlc29sdmUsIDgwMCkpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB0cnkge1xuICAgICAgICBzZXREb2N1bWVudFVwbG9hZCgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIHBoYXNlOiAndXBsb2FkaW5nJyxcbiAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBgVXBsb2FkaW5nICR7c2VsZWN0ZWRGaWxlLm5hbWV9Li4uYCxcbiAgICAgICAgICBpbmdlc3Rpb25JZCxcbiAgICAgICAgICBzdGFydGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgICAgY29tcGxldGVkQXQ6IG51bGwsXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czoge1xuICAgICAgICAgICAgaW5nZXN0aW9uX2lkOiBpbmdlc3Rpb25JZCxcbiAgICAgICAgICAgIHN0YXRlOiAncGVuZGluZycsXG4gICAgICAgICAgICBmaWxlbmFtZTogc2VsZWN0ZWRGaWxlLm5hbWUsXG4gICAgICAgICAgICBjaHVua3NfdG90YWw6IG51bGwsXG4gICAgICAgICAgICBjdXJyZW50X2NodW5rOiBudWxsLFxuICAgICAgICAgICAgc3RhcnRlZF9hdDogbnVsbCxcbiAgICAgICAgICAgIGNvbXBsZXRlZF9hdDogbnVsbCxcbiAgICAgICAgICAgIGxhdGVzdF9ldmVudDogYFVwbG9hZGluZyAke3NlbGVjdGVkRmlsZS5uYW1lfS4uLmAsXG4gICAgICAgICAgICBldmVudHM6IFtdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pKTtcblxuICAgICAgICBjb25zdCBwb2xsaW5nVGFzayA9IHBvbGxQcm9jZXNzaW5nKCk7XG5cbiAgICAgICAgcHJvY2Vzc2luZ1BoYXNlVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+XG4gICAgICAgICAgICBjdXJyZW50LnBoYXNlID09PSAndXBsb2FkaW5nJ1xuICAgICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgICAgICAgICBwaGFzZTogJ3Byb2Nlc3NpbmcnLFxuICAgICAgICAgICAgICAgICAgc3RhdHVzTWVzc2FnZTogJ0V4dHJhY3RpbmcgZG9jdW1lbnQgZW50aXRpZXMsIGV2aWRlbmNlLCBhbmQgcmVsYXRpb25zaGlwcy4uLicsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICA6IGN1cnJlbnRcbiAgICAgICAgICApO1xuICAgICAgICB9LCA5MDApO1xuXG4gICAgICAgIGNvbnN0IGluZ2VzdGlvbiA9IGF3YWl0IHVwbG9hZEtub3dsZWRnZURvY3VtZW50KHNlbGVjdGVkRmlsZSwgdHJ1ZSwgYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMsIGluZ2VzdGlvbklkKTtcbiAgICAgICAgY29uc3QgbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyA9IGF3YWl0IGdldERvY3VtZW50UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZCkuY2F0Y2goKCkgPT4gbnVsbCk7XG5cbiAgICAgICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBpbmdlc3Rpb24sXG4gICAgICAgICAgcGhhc2U6ICdwcm9jZXNzaW5nJyxcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzPy5sYXRlc3RfZXZlbnQgfHwgJ0xvYWRpbmcgdGhlIGdlbmVyYXRlZCBkb2N1bWVudCB3b3Jrc3BhY2UuLi4nLFxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgfHwgY3VycmVudC5wcm9jZXNzaW5nU3RhdHVzLFxuICAgICAgICB9KSk7XG5cbiAgICAgICAgY29uc3QgZ3JhcGhQYXlsb2FkID0gYXdhaXQgZ2V0RG9jdW1lbnRHcmFwaCgpO1xuICAgICAgICBjb25zdCBhZGFwdGVkR3JhcGggPSBhZGFwdERvY3VtZW50R3JhcGgoZ3JhcGhQYXlsb2FkKTtcblxuICAgICAgICBzZXREb2N1bWVudEdyYXBoKHtcbiAgICAgICAgICBzdGF0dXM6ICdyZWFkeScsXG4gICAgICAgICAgZGF0YTogYWRhcHRlZEdyYXBoLFxuICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgIGxhc3RMb2FkZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBpbmdlc3Rpb24sXG4gICAgICAgICAgaW5nZXN0aW9uSWQsXG4gICAgICAgICAgcGhhc2U6IGFkYXB0ZWRHcmFwaC5ub2Rlcy5sZW5ndGggPT09IDAgPyAnZW1wdHktZ3JhcGgnIDogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6XG4gICAgICAgICAgICBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzPy5sYXRlc3RfZXZlbnQgfHxcbiAgICAgICAgICAgIChhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgID8gJ1Byb2Nlc3NpbmcgY29tcGxldGVkLCBidXQgdGhlIGRvY3VtZW50IGdyYXBoIGlzIGVtcHR5LidcbiAgICAgICAgICAgICAgOiAnVHdpbkdyYXBoT3BzIGZpbmlzaGVkIG1hcHBpbmcgeW91ciBkb2N1bWVudC4nKSxcbiAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzOiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzID8/IGN1cnJlbnQucHJvY2Vzc2luZ1N0YXR1cyxcbiAgICAgICAgICBjb21wbGV0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgfSkpO1xuICAgICAgICBrZWVwUG9sbGluZyA9IGZhbHNlO1xuICAgICAgICBhd2FpdCBwb2xsaW5nVGFzaztcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGtlZXBQb2xsaW5nID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgPSBhd2FpdCBnZXREb2N1bWVudFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQpLmNhdGNoKCgpID0+IG51bGwpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gdG9GcmllbmRseU1lc3NhZ2UoZXJyb3IpO1xuICAgICAgICBzZXREb2N1bWVudFVwbG9hZCgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIHBoYXNlOiAncmV0cnknLFxuICAgICAgICAgIGVycm9yOiBtZXNzYWdlLFxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czogbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyB8fCBjdXJyZW50LnByb2Nlc3NpbmdTdGF0dXMsXG4gICAgICAgICAgY29tcGxldGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgICAgcmV0cnlDb3VudDogY3VycmVudC5yZXRyeUNvdW50ICsgMSxcbiAgICAgICAgfSkpO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGtlZXBQb2xsaW5nID0gZmFsc2U7XG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQocHJvY2Vzc2luZ1BoYXNlVGltZXIpO1xuICAgICAgICBkb2N1bWVudFByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgfVxuICAgIH0pKCk7XG5cbiAgICBkb2N1bWVudFByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQgPSB0YXNrO1xuICAgIHJldHVybiB0YXNrO1xuICB9LCBbZG9jdW1lbnRVcGxvYWQuc2VsZWN0ZWRGaWxlXSk7XG5cclxuICBjb25zdCByZXNldFVwbG9hZFN0YXRlID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIHNldFVwbG9hZChpbml0aWFsVXBsb2FkU3RhdGUpO1xuICAgIHNldERvY3VtZW50VXBsb2FkKGluaXRpYWxEb2N1bWVudFVwbG9hZFN0YXRlKTtcbiAgfSwgW10pO1xuXHJcbiAgY29uc3QgdmFsdWUgPSB1c2VNZW1vPEFwcENvbnRleHRWYWx1ZT4oXHJcbiAgICAoKSA9PiAoe1xyXG4gICAgICB1cGxvYWQsXG4gICAgICBncmFwaCxcbiAgICAgIGRvY3VtZW50VXBsb2FkLFxuICAgICAgZG9jdW1lbnRHcmFwaCxcbiAgICAgIHNldERyYWdBY3RpdmUsXG4gICAgICBzZWxlY3RGaWxlLFxuICAgICAgY2xlYXJTZWxlY3RlZEZpbGUsXG4gICAgICBiZWdpblByb2Nlc3NpbmcsXG4gICAgICBsb2FkR3JhcGgsXG4gICAgICBzZXREb2N1bWVudERyYWdBY3RpdmUsXG4gICAgICBzZWxlY3REb2N1bWVudEZpbGUsXG4gICAgICBjbGVhclNlbGVjdGVkRG9jdW1lbnRGaWxlLFxuICAgICAgYmVnaW5Eb2N1bWVudFByb2Nlc3NpbmcsXG4gICAgICBsb2FkRG9jdW1lbnRHcmFwaCxcbiAgICAgIHJlc2V0VXBsb2FkU3RhdGUsXG4gICAgfSksXG4gICAgW1xuICAgICAgdXBsb2FkLFxuICAgICAgZ3JhcGgsXG4gICAgICBkb2N1bWVudFVwbG9hZCxcbiAgICAgIGRvY3VtZW50R3JhcGgsXG4gICAgICBzZXREcmFnQWN0aXZlLFxuICAgICAgc2VsZWN0RmlsZSxcbiAgICAgIGNsZWFyU2VsZWN0ZWRGaWxlLFxuICAgICAgYmVnaW5Qcm9jZXNzaW5nLFxuICAgICAgbG9hZEdyYXBoLFxuICAgICAgc2V0RG9jdW1lbnREcmFnQWN0aXZlLFxuICAgICAgc2VsZWN0RG9jdW1lbnRGaWxlLFxuICAgICAgY2xlYXJTZWxlY3RlZERvY3VtZW50RmlsZSxcbiAgICAgIGJlZ2luRG9jdW1lbnRQcm9jZXNzaW5nLFxuICAgICAgbG9hZERvY3VtZW50R3JhcGgsXG4gICAgICByZXNldFVwbG9hZFN0YXRlLFxuICAgIF1cbiAgKTtcblxyXG4gIHJldHVybiA8QXBwQ29udGV4dC5Qcm92aWRlciB2YWx1ZT17dmFsdWV9PntjaGlsZHJlbn08L0FwcENvbnRleHQuUHJvdmlkZXI+O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdXNlQXBwQ29udGV4dCgpIHtcclxuICBjb25zdCBjb250ZXh0ID0gdXNlQ29udGV4dChBcHBDb250ZXh0KTtcclxuICBpZiAoIWNvbnRleHQpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcigndXNlQXBwQ29udGV4dCBtdXN0IGJlIHVzZWQgd2l0aGluIEFwcFByb3ZpZGVyLicpO1xyXG4gIH1cclxuICByZXR1cm4gY29udGV4dDtcclxufVxyXG4iLCAiaW1wb3J0IGFzc2VydCBmcm9tICdub2RlOmFzc2VydC9zdHJpY3QnO1xyXG5pbXBvcnQgdGVzdCBmcm9tICdub2RlOnRlc3QnO1xyXG5pbXBvcnQgeyBpbnN0YWxsUnVudGltZVdpbmRvd0NvbmZpZyB9IGZyb20gJy4vdGVzdC11dGlscyc7XHJcblxyXG5pbnN0YWxsUnVudGltZVdpbmRvd0NvbmZpZygpO1xyXG5cclxuY29uc3Qgc3RhdGVNb2R1bGUgPSBhd2FpdCBpbXBvcnQoJy4uL3NyYy9zdGF0ZS9BcHBDb250ZXh0Jyk7XHJcbmNvbnN0IHtcbiAgY3JlYXRlU2VsZWN0ZWREb2N1bWVudEZpbGVVcGxvYWRTdGF0ZSxcbiAgY3JlYXRlU2VsZWN0ZWRGaWxlVXBsb2FkU3RhdGUsXG4gIGdldEZpbGVFeHRlbnNpb24sXG4gIHZhbGlkYXRlU2VsZWN0ZWREb2N1bWVudEZpbGUsXG4gIHZhbGlkYXRlU2VsZWN0ZWRGaWxlLFxufSA9IHN0YXRlTW9kdWxlO1xuXHJcbnRlc3QoJ2dldEZpbGVFeHRlbnNpb24gbm9ybWFsaXplcyBmaWxlIGV4dGVuc2lvbnMnLCAoKSA9PiB7XHJcbiAgYXNzZXJ0LmVxdWFsKGdldEZpbGVFeHRlbnNpb24oJ21hbnVhbC5NRCcpLCAnLm1kJyk7XHJcbiAgYXNzZXJ0LmVxdWFsKGdldEZpbGVFeHRlbnNpb24oJ25vdGVzLnR4dCcpLCAnLnR4dCcpO1xyXG4gIGFzc2VydC5lcXVhbChnZXRGaWxlRXh0ZW5zaW9uKCdSRUFETUUnKSwgJycpO1xyXG59KTtcclxuXHJcbnRlc3QoJ3ZhbGlkYXRlU2VsZWN0ZWRGaWxlIHJlamVjdHMgdW5zdXBwb3J0ZWQgZmlsZSB0eXBlcycsICgpID0+IHtcclxuICBjb25zdCBmaWxlID0gbmV3IEZpbGUoWydiYWQnXSwgJ2RpYWdyYW0ucGRmJywgeyB0eXBlOiAnYXBwbGljYXRpb24vcGRmJyB9KTtcclxuICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZVNlbGVjdGVkRmlsZShmaWxlLCAxMCAqIDEwMjQgKiAxMDI0KTtcclxuXHJcbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5waGFzZSwgJ2Vycm9yJyk7XHJcbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5lcnJvciwgJ09ubHkgLm1kIGFuZCAudHh0IGZpbGVzIGFyZSBzdXBwb3J0ZWQuJyk7XHJcbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5zdGF0dXNNZXNzYWdlLCAnVW5zdXBwb3J0ZWQgZmlsZSB0eXBlLicpO1xyXG59KTtcclxuXHJcbnRlc3QoJ3ZhbGlkYXRlU2VsZWN0ZWRGaWxlIHJlamVjdHMgb3ZlcnNpemVkIGZpbGVzJywgKCkgPT4ge1xyXG4gIGNvbnN0IGZpbGUgPSBuZXcgRmlsZShbbmV3IFVpbnQ4QXJyYXkoMTIpXSwgJ3N5c3RlbS5tZCcsIHsgdHlwZTogJ3RleHQvbWFya2Rvd24nIH0pO1xyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShmaWxlLCAnc2l6ZScsIHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogMTIgKiAxMDI0ICogMTAyNCB9KTtcclxuXHJcbiAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVTZWxlY3RlZEZpbGUoZmlsZSwgMTAgKiAxMDI0ICogMTAyNCk7XHJcblxyXG4gIGFzc2VydC5lcXVhbChyZXN1bHQucGhhc2UsICdlcnJvcicpO1xyXG4gIGFzc2VydC5tYXRjaChyZXN1bHQuZXJyb3IgfHwgJycsIC8xMCBNQiB1cGxvYWQgbGltaXQvKTtcclxuICBhc3NlcnQuZXF1YWwocmVzdWx0LnN0YXR1c01lc3NhZ2UsICdTZWxlY3RlZCBmaWxlIGlzIHRvbyBsYXJnZS4nKTtcclxufSk7XHJcblxyXG50ZXN0KCd2YWxpZGF0ZVNlbGVjdGVkRmlsZSBhY2NlcHRzIHN1cHBvcnRlZCBmaWxlcyBhbmQgcmV0dXJucyB0aGUgc2VsZWN0ZWQtZmlsZSBzdGF0ZScsICgpID0+IHtcbiAgY29uc3QgZmlsZSA9IG5ldyBGaWxlKFsnaGVsbG8nXSwgJ3N5c3RlbS5tZCcsIHsgdHlwZTogJ3RleHQvbWFya2Rvd24nIH0pO1xyXG4gIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlU2VsZWN0ZWRGaWxlKGZpbGUsIDEwICogMTAyNCAqIDEwMjQpO1xyXG5cclxuICBhc3NlcnQuZGVlcEVxdWFsKHJlc3VsdCwgY3JlYXRlU2VsZWN0ZWRGaWxlVXBsb2FkU3RhdGUoZmlsZSkpO1xufSk7XG5cbnRlc3QoJ3ZhbGlkYXRlU2VsZWN0ZWREb2N1bWVudEZpbGUgYWNjZXB0cyBwZGYgbWFya2Rvd24gYW5kIHRleHQgZmlsZXMnLCAoKSA9PiB7XG4gIGZvciAoY29uc3QgZmlsZW5hbWUgb2YgWydwb2xpY3kucGRmJywgJ3BvbGljeS5tZCcsICdwb2xpY3kudHh0J10pIHtcbiAgICBjb25zdCBmaWxlID0gbmV3IEZpbGUoWydoZWxsbyddLCBmaWxlbmFtZSk7XG4gICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVTZWxlY3RlZERvY3VtZW50RmlsZShmaWxlLCAxMCAqIDEwMjQgKiAxMDI0KTtcblxuICAgIGFzc2VydC5kZWVwRXF1YWwocmVzdWx0LCBjcmVhdGVTZWxlY3RlZERvY3VtZW50RmlsZVVwbG9hZFN0YXRlKGZpbGUpKTtcbiAgfVxufSk7XG4iLCAiZXhwb3J0IGZ1bmN0aW9uIGluc3RhbGxSdW50aW1lV2luZG93Q29uZmlnKG92ZXJyaWRlczogUGFydGlhbDxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXI+PiA9IHt9KSB7XHJcbiAgY29uc3QgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gKGNhbGxiYWNrOiBGcmFtZVJlcXVlc3RDYWxsYmFjaykgPT4gc2V0VGltZW91dCgoKSA9PiBjYWxsYmFjayhEYXRlLm5vdygpKSwgMCk7XHJcbiAgY29uc3QgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSAoaGFuZGxlOiBudW1iZXIpID0+IGNsZWFyVGltZW91dChoYW5kbGUpO1xyXG5cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ3dpbmRvdycsIHtcclxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIHdyaXRhYmxlOiB0cnVlLFxyXG4gICAgdmFsdWU6IHtcclxuICAgICAgX19UV0lOX0NPTkZJR19fOiB7XHJcbiAgICAgICAgTUFYX1VQTE9BRF9NQjogMTAsXHJcbiAgICAgICAgUFJPQ0VTU0lOR19USU1FT1VUX01TOiA5MDAwMCxcclxuICAgICAgICBBUFBfRU5WOiAndGVzdCcsXHJcbiAgICAgICAgLi4ub3ZlcnJpZGVzLFxyXG4gICAgICB9LFxyXG4gICAgICBzZXRUaW1lb3V0LFxyXG4gICAgICBjbGVhclRpbWVvdXQsXHJcbiAgICAgIHNldEludGVydmFsLFxyXG4gICAgICBjbGVhckludGVydmFsLFxyXG4gICAgICBhZGRFdmVudExpc3RlbmVyOiAoKSA9PiB7fSxcclxuICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogKCkgPT4ge30sXHJcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSxcclxuICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUsXHJcbiAgICAgIGRldmljZVBpeGVsUmF0aW86IDEsXHJcbiAgICB9LFxyXG4gIH0pO1xyXG5cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ2RvY3VtZW50Jywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZToge1xyXG4gICAgICBjcmVhdGVFbGVtZW50OiAoKSA9PiAoe1xyXG4gICAgICAgIGdldENvbnRleHQ6ICgpID0+ICh7fSksXHJcbiAgICAgICAgc3R5bGU6IHt9LFxyXG4gICAgICAgIHNldEF0dHJpYnV0ZTogKCkgPT4ge30sXHJcbiAgICAgICAgYXBwZW5kQ2hpbGQ6ICgpID0+IHt9LFxyXG4gICAgICB9KSxcclxuICAgICAgYm9keToge1xyXG4gICAgICAgIGFwcGVuZENoaWxkOiAoKSA9PiB7fSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSk7XHJcblxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnbmF2aWdhdG9yJywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZToge1xyXG4gICAgICB1c2VyQWdlbnQ6ICdub2RlLmpzJyxcclxuICAgIH0sXHJcbiAgfSk7XHJcblxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAncmVxdWVzdEFuaW1hdGlvbkZyYW1lJywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZTogcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxyXG4gIH0pO1xyXG5cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ2NhbmNlbEFuaW1hdGlvbkZyYW1lJywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZTogY2FuY2VsQW5pbWF0aW9uRnJhbWUsXHJcbiAgfSk7XHJcblxyXG4gIGlmICghKCdSZXNpemVPYnNlcnZlcicgaW4gZ2xvYmFsVGhpcykpIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnUmVzaXplT2JzZXJ2ZXInLCB7XHJcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICAgIHZhbHVlOiBjbGFzcyBSZXNpemVPYnNlcnZlciB7XHJcbiAgICAgICAgb2JzZXJ2ZSgpIHt9XHJcbiAgICAgICAgdW5vYnNlcnZlKCkge31cclxuICAgICAgICBkaXNjb25uZWN0KCkge31cclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNhbXBsZUdyYXBoRGF0YSgpIHtcbiAgY29uc3Qgbm9kZXMgPSBbXHJcbiAgICB7XHJcbiAgICAgIGlkOiAnYXBpJyxcclxuICAgICAgbmFtZTogJ0FQSSBTZXJ2aWNlJyxcclxuICAgICAgdHlwZTogJ3NvZnR3YXJlJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb3JlIEFQSScsXHJcbiAgICAgIHJpc2tTY29yZTogODIsXHJcbiAgICAgIHJpc2tMZXZlbDogJ2hpZ2gnLFxyXG4gICAgICBkZWdyZWU6IDIsXHJcbiAgICAgIGJldHdlZW5uZXNzOiAwLjU1LFxyXG4gICAgICBjbG9zZW5lc3M6IDAuNjcsXHJcbiAgICAgIGJsYXN0UmFkaXVzOiAzLFxyXG4gICAgICBkZXBlbmRlbmN5U3BhbjogMixcclxuICAgICAgcmlza0V4cGxhbmF0aW9uOiAnSGFuZGxlcyBjb3JlIHJlcXVlc3RzLicsXHJcbiAgICAgIHNvdXJjZTogJ3NhbXBsZScsXHJcbiAgICAgIGRlcGVuZGVuY2llczogWydkYiddLFxyXG4gICAgICBkZXBlbmRlbnRzOiBbJ2Zyb250ZW5kJ10sXHJcbiAgICAgIHZhbDogMzYsXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBpZDogJ2RiJyxcclxuICAgICAgbmFtZTogJ0RhdGFiYXNlJyxcclxuICAgICAgdHlwZTogJ2RhdGEnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1BlcnNpc3RlbmNlIGxheWVyJyxcclxuICAgICAgcmlza1Njb3JlOiA0NCxcclxuICAgICAgcmlza0xldmVsOiAnbWVkaXVtJyxcclxuICAgICAgZGVncmVlOiAxLFxyXG4gICAgICBiZXR3ZWVubmVzczogMC4yMixcclxuICAgICAgY2xvc2VuZXNzOiAwLjQ0LFxyXG4gICAgICBibGFzdFJhZGl1czogMSxcclxuICAgICAgZGVwZW5kZW5jeVNwYW46IDEsXHJcbiAgICAgIHJpc2tFeHBsYW5hdGlvbjogJ1N0b3JlcyByZWNvcmRzLicsXHJcbiAgICAgIHNvdXJjZTogJ3NhbXBsZScsXHJcbiAgICAgIGRlcGVuZGVuY2llczogW10sXHJcbiAgICAgIGRlcGVuZGVudHM6IFsnYXBpJ10sXHJcbiAgICAgIHZhbDogMjgsXHJcbiAgICB9LFxyXG4gIF07XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBzb3VyY2U6ICdzYW1wbGUnLFxyXG4gICAgbm9kZXMsXHJcbiAgICBsaW5rczogW1xyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdhcGktZGItMCcsXHJcbiAgICAgICAgc291cmNlOiAnYXBpJyxcclxuICAgICAgICB0YXJnZXQ6ICdkYicsXHJcbiAgICAgICAgcmVsYXRpb246ICdkZXBlbmRzX29uJyxcclxuICAgICAgICByYXRpb25hbGU6ICdSZWFkcyBhbmQgd3JpdGVzIHJlY29yZHMuJyxcclxuICAgICAgfSxcclxuICAgIF0sXHJcbiAgICBub2RlSW5kZXg6IE9iamVjdC5mcm9tRW50cmllcyhub2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLmlkLCBub2RlXSkpLFxyXG4gICAgcmVsYXRpb25UeXBlczogWydkZXBlbmRzX29uJ10sXHJcbiAgfTtcclxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2FtcGxlRG9jdW1lbnRHcmFwaERhdGEoKSB7XG4gIGNvbnN0IG5vZGVzID0gW1xuICAgIHtcbiAgICAgIGlkOiAnRDEnLFxuICAgICAgbGFiZWw6ICdSZXRlbnRpb24gUG9saWN5JyxcbiAgICAgIGtpbmQ6ICdyZXF1aXJlbWVudCcsXG4gICAgICBjYW5vbmljYWxOYW1lOiAnUmV0ZW50aW9uIFBvbGljeScsXG4gICAgICBhbGlhc2VzOiBbJ3JlY29yZHMgcG9saWN5J10sXG4gICAgICBzdW1tYXJ5OiAnRGVmaW5lcyByZWNvcmQgcmV0ZW50aW9uLicsXG4gICAgICBldmlkZW5jZTogW3sgcXVvdGU6ICdSZWNvcmRzIGFyZSByZXRhaW5lZCBmb3IgNyB5ZWFycy4nLCBwYWdlU3RhcnQ6IDEsIHBhZ2VFbmQ6IDEgfV0sXG4gICAgICBzb3VyY2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBkb2N1bWVudE5hbWU6ICdwb2xpY3kucGRmJyxcbiAgICAgICAgICBjaHVua0ZpbGU6ICdjaHVua18wMS50eHQnLFxuICAgICAgICAgIGNodW5rSWQ6ICdjaHVua18wMScsXG4gICAgICAgICAgcGRmUGFnZVN0YXJ0OiAxLFxuICAgICAgICAgIHBkZlBhZ2VFbmQ6IDEsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgZGVncmVlOiAxLFxuICAgICAgc291cmNlOiAnZG9jdW1lbnQnLFxuICAgICAgdmFsOiAyMCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAnRDInLFxuICAgICAgbGFiZWw6ICdTZXZlbiBZZWFycycsXG4gICAgICBraW5kOiAnZGF0ZScsXG4gICAgICBjYW5vbmljYWxOYW1lOiAnU2V2ZW4gWWVhcnMnLFxuICAgICAgYWxpYXNlczogW10sXG4gICAgICBzdW1tYXJ5OiAnUmV0ZW50aW9uIGR1cmF0aW9uLicsXG4gICAgICBldmlkZW5jZTogW3sgcXVvdGU6ICc3IHllYXJzJywgcGFnZVN0YXJ0OiAxLCBwYWdlRW5kOiAxIH1dLFxuICAgICAgc291cmNlczogW10sXG4gICAgICBkZWdyZWU6IDEsXG4gICAgICBzb3VyY2U6ICdkb2N1bWVudCcsXG4gICAgICB2YWw6IDIwLFxuICAgIH0sXG4gIF07XG5cbiAgcmV0dXJuIHtcbiAgICBzb3VyY2U6ICdkb2N1bWVudCcsXG4gICAgbm9kZXMsXG4gICAgbGlua3M6IFtcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdERTEnLFxuICAgICAgICBzb3VyY2U6ICdEMScsXG4gICAgICAgIHRhcmdldDogJ0QyJyxcbiAgICAgICAgdHlwZTogJ3JlcXVpcmVzJyxcbiAgICAgICAgc3VtbWFyeTogJ1JldGVudGlvbiBwb2xpY3kgcmVxdWlyZXMgc2V2ZW4geWVhcnMuJyxcbiAgICAgICAgZXZpZGVuY2U6IFt7IHF1b3RlOiAncmV0YWluZWQgZm9yIDcgeWVhcnMnLCBwYWdlU3RhcnQ6IDEsIHBhZ2VFbmQ6IDEgfV0sXG4gICAgICAgIHNvdXJjZUNodW5rOiB7XG4gICAgICAgICAgZG9jdW1lbnROYW1lOiAncG9saWN5LnBkZicsXG4gICAgICAgICAgY2h1bmtGaWxlOiAnY2h1bmtfMDEudHh0JyxcbiAgICAgICAgICBjaHVua0lkOiAnY2h1bmtfMDEnLFxuICAgICAgICAgIHBkZlBhZ2VTdGFydDogMSxcbiAgICAgICAgICBwZGZQYWdlRW5kOiAxLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICBdLFxuICAgIG5vZGVJbmRleDogT2JqZWN0LmZyb21FbnRyaWVzKG5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUuaWQsIG5vZGVdKSksXG4gICAga2luZFR5cGVzOiBbJ2RhdGUnLCAncmVxdWlyZW1lbnQnXSxcbiAgICByZWxhdGlvblR5cGVzOiBbJ3JlcXVpcmVzJ10sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNb2NrQ29udGV4dChvdmVycmlkZXMgPSB7fSkge1xuICByZXR1cm4ge1xyXG4gICAgdXBsb2FkOiB7XHJcbiAgICAgIHBoYXNlOiAnaWRsZScsXHJcbiAgICAgIHNlbGVjdGVkRmlsZTogbnVsbCxcclxuICAgICAgZXJyb3I6IG51bGwsXHJcbiAgICAgIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWQgYSAubWQgb3IgLnR4dCBmaWxlIHRvIGJ1aWxkIHRoZSBncmFwaC4nLFxyXG4gICAgICBpbmdlc3Rpb25JZDogbnVsbCxcclxuICAgICAgaW5nZXN0aW9uOiBudWxsLFxyXG4gICAgICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxyXG4gICAgICBzdGFydGVkQXQ6IG51bGwsXHJcbiAgICAgIGNvbXBsZXRlZEF0OiBudWxsLFxyXG4gICAgICByZXRyeUNvdW50OiAwLFxyXG4gICAgfSxcclxuICAgIGdyYXBoOiB7XG4gICAgICBzdGF0dXM6ICdpZGxlJyxcbiAgICAgIGRhdGE6IG51bGwsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIGxhc3RMb2FkZWRBdDogbnVsbCxcbiAgICB9LFxuICAgIGRvY3VtZW50VXBsb2FkOiB7XG4gICAgICBwaGFzZTogJ2lkbGUnLFxuICAgICAgc2VsZWN0ZWRGaWxlOiBudWxsLFxuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBzdGF0dXNNZXNzYWdlOiAnVXBsb2FkIGEgLnBkZiwgLm1kLCBvciAudHh0IGZpbGUgdG8gYnVpbGQgYSBkb2N1bWVudCBncmFwaC4nLFxuICAgICAgaW5nZXN0aW9uSWQ6IG51bGwsXG4gICAgICBpbmdlc3Rpb246IG51bGwsXG4gICAgICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxuICAgICAgc3RhcnRlZEF0OiBudWxsLFxuICAgICAgY29tcGxldGVkQXQ6IG51bGwsXG4gICAgICByZXRyeUNvdW50OiAwLFxuICAgIH0sXG4gICAgZG9jdW1lbnRHcmFwaDoge1xuICAgICAgc3RhdHVzOiAnaWRsZScsXG4gICAgICBkYXRhOiBudWxsLFxuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBsYXN0TG9hZGVkQXQ6IG51bGwsXG4gICAgfSxcbiAgICBzZXREcmFnQWN0aXZlOiAoKSA9PiB7fSxcbiAgICBzZWxlY3RGaWxlOiAoKSA9PiB0cnVlLFxuICAgIGNsZWFyU2VsZWN0ZWRGaWxlOiAoKSA9PiB7fSxcbiAgICBiZWdpblByb2Nlc3Npbmc6IGFzeW5jICgpID0+IHt9LFxuICAgIGxvYWRHcmFwaDogYXN5bmMgKCkgPT4ge30sXG4gICAgc2V0RG9jdW1lbnREcmFnQWN0aXZlOiAoKSA9PiB7fSxcbiAgICBzZWxlY3REb2N1bWVudEZpbGU6ICgpID0+IHRydWUsXG4gICAgY2xlYXJTZWxlY3RlZERvY3VtZW50RmlsZTogKCkgPT4ge30sXG4gICAgYmVnaW5Eb2N1bWVudFByb2Nlc3Npbmc6IGFzeW5jICgpID0+IHt9LFxuICAgIGxvYWREb2N1bWVudEdyYXBoOiBhc3luYyAoKSA9PiB7fSxcbiAgICByZXNldFVwbG9hZFN0YXRlOiAoKSA9PiB7fSxcbiAgICAuLi5vdmVycmlkZXMsXG4gIH07XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQXlCQSxTQUFTLGFBQWEsT0FBZ0IsT0FBZTtBQUNuRCxNQUFJLE9BQU8sVUFBVSxVQUFVO0FBQzdCLFVBQU0sSUFBSSxNQUFNLG9DQUFvQyxLQUFLLGtCQUFrQjtBQUFBLEVBQzdFO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxhQUFhLE9BQWdCLE9BQWU7QUFDbkQsTUFBSSxPQUFPLFVBQVUsWUFBWSxPQUFPLE1BQU0sS0FBSyxHQUFHO0FBQ3BELFVBQU0sSUFBSSxNQUFNLG9DQUFvQyxLQUFLLGtCQUFrQjtBQUFBLEVBQzdFO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxZQUFlLE9BQWdCLE9BQWU7QUFDckQsTUFBSSxDQUFDLE1BQU0sUUFBUSxLQUFLLEdBQUc7QUFDekIsVUFBTSxJQUFJLE1BQU0sb0NBQW9DLEtBQUssa0JBQWtCO0FBQUEsRUFDN0U7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLGNBQWMsTUFBb0IsZUFBc0MsY0FBZ0Q7QUFDL0gsU0FBTztBQUFBLElBQ0wsSUFBSSxhQUFhLEtBQUssSUFBSSxTQUFTO0FBQUEsSUFDbkMsTUFBTSxhQUFhLEtB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O0FBQUEsRUFDQSxrQkFBQUM7QUFBQSxFQUNBLDhCQUFBQztBQUFBLEVBQ0Esc0JBQUFDO0FBQ0YsSUFBSTtBQUVKLEtBQUssK0NBQStDLE1BQU07QUFDeEQsU0FBTyxNQUFNRixrQkFBaUIsV0FBVyxHQUFHLEtBQUs7QUFDakQsU0FBTyxNQUFNQSxrQkFBaUIsV0FBVyxHQUFHLE1BQU07QUFDbEQsU0FBTyxNQUFNQSxrQkFBaUIsUUFBUSxHQUFHLEVBQUU7QUFDN0MsQ0FBQztBQUVELEtBQUssdURBQXVELE1BQU07QUFDaEUsUUFBTSxPQUFPLElBQUksS0FBSyxDQUFDLEtBQUssR0FBRyxlQUFlLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN6RSxRQUFNLFNBQVNFLHNCQUFxQixNQUFNLEtBQUssT0FBTyxJQUFJO0FBRTFELFNBQU8sTUFBTSxPQUFPLE9BQU8sT0FBTztBQUNsQyxTQUFPLE1BQU0sT0FBTyxPQUFPLHdDQUF3QztBQUNuRSxTQUFPLE1BQU0sT0FBTyxlQUFlLHdCQUF3QjtBQUM3RCxDQUFDO0FBRUQsS0FBSyxnREFBZ0QsTUFBTTtBQUN6RCxRQUFNLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxHQUFHLGFBQWEsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ2xGLFNBQU8sZUFBZSxNQUFNLFFBQVEsRUFBRSxjQUFjLE1BQU0sT0FBTyxLQUFLLE9BQU8sS0FBSyxDQUFDO0FBRW5GLFFBQU0sU0FBU0Esc0JBQXFCLE1BQU0sS0FBSyxPQUFPLElBQUk7QUFFMUQsU0FBTyxNQUFNLE9BQU8sT0FBTyxPQUFPO0FBQ2xDLFNBQU8sTUFBTSxPQUFPLFNBQVMsSUFBSSxvQkFBb0I7QUFDckQsU0FBTyxNQUFNLE9BQU8sZUFBZSw2QkFBNkI7QUFDbEUsQ0FBQztBQUVELEtBQUssb0ZBQW9GLE1BQU07QUFDN0YsUUFBTSxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sR0FBRyxhQUFhLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN2RSxRQUFNLFNBQVNBLHNCQUFxQixNQUFNLEtBQUssT0FBTyxJQUFJO0FBRTFELFNBQU8sVUFBVSxRQUFRSCwrQkFBOEIsSUFBSSxDQUFDO0FBQzlELENBQUM7QUFFRCxLQUFLLG9FQUFvRSxNQUFNO0FBQzdFLGFBQVcsWUFBWSxDQUFDLGNBQWMsYUFBYSxZQUFZLEdBQUc7QUFDaEUsVUFBTSxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sR0FBRyxRQUFRO0FBQ3pDLFVBQU0sU0FBU0UsOEJBQTZCLE1BQU0sS0FBSyxPQUFPLElBQUk7QUFFbEUsV0FBTyxVQUFVLFFBQVFILHVDQUFzQyxJQUFJLENBQUM7QUFBQSxFQUN0RTtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbImNyZWF0ZVNlbGVjdGVkRG9jdW1lbnRGaWxlVXBsb2FkU3RhdGUiLCAiY3JlYXRlU2VsZWN0ZWRGaWxlVXBsb2FkU3RhdGUiLCAiZ2V0RmlsZUV4dGVuc2lvbiIsICJ2YWxpZGF0ZVNlbGVjdGVkRG9jdW1lbnRGaWxlIiwgInZhbGlkYXRlU2VsZWN0ZWRGaWxlIl0KfQo=
