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
function normalizeMergedNode(node, dependencyMap, dependentMap) {
  return {
    id: ensureString(node.id, "merged.node.id"),
    name: ensureString(node.name, "merged.node.name"),
    type: ensureString(node.type, "merged.node.type"),
    description: ensureString(node.description, "merged.node.description"),
    riskScore: ensureNumber(node.risk_score, "merged.node.risk_score"),
    riskLevel: ensureString(node.risk_level, "merged.node.risk_level"),
    degree: ensureNumber(node.degree, "merged.node.degree"),
    betweenness: ensureNumber(node.betweenness, "merged.node.betweenness"),
    closeness: ensureNumber(node.closeness, "merged.node.closeness"),
    blastRadius: ensureNumber(node.blast_radius, "merged.node.blast_radius"),
    dependencySpan: ensureNumber(node.dependency_span, "merged.node.dependency_span"),
    riskExplanation: ensureString(node.risk_explanation, "merged.node.risk_explanation"),
    source: ensureString(node.source, "merged.node.source"),
    dependencies: dependencyMap.get(node.id) ?? [],
    dependents: dependentMap.get(node.id) ?? [],
    val: 18 + Math.round(node.risk_score / 100 * 22)
  };
}
function normalizeMergedEdge(edge, index) {
  return {
    id: `${ensureString(edge.source, "merged.edge.source")}-${ensureString(edge.target, "merged.edge.target")}-${index}`,
    source: edge.source,
    target: edge.target,
    relation: ensureString(edge.relation, "merged.edge.relation"),
    rationale: ensureString(edge.rationale, "merged.edge.rationale")
  };
}
function adaptMergedGraph(apiGraph, sourceLabel = "uploaded") {
  const apiNodes = ensureArray(apiGraph.nodes, "merged.graph.nodes");
  const apiEdges = ensureArray(apiGraph.edges, "merged.graph.edges");
  const dependencyMap = /* @__PURE__ */ new Map();
  const dependentMap = /* @__PURE__ */ new Map();
  for (const edge of apiEdges) {
    const sourceId = ensureString(edge.source, "merged.edge.source");
    const targetId = ensureString(edge.target, "merged.edge.target");
    dependencyMap.set(sourceId, [...dependencyMap.get(sourceId) ?? [], targetId]);
    dependentMap.set(targetId, [...dependentMap.get(targetId) ?? [], sourceId]);
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
    ingestionId: apiGraph.ingestion_id ?? null,
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
      maxUploadBytes: readNumber(runtimeConfig.MAX_UPLOAD_MB || import.meta.env.VITE_MAX_UPLOAD_MB, 50) * 1024 * 1024,
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
async function getDocumentArtifacts(ingestionId) {
  return request(`/document/artifacts/${encodeURIComponent(ingestionId)}`);
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
  createSelectedUploadedGraphFileState: () => createSelectedUploadedGraphFileState,
  createUploadErrorState: () => createUploadErrorState,
  createUploadedGraphErrorState: () => createUploadedGraphErrorState,
  getFileExtension: () => getFileExtension,
  initialDocumentUploadState: () => initialDocumentUploadState,
  initialUploadState: () => initialUploadState,
  initialUploadedGraphUploadState: () => initialUploadedGraphUploadState,
  parseUploadedGraphJson: () => parseUploadedGraphJson,
  supportedDocumentExtensions: () => supportedDocumentExtensions,
  supportedExtensions: () => supportedExtensions,
  supportedUploadedGraphExtensions: () => supportedUploadedGraphExtensions,
  useAppContext: () => useAppContext,
  validateSelectedDocumentFile: () => validateSelectedDocumentFile,
  validateSelectedFile: () => validateSelectedFile,
  validateSelectedUploadedGraphFile: () => validateSelectedUploadedGraphFile
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
function createSelectedUploadedGraphFileState(file) {
  return {
    phase: "file-selected",
    selectedFile: file,
    error: null,
    statusMessage: `Ready to inspect ${file.name}.`
  };
}
function createUploadedGraphErrorState(error, statusMessage) {
  return {
    ...initialUploadedGraphUploadState,
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
function validateSelectedUploadedGraphFile(file, maxUploadBytes) {
  if (!file) {
    return initialUploadedGraphUploadState;
  }
  const extension = getFileExtension(file.name);
  if (!supportedUploadedGraphExtensions.includes(extension)) {
    return createUploadedGraphErrorState("Only .json graph artifact files are supported.", "Unsupported file type.");
  }
  if (file.size > maxUploadBytes) {
    return createUploadedGraphErrorState(
      `File exceeds the ${Math.round(maxUploadBytes / 1024 / 1024)} MB upload limit.`,
      "Selected file is too large."
    );
  }
  return createSelectedUploadedGraphFileState(file);
}
function ensureOperationalUploadedGraphShape(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The uploaded file must be a JSON object with nodes and edges.");
  }
  const candidate = payload;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) {
    throw new Error("The uploaded file must include top-level nodes and edges arrays.");
  }
  return {
    nodes: candidate.nodes,
    edges: candidate.edges
  };
}
function ensureDocumentUploadedGraphShape(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The uploaded file must be a document graph JSON object with nodes and edges.");
  }
  const candidate = payload;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges) || typeof candidate.source !== "string") {
    throw new Error("The uploaded document artifact must include source, nodes, and edges.");
  }
  return {
    source: candidate.source,
    ingestion_id: null,
    nodes: candidate.nodes,
    edges: candidate.edges
  };
}
function isOperationalArtifactPayload(payload) {
  const firstNode = Array.isArray(payload.nodes) ? payload.nodes[0] : null;
  const firstEdge = Array.isArray(payload.edges) ? payload.edges[0] : null;
  if (Array.isArray(payload.nodes) && payload.nodes.length === 0 && Array.isArray(payload.edges) && payload.edges.length === 0) {
    return typeof payload.source !== "string";
  }
  return !!firstNode && typeof firstNode === "object" && firstNode !== null && "name" in firstNode && "type" in firstNode && "risk_score" in firstNode && (!!firstEdge ? typeof firstEdge === "object" && firstEdge !== null && "relation" in firstEdge && "rationale" in firstEdge : true);
}
function isDocumentArtifactPayload(payload) {
  const firstNode = Array.isArray(payload.nodes) ? payload.nodes[0] : null;
  const firstEdge = Array.isArray(payload.edges) ? payload.edges[0] : null;
  if (Array.isArray(payload.nodes) && payload.nodes.length === 0 && Array.isArray(payload.edges) && payload.edges.length === 0) {
    return typeof payload.source === "string";
  }
  return typeof payload.source === "string" && !!firstNode && typeof firstNode === "object" && firstNode !== null && "label" in firstNode && "kind" in firstNode && "canonical_name" in firstNode && (!!firstEdge ? typeof firstEdge === "object" && firstEdge !== null && "type" in firstEdge && "summary" in firstEdge : true);
}
function parseUploadedGraphJson(fileContents) {
  let parsed;
  try {
    parsed = JSON.parse(fileContents);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The uploaded file must be a JSON object with graph nodes and edges.");
  }
  const candidate = parsed;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) {
    throw new Error("The uploaded file must include top-level nodes and edges arrays.");
  }
  if (isOperationalArtifactPayload(candidate)) {
    return {
      kind: "operational",
      rawData: ensureOperationalUploadedGraphShape(candidate)
    };
  }
  if (isDocumentArtifactPayload(candidate)) {
    return {
      kind: "document",
      rawData: ensureDocumentUploadedGraphShape(candidate)
    };
  }
  throw new Error("The uploaded JSON does not match a supported operational or document graph artifact schema.");
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
  const [uploadedGraphUpload, setUploadedGraphUpload] = useState(initialUploadedGraphUploadState);
  const [uploadedGraph, setUploadedGraph] = useState(initialUploadedGraphState);
  const processingPromiseRef = useRef(null);
  const documentProcessingPromiseRef = useRef(null);
  const getDocumentArtifactsWithRetry = useCallback(async (ingestionId) => {
    let lastError = null;
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
  const setUploadedGraphDragActive = useCallback((active) => {
    setUploadedGraphUpload((current) => {
      if (active) {
        return { ...current, phase: "drag-hover", statusMessage: "Drop merged_graph.json to open it locally." };
      }
      if (current.selectedFile) {
        return { ...current, phase: "file-selected", statusMessage: `Ready to inspect ${current.selectedFile.name}.` };
      }
      return { ...current, phase: "idle", statusMessage: initialUploadedGraphUploadState.statusMessage };
    });
  }, []);
  const selectUploadedGraphFile = useCallback((file) => {
    const nextState = validateSelectedUploadedGraphFile(file, appConfig.maxUploadBytes);
    setUploadedGraphUpload(nextState);
    if (nextState.phase !== "file-selected") {
      setUploadedGraph(initialUploadedGraphState);
    }
    return nextState.phase === "file-selected";
  }, []);
  const clearSelectedUploadedGraphFile = useCallback(() => {
    setUploadedGraphUpload(initialUploadedGraphUploadState);
    setUploadedGraph(initialUploadedGraphState);
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
      error: null,
      artifactsError: current.artifactsError
    }));
    try {
      const payload = await getDocumentGraph();
      const adaptedGraph = adaptDocumentGraph(payload);
      const artifactManifest = adaptedGraph.ingestionId ? await getDocumentArtifactsWithRetry(adaptedGraph.ingestionId).catch(() => null) : null;
      setDocumentGraph({
        status: "ready",
        data: adaptedGraph,
        error: null,
        lastLoadedAt: Date.now(),
        artifacts: artifactManifest,
        artifactsError: adaptedGraph.ingestionId && !artifactManifest ? "Source materials are temporarily unavailable for this document right now." : !adaptedGraph.ingestionId ? "Source material downloads are unavailable because this document graph was loaded without an ingestion ID." : null
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
        lastLoadedAt: null,
        artifacts: null,
        artifactsError: null
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
        setDocumentUpload((current) => ({
          ...current,
          ingestion,
          phase: "processing",
          statusMessage: "Document accepted. Waiting for processing progress..."
        }));
        let latestProcessingStatus = await getDocumentProcessingStatus(ingestionId).catch(() => null);
        while (keepPolling && latestProcessingStatus?.state !== "succeeded" && latestProcessingStatus?.state !== "failed") {
          await new Promise((resolve) => window.setTimeout(resolve, 800));
          latestProcessingStatus = await getDocumentProcessingStatus(ingestionId).catch(() => latestProcessingStatus);
        }
        if (latestProcessingStatus?.state === "failed") {
          throw new ApiClientError(
            latestProcessingStatus.latest_event || "Document processing failed before the graph was ready.",
            {
              code: "document_processing_failed",
              retryable: true
            }
          );
        }
        const graphPayload = await getDocumentGraph();
        const adaptedGraph = adaptDocumentGraph(graphPayload);
        const artifactManifest = adaptedGraph.ingestionId ? await getDocumentArtifactsWithRetry(adaptedGraph.ingestionId).catch(() => null) : null;
        setDocumentGraph({
          status: "ready",
          data: adaptedGraph,
          error: null,
          lastLoadedAt: Date.now(),
          artifacts: artifactManifest,
          artifactsError: adaptedGraph.ingestionId && !artifactManifest ? "Source materials are temporarily unavailable for this document right now." : !adaptedGraph.ingestionId ? "Source material downloads are unavailable because this document graph was loaded without an ingestion ID." : null
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
  const loadUploadedGraphFromSelectedFile = useCallback(async () => {
    const selectedFile = uploadedGraphUpload.selectedFile;
    if (!selectedFile) {
      setUploadedGraphUpload((current) => ({
        ...current,
        phase: "error",
        error: "Choose a graph artifact JSON file before opening the graph workspace.",
        statusMessage: "No graph file selected."
      }));
      return;
    }
    setUploadedGraph((current) => ({
      ...current,
      status: "loading",
      error: null,
      filename: selectedFile.name
    }));
    setUploadedGraphUpload((current) => ({
      ...current,
      phase: "uploading",
      error: null,
      statusMessage: `Loading ${selectedFile.name} locally...`
    }));
    try {
      const fileContents = await selectedFile.text();
      const parsedArtifact = parseUploadedGraphJson(fileContents);
      if (parsedArtifact.kind === "operational") {
        const adaptedGraph = adaptMergedGraph(parsedArtifact.rawData, selectedFile.name);
        setUploadedGraph({
          status: "ready",
          kind: "operational",
          operationalData: adaptedGraph,
          documentData: null,
          error: null,
          lastLoadedAt: Date.now(),
          filename: selectedFile.name,
          rawData: parsedArtifact.rawData
        });
        setUploadedGraphUpload((current) => ({
          ...current,
          phase: adaptedGraph.nodes.length === 0 ? "empty-graph" : "success",
          error: null,
          statusMessage: adaptedGraph.nodes.length === 0 ? "The uploaded operational graph contains no nodes." : `Loaded operational graph artifact ${selectedFile.name}.`
        }));
      } else {
        const adaptedGraph = adaptDocumentGraph(parsedArtifact.rawData);
        setUploadedGraph({
          status: "ready",
          kind: "document",
          operationalData: null,
          documentData: adaptedGraph,
          error: null,
          lastLoadedAt: Date.now(),
          filename: selectedFile.name,
          rawData: parsedArtifact.rawData
        });
        setUploadedGraphUpload((current) => ({
          ...current,
          phase: adaptedGraph.nodes.length === 0 ? "empty-graph" : "success",
          error: null,
          statusMessage: adaptedGraph.nodes.length === 0 ? "The uploaded document graph contains no nodes." : `Loaded document graph artifact ${selectedFile.name}.`
        }));
      }
    } catch (error) {
      const message = toFriendlyMessage(error);
      setUploadedGraph({
        status: "error",
        kind: null,
        operationalData: null,
        documentData: null,
        error: message,
        lastLoadedAt: null,
        filename: selectedFile.name,
        rawData: null
      });
      setUploadedGraphUpload((current) => ({
        ...current,
        phase: "error",
        error: message,
        statusMessage: message
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
  const value = useMemo(
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
      resetUploadState
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
var AppContext, initialUploadState, initialGraphState, initialUploadedGraphUploadState, initialUploadedGraphState, initialDocumentUploadState, initialDocumentGraphState, DOCUMENT_ARTIFACT_FETCH_ATTEMPTS, DOCUMENT_ARTIFACT_FETCH_DELAY_MS, supportedExtensions, supportedDocumentExtensions, supportedUploadedGraphExtensions;
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
    initialUploadedGraphUploadState = {
      phase: "idle",
      selectedFile: null,
      error: null,
      statusMessage: "Upload a merged_graph.json file to inspect a finalized knowledge graph."
    };
    initialUploadedGraphState = {
      status: "idle",
      kind: null,
      operationalData: null,
      documentData: null,
      error: null,
      lastLoadedAt: null,
      filename: null,
      rawData: null
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
      lastLoadedAt: null,
      artifacts: null,
      artifactsError: null
    };
    DOCUMENT_ARTIFACT_FETCH_ATTEMPTS = 5;
    DOCUMENT_ARTIFACT_FETCH_DELAY_MS = 800;
    supportedExtensions = [".md", ".txt"];
    supportedDocumentExtensions = [".pdf", ".md", ".txt"];
    supportedUploadedGraphExtensions = [".json"];
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
        ),
        /* @__PURE__ */ jsx5(
          "button",
          {
            onClick: () => navigate("/graphs"),
            className: "rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white",
            children: "Graph Workspace"
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
function formatDocumentEvidencePages(evidence) {
  const ranges = evidence.map((item) => {
    if (typeof item.pageStart !== "number" && typeof item.pageEnd !== "number") {
      return null;
    }
    const start = item.pageStart ?? item.pageEnd;
    const end = item.pageEnd ?? item.pageStart;
    if (typeof start !== "number" || typeof end !== "number") {
      return null;
    }
    return {
      start: Math.min(start, end),
      end: Math.max(start, end)
    };
  }).filter((range) => range !== null).sort((left, right) => left.start - right.start || left.end - right.end);
  const uniqueRanges = ranges.filter(
    (range, index) => index === 0 || range.start !== ranges[index - 1].start || range.end !== ranges[index - 1].end
  );
  if (uniqueRanges.length === 0) {
    return "No page marker";
  }
  const pages = uniqueRanges.map((range) => range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`);
  return `${uniqueRanges.length === 1 && uniqueRanges[0].start === uniqueRanges[0].end ? "Page" : "Pages"} ${pages.join(", ")}`;
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
function SystemOverview({ graphData, sourceLabel = "active graph" }) {
  const summary = buildGraphSummary(graphData);
  return /* @__PURE__ */ jsx8("div", { className: "h-full overflow-y-auto p-6 md:p-8", children: /* @__PURE__ */ jsxs5("div", { className: "mx-auto max-w-7xl space-y-8", children: [
    /* @__PURE__ */ jsxs5("div", { children: [
      /* @__PURE__ */ jsx8("h1", { className: "text-3xl font-bold text-white", children: "System Overview" }),
      /* @__PURE__ */ jsxs5("p", { className: "mt-2 max-w-3xl text-sm leading-7 text-slate-300", children: [
        "Summary cards and breakdowns are computed directly from the ",
        sourceLabel,
        " without requiring a separate architecture summary endpoint."
      ] })
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
        /* @__PURE__ */ jsx9("button", { className: "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white", children: "Document Workspace" }),
        /* @__PURE__ */ jsx9("button", { onClick: () => navigate("/graphs"), className: "rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white", children: "Graph Workspace" })
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

// src/components/ui/Input.tsx
import { jsx as jsx10 } from "react/jsx-runtime";
function Input({ className, ...props }) {
  return /* @__PURE__ */ jsx10(
    "input",
    {
      className: cn(
        "w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25",
        className
      ),
      ...props
    }
  );
}
var init_Input = __esm({
  "src/components/ui/Input.tsx"() {
    "use strict";
    init_cn();
  }
});

// src/components/DocumentNodesEdgesView.tsx
import { useDeferredValue, useEffect as useEffect2, useMemo as useMemo3, useState as useState3 } from "react";
import { ArrowUpDown, ExternalLink, Filter, Search } from "lucide-react";
import { Fragment, jsx as jsx11, jsxs as jsxs7 } from "react/jsx-runtime";
function DocumentNodesEdgesView({ graphData, onNodeSelect }) {
  const [activeTable, setActiveTable] = useState3("nodes");
  const [searchTerm, setSearchTerm] = useState3("");
  const [kindFilter, setKindFilter] = useState3("all");
  const [relationFilter, setRelationFilter] = useState3("all");
  const [nodeSortField, setNodeSortField] = useState3("degree");
  const [nodeSortOrder, setNodeSortOrder] = useState3("desc");
  const [edgeSortField, setEdgeSortField] = useState3("source");
  const [edgeSortOrder, setEdgeSortOrder] = useState3("asc");
  const [page, setPage] = useState3(1);
  const deferredSearch = useDeferredValue(searchTerm.trim().toLowerCase());
  const filteredNodes = useMemo3(() => {
    const nodes = graphData.nodes.filter((node) => {
      const matchesSearch = deferredSearch.length === 0 || node.label.toLowerCase().includes(deferredSearch) || node.canonicalName.toLowerCase().includes(deferredSearch) || node.summary.toLowerCase().includes(deferredSearch);
      const matchesKind = kindFilter === "all" || node.kind === kindFilter;
      return matchesSearch && matchesKind;
    });
    return nodes.sort((left, right) => {
      let comparison = 0;
      switch (nodeSortField) {
        case "canonicalName":
          comparison = left.canonicalName.localeCompare(right.canonicalName);
          break;
        case "kind":
          comparison = left.kind.localeCompare(right.kind);
          break;
        case "evidence":
          comparison = left.evidence.length - right.evidence.length;
          break;
        case "degree":
        default:
          comparison = left.degree - right.degree;
      }
      return nodeSortOrder === "asc" ? comparison : -comparison;
    });
  }, [deferredSearch, graphData.nodes, kindFilter, nodeSortField, nodeSortOrder]);
  const filteredEdges = useMemo3(() => {
    const edges = graphData.links.filter((edge) => {
      const sourceName = graphData.nodeIndex[getLinkEndpointId(edge.source)]?.canonicalName ?? getLinkEndpointId(edge.source);
      const targetName = graphData.nodeIndex[getLinkEndpointId(edge.target)]?.canonicalName ?? getLinkEndpointId(edge.target);
      const matchesSearch = deferredSearch.length === 0 || sourceName.toLowerCase().includes(deferredSearch) || targetName.toLowerCase().includes(deferredSearch) || edge.type.toLowerCase().includes(deferredSearch) || edge.summary.toLowerCase().includes(deferredSearch);
      const matchesRelation = relationFilter === "all" || edge.type === relationFilter;
      return matchesSearch && matchesRelation;
    });
    return edges.sort((left, right) => {
      let comparison = 0;
      switch (edgeSortField) {
        case "target":
          comparison = getLinkEndpointId(left.target).localeCompare(getLinkEndpointId(right.target));
          break;
        case "type":
          comparison = left.type.localeCompare(right.type);
          break;
        case "source":
        default:
          comparison = getLinkEndpointId(left.source).localeCompare(getLinkEndpointId(right.source));
      }
      return edgeSortOrder === "asc" ? comparison : -comparison;
    });
  }, [deferredSearch, edgeSortField, edgeSortOrder, graphData.links, graphData.nodeIndex, relationFilter]);
  useEffect2(() => {
    setPage(1);
  }, [activeTable, deferredSearch, edgeSortField, edgeSortOrder, kindFilter, nodeSortField, nodeSortOrder, relationFilter]);
  const pagedNodes = filteredNodes.slice((page - 1) * pageSize, page * pageSize);
  const pagedEdges = filteredEdges.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil((activeTable === "nodes" ? filteredNodes.length : filteredEdges.length) / pageSize));
  const toggleNodeSort = (field) => {
    if (nodeSortField === field) {
      setNodeSortOrder((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setNodeSortField(field);
    setNodeSortOrder(field === "canonicalName" || field === "kind" ? "asc" : "desc");
  };
  const toggleEdgeSort = (field) => {
    if (edgeSortField === field) {
      setEdgeSortOrder((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setEdgeSortField(field);
    setEdgeSortOrder("asc");
  };
  return /* @__PURE__ */ jsx11("div", { className: "h-full overflow-y-auto p-6 md:p-8", children: /* @__PURE__ */ jsxs7("div", { className: "mx-auto max-w-7xl space-y-6", children: [
    /* @__PURE__ */ jsxs7("div", { children: [
      /* @__PURE__ */ jsx11("h1", { className: "text-3xl font-bold text-white", children: "Nodes & Edges" }),
      /* @__PURE__ */ jsx11("p", { className: "mt-2 text-sm text-slate-300", children: "Search, filter, sort, and inspect extracted document knowledge." })
    ] }),
    /* @__PURE__ */ jsx11("div", { className: "glass-panel rounded-3xl p-4", children: /* @__PURE__ */ jsxs7("div", { className: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]", children: [
      /* @__PURE__ */ jsxs7("div", { className: "relative", children: [
        /* @__PURE__ */ jsx11(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" }),
        /* @__PURE__ */ jsx11(
          Input,
          {
            value: searchTerm,
            onChange: (event) => setSearchTerm(event.target.value),
            placeholder: activeTable === "nodes" ? "Search nodes by name, kind, or summary" : "Search edges by source, target, or relation",
            className: "pl-10"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs7("label", { className: "flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-3", children: [
        /* @__PURE__ */ jsx11(Filter, { className: "h-4 w-4 text-slate-500" }),
        /* @__PURE__ */ jsxs7("select", { value: kindFilter, onChange: (event) => setKindFilter(event.target.value), className: "w-full bg-transparent py-3 text-sm text-white outline-none", disabled: activeTable !== "nodes", children: [
          /* @__PURE__ */ jsx11("option", { value: "all", children: "All kinds" }),
          graphData.kindTypes.map((kind) => /* @__PURE__ */ jsx11("option", { value: kind, children: formatLabel(kind) }, kind))
        ] })
      ] }),
      /* @__PURE__ */ jsxs7("label", { className: "flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-3", children: [
        /* @__PURE__ */ jsx11(Filter, { className: "h-4 w-4 text-slate-500" }),
        /* @__PURE__ */ jsxs7("select", { value: relationFilter, onChange: (event) => setRelationFilter(event.target.value), className: "w-full bg-transparent py-3 text-sm text-white outline-none", disabled: activeTable !== "edges", children: [
          /* @__PURE__ */ jsx11("option", { value: "all", children: "All relations" }),
          graphData.relationTypes.map((relation) => /* @__PURE__ */ jsx11("option", { value: relation, children: formatLabel(relation) }, relation))
        ] })
      ] }),
      /* @__PURE__ */ jsxs7("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx11(Button, { variant: activeTable === "nodes" ? "primary" : "secondary", onClick: () => setActiveTable("nodes"), children: "Nodes" }),
        /* @__PURE__ */ jsx11(Button, { variant: activeTable === "edges" ? "primary" : "secondary", onClick: () => setActiveTable("edges"), children: "Edges" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx11("div", { className: "glass-panel overflow-hidden rounded-3xl", children: activeTable === "nodes" ? /* @__PURE__ */ jsxs7(Fragment, { children: [
      /* @__PURE__ */ jsxs7("div", { className: "grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_1fr_0.7fr] gap-4 border-b border-slate-800 bg-slate-950/90 px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400", children: [
        [
          ["canonicalName", "Node"],
          ["kind", "Kind"],
          ["degree", "Degree"],
          ["evidence", "Evidence"]
        ].map(([field, label]) => /* @__PURE__ */ jsxs7("button", { className: "flex items-center gap-1 text-left", onClick: () => toggleNodeSort(field), children: [
          label,
          /* @__PURE__ */ jsx11(ArrowUpDown, { className: "h-3.5 w-3.5" })
        ] }, field)),
        /* @__PURE__ */ jsx11("div", { children: "Summary" }),
        /* @__PURE__ */ jsx11("div", { children: "Action" })
      ] }),
      /* @__PURE__ */ jsx11("div", { className: "divide-y divide-slate-800", children: pagedNodes.map((node) => /* @__PURE__ */ jsxs7("div", { className: "grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_1fr_0.7fr] gap-4 px-4 py-4 text-sm", children: [
        /* @__PURE__ */ jsxs7("div", { children: [
          /* @__PURE__ */ jsx11("div", { className: "font-medium text-white", children: node.canonicalName }),
          /* @__PURE__ */ jsx11("div", { className: "mt-1 text-xs text-slate-400", children: node.id })
        ] }),
        /* @__PURE__ */ jsx11("div", { children: /* @__PURE__ */ jsx11(Badge, { className: "border-transparent text-white", style: { backgroundColor: getDocumentKindColor(node.kind) }, children: formatLabel(node.kind) }) }),
        /* @__PURE__ */ jsx11("div", { className: "text-slate-300", children: node.degree }),
        /* @__PURE__ */ jsx11("div", { className: "text-slate-300", children: node.evidence.length }),
        /* @__PURE__ */ jsx11("div", { className: "text-slate-400", children: node.summary || "No summary provided." }),
        /* @__PURE__ */ jsx11("div", { children: /* @__PURE__ */ jsxs7("button", { onClick: () => onNodeSelect(node.id), className: "inline-flex items-center gap-1 text-blue-300 transition hover:text-blue-200", children: [
          "View",
          /* @__PURE__ */ jsx11(ExternalLink, { className: "h-3.5 w-3.5" })
        ] }) })
      ] }, node.id)) })
    ] }) : /* @__PURE__ */ jsxs7(Fragment, { children: [
      /* @__PURE__ */ jsxs7("div", { className: "grid grid-cols-[1fr_1fr_1fr_1.4fr_0.7fr] gap-4 border-b border-slate-800 bg-slate-950/90 px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400", children: [
        [
          ["source", "Source"],
          ["target", "Target"],
          ["type", "Relation"]
        ].map(([field, label]) => /* @__PURE__ */ jsxs7("button", { className: "flex items-center gap-1 text-left", onClick: () => toggleEdgeSort(field), children: [
          label,
          /* @__PURE__ */ jsx11(ArrowUpDown, { className: "h-3.5 w-3.5" })
        ] }, field)),
        /* @__PURE__ */ jsx11("div", { children: "Summary" }),
        /* @__PURE__ */ jsx11("div", { children: "Action" })
      ] }),
      /* @__PURE__ */ jsx11("div", { className: "divide-y divide-slate-800", children: pagedEdges.map((edge) => /* @__PURE__ */ jsxs7("div", { className: "grid grid-cols-[1fr_1fr_1fr_1.4fr_0.7fr] gap-4 px-4 py-4 text-sm", children: [
        /* @__PURE__ */ jsx11("div", { className: "text-slate-200", children: graphData.nodeIndex[getLinkEndpointId(edge.source)]?.canonicalName ?? getLinkEndpointId(edge.source) }),
        /* @__PURE__ */ jsx11("div", { className: "text-slate-200", children: graphData.nodeIndex[getLinkEndpointId(edge.target)]?.canonicalName ?? getLinkEndpointId(edge.target) }),
        /* @__PURE__ */ jsx11("div", { className: "text-slate-300", children: formatLabel(edge.type) }),
        /* @__PURE__ */ jsx11("div", { className: "text-slate-400", children: edge.summary || "No summary provided." }),
        /* @__PURE__ */ jsx11("div", { children: /* @__PURE__ */ jsxs7("button", { onClick: () => onNodeSelect(getLinkEndpointId(edge.source)), className: "inline-flex items-center gap-1 text-blue-300 transition hover:text-blue-200", children: [
          "Inspect",
          /* @__PURE__ */ jsx11(ExternalLink, { className: "h-3.5 w-3.5" })
        ] }) })
      ] }, edge.id)) })
    ] }) }),
    /* @__PURE__ */ jsxs7("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxs7("div", { className: "text-sm text-slate-400", children: [
        "Showing ",
        activeTable === "nodes" ? pagedNodes.length : pagedEdges.length,
        " of ",
        activeTable === "nodes" ? filteredNodes.length : filteredEdges.length,
        " ",
        activeTable
      ] }),
      /* @__PURE__ */ jsxs7("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx11(Button, { variant: "secondary", disabled: page === 1, onClick: () => setPage((current) => Math.max(1, current - 1)), children: "Previous" }),
        /* @__PURE__ */ jsxs7(Badge, { children: [
          "Page ",
          page,
          " of ",
          pageCount
        ] }),
        /* @__PURE__ */ jsx11(Button, { variant: "secondary", disabled: page === pageCount, onClick: () => setPage((current) => Math.min(pageCount, current + 1)), children: "Next" })
      ] })
    ] })
  ] }) });
}
var pageSize;
var init_DocumentNodesEdgesView = __esm({
  "src/components/DocumentNodesEdgesView.tsx"() {
    "use strict";
    init_selectors();
    init_Badge();
    init_Button();
    init_Input();
    pageSize = 10;
  }
});

// src/components/DocumentOverview.tsx
var DocumentOverview_exports = {};
__export(DocumentOverview_exports, {
  default: () => DocumentOverview
});
import { Boxes as Boxes2, FileText as FileText3, GitBranch as GitBranch2, Quote } from "lucide-react";
import { jsx as jsx12, jsxs as jsxs8 } from "react/jsx-runtime";
function DocumentOverview({ graphData }) {
  const kindCounts = graphData.nodes.reduce((counts, node) => {
    counts[node.kind] = (counts[node.kind] ?? 0) + 1;
    return counts;
  }, {});
  const kindDistribution = Object.entries(kindCounts).map(([kind, count]) => ({ kind, count })).sort((left, right) => right.count - left.count);
  const totalEvidence = graphData.nodes.reduce((sum, node) => sum + node.evidence.length, 0) + graphData.links.reduce((sum, edge) => sum + edge.evidence.length, 0);
  const mostConnected = [...graphData.nodes].sort((left, right) => right.degree - left.degree).slice(0, 5);
  return /* @__PURE__ */ jsx12("div", { className: "h-full overflow-y-auto p-6 md:p-8", children: /* @__PURE__ */ jsxs8("div", { className: "mx-auto max-w-7xl space-y-8", children: [
    /* @__PURE__ */ jsxs8("div", { children: [
      /* @__PURE__ */ jsx12("h1", { className: "text-3xl font-bold text-white", children: "Document Overview" }),
      /* @__PURE__ */ jsx12("p", { className: "mt-2 max-w-3xl text-sm leading-7 text-slate-300", children: "Summary cards and breakdowns are computed directly from the active document graph." })
    ] }),
    /* @__PURE__ */ jsxs8("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [
      /* @__PURE__ */ jsxs8("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsxs8("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx12(Boxes2, { className: "h-8 w-8 text-blue-300" }),
          /* @__PURE__ */ jsx12("span", { className: "text-4xl font-semibold text-white", children: graphData.nodes.length })
        ] }),
        /* @__PURE__ */ jsx12("p", { className: "mt-3 text-sm text-slate-400", children: "Document Nodes" })
      ] }),
      /* @__PURE__ */ jsxs8("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsxs8("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx12(GitBranch2, { className: "h-8 w-8 text-purple-300" }),
          /* @__PURE__ */ jsx12("span", { className: "text-4xl font-semibold text-white", children: graphData.links.length })
        ] }),
        /* @__PURE__ */ jsx12("p", { className: "mt-3 text-sm text-slate-400", children: "Relationships" })
      ] }),
      /* @__PURE__ */ jsxs8("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsxs8("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx12(Quote, { className: "h-8 w-8 text-orange-300" }),
          /* @__PURE__ */ jsx12("span", { className: "text-4xl font-semibold text-white", children: totalEvidence })
        ] }),
        /* @__PURE__ */ jsx12("p", { className: "mt-3 text-sm text-slate-400", children: "Evidence Items" })
      ] }),
      /* @__PURE__ */ jsxs8("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsxs8("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx12(FileText3, { className: "h-8 w-8 text-emerald-300" }),
          /* @__PURE__ */ jsx12("span", { className: "text-4xl font-semibold text-white", children: graphData.kindTypes.length })
        ] }),
        /* @__PURE__ */ jsx12("p", { className: "mt-3 text-sm text-slate-400", children: "Node Kinds" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs8("section", { className: "glass-panel rounded-3xl p-6", children: [
      /* @__PURE__ */ jsx12("h2", { className: "text-xl font-semibold text-white", children: "Most Connected Document Nodes" }),
      /* @__PURE__ */ jsx12("div", { className: "mt-6 space-y-4", children: mostConnected.map((node, index) => /* @__PURE__ */ jsxs8("div", { className: "flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-950/70 p-4", children: [
        /* @__PURE__ */ jsxs8("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx12("div", { className: "flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-sm font-semibold text-blue-100", children: index + 1 }),
          /* @__PURE__ */ jsxs8("div", { children: [
            /* @__PURE__ */ jsx12("div", { className: "font-semibold text-white", children: node.canonicalName }),
            /* @__PURE__ */ jsxs8("div", { className: "mt-1 text-sm text-slate-400", children: [
              formatLabel(node.kind),
              " | ",
              node.id
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs8("div", { className: "text-right", children: [
          /* @__PURE__ */ jsx12("div", { className: "text-2xl font-semibold text-blue-300", children: node.degree }),
          /* @__PURE__ */ jsx12("div", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Connections" })
        ] })
      ] }, node.id)) })
    ] }),
    /* @__PURE__ */ jsxs8("section", { className: "glass-panel rounded-3xl p-6", children: [
      /* @__PURE__ */ jsx12("h2", { className: "text-xl font-semibold text-white", children: "Kind Breakdown" }),
      /* @__PURE__ */ jsx12("div", { className: "mt-6 grid gap-4 md:grid-cols-2", children: kindDistribution.map((entry) => /* @__PURE__ */ jsx12("div", { className: "rounded-3xl border border-slate-800 bg-slate-950/70 p-4", children: /* @__PURE__ */ jsxs8("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs8("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx12("span", { className: "h-3 w-3 rounded-full", style: { backgroundColor: getDocumentKindColor(entry.kind) } }),
          /* @__PURE__ */ jsx12("span", { className: "font-medium text-white", children: formatLabel(entry.kind) })
        ] }),
        /* @__PURE__ */ jsx12("span", { className: "text-lg font-semibold text-white", children: entry.count })
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

// src/components/EmptyState.tsx
import { jsx as jsx13, jsxs as jsxs9 } from "react/jsx-runtime";
function EmptyState({ title, message, action }) {
  return /* @__PURE__ */ jsxs9("div", { className: "glass-panel flex min-h-[320px] flex-col items-center justify-center rounded-3xl px-8 py-12 text-center", children: [
    /* @__PURE__ */ jsx13("h2", { className: "text-2xl font-semibold text-white", children: title }),
    /* @__PURE__ */ jsx13("p", { className: "mt-3 max-w-xl text-sm leading-7 text-slate-300", children: message }),
    action ? /* @__PURE__ */ jsx13("div", { className: "mt-6", children: action }) : null
  ] });
}
var init_EmptyState = __esm({
  "src/components/EmptyState.tsx"() {
    "use strict";
  }
});

// src/components/DocumentGraphView.tsx
var DocumentGraphView_exports = {};
__export(DocumentGraphView_exports, {
  default: () => DocumentGraphView
});
import { useCallback as useCallback2, useEffect as useEffect3, useMemo as useMemo4, useRef as useRef4, useState as useState4 } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { FileSearch, Maximize2, Network as Network4, Quote as Quote2, RefreshCcw } from "lucide-react";
import { jsx as jsx14, jsxs as jsxs10 } from "react/jsx-runtime";
function formatPageRange(node) {
  return formatDocumentEvidencePages(node.evidence);
}
function DocumentGraphView({ graphData, selectedNodeId, onNodeSelect }) {
  const graphRef = useRef4(null);
  const containerRef = useRef4(null);
  const [dimensions, setDimensions] = useState4({ width: 1e3, height: 560 });
  const fitGraphToViewport = useCallback2(() => {
    if (!graphRef.current || dimensions.width <= 0 || dimensions.height <= 0) {
      return;
    }
    const padding = Math.max(80, Math.min(dimensions.width, dimensions.height) * 0.12);
    graphRef.current.zoomToFit(600, padding);
  }, [dimensions.height, dimensions.width]);
  useEffect3(() => {
    const updateDimensions = () => {
      if (!containerRef.current) {
        return;
      }
      setDimensions({
        width: containerRef.current.clientWidth,
        height: Math.max(360, containerRef.current.clientHeight)
      });
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener("resize", updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);
  useEffect3(() => {
    if (!graphRef.current || graphData.nodes.length === 0) {
      return;
    }
    graphRef.current.d3Force("charge")?.strength(-460);
    graphRef.current.d3Force("link")?.distance(() => 150);
    const timeout = window.setTimeout(fitGraphToViewport, 700);
    return () => window.clearTimeout(timeout);
  }, [fitGraphToViewport, graphData.links.length, graphData.nodes.length]);
  const selectedNode = selectedNodeId ? graphData.nodeIndex[selectedNodeId] ?? null : null;
  const connectedNodes = useMemo4(() => {
    if (!selectedNodeId) {
      return /* @__PURE__ */ new Set();
    }
    const connected = /* @__PURE__ */ new Set([selectedNodeId]);
    for (const link of graphData.links) {
      if (getLinkEndpointId(link.source) === selectedNodeId) {
        connected.add(getLinkEndpointId(link.target));
      }
      if (getLinkEndpointId(link.target) === selectedNodeId) {
        connected.add(getLinkEndpointId(link.source));
      }
    }
    return connected;
  }, [graphData.links, selectedNodeId]);
  const forceGraphData = useMemo4(
    () => ({
      nodes: graphData.nodes.map((node) => ({ ...node })),
      links: graphData.links.map((link) => ({
        ...link,
        source: getLinkEndpointId(link.source),
        target: getLinkEndpointId(link.target)
      }))
    }),
    [graphData.links, graphData.nodes]
  );
  return /* @__PURE__ */ jsxs10("div", { className: "grid min-h-[720px] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]", children: [
    /* @__PURE__ */ jsxs10("section", { className: "glass-panel flex min-h-[720px] min-w-0 flex-col rounded-[28px] p-5", children: [
      /* @__PURE__ */ jsxs10("div", { className: "flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/90 pb-4", children: [
        /* @__PURE__ */ jsxs10("div", { children: [
          /* @__PURE__ */ jsxs10("div", { className: "flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-blue-300", children: [
            /* @__PURE__ */ jsx14(Network4, { className: "h-4 w-4" }),
            "Graph View"
          ] }),
          /* @__PURE__ */ jsx14("h2", { className: "mt-2 text-2xl font-semibold text-white", children: "Document Knowledge Graph" }),
          /* @__PURE__ */ jsx14("p", { className: "mt-1 text-sm text-slate-400", children: "Node color tracks extracted kind; directed edges represent explicit relationships." })
        ] }),
        /* @__PURE__ */ jsxs10("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxs10(Badge, { children: [
            "Nodes ",
            graphData.nodes.length
          ] }),
          /* @__PURE__ */ jsxs10(Badge, { children: [
            "Edges ",
            graphData.links.length
          ] }),
          /* @__PURE__ */ jsxs10(Button, { variant: "secondary", onClick: fitGraphToViewport, children: [
            /* @__PURE__ */ jsx14(Maximize2, { className: "h-4 w-4" }),
            "Fit View"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx14("div", { className: "mt-5 flex flex-wrap gap-3", children: graphData.kindTypes.slice(0, 8).map((kind) => /* @__PURE__ */ jsxs10("div", { className: "flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300", children: [
        /* @__PURE__ */ jsx14("span", { className: "h-2.5 w-2.5 rounded-full", style: { backgroundColor: getDocumentKindColor(kind) } }),
        /* @__PURE__ */ jsx14("span", { children: formatLabel(kind) })
      ] }, kind)) }),
      /* @__PURE__ */ jsxs10("div", { ref: containerRef, className: "relative mt-5 min-h-[560px] flex-1 overflow-hidden rounded-[24px] border border-slate-700 bg-[#d9d9d9]", children: [
        /* @__PURE__ */ jsx14("div", { className: "absolute right-4 top-4 z-10 rounded-full border border-slate-400 bg-white/90 px-4 py-2 text-xs text-slate-700", children: "Drag to pan, scroll to zoom, click a node for evidence" }),
        /* @__PURE__ */ jsx14(
          ForceGraph2D,
          {
            ref: graphRef,
            graphData: forceGraphData,
            width: dimensions.width,
            height: dimensions.height,
            backgroundColor: "rgba(0,0,0,0)",
            cooldownTicks: 160,
            linkCurvature: 0.08,
            linkWidth: (link) => getLinkEndpointId(link.source) === selectedNodeId || getLinkEndpointId(link.target) === selectedNodeId ? 2.2 : 0.9,
            linkColor: (link) => getLinkEndpointId(link.source) === selectedNodeId || getLinkEndpointId(link.target) === selectedNodeId ? "#2563eb" : "rgba(15, 23, 42, 0.55)",
            linkDirectionalArrowLength: 5,
            linkDirectionalArrowRelPos: 1,
            nodeRelSize: 1,
            nodeLabel: (node) => `${node.canonicalName} (${formatLabel(node.kind)})`,
            nodeCanvasObjectMode: () => "replace",
            onNodeClick: (node) => {
              onNodeSelect(node.id);
              graphRef.current?.centerAt(node.x, node.y, 500);
              graphRef.current?.zoom(2, 500);
            },
            nodePointerAreaPaint: (node, color, context) => {
              context.fillStyle = color;
              context.beginPath();
              context.arc(node.x, node.y, Math.max(node.val + 8, 22), 0, 2 * Math.PI);
              context.fill();
            },
            nodeCanvasObject: (node, context, globalScale) => {
              const radius = node.val;
              const isSelected = node.id === selectedNodeId;
              const isConnected = connectedNodes.has(node.id);
              const fontSize = Math.max(10 / globalScale, 4);
              context.save();
              context.beginPath();
              context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
              context.fillStyle = getDocumentKindColor(node.kind);
              context.shadowBlur = isSelected ? 18 : isConnected ? 10 : 0;
              context.shadowColor = getDocumentKindColor(node.kind);
              context.fill();
              context.beginPath();
              context.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
              context.lineWidth = isSelected ? 4 / globalScale : 2 / globalScale;
              context.strokeStyle = isSelected ? "#111827" : "rgba(15, 23, 42, 0.35)";
              context.stroke();
              context.shadowBlur = 0;
              if (isSelected || isConnected || globalScale >= 1.35) {
                context.font = `${fontSize}px Inter`;
                context.fillStyle = "#111827";
                context.textAlign = "center";
                context.textBaseline = "top";
                context.fillText(node.label, node.x, node.y + radius + 6);
              }
              context.restore();
            }
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs10("aside", { className: "glass-panel scrollbar-thin flex min-h-[720px] flex-col overflow-y-auto rounded-[28px] p-5", children: [
      /* @__PURE__ */ jsxs10("div", { className: "flex items-start justify-between gap-3 border-b border-slate-800/90 pb-4", children: [
        /* @__PURE__ */ jsxs10("div", { children: [
          /* @__PURE__ */ jsx14("p", { className: "text-sm uppercase tracking-[0.18em] text-blue-300", children: "Evidence / Source Detail" }),
          /* @__PURE__ */ jsx14("h3", { className: "mt-2 text-2xl font-semibold text-white", children: selectedNode?.canonicalName ?? "Select a node" }),
          /* @__PURE__ */ jsxs10("div", { className: "mt-3 flex flex-wrap gap-2", children: [
            selectedNode ? /* @__PURE__ */ jsx14(Badge, { children: formatLabel(selectedNode.kind) }) : null,
            selectedNode ? /* @__PURE__ */ jsx14(Badge, { children: formatPageRange(selectedNode) }) : null
          ] })
        ] }),
        selectedNodeId ? /* @__PURE__ */ jsx14("button", { onClick: () => onNodeSelect(null), className: "rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-slate-500 hover:text-white", children: /* @__PURE__ */ jsx14(RefreshCcw, { className: "h-4 w-4" }) }) : null
      ] }),
      /* @__PURE__ */ jsxs10("div", { className: "mt-5 space-y-4", children: [
        /* @__PURE__ */ jsxs10("section", { className: "rounded-2xl border border-slate-800 bg-slate-950/55 p-4", children: [
          /* @__PURE__ */ jsxs10("div", { className: "flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500", children: [
            /* @__PURE__ */ jsx14(FileSearch, { className: "h-4 w-4" }),
            "Summary"
          ] }),
          /* @__PURE__ */ jsx14("p", { className: "mt-3 text-sm leading-7 text-slate-200", children: selectedNode?.summary || "Select a node to inspect extracted evidence." })
        ] }),
        /* @__PURE__ */ jsxs10("section", { className: "rounded-2xl border border-slate-800 bg-slate-950/55 p-4", children: [
          /* @__PURE__ */ jsxs10("div", { className: "flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500", children: [
            /* @__PURE__ */ jsx14(Quote2, { className: "h-4 w-4" }),
            "Evidence"
          ] }),
          /* @__PURE__ */ jsx14("div", { className: "mt-3 space-y-3", children: (selectedNode?.evidence ?? []).length === 0 ? /* @__PURE__ */ jsx14("p", { className: "text-sm text-slate-400", children: "No evidence attached to this selection." }) : selectedNode?.evidence.slice(0, 8).map((item, index) => /* @__PURE__ */ jsxs10("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/70 p-3", children: [
            /* @__PURE__ */ jsx14("p", { className: "text-sm leading-6 text-slate-200", children: item.quote }),
            /* @__PURE__ */ jsx14("p", { className: "mt-2 text-xs uppercase tracking-[0.16em] text-slate-500", children: formatDocumentEvidencePages([item]) })
          ] }, `${item.quote}-${index}`)) })
        ] }),
        /* @__PURE__ */ jsxs10("section", { className: "rounded-2xl border border-slate-800 bg-slate-950/55 p-4", children: [
          /* @__PURE__ */ jsx14("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Sources" }),
          /* @__PURE__ */ jsx14("div", { className: "mt-3 space-y-2", children: (selectedNode?.sources ?? []).length === 0 ? /* @__PURE__ */ jsx14("p", { className: "text-sm text-slate-400", children: "No source chunks available." }) : selectedNode?.sources.map((source) => /* @__PURE__ */ jsxs10("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200", children: [
            /* @__PURE__ */ jsx14("div", { className: "font-medium", children: source.documentName }),
            /* @__PURE__ */ jsxs10("div", { className: "mt-1 text-xs text-slate-500", children: [
              source.chunkId,
              " | ",
              source.chunkFile
            ] })
          ] }, `${source.documentName}-${source.chunkId}`)) })
        ] })
      ] })
    ] })
  ] });
}
var init_DocumentGraphView = __esm({
  "src/components/DocumentGraphView.tsx"() {
    "use strict";
    init_selectors();
    init_Badge();
    init_Button();
  }
});

// src/pages/DocumentWorkspace.tsx
var DocumentWorkspace_exports = {};
__export(DocumentWorkspace_exports, {
  default: () => DocumentWorkspace
});
import { lazy, Suspense, useEffect as useEffect4, useState as useState5 } from "react";
import { BarChart3, Download, FileJson, FileText as FileText4, List, Loader2 as Loader23, Network as Network5, RefreshCcw as RefreshCcw2, Upload as Upload3 } from "lucide-react";
import { useNavigate as useNavigate4 } from "react-router-dom";
import { jsx as jsx15, jsxs as jsxs11 } from "react/jsx-runtime";
function DocumentWorkspace() {
  const navigate = useNavigate4();
  const { documentGraph, loadDocumentGraph } = useAppContext();
  const [currentView, setCurrentView] = useState5("graph");
  const [selectedNodeId, setSelectedNodeId] = useState5(null);
  useEffect4(() => {
    if (documentGraph.status === "idle" && !documentGraph.data) {
      loadDocumentGraph().catch(() => void 0);
    }
  }, [documentGraph.data, documentGraph.status, loadDocumentGraph]);
  useEffect4(() => {
    if (!documentGraph.data || !selectedNodeId) {
      return;
    }
    if (!documentGraph.data.nodeIndex[selectedNodeId]) {
      setSelectedNodeId(null);
    }
  }, [documentGraph.data, selectedNodeId]);
  if (documentGraph.status === "loading" && !documentGraph.data) {
    return /* @__PURE__ */ jsx15("div", { className: "flex min-h-screen items-center justify-center bg-[#0F172A]", children: /* @__PURE__ */ jsxs11("div", { className: "flex items-center gap-3 text-slate-200", children: [
      /* @__PURE__ */ jsx15(Loader23, { className: "h-5 w-5 animate-spin" }),
      /* @__PURE__ */ jsx15("span", { children: "Loading document graph..." })
    ] }) });
  }
  if (documentGraph.status === "error" && !documentGraph.data) {
    return /* @__PURE__ */ jsx15("div", { className: "min-h-screen bg-[#0F172A] px-6 py-16", children: /* @__PURE__ */ jsx15("div", { className: "mx-auto max-w-4xl", children: /* @__PURE__ */ jsx15(
      EmptyState,
      {
        title: "Document Graph Loading Failed",
        message: documentGraph.error || "The frontend could not load the active document graph from the backend.",
        action: /* @__PURE__ */ jsxs11("div", { className: "flex flex-wrap justify-center gap-3", children: [
          /* @__PURE__ */ jsx15(Button, { onClick: () => loadDocumentGraph().catch(() => void 0), children: "Retry Graph Load" }),
          /* @__PURE__ */ jsx15(Button, { variant: "secondary", onClick: () => navigate("/documents"), children: "Return to Upload" })
        ] })
      }
    ) }) });
  }
  if (!documentGraph.data || documentGraph.data.nodes.length === 0) {
    return /* @__PURE__ */ jsx15("div", { className: "min-h-screen bg-[#0F172A] px-6 py-16", children: /* @__PURE__ */ jsx15("div", { className: "mx-auto max-w-4xl", children: /* @__PURE__ */ jsx15(
      EmptyState,
      {
        title: "The Document Graph Is Empty",
        message: "Upload a PDF, markdown, or text document to build a document knowledge graph.",
        action: /* @__PURE__ */ jsx15(Button, { onClick: () => navigate("/documents"), children: "Upload Document" })
      }
    ) }) });
  }
  const graphData = documentGraph.data;
  const artifactManifest = documentGraph.artifacts;
  const finalMarkdownArtifact = artifactManifest?.artifacts.find((artifact) => artifact.type === "final-markdown") ?? null;
  const mergedJsonArtifact = artifactManifest?.artifacts.find((artifact) => artifact.type === "merged-json") ?? null;
  const chunkArtifacts = artifactManifest?.chunk_artifacts ?? [];
  return /* @__PURE__ */ jsxs11("div", { className: "flex min-h-screen bg-[#0F172A]", children: [
    /* @__PURE__ */ jsxs11("aside", { className: "hidden min-h-screen w-72 shrink-0 border-r border-slate-800 bg-slate-950/95 xl:flex xl:flex-col xl:self-stretch", children: [
      /* @__PURE__ */ jsxs11("div", { className: "border-b border-slate-800 px-6 py-7", children: [
        /* @__PURE__ */ jsxs11("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx15("div", { className: "rounded-2xl bg-blue-500/15 p-3 text-blue-300", children: /* @__PURE__ */ jsx15(FileText4, { className: "h-7 w-7" }) }),
          /* @__PURE__ */ jsxs11("div", { children: [
            /* @__PURE__ */ jsx15("h1", { className: "text-xl font-bold text-white", children: "TwinGraphOps" }),
            /* @__PURE__ */ jsx15("p", { className: "text-sm text-slate-400", children: "Document knowledge graph workspace" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs11("div", { className: "mt-6 grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs11("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/70 p-3", children: [
            /* @__PURE__ */ jsx15("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Nodes" }),
            /* @__PURE__ */ jsx15("p", { className: "mt-2 text-2xl font-semibold text-white", children: graphData.nodes.length })
          ] }),
          /* @__PURE__ */ jsxs11("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/70 p-3", children: [
            /* @__PURE__ */ jsx15("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Edges" }),
            /* @__PURE__ */ jsx15("p", { className: "mt-2 text-2xl font-semibold text-white", children: graphData.links.length })
          ] })
        ] }),
        /* @__PURE__ */ jsx15("div", { className: "mt-4", children: /* @__PURE__ */ jsxs11(Badge, { className: "border-blue-500/30 bg-blue-500/10 text-blue-100", children: [
          "Active Graph: ",
          formatLabel(graphData.source)
        ] }) }),
        /* @__PURE__ */ jsxs11("div", { className: "mt-4 grid grid-cols-3 gap-2", children: [
          /* @__PURE__ */ jsx15(
            "button",
            {
              onClick: () => navigate("/risk"),
              className: "rounded-2xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white",
              children: "Risk"
            }
          ),
          /* @__PURE__ */ jsx15("button", { className: "rounded-2xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white", children: "Documents" }),
          /* @__PURE__ */ jsx15(
            "button",
            {
              onClick: () => navigate("/graphs"),
              className: "rounded-2xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white",
              children: "Graphs"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx15("nav", { className: "flex-1 space-y-2 p-4", children: navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return /* @__PURE__ */ jsxs11(
          "button",
          {
            onClick: () => setCurrentView(item.id),
            className: `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`,
            children: [
              /* @__PURE__ */ jsx15(Icon, { className: "h-5 w-5" }),
              /* @__PURE__ */ jsx15("span", { children: item.label })
            ]
          },
          item.id
        );
      }) }),
      /* @__PURE__ */ jsxs11("div", { className: "border-t border-slate-800 p-4", children: [
        /* @__PURE__ */ jsxs11(
          "button",
          {
            onClick: () => navigate("/documents"),
            className: "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white",
            children: [
              /* @__PURE__ */ jsx15(Upload3, { className: "h-5 w-5" }),
              /* @__PURE__ */ jsx15("span", { children: "Upload New Document" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs11(
          "button",
          {
            onClick: () => navigate("/graphs"),
            className: "mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white",
            children: [
              /* @__PURE__ */ jsx15(Network5, { className: "h-5 w-5" }),
              /* @__PURE__ */ jsx15("span", { children: "Graph Workspace" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs11("main", { className: "flex min-w-0 flex-1 flex-col", children: [
      /* @__PURE__ */ jsx15("header", { className: "border-b border-slate-800 bg-slate-950/60 px-6 py-4", children: /* @__PURE__ */ jsxs11("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxs11("div", { children: [
          /* @__PURE__ */ jsx15("h1", { className: "text-2xl font-semibold text-white", children: "Document Graph Workspace" }),
          /* @__PURE__ */ jsxs11("p", { className: "mt-1 text-sm text-slate-400", children: [
            graphData.nodes.length,
            " nodes, ",
            graphData.links.length,
            " relationships, ",
            graphData.kindTypes.length,
            " node kinds"
          ] })
        ] }),
        /* @__PURE__ */ jsxs11("div", { className: "flex items-center gap-3", children: [
          documentGraph.error ? /* @__PURE__ */ jsx15(StatusBanner, { tone: "error", message: documentGraph.error }) : null,
          /* @__PURE__ */ jsxs11(Button, { variant: "secondary", onClick: () => loadDocumentGraph({ keepStatus: true }).catch(() => void 0), children: [
            /* @__PURE__ */ jsx15(RefreshCcw2, { className: "h-4 w-4" }),
            "Refresh"
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs11("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxs11("section", { className: "border-b border-slate-800 bg-slate-950/40 px-6 py-4", children: [
          /* @__PURE__ */ jsxs11("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [
            /* @__PURE__ */ jsxs11("div", { children: [
              /* @__PURE__ */ jsx15("h2", { className: "text-sm font-semibold uppercase tracking-[0.2em] text-slate-400", children: "Download Source Materials" }),
              /* @__PURE__ */ jsx15("p", { className: "mt-2 text-sm text-slate-300", children: "Download the finalized markdown, chunked markdown files, and merged document graph JSON for this workspace." })
            ] }),
            artifactManifest ? /* @__PURE__ */ jsxs11(
              "a",
              {
                href: artifactManifest.bundle.download_url,
                className: "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition-all hover:bg-blue-500",
                children: [
                  /* @__PURE__ */ jsx15(Download, { className: "h-4 w-4" }),
                  /* @__PURE__ */ jsx15("span", { children: "Download Bundle" })
                ]
              }
            ) : null
          ] }),
          artifactManifest ? /* @__PURE__ */ jsxs11("div", { className: "mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]", children: [
            /* @__PURE__ */ jsxs11(
              "a",
              {
                href: finalMarkdownArtifact?.download_url || "#",
                className: "rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-600 hover:bg-slate-900",
                children: [
                  /* @__PURE__ */ jsxs11("div", { className: "flex items-center gap-3 text-white", children: [
                    /* @__PURE__ */ jsx15(FileText4, { className: "h-5 w-5 text-blue-300" }),
                    /* @__PURE__ */ jsx15("span", { className: "font-medium", children: "Final Markdown" })
                  ] }),
                  /* @__PURE__ */ jsx15("p", { className: "mt-2 text-sm text-slate-400", children: finalMarkdownArtifact?.filename || "Unavailable" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs11(
              "a",
              {
                href: mergedJsonArtifact?.download_url || "#",
                className: "rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-600 hover:bg-slate-900",
                children: [
                  /* @__PURE__ */ jsxs11("div", { className: "flex items-center gap-3 text-white", children: [
                    /* @__PURE__ */ jsx15(FileJson, { className: "h-5 w-5 text-emerald-300" }),
                    /* @__PURE__ */ jsx15("span", { className: "font-medium", children: "Merged JSON" })
                  ] }),
                  /* @__PURE__ */ jsx15("p", { className: "mt-2 text-sm text-slate-400", children: mergedJsonArtifact?.filename || "Unavailable" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs11("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/70 p-4", children: [
              /* @__PURE__ */ jsxs11("div", { className: "flex items-center gap-3 text-white", children: [
                /* @__PURE__ */ jsx15(FileText4, { className: "h-5 w-5 text-amber-300" }),
                /* @__PURE__ */ jsx15("span", { className: "font-medium", children: "Chunked Markdown Files" })
              ] }),
              /* @__PURE__ */ jsxs11("p", { className: "mt-2 text-sm text-slate-400", children: [
                chunkArtifacts.length,
                " chunk file",
                chunkArtifacts.length === 1 ? "" : "s"
              ] }),
              /* @__PURE__ */ jsx15("div", { className: "mt-3 max-h-32 space-y-2 overflow-auto pr-1", children: chunkArtifacts.map((artifact) => /* @__PURE__ */ jsx15(
                "a",
                {
                  href: artifact.download_url,
                  className: "block truncate text-sm text-blue-300 transition hover:text-blue-200",
                  children: artifact.filename
                },
                artifact.id
              )) })
            ] })
          ] }) : documentGraph.artifactsError ? /* @__PURE__ */ jsx15("div", { className: "mt-4", children: /* @__PURE__ */ jsx15(StatusBanner, { tone: "error", message: documentGraph.artifactsError }) }) : /* @__PURE__ */ jsx15("div", { className: "mt-4", children: /* @__PURE__ */ jsx15(StatusBanner, { tone: "info", message: "Source material downloads are not available for this document yet." }) })
        ] }),
        currentView === "graph" && /* @__PURE__ */ jsx15("div", { className: "p-6", children: /* @__PURE__ */ jsx15(
          Suspense,
          {
            fallback: /* @__PURE__ */ jsx15("div", { className: "flex min-h-[720px] items-center justify-center rounded-[24px] border border-slate-700 bg-[#d9d9d9]", children: /* @__PURE__ */ jsxs11("div", { className: "flex items-center gap-3 text-slate-700", children: [
              /* @__PURE__ */ jsx15(Loader23, { className: "h-5 w-5 animate-spin" }),
              /* @__PURE__ */ jsx15("span", { children: "Loading graph view..." })
            ] }) }),
            children: /* @__PURE__ */ jsx15(DocumentGraphView2, { graphData, selectedNodeId, onNodeSelect: setSelectedNodeId })
          }
        ) }),
        currentView === "nodes" && /* @__PURE__ */ jsx15(
          DocumentNodesEdgesView,
          {
            graphData,
            onNodeSelect: (nodeId) => {
              setCurrentView("graph");
              setSelectedNodeId(nodeId);
            }
          }
        ),
        currentView === "overview" && /* @__PURE__ */ jsx15(DocumentOverview, { graphData })
      ] })
    ] })
  ] });
}
var DocumentGraphView2, navItems;
var init_DocumentWorkspace = __esm({
  "src/pages/DocumentWorkspace.tsx"() {
    "use strict";
    init_DocumentNodesEdgesView();
    init_DocumentOverview();
    init_EmptyState();
    init_StatusBanner();
    init_Button();
    init_Badge();
    init_selectors();
    init_AppContext();
    DocumentGraphView2 = lazy(() => Promise.resolve().then(() => (init_DocumentGraphView(), DocumentGraphView_exports)));
    navItems = [
      { id: "graph", label: "Graph View", icon: Network5 },
      { id: "nodes", label: "Nodes & Edges", icon: List },
      { id: "overview", label: "Document Overview", icon: BarChart3 }
    ];
  }
});

// src/pages/UploadedGraphUploadPage.tsx
var UploadedGraphUploadPage_exports = {};
__export(UploadedGraphUploadPage_exports, {
  default: () => UploadedGraphUploadPage
});
import { useRef as useRef5 } from "react";
import { ChevronRight as ChevronRight3, FileJson as FileJson2, Network as Network6, Shield as Shield3, Upload as Upload4 } from "lucide-react";
import { useNavigate as useNavigate5 } from "react-router-dom";
import { jsx as jsx16, jsxs as jsxs12 } from "react/jsx-runtime";
function formatFileSize3(size) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}
function UploadedGraphUploadPage() {
  const navigate = useNavigate5();
  const fileInputRef = useRef5(null);
  const {
    uploadedGraphUpload,
    uploadedGraph,
    setUploadedGraphDragActive,
    selectUploadedGraphFile,
    clearSelectedUploadedGraphFile,
    loadUploadedGraphFromSelectedFile
  } = useAppContext();
  const selectedFile = uploadedGraphUpload.selectedFile;
  const handleFile = (file) => {
    selectUploadedGraphFile(file);
  };
  const handleDrop = (event) => {
    event.preventDefault();
    setUploadedGraphDragActive(false);
    handleFile(event.dataTransfer.files?.[0] ?? null);
  };
  const handleFileInput = (event) => {
    handleFile(event.target.files?.[0] ?? null);
  };
  const handleOpenWorkspace = async () => {
    try {
      await loadUploadedGraphFromSelectedFile();
      navigate("/graphs/workspace");
    } catch {
    }
  };
  return /* @__PURE__ */ jsx16("div", { className: "min-h-screen bg-[#0F172A] text-white", children: /* @__PURE__ */ jsxs12("div", { className: "mx-auto max-w-7xl px-6 py-10", children: [
    /* @__PURE__ */ jsxs12("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs12("div", { className: "flex rounded-2xl border border-slate-800 bg-slate-950/70 p-1", children: [
        /* @__PURE__ */ jsx16("button", { onClick: () => navigate("/"), className: "rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white", children: "Risk Workspace" }),
        /* @__PURE__ */ jsx16("button", { onClick: () => navigate("/documents"), className: "rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white", children: "Document Workspace" }),
        /* @__PURE__ */ jsx16("button", { className: "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white", children: "Graph Workspace" })
      ] }),
      /* @__PURE__ */ jsx16(
        Button,
        {
          variant: "secondary",
          onClick: () => navigate("/graphs/workspace"),
          disabled: !uploadedGraph.operationalData && !uploadedGraph.documentData,
          children: "Open Uploaded Graph"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs12("div", { className: "grid gap-10 xl:grid-cols-[1.2fr_0.8fr]", children: [
      /* @__PURE__ */ jsxs12("section", { className: "glass-panel rounded-[32px] px-8 py-10 md:px-10 md:py-12", children: [
        /* @__PURE__ */ jsxs12("div", { className: "mb-4 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx16("div", { className: "rounded-2xl bg-blue-500/15 p-3 text-blue-300", children: /* @__PURE__ */ jsx16(Network6, { className: "h-8 w-8" }) }),
          /* @__PURE__ */ jsxs12("div", { children: [
            /* @__PURE__ */ jsx16("div", { className: "text-sm uppercase tracking-[0.22em] text-blue-300", children: "Finalized Knowledge Graphs" }),
            /* @__PURE__ */ jsx16("h1", { className: "mt-1 text-5xl font-bold tracking-tight text-white md:text-6xl", children: "TwinGraphOps" })
          ] })
        ] }),
        /* @__PURE__ */ jsx16("p", { className: "max-w-3xl text-lg leading-8 text-slate-300", children: "Upload either an operational or document graph artifact JSON, and TwinGraphOps will detect the shape locally and open the right viewer automatically." }),
        /* @__PURE__ */ jsxs12("div", { className: "mt-8 flex flex-wrap gap-3", children: [
          /* @__PURE__ */ jsx16(Badge, { className: "border-blue-500/30 bg-blue-500/10 text-blue-100", children: "Local only" }),
          /* @__PURE__ */ jsxs12(Badge, { className: "border-slate-700 bg-slate-900/80 text-slate-200", children: [
            "Upload limit ",
            Math.round(appConfig.maxUploadBytes / 1024 / 1024),
            " MB"
          ] }),
          /* @__PURE__ */ jsx16(Badge, { className: "border-slate-700 bg-slate-900/80 text-slate-200", children: "Operational + document artifacts" })
        ] }),
        /* @__PURE__ */ jsxs12("div", { className: "mt-12 grid gap-6 md:grid-cols-3", children: [
          /* @__PURE__ */ jsxs12("div", { className: "rounded-[28px] border border-slate-800 bg-slate-950/55 p-6", children: [
            /* @__PURE__ */ jsx16("div", { className: "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300", children: /* @__PURE__ */ jsx16(Upload4, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsx16("h2", { className: "text-lg font-semibold text-white", children: "1. Upload JSON" }),
            /* @__PURE__ */ jsx16("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: "Choose an operational or document artifact JSON file." })
          ] }),
          /* @__PURE__ */ jsxs12("div", { className: "rounded-[28px] border border-slate-800 bg-slate-950/55 p-6", children: [
            /* @__PURE__ */ jsx16("div", { className: "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300", children: /* @__PURE__ */ jsx16(FileJson2, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsx16("h2", { className: "text-lg font-semibold text-white", children: "2. Validate Locally" }),
            /* @__PURE__ */ jsx16("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: "The file is parsed in-browser and matched against operational and document artifact schemas." })
          ] }),
          /* @__PURE__ */ jsxs12("div", { className: "rounded-[28px] border border-slate-800 bg-slate-950/55 p-6", children: [
            /* @__PURE__ */ jsx16("div", { className: "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300", children: /* @__PURE__ */ jsx16(Shield3, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsx16("h2", { className: "text-lg font-semibold text-white", children: "3. Inspect Breakdown" }),
            /* @__PURE__ */ jsx16("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: "TwinGraphOps auto-routes to the correct operational or document breakdown without sending anything to the backend." })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs12("aside", { className: "glass-panel rounded-[32px] p-8", children: [
        /* @__PURE__ */ jsx16("h2", { className: "text-xl font-semibold text-white", children: "Graph Upload" }),
        /* @__PURE__ */ jsx16("p", { className: "mt-3 text-sm leading-6 text-slate-300", children: "Load one operational or document graph artifact into a browser-session workspace. The JSON never leaves the frontend." }),
        /* @__PURE__ */ jsxs12(
          "div",
          {
            className: `mt-6 rounded-[28px] border-2 border-dashed p-8 text-center transition ${uploadedGraphUpload.phase === "drag-hover" ? "border-blue-400 bg-blue-500/10" : "border-slate-700 bg-slate-950/50 hover:border-slate-500"}`,
            onDragOver: (event) => {
              event.preventDefault();
              setUploadedGraphDragActive(true);
            },
            onDragLeave: () => setUploadedGraphDragActive(false),
            onDrop: handleDrop,
            children: [
              /* @__PURE__ */ jsx16(Upload4, { className: "mx-auto h-14 w-14 text-slate-400" }),
              /* @__PURE__ */ jsx16("h3", { className: "mt-4 text-xl font-medium text-white", children: "Upload Graph Artifact JSON" }),
              /* @__PURE__ */ jsx16("p", { className: "mt-2 text-sm text-slate-400", children: "Drag and drop an operational or document artifact here or browse locally." }),
              /* @__PURE__ */ jsx16(
                "input",
                {
                  ref: fileInputRef,
                  type: "file",
                  accept: ".json,application/json",
                  className: "hidden",
                  onChange: handleFileInput
                }
              ),
              /* @__PURE__ */ jsxs12("div", { className: "mt-6 flex flex-wrap justify-center gap-3", children: [
                /* @__PURE__ */ jsxs12(Button, { variant: "secondary", onClick: () => fileInputRef.current?.click(), children: [
                  /* @__PURE__ */ jsx16(FileJson2, { className: "h-4 w-4" }),
                  "Choose JSON"
                ] }),
                /* @__PURE__ */ jsxs12(Button, { onClick: () => void handleOpenWorkspace(), disabled: !selectedFile, children: [
                  "Open Graph Workspace",
                  /* @__PURE__ */ jsx16(ChevronRight3, { className: "h-4 w-4" })
                ] })
              ] }),
              /* @__PURE__ */ jsx16("p", { className: "mt-4 text-xs uppercase tracking-[0.2em] text-slate-500", children: "Supported format: .json artifact files" })
            ]
          }
        ),
        /* @__PURE__ */ jsx16("div", { className: "mt-6 rounded-[28px] border border-slate-800 bg-slate-950/60 p-4", children: /* @__PURE__ */ jsxs12("div", { className: "flex items-start justify-between gap-4", children: [
          /* @__PURE__ */ jsxs12("div", { children: [
            /* @__PURE__ */ jsx16("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Selected File" }),
            /* @__PURE__ */ jsx16("p", { className: "mt-2 text-sm font-medium text-white", children: selectedFile?.name ?? "No file selected." }),
            /* @__PURE__ */ jsx16("p", { className: "mt-1 text-sm text-slate-400", children: selectedFile ? formatFileSize3(selectedFile.size) : "Choose an operational or document artifact to begin." })
          ] }),
          selectedFile ? /* @__PURE__ */ jsx16(Button, { variant: "ghost", onClick: clearSelectedUploadedGraphFile, children: "Clear" }) : null
        ] }) }),
        /* @__PURE__ */ jsx16("div", { className: "mt-6", children: /* @__PURE__ */ jsx16(
          StatusBanner,
          {
            tone: uploadedGraphUpload.error ? "error" : uploadedGraph.operationalData || uploadedGraph.documentData ? "success" : "info",
            message: uploadedGraphUpload.error || uploadedGraphUpload.statusMessage || "Upload a graph artifact JSON file to continue."
          }
        ) })
      ] })
    ] })
  ] }) });
}
var init_UploadedGraphUploadPage = __esm({
  "src/pages/UploadedGraphUploadPage.tsx"() {
    "use strict";
    init_Badge();
    init_Button();
    init_StatusBanner();
    init_config();
    init_AppContext();
  }
});

// src/components/NodesEdgesView.tsx
import { useDeferredValue as useDeferredValue2, useEffect as useEffect5, useMemo as useMemo5, useState as useState6 } from "react";
import { ArrowUpDown as ArrowUpDown2, ExternalLink as ExternalLink2, Filter as Filter2, Search as Search2 } from "lucide-react";
import { Fragment as Fragment2, jsx as jsx17, jsxs as jsxs13 } from "react/jsx-runtime";
function NodesEdgesView({ graphData, onNodeSelect }) {
  const [activeTable, setActiveTable] = useState6("nodes");
  const [searchTerm, setSearchTerm] = useState6("");
  const [typeFilter, setTypeFilter] = useState6("all");
  const [relationFilter, setRelationFilter] = useState6("all");
  const [nodeSortField, setNodeSortField] = useState6("riskScore");
  const [nodeSortOrder, setNodeSortOrder] = useState6("desc");
  const [edgeSortField, setEdgeSortField] = useState6("source");
  const [edgeSortOrder, setEdgeSortOrder] = useState6("asc");
  const [page, setPage] = useState6(1);
  const deferredSearch = useDeferredValue2(searchTerm.trim().toLowerCase());
  const nodeTypes = useMemo5(
    () => [...new Set(graphData.nodes.map((node) => node.type))].sort((left, right) => left.localeCompare(right)),
    [graphData.nodes]
  );
  const filteredNodes = useMemo5(() => {
    const nodes = graphData.nodes.filter((node) => {
      const matchesSearch = deferredSearch.length === 0 || node.name.toLowerCase().includes(deferredSearch) || node.id.toLowerCase().includes(deferredSearch) || node.description.toLowerCase().includes(deferredSearch);
      const matchesType = typeFilter === "all" || node.type === typeFilter;
      return matchesSearch && matchesType;
    });
    return nodes.sort((left, right) => {
      const leftConnections = getConnectionCount(graphData, left.id);
      const rightConnections = getConnectionCount(graphData, right.id);
      let comparison = 0;
      switch (nodeSortField) {
        case "name":
          comparison = left.name.localeCompare(right.name);
          break;
        case "type":
          comparison = left.type.localeCompare(right.type);
          break;
        case "dependencies":
          comparison = left.dependencies.length - right.dependencies.length;
          break;
        case "connections":
          comparison = leftConnections - rightConnections;
          break;
        case "riskScore":
        default:
          comparison = left.riskScore - right.riskScore;
      }
      return nodeSortOrder === "asc" ? comparison : -comparison;
    });
  }, [deferredSearch, graphData, nodeSortField, nodeSortOrder, typeFilter]);
  const filteredEdges = useMemo5(() => {
    const edges = graphData.links.filter((edge) => {
      const matchesSearch = deferredSearch.length === 0 || getLinkEndpointId(edge.source).toLowerCase().includes(deferredSearch) || getLinkEndpointId(edge.target).toLowerCase().includes(deferredSearch) || edge.relation.toLowerCase().includes(deferredSearch);
      const matchesRelation = relationFilter === "all" || edge.relation === relationFilter;
      return matchesSearch && matchesRelation;
    });
    return edges.sort((left, right) => {
      let comparison = 0;
      switch (edgeSortField) {
        case "target":
          comparison = getLinkEndpointId(left.target).localeCompare(getLinkEndpointId(right.target));
          break;
        case "relation":
          comparison = left.relation.localeCompare(right.relation);
          break;
        case "source":
        default:
          comparison = getLinkEndpointId(left.source).localeCompare(getLinkEndpointId(right.source));
      }
      return edgeSortOrder === "asc" ? comparison : -comparison;
    });
  }, [deferredSearch, edgeSortField, edgeSortOrder, graphData.links, relationFilter]);
  useEffect5(() => {
    setPage(1);
  }, [activeTable, deferredSearch, edgeSortField, edgeSortOrder, nodeSortField, nodeSortOrder, relationFilter, typeFilter]);
  const nodePageCount = Math.max(1, Math.ceil(filteredNodes.length / pageSize2));
  const edgePageCount = Math.max(1, Math.ceil(filteredEdges.length / pageSize2));
  const pagedNodes = filteredNodes.slice((page - 1) * pageSize2, page * pageSize2);
  const pagedEdges = filteredEdges.slice((page - 1) * pageSize2, page * pageSize2);
  const toggleNodeSort = (field) => {
    if (nodeSortField === field) {
      setNodeSortOrder((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setNodeSortField(field);
    setNodeSortOrder(field === "name" || field === "type" ? "asc" : "desc");
  };
  const toggleEdgeSort = (field) => {
    if (edgeSortField === field) {
      setEdgeSortOrder((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setEdgeSortField(field);
    setEdgeSortOrder("asc");
  };
  const pageCount = activeTable === "nodes" ? nodePageCount : edgePageCount;
  return /* @__PURE__ */ jsx17("div", { className: "h-full overflow-y-auto p-6 md:p-8", children: /* @__PURE__ */ jsxs13("div", { className: "mx-auto max-w-7xl space-y-6", children: [
    /* @__PURE__ */ jsxs13("div", { children: [
      /* @__PURE__ */ jsx17("h1", { className: "text-3xl font-bold text-white", children: "Nodes & Edges" }),
      /* @__PURE__ */ jsx17("p", { className: "mt-2 text-sm text-slate-300", children: "Search, filter, sort, and page through components and relationships from the active backend graph." })
    ] }),
    /* @__PURE__ */ jsx17("div", { className: "glass-panel rounded-3xl p-4", children: /* @__PURE__ */ jsxs13("div", { className: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]", children: [
      /* @__PURE__ */ jsxs13("div", { className: "relative", children: [
        /* @__PURE__ */ jsx17(Search2, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" }),
        /* @__PURE__ */ jsx17(
          Input,
          {
            value: searchTerm,
            onChange: (event) => setSearchTerm(event.target.value),
            placeholder: activeTable === "nodes" ? "Search nodes by id, name, or description" : "Search edges by source, target, or relation",
            className: "pl-10"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs13("label", { className: "flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-3", children: [
        /* @__PURE__ */ jsx17(Filter2, { className: "h-4 w-4 text-slate-500" }),
        /* @__PURE__ */ jsxs13(
          "select",
          {
            value: typeFilter,
            onChange: (event) => setTypeFilter(event.target.value),
            className: "w-full bg-transparent py-3 text-sm text-white outline-none",
            disabled: activeTable !== "nodes",
            children: [
              /* @__PURE__ */ jsx17("option", { value: "all", children: "All types" }),
              nodeTypes.map((type) => /* @__PURE__ */ jsx17("option", { value: type, children: formatLabel(type) }, type))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs13("label", { className: "flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-3", children: [
        /* @__PURE__ */ jsx17(Filter2, { className: "h-4 w-4 text-slate-500" }),
        /* @__PURE__ */ jsxs13(
          "select",
          {
            value: relationFilter,
            onChange: (event) => setRelationFilter(event.target.value),
            className: "w-full bg-transparent py-3 text-sm text-white outline-none",
            disabled: activeTable !== "edges",
            children: [
              /* @__PURE__ */ jsx17("option", { value: "all", children: "All relations" }),
              graphData.relationTypes.map((relation) => /* @__PURE__ */ jsx17("option", { value: relation, children: formatLabel(relation) }, relation))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs13("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx17(Button, { variant: activeTable === "nodes" ? "primary" : "secondary", onClick: () => setActiveTable("nodes"), children: "Nodes" }),
        /* @__PURE__ */ jsx17(Button, { variant: activeTable === "edges" ? "primary" : "secondary", onClick: () => setActiveTable("edges"), children: "Edges" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx17("div", { className: "glass-panel overflow-hidden rounded-3xl", children: activeTable === "nodes" ? /* @__PURE__ */ jsxs13(Fragment2, { children: [
      /* @__PURE__ */ jsxs13("div", { className: "grid grid-cols-[1.3fr_1fr_0.7fr_0.7fr_0.7fr_0.8fr] gap-4 border-b border-slate-800 bg-slate-950/90 px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400", children: [
        [
          ["name", "Component"],
          ["type", "Type"],
          ["riskScore", "Risk"],
          ["dependencies", "Dependencies"],
          ["connections", "Connections"]
        ].map(([field, label]) => /* @__PURE__ */ jsxs13(
          "button",
          {
            className: "flex items-center gap-1 text-left",
            onClick: () => toggleNodeSort(field),
            children: [
              label,
              /* @__PURE__ */ jsx17(ArrowUpDown2, { className: "h-3.5 w-3.5" })
            ]
          },
          field
        )),
        /* @__PURE__ */ jsx17("div", { children: "Action" })
      ] }),
      /* @__PURE__ */ jsx17("div", { className: "divide-y divide-slate-800", children: pagedNodes.map((node) => /* @__PURE__ */ jsxs13("div", { className: "grid grid-cols-[1.3fr_1fr_0.7fr_0.7fr_0.7fr_0.8fr] gap-4 px-4 py-4 text-sm", children: [
        /* @__PURE__ */ jsxs13("div", { children: [
          /* @__PURE__ */ jsx17("div", { className: "font-medium text-white", children: node.name }),
          /* @__PURE__ */ jsx17("div", { className: "mt-1 text-xs text-slate-400", children: node.id })
        ] }),
        /* @__PURE__ */ jsx17("div", { children: /* @__PURE__ */ jsx17(
          Badge,
          {
            className: "border-transparent text-white",
            style: { backgroundColor: getTypeColor(node.type) },
            children: formatLabel(node.type)
          }
        ) }),
        /* @__PURE__ */ jsx17("div", { children: /* @__PURE__ */ jsx17(
          Badge,
          {
            className: "border-transparent text-white",
            style: { backgroundColor: getRiskColor(node.riskLevel) },
            children: node.riskScore
          }
        ) }),
        /* @__PURE__ */ jsx17("div", { className: "text-slate-300", children: node.dependencies.length }),
        /* @__PURE__ */ jsx17("div", { className: "text-slate-300", children: getConnectionCount(graphData, node.id) }),
        /* @__PURE__ */ jsx17("div", { children: /* @__PURE__ */ jsxs13(
          "button",
          {
            onClick: () => onNodeSelect(node.id),
            className: "inline-flex items-center gap-1 text-blue-300 transition hover:text-blue-200",
            children: [
              "View",
              /* @__PURE__ */ jsx17(ExternalLink2, { className: "h-3.5 w-3.5" })
            ]
          }
        ) })
      ] }, node.id)) })
    ] }) : /* @__PURE__ */ jsxs13(Fragment2, { children: [
      /* @__PURE__ */ jsxs13("div", { className: "grid grid-cols-[1fr_1fr_1fr_1.4fr_0.8fr] gap-4 border-b border-slate-800 bg-slate-950/90 px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400", children: [
        [
          ["source", "Source"],
          ["target", "Target"],
          ["relation", "Relation"]
        ].map(([field, label]) => /* @__PURE__ */ jsxs13(
          "button",
          {
            className: "flex items-center gap-1 text-left",
            onClick: () => toggleEdgeSort(field),
            children: [
              label,
              /* @__PURE__ */ jsx17(ArrowUpDown2, { className: "h-3.5 w-3.5" })
            ]
          },
          field
        )),
        /* @__PURE__ */ jsx17("div", { children: "Rationale" }),
        /* @__PURE__ */ jsx17("div", { children: "Action" })
      ] }),
      /* @__PURE__ */ jsx17("div", { className: "divide-y divide-slate-800", children: pagedEdges.map((edge) => /* @__PURE__ */ jsxs13("div", { className: "grid grid-cols-[1fr_1fr_1fr_1.4fr_0.8fr] gap-4 px-4 py-4 text-sm", children: [
        /* @__PURE__ */ jsx17("div", { className: "text-slate-200", children: graphData.nodeIndex[getLinkEndpointId(edge.source)]?.name ?? getLinkEndpointId(edge.source) }),
        /* @__PURE__ */ jsx17("div", { className: "text-slate-200", children: graphData.nodeIndex[getLinkEndpointId(edge.target)]?.name ?? getLinkEndpointId(edge.target) }),
        /* @__PURE__ */ jsx17("div", { className: "text-slate-300", children: formatLabel(edge.relation) }),
        /* @__PURE__ */ jsx17("div", { className: "text-slate-400", children: edge.rationale || "No rationale provided." }),
        /* @__PURE__ */ jsx17("div", { children: /* @__PURE__ */ jsxs13(
          "button",
          {
            onClick: () => onNodeSelect(getLinkEndpointId(edge.source)),
            className: "inline-flex items-center gap-1 text-blue-300 transition hover:text-blue-200",
            children: [
              "Inspect",
              /* @__PURE__ */ jsx17(ExternalLink2, { className: "h-3.5 w-3.5" })
            ]
          }
        ) })
      ] }, edge.id)) })
    ] }) }),
    /* @__PURE__ */ jsxs13("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxs13("div", { className: "text-sm text-slate-400", children: [
        "Showing ",
        activeTable === "nodes" ? pagedNodes.length : pagedEdges.length,
        " of",
        " ",
        activeTable === "nodes" ? filteredNodes.length : filteredEdges.length,
        " ",
        activeTable
      ] }),
      /* @__PURE__ */ jsxs13("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx17(Button, { variant: "secondary", disabled: page === 1, onClick: () => setPage((current) => Math.max(1, current - 1)), children: "Previous" }),
        /* @__PURE__ */ jsxs13(Badge, { children: [
          "Page ",
          page,
          " of ",
          pageCount
        ] }),
        /* @__PURE__ */ jsx17(
          Button,
          {
            variant: "secondary",
            disabled: page === pageCount,
            onClick: () => setPage((current) => Math.min(pageCount, current + 1)),
            children: "Next"
          }
        )
      ] })
    ] })
  ] }) });
}
var pageSize2;
var init_NodesEdgesView = __esm({
  "src/components/NodesEdgesView.tsx"() {
    "use strict";
    init_Badge();
    init_Input();
    init_Button();
    init_selectors();
    pageSize2 = 10;
  }
});

// src/components/RiskAnalysis.tsx
import { AlertTriangle as AlertTriangle3, GitBranch as GitBranch3, Shield as Shield4, Target } from "lucide-react";
import { jsx as jsx18, jsxs as jsxs14 } from "react/jsx-runtime";
function RiskAnalysis({ graphData, sourceLabel = "active graph" }) {
  const summary = buildGraphSummary(graphData);
  const maxRiskBucket = Math.max(...summary.riskDistribution.map((item) => item.count), 1);
  const maxTypeCount = Math.max(...summary.typeDistribution.map((item) => item.count), 1);
  return /* @__PURE__ */ jsx18("div", { className: "h-full overflow-y-auto p-6 md:p-8", children: /* @__PURE__ */ jsxs14("div", { className: "mx-auto max-w-7xl space-y-8", children: [
    /* @__PURE__ */ jsxs14("div", { children: [
      /* @__PURE__ */ jsxs14("div", { className: "flex items-center gap-3 text-sm uppercase tracking-[0.18em] text-orange-300", children: [
        /* @__PURE__ */ jsx18(Shield4, { className: "h-4 w-4" }),
        "Risk Analysis"
      ] }),
      /* @__PURE__ */ jsx18("h1", { className: "mt-2 text-3xl font-bold text-white", children: "Operational Risk Dashboard" }),
      /* @__PURE__ */ jsxs14("p", { className: "mt-2 max-w-3xl text-sm leading-7 text-slate-300", children: [
        "Dashboard values are derived directly from the ",
        sourceLabel,
        " because the current frontend does not depend on a separate ranked-risk endpoint here."
      ] })
    ] }),
    /* @__PURE__ */ jsxs14("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [
      /* @__PURE__ */ jsxs14("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsx18("p", { className: "text-sm text-slate-400", children: "Average Risk" }),
        /* @__PURE__ */ jsx18("p", { className: "mt-3 text-4xl font-semibold text-white", children: summary.avgRisk })
      ] }),
      /* @__PURE__ */ jsxs14("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsx18("p", { className: "text-sm text-slate-400", children: "High Risk Nodes" }),
        /* @__PURE__ */ jsx18("p", { className: "mt-3 text-4xl font-semibold text-red-400", children: summary.highRiskNodes })
      ] }),
      /* @__PURE__ */ jsxs14("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsx18("p", { className: "text-sm text-slate-400", children: "Relationships" }),
        /* @__PURE__ */ jsx18("p", { className: "mt-3 text-4xl font-semibold text-white", children: summary.totalRelationships })
      ] }),
      /* @__PURE__ */ jsxs14("div", { className: "glass-panel rounded-3xl p-5", children: [
        /* @__PURE__ */ jsx18("p", { className: "text-sm text-slate-400", children: "Highest Risk Component" }),
        /* @__PURE__ */ jsx18("p", { className: "mt-3 text-lg font-semibold text-white", children: summary.highestRiskNode?.name ?? "n/a" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs14("div", { className: "grid gap-8 xl:grid-cols-[0.9fr_1.1fr]", children: [
      /* @__PURE__ */ jsxs14("section", { className: "glass-panel rounded-3xl p-6", children: [
        /* @__PURE__ */ jsxs14("div", { className: "flex items-center gap-3 text-white", children: [
          /* @__PURE__ */ jsx18(AlertTriangle3, { className: "h-5 w-5 text-orange-300" }),
          /* @__PURE__ */ jsx18("h2", { className: "text-xl font-semibold", children: "Risk Distribution" })
        ] }),
        /* @__PURE__ */ jsx18("div", { className: "mt-6 space-y-4", children: summary.riskDistribution.map((bucket) => /* @__PURE__ */ jsxs14("div", { children: [
          /* @__PURE__ */ jsxs14("div", { className: "mb-2 flex items-center justify-between text-sm", children: [
            /* @__PURE__ */ jsx18("span", { className: "text-slate-200", children: bucket.label }),
            /* @__PURE__ */ jsx18("span", { className: "text-slate-400", children: bucket.count })
          ] }),
          /* @__PURE__ */ jsx18("div", { className: "h-3 overflow-hidden rounded-full bg-slate-800", children: /* @__PURE__ */ jsx18(
            "div",
            {
              className: "h-full rounded-full",
              style: {
                width: `${bucket.count / maxRiskBucket * 100}%`,
                backgroundColor: getRiskColor(bucket.key)
              }
            }
          ) })
        ] }, bucket.key)) }),
        /* @__PURE__ */ jsxs14("div", { className: "mt-8", children: [
          /* @__PURE__ */ jsxs14("div", { className: "flex items-center gap-3 text-white", children: [
            /* @__PURE__ */ jsx18(GitBranch3, { className: "h-5 w-5 text-blue-300" }),
            /* @__PURE__ */ jsx18("h3", { className: "text-lg font-semibold", children: "Component Types" })
          ] }),
          /* @__PURE__ */ jsx18("div", { className: "mt-4 space-y-4", children: summary.typeDistribution.map((entry) => /* @__PURE__ */ jsxs14("div", { children: [
            /* @__PURE__ */ jsxs14("div", { className: "mb-2 flex items-center justify-between text-sm", children: [
              /* @__PURE__ */ jsx18("span", { className: "text-slate-200", children: formatLabel(entry.type) }),
              /* @__PURE__ */ jsx18("span", { className: "text-slate-400", children: entry.count })
            ] }),
            /* @__PURE__ */ jsx18("div", { className: "h-3 overflow-hidden rounded-full bg-slate-800", children: /* @__PURE__ */ jsx18(
              "div",
              {
                className: "h-full rounded-full",
                style: {
                  width: `${entry.count / maxTypeCount * 100}%`,
                  backgroundColor: getTypeColor(entry.type)
                }
              }
            ) })
          ] }, entry.type)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs14("section", { className: "glass-panel rounded-3xl p-6", children: [
        /* @__PURE__ */ jsxs14("div", { className: "flex items-center gap-3 text-white", children: [
          /* @__PURE__ */ jsx18(Target, { className: "h-5 w-5 text-red-300" }),
          /* @__PURE__ */ jsx18("h2", { className: "text-xl font-semibold", children: "Top Risk Components" })
        ] }),
        /* @__PURE__ */ jsx18("div", { className: "mt-6 space-y-4", children: summary.topRiskNodes.map((node, index) => /* @__PURE__ */ jsxs14("div", { className: "rounded-3xl border border-slate-800 bg-slate-950/70 p-4", children: [
          /* @__PURE__ */ jsxs14("div", { className: "flex items-start justify-between gap-4", children: [
            /* @__PURE__ */ jsxs14("div", { children: [
              /* @__PURE__ */ jsxs14("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxs14("span", { className: "text-xs text-slate-500", children: [
                  "#",
                  index + 1
                ] }),
                /* @__PURE__ */ jsx18("h3", { className: "font-semibold text-white", children: node.name })
              ] }),
              /* @__PURE__ */ jsx18("p", { className: "mt-2 text-sm leading-6 text-slate-300", children: node.description || "No description available." }),
              /* @__PURE__ */ jsxs14("div", { className: "mt-3 flex flex-wrap gap-2 text-xs text-slate-400", children: [
                /* @__PURE__ */ jsxs14("span", { children: [
                  "Type: ",
                  formatLabel(node.type)
                ] }),
                /* @__PURE__ */ jsxs14("span", { children: [
                  "Dependencies: ",
                  node.dependencies.length
                ] }),
                /* @__PURE__ */ jsxs14("span", { children: [
                  "Blast Radius: ",
                  node.blastRadius
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx18(
              "div",
              {
                className: "rounded-2xl px-3 py-2 text-sm font-semibold text-white",
                style: { backgroundColor: getRiskColor(node.riskLevel) },
                children: node.riskScore
              }
            )
          ] }),
          /* @__PURE__ */ jsx18("div", { className: "mt-4 h-2 overflow-hidden rounded-full bg-slate-800", children: /* @__PURE__ */ jsx18(
            "div",
            {
              className: "h-full rounded-full",
              style: {
                width: `${node.riskScore}%`,
                backgroundColor: getRiskColor(node.riskLevel)
              }
            }
          ) })
        ] }, node.id)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs14("section", { className: "glass-panel rounded-3xl p-6", children: [
      /* @__PURE__ */ jsxs14("div", { className: "flex items-center gap-3 text-white", children: [
        /* @__PURE__ */ jsx18(AlertTriangle3, { className: "h-5 w-5 text-purple-300" }),
        /* @__PURE__ */ jsx18("h2", { className: "text-xl font-semibold", children: "Blast Radius Leaders" })
      ] }),
      /* @__PURE__ */ jsx18("div", { className: "mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3", children: summary.blastRadiusLeaders.map(({ node, count }) => /* @__PURE__ */ jsxs14("div", { className: "rounded-3xl border border-slate-800 bg-slate-950/70 p-4", children: [
        /* @__PURE__ */ jsx18("h3", { className: "font-semibold text-white", children: node.name }),
        /* @__PURE__ */ jsx18("p", { className: "mt-1 text-sm text-slate-400", children: formatLabel(node.type) }),
        /* @__PURE__ */ jsxs14("div", { className: "mt-4 flex items-end justify-between", children: [
          /* @__PURE__ */ jsx18("span", { className: "text-sm text-slate-400", children: "Potentially impacted components" }),
          /* @__PURE__ */ jsx18("span", { className: "text-3xl font-semibold text-orange-300", children: count })
        ] })
      ] }, node.id)) })
    ] })
  ] }) });
}
var init_RiskAnalysis = __esm({
  "src/components/RiskAnalysis.tsx"() {
    "use strict";
    init_selectors();
  }
});

// src/pages/UploadedDocumentWorkspace.tsx
import { lazy as lazy2, Suspense as Suspense2, useState as useState7 } from "react";
import { BarChart3 as BarChart32, FileJson as FileJson3, FileText as FileText5, List as List2, Loader2 as Loader24, Network as Network7 } from "lucide-react";
import { useNavigate as useNavigate6 } from "react-router-dom";
import { jsx as jsx19, jsxs as jsxs15 } from "react/jsx-runtime";
function UploadedDocumentWorkspace() {
  const navigate = useNavigate6();
  const { uploadedGraph } = useAppContext();
  const [currentView, setCurrentView] = useState7("graph");
  const [selectedNodeId, setSelectedNodeId] = useState7(null);
  const graphData = uploadedGraph.documentData;
  if (uploadedGraph.status === "loading" && !graphData) {
    return /* @__PURE__ */ jsx19("div", { className: "flex min-h-screen items-center justify-center bg-[#0F172A]", children: /* @__PURE__ */ jsxs15("div", { className: "flex items-center gap-3 text-slate-200", children: [
      /* @__PURE__ */ jsx19(Loader24, { className: "h-5 w-5 animate-spin" }),
      /* @__PURE__ */ jsx19("span", { children: "Loading uploaded document graph..." })
    ] }) });
  }
  if (uploadedGraph.status === "error" && !graphData) {
    return /* @__PURE__ */ jsx19("div", { className: "min-h-screen bg-[#0F172A] px-6 py-16", children: /* @__PURE__ */ jsx19("div", { className: "mx-auto max-w-4xl", children: /* @__PURE__ */ jsx19(
      EmptyState,
      {
        title: "Uploaded Document Graph Loading Failed",
        message: uploadedGraph.error || "The frontend could not load the selected document graph JSON.",
        action: /* @__PURE__ */ jsx19(Button, { onClick: () => navigate("/graphs"), children: "Return to Graph Upload" })
      }
    ) }) });
  }
  if (!graphData) {
    return /* @__PURE__ */ jsx19("div", { className: "min-h-screen bg-[#0F172A] px-6 py-16", children: /* @__PURE__ */ jsx19("div", { className: "mx-auto max-w-4xl", children: /* @__PURE__ */ jsx19(
      EmptyState,
      {
        title: "No Uploaded Document Graph Loaded",
        message: "Upload a document graph artifact JSON to inspect a local document workspace.",
        action: /* @__PURE__ */ jsx19(Button, { onClick: () => navigate("/graphs"), children: "Upload Graph JSON" })
      }
    ) }) });
  }
  if (graphData.nodes.length === 0) {
    return /* @__PURE__ */ jsx19("div", { className: "min-h-screen bg-[#0F172A] px-6 py-16", children: /* @__PURE__ */ jsx19("div", { className: "mx-auto max-w-4xl", children: /* @__PURE__ */ jsx19(
      EmptyState,
      {
        title: "The Uploaded Document Graph Is Empty",
        message: "The selected document graph artifact loaded successfully, but it contains no nodes.",
        action: /* @__PURE__ */ jsx19(Button, { onClick: () => navigate("/graphs"), children: "Upload Another Graph" })
      }
    ) }) });
  }
  return /* @__PURE__ */ jsxs15("div", { className: "flex h-screen overflow-hidden bg-[#0F172A]", children: [
    /* @__PURE__ */ jsxs15("aside", { className: "hidden h-full w-72 shrink-0 border-r border-slate-800 bg-slate-950/95 xl:flex xl:flex-col", children: [
      /* @__PURE__ */ jsxs15("div", { className: "border-b border-slate-800 px-6 py-7", children: [
        /* @__PURE__ */ jsxs15("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx19("div", { className: "rounded-2xl bg-blue-500/15 p-3 text-blue-300", children: /* @__PURE__ */ jsx19(FileText5, { className: "h-7 w-7" }) }),
          /* @__PURE__ */ jsxs15("div", { children: [
            /* @__PURE__ */ jsx19("h1", { className: "text-xl font-bold text-white", children: "TwinGraphOps" }),
            /* @__PURE__ */ jsx19("p", { className: "text-sm text-slate-400", children: "Uploaded document graph workspace" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs15("div", { className: "mt-6 grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs15("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/70 p-3", children: [
            /* @__PURE__ */ jsx19("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Nodes" }),
            /* @__PURE__ */ jsx19("p", { className: "mt-2 text-2xl font-semibold text-white", children: graphData.nodes.length })
          ] }),
          /* @__PURE__ */ jsxs15("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/70 p-3", children: [
            /* @__PURE__ */ jsx19("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Edges" }),
            /* @__PURE__ */ jsx19("p", { className: "mt-2 text-2xl font-semibold text-white", children: graphData.links.length })
          ] })
        ] }),
        /* @__PURE__ */ jsx19("div", { className: "mt-4", children: /* @__PURE__ */ jsxs15(Badge, { className: "border-blue-500/30 bg-blue-500/10 text-blue-100", children: [
          "Active Graph: ",
          uploadedGraph.filename || formatLabel(graphData.source)
        ] }) }),
        /* @__PURE__ */ jsxs15("div", { className: "mt-4 grid grid-cols-3 gap-2", children: [
          /* @__PURE__ */ jsx19(
            "button",
            {
              onClick: () => navigate("/risk"),
              className: "rounded-2xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white",
              children: "Risk"
            }
          ),
          /* @__PURE__ */ jsx19(
            "button",
            {
              onClick: () => navigate("/documents"),
              className: "rounded-2xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white",
              children: "Documents"
            }
          ),
          /* @__PURE__ */ jsx19("button", { className: "rounded-2xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white", children: "Graphs" })
        ] })
      ] }),
      /* @__PURE__ */ jsx19("nav", { className: "flex-1 space-y-2 p-4", children: navItems2.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return /* @__PURE__ */ jsxs15(
          "button",
          {
            onClick: () => setCurrentView(item.id),
            className: `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`,
            children: [
              /* @__PURE__ */ jsx19(Icon, { className: "h-5 w-5" }),
              /* @__PURE__ */ jsx19("span", { children: item.label })
            ]
          },
          item.id
        );
      }) }),
      /* @__PURE__ */ jsx19("div", { className: "border-t border-slate-800 p-4", children: /* @__PURE__ */ jsxs15(
        "button",
        {
          onClick: () => navigate("/graphs"),
          className: "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white",
          children: [
            /* @__PURE__ */ jsx19(FileJson3, { className: "h-5 w-5" }),
            /* @__PURE__ */ jsx19("span", { children: "Upload New Graph" })
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs15("main", { className: "flex min-w-0 flex-1 flex-col overflow-hidden", children: [
      /* @__PURE__ */ jsx19("header", { className: "border-b border-slate-800 bg-slate-950/60 px-6 py-4", children: /* @__PURE__ */ jsxs15("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxs15("div", { children: [
          /* @__PURE__ */ jsx19("h1", { className: "text-2xl font-semibold text-white", children: "Uploaded Document Graph Workspace" }),
          /* @__PURE__ */ jsxs15("p", { className: "mt-1 text-sm text-slate-400", children: [
            graphData.nodes.length,
            " nodes, ",
            graphData.links.length,
            " relationships, ",
            graphData.kindTypes.length,
            " node kinds"
          ] })
        ] }),
        /* @__PURE__ */ jsxs15("div", { className: "flex items-center gap-3", children: [
          uploadedGraph.error ? /* @__PURE__ */ jsx19(StatusBanner, { tone: "error", message: uploadedGraph.error }) : null,
          /* @__PURE__ */ jsx19(Badge, { className: "border-slate-700 bg-slate-900/80 text-slate-200", children: "Auto-detected document artifact" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs15("div", { className: "min-h-0 flex-1 overflow-hidden", children: [
        currentView === "graph" && /* @__PURE__ */ jsx19("div", { className: "h-full p-6", children: /* @__PURE__ */ jsx19(
          Suspense2,
          {
            fallback: /* @__PURE__ */ jsx19("div", { className: "flex h-full items-center justify-center rounded-[24px] border border-slate-700 bg-[#d9d9d9]", children: /* @__PURE__ */ jsxs15("div", { className: "flex items-center gap-3 text-slate-700", children: [
              /* @__PURE__ */ jsx19(Loader24, { className: "h-5 w-5 animate-spin" }),
              /* @__PURE__ */ jsx19("span", { children: "Loading graph view..." })
            ] }) }),
            children: /* @__PURE__ */ jsx19(DocumentGraphView3, { graphData, selectedNodeId, onNodeSelect: setSelectedNodeId })
          }
        ) }),
        currentView === "nodes" && /* @__PURE__ */ jsx19(
          DocumentNodesEdgesView,
          {
            graphData,
            onNodeSelect: (nodeId) => {
              setCurrentView("graph");
              setSelectedNodeId(nodeId);
            }
          }
        ),
        currentView === "overview" && /* @__PURE__ */ jsx19(DocumentOverview, { graphData })
      ] })
    ] })
  ] });
}
var DocumentGraphView3, navItems2;
var init_UploadedDocumentWorkspace = __esm({
  "src/pages/UploadedDocumentWorkspace.tsx"() {
    "use strict";
    init_DocumentNodesEdgesView();
    init_DocumentOverview();
    init_EmptyState();
    init_StatusBanner();
    init_Button();
    init_Badge();
    init_selectors();
    init_AppContext();
    DocumentGraphView3 = lazy2(() => Promise.resolve().then(() => (init_DocumentGraphView(), DocumentGraphView_exports)));
    navItems2 = [
      { id: "graph", label: "Graph View", icon: Network7 },
      { id: "nodes", label: "Nodes & Edges", icon: List2 },
      { id: "overview", label: "Document Overview", icon: BarChart32 }
    ];
  }
});

// src/components/GraphView.tsx
var GraphView_exports = {};
__export(GraphView_exports, {
  default: () => GraphView
});
import { useCallback as useCallback3, useEffect as useEffect6, useMemo as useMemo6, useRef as useRef6, useState as useState8 } from "react";
import ForceGraph2D2 from "react-force-graph-2d";
import { AlertTriangle as AlertTriangle4, Info as Info2, Link2, Maximize2 as Maximize22, Network as Network8, RefreshCcw as RefreshCcw3 } from "lucide-react";
import { jsx as jsx20, jsxs as jsxs16 } from "react/jsx-runtime";
function GraphView({
  graphData,
  selectedNodeId,
  selectedNodeDetails,
  detailsStatus,
  detailsError,
  onNodeSelect,
  onRetryDetails
}) {
  const graphRef = useRef6(null);
  const containerRef = useRef6(null);
  const [dimensions, setDimensions] = useState8({ width: 1e3, height: 560 });
  const fitGraphToViewport = useCallback3(() => {
    if (!graphRef.current || dimensions.width <= 0 || dimensions.height <= 0) {
      return;
    }
    const padding = Math.max(80, Math.min(dimensions.width, dimensions.height) * 0.12);
    graphRef.current.zoomToFit(600, padding);
  }, [dimensions.height, dimensions.width]);
  useEffect6(() => {
    const updateDimensions = () => {
      if (!containerRef.current) {
        return;
      }
      setDimensions({
        width: containerRef.current.clientWidth,
        height: Math.max(360, containerRef.current.clientHeight)
      });
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener("resize", updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);
  useEffect6(() => {
    if (!graphRef.current || graphData.nodes.length === 0) {
      return;
    }
    graphRef.current.d3Force("charge")?.strength(-520);
    graphRef.current.d3Force("link")?.distance(() => 160);
    graphRef.current.d3Force("center")?.strength(0.08);
    const timeout = window.setTimeout(() => {
      fitGraphToViewport();
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [fitGraphToViewport, graphData.links.length, graphData.nodes.length]);
  useEffect6(() => {
    if (!graphRef.current || graphData.nodes.length === 0) {
      return;
    }
    const timeout = window.setTimeout(() => {
      fitGraphToViewport();
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [dimensions.height, dimensions.width, fitGraphToViewport, graphData.nodes.length]);
  const highlightedLinks = useMemo6(() => {
    if (!selectedNodeId) {
      return /* @__PURE__ */ new Set();
    }
    return new Set(
      graphData.links.filter((link) => getLinkEndpointId(link.source) === selectedNodeId || getLinkEndpointId(link.target) === selectedNodeId).map((link) => link.id)
    );
  }, [graphData.links, selectedNodeId]);
  const connectedNodes = useMemo6(() => {
    if (!selectedNodeId) {
      return /* @__PURE__ */ new Set();
    }
    const connected = /* @__PURE__ */ new Set([selectedNodeId]);
    for (const link of graphData.links) {
      if (getLinkEndpointId(link.source) === selectedNodeId) {
        connected.add(getLinkEndpointId(link.target));
      }
      if (getLinkEndpointId(link.target) === selectedNodeId) {
        connected.add(getLinkEndpointId(link.source));
      }
    }
    return connected;
  }, [graphData.links, selectedNodeId]);
  const forceGraphData = useMemo6(
    () => ({
      nodes: graphData.nodes.map((node) => ({ ...node })),
      links: graphData.links.map((link) => ({
        ...link,
        source: getLinkEndpointId(link.source),
        target: getLinkEndpointId(link.target)
      }))
    }),
    [graphData.links, graphData.nodes]
  );
  const fallbackNode = selectedNodeId ? graphData.nodeIndex[selectedNodeId] ?? null : null;
  const detailTitle = selectedNodeDetails?.name || fallbackNode?.name || "Select a node";
  const detailType = selectedNodeDetails?.type || fallbackNode?.type || null;
  const detailRiskScore = selectedNodeDetails?.riskScore ?? fallbackNode?.riskScore ?? null;
  const detailRiskLevel = selectedNodeDetails?.riskLevel || fallbackNode?.riskLevel || null;
  const detailDescription = selectedNodeDetails?.description || fallbackNode?.description || "Select a node to inspect its operational context.";
  return /* @__PURE__ */ jsxs16("div", { className: "grid h-full min-h-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]", children: [
    /* @__PURE__ */ jsxs16("section", { className: "glass-panel flex min-h-0 min-w-0 flex-col rounded-[28px] p-5", children: [
      /* @__PURE__ */ jsxs16("div", { className: "flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/90 pb-4", children: [
        /* @__PURE__ */ jsxs16("div", { children: [
          /* @__PURE__ */ jsxs16("div", { className: "flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-blue-300", children: [
            /* @__PURE__ */ jsx20(Network8, { className: "h-4 w-4" }),
            "Graph View"
          ] }),
          /* @__PURE__ */ jsx20("h2", { className: "mt-2 text-2xl font-semibold text-white", children: "Topology + Risk Overlay" }),
          /* @__PURE__ */ jsx20("p", { className: "mt-1 text-sm text-slate-400", children: "Node size tracks backend risk score. Node color tracks backend risk level and links render as directed relationships." })
        ] }),
        /* @__PURE__ */ jsxs16("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxs16(Badge, { children: [
            "Nodes ",
            graphData.nodes.length
          ] }),
          /* @__PURE__ */ jsxs16(Badge, { children: [
            "Edges ",
            graphData.links.length
          ] }),
          /* @__PURE__ */ jsxs16(Button, { variant: "secondary", onClick: fitGraphToViewport, children: [
            /* @__PURE__ */ jsx20(Maximize22, { className: "h-4 w-4" }),
            "Fit View"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx20("div", { className: "mt-5 flex flex-wrap gap-3", children: Object.entries({
        low: getRiskColor("low"),
        medium: getRiskColor("medium"),
        high: getRiskColor("high")
      }).map(([label, color]) => /* @__PURE__ */ jsxs16(
        "div",
        {
          className: "flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300",
          children: [
            /* @__PURE__ */ jsx20("span", { className: "h-2.5 w-2.5 rounded-full", style: { backgroundColor: color } }),
            /* @__PURE__ */ jsxs16("span", { children: [
              formatLabel(label),
              " Risk"
            ] })
          ]
        },
        label
      )) }),
      /* @__PURE__ */ jsxs16(
        "div",
        {
          ref: containerRef,
          className: "relative mt-5 min-h-[360px] flex-1 overflow-hidden rounded-[24px] border border-slate-700 bg-[#d9d9d9]",
          children: [
            /* @__PURE__ */ jsx20("div", { className: "absolute right-4 top-4 z-10 rounded-full border border-slate-400 bg-white/90 px-4 py-2 text-xs text-slate-700", children: "Drag to pan, scroll to zoom, click a node for details" }),
            /* @__PURE__ */ jsx20(
              ForceGraph2D2,
              {
                ref: graphRef,
                graphData: forceGraphData,
                width: dimensions.width,
                height: dimensions.height,
                backgroundColor: "rgba(0,0,0,0)",
                cooldownTicks: 160,
                d3VelocityDecay: 0.18,
                linkCurvature: 0.08,
                linkWidth: (link) => highlightedLinks.has(link.id) ? 2.2 : 0.9,
                linkColor: (link) => highlightedLinks.has(link.id) ? "#2563eb" : "rgba(15, 23, 42, 0.55)",
                linkDirectionalArrowLength: (link) => highlightedLinks.has(link.id) ? 7 : 5,
                linkDirectionalArrowRelPos: 1,
                linkDirectionalArrowColor: (link) => highlightedLinks.has(link.id) ? "#2563eb" : "rgba(15, 23, 42, 0.75)",
                nodeRelSize: 1,
                nodeLabel: (node) => `${node.name} (${node.riskScore})`,
                nodeCanvasObjectMode: () => "replace",
                onNodeClick: (node) => {
                  onNodeSelect(node.id);
                  graphRef.current?.centerAt(node.x, node.y, 500);
                  graphRef.current?.zoom(2, 500);
                },
                nodePointerAreaPaint: (node, color, context) => {
                  context.fillStyle = color;
                  context.beginPath();
                  context.arc(node.x, node.y, Math.max(node.val + 8, 22), 0, 2 * Math.PI);
                  context.fill();
                },
                nodeCanvasObject: (node, context, globalScale) => {
                  const radius = node.val;
                  const isSelected = node.id === selectedNodeId;
                  const isConnected = connectedNodes.has(node.id);
                  const fontSize = Math.max(10 / globalScale, 4);
                  const shouldDrawLabel = isSelected || isConnected || globalScale >= 1.35;
                  context.save();
                  context.beginPath();
                  context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
                  context.fillStyle = getRiskColor(node.riskLevel);
                  context.shadowBlur = isSelected ? 18 : isConnected ? 10 : 0;
                  context.shadowColor = getRiskColor(node.riskLevel);
                  context.fill();
                  context.beginPath();
                  context.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
                  context.lineWidth = isSelected ? 4 / globalScale : 2 / globalScale;
                  context.strokeStyle = isSelected ? "#111827" : "rgba(15, 23, 42, 0.35)";
                  context.stroke();
                  context.shadowBlur = 0;
                  if (shouldDrawLabel) {
                    context.font = `${fontSize}px Inter`;
                    context.fillStyle = "#111827";
                    context.textAlign = "center";
                    context.textBaseline = "top";
                    context.fillText(node.name, node.x, node.y + radius + 6);
                  }
                  context.restore();
                }
              }
            )
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs16("aside", { className: "glass-panel scrollbar-thin flex min-h-0 flex-col overflow-y-auto rounded-[28px] p-5", children: [
      /* @__PURE__ */ jsxs16("div", { className: "flex items-start justify-between gap-3 border-b border-slate-800/90 pb-4", children: [
        /* @__PURE__ */ jsxs16("div", { children: [
          /* @__PURE__ */ jsx20("p", { className: "text-sm uppercase tracking-[0.18em] text-blue-300", children: "Selected Component" }),
          /* @__PURE__ */ jsx20("h3", { className: "mt-2 text-2xl font-semibold text-white", children: detailTitle }),
          /* @__PURE__ */ jsxs16("div", { className: "mt-3 flex flex-wrap gap-2", children: [
            detailType ? /* @__PURE__ */ jsx20(Badge, { children: formatLabel(detailType) }) : null,
            detailRiskLevel && detailRiskScore !== null ? /* @__PURE__ */ jsxs16(
              Badge,
              {
                className: "border-transparent text-white",
                style: { backgroundColor: getRiskColor(detailRiskLevel) },
                children: [
                  formatLabel(detailRiskLevel),
                  " Risk \xB7 ",
                  detailRiskScore
                ]
              }
            ) : null
          ] })
        ] }),
        selectedNodeId ? /* @__PURE__ */ jsx20(
          "button",
          {
            onClick: () => onNodeSelect(null),
            className: "rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-slate-500 hover:text-white",
            children: /* @__PURE__ */ jsx20(RefreshCcw3, { className: "h-4 w-4" })
          }
        ) : null
      ] }),
      /* @__PURE__ */ jsxs16("div", { className: "mt-5 space-y-4", children: [
        /* @__PURE__ */ jsxs16("section", { className: "rounded-2xl border border-slate-800 bg-slate-950/55 p-4", children: [
          /* @__PURE__ */ jsx20("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Description" }),
          /* @__PURE__ */ jsx20("p", { className: "mt-3 text-sm leading-7 text-slate-200", children: detailDescription || "No description available." })
        ] }),
        /* @__PURE__ */ jsxs16("section", { className: "rounded-2xl border border-slate-800 bg-slate-950/55 p-4", children: [
          /* @__PURE__ */ jsxs16("div", { className: "flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500", children: [
            /* @__PURE__ */ jsx20(AlertTriangle4, { className: "h-4 w-4" }),
            "Risk Summary"
          ] }),
          detailsStatus === "loading" && selectedNodeId ? /* @__PURE__ */ jsx20("p", { className: "mt-3 text-sm text-slate-300", children: "Loading live risk and impact data..." }) : /* @__PURE__ */ jsxs16("div", { className: "mt-3 space-y-3", children: [
            /* @__PURE__ */ jsx20("div", { className: "h-2 overflow-hidden rounded-full bg-slate-800", children: /* @__PURE__ */ jsx20(
              "div",
              {
                className: "h-full rounded-full",
                style: {
                  width: `${detailRiskScore ?? 0}%`,
                  backgroundColor: detailRiskLevel ? getRiskColor(detailRiskLevel) : "#334155"
                }
              }
            ) }),
            /* @__PURE__ */ jsx20("p", { className: "text-sm leading-7 text-slate-200", children: selectedNodeDetails?.explanation || fallbackNode?.riskExplanation || "No risk explanation available." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs16("section", { className: "rounded-2xl border border-slate-800 bg-slate-950/55 p-4", children: [
          /* @__PURE__ */ jsxs16("div", { className: "flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500", children: [
            /* @__PURE__ */ jsx20(Link2, { className: "h-4 w-4" }),
            "Dependencies"
          ] }),
          /* @__PURE__ */ jsx20("div", { className: "mt-3 space-y-2", children: (selectedNodeDetails?.dependencies ?? []).length === 0 ? /* @__PURE__ */ jsx20("p", { className: "text-sm text-slate-400", children: "No direct dependencies returned for this component." }) : selectedNodeDetails?.dependencies.map((dependency) => /* @__PURE__ */ jsxs16(
            "button",
            {
              onClick: () => onNodeSelect(dependency.id),
              className: "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-slate-600",
              children: [
                /* @__PURE__ */ jsx20("span", { children: dependency.name }),
                /* @__PURE__ */ jsx20("span", { className: "text-xs text-slate-500", children: dependency.id })
              ]
            },
            dependency.id
          )) })
        ] }),
        /* @__PURE__ */ jsxs16("section", { className: "rounded-2xl border border-slate-800 bg-slate-950/55 p-4", children: [
          /* @__PURE__ */ jsxs16("div", { className: "flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500", children: [
            /* @__PURE__ */ jsx20(Info2, { className: "h-4 w-4" }),
            "Affected Systems"
          ] }),
          /* @__PURE__ */ jsx20("div", { className: "mt-3 space-y-2", children: (selectedNodeDetails?.affectedSystems ?? []).length === 0 ? /* @__PURE__ */ jsx20("p", { className: "text-sm text-slate-400", children: "No downstream impact returned for this component." }) : selectedNodeDetails?.affectedSystems.map((item) => /* @__PURE__ */ jsxs16("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200", children: [
            /* @__PURE__ */ jsx20("div", { className: "font-medium", children: item.name }),
            /* @__PURE__ */ jsxs16("div", { className: "mt-1 text-xs text-slate-500", children: [
              item.id,
              " \xB7 ",
              formatLabel(item.type)
            ] })
          ] }, item.id)) })
        ] }),
        /* @__PURE__ */ jsxs16("section", { className: "rounded-2xl border border-slate-800 bg-slate-950/55 p-4", children: [
          /* @__PURE__ */ jsx20("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Issues / Findings" }),
          /* @__PURE__ */ jsx20("div", { className: "mt-3 space-y-2", children: (selectedNodeDetails?.issues ?? []).length === 0 ? /* @__PURE__ */ jsx20("p", { className: "text-sm text-slate-400", children: "No backend findings were provided for this selection." }) : selectedNodeDetails?.issues.map((issue) => /* @__PURE__ */ jsx20(
            "div",
            {
              className: "rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm leading-6 text-slate-200",
              children: issue
            },
            issue
          )) })
        ] }),
        /* @__PURE__ */ jsxs16("section", { className: "rounded-2xl border border-slate-800 bg-slate-950/55 p-4", children: [
          /* @__PURE__ */ jsx20("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Backend Metadata" }),
          detailsStatus === "error" && detailsError ? /* @__PURE__ */ jsxs16("div", { className: "mt-3 space-y-3", children: [
            /* @__PURE__ */ jsx20("p", { className: "text-sm text-red-300", children: detailsError }),
            /* @__PURE__ */ jsx20(Button, { variant: "secondary", onClick: onRetryDetails, children: "Retry Detail Load" })
          ] }) : /* @__PURE__ */ jsx20("div", { className: "mt-3 grid grid-cols-2 gap-3", children: (selectedNodeDetails?.metadata ?? []).map((item) => /* @__PURE__ */ jsxs16("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/70 p-3", children: [
            /* @__PURE__ */ jsx20("p", { className: "text-[11px] uppercase tracking-[0.16em] text-slate-500", children: item.label }),
            /* @__PURE__ */ jsx20("p", { className: "mt-2 text-sm font-medium text-white", children: item.value })
          ] }, item.label)) })
        ] })
      ] })
    ] })
  ] });
}
var init_GraphView = __esm({
  "src/components/GraphView.tsx"() {
    "use strict";
    init_Badge();
    init_Button();
    init_selectors();
  }
});

// src/pages/UploadedGraphWorkspace.tsx
var UploadedGraphWorkspace_exports = {};
__export(UploadedGraphWorkspace_exports, {
  default: () => UploadedGraphWorkspace
});
import { lazy as lazy3, Suspense as Suspense3, useMemo as useMemo7, useState as useState9 } from "react";
import { BarChart3 as BarChart33, FileJson as FileJson4, List as List3, Loader2 as Loader25, Network as Network9, Shield as Shield5 } from "lucide-react";
import { useNavigate as useNavigate7 } from "react-router-dom";
import { jsx as jsx21, jsxs as jsxs17 } from "react/jsx-runtime";
function formatMetric(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}
function buildLocalNodeDetails(graphData, nodeId) {
  const node = graphData.nodeIndex[nodeId];
  if (!node) {
    return null;
  }
  const dependencies = node.dependencies.map((dependencyId) => graphData.nodeIndex[dependencyId]).filter((candidate) => Boolean(candidate)).map((dependency) => ({ id: dependency.id, name: dependency.name, type: dependency.type }));
  const affectedSystems = node.dependents.map((dependentId) => graphData.nodeIndex[dependentId]).filter((candidate) => Boolean(candidate)).map((dependent) => ({ id: dependent.id, name: dependent.name, type: dependent.type }));
  const issues = graphData.links.filter((link) => link.source === nodeId || link.target === nodeId).map((link) => link.rationale).filter((rationale, index, collection) => rationale.trim().length > 0 && collection.indexOf(rationale) === index);
  return {
    componentId: node.id,
    name: node.name,
    type: node.type,
    riskScore: node.riskScore,
    riskLevel: node.riskLevel,
    description: node.description,
    dependencies,
    affectedSystems,
    issues,
    explanation: node.riskExplanation,
    impactCount: node.dependents.length,
    metadata: [
      { label: "Degree", value: formatMetric(node.degree) },
      { label: "Betweenness", value: formatMetric(node.betweenness) },
      { label: "Closeness", value: formatMetric(node.closeness) },
      { label: "Blast Radius", value: String(node.blastRadius) },
      { label: "Dependency Span", value: String(node.dependencySpan) },
      { label: "Source", value: node.source }
    ]
  };
}
function UploadedGraphWorkspace() {
  const navigate = useNavigate7();
  const { uploadedGraph } = useAppContext();
  const [currentView, setCurrentView] = useState9("graph");
  const [selectedNodeId, setSelectedNodeId] = useState9(null);
  if (uploadedGraph.kind === "document") {
    return /* @__PURE__ */ jsx21(UploadedDocumentWorkspace, {});
  }
  const graphData = uploadedGraph.operationalData;
  const selectedNodeDetails = useMemo7(
    () => graphData && selectedNodeId ? buildLocalNodeDetails(graphData, selectedNodeId) : null,
    [graphData, selectedNodeId]
  );
  const graphSummary = useMemo7(() => graphData ? buildGraphSummary(graphData) : null, [graphData]);
  if (uploadedGraph.status === "loading" && !graphData) {
    return /* @__PURE__ */ jsx21("div", { className: "flex min-h-screen items-center justify-center bg-[#0F172A]", children: /* @__PURE__ */ jsxs17("div", { className: "flex items-center gap-3 text-slate-200", children: [
      /* @__PURE__ */ jsx21(Loader25, { className: "h-5 w-5 animate-spin" }),
      /* @__PURE__ */ jsx21("span", { children: "Loading uploaded graph..." })
    ] }) });
  }
  if (uploadedGraph.status === "error" && !graphData) {
    return /* @__PURE__ */ jsx21("div", { className: "min-h-screen bg-[#0F172A] px-6 py-16", children: /* @__PURE__ */ jsx21("div", { className: "mx-auto max-w-4xl", children: /* @__PURE__ */ jsx21(
      EmptyState,
      {
        title: "Uploaded Graph Loading Failed",
        message: uploadedGraph.error || "The frontend could not load the selected operational graph JSON.",
        action: /* @__PURE__ */ jsx21("div", { className: "flex flex-wrap justify-center gap-3", children: /* @__PURE__ */ jsx21(Button, { onClick: () => navigate("/graphs"), children: "Return to Graph Upload" }) })
      }
    ) }) });
  }
  if (!graphData) {
    return /* @__PURE__ */ jsx21("div", { className: "min-h-screen bg-[#0F172A] px-6 py-16", children: /* @__PURE__ */ jsx21("div", { className: "mx-auto max-w-4xl", children: /* @__PURE__ */ jsx21(
      EmptyState,
      {
        title: "No Uploaded Graph Loaded",
        message: "Upload an operational or document graph artifact JSON to inspect a local graph workspace.",
        action: /* @__PURE__ */ jsx21(Button, { onClick: () => navigate("/graphs"), children: "Upload Graph JSON" })
      }
    ) }) });
  }
  if (graphData.nodes.length === 0) {
    return /* @__PURE__ */ jsx21("div", { className: "min-h-screen bg-[#0F172A] px-6 py-16", children: /* @__PURE__ */ jsx21("div", { className: "mx-auto max-w-4xl", children: /* @__PURE__ */ jsx21(
      EmptyState,
      {
        title: "The Uploaded Graph Is Empty",
        message: "The selected operational graph artifact loaded successfully, but it contains no nodes.",
        action: /* @__PURE__ */ jsx21(Button, { onClick: () => navigate("/graphs"), children: "Upload Another Graph" })
      }
    ) }) });
  }
  return /* @__PURE__ */ jsxs17("div", { className: "flex h-screen overflow-hidden bg-[#0F172A]", children: [
    /* @__PURE__ */ jsxs17("aside", { className: "hidden h-full w-72 shrink-0 border-r border-slate-800 bg-slate-950/95 xl:flex xl:flex-col", children: [
      /* @__PURE__ */ jsxs17("div", { className: "border-b border-slate-800 px-6 py-7", children: [
        /* @__PURE__ */ jsxs17("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx21("div", { className: "rounded-2xl bg-blue-500/15 p-3 text-blue-300", children: /* @__PURE__ */ jsx21(FileJson4, { className: "h-7 w-7" }) }),
          /* @__PURE__ */ jsxs17("div", { children: [
            /* @__PURE__ */ jsx21("h1", { className: "text-xl font-bold text-white", children: "TwinGraphOps" }),
            /* @__PURE__ */ jsx21("p", { className: "text-sm text-slate-400", children: "Uploaded graph workspace" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs17("div", { className: "mt-6 grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs17("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/70 p-3", children: [
            /* @__PURE__ */ jsx21("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Nodes" }),
            /* @__PURE__ */ jsx21("p", { className: "mt-2 text-2xl font-semibold text-white", children: graphData.nodes.length })
          ] }),
          /* @__PURE__ */ jsxs17("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/70 p-3", children: [
            /* @__PURE__ */ jsx21("p", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: "Edges" }),
            /* @__PURE__ */ jsx21("p", { className: "mt-2 text-2xl font-semibold text-white", children: graphData.links.length })
          ] })
        ] }),
        /* @__PURE__ */ jsx21("div", { className: "mt-4", children: /* @__PURE__ */ jsxs17(Badge, { className: "border-blue-500/30 bg-blue-500/10 text-blue-100", children: [
          "Active Graph: ",
          uploadedGraph.filename || formatLabel(graphData.source)
        ] }) }),
        /* @__PURE__ */ jsxs17("div", { className: "mt-4 grid grid-cols-3 gap-2", children: [
          /* @__PURE__ */ jsx21(
            "button",
            {
              onClick: () => navigate("/risk"),
              className: "rounded-2xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white",
              children: "Risk"
            }
          ),
          /* @__PURE__ */ jsx21(
            "button",
            {
              onClick: () => navigate("/documents"),
              className: "rounded-2xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white",
              children: "Documents"
            }
          ),
          /* @__PURE__ */ jsx21("button", { className: "rounded-2xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white", children: "Graphs" })
        ] })
      ] }),
      /* @__PURE__ */ jsx21("nav", { className: "flex-1 space-y-2 p-4", children: navItems3.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return /* @__PURE__ */ jsxs17(
          "button",
          {
            onClick: () => setCurrentView(item.id),
            className: `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`,
            children: [
              /* @__PURE__ */ jsx21(Icon, { className: "h-5 w-5" }),
              /* @__PURE__ */ jsx21("span", { children: item.label })
            ]
          },
          item.id
        );
      }) }),
      /* @__PURE__ */ jsx21("div", { className: "border-t border-slate-800 p-4", children: /* @__PURE__ */ jsxs17(
        "button",
        {
          onClick: () => navigate("/graphs"),
          className: "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white",
          children: [
            /* @__PURE__ */ jsx21(FileJson4, { className: "h-5 w-5" }),
            /* @__PURE__ */ jsx21("span", { children: "Upload New Graph" })
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs17("main", { className: "flex min-w-0 flex-1 flex-col overflow-hidden", children: [
      /* @__PURE__ */ jsx21("header", { className: "border-b border-slate-800 bg-slate-950/60 px-6 py-4", children: /* @__PURE__ */ jsxs17("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxs17("div", { children: [
          /* @__PURE__ */ jsx21("h1", { className: "text-2xl font-semibold text-white", children: "Uploaded Graph Workspace" }),
          /* @__PURE__ */ jsxs17("p", { className: "mt-1 text-sm text-slate-400", children: [
            graphSummary?.totalComponents ?? 0,
            " components, ",
            graphSummary?.totalRelationships ?? 0,
            " relationships, average risk ",
            graphSummary?.avgRisk ?? 0
          ] })
        ] }),
        /* @__PURE__ */ jsxs17("div", { className: "flex items-center gap-3", children: [
          uploadedGraph.error ? /* @__PURE__ */ jsx21(StatusBanner, { tone: "error", message: uploadedGraph.error }) : null,
          /* @__PURE__ */ jsx21(Badge, { className: "border-slate-700 bg-slate-900/80 text-slate-200", children: "Auto-detected operational artifact" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs17("div", { className: "min-h-0 flex-1 overflow-hidden", children: [
        currentView === "graph" && /* @__PURE__ */ jsx21("div", { className: "h-full p-6", children: /* @__PURE__ */ jsx21(
          Suspense3,
          {
            fallback: /* @__PURE__ */ jsx21("div", { className: "flex h-full items-center justify-center rounded-[24px] border border-slate-700 bg-[#d9d9d9]", children: /* @__PURE__ */ jsxs17("div", { className: "flex items-center gap-3 text-slate-700", children: [
              /* @__PURE__ */ jsx21(Loader25, { className: "h-5 w-5 animate-spin" }),
              /* @__PURE__ */ jsx21("span", { children: "Loading graph view..." })
            ] }) }),
            children: /* @__PURE__ */ jsx21(
              GraphView2,
              {
                graphData,
                selectedNodeId,
                selectedNodeDetails,
                detailsStatus: "ready",
                detailsError: null,
                onNodeSelect: setSelectedNodeId,
                onRetryDetails: () => void 0
              }
            )
          }
        ) }),
        currentView === "risk" && /* @__PURE__ */ jsx21(RiskAnalysis, { graphData, sourceLabel: "uploaded graph JSON" }),
        currentView === "nodes" && /* @__PURE__ */ jsx21(
          NodesEdgesView,
          {
            graphData,
            onNodeSelect: (nodeId) => {
              setCurrentView("graph");
              setSelectedNodeId(nodeId);
            }
          }
        ),
        currentView === "overview" && /* @__PURE__ */ jsx21(SystemOverview, { graphData, sourceLabel: "uploaded graph JSON" })
      ] })
    ] })
  ] });
}
var GraphView2, navItems3;
var init_UploadedGraphWorkspace = __esm({
  "src/pages/UploadedGraphWorkspace.tsx"() {
    "use strict";
    init_EmptyState();
    init_NodesEdgesView();
    init_RiskAnalysis();
    init_SystemOverview();
    init_StatusBanner();
    init_Button();
    init_Badge();
    init_selectors();
    init_AppContext();
    init_UploadedDocumentWorkspace();
    GraphView2 = lazy3(() => Promise.resolve().then(() => (init_GraphView(), GraphView_exports)));
    navItems3 = [
      { id: "graph", label: "Graph View", icon: Network9 },
      { id: "risk", label: "Risk Analysis", icon: Shield5 },
      { id: "nodes", label: "Nodes & Edges", icon: List3 },
      { id: "overview", label: "System Overview", icon: BarChart33 }
    ];
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
        MAX_UPLOAD_MB: 50,
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
    ingestionId: "doc-123",
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
      lastLoadedAt: null,
      artifacts: null,
      artifactsError: null
    },
    uploadedGraphUpload: {
      phase: "idle",
      selectedFile: null,
      error: null,
      statusMessage: "Upload a merged_graph.json file to inspect a finalized knowledge graph."
    },
    uploadedGraph: {
      status: "idle",
      kind: null,
      operationalData: null,
      documentData: null,
      error: null,
      lastLoadedAt: null,
      filename: null,
      rawData: null
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
    setUploadedGraphDragActive: () => {
    },
    selectUploadedGraphFile: () => true,
    clearSelectedUploadedGraphFile: () => {
    },
    loadUploadedGraphFromSelectedFile: async () => {
    },
    resetUploadState: () => {
    },
    ...overrides
  };
}

// tests/pages.test.tsx
import { jsx as jsx22 } from "react/jsx-runtime";
installRuntimeWindowConfig();
var { AppContext: AppContext2 } = await Promise.resolve().then(() => (init_AppContext(), AppContext_exports));
var { default: LandingPage2 } = await Promise.resolve().then(() => (init_LandingPage(), LandingPage_exports));
var { default: ProcessingPage2 } = await Promise.resolve().then(() => (init_ProcessingPage(), ProcessingPage_exports));
var { default: SystemOverview2 } = await Promise.resolve().then(() => (init_SystemOverview(), SystemOverview_exports));
var { default: DocumentUploadPage2 } = await Promise.resolve().then(() => (init_DocumentUploadPage(), DocumentUploadPage_exports));
var { default: DocumentWorkspace2 } = await Promise.resolve().then(() => (init_DocumentWorkspace(), DocumentWorkspace_exports));
var { default: DocumentOverview2 } = await Promise.resolve().then(() => (init_DocumentOverview(), DocumentOverview_exports));
var { default: UploadedGraphUploadPage2 } = await Promise.resolve().then(() => (init_UploadedGraphUploadPage(), UploadedGraphUploadPage_exports));
var { default: UploadedGraphWorkspace2 } = await Promise.resolve().then(() => (init_UploadedGraphWorkspace(), UploadedGraphWorkspace_exports));
function renderWithContext(element, contextOverrides = {}, initialEntries = ["/"]) {
  return renderToStaticMarkup(
    /* @__PURE__ */ jsx22(MemoryRouter, { initialEntries, children: /* @__PURE__ */ jsx22(AppContext2.Provider, { value: createMockContext(contextOverrides), children: element }) })
  );
}
test("landing page renders the upload workspace content", () => {
  const html = renderWithContext(/* @__PURE__ */ jsx22(LandingPage2, {}));
  assert.match(html, /TwinGraphOps/);
  assert.match(html, /Upload System Documentation/);
  assert.match(html, /Supported formats: \.md and \.txt/);
  assert.match(html, /Document Workspace/);
  assert.match(html, /Graph Workspace/);
});
test("processing page renders the active processing state", () => {
  const html = renderWithContext(
    /* @__PURE__ */ jsx22(ProcessingPage2, {}),
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
  const html = renderToStaticMarkup(/* @__PURE__ */ jsx22(SystemOverview2, { graphData }));
  assert.match(html, /System Overview/);
  assert.match(html, /Total Components/);
  assert.match(html, /Relationships/);
  assert.match(html, /Most Connected Components/);
  assert.match(html, /API Service/);
});
test("document upload page renders pdf markdown and text support", () => {
  const html = renderWithContext(/* @__PURE__ */ jsx22(DocumentUploadPage2, {}), {}, ["/documents"]);
  assert.match(html, /Document Knowledge Graphs/);
  assert.match(html, /Supported formats: \.pdf, \.md, and \.txt/);
  assert.match(html, /Risk Workspace/);
  assert.match(html, /Graph Workspace/);
});
test("uploaded graph upload page renders json-only copy", () => {
  const html = renderWithContext(/* @__PURE__ */ jsx22(UploadedGraphUploadPage2, {}), {}, ["/graphs"]);
  assert.match(html, /Finalized Knowledge Graphs/);
  assert.match(html, /operational or document graph artifact JSON/i);
  assert.match(html, /Open Uploaded Graph/);
});
test("uploaded graph workspace renders loaded graph summary", () => {
  const graphData = createSampleGraphData();
  const html = renderWithContext(
    /* @__PURE__ */ jsx22(UploadedGraphWorkspace2, {}),
    {
      uploadedGraph: {
        ...createMockContext().uploadedGraph,
        status: "ready",
        kind: "operational",
        operationalData: graphData,
        filename: "merged_graph.json"
      }
    },
    ["/graphs/workspace"]
  );
  assert.match(html, /Uploaded Graph Workspace/);
  assert.match(html, /Auto-detected operational artifact/);
  assert.match(html, /merged_graph\.json/i);
});
test("uploaded graph workspace renders empty state when no graph is loaded", () => {
  const html = renderWithContext(/* @__PURE__ */ jsx22(UploadedGraphWorkspace2, {}), {}, ["/graphs/workspace"]);
  assert.match(html, /No Uploaded Graph Loaded/);
  assert.match(html, /Upload Graph JSON/);
});
test("uploaded graph workspace renders document-style viewer for document artifacts", () => {
  const graphData = createSampleDocumentGraphData();
  const html = renderWithContext(
    /* @__PURE__ */ jsx22(UploadedGraphWorkspace2, {}),
    {
      uploadedGraph: {
        ...createMockContext().uploadedGraph,
        status: "ready",
        kind: "document",
        documentData: graphData,
        filename: "merged_document_graph.json"
      }
    },
    ["/graphs/workspace"]
  );
  assert.match(html, /Uploaded Document Graph Workspace/);
  assert.match(html, /Auto-detected document artifact/);
  assert.match(html, /merged_document_graph\.json/i);
});
test("document overview renders the loaded document graph summary", () => {
  const graphData = createSampleDocumentGraphData();
  const html = renderToStaticMarkup(/* @__PURE__ */ jsx22(DocumentOverview2, { graphData }));
  assert.match(html, /Document Overview/);
  assert.match(html, /Document Nodes/);
  assert.match(html, /Evidence Items/);
  assert.match(html, /Retention Policy/);
});
test("document workspace renders source-material downloads when artifacts are available", () => {
  const graphData = createSampleDocumentGraphData();
  const html = renderWithContext(
    /* @__PURE__ */ jsx22(DocumentWorkspace2, {}),
    {
      documentGraph: {
        ...createMockContext().documentGraph,
        status: "ready",
        data: graphData,
        artifacts: {
          ingestion_id: "doc-123",
          bundle: {
            filename: "document_source_materials.zip",
            download_url: "/api/document/artifacts/doc-123/bundle"
          },
          artifacts: [
            {
              id: "final-markdown",
              type: "final-markdown",
              filename: "source_document.md",
              relative_path: "source_document.md",
              size_bytes: 128,
              download_url: "/api/document/artifacts/doc-123/files/final-markdown"
            },
            {
              id: "merged-json",
              type: "merged-json",
              filename: "merged_document_graph.json",
              relative_path: "merged_document_graph.json",
              size_bytes: 256,
              download_url: "/api/document/artifacts/doc-123/files/merged-json"
            }
          ],
          chunk_artifacts: [
            {
              id: "chunk-source_document_part_001",
              type: "chunk-markdown",
              filename: "source_document_part_001.md",
              relative_path: "chunks/source_document_part_001.md",
              size_bytes: 64,
              download_url: "/api/document/artifacts/doc-123/files/chunk-source_document_part_001"
            }
          ]
        },
        artifactsError: null
      }
    },
    ["/documents/workspace"]
  );
  assert.match(html, /Download Source Materials/);
  assert.match(html, /Download Bundle/);
  assert.match(html, /Document Knowledge Graph/);
  assert.match(html, /Evidence \/ Source Detail/);
  assert.match(html, /source_document\.md/);
  assert.match(html, /merged_document_graph\.json/);
  assert.match(html, /source_document_part_001\.md/);
});
test("document workspace shows artifact error without blocking the graph workspace", () => {
  const graphData = createSampleDocumentGraphData();
  const html = renderWithContext(
    /* @__PURE__ */ jsx22(DocumentWorkspace2, {}),
    {
      documentGraph: {
        ...createMockContext().documentGraph,
        status: "ready",
        data: graphData,
        artifacts: null,
        artifactsError: "Source materials are temporarily unavailable."
      }
    },
    ["/documents/workspace"]
  );
  assert.match(html, /Document Graph Workspace/);
  assert.match(html, /Source materials are temporarily unavailable\./);
});
test("document workspace explains when downloads are unavailable", () => {
  const graphData = createSampleDocumentGraphData();
  const html = renderWithContext(
    /* @__PURE__ */ jsx22(DocumentWorkspace2, {}),
    {
      documentGraph: {
        ...createMockContext().documentGraph,
        status: "ready",
        data: graphData,
        artifacts: null,
        artifactsError: null
      }
    },
    ["/documents/workspace"]
  );
  assert.match(html, /Source material downloads are not available for this document yet\./);
});
test("document workspace uses a scrollable page layout instead of a viewport-locked shell", () => {
  const graphData = createSampleDocumentGraphData();
  const html = renderWithContext(
    /* @__PURE__ */ jsx22(DocumentWorkspace2, {}),
    {
      documentGraph: {
        ...createMockContext().documentGraph,
        status: "ready",
        data: graphData,
        artifacts: null,
        artifactsError: null
      }
    },
    ["/documents/workspace"]
  );
  assert.match(html, /min-h-screen bg-\[#0F172A\]/);
  assert.doesNotMatch(html, /h-screen overflow-hidden bg-\[#0F172A\]/);
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2xpYi9hZGFwdGVycy50cyIsICIuLi9zcmMvbGliL2NvbmZpZy50cyIsICIuLi9zcmMvbGliL2FwaS50cyIsICIuLi9zcmMvc3RhdGUvQXBwQ29udGV4dC50c3giLCAiLi4vc3JjL2xpYi9jbi50cyIsICIuLi9zcmMvY29tcG9uZW50cy91aS9CdXR0b24udHN4IiwgIi4uL3NyYy9jb21wb25lbnRzL3VpL0JhZGdlLnRzeCIsICIuLi9zcmMvY29tcG9uZW50cy9TdGF0dXNCYW5uZXIudHN4IiwgIi4uL3NyYy9wYWdlcy9MYW5kaW5nUGFnZS50c3giLCAiLi4vc3JjL2NvbXBvbmVudHMvUHJvY2Vzc2luZ0FjdGl2aXR5UGFuZWwudHN4IiwgIi4uL3NyYy9wYWdlcy9Qcm9jZXNzaW5nUGFnZS50c3giLCAiLi4vc3JjL2xpYi9zZWxlY3RvcnMudHMiLCAiLi4vc3JjL2NvbXBvbmVudHMvU3lzdGVtT3ZlcnZpZXcudHN4IiwgIi4uL3NyYy9wYWdlcy9Eb2N1bWVudFVwbG9hZFBhZ2UudHN4IiwgIi4uL3NyYy9jb21wb25lbnRzL3VpL0lucHV0LnRzeCIsICIuLi9zcmMvY29tcG9uZW50cy9Eb2N1bWVudE5vZGVzRWRnZXNWaWV3LnRzeCIsICIuLi9zcmMvY29tcG9uZW50cy9Eb2N1bWVudE92ZXJ2aWV3LnRzeCIsICIuLi9zcmMvY29tcG9uZW50cy9FbXB0eVN0YXRlLnRzeCIsICIuLi9zcmMvY29tcG9uZW50cy9Eb2N1bWVudEdyYXBoVmlldy50c3giLCAiLi4vc3JjL3BhZ2VzL0RvY3VtZW50V29ya3NwYWNlLnRzeCIsICIuLi9zcmMvcGFnZXMvVXBsb2FkZWRHcmFwaFVwbG9hZFBhZ2UudHN4IiwgIi4uL3NyYy9jb21wb25lbnRzL05vZGVzRWRnZXNWaWV3LnRzeCIsICIuLi9zcmMvY29tcG9uZW50cy9SaXNrQW5hbHlzaXMudHN4IiwgIi4uL3NyYy9wYWdlcy9VcGxvYWRlZERvY3VtZW50V29ya3NwYWNlLnRzeCIsICIuLi9zcmMvY29tcG9uZW50cy9HcmFwaFZpZXcudHN4IiwgIi4uL3NyYy9wYWdlcy9VcGxvYWRlZEdyYXBoV29ya3NwYWNlLnRzeCIsICIuLi90ZXN0cy9wYWdlcy50ZXN0LnRzeCIsICIuLi90ZXN0cy90ZXN0LXV0aWxzLnRzeCJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHR5cGUge1xuICBBcGlEb2N1bWVudEVkZ2UsXG4gIEFwaURvY3VtZW50RXZpZGVuY2UsXG4gIEFwaURvY3VtZW50R3JhcGhEYXRhLFxuICBBcGlEb2N1bWVudE5vZGUsXG4gIEFwaURvY3VtZW50U291cmNlLFxuICBBcGlHcmFwaERhdGEsXG4gIEFwaUdyYXBoRWRnZSxcbiAgQXBpR3JhcGhOb2RlLFxuICBBcGlNZXJnZWRHcmFwaERhdGEsXG4gIEFwaU1lcmdlZEdyYXBoRWRnZSxcbiAgQXBpTWVyZ2VkR3JhcGhOb2RlLFxuICBJbXBhY3RSZXNwb25zZSxcbiAgUmlza1Jlc3BvbnNlLFxufSBmcm9tICcuLi90eXBlcy9hcGknO1xuaW1wb3J0IHR5cGUge1xuICBEb2N1bWVudEVkZ2UsXG4gIERvY3VtZW50RXZpZGVuY2UsXG4gIERvY3VtZW50R3JhcGhEYXRhLFxuICBEb2N1bWVudE5vZGUsXG4gIERvY3VtZW50U291cmNlLFxuICBHcmFwaERhdGEsXG4gIEdyYXBoRWRnZSxcbiAgR3JhcGhOb2RlLFxuICBOb2RlRGV0YWlscyxcbiAgTm9kZVJlZmVyZW5jZSxcbn0gZnJvbSAnLi4vdHlwZXMvYXBwJztcblxuZnVuY3Rpb24gZW5zdXJlU3RyaW5nKHZhbHVlOiB1bmtub3duLCBsYWJlbDogc3RyaW5nKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNYWxmb3JtZWQgQVBJIHJlc3BvbnNlOiBleHBlY3RlZCAke2xhYmVsfSB0byBiZSBhIHN0cmluZy5gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZU51bWJlcih2YWx1ZTogdW5rbm93biwgbGFiZWw6IHN0cmluZykge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnbnVtYmVyJyB8fCBOdW1iZXIuaXNOYU4odmFsdWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNYWxmb3JtZWQgQVBJIHJlc3BvbnNlOiBleHBlY3RlZCAke2xhYmVsfSB0byBiZSBhIG51bWJlci5gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZUFycmF5PFQ+KHZhbHVlOiB1bmtub3duLCBsYWJlbDogc3RyaW5nKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1hbGZvcm1lZCBBUEkgcmVzcG9uc2U6IGV4cGVjdGVkICR7bGFiZWx9IHRvIGJlIGFuIGFycmF5LmApO1xuICB9XG4gIHJldHVybiB2YWx1ZSBhcyBUW107XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZU5vZGUobm9kZTogQXBpR3JhcGhOb2RlLCBkZXBlbmRlbmN5TWFwOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT4sIGRlcGVuZGVudE1hcDogTWFwPHN0cmluZywgc3RyaW5nW10+KTogR3JhcGhOb2RlIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogZW5zdXJlU3RyaW5nKG5vZGUuaWQsICdub2RlLmlkJyksXG4gICAgbmFtZTogZW5zdXJlU3RyaW5nKG5vZGUubmFtZSwgJ25vZGUubmFtZScpLFxuICAgIHR5cGU6IGVuc3VyZVN0cmluZyhub2RlLnR5cGUsICdub2RlLnR5cGUnKSxcbiAgICBkZXNjcmlwdGlvbjogZW5zdXJlU3RyaW5nKG5vZGUuZGVzY3JpcHRpb24sICdub2RlLmRlc2NyaXB0aW9uJyksXG4gICAgcmlza1Njb3JlOiBlbnN1cmVOdW1iZXIobm9kZS5yaXNrX3Njb3JlLCAnbm9kZS5yaXNrX3Njb3JlJyksXG4gICAgcmlza0xldmVsOiBlbnN1cmVTdHJpbmcobm9kZS5yaXNrX2xldmVsLCAnbm9kZS5yaXNrX2xldmVsJyksXG4gICAgZGVncmVlOiBlbnN1cmVOdW1iZXIobm9kZS5kZWdyZWUsICdub2RlLmRlZ3JlZScpLFxuICAgIGJldHdlZW5uZXNzOiBlbnN1cmVOdW1iZXIobm9kZS5iZXR3ZWVubmVzcywgJ25vZGUuYmV0d2Vlbm5lc3MnKSxcbiAgICBjbG9zZW5lc3M6IGVuc3VyZU51bWJlcihub2RlLmNsb3NlbmVzcywgJ25vZGUuY2xvc2VuZXNzJyksXG4gICAgYmxhc3RSYWRpdXM6IGVuc3VyZU51bWJlcihub2RlLmJsYXN0X3JhZGl1cywgJ25vZGUuYmxhc3RfcmFkaXVzJyksXG4gICAgZGVwZW5kZW5jeVNwYW46IGVuc3VyZU51bWJlcihub2RlLmRlcGVuZGVuY3lfc3BhbiwgJ25vZGUuZGVwZW5kZW5jeV9zcGFuJyksXG4gICAgcmlza0V4cGxhbmF0aW9uOiBlbnN1cmVTdHJpbmcobm9kZS5yaXNrX2V4cGxhbmF0aW9uLCAnbm9kZS5yaXNrX2V4cGxhbmF0aW9uJyksXG4gICAgc291cmNlOiBlbnN1cmVTdHJpbmcobm9kZS5zb3VyY2UsICdub2RlLnNvdXJjZScpLFxuICAgIGRlcGVuZGVuY2llczogZGVwZW5kZW5jeU1hcC5nZXQobm9kZS5pZCkgPz8gW10sXG4gICAgZGVwZW5kZW50czogZGVwZW5kZW50TWFwLmdldChub2RlLmlkKSA/PyBbXSxcbiAgICB2YWw6IDE4ICsgTWF0aC5yb3VuZCgobm9kZS5yaXNrX3Njb3JlIC8gMTAwKSAqIDIyKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplRWRnZShlZGdlOiBBcGlHcmFwaEVkZ2UsIGluZGV4OiBudW1iZXIpOiBHcmFwaEVkZ2Uge1xuICByZXR1cm4ge1xuICAgIGlkOiBgJHtlbnN1cmVTdHJpbmcoZWRnZS5zb3VyY2UsICdlZGdlLnNvdXJjZScpfS0ke2Vuc3VyZVN0cmluZyhlZGdlLnRhcmdldCwgJ2VkZ2UudGFyZ2V0Jyl9LSR7aW5kZXh9YCxcbiAgICBzb3VyY2U6IGVkZ2Uuc291cmNlLFxuICAgIHRhcmdldDogZWRnZS50YXJnZXQsXG4gICAgcmVsYXRpb246IGVuc3VyZVN0cmluZyhlZGdlLnJlbGF0aW9uLCAnZWRnZS5yZWxhdGlvbicpLFxuICAgIHJhdGlvbmFsZTogZW5zdXJlU3RyaW5nKGVkZ2UucmF0aW9uYWxlLCAnZWRnZS5yYXRpb25hbGUnKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0R3JhcGgoYXBpR3JhcGg6IEFwaUdyYXBoRGF0YSk6IEdyYXBoRGF0YSB7XG4gIGNvbnN0IHNvdXJjZSA9IGVuc3VyZVN0cmluZyhhcGlHcmFwaC5zb3VyY2UsICdncmFwaC5zb3VyY2UnKTtcbiAgY29uc3QgYXBpTm9kZXMgPSBlbnN1cmVBcnJheTxBcGlHcmFwaE5vZGU+KGFwaUdyYXBoLm5vZGVzLCAnZ3JhcGgubm9kZXMnKTtcbiAgY29uc3QgYXBpRWRnZXMgPSBlbnN1cmVBcnJheTxBcGlHcmFwaEVkZ2U+KGFwaUdyYXBoLmVkZ2VzLCAnZ3JhcGguZWRnZXMnKTtcblxuICBjb25zdCBkZXBlbmRlbmN5TWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xuICBjb25zdCBkZXBlbmRlbnRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XG5cbiAgZm9yIChjb25zdCBlZGdlIG9mIGFwaUVkZ2VzKSB7XG4gICAgY29uc3Qgc291cmNlSWQgPSBlbnN1cmVTdHJpbmcoZWRnZS5zb3VyY2UsICdlZGdlLnNvdXJjZScpO1xuICAgIGNvbnN0IHRhcmdldElkID0gZW5zdXJlU3RyaW5nKGVkZ2UudGFyZ2V0LCAnZWRnZS50YXJnZXQnKTtcbiAgICBkZXBlbmRlbmN5TWFwLnNldChzb3VyY2VJZCwgWy4uLihkZXBlbmRlbmN5TWFwLmdldChzb3VyY2VJZCkgPz8gW10pLCB0YXJnZXRJZF0pO1xuICAgIGRlcGVuZGVudE1hcC5zZXQodGFyZ2V0SWQsIFsuLi4oZGVwZW5kZW50TWFwLmdldCh0YXJnZXRJZCkgPz8gW10pLCBzb3VyY2VJZF0pO1xuICB9XG5cbiAgY29uc3Qgbm9kZXMgPSBhcGlOb2Rlcy5tYXAoKG5vZGUpID0+IG5vcm1hbGl6ZU5vZGUobm9kZSwgZGVwZW5kZW5jeU1hcCwgZGVwZW5kZW50TWFwKSk7XG4gIGNvbnN0IGxpbmtzID0gYXBpRWRnZXMubWFwKChlZGdlLCBpbmRleCkgPT4gbm9ybWFsaXplRWRnZShlZGdlLCBpbmRleCkpO1xuICBjb25zdCBub2RlSW5kZXggPSBPYmplY3QuZnJvbUVudHJpZXMobm9kZXMubWFwKChub2RlKSA9PiBbbm9kZS5pZCwgbm9kZV0pKTtcbiAgY29uc3QgcmVsYXRpb25UeXBlcyA9IFsuLi5uZXcgU2V0KGxpbmtzLm1hcCgoZWRnZSkgPT4gZWRnZS5yZWxhdGlvbikpXS5zb3J0KCk7XG5cbiAgcmV0dXJuIHtcbiAgICBzb3VyY2UsXG4gICAgbm9kZXMsXG4gICAgbGlua3MsXG4gICAgbm9kZUluZGV4LFxuICAgIHJlbGF0aW9uVHlwZXMsXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZU1lcmdlZE5vZGUobm9kZTogQXBpTWVyZ2VkR3JhcGhOb2RlLCBkZXBlbmRlbmN5TWFwOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT4sIGRlcGVuZGVudE1hcDogTWFwPHN0cmluZywgc3RyaW5nW10+KTogR3JhcGhOb2RlIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogZW5zdXJlU3RyaW5nKG5vZGUuaWQsICdtZXJnZWQubm9kZS5pZCcpLFxuICAgIG5hbWU6IGVuc3VyZVN0cmluZyhub2RlLm5hbWUsICdtZXJnZWQubm9kZS5uYW1lJyksXG4gICAgdHlwZTogZW5zdXJlU3RyaW5nKG5vZGUudHlwZSwgJ21lcmdlZC5ub2RlLnR5cGUnKSxcbiAgICBkZXNjcmlwdGlvbjogZW5zdXJlU3RyaW5nKG5vZGUuZGVzY3JpcHRpb24sICdtZXJnZWQubm9kZS5kZXNjcmlwdGlvbicpLFxuICAgIHJpc2tTY29yZTogZW5zdXJlTnVtYmVyKG5vZGUucmlza19zY29yZSwgJ21lcmdlZC5ub2RlLnJpc2tfc2NvcmUnKSxcbiAgICByaXNrTGV2ZWw6IGVuc3VyZVN0cmluZyhub2RlLnJpc2tfbGV2ZWwsICdtZXJnZWQubm9kZS5yaXNrX2xldmVsJyksXG4gICAgZGVncmVlOiBlbnN1cmVOdW1iZXIobm9kZS5kZWdyZWUsICdtZXJnZWQubm9kZS5kZWdyZWUnKSxcbiAgICBiZXR3ZWVubmVzczogZW5zdXJlTnVtYmVyKG5vZGUuYmV0d2Vlbm5lc3MsICdtZXJnZWQubm9kZS5iZXR3ZWVubmVzcycpLFxuICAgIGNsb3NlbmVzczogZW5zdXJlTnVtYmVyKG5vZGUuY2xvc2VuZXNzLCAnbWVyZ2VkLm5vZGUuY2xvc2VuZXNzJyksXG4gICAgYmxhc3RSYWRpdXM6IGVuc3VyZU51bWJlcihub2RlLmJsYXN0X3JhZGl1cywgJ21lcmdlZC5ub2RlLmJsYXN0X3JhZGl1cycpLFxuICAgIGRlcGVuZGVuY3lTcGFuOiBlbnN1cmVOdW1iZXIobm9kZS5kZXBlbmRlbmN5X3NwYW4sICdtZXJnZWQubm9kZS5kZXBlbmRlbmN5X3NwYW4nKSxcbiAgICByaXNrRXhwbGFuYXRpb246IGVuc3VyZVN0cmluZyhub2RlLnJpc2tfZXhwbGFuYXRpb24sICdtZXJnZWQubm9kZS5yaXNrX2V4cGxhbmF0aW9uJyksXG4gICAgc291cmNlOiBlbnN1cmVTdHJpbmcobm9kZS5zb3VyY2UsICdtZXJnZWQubm9kZS5zb3VyY2UnKSxcbiAgICBkZXBlbmRlbmNpZXM6IGRlcGVuZGVuY3lNYXAuZ2V0KG5vZGUuaWQpID8/IFtdLFxuICAgIGRlcGVuZGVudHM6IGRlcGVuZGVudE1hcC5nZXQobm9kZS5pZCkgPz8gW10sXG4gICAgdmFsOiAxOCArIE1hdGgucm91bmQoKG5vZGUucmlza19zY29yZSAvIDEwMCkgKiAyMiksXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZU1lcmdlZEVkZ2UoZWRnZTogQXBpTWVyZ2VkR3JhcGhFZGdlLCBpbmRleDogbnVtYmVyKTogR3JhcGhFZGdlIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogYCR7ZW5zdXJlU3RyaW5nKGVkZ2Uuc291cmNlLCAnbWVyZ2VkLmVkZ2Uuc291cmNlJyl9LSR7ZW5zdXJlU3RyaW5nKGVkZ2UudGFyZ2V0LCAnbWVyZ2VkLmVkZ2UudGFyZ2V0Jyl9LSR7aW5kZXh9YCxcbiAgICBzb3VyY2U6IGVkZ2Uuc291cmNlLFxuICAgIHRhcmdldDogZWRnZS50YXJnZXQsXG4gICAgcmVsYXRpb246IGVuc3VyZVN0cmluZyhlZGdlLnJlbGF0aW9uLCAnbWVyZ2VkLmVkZ2UucmVsYXRpb24nKSxcbiAgICByYXRpb25hbGU6IGVuc3VyZVN0cmluZyhlZGdlLnJhdGlvbmFsZSwgJ21lcmdlZC5lZGdlLnJhdGlvbmFsZScpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRhcHRNZXJnZWRHcmFwaChhcGlHcmFwaDogQXBpTWVyZ2VkR3JhcGhEYXRhLCBzb3VyY2VMYWJlbCA9ICd1cGxvYWRlZCcpOiBHcmFwaERhdGEge1xuICBjb25zdCBhcGlOb2RlcyA9IGVuc3VyZUFycmF5PEFwaU1lcmdlZEdyYXBoTm9kZT4oYXBpR3JhcGgubm9kZXMsICdtZXJnZWQuZ3JhcGgubm9kZXMnKTtcbiAgY29uc3QgYXBpRWRnZXMgPSBlbnN1cmVBcnJheTxBcGlNZXJnZWRHcmFwaEVkZ2U+KGFwaUdyYXBoLmVkZ2VzLCAnbWVyZ2VkLmdyYXBoLmVkZ2VzJyk7XG5cbiAgY29uc3QgZGVwZW5kZW5jeU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcbiAgY29uc3QgZGVwZW5kZW50TWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xuXG4gIGZvciAoY29uc3QgZWRnZSBvZiBhcGlFZGdlcykge1xuICAgIGNvbnN0IHNvdXJjZUlkID0gZW5zdXJlU3RyaW5nKGVkZ2Uuc291cmNlLCAnbWVyZ2VkLmVkZ2Uuc291cmNlJyk7XG4gICAgY29uc3QgdGFyZ2V0SWQgPSBlbnN1cmVTdHJpbmcoZWRnZS50YXJnZXQsICdtZXJnZWQuZWRnZS50YXJnZXQnKTtcbiAgICBkZXBlbmRlbmN5TWFwLnNldChzb3VyY2VJZCwgWy4uLihkZXBlbmRlbmN5TWFwLmdldChzb3VyY2VJZCkgPz8gW10pLCB0YXJnZXRJZF0pO1xuICAgIGRlcGVuZGVudE1hcC5zZXQodGFyZ2V0SWQsIFsuLi4oZGVwZW5kZW50TWFwLmdldCh0YXJnZXRJZCkgPz8gW10pLCBzb3VyY2VJZF0pO1xuICB9XG5cbiAgY29uc3Qgbm9kZXMgPSBhcGlOb2Rlcy5tYXAoKG5vZGUpID0+IG5vcm1hbGl6ZU1lcmdlZE5vZGUobm9kZSwgZGVwZW5kZW5jeU1hcCwgZGVwZW5kZW50TWFwKSk7XG4gIGNvbnN0IGxpbmtzID0gYXBpRWRnZXMubWFwKChlZGdlLCBpbmRleCkgPT4gbm9ybWFsaXplTWVyZ2VkRWRnZShlZGdlLCBpbmRleCkpO1xuICBjb25zdCBub2RlSW5kZXggPSBPYmplY3QuZnJvbUVudHJpZXMobm9kZXMubWFwKChub2RlKSA9PiBbbm9kZS5pZCwgbm9kZV0pKTtcbiAgY29uc3QgcmVsYXRpb25UeXBlcyA9IFsuLi5uZXcgU2V0KGxpbmtzLm1hcCgoZWRnZSkgPT4gZWRnZS5yZWxhdGlvbikpXS5zb3J0KCk7XG5cbiAgcmV0dXJuIHtcbiAgICBzb3VyY2U6IG5vZGVzWzBdPy5zb3VyY2UgfHwgc291cmNlTGFiZWwsXG4gICAgbm9kZXMsXG4gICAgbGlua3MsXG4gICAgbm9kZUluZGV4LFxuICAgIHJlbGF0aW9uVHlwZXMsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHRvTm9kZVJlZmVyZW5jZShub2RlPzogR3JhcGhOb2RlIHwgbnVsbCk6IE5vZGVSZWZlcmVuY2UgfCBudWxsIHtcbiAgaWYgKCFub2RlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGlkOiBub2RlLmlkLFxuICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICB0eXBlOiBub2RlLnR5cGUsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1ldHJpYyh2YWx1ZTogbnVtYmVyKSB7XG4gIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKHZhbHVlKSA/IFN0cmluZyh2YWx1ZSkgOiB2YWx1ZS50b0ZpeGVkKDMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRhcHROb2RlRGV0YWlscyhcbiAgZ3JhcGg6IEdyYXBoRGF0YSxcbiAgY29tcG9uZW50SWQ6IHN0cmluZyxcbiAgcmlzazogUmlza1Jlc3BvbnNlLFxuICBpbXBhY3Q6IEltcGFjdFJlc3BvbnNlXG4pOiBOb2RlRGV0YWlscyB7XG4gIGNvbnN0IG5vZGUgPSBncmFwaC5ub2RlSW5kZXhbY29tcG9uZW50SWRdO1xuICBpZiAoIW5vZGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvbXBvbmVudCAnJHtjb21wb25lbnRJZH0nIGlzIG1pc3NpbmcgZnJvbSB0aGUgYWN0aXZlIGdyYXBoLmApO1xuICB9XG5cbiAgY29uc3QgZGVwZW5kZW5jaWVzID0gbm9kZS5kZXBlbmRlbmNpZXNcbiAgICAubWFwKChkZXBlbmRlbmN5SWQpID0+IHRvTm9kZVJlZmVyZW5jZShncmFwaC5ub2RlSW5kZXhbZGVwZW5kZW5jeUlkXSkpXG4gICAgLmZpbHRlcigoY2FuZGlkYXRlKTogY2FuZGlkYXRlIGlzIE5vZGVSZWZlcmVuY2UgPT4gQm9vbGVhbihjYW5kaWRhdGUpKTtcblxuICBjb25zdCBhZmZlY3RlZFN5c3RlbXMgPSBpbXBhY3QuaW1wYWN0ZWRfY29tcG9uZW50c1xuICAgIC5tYXAoKGFmZmVjdGVkSWQpID0+IHRvTm9kZVJlZmVyZW5jZShncmFwaC5ub2RlSW5kZXhbYWZmZWN0ZWRJZF0pID8/IHsgaWQ6IGFmZmVjdGVkSWQsIG5hbWU6IGFmZmVjdGVkSWQsIHR5cGU6ICd1bmtub3duJyB9KVxuICAgIC5maWx0ZXIoKGNhbmRpZGF0ZSk6IGNhbmRpZGF0ZSBpcyBOb2RlUmVmZXJlbmNlID0+IEJvb2xlYW4oY2FuZGlkYXRlKSk7XG5cbiAgY29uc3QgcmVsYXRlZFJhdGlvbmFsZXMgPSBncmFwaC5saW5rc1xuICAgIC5maWx0ZXIoKGxpbmspID0+IGxpbmsuc291cmNlID09PSBjb21wb25lbnRJZCB8fCBsaW5rLnRhcmdldCA9PT0gY29tcG9uZW50SWQpXG4gICAgLm1hcCgobGluaykgPT4gbGluay5yYXRpb25hbGUpXG4gICAgLmZpbHRlcigocmF0aW9uYWxlKSA9PiByYXRpb25hbGUudHJpbSgpLmxlbmd0aCA+IDApO1xuXG4gIGNvbnN0IGlzc3VlcyA9IFtyaXNrLmV4cGxhbmF0aW9uLCAuLi5yZWxhdGVkUmF0aW9uYWxlc10uZmlsdGVyKFxuICAgICh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pOiB2YWx1ZSBpcyBzdHJpbmcgPT4gdmFsdWUudHJpbSgpLmxlbmd0aCA+IDAgJiYgY29sbGVjdGlvbi5pbmRleE9mKHZhbHVlKSA9PT0gaW5kZXhcbiAgKTtcblxuICByZXR1cm4ge1xuICAgIGNvbXBvbmVudElkOiBub2RlLmlkLFxuICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICB0eXBlOiBub2RlLnR5cGUsXG4gICAgcmlza1Njb3JlOiByaXNrLnNjb3JlLFxuICAgIHJpc2tMZXZlbDogcmlzay5sZXZlbCxcbiAgICBkZXNjcmlwdGlvbjogbm9kZS5kZXNjcmlwdGlvbixcbiAgICBkZXBlbmRlbmNpZXMsXG4gICAgYWZmZWN0ZWRTeXN0ZW1zLFxuICAgIGlzc3VlcyxcbiAgICBleHBsYW5hdGlvbjogcmlzay5leHBsYW5hdGlvbixcbiAgICBpbXBhY3RDb3VudDogaW1wYWN0LmltcGFjdF9jb3VudCxcbiAgICBtZXRhZGF0YTogW1xuICAgICAgeyBsYWJlbDogJ0RlZ3JlZScsIHZhbHVlOiBmb3JtYXRNZXRyaWMobm9kZS5kZWdyZWUpIH0sXG4gICAgICB7IGxhYmVsOiAnQmV0d2Vlbm5lc3MnLCB2YWx1ZTogZm9ybWF0TWV0cmljKG5vZGUuYmV0d2Vlbm5lc3MpIH0sXG4gICAgICB7IGxhYmVsOiAnQ2xvc2VuZXNzJywgdmFsdWU6IGZvcm1hdE1ldHJpYyhub2RlLmNsb3NlbmVzcykgfSxcbiAgICAgIHsgbGFiZWw6ICdCbGFzdCBSYWRpdXMnLCB2YWx1ZTogU3RyaW5nKG5vZGUuYmxhc3RSYWRpdXMpIH0sXG4gICAgICB7IGxhYmVsOiAnRGVwZW5kZW5jeSBTcGFuJywgdmFsdWU6IFN0cmluZyhub2RlLmRlcGVuZGVuY3lTcGFuKSB9LFxuICAgICAgeyBsYWJlbDogJ1NvdXJjZScsIHZhbHVlOiBub2RlLnNvdXJjZSB9LFxuICAgIF0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZURvY3VtZW50RXZpZGVuY2UoZXZpZGVuY2U6IEFwaURvY3VtZW50RXZpZGVuY2UpOiBEb2N1bWVudEV2aWRlbmNlIHtcbiAgcmV0dXJuIHtcbiAgICBxdW90ZTogZW5zdXJlU3RyaW5nKGV2aWRlbmNlLnF1b3RlLCAnZG9jdW1lbnQuZXZpZGVuY2UucXVvdGUnKSxcbiAgICBwYWdlU3RhcnQ6IGV2aWRlbmNlLnBhZ2Vfc3RhcnQsXG4gICAgcGFnZUVuZDogZXZpZGVuY2UucGFnZV9lbmQsXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZURvY3VtZW50U291cmNlKHNvdXJjZTogQXBpRG9jdW1lbnRTb3VyY2UpOiBEb2N1bWVudFNvdXJjZSB7XG4gIHJldHVybiB7XG4gICAgZG9jdW1lbnROYW1lOiBlbnN1cmVTdHJpbmcoc291cmNlLmRvY3VtZW50X25hbWUsICdkb2N1bWVudC5zb3VyY2UuZG9jdW1lbnRfbmFtZScpLFxuICAgIGNodW5rRmlsZTogZW5zdXJlU3RyaW5nKHNvdXJjZS5jaHVua19maWxlLCAnZG9jdW1lbnQuc291cmNlLmNodW5rX2ZpbGUnKSxcbiAgICBjaHVua0lkOiBlbnN1cmVTdHJpbmcoc291cmNlLmNodW5rX2lkLCAnZG9jdW1lbnQuc291cmNlLmNodW5rX2lkJyksXG4gICAgcGRmUGFnZVN0YXJ0OiBzb3VyY2UucGRmX3BhZ2Vfc3RhcnQsXG4gICAgcGRmUGFnZUVuZDogc291cmNlLnBkZl9wYWdlX2VuZCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplRG9jdW1lbnROb2RlKG5vZGU6IEFwaURvY3VtZW50Tm9kZSk6IERvY3VtZW50Tm9kZSB7XG4gIGNvbnN0IGRlZ3JlZSA9IGVuc3VyZU51bWJlcihub2RlLmRlZ3JlZSwgJ2RvY3VtZW50Lm5vZGUuZGVncmVlJyk7XG4gIHJldHVybiB7XG4gICAgaWQ6IGVuc3VyZVN0cmluZyhub2RlLmlkLCAnZG9jdW1lbnQubm9kZS5pZCcpLFxuICAgIGxhYmVsOiBlbnN1cmVTdHJpbmcobm9kZS5sYWJlbCwgJ2RvY3VtZW50Lm5vZGUubGFiZWwnKSxcbiAgICBraW5kOiBlbnN1cmVTdHJpbmcobm9kZS5raW5kLCAnZG9jdW1lbnQubm9kZS5raW5kJyksXG4gICAgY2Fub25pY2FsTmFtZTogZW5zdXJlU3RyaW5nKG5vZGUuY2Fub25pY2FsX25hbWUsICdkb2N1bWVudC5ub2RlLmNhbm9uaWNhbF9uYW1lJyksXG4gICAgYWxpYXNlczogZW5zdXJlQXJyYXk8c3RyaW5nPihub2RlLmFsaWFzZXMsICdkb2N1bWVudC5ub2RlLmFsaWFzZXMnKSxcbiAgICBzdW1tYXJ5OiBlbnN1cmVTdHJpbmcobm9kZS5zdW1tYXJ5LCAnZG9jdW1lbnQubm9kZS5zdW1tYXJ5JyksXG4gICAgZXZpZGVuY2U6IGVuc3VyZUFycmF5PEFwaURvY3VtZW50RXZpZGVuY2U+KG5vZGUuZXZpZGVuY2UsICdkb2N1bWVudC5ub2RlLmV2aWRlbmNlJykubWFwKG5vcm1hbGl6ZURvY3VtZW50RXZpZGVuY2UpLFxuICAgIHNvdXJjZXM6IGVuc3VyZUFycmF5PEFwaURvY3VtZW50U291cmNlPihub2RlLnNvdXJjZXMsICdkb2N1bWVudC5ub2RlLnNvdXJjZXMnKS5tYXAobm9ybWFsaXplRG9jdW1lbnRTb3VyY2UpLFxuICAgIGRlZ3JlZSxcbiAgICBzb3VyY2U6IGVuc3VyZVN0cmluZyhub2RlLnNvdXJjZSwgJ2RvY3VtZW50Lm5vZGUuc291cmNlJyksXG4gICAgdmFsOiAxNiArIE1hdGgubWluKDE4LCBNYXRoLnJvdW5kKGRlZ3JlZSAqIDQpKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplRG9jdW1lbnRFZGdlKGVkZ2U6IEFwaURvY3VtZW50RWRnZSk6IERvY3VtZW50RWRnZSB7XG4gIHJldHVybiB7XG4gICAgaWQ6IGVuc3VyZVN0cmluZyhlZGdlLmlkLCAnZG9jdW1lbnQuZWRnZS5pZCcpLFxuICAgIHNvdXJjZTogZW5zdXJlU3RyaW5nKGVkZ2Uuc291cmNlLCAnZG9jdW1lbnQuZWRnZS5zb3VyY2UnKSxcbiAgICB0YXJnZXQ6IGVuc3VyZVN0cmluZyhlZGdlLnRhcmdldCwgJ2RvY3VtZW50LmVkZ2UudGFyZ2V0JyksXG4gICAgdHlwZTogZW5zdXJlU3RyaW5nKGVkZ2UudHlwZSwgJ2RvY3VtZW50LmVkZ2UudHlwZScpLFxuICAgIHN1bW1hcnk6IGVuc3VyZVN0cmluZyhlZGdlLnN1bW1hcnksICdkb2N1bWVudC5lZGdlLnN1bW1hcnknKSxcbiAgICBldmlkZW5jZTogZW5zdXJlQXJyYXk8QXBpRG9jdW1lbnRFdmlkZW5jZT4oZWRnZS5ldmlkZW5jZSwgJ2RvY3VtZW50LmVkZ2UuZXZpZGVuY2UnKS5tYXAobm9ybWFsaXplRG9jdW1lbnRFdmlkZW5jZSksXG4gICAgc291cmNlQ2h1bms6IGVkZ2Uuc291cmNlX2NodW5rID8gbm9ybWFsaXplRG9jdW1lbnRTb3VyY2UoZWRnZS5zb3VyY2VfY2h1bmspIDogbnVsbCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0RG9jdW1lbnRHcmFwaChhcGlHcmFwaDogQXBpRG9jdW1lbnRHcmFwaERhdGEpOiBEb2N1bWVudEdyYXBoRGF0YSB7XG4gIGNvbnN0IHNvdXJjZSA9IGVuc3VyZVN0cmluZyhhcGlHcmFwaC5zb3VyY2UsICdkb2N1bWVudC5ncmFwaC5zb3VyY2UnKTtcbiAgY29uc3Qgbm9kZXMgPSBlbnN1cmVBcnJheTxBcGlEb2N1bWVudE5vZGU+KGFwaUdyYXBoLm5vZGVzLCAnZG9jdW1lbnQuZ3JhcGgubm9kZXMnKS5tYXAobm9ybWFsaXplRG9jdW1lbnROb2RlKTtcbiAgY29uc3QgbGlua3MgPSBlbnN1cmVBcnJheTxBcGlEb2N1bWVudEVkZ2U+KGFwaUdyYXBoLmVkZ2VzLCAnZG9jdW1lbnQuZ3JhcGguZWRnZXMnKS5tYXAobm9ybWFsaXplRG9jdW1lbnRFZGdlKTtcbiAgY29uc3Qgbm9kZUluZGV4ID0gT2JqZWN0LmZyb21FbnRyaWVzKG5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUuaWQsIG5vZGVdKSk7XG4gIGNvbnN0IGtpbmRUeXBlcyA9IFsuLi5uZXcgU2V0KG5vZGVzLm1hcCgobm9kZSkgPT4gbm9kZS5raW5kKSldLnNvcnQoKTtcbiAgY29uc3QgcmVsYXRpb25UeXBlcyA9IFsuLi5uZXcgU2V0KGxpbmtzLm1hcCgoZWRnZSkgPT4gZWRnZS50eXBlKSldLnNvcnQoKTtcblxuICByZXR1cm4ge1xuICAgIHNvdXJjZSxcbiAgICBpbmdlc3Rpb25JZDogYXBpR3JhcGguaW5nZXN0aW9uX2lkID8/IG51bGwsXG4gICAgbm9kZXMsXG4gICAgbGlua3MsXG4gICAgbm9kZUluZGV4LFxuICAgIGtpbmRUeXBlcyxcbiAgICByZWxhdGlvblR5cGVzLFxuICB9O1xufVxuIiwgImNvbnN0IHJ1bnRpbWVDb25maWcgPSB3aW5kb3cuX19UV0lOX0NPTkZJR19fID8/IHt9O1xuXG5mdW5jdGlvbiByZWFkTnVtYmVyKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCB1bmRlZmluZWQsIGZhbGxiYWNrOiBudW1iZXIpIHtcbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHZhbHVlKTtcbiAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShwYXJzZWQpICYmIHBhcnNlZCA+IDAgPyBwYXJzZWQgOiBmYWxsYmFjaztcbn1cblxuZXhwb3J0IGNvbnN0IGFwcENvbmZpZyA9IHtcbiAgYXBpQmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXG4gIG1heFVwbG9hZEJ5dGVzOlxuICAgIHJlYWROdW1iZXIocnVudGltZUNvbmZpZy5NQVhfVVBMT0FEX01CIHx8IGltcG9ydC5tZXRhLmVudi5WSVRFX01BWF9VUExPQURfTUIsIDUwKSAqIDEwMjQgKiAxMDI0LFxuICBwcm9jZXNzaW5nVGltZW91dE1zOiByZWFkTnVtYmVyKFxuICAgIHJ1bnRpbWVDb25maWcuUFJPQ0VTU0lOR19USU1FT1VUX01TIHx8IGltcG9ydC5tZXRhLmVudi5WSVRFX1BST0NFU1NJTkdfVElNRU9VVF9NUyxcbiAgICAzMDAwMDBcbiAgKSxcbiAgZW52aXJvbm1lbnQ6IHJ1bnRpbWVDb25maWcuQVBQX0VOViB8fCAnbG9jYWwnLFxufTtcbiIsICJpbXBvcnQgeyBhcHBDb25maWcgfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgdHlwZSB7XG4gIEFwaUdyYXBoRGF0YSxcbiAgQXBpUGF5bG9hZCxcbiAgQXBpRG9jdW1lbnRHcmFwaERhdGEsXG4gIERvY3VtZW50QXJ0aWZhY3RNYW5pZmVzdCxcbiAgRG9jdW1lbnRJbmdlc3RSZXNwb25zZSxcbiAgSW1wYWN0UmVzcG9uc2UsXG4gIEluZ2VzdFJlc3BvbnNlLFxuICBQcm9jZXNzaW5nU3RhdHVzLFxuICBSaXNrUmVzcG9uc2UsXG59IGZyb20gJy4uL3R5cGVzL2FwaSc7XG5cbmV4cG9ydCBjbGFzcyBBcGlDbGllbnRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29kZT86IHN0cmluZztcbiAgc3RhdHVzPzogbnVtYmVyO1xuICBkZXRhaWxzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIHJldHJ5YWJsZTogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgb3B0aW9uczoge1xuICAgICAgY29kZT86IHN0cmluZztcbiAgICAgIHN0YXR1cz86IG51bWJlcjtcbiAgICAgIGRldGFpbHM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICAgIHJldHJ5YWJsZT86IGJvb2xlYW47XG4gICAgfSA9IHt9XG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdBcGlDbGllbnRFcnJvcic7XG4gICAgdGhpcy5jb2RlID0gb3B0aW9ucy5jb2RlO1xuICAgIHRoaXMuc3RhdHVzID0gb3B0aW9ucy5zdGF0dXM7XG4gICAgdGhpcy5kZXRhaWxzID0gb3B0aW9ucy5kZXRhaWxzO1xuICAgIHRoaXMucmV0cnlhYmxlID0gb3B0aW9ucy5yZXRyeWFibGUgPz8gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFVuc3VwcG9ydGVkRW5kcG9pbnRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gJ1Vuc3VwcG9ydGVkRW5kcG9pbnRFcnJvcic7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VKc29uU2FmZWx5KHJlc3BvbnNlOiBSZXNwb25zZSkge1xuICBjb25zdCB0ZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICBjb25zb2xlLmxvZygnQkFDS0VORCBSRVNQT05TRTonLCB0ZXh0KTtcblxuICBpZiAoIXRleHQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UodGV4dCkgYXMgQXBpUGF5bG9hZDx1bmtub3duPjtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdQQVJTRSBFUlJPUjonLCBlcnJvcik7XG4gICAgY29uc29sZS5lcnJvcignUkFXIFJFU1BPTlNFIFRFWFQ6JywgdGV4dCk7XG4gICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdUaGUgQVBJIHJldHVybmVkIG1hbGZvcm1lZCBKU09OLicsIHtcbiAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcbiAgICB9KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiByZXF1ZXN0PFQ+KHBhdGg6IHN0cmluZywgaW5pdDogUmVxdWVzdEluaXQgPSB7fSwgdGltZW91dE1zID0gMzAwMDApOiBQcm9taXNlPFQ+IHtcbiAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgY29uc3QgdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgdGltZW91dE1zKTtcblxuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYC9hcGkke3BhdGh9YCwge1xuICAgICAgLi4uaW5pdCxcbiAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXG4gICAgfSk7XG4gICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IHBhcnNlSnNvblNhZmVseShyZXNwb25zZSk7XG5cbiAgICBpZiAoIXBheWxvYWQgfHwgdHlwZW9mIHBheWxvYWQgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoJ1RoZSBBUEkgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuJywge1xuICAgICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICghcmVzcG9uc2Uub2sgfHwgcGF5bG9hZC5zdGF0dXMgIT09ICdvaycpIHtcbiAgICAgIGNvbnN0IGVycm9yUGF5bG9hZCA9IHBheWxvYWQgYXMgRXhjbHVkZTxBcGlQYXlsb2FkPFQ+LCB7IHN0YXR1czogJ29rJyB9PjtcbiAgICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcihlcnJvclBheWxvYWQuZXJyb3I/Lm1lc3NhZ2UgfHwgJ1RoZSByZXF1ZXN0IGZhaWxlZC4nLCB7XG4gICAgICAgIGNvZGU6IGVycm9yUGF5bG9hZC5lcnJvcj8uY29kZSxcbiAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXG4gICAgICAgIGRldGFpbHM6IGVycm9yUGF5bG9hZC5lcnJvcj8uZGV0YWlscyxcbiAgICAgICAgcmV0cnlhYmxlOiByZXNwb25zZS5zdGF0dXMgPj0gNTAwIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gMCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBwYXlsb2FkLmRhdGEgYXMgVDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlDbGllbnRFcnJvcikge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRE9NRXhjZXB0aW9uICYmIGVycm9yLm5hbWUgPT09ICdBYm9ydEVycm9yJykge1xuICAgICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdQcm9jZXNzaW5nIHRpbWVkIG91dCBiZWZvcmUgdGhlIGJhY2tlbmQgY29tcGxldGVkIHRoZSBncmFwaCBidWlsZC4nLCB7XG4gICAgICAgIGNvZGU6ICdyZXF1ZXN0X3RpbWVvdXQnLFxuICAgICAgICByZXRyeWFibGU6IHRydWUsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoJ05ldHdvcmsgZmFpbHVyZSB3aGlsZSBjb250YWN0aW5nIHRoZSBUd2luR3JhcGhPcHMgQVBJLicsIHtcbiAgICAgIGNvZGU6ICduZXR3b3JrX2Vycm9yJyxcbiAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcbiAgICB9KTtcbiAgfSBmaW5hbGx5IHtcbiAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWREb2N1bWVudChcbiAgZmlsZTogRmlsZSxcbiAgcmVwbGFjZUV4aXN0aW5nID0gdHJ1ZSxcbiAgdGltZW91dE1zID0gYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMsXG4gIGluZ2VzdGlvbklkPzogc3RyaW5nXG4pIHtcbiAgY29uc3QgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgZm9ybURhdGEuYXBwZW5kKCdmaWxlJywgZmlsZSk7XG4gIGZvcm1EYXRhLmFwcGVuZCgncmVwbGFjZV9leGlzdGluZycsIFN0cmluZyhyZXBsYWNlRXhpc3RpbmcpKTtcbiAgaWYgKGluZ2VzdGlvbklkKSB7XG4gICAgZm9ybURhdGEuYXBwZW5kKCdpbmdlc3Rpb25faWQnLCBpbmdlc3Rpb25JZCk7XG4gIH1cblxuICByZXR1cm4gcmVxdWVzdDxJbmdlc3RSZXNwb25zZT4oXG4gICAgJy9pbmdlc3QnLFxuICAgIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgYm9keTogZm9ybURhdGEsXG4gICAgfSxcbiAgICB0aW1lb3V0TXNcbiAgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZEtub3dsZWRnZURvY3VtZW50KFxuICBmaWxlOiBGaWxlLFxuICByZXBsYWNlRXhpc3RpbmcgPSB0cnVlLFxuICB0aW1lb3V0TXMgPSBhcHBDb25maWcucHJvY2Vzc2luZ1RpbWVvdXRNcyxcbiAgaW5nZXN0aW9uSWQ/OiBzdHJpbmdcbikge1xuICBjb25zdCBmb3JtRGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuICBmb3JtRGF0YS5hcHBlbmQoJ2ZpbGUnLCBmaWxlKTtcbiAgZm9ybURhdGEuYXBwZW5kKCdyZXBsYWNlX2V4aXN0aW5nJywgU3RyaW5nKHJlcGxhY2VFeGlzdGluZykpO1xuICBpZiAoaW5nZXN0aW9uSWQpIHtcbiAgICBmb3JtRGF0YS5hcHBlbmQoJ2luZ2VzdGlvbl9pZCcsIGluZ2VzdGlvbklkKTtcbiAgfVxuXG4gIHJldHVybiByZXF1ZXN0PERvY3VtZW50SW5nZXN0UmVzcG9uc2U+KFxuICAgICcvZG9jdW1lbnQvaW5nZXN0JyxcbiAgICB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGJvZHk6IGZvcm1EYXRhLFxuICAgIH0sXG4gICAgdGltZW91dE1zXG4gICk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRHcmFwaCgpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8QXBpR3JhcGhEYXRhPignL2dyYXBoJyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXREb2N1bWVudEdyYXBoKCkge1xuICByZXR1cm4gcmVxdWVzdDxBcGlEb2N1bWVudEdyYXBoRGF0YT4oJy9kb2N1bWVudC9ncmFwaCcpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QWN0aXZlRG9jdW1lbnRBcnRpZmFjdHMoKSB7XG4gIHJldHVybiByZXF1ZXN0PERvY3VtZW50QXJ0aWZhY3RNYW5pZmVzdD4oJy9kb2N1bWVudC9hcnRpZmFjdHMnKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldERvY3VtZW50QXJ0aWZhY3RzKGluZ2VzdGlvbklkOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8RG9jdW1lbnRBcnRpZmFjdE1hbmlmZXN0PihgL2RvY3VtZW50L2FydGlmYWN0cy8ke2VuY29kZVVSSUNvbXBvbmVudChpbmdlc3Rpb25JZCl9YCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREb2N1bWVudEFydGlmYWN0RG93bmxvYWRVcmwoaW5nZXN0aW9uSWQ6IHN0cmluZywgYXJ0aWZhY3RJZDogc3RyaW5nKSB7XG4gIHJldHVybiBgL2FwaS9kb2N1bWVudC9hcnRpZmFjdHMvJHtlbmNvZGVVUklDb21wb25lbnQoaW5nZXN0aW9uSWQpfS9maWxlcy8ke2VuY29kZVVSSUNvbXBvbmVudChhcnRpZmFjdElkKX1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG9jdW1lbnRBcnRpZmFjdEJ1bmRsZURvd25sb2FkVXJsKGluZ2VzdGlvbklkOiBzdHJpbmcpIHtcbiAgcmV0dXJuIGAvYXBpL2RvY3VtZW50L2FydGlmYWN0cy8ke2VuY29kZVVSSUNvbXBvbmVudChpbmdlc3Rpb25JZCl9L2J1bmRsZWA7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRSaXNrKGNvbXBvbmVudElkOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8Umlza1Jlc3BvbnNlPihgL3Jpc2s/Y29tcG9uZW50X2lkPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGNvbXBvbmVudElkKX1gKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEltcGFjdChjb21wb25lbnRJZDogc3RyaW5nKSB7XG4gIHJldHVybiByZXF1ZXN0PEltcGFjdFJlc3BvbnNlPihgL2ltcGFjdD9jb21wb25lbnRfaWQ9JHtlbmNvZGVVUklDb21wb25lbnQoY29tcG9uZW50SWQpfWApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VlZERlbW9HcmFwaCgpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8eyBzb3VyY2U6IHN0cmluZzsgbm9kZXNfY3JlYXRlZDogbnVtYmVyOyBlZGdlc19jcmVhdGVkOiBudW1iZXI7IHJpc2tfbm9kZXNfc2NvcmVkOiBudW1iZXIgfT4oXG4gICAgJy9zZWVkJyxcbiAgICB7IG1ldGhvZDogJ1BPU1QnIH1cbiAgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQ6IHN0cmluZykge1xuICByZXR1cm4gcmVxdWVzdDxQcm9jZXNzaW5nU3RhdHVzPihgL2luZ2VzdC8ke2VuY29kZVVSSUNvbXBvbmVudChpbmdlc3Rpb25JZCl9L2V2ZW50c2ApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0RG9jdW1lbnRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8UHJvY2Vzc2luZ1N0YXR1cz4oYC9kb2N1bWVudC9pbmdlc3QvJHtlbmNvZGVVUklDb21wb25lbnQoaW5nZXN0aW9uSWQpfS9ldmVudHNgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFJpc2tSYW5rZWRJdGVtcygpOiBQcm9taXNlPG5ldmVyPiB7XG4gIC8vIFRPRE86IHJlcGxhY2UgY2xpZW50LXNpZGUgcmlzayByYW5raW5nIHdoZW4gdGhlIGJhY2tlbmQgZXhwb3NlcyBhIGRlZGljYXRlZCByaXNrIGxpc3QgZW5kcG9pbnQuXG4gIHRocm93IG5ldyBVbnN1cHBvcnRlZEVuZHBvaW50RXJyb3IoJ1RoZSBjdXJyZW50IGJhY2tlbmQgY29udHJhY3QgZG9lcyBub3QgZXhwb3NlIGEgcmFua2VkIHJpc2sgbGlzdCBlbmRwb2ludC4nKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFyY2hpdGVjdHVyZVN1bW1hcnkoKTogUHJvbWlzZTxuZXZlcj4ge1xuICAvLyBUT0RPOiByZXBsYWNlIGNsaWVudC1zaWRlIHN1bW1hcnkgZGVyaXZhdGlvbiB3aGVuIHRoZSBiYWNrZW5kIGV4cG9zZXMgYSBkZWRpY2F0ZWQgc3VtbWFyeSBlbmRwb2ludC5cbiAgdGhyb3cgbmV3IFVuc3VwcG9ydGVkRW5kcG9pbnRFcnJvcignVGhlIGN1cnJlbnQgYmFja2VuZCBjb250cmFjdCBkb2VzIG5vdCBleHBvc2UgYW4gYXJjaGl0ZWN0dXJlIHN1bW1hcnkgZW5kcG9pbnQuJyk7XG59XG4iLCAiaW1wb3J0IHsgY3JlYXRlQ29udGV4dCwgdXNlQ2FsbGJhY2ssIHVzZUNvbnRleHQsIHVzZU1lbW8sIHVzZVJlZiwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgdHlwZSB7IFJlYWN0Tm9kZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGFkYXB0RG9jdW1lbnRHcmFwaCwgYWRhcHRHcmFwaCwgYWRhcHRNZXJnZWRHcmFwaCB9IGZyb20gJy4uL2xpYi9hZGFwdGVycyc7XG5pbXBvcnQge1xuICBBcGlDbGllbnRFcnJvcixcbiAgZ2V0RG9jdW1lbnRBcnRpZmFjdHMsXG4gIGdldERvY3VtZW50R3JhcGgsXG4gIGdldERvY3VtZW50UHJvY2Vzc2luZ1N0YXR1cyxcbiAgZ2V0R3JhcGgsXG4gIGdldFByb2Nlc3NpbmdTdGF0dXMsXG4gIHVwbG9hZERvY3VtZW50LFxuICB1cGxvYWRLbm93bGVkZ2VEb2N1bWVudCxcbn0gZnJvbSAnLi4vbGliL2FwaSc7XG5pbXBvcnQgeyBhcHBDb25maWcgfSBmcm9tICcuLi9saWIvY29uZmlnJztcbmltcG9ydCB0eXBlIHtcbiAgRG9jdW1lbnRHcmFwaFN0YXRlLFxuICBEb2N1bWVudFVwbG9hZFN0YXRlLFxuICBHcmFwaFN0YXRlLFxuICBVcGxvYWRTdGF0ZSxcbiAgVXBsb2FkZWRBcnRpZmFjdEtpbmQsXG4gIFVwbG9hZGVkR3JhcGhTdGF0ZSxcbiAgVXBsb2FkZWRHcmFwaFVwbG9hZFN0YXRlLFxufSBmcm9tICcuLi90eXBlcy9hcHAnO1xuaW1wb3J0IHR5cGUgeyBBcGlEb2N1bWVudEdyYXBoRGF0YSwgQXBpTWVyZ2VkR3JhcGhEYXRhIH0gZnJvbSAnLi4vdHlwZXMvYXBpJztcblxuZXhwb3J0IGludGVyZmFjZSBBcHBDb250ZXh0VmFsdWUge1xuICB1cGxvYWQ6IFVwbG9hZFN0YXRlO1xuICBncmFwaDogR3JhcGhTdGF0ZTtcbiAgZG9jdW1lbnRVcGxvYWQ6IERvY3VtZW50VXBsb2FkU3RhdGU7XG4gIGRvY3VtZW50R3JhcGg6IERvY3VtZW50R3JhcGhTdGF0ZTtcbiAgdXBsb2FkZWRHcmFwaFVwbG9hZDogVXBsb2FkZWRHcmFwaFVwbG9hZFN0YXRlO1xuICB1cGxvYWRlZEdyYXBoOiBVcGxvYWRlZEdyYXBoU3RhdGU7XG4gIHNldERyYWdBY3RpdmU6IChhY3RpdmU6IGJvb2xlYW4pID0+IHZvaWQ7XG4gIHNlbGVjdEZpbGU6IChmaWxlOiBGaWxlIHwgbnVsbCkgPT4gYm9vbGVhbjtcbiAgY2xlYXJTZWxlY3RlZEZpbGU6ICgpID0+IHZvaWQ7XG4gIGJlZ2luUHJvY2Vzc2luZzogKCkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgbG9hZEdyYXBoOiAob3B0aW9ucz86IHsga2VlcFN0YXR1cz86IGJvb2xlYW4gfSkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgc2V0RG9jdW1lbnREcmFnQWN0aXZlOiAoYWN0aXZlOiBib29sZWFuKSA9PiB2b2lkO1xuICBzZWxlY3REb2N1bWVudEZpbGU6IChmaWxlOiBGaWxlIHwgbnVsbCkgPT4gYm9vbGVhbjtcbiAgY2xlYXJTZWxlY3RlZERvY3VtZW50RmlsZTogKCkgPT4gdm9pZDtcbiAgYmVnaW5Eb2N1bWVudFByb2Nlc3Npbmc6ICgpID0+IFByb21pc2U8dm9pZD47XG4gIGxvYWREb2N1bWVudEdyYXBoOiAob3B0aW9ucz86IHsga2VlcFN0YXR1cz86IGJvb2xlYW4gfSkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgc2V0VXBsb2FkZWRHcmFwaERyYWdBY3RpdmU6IChhY3RpdmU6IGJvb2xlYW4pID0+IHZvaWQ7XG4gIHNlbGVjdFVwbG9hZGVkR3JhcGhGaWxlOiAoZmlsZTogRmlsZSB8IG51bGwpID0+IGJvb2xlYW47XG4gIGNsZWFyU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZTogKCkgPT4gdm9pZDtcbiAgbG9hZFVwbG9hZGVkR3JhcGhGcm9tU2VsZWN0ZWRGaWxlOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xuICByZXNldFVwbG9hZFN0YXRlOiAoKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgY29uc3QgQXBwQ29udGV4dCA9IGNyZWF0ZUNvbnRleHQ8QXBwQ29udGV4dFZhbHVlIHwgbnVsbD4obnVsbCk7XG5cbmV4cG9ydCBjb25zdCBpbml0aWFsVXBsb2FkU3RhdGU6IFVwbG9hZFN0YXRlID0ge1xuICBwaGFzZTogJ2lkbGUnLFxuICBzZWxlY3RlZEZpbGU6IG51bGwsXG4gIGVycm9yOiBudWxsLFxuICBzdGF0dXNNZXNzYWdlOiAnVXBsb2FkIGEgLm1kIG9yIC50eHQgZmlsZSB0byBidWlsZCB0aGUgZ3JhcGguJyxcbiAgaW5nZXN0aW9uSWQ6IG51bGwsXG4gIGluZ2VzdGlvbjogbnVsbCxcbiAgcHJvY2Vzc2luZ1N0YXR1czogbnVsbCxcbiAgc3RhcnRlZEF0OiBudWxsLFxuICBjb21wbGV0ZWRBdDogbnVsbCxcbiAgcmV0cnlDb3VudDogMCxcbn07XG5cbmNvbnN0IGluaXRpYWxHcmFwaFN0YXRlOiBHcmFwaFN0YXRlID0ge1xuICBzdGF0dXM6ICdpZGxlJyxcbiAgZGF0YTogbnVsbCxcbiAgZXJyb3I6IG51bGwsXG4gIGxhc3RMb2FkZWRBdDogbnVsbCxcbn07XG5cbmV4cG9ydCBjb25zdCBpbml0aWFsVXBsb2FkZWRHcmFwaFVwbG9hZFN0YXRlOiBVcGxvYWRlZEdyYXBoVXBsb2FkU3RhdGUgPSB7XG4gIHBoYXNlOiAnaWRsZScsXG4gIHNlbGVjdGVkRmlsZTogbnVsbCxcbiAgZXJyb3I6IG51bGwsXG4gIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWQgYSBtZXJnZWRfZ3JhcGguanNvbiBmaWxlIHRvIGluc3BlY3QgYSBmaW5hbGl6ZWQga25vd2xlZGdlIGdyYXBoLicsXG59O1xuXG5jb25zdCBpbml0aWFsVXBsb2FkZWRHcmFwaFN0YXRlOiBVcGxvYWRlZEdyYXBoU3RhdGUgPSB7XG4gIHN0YXR1czogJ2lkbGUnLFxuICBraW5kOiBudWxsLFxuICBvcGVyYXRpb25hbERhdGE6IG51bGwsXG4gIGRvY3VtZW50RGF0YTogbnVsbCxcbiAgZXJyb3I6IG51bGwsXG4gIGxhc3RMb2FkZWRBdDogbnVsbCxcbiAgZmlsZW5hbWU6IG51bGwsXG4gIHJhd0RhdGE6IG51bGwsXG59O1xuXG5leHBvcnQgY29uc3QgaW5pdGlhbERvY3VtZW50VXBsb2FkU3RhdGU6IERvY3VtZW50VXBsb2FkU3RhdGUgPSB7XG4gIHBoYXNlOiAnaWRsZScsXG4gIHNlbGVjdGVkRmlsZTogbnVsbCxcbiAgZXJyb3I6IG51bGwsXG4gIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWQgYSAucGRmLCAubWQsIG9yIC50eHQgZmlsZSB0byBidWlsZCBhIGRvY3VtZW50IGdyYXBoLicsXG4gIGluZ2VzdGlvbklkOiBudWxsLFxuICBpbmdlc3Rpb246IG51bGwsXG4gIHByb2Nlc3NpbmdTdGF0dXM6IG51bGwsXG4gIHN0YXJ0ZWRBdDogbnVsbCxcbiAgY29tcGxldGVkQXQ6IG51bGwsXG4gIHJldHJ5Q291bnQ6IDAsXG59O1xuXG5jb25zdCBpbml0aWFsRG9jdW1lbnRHcmFwaFN0YXRlOiBEb2N1bWVudEdyYXBoU3RhdGUgPSB7XG4gIHN0YXR1czogJ2lkbGUnLFxuICBkYXRhOiBudWxsLFxuICBlcnJvcjogbnVsbCxcbiAgbGFzdExvYWRlZEF0OiBudWxsLFxuICBhcnRpZmFjdHM6IG51bGwsXG4gIGFydGlmYWN0c0Vycm9yOiBudWxsLFxufTtcblxuY29uc3QgRE9DVU1FTlRfQVJUSUZBQ1RfRkVUQ0hfQVRURU1QVFMgPSA1O1xuY29uc3QgRE9DVU1FTlRfQVJUSUZBQ1RfRkVUQ0hfREVMQVlfTVMgPSA4MDA7XG5cbmV4cG9ydCBjb25zdCBzdXBwb3J0ZWRFeHRlbnNpb25zID0gWycubWQnLCAnLnR4dCddO1xuZXhwb3J0IGNvbnN0IHN1cHBvcnRlZERvY3VtZW50RXh0ZW5zaW9ucyA9IFsnLnBkZicsICcubWQnLCAnLnR4dCddO1xuZXhwb3J0IGNvbnN0IHN1cHBvcnRlZFVwbG9hZGVkR3JhcGhFeHRlbnNpb25zID0gWycuanNvbiddO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZUV4dGVuc2lvbihmaWxlbmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHNlZ21lbnRzID0gZmlsZW5hbWUudG9Mb3dlckNhc2UoKS5zcGxpdCgnLicpO1xuICByZXR1cm4gc2VnbWVudHMubGVuZ3RoID4gMSA/IGAuJHtzZWdtZW50cy5wb3AoKX1gIDogJyc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZWxlY3RlZEZpbGVVcGxvYWRTdGF0ZShmaWxlOiBGaWxlKTogVXBsb2FkU3RhdGUge1xuICByZXR1cm4ge1xuICAgIHBoYXNlOiAnZmlsZS1zZWxlY3RlZCcsXG4gICAgc2VsZWN0ZWRGaWxlOiBmaWxlLFxuICAgIGVycm9yOiBudWxsLFxuICAgIHN0YXR1c01lc3NhZ2U6IGBSZWFkeSB0byBhbmFseXplICR7ZmlsZS5uYW1lfS5gLFxuICAgIGluZ2VzdGlvbklkOiBudWxsLFxuICAgIGluZ2VzdGlvbjogbnVsbCxcbiAgICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxuICAgIHN0YXJ0ZWRBdDogbnVsbCxcbiAgICBjb21wbGV0ZWRBdDogbnVsbCxcbiAgICByZXRyeUNvdW50OiAwLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVXBsb2FkRXJyb3JTdGF0ZShlcnJvcjogc3RyaW5nLCBzdGF0dXNNZXNzYWdlOiBzdHJpbmcpOiBVcGxvYWRTdGF0ZSB7XG4gIHJldHVybiB7XG4gICAgLi4uaW5pdGlhbFVwbG9hZFN0YXRlLFxuICAgIHBoYXNlOiAnZXJyb3InLFxuICAgIGVycm9yLFxuICAgIHN0YXR1c01lc3NhZ2UsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZWxlY3RlZERvY3VtZW50RmlsZVVwbG9hZFN0YXRlKGZpbGU6IEZpbGUpOiBEb2N1bWVudFVwbG9hZFN0YXRlIHtcbiAgcmV0dXJuIHtcbiAgICBwaGFzZTogJ2ZpbGUtc2VsZWN0ZWQnLFxuICAgIHNlbGVjdGVkRmlsZTogZmlsZSxcbiAgICBlcnJvcjogbnVsbCxcbiAgICBzdGF0dXNNZXNzYWdlOiBgUmVhZHkgdG8gbWFwICR7ZmlsZS5uYW1lfS5gLFxuICAgIGluZ2VzdGlvbklkOiBudWxsLFxuICAgIGluZ2VzdGlvbjogbnVsbCxcbiAgICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxuICAgIHN0YXJ0ZWRBdDogbnVsbCxcbiAgICBjb21wbGV0ZWRBdDogbnVsbCxcbiAgICByZXRyeUNvdW50OiAwLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRG9jdW1lbnRVcGxvYWRFcnJvclN0YXRlKGVycm9yOiBzdHJpbmcsIHN0YXR1c01lc3NhZ2U6IHN0cmluZyk6IERvY3VtZW50VXBsb2FkU3RhdGUge1xuICByZXR1cm4ge1xuICAgIC4uLmluaXRpYWxEb2N1bWVudFVwbG9hZFN0YXRlLFxuICAgIHBoYXNlOiAnZXJyb3InLFxuICAgIGVycm9yLFxuICAgIHN0YXR1c01lc3NhZ2UsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZWxlY3RlZFVwbG9hZGVkR3JhcGhGaWxlU3RhdGUoZmlsZTogRmlsZSk6IFVwbG9hZGVkR3JhcGhVcGxvYWRTdGF0ZSB7XG4gIHJldHVybiB7XG4gICAgcGhhc2U6ICdmaWxlLXNlbGVjdGVkJyxcbiAgICBzZWxlY3RlZEZpbGU6IGZpbGUsXG4gICAgZXJyb3I6IG51bGwsXG4gICAgc3RhdHVzTWVzc2FnZTogYFJlYWR5IHRvIGluc3BlY3QgJHtmaWxlLm5hbWV9LmAsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVVcGxvYWRlZEdyYXBoRXJyb3JTdGF0ZShlcnJvcjogc3RyaW5nLCBzdGF0dXNNZXNzYWdlOiBzdHJpbmcpOiBVcGxvYWRlZEdyYXBoVXBsb2FkU3RhdGUge1xuICByZXR1cm4ge1xuICAgIC4uLmluaXRpYWxVcGxvYWRlZEdyYXBoVXBsb2FkU3RhdGUsXG4gICAgcGhhc2U6ICdlcnJvcicsXG4gICAgZXJyb3IsXG4gICAgc3RhdHVzTWVzc2FnZSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlU2VsZWN0ZWRGaWxlKGZpbGU6IEZpbGUgfCBudWxsLCBtYXhVcGxvYWRCeXRlczogbnVtYmVyKTogVXBsb2FkU3RhdGUge1xuICBpZiAoIWZpbGUpIHtcbiAgICByZXR1cm4gaW5pdGlhbFVwbG9hZFN0YXRlO1xuICB9XG5cbiAgY29uc3QgZXh0ZW5zaW9uID0gZ2V0RmlsZUV4dGVuc2lvbihmaWxlLm5hbWUpO1xuICBpZiAoIXN1cHBvcnRlZEV4dGVuc2lvbnMuaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xuICAgIHJldHVybiBjcmVhdGVVcGxvYWRFcnJvclN0YXRlKCdPbmx5IC5tZCBhbmQgLnR4dCBmaWxlcyBhcmUgc3VwcG9ydGVkLicsICdVbnN1cHBvcnRlZCBmaWxlIHR5cGUuJyk7XG4gIH1cblxuICBpZiAoZmlsZS5zaXplID4gbWF4VXBsb2FkQnl0ZXMpIHtcbiAgICByZXR1cm4gY3JlYXRlVXBsb2FkRXJyb3JTdGF0ZShcbiAgICAgIGBGaWxlIGV4Y2VlZHMgdGhlICR7TWF0aC5yb3VuZChtYXhVcGxvYWRCeXRlcyAvIDEwMjQgLyAxMDI0KX0gTUIgdXBsb2FkIGxpbWl0LmAsXG4gICAgICAnU2VsZWN0ZWQgZmlsZSBpcyB0b28gbGFyZ2UuJ1xuICAgICk7XG4gIH1cblxuICByZXR1cm4gY3JlYXRlU2VsZWN0ZWRGaWxlVXBsb2FkU3RhdGUoZmlsZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVNlbGVjdGVkRG9jdW1lbnRGaWxlKGZpbGU6IEZpbGUgfCBudWxsLCBtYXhVcGxvYWRCeXRlczogbnVtYmVyKTogRG9jdW1lbnRVcGxvYWRTdGF0ZSB7XG4gIGlmICghZmlsZSkge1xuICAgIHJldHVybiBpbml0aWFsRG9jdW1lbnRVcGxvYWRTdGF0ZTtcbiAgfVxuXG4gIGNvbnN0IGV4dGVuc2lvbiA9IGdldEZpbGVFeHRlbnNpb24oZmlsZS5uYW1lKTtcbiAgaWYgKCFzdXBwb3J0ZWREb2N1bWVudEV4dGVuc2lvbnMuaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xuICAgIHJldHVybiBjcmVhdGVEb2N1bWVudFVwbG9hZEVycm9yU3RhdGUoJ09ubHkgLnBkZiwgLm1kLCBhbmQgLnR4dCBmaWxlcyBhcmUgc3VwcG9ydGVkLicsICdVbnN1cHBvcnRlZCBmaWxlIHR5cGUuJyk7XG4gIH1cblxuICBpZiAoZmlsZS5zaXplID4gbWF4VXBsb2FkQnl0ZXMpIHtcbiAgICByZXR1cm4gY3JlYXRlRG9jdW1lbnRVcGxvYWRFcnJvclN0YXRlKFxuICAgICAgYEZpbGUgZXhjZWVkcyB0aGUgJHtNYXRoLnJvdW5kKG1heFVwbG9hZEJ5dGVzIC8gMTAyNCAvIDEwMjQpfSBNQiB1cGxvYWQgbGltaXQuYCxcbiAgICAgICdTZWxlY3RlZCBmaWxlIGlzIHRvbyBsYXJnZS4nXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVTZWxlY3RlZERvY3VtZW50RmlsZVVwbG9hZFN0YXRlKGZpbGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVTZWxlY3RlZFVwbG9hZGVkR3JhcGhGaWxlKGZpbGU6IEZpbGUgfCBudWxsLCBtYXhVcGxvYWRCeXRlczogbnVtYmVyKTogVXBsb2FkZWRHcmFwaFVwbG9hZFN0YXRlIHtcbiAgaWYgKCFmaWxlKSB7XG4gICAgcmV0dXJuIGluaXRpYWxVcGxvYWRlZEdyYXBoVXBsb2FkU3RhdGU7XG4gIH1cblxuICBjb25zdCBleHRlbnNpb24gPSBnZXRGaWxlRXh0ZW5zaW9uKGZpbGUubmFtZSk7XG4gIGlmICghc3VwcG9ydGVkVXBsb2FkZWRHcmFwaEV4dGVuc2lvbnMuaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xuICAgIHJldHVybiBjcmVhdGVVcGxvYWRlZEdyYXBoRXJyb3JTdGF0ZSgnT25seSAuanNvbiBncmFwaCBhcnRpZmFjdCBmaWxlcyBhcmUgc3VwcG9ydGVkLicsICdVbnN1cHBvcnRlZCBmaWxlIHR5cGUuJyk7XG4gIH1cblxuICBpZiAoZmlsZS5zaXplID4gbWF4VXBsb2FkQnl0ZXMpIHtcbiAgICByZXR1cm4gY3JlYXRlVXBsb2FkZWRHcmFwaEVycm9yU3RhdGUoXG4gICAgICBgRmlsZSBleGNlZWRzIHRoZSAke01hdGgucm91bmQobWF4VXBsb2FkQnl0ZXMgLyAxMDI0IC8gMTAyNCl9IE1CIHVwbG9hZCBsaW1pdC5gLFxuICAgICAgJ1NlbGVjdGVkIGZpbGUgaXMgdG9vIGxhcmdlLidcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGNyZWF0ZVNlbGVjdGVkVXBsb2FkZWRHcmFwaEZpbGVTdGF0ZShmaWxlKTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlT3BlcmF0aW9uYWxVcGxvYWRlZEdyYXBoU2hhcGUocGF5bG9hZDogdW5rbm93bik6IEFwaU1lcmdlZEdyYXBoRGF0YSB7XG4gIGlmICghcGF5bG9hZCB8fCB0eXBlb2YgcGF5bG9hZCAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShwYXlsb2FkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignVGhlIHVwbG9hZGVkIGZpbGUgbXVzdCBiZSBhIEpTT04gb2JqZWN0IHdpdGggbm9kZXMgYW5kIGVkZ2VzLicpO1xuICB9XG5cbiAgY29uc3QgY2FuZGlkYXRlID0gcGF5bG9hZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGNhbmRpZGF0ZS5ub2RlcykgfHwgIUFycmF5LmlzQXJyYXkoY2FuZGlkYXRlLmVkZ2VzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignVGhlIHVwbG9hZGVkIGZpbGUgbXVzdCBpbmNsdWRlIHRvcC1sZXZlbCBub2RlcyBhbmQgZWRnZXMgYXJyYXlzLicpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBub2RlczogY2FuZGlkYXRlLm5vZGVzIGFzIEFwaU1lcmdlZEdyYXBoRGF0YVsnbm9kZXMnXSxcbiAgICBlZGdlczogY2FuZGlkYXRlLmVkZ2VzIGFzIEFwaU1lcmdlZEdyYXBoRGF0YVsnZWRnZXMnXSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlRG9jdW1lbnRVcGxvYWRlZEdyYXBoU2hhcGUocGF5bG9hZDogdW5rbm93bik6IEFwaURvY3VtZW50R3JhcGhEYXRhIHtcbiAgaWYgKCFwYXlsb2FkIHx8IHR5cGVvZiBwYXlsb2FkICE9PSAnb2JqZWN0JyB8fCBBcnJheS5pc0FycmF5KHBheWxvYWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgdXBsb2FkZWQgZmlsZSBtdXN0IGJlIGEgZG9jdW1lbnQgZ3JhcGggSlNPTiBvYmplY3Qgd2l0aCBub2RlcyBhbmQgZWRnZXMuJyk7XG4gIH1cblxuICBjb25zdCBjYW5kaWRhdGUgPSBwYXlsb2FkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBpZiAoIUFycmF5LmlzQXJyYXkoY2FuZGlkYXRlLm5vZGVzKSB8fCAhQXJyYXkuaXNBcnJheShjYW5kaWRhdGUuZWRnZXMpIHx8IHR5cGVvZiBjYW5kaWRhdGUuc291cmNlICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBFcnJvcignVGhlIHVwbG9hZGVkIGRvY3VtZW50IGFydGlmYWN0IG11c3QgaW5jbHVkZSBzb3VyY2UsIG5vZGVzLCBhbmQgZWRnZXMuJyk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHNvdXJjZTogY2FuZGlkYXRlLnNvdXJjZSBhcyBBcGlEb2N1bWVudEdyYXBoRGF0YVsnc291cmNlJ10sXG4gICAgaW5nZXN0aW9uX2lkOiBudWxsLFxuICAgIG5vZGVzOiBjYW5kaWRhdGUubm9kZXMgYXMgQXBpRG9jdW1lbnRHcmFwaERhdGFbJ25vZGVzJ10sXG4gICAgZWRnZXM6IGNhbmRpZGF0ZS5lZGdlcyBhcyBBcGlEb2N1bWVudEdyYXBoRGF0YVsnZWRnZXMnXSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gaXNPcGVyYXRpb25hbEFydGlmYWN0UGF5bG9hZChwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikge1xuICBjb25zdCBmaXJzdE5vZGUgPSBBcnJheS5pc0FycmF5KHBheWxvYWQubm9kZXMpID8gcGF5bG9hZC5ub2Rlc1swXSA6IG51bGw7XG4gIGNvbnN0IGZpcnN0RWRnZSA9IEFycmF5LmlzQXJyYXkocGF5bG9hZC5lZGdlcykgPyBwYXlsb2FkLmVkZ2VzWzBdIDogbnVsbDtcbiAgaWYgKEFycmF5LmlzQXJyYXkocGF5bG9hZC5ub2RlcykgJiYgcGF5bG9hZC5ub2Rlcy5sZW5ndGggPT09IDAgJiYgQXJyYXkuaXNBcnJheShwYXlsb2FkLmVkZ2VzKSAmJiBwYXlsb2FkLmVkZ2VzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0eXBlb2YgcGF5bG9hZC5zb3VyY2UgIT09ICdzdHJpbmcnO1xuICB9XG4gIHJldHVybiAoXG4gICAgISFmaXJzdE5vZGUgJiZcbiAgICB0eXBlb2YgZmlyc3ROb2RlID09PSAnb2JqZWN0JyAmJlxuICAgIGZpcnN0Tm9kZSAhPT0gbnVsbCAmJlxuICAgICduYW1lJyBpbiBmaXJzdE5vZGUgJiZcbiAgICAndHlwZScgaW4gZmlyc3ROb2RlICYmXG4gICAgJ3Jpc2tfc2NvcmUnIGluIGZpcnN0Tm9kZSAmJlxuICAgICghIWZpcnN0RWRnZVxuICAgICAgPyB0eXBlb2YgZmlyc3RFZGdlID09PSAnb2JqZWN0JyAmJiBmaXJzdEVkZ2UgIT09IG51bGwgJiYgJ3JlbGF0aW9uJyBpbiBmaXJzdEVkZ2UgJiYgJ3JhdGlvbmFsZScgaW4gZmlyc3RFZGdlXG4gICAgICA6IHRydWUpXG4gICk7XG59XG5cbmZ1bmN0aW9uIGlzRG9jdW1lbnRBcnRpZmFjdFBheWxvYWQocGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHtcbiAgY29uc3QgZmlyc3ROb2RlID0gQXJyYXkuaXNBcnJheShwYXlsb2FkLm5vZGVzKSA/IHBheWxvYWQubm9kZXNbMF0gOiBudWxsO1xuICBjb25zdCBmaXJzdEVkZ2UgPSBBcnJheS5pc0FycmF5KHBheWxvYWQuZWRnZXMpID8gcGF5bG9hZC5lZGdlc1swXSA6IG51bGw7XG4gIGlmIChBcnJheS5pc0FycmF5KHBheWxvYWQubm9kZXMpICYmIHBheWxvYWQubm9kZXMubGVuZ3RoID09PSAwICYmIEFycmF5LmlzQXJyYXkocGF5bG9hZC5lZGdlcykgJiYgcGF5bG9hZC5lZGdlcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHlwZW9mIHBheWxvYWQuc291cmNlID09PSAnc3RyaW5nJztcbiAgfVxuICByZXR1cm4gKFxuICAgIHR5cGVvZiBwYXlsb2FkLnNvdXJjZSA9PT0gJ3N0cmluZycgJiZcbiAgICAhIWZpcnN0Tm9kZSAmJlxuICAgIHR5cGVvZiBmaXJzdE5vZGUgPT09ICdvYmplY3QnICYmXG4gICAgZmlyc3ROb2RlICE9PSBudWxsICYmXG4gICAgJ2xhYmVsJyBpbiBmaXJzdE5vZGUgJiZcbiAgICAna2luZCcgaW4gZmlyc3ROb2RlICYmXG4gICAgJ2Nhbm9uaWNhbF9uYW1lJyBpbiBmaXJzdE5vZGUgJiZcbiAgICAoISFmaXJzdEVkZ2VcbiAgICAgID8gdHlwZW9mIGZpcnN0RWRnZSA9PT0gJ29iamVjdCcgJiYgZmlyc3RFZGdlICE9PSBudWxsICYmICd0eXBlJyBpbiBmaXJzdEVkZ2UgJiYgJ3N1bW1hcnknIGluIGZpcnN0RWRnZVxuICAgICAgOiB0cnVlKVxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VVcGxvYWRlZEdyYXBoSnNvbihmaWxlQ29udGVudHM6IHN0cmluZyk6IHtcbiAga2luZDogVXBsb2FkZWRBcnRpZmFjdEtpbmQ7XG4gIHJhd0RhdGE6IEFwaU1lcmdlZEdyYXBoRGF0YSB8IEFwaURvY3VtZW50R3JhcGhEYXRhO1xufSB7XG4gIGxldCBwYXJzZWQ6IHVua25vd247XG4gIHRyeSB7XG4gICAgcGFyc2VkID0gSlNPTi5wYXJzZShmaWxlQ29udGVudHMpO1xuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBzZWxlY3RlZCBmaWxlIGlzIG5vdCB2YWxpZCBKU09OLicpO1xuICB9XG5cbiAgaWYgKCFwYXJzZWQgfHwgdHlwZW9mIHBhcnNlZCAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShwYXJzZWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgdXBsb2FkZWQgZmlsZSBtdXN0IGJlIGEgSlNPTiBvYmplY3Qgd2l0aCBncmFwaCBub2RlcyBhbmQgZWRnZXMuJyk7XG4gIH1cblxuICBjb25zdCBjYW5kaWRhdGUgPSBwYXJzZWQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGlmICghQXJyYXkuaXNBcnJheShjYW5kaWRhdGUubm9kZXMpIHx8ICFBcnJheS5pc0FycmF5KGNhbmRpZGF0ZS5lZGdlcykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSB1cGxvYWRlZCBmaWxlIG11c3QgaW5jbHVkZSB0b3AtbGV2ZWwgbm9kZXMgYW5kIGVkZ2VzIGFycmF5cy4nKTtcbiAgfVxuXG4gIGlmIChpc09wZXJhdGlvbmFsQXJ0aWZhY3RQYXlsb2FkKGNhbmRpZGF0ZSkpIHtcbiAgICByZXR1cm4ge1xuICAgICAga2luZDogJ29wZXJhdGlvbmFsJyxcbiAgICAgIHJhd0RhdGE6IGVuc3VyZU9wZXJhdGlvbmFsVXBsb2FkZWRHcmFwaFNoYXBlKGNhbmRpZGF0ZSksXG4gICAgfTtcbiAgfVxuXG4gIGlmIChpc0RvY3VtZW50QXJ0aWZhY3RQYXlsb2FkKGNhbmRpZGF0ZSkpIHtcbiAgICByZXR1cm4ge1xuICAgICAga2luZDogJ2RvY3VtZW50JyxcbiAgICAgIHJhd0RhdGE6IGVuc3VyZURvY3VtZW50VXBsb2FkZWRHcmFwaFNoYXBlKGNhbmRpZGF0ZSksXG4gICAgfTtcbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcignVGhlIHVwbG9hZGVkIEpTT04gZG9lcyBub3QgbWF0Y2ggYSBzdXBwb3J0ZWQgb3BlcmF0aW9uYWwgb3IgZG9jdW1lbnQgZ3JhcGggYXJ0aWZhY3Qgc2NoZW1hLicpO1xufVxuXG5mdW5jdGlvbiB0b0ZyaWVuZGx5TWVzc2FnZShlcnJvcjogdW5rbm93bikge1xuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlDbGllbnRFcnJvcikge1xuICAgIHJldHVybiBlcnJvci5tZXNzYWdlO1xuICB9XG5cbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICByZXR1cm4gZXJyb3IubWVzc2FnZTtcbiAgfVxuXG4gIHJldHVybiAnQW4gdW5leHBlY3RlZCBmcm9udGVuZCBlcnJvciBvY2N1cnJlZC4nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gQXBwUHJvdmlkZXIoeyBjaGlsZHJlbiB9OiB7IGNoaWxkcmVuOiBSZWFjdE5vZGUgfSkge1xuICBjb25zdCBbdXBsb2FkLCBzZXRVcGxvYWRdID0gdXNlU3RhdGU8VXBsb2FkU3RhdGU+KGluaXRpYWxVcGxvYWRTdGF0ZSk7XG4gIGNvbnN0IFtncmFwaCwgc2V0R3JhcGhdID0gdXNlU3RhdGU8R3JhcGhTdGF0ZT4oaW5pdGlhbEdyYXBoU3RhdGUpO1xuICBjb25zdCBbZG9jdW1lbnRVcGxvYWQsIHNldERvY3VtZW50VXBsb2FkXSA9IHVzZVN0YXRlPERvY3VtZW50VXBsb2FkU3RhdGU+KGluaXRpYWxEb2N1bWVudFVwbG9hZFN0YXRlKTtcbiAgY29uc3QgW2RvY3VtZW50R3JhcGgsIHNldERvY3VtZW50R3JhcGhdID0gdXNlU3RhdGU8RG9jdW1lbnRHcmFwaFN0YXRlPihpbml0aWFsRG9jdW1lbnRHcmFwaFN0YXRlKTtcbiAgY29uc3QgW3VwbG9hZGVkR3JhcGhVcGxvYWQsIHNldFVwbG9hZGVkR3JhcGhVcGxvYWRdID0gdXNlU3RhdGU8VXBsb2FkZWRHcmFwaFVwbG9hZFN0YXRlPihpbml0aWFsVXBsb2FkZWRHcmFwaFVwbG9hZFN0YXRlKTtcbiAgY29uc3QgW3VwbG9hZGVkR3JhcGgsIHNldFVwbG9hZGVkR3JhcGhdID0gdXNlU3RhdGU8VXBsb2FkZWRHcmFwaFN0YXRlPihpbml0aWFsVXBsb2FkZWRHcmFwaFN0YXRlKTtcbiAgY29uc3QgcHJvY2Vzc2luZ1Byb21pc2VSZWYgPSB1c2VSZWY8UHJvbWlzZTx2b2lkPiB8IG51bGw+KG51bGwpO1xuICBjb25zdCBkb2N1bWVudFByb2Nlc3NpbmdQcm9taXNlUmVmID0gdXNlUmVmPFByb21pc2U8dm9pZD4gfCBudWxsPihudWxsKTtcblxuICBjb25zdCBnZXREb2N1bWVudEFydGlmYWN0c1dpdGhSZXRyeSA9IHVzZUNhbGxiYWNrKGFzeW5jIChpbmdlc3Rpb25JZDogc3RyaW5nKSA9PiB7XG4gICAgbGV0IGxhc3RFcnJvcjogdW5rbm93biA9IG51bGw7XG4gICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCBET0NVTUVOVF9BUlRJRkFDVF9GRVRDSF9BVFRFTVBUUzsgYXR0ZW1wdCArPSAxKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gYXdhaXQgZ2V0RG9jdW1lbnRBcnRpZmFjdHMoaW5nZXN0aW9uSWQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbGFzdEVycm9yID0gZXJyb3I7XG4gICAgICAgIGlmIChhdHRlbXB0IDwgRE9DVU1FTlRfQVJUSUZBQ1RfRkVUQ0hfQVRURU1QVFMgLSAxKSB7XG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHdpbmRvdy5zZXRUaW1lb3V0KHJlc29sdmUsIERPQ1VNRU5UX0FSVElGQUNUX0ZFVENIX0RFTEFZX01TKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbGFzdEVycm9yO1xuICB9LCBbXSk7XG5cbiAgY29uc3Qgc2V0RHJhZ0FjdGl2ZSA9IHVzZUNhbGxiYWNrKChhY3RpdmU6IGJvb2xlYW4pID0+IHtcbiAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+IHtcbiAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdkcmFnLWhvdmVyJywgc3RhdHVzTWVzc2FnZTogJ0Ryb3AgdGhlIGZpbGUgdG8gcXVldWUgaXQgZm9yIGluZ2VzdGlvbi4nIH07XG4gICAgICB9XG5cbiAgICAgIGlmIChjdXJyZW50LnNlbGVjdGVkRmlsZSkge1xuICAgICAgICByZXR1cm4geyAuLi5jdXJyZW50LCBwaGFzZTogJ2ZpbGUtc2VsZWN0ZWQnLCBzdGF0dXNNZXNzYWdlOiBgUmVhZHkgdG8gYW5hbHl6ZSAke2N1cnJlbnQuc2VsZWN0ZWRGaWxlLm5hbWV9LmAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdpZGxlJywgc3RhdHVzTWVzc2FnZTogaW5pdGlhbFVwbG9hZFN0YXRlLnN0YXR1c01lc3NhZ2UgfTtcbiAgICB9KTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHNlbGVjdEZpbGUgPSB1c2VDYWxsYmFjaygoZmlsZTogRmlsZSB8IG51bGwpID0+IHtcbiAgICBjb25zdCBuZXh0U3RhdGUgPSB2YWxpZGF0ZVNlbGVjdGVkRmlsZShmaWxlLCBhcHBDb25maWcubWF4VXBsb2FkQnl0ZXMpO1xuICAgIHNldFVwbG9hZChuZXh0U3RhdGUpO1xuICAgIHJldHVybiBuZXh0U3RhdGUucGhhc2UgPT09ICdmaWxlLXNlbGVjdGVkJztcbiAgfSwgW10pO1xuXG4gIGNvbnN0IGNsZWFyU2VsZWN0ZWRGaWxlID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIHNldFVwbG9hZChpbml0aWFsVXBsb2FkU3RhdGUpO1xuICB9LCBbXSk7XG5cbiAgY29uc3Qgc2V0RG9jdW1lbnREcmFnQWN0aXZlID0gdXNlQ2FsbGJhY2soKGFjdGl2ZTogYm9vbGVhbikgPT4ge1xuICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PiB7XG4gICAgICBpZiAoYWN0aXZlKSB7XG4gICAgICAgIHJldHVybiB7IC4uLmN1cnJlbnQsIHBoYXNlOiAnZHJhZy1ob3ZlcicsIHN0YXR1c01lc3NhZ2U6ICdEcm9wIHRoZSBkb2N1bWVudCB0byBxdWV1ZSBpdCBmb3IgZ3JhcGggZXh0cmFjdGlvbi4nIH07XG4gICAgICB9XG5cbiAgICAgIGlmIChjdXJyZW50LnNlbGVjdGVkRmlsZSkge1xuICAgICAgICByZXR1cm4geyAuLi5jdXJyZW50LCBwaGFzZTogJ2ZpbGUtc2VsZWN0ZWQnLCBzdGF0dXNNZXNzYWdlOiBgUmVhZHkgdG8gbWFwICR7Y3VycmVudC5zZWxlY3RlZEZpbGUubmFtZX0uYCB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyAuLi5jdXJyZW50LCBwaGFzZTogJ2lkbGUnLCBzdGF0dXNNZXNzYWdlOiBpbml0aWFsRG9jdW1lbnRVcGxvYWRTdGF0ZS5zdGF0dXNNZXNzYWdlIH07XG4gICAgfSk7XG4gIH0sIFtdKTtcblxuICBjb25zdCBzZWxlY3REb2N1bWVudEZpbGUgPSB1c2VDYWxsYmFjaygoZmlsZTogRmlsZSB8IG51bGwpID0+IHtcbiAgICBjb25zdCBuZXh0U3RhdGUgPSB2YWxpZGF0ZVNlbGVjdGVkRG9jdW1lbnRGaWxlKGZpbGUsIGFwcENvbmZpZy5tYXhVcGxvYWRCeXRlcyk7XG4gICAgc2V0RG9jdW1lbnRVcGxvYWQobmV4dFN0YXRlKTtcbiAgICByZXR1cm4gbmV4dFN0YXRlLnBoYXNlID09PSAnZmlsZS1zZWxlY3RlZCc7XG4gIH0sIFtdKTtcblxuICBjb25zdCBjbGVhclNlbGVjdGVkRG9jdW1lbnRGaWxlID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIHNldERvY3VtZW50VXBsb2FkKGluaXRpYWxEb2N1bWVudFVwbG9hZFN0YXRlKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHNldFVwbG9hZGVkR3JhcGhEcmFnQWN0aXZlID0gdXNlQ2FsbGJhY2soKGFjdGl2ZTogYm9vbGVhbikgPT4ge1xuICAgIHNldFVwbG9hZGVkR3JhcGhVcGxvYWQoKGN1cnJlbnQpID0+IHtcbiAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdkcmFnLWhvdmVyJywgc3RhdHVzTWVzc2FnZTogJ0Ryb3AgbWVyZ2VkX2dyYXBoLmpzb24gdG8gb3BlbiBpdCBsb2NhbGx5LicgfTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnQuc2VsZWN0ZWRGaWxlKSB7XG4gICAgICAgIHJldHVybiB7IC4uLmN1cnJlbnQsIHBoYXNlOiAnZmlsZS1zZWxlY3RlZCcsIHN0YXR1c01lc3NhZ2U6IGBSZWFkeSB0byBpbnNwZWN0ICR7Y3VycmVudC5zZWxlY3RlZEZpbGUubmFtZX0uYCB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyAuLi5jdXJyZW50LCBwaGFzZTogJ2lkbGUnLCBzdGF0dXNNZXNzYWdlOiBpbml0aWFsVXBsb2FkZWRHcmFwaFVwbG9hZFN0YXRlLnN0YXR1c01lc3NhZ2UgfTtcbiAgICB9KTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHNlbGVjdFVwbG9hZGVkR3JhcGhGaWxlID0gdXNlQ2FsbGJhY2soKGZpbGU6IEZpbGUgfCBudWxsKSA9PiB7XG4gICAgY29uc3QgbmV4dFN0YXRlID0gdmFsaWRhdGVTZWxlY3RlZFVwbG9hZGVkR3JhcGhGaWxlKGZpbGUsIGFwcENvbmZpZy5tYXhVcGxvYWRCeXRlcyk7XG4gICAgc2V0VXBsb2FkZWRHcmFwaFVwbG9hZChuZXh0U3RhdGUpO1xuICAgIGlmIChuZXh0U3RhdGUucGhhc2UgIT09ICdmaWxlLXNlbGVjdGVkJykge1xuICAgICAgc2V0VXBsb2FkZWRHcmFwaChpbml0aWFsVXBsb2FkZWRHcmFwaFN0YXRlKTtcbiAgICB9XG4gICAgcmV0dXJuIG5leHRTdGF0ZS5waGFzZSA9PT0gJ2ZpbGUtc2VsZWN0ZWQnO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgY2xlYXJTZWxlY3RlZFVwbG9hZGVkR3JhcGhGaWxlID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIHNldFVwbG9hZGVkR3JhcGhVcGxvYWQoaW5pdGlhbFVwbG9hZGVkR3JhcGhVcGxvYWRTdGF0ZSk7XG4gICAgc2V0VXBsb2FkZWRHcmFwaChpbml0aWFsVXBsb2FkZWRHcmFwaFN0YXRlKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IGxvYWRHcmFwaCA9IHVzZUNhbGxiYWNrKGFzeW5jIChvcHRpb25zPzogeyBrZWVwU3RhdHVzPzogYm9vbGVhbiB9KSA9PiB7XG4gICAgc2V0R3JhcGgoKGN1cnJlbnQpID0+ICh7XG4gICAgICAuLi5jdXJyZW50LFxuICAgICAgc3RhdHVzOiAnbG9hZGluZycsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICB9KSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IGdldEdyYXBoKCk7XG4gICAgICBjb25zdCBhZGFwdGVkR3JhcGggPSBhZGFwdEdyYXBoKHBheWxvYWQpO1xuICAgICAgc2V0R3JhcGgoe1xuICAgICAgICBzdGF0dXM6ICdyZWFkeScsXG4gICAgICAgIGRhdGE6IGFkYXB0ZWRHcmFwaCxcbiAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgIGxhc3RMb2FkZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIW9wdGlvbnM/LmtlZXBTdGF0dXMpIHtcbiAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGN1cnJlbnQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCBjdXJyZW50LnBoYXNlID09PSAnZW1wdHktZ3JhcGgnKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VycmVudDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICAgIHBoYXNlOiBhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwID8gJ2VtcHR5LWdyYXBoJyA6IGN1cnJlbnQucGhhc2UsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0b0ZyaWVuZGx5TWVzc2FnZShlcnJvcik7XG4gICAgICBzZXRHcmFwaCh7XG4gICAgICAgIHN0YXR1czogJ2Vycm9yJyxcbiAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgZXJyb3I6IG1lc3NhZ2UsXG4gICAgICAgIGxhc3RMb2FkZWRBdDogbnVsbCxcbiAgICAgIH0pO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9LCBbXSk7XG5cbiAgY29uc3QgbG9hZERvY3VtZW50R3JhcGggPSB1c2VDYWxsYmFjayhhc3luYyAob3B0aW9ucz86IHsga2VlcFN0YXR1cz86IGJvb2xlYW4gfSkgPT4ge1xuICAgIHNldERvY3VtZW50R3JhcGgoKGN1cnJlbnQpID0+ICh7XG4gICAgICAuLi5jdXJyZW50LFxuICAgICAgc3RhdHVzOiAnbG9hZGluZycsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIGFydGlmYWN0c0Vycm9yOiBjdXJyZW50LmFydGlmYWN0c0Vycm9yLFxuICAgIH0pKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYXlsb2FkID0gYXdhaXQgZ2V0RG9jdW1lbnRHcmFwaCgpO1xuICAgICAgY29uc3QgYWRhcHRlZEdyYXBoID0gYWRhcHREb2N1bWVudEdyYXBoKHBheWxvYWQpO1xuICAgICAgY29uc3QgYXJ0aWZhY3RNYW5pZmVzdCA9IGFkYXB0ZWRHcmFwaC5pbmdlc3Rpb25JZFxuICAgICAgICA/IGF3YWl0IGdldERvY3VtZW50QXJ0aWZhY3RzV2l0aFJldHJ5KGFkYXB0ZWRHcmFwaC5pbmdlc3Rpb25JZCkuY2F0Y2goKCkgPT4gbnVsbClcbiAgICAgICAgOiBudWxsO1xuICAgICAgc2V0RG9jdW1lbnRHcmFwaCh7XG4gICAgICAgIHN0YXR1czogJ3JlYWR5JyxcbiAgICAgICAgZGF0YTogYWRhcHRlZEdyYXBoLFxuICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgbGFzdExvYWRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICBhcnRpZmFjdHM6IGFydGlmYWN0TWFuaWZlc3QsXG4gICAgICAgIGFydGlmYWN0c0Vycm9yOlxuICAgICAgICAgIGFkYXB0ZWRHcmFwaC5pbmdlc3Rpb25JZCAmJiAhYXJ0aWZhY3RNYW5pZmVzdFxuICAgICAgICAgICAgPyAnU291cmNlIG1hdGVyaWFscyBhcmUgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUgZm9yIHRoaXMgZG9jdW1lbnQgcmlnaHQgbm93LidcbiAgICAgICAgICAgIDogIWFkYXB0ZWRHcmFwaC5pbmdlc3Rpb25JZFxuICAgICAgICAgICAgICA/ICdTb3VyY2UgbWF0ZXJpYWwgZG93bmxvYWRzIGFyZSB1bmF2YWlsYWJsZSBiZWNhdXNlIHRoaXMgZG9jdW1lbnQgZ3JhcGggd2FzIGxvYWRlZCB3aXRob3V0IGFuIGluZ2VzdGlvbiBJRC4nXG4gICAgICAgICAgICAgIDogbnVsbCxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIW9wdGlvbnM/LmtlZXBTdGF0dXMpIHtcbiAgICAgICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+IHtcbiAgICAgICAgICBpZiAoY3VycmVudC5waGFzZSA9PT0gJ3N1Y2Nlc3MnIHx8IGN1cnJlbnQucGhhc2UgPT09ICdlbXB0eS1ncmFwaCcpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJyZW50O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgICAgcGhhc2U6IGFkYXB0ZWRHcmFwaC5ub2Rlcy5sZW5ndGggPT09IDAgPyAnZW1wdHktZ3JhcGgnIDogY3VycmVudC5waGFzZSxcbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IHRvRnJpZW5kbHlNZXNzYWdlKGVycm9yKTtcbiAgICAgIHNldERvY3VtZW50R3JhcGgoe1xuICAgICAgICBzdGF0dXM6ICdlcnJvcicsXG4gICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgIGVycm9yOiBtZXNzYWdlLFxuICAgICAgICBsYXN0TG9hZGVkQXQ6IG51bGwsXG4gICAgICAgIGFydGlmYWN0czogbnVsbCxcbiAgICAgICAgYXJ0aWZhY3RzRXJyb3I6IG51bGwsXG4gICAgICB9KTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfSwgW10pO1xuXG4gIGNvbnN0IGJlZ2luUHJvY2Vzc2luZyA9IHVzZUNhbGxiYWNrKGFzeW5jICgpID0+IHtcbiAgICBpZiAoIXVwbG9hZC5zZWxlY3RlZEZpbGUpIHtcbiAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgcGhhc2U6ICdlcnJvcicsXG4gICAgICAgIGVycm9yOiAnQ2hvb3NlIGEgLm1kIG9yIC50eHQgZmlsZSBiZWZvcmUgcHJvY2Vzc2luZy4nLFxuICAgICAgICBzdGF0dXNNZXNzYWdlOiAnTm8gZmlsZSBzZWxlY3RlZC4nLFxuICAgICAgfSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChwcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50KSB7XG4gICAgICByZXR1cm4gcHJvY2Vzc2luZ1Byb21pc2VSZWYuY3VycmVudDtcbiAgICB9XG5cbiAgICBjb25zdCBzZWxlY3RlZEZpbGUgPSB1cGxvYWQuc2VsZWN0ZWRGaWxlO1xuXG4gICAgY29uc3QgdGFzayA9IChhc3luYyAoKSA9PiB7XG4gICAgICBsZXQgcHJvY2Vzc2luZ1BoYXNlVGltZXIgPSAwO1xuICAgICAgY29uc3QgaW5nZXN0aW9uSWQgPSBjcnlwdG8ucmFuZG9tVVVJRCgpO1xuICAgICAgbGV0IGtlZXBQb2xsaW5nID0gdHJ1ZTtcblxuICAgICAgY29uc3QgcG9sbFByb2Nlc3NpbmcgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgIHdoaWxlIChrZWVwUG9sbGluZykge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzaW5nU3RhdHVzID0gYXdhaXQgZ2V0UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZCk7XG4gICAgICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+XG4gICAgICAgICAgICAgIGN1cnJlbnQuaW5nZXN0aW9uSWQgIT09IGluZ2VzdGlvbklkXG4gICAgICAgICAgICAgICAgPyBjdXJyZW50XG4gICAgICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXMsXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c01lc3NhZ2U6IHByb2Nlc3NpbmdTdGF0dXMubGF0ZXN0X2V2ZW50IHx8IGN1cnJlbnQuc3RhdHVzTWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAvLyBQb2xsaW5nIGlzIGJlc3QtZWZmb3J0IHNvIHRoZSBtYWluIHVwbG9hZCBmbG93IGNhbiBjb250aW51ZSBldmVuIGlmIHN0YXR1cyByZWZyZXNoIGZhaWxzLlxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICgha2VlcFBvbGxpbmcpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB3aW5kb3cuc2V0VGltZW91dChyZXNvbHZlLCA4MDApKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgcGhhc2U6ICd1cGxvYWRpbmcnLFxuICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6IGBVcGxvYWRpbmcgJHtzZWxlY3RlZEZpbGUubmFtZX0uLi5gLFxuICAgICAgICAgIGluZ2VzdGlvbklkLFxuICAgICAgICAgIHN0YXJ0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgICBjb21wbGV0ZWRBdDogbnVsbCxcbiAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzOiB7XG4gICAgICAgICAgICBpbmdlc3Rpb25faWQ6IGluZ2VzdGlvbklkLFxuICAgICAgICAgICAgc3RhdGU6ICdwZW5kaW5nJyxcbiAgICAgICAgICAgIGZpbGVuYW1lOiBzZWxlY3RlZEZpbGUubmFtZSxcbiAgICAgICAgICAgIGNodW5rc190b3RhbDogbnVsbCxcbiAgICAgICAgICAgIGN1cnJlbnRfY2h1bms6IG51bGwsXG4gICAgICAgICAgICBzdGFydGVkX2F0OiBudWxsLFxuICAgICAgICAgICAgY29tcGxldGVkX2F0OiBudWxsLFxuICAgICAgICAgICAgbGF0ZXN0X2V2ZW50OiBgVXBsb2FkaW5nICR7c2VsZWN0ZWRGaWxlLm5hbWV9Li4uYCxcbiAgICAgICAgICAgIGV2ZW50czogW10sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIGNvbnN0IHBvbGxpbmdUYXNrID0gcG9sbFByb2Nlc3NpbmcoKTtcblxuICAgICAgICBwcm9jZXNzaW5nUGhhc2VUaW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+XG4gICAgICAgICAgICBjdXJyZW50LnBoYXNlID09PSAndXBsb2FkaW5nJ1xuICAgICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgICAgICAgICBwaGFzZTogJ3Byb2Nlc3NpbmcnLFxuICAgICAgICAgICAgICAgICAgc3RhdHVzTWVzc2FnZTogJ0V4dHJhY3RpbmcgY29tcG9uZW50cywgcmVsYXRpb25zaGlwcywgYW5kIHJpc2sgbWV0cmljcy4uLicsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICA6IGN1cnJlbnRcbiAgICAgICAgICApO1xuICAgICAgICB9LCA5MDApO1xuXG4gICAgICAgIGNvbnN0IGluZ2VzdGlvbiA9IGF3YWl0IHVwbG9hZERvY3VtZW50KHNlbGVjdGVkRmlsZSwgdHJ1ZSwgYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMsIGluZ2VzdGlvbklkKTtcbiAgICAgICAgY29uc3QgbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyA9IGF3YWl0IGdldFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQpLmNhdGNoKCgpID0+IG51bGwpO1xuXG4gICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIGluZ2VzdGlvbixcbiAgICAgICAgICBwaGFzZTogJ3Byb2Nlc3NpbmcnLFxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXM/LmxhdGVzdF9ldmVudCB8fCAnTG9hZGluZyB0aGUgZ2VuZXJhdGVkIGdyYXBoIHdvcmtzcGFjZS4uLicsXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czogbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyB8fCBjdXJyZW50LnByb2Nlc3NpbmdTdGF0dXMsXG4gICAgICAgIH0pKTtcblxuICAgICAgICBjb25zdCBncmFwaFBheWxvYWQgPSBhd2FpdCBnZXRHcmFwaCgpO1xuICAgICAgICBjb25zdCBhZGFwdGVkR3JhcGggPSBhZGFwdEdyYXBoKGdyYXBoUGF5bG9hZCk7XG5cbiAgICAgICAgc2V0R3JhcGgoe1xuICAgICAgICAgIHN0YXR1czogJ3JlYWR5JyxcbiAgICAgICAgICBkYXRhOiBhZGFwdGVkR3JhcGgsXG4gICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgbGFzdExvYWRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICB9KTtcblxuICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBpbmdlc3Rpb24sXG4gICAgICAgICAgaW5nZXN0aW9uSWQsXG4gICAgICAgICAgcGhhc2U6IGFkYXB0ZWRHcmFwaC5ub2Rlcy5sZW5ndGggPT09IDAgPyAnZW1wdHktZ3JhcGgnIDogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6XG4gICAgICAgICAgICBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzPy5sYXRlc3RfZXZlbnQgfHxcbiAgICAgICAgICAgIChhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgID8gJ1Byb2Nlc3NpbmcgY29tcGxldGVkLCBidXQgdGhlIGFjdGl2ZSBncmFwaCBpcyBlbXB0eS4nXG4gICAgICAgICAgICAgIDogJ1R3aW5HcmFwaE9wcyBmaW5pc2hlZCBwcm9jZXNzaW5nIHlvdXIgZG9jdW1lbnQuJyksXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czpcbiAgICAgICAgICAgIGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgPz9cbiAgICAgICAgICAgIGN1cnJlbnQucHJvY2Vzc2luZ1N0YXR1cyxcbiAgICAgICAgICBjb21wbGV0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgfSkpO1xuICAgICAgICBrZWVwUG9sbGluZyA9IGZhbHNlO1xuICAgICAgICBhd2FpdCBwb2xsaW5nVGFzaztcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGtlZXBQb2xsaW5nID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgPSBhd2FpdCBnZXRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkKS5jYXRjaCgoKSA9PiBudWxsKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRvRnJpZW5kbHlNZXNzYWdlKGVycm9yKTtcbiAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgcGhhc2U6ICdyZXRyeScsXG4gICAgICAgICAgZXJyb3I6IG1lc3NhZ2UsXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzOiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzIHx8IGN1cnJlbnQucHJvY2Vzc2luZ1N0YXR1cyxcbiAgICAgICAgICBjb21wbGV0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgICByZXRyeUNvdW50OiBjdXJyZW50LnJldHJ5Q291bnQgKyAxLFxuICAgICAgICB9KSk7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAga2VlcFBvbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dChwcm9jZXNzaW5nUGhhc2VUaW1lcik7XG4gICAgICAgIHByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgfVxuICAgIH0pKCk7XG5cbiAgICBwcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50ID0gdGFzaztcbiAgICByZXR1cm4gdGFzaztcbiAgfSwgW3VwbG9hZC5zZWxlY3RlZEZpbGVdKTtcblxuICBjb25zdCBiZWdpbkRvY3VtZW50UHJvY2Vzc2luZyA9IHVzZUNhbGxiYWNrKGFzeW5jICgpID0+IHtcbiAgICBpZiAoIWRvY3VtZW50VXBsb2FkLnNlbGVjdGVkRmlsZSkge1xuICAgICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgIHBoYXNlOiAnZXJyb3InLFxuICAgICAgICBlcnJvcjogJ0Nob29zZSBhIC5wZGYsIC5tZCwgb3IgLnR4dCBmaWxlIGJlZm9yZSBwcm9jZXNzaW5nLicsXG4gICAgICAgIHN0YXR1c01lc3NhZ2U6ICdObyBkb2N1bWVudCBzZWxlY3RlZC4nLFxuICAgICAgfSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChkb2N1bWVudFByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQpIHtcbiAgICAgIHJldHVybiBkb2N1bWVudFByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQ7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZWN0ZWRGaWxlID0gZG9jdW1lbnRVcGxvYWQuc2VsZWN0ZWRGaWxlO1xuXG4gICAgY29uc3QgdGFzayA9IChhc3luYyAoKSA9PiB7XG4gICAgICBsZXQgcHJvY2Vzc2luZ1BoYXNlVGltZXIgPSAwO1xuICAgICAgY29uc3QgaW5nZXN0aW9uSWQgPSBjcnlwdG8ucmFuZG9tVVVJRCgpO1xuICAgICAgbGV0IGtlZXBQb2xsaW5nID0gdHJ1ZTtcblxuICAgICAgY29uc3QgcG9sbFByb2Nlc3NpbmcgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgIHdoaWxlIChrZWVwUG9sbGluZykge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzaW5nU3RhdHVzID0gYXdhaXQgZ2V0RG9jdW1lbnRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkKTtcbiAgICAgICAgICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PlxuICAgICAgICAgICAgICBjdXJyZW50LmluZ2VzdGlvbklkICE9PSBpbmdlc3Rpb25JZFxuICAgICAgICAgICAgICAgID8gY3VycmVudFxuICAgICAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzLFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBwcm9jZXNzaW5nU3RhdHVzLmxhdGVzdF9ldmVudCB8fCBjdXJyZW50LnN0YXR1c01lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gUG9sbGluZyBpcyBiZXN0LWVmZm9ydCBzbyB0aGUgbWFpbiB1cGxvYWQgZmxvdyBjYW4gY29udGludWUuXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFrZWVwUG9sbGluZykge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHdpbmRvdy5zZXRUaW1lb3V0KHJlc29sdmUsIDgwMCkpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB0cnkge1xuICAgICAgICBzZXREb2N1bWVudFVwbG9hZCgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIHBoYXNlOiAndXBsb2FkaW5nJyxcbiAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBgVXBsb2FkaW5nICR7c2VsZWN0ZWRGaWxlLm5hbWV9Li4uYCxcbiAgICAgICAgICBpbmdlc3Rpb25JZCxcbiAgICAgICAgICBzdGFydGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgICAgY29tcGxldGVkQXQ6IG51bGwsXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czoge1xuICAgICAgICAgICAgaW5nZXN0aW9uX2lkOiBpbmdlc3Rpb25JZCxcbiAgICAgICAgICAgIHN0YXRlOiAncGVuZGluZycsXG4gICAgICAgICAgICBmaWxlbmFtZTogc2VsZWN0ZWRGaWxlLm5hbWUsXG4gICAgICAgICAgICBjaHVua3NfdG90YWw6IG51bGwsXG4gICAgICAgICAgICBjdXJyZW50X2NodW5rOiBudWxsLFxuICAgICAgICAgICAgc3RhcnRlZF9hdDogbnVsbCxcbiAgICAgICAgICAgIGNvbXBsZXRlZF9hdDogbnVsbCxcbiAgICAgICAgICAgIGxhdGVzdF9ldmVudDogYFVwbG9hZGluZyAke3NlbGVjdGVkRmlsZS5uYW1lfS4uLmAsXG4gICAgICAgICAgICBldmVudHM6IFtdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pKTtcblxuICAgICAgICBjb25zdCBwb2xsaW5nVGFzayA9IHBvbGxQcm9jZXNzaW5nKCk7XG5cbiAgICAgICAgcHJvY2Vzc2luZ1BoYXNlVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+XG4gICAgICAgICAgICBjdXJyZW50LnBoYXNlID09PSAndXBsb2FkaW5nJ1xuICAgICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgICAgICAgICBwaGFzZTogJ3Byb2Nlc3NpbmcnLFxuICAgICAgICAgICAgICAgICAgc3RhdHVzTWVzc2FnZTogJ0V4dHJhY3RpbmcgZG9jdW1lbnQgZW50aXRpZXMsIGV2aWRlbmNlLCBhbmQgcmVsYXRpb25zaGlwcy4uLicsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICA6IGN1cnJlbnRcbiAgICAgICAgICApO1xuICAgICAgICB9LCA5MDApO1xuXG4gICAgICAgIGNvbnN0IGluZ2VzdGlvbiA9IGF3YWl0IHVwbG9hZEtub3dsZWRnZURvY3VtZW50KHNlbGVjdGVkRmlsZSwgdHJ1ZSwgYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMsIGluZ2VzdGlvbklkKTtcbiAgICAgICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBpbmdlc3Rpb24sXG4gICAgICAgICAgcGhhc2U6ICdwcm9jZXNzaW5nJyxcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOiAnRG9jdW1lbnQgYWNjZXB0ZWQuIFdhaXRpbmcgZm9yIHByb2Nlc3NpbmcgcHJvZ3Jlc3MuLi4nLFxuICAgICAgICB9KSk7XG5cbiAgICAgICAgbGV0IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgPSBhd2FpdCBnZXREb2N1bWVudFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQpLmNhdGNoKCgpID0+IG51bGwpO1xuICAgICAgICB3aGlsZSAoa2VlcFBvbGxpbmcgJiYgbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cz8uc3RhdGUgIT09ICdzdWNjZWVkZWQnICYmIGxhdGVzdFByb2Nlc3NpbmdTdGF0dXM/LnN0YXRlICE9PSAnZmFpbGVkJykge1xuICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB3aW5kb3cuc2V0VGltZW91dChyZXNvbHZlLCA4MDApKTtcbiAgICAgICAgICBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzID0gYXdhaXQgZ2V0RG9jdW1lbnRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkKS5jYXRjaCgoKSA9PiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsYXRlc3RQcm9jZXNzaW5nU3RhdHVzPy5zdGF0ZSA9PT0gJ2ZhaWxlZCcpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoXG4gICAgICAgICAgICBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzLmxhdGVzdF9ldmVudCB8fCAnRG9jdW1lbnQgcHJvY2Vzc2luZyBmYWlsZWQgYmVmb3JlIHRoZSBncmFwaCB3YXMgcmVhZHkuJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29kZTogJ2RvY3VtZW50X3Byb2Nlc3NpbmdfZmFpbGVkJyxcbiAgICAgICAgICAgICAgcmV0cnlhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBncmFwaFBheWxvYWQgPSBhd2FpdCBnZXREb2N1bWVudEdyYXBoKCk7XG4gICAgICAgIGNvbnN0IGFkYXB0ZWRHcmFwaCA9IGFkYXB0RG9jdW1lbnRHcmFwaChncmFwaFBheWxvYWQpO1xuICAgICAgICBjb25zdCBhcnRpZmFjdE1hbmlmZXN0ID0gYWRhcHRlZEdyYXBoLmluZ2VzdGlvbklkXG4gICAgICAgICAgPyBhd2FpdCBnZXREb2N1bWVudEFydGlmYWN0c1dpdGhSZXRyeShhZGFwdGVkR3JhcGguaW5nZXN0aW9uSWQpLmNhdGNoKCgpID0+IG51bGwpXG4gICAgICAgICAgOiBudWxsO1xuXG4gICAgICAgIHNldERvY3VtZW50R3JhcGgoe1xuICAgICAgICAgIHN0YXR1czogJ3JlYWR5JyxcbiAgICAgICAgICBkYXRhOiBhZGFwdGVkR3JhcGgsXG4gICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgbGFzdExvYWRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICAgIGFydGlmYWN0czogYXJ0aWZhY3RNYW5pZmVzdCxcbiAgICAgICAgICBhcnRpZmFjdHNFcnJvcjpcbiAgICAgICAgICAgIGFkYXB0ZWRHcmFwaC5pbmdlc3Rpb25JZCAmJiAhYXJ0aWZhY3RNYW5pZmVzdFxuICAgICAgICAgICAgICA/ICdTb3VyY2UgbWF0ZXJpYWxzIGFyZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZSBmb3IgdGhpcyBkb2N1bWVudCByaWdodCBub3cuJ1xuICAgICAgICAgICAgICA6ICFhZGFwdGVkR3JhcGguaW5nZXN0aW9uSWRcbiAgICAgICAgICAgICAgICA/ICdTb3VyY2UgbWF0ZXJpYWwgZG93bmxvYWRzIGFyZSB1bmF2YWlsYWJsZSBiZWNhdXNlIHRoaXMgZG9jdW1lbnQgZ3JhcGggd2FzIGxvYWRlZCB3aXRob3V0IGFuIGluZ2VzdGlvbiBJRC4nXG4gICAgICAgICAgICAgICAgOiBudWxsLFxuICAgICAgICB9KTtcblxuICAgICAgICBzZXREb2N1bWVudFVwbG9hZCgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIGluZ2VzdGlvbixcbiAgICAgICAgICBpbmdlc3Rpb25JZCxcbiAgICAgICAgICBwaGFzZTogYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMCA/ICdlbXB0eS1ncmFwaCcgOiAnc3VjY2VzcycsXG4gICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTpcbiAgICAgICAgICAgIGxhdGVzdFByb2Nlc3NpbmdTdGF0dXM/LmxhdGVzdF9ldmVudCB8fFxuICAgICAgICAgICAgKGFkYXB0ZWRHcmFwaC5ub2Rlcy5sZW5ndGggPT09IDBcbiAgICAgICAgICAgICAgPyAnUHJvY2Vzc2luZyBjb21wbGV0ZWQsIGJ1dCB0aGUgZG9jdW1lbnQgZ3JhcGggaXMgZW1wdHkuJ1xuICAgICAgICAgICAgICA6ICdUd2luR3JhcGhPcHMgZmluaXNoZWQgbWFwcGluZyB5b3VyIGRvY3VtZW50LicpLFxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgPz8gY3VycmVudC5wcm9jZXNzaW5nU3RhdHVzLFxuICAgICAgICAgIGNvbXBsZXRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICB9KSk7XG4gICAgICAgIGtlZXBQb2xsaW5nID0gZmFsc2U7XG4gICAgICAgIGF3YWl0IHBvbGxpbmdUYXNrO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAga2VlcFBvbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyA9IGF3YWl0IGdldERvY3VtZW50UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZCkuY2F0Y2goKCkgPT4gbnVsbCk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0b0ZyaWVuZGx5TWVzc2FnZShlcnJvcik7XG4gICAgICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgcGhhc2U6ICdyZXRyeScsXG4gICAgICAgICAgZXJyb3I6IG1lc3NhZ2UsXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzOiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzIHx8IGN1cnJlbnQucHJvY2Vzc2luZ1N0YXR1cyxcbiAgICAgICAgICBjb21wbGV0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgICByZXRyeUNvdW50OiBjdXJyZW50LnJldHJ5Q291bnQgKyAxLFxuICAgICAgICB9KSk7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAga2VlcFBvbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dChwcm9jZXNzaW5nUGhhc2VUaW1lcik7XG4gICAgICAgIGRvY3VtZW50UHJvY2Vzc2luZ1Byb21pc2VSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICB9XG4gICAgfSkoKTtcblxuICAgIGRvY3VtZW50UHJvY2Vzc2luZ1Byb21pc2VSZWYuY3VycmVudCA9IHRhc2s7XG4gICAgcmV0dXJuIHRhc2s7XG4gIH0sIFtkb2N1bWVudFVwbG9hZC5zZWxlY3RlZEZpbGVdKTtcblxuICBjb25zdCBsb2FkVXBsb2FkZWRHcmFwaEZyb21TZWxlY3RlZEZpbGUgPSB1c2VDYWxsYmFjayhhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgc2VsZWN0ZWRGaWxlID0gdXBsb2FkZWRHcmFwaFVwbG9hZC5zZWxlY3RlZEZpbGU7XG4gICAgaWYgKCFzZWxlY3RlZEZpbGUpIHtcbiAgICAgIHNldFVwbG9hZGVkR3JhcGhVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgIHBoYXNlOiAnZXJyb3InLFxuICAgICAgICBlcnJvcjogJ0Nob29zZSBhIGdyYXBoIGFydGlmYWN0IEpTT04gZmlsZSBiZWZvcmUgb3BlbmluZyB0aGUgZ3JhcGggd29ya3NwYWNlLicsXG4gICAgICAgIHN0YXR1c01lc3NhZ2U6ICdObyBncmFwaCBmaWxlIHNlbGVjdGVkLicsXG4gICAgICB9KSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2V0VXBsb2FkZWRHcmFwaCgoY3VycmVudCkgPT4gKHtcbiAgICAgIC4uLmN1cnJlbnQsXG4gICAgICBzdGF0dXM6ICdsb2FkaW5nJyxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgZmlsZW5hbWU6IHNlbGVjdGVkRmlsZS5uYW1lLFxuICAgIH0pKTtcbiAgICBzZXRVcGxvYWRlZEdyYXBoVXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgLi4uY3VycmVudCxcbiAgICAgIHBoYXNlOiAndXBsb2FkaW5nJyxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgc3RhdHVzTWVzc2FnZTogYExvYWRpbmcgJHtzZWxlY3RlZEZpbGUubmFtZX0gbG9jYWxseS4uLmAsXG4gICAgfSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGZpbGVDb250ZW50cyA9IGF3YWl0IHNlbGVjdGVkRmlsZS50ZXh0KCk7XG4gICAgICBjb25zdCBwYXJzZWRBcnRpZmFjdCA9IHBhcnNlVXBsb2FkZWRHcmFwaEpzb24oZmlsZUNvbnRlbnRzKTtcbiAgICAgIGlmIChwYXJzZWRBcnRpZmFjdC5raW5kID09PSAnb3BlcmF0aW9uYWwnKSB7XG4gICAgICAgIGNvbnN0IGFkYXB0ZWRHcmFwaCA9IGFkYXB0TWVyZ2VkR3JhcGgocGFyc2VkQXJ0aWZhY3QucmF3RGF0YSBhcyBBcGlNZXJnZWRHcmFwaERhdGEsIHNlbGVjdGVkRmlsZS5uYW1lKTtcbiAgICAgICAgc2V0VXBsb2FkZWRHcmFwaCh7XG4gICAgICAgICAgc3RhdHVzOiAncmVhZHknLFxuICAgICAgICAgIGtpbmQ6ICdvcGVyYXRpb25hbCcsXG4gICAgICAgICAgb3BlcmF0aW9uYWxEYXRhOiBhZGFwdGVkR3JhcGgsXG4gICAgICAgICAgZG9jdW1lbnREYXRhOiBudWxsLFxuICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgIGxhc3RMb2FkZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgICBmaWxlbmFtZTogc2VsZWN0ZWRGaWxlLm5hbWUsXG4gICAgICAgICAgcmF3RGF0YTogcGFyc2VkQXJ0aWZhY3QucmF3RGF0YSxcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFVwbG9hZGVkR3JhcGhVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBwaGFzZTogYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMCA/ICdlbXB0eS1ncmFwaCcgOiAnc3VjY2VzcycsXG4gICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTpcbiAgICAgICAgICAgIGFkYXB0ZWRHcmFwaC5ub2Rlcy5sZW5ndGggPT09IDBcbiAgICAgICAgICAgICAgPyAnVGhlIHVwbG9hZGVkIG9wZXJhdGlvbmFsIGdyYXBoIGNvbnRhaW5zIG5vIG5vZGVzLidcbiAgICAgICAgICAgICAgOiBgTG9hZGVkIG9wZXJhdGlvbmFsIGdyYXBoIGFydGlmYWN0ICR7c2VsZWN0ZWRGaWxlLm5hbWV9LmAsXG4gICAgICAgIH0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGFkYXB0ZWRHcmFwaCA9IGFkYXB0RG9jdW1lbnRHcmFwaChwYXJzZWRBcnRpZmFjdC5yYXdEYXRhIGFzIEFwaURvY3VtZW50R3JhcGhEYXRhKTtcbiAgICAgICAgc2V0VXBsb2FkZWRHcmFwaCh7XG4gICAgICAgICAgc3RhdHVzOiAncmVhZHknLFxuICAgICAgICAgIGtpbmQ6ICdkb2N1bWVudCcsXG4gICAgICAgICAgb3BlcmF0aW9uYWxEYXRhOiBudWxsLFxuICAgICAgICAgIGRvY3VtZW50RGF0YTogYWRhcHRlZEdyYXBoLFxuICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgIGxhc3RMb2FkZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgICBmaWxlbmFtZTogc2VsZWN0ZWRGaWxlLm5hbWUsXG4gICAgICAgICAgcmF3RGF0YTogcGFyc2VkQXJ0aWZhY3QucmF3RGF0YSxcbiAgICAgICAgfSk7XG4gICAgICAgIHNldFVwbG9hZGVkR3JhcGhVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBwaGFzZTogYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMCA/ICdlbXB0eS1ncmFwaCcgOiAnc3VjY2VzcycsXG4gICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTpcbiAgICAgICAgICAgIGFkYXB0ZWRHcmFwaC5ub2Rlcy5sZW5ndGggPT09IDBcbiAgICAgICAgICAgICAgPyAnVGhlIHVwbG9hZGVkIGRvY3VtZW50IGdyYXBoIGNvbnRhaW5zIG5vIG5vZGVzLidcbiAgICAgICAgICAgICAgOiBgTG9hZGVkIGRvY3VtZW50IGdyYXBoIGFydGlmYWN0ICR7c2VsZWN0ZWRGaWxlLm5hbWV9LmAsXG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IHRvRnJpZW5kbHlNZXNzYWdlKGVycm9yKTtcbiAgICAgIHNldFVwbG9hZGVkR3JhcGgoe1xuICAgICAgICBzdGF0dXM6ICdlcnJvcicsXG4gICAgICAgIGtpbmQ6IG51bGwsXG4gICAgICAgIG9wZXJhdGlvbmFsRGF0YTogbnVsbCxcbiAgICAgICAgZG9jdW1lbnREYXRhOiBudWxsLFxuICAgICAgICBlcnJvcjogbWVzc2FnZSxcbiAgICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxuICAgICAgICBmaWxlbmFtZTogc2VsZWN0ZWRGaWxlLm5hbWUsXG4gICAgICAgIHJhd0RhdGE6IG51bGwsXG4gICAgICB9KTtcbiAgICAgIHNldFVwbG9hZGVkR3JhcGhVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgIHBoYXNlOiAnZXJyb3InLFxuICAgICAgICBlcnJvcjogbWVzc2FnZSxcbiAgICAgICAgc3RhdHVzTWVzc2FnZTogbWVzc2FnZSxcbiAgICAgIH0pKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfSwgW3VwbG9hZGVkR3JhcGhVcGxvYWQuc2VsZWN0ZWRGaWxlXSk7XG5cbiAgY29uc3QgcmVzZXRVcGxvYWRTdGF0ZSA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBzZXRVcGxvYWQoaW5pdGlhbFVwbG9hZFN0YXRlKTtcbiAgICBzZXREb2N1bWVudFVwbG9hZChpbml0aWFsRG9jdW1lbnRVcGxvYWRTdGF0ZSk7XG4gICAgc2V0VXBsb2FkZWRHcmFwaFVwbG9hZChpbml0aWFsVXBsb2FkZWRHcmFwaFVwbG9hZFN0YXRlKTtcbiAgICBzZXRVcGxvYWRlZEdyYXBoKGluaXRpYWxVcGxvYWRlZEdyYXBoU3RhdGUpO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgdmFsdWUgPSB1c2VNZW1vPEFwcENvbnRleHRWYWx1ZT4oXG4gICAgKCkgPT4gKHtcbiAgICAgIHVwbG9hZCxcbiAgICAgIGdyYXBoLFxuICAgICAgZG9jdW1lbnRVcGxvYWQsXG4gICAgICBkb2N1bWVudEdyYXBoLFxuICAgICAgdXBsb2FkZWRHcmFwaFVwbG9hZCxcbiAgICAgIHVwbG9hZGVkR3JhcGgsXG4gICAgICBzZXREcmFnQWN0aXZlLFxuICAgICAgc2VsZWN0RmlsZSxcbiAgICAgIGNsZWFyU2VsZWN0ZWRGaWxlLFxuICAgICAgYmVnaW5Qcm9jZXNzaW5nLFxuICAgICAgbG9hZEdyYXBoLFxuICAgICAgc2V0RG9jdW1lbnREcmFnQWN0aXZlLFxuICAgICAgc2VsZWN0RG9jdW1lbnRGaWxlLFxuICAgICAgY2xlYXJTZWxlY3RlZERvY3VtZW50RmlsZSxcbiAgICAgIGJlZ2luRG9jdW1lbnRQcm9jZXNzaW5nLFxuICAgICAgbG9hZERvY3VtZW50R3JhcGgsXG4gICAgICBzZXRVcGxvYWRlZEdyYXBoRHJhZ0FjdGl2ZSxcbiAgICAgIHNlbGVjdFVwbG9hZGVkR3JhcGhGaWxlLFxuICAgICAgY2xlYXJTZWxlY3RlZFVwbG9hZGVkR3JhcGhGaWxlLFxuICAgICAgbG9hZFVwbG9hZGVkR3JhcGhGcm9tU2VsZWN0ZWRGaWxlLFxuICAgICAgcmVzZXRVcGxvYWRTdGF0ZSxcbiAgICB9KSxcbiAgICBbXG4gICAgICB1cGxvYWQsXG4gICAgICBncmFwaCxcbiAgICAgIGRvY3VtZW50VXBsb2FkLFxuICAgICAgZG9jdW1lbnRHcmFwaCxcbiAgICAgIHVwbG9hZGVkR3JhcGhVcGxvYWQsXG4gICAgICB1cGxvYWRlZEdyYXBoLFxuICAgICAgc2V0RHJhZ0FjdGl2ZSxcbiAgICAgIHNlbGVjdEZpbGUsXG4gICAgICBjbGVhclNlbGVjdGVkRmlsZSxcbiAgICAgIGJlZ2luUHJvY2Vzc2luZyxcbiAgICAgIGxvYWRHcmFwaCxcbiAgICAgIHNldERvY3VtZW50RHJhZ0FjdGl2ZSxcbiAgICAgIHNlbGVjdERvY3VtZW50RmlsZSxcbiAgICAgIGNsZWFyU2VsZWN0ZWREb2N1bWVudEZpbGUsXG4gICAgICBiZWdpbkRvY3VtZW50UHJvY2Vzc2luZyxcbiAgICAgIGxvYWREb2N1bWVudEdyYXBoLFxuICAgICAgc2V0VXBsb2FkZWRHcmFwaERyYWdBY3RpdmUsXG4gICAgICBzZWxlY3RVcGxvYWRlZEdyYXBoRmlsZSxcbiAgICAgIGNsZWFyU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZSxcbiAgICAgIGxvYWRVcGxvYWRlZEdyYXBoRnJvbVNlbGVjdGVkRmlsZSxcbiAgICAgIHJlc2V0VXBsb2FkU3RhdGUsXG4gICAgXVxuICApO1xuXG4gIHJldHVybiA8QXBwQ29udGV4dC5Qcm92aWRlciB2YWx1ZT17dmFsdWV9PntjaGlsZHJlbn08L0FwcENvbnRleHQuUHJvdmlkZXI+O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXNlQXBwQ29udGV4dCgpIHtcbiAgY29uc3QgY29udGV4dCA9IHVzZUNvbnRleHQoQXBwQ29udGV4dCk7XG4gIGlmICghY29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcigndXNlQXBwQ29udGV4dCBtdXN0IGJlIHVzZWQgd2l0aGluIEFwcFByb3ZpZGVyLicpO1xuICB9XG4gIHJldHVybiBjb250ZXh0O1xufVxuIiwgImV4cG9ydCBmdW5jdGlvbiBjbiguLi52YWx1ZXM6IEFycmF5PHN0cmluZyB8IGZhbHNlIHwgbnVsbCB8IHVuZGVmaW5lZD4pIHtcbiAgcmV0dXJuIHZhbHVlcy5maWx0ZXIoQm9vbGVhbikuam9pbignICcpO1xufVxuIiwgImltcG9ydCB0eXBlIHsgQnV0dG9uSFRNTEF0dHJpYnV0ZXMsIFJlYWN0Tm9kZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGNuIH0gZnJvbSAnLi4vLi4vbGliL2NuJztcblxudHlwZSBCdXR0b25WYXJpYW50ID0gJ3ByaW1hcnknIHwgJ3NlY29uZGFyeScgfCAnZ2hvc3QnIHwgJ2Rhbmdlcic7XG5cbmludGVyZmFjZSBCdXR0b25Qcm9wcyBleHRlbmRzIEJ1dHRvbkhUTUxBdHRyaWJ1dGVzPEhUTUxCdXR0b25FbGVtZW50PiB7XG4gIHZhcmlhbnQ/OiBCdXR0b25WYXJpYW50O1xuICBjaGlsZHJlbjogUmVhY3ROb2RlO1xufVxuXG5jb25zdCB2YXJpYW50Q2xhc3NlczogUmVjb3JkPEJ1dHRvblZhcmlhbnQsIHN0cmluZz4gPSB7XG4gIHByaW1hcnk6ICdiZy1ibHVlLTYwMCB0ZXh0LXdoaXRlIGhvdmVyOmJnLWJsdWUtNTAwIHNoYWRvdy1sZyBzaGFkb3ctYmx1ZS05NTAvNDAnLFxuICBzZWNvbmRhcnk6ICdib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05MDAvODAgdGV4dC1zbGF0ZS0xMDAgaG92ZXI6Ym9yZGVyLXNsYXRlLTUwMCBob3ZlcjpiZy1zbGF0ZS04MDAnLFxuICBnaG9zdDogJ3RleHQtc2xhdGUtMzAwIGhvdmVyOmJnLXNsYXRlLTgwMC83MCBob3Zlcjp0ZXh0LXdoaXRlJyxcbiAgZGFuZ2VyOiAnYmctcmVkLTYwMCB0ZXh0LXdoaXRlIGhvdmVyOmJnLXJlZC01MDAgc2hhZG93LWxnIHNoYWRvdy1yZWQtOTUwLzQwJyxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEJ1dHRvbih7IGNsYXNzTmFtZSwgdmFyaWFudCA9ICdwcmltYXJ5JywgY2hpbGRyZW4sIC4uLnByb3BzIH06IEJ1dHRvblByb3BzKSB7XG4gIHJldHVybiAoXG4gICAgPGJ1dHRvblxuICAgICAgY2xhc3NOYW1lPXtjbihcbiAgICAgICAgJ2lubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiByb3VuZGVkLXhsIHB4LTQgcHktMi41IHRleHQtc20gZm9udC1zZW1pYm9sZCB0cmFuc2l0aW9uLWFsbCBkaXNhYmxlZDpjdXJzb3Itbm90LWFsbG93ZWQgZGlzYWJsZWQ6b3BhY2l0eS01MCcsXG4gICAgICAgIHZhcmlhbnRDbGFzc2VzW3ZhcmlhbnRdLFxuICAgICAgICBjbGFzc05hbWVcbiAgICAgICl9XG4gICAgICB7Li4ucHJvcHN9XG4gICAgPlxuICAgICAge2NoaWxkcmVufVxuICAgIDwvYnV0dG9uPlxuICApO1xufVxuIiwgImltcG9ydCB0eXBlIHsgSFRNTEF0dHJpYnV0ZXMsIFJlYWN0Tm9kZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGNuIH0gZnJvbSAnLi4vLi4vbGliL2NuJztcblxuaW50ZXJmYWNlIEJhZGdlUHJvcHMgZXh0ZW5kcyBIVE1MQXR0cmlidXRlczxIVE1MU3BhbkVsZW1lbnQ+IHtcbiAgY2hpbGRyZW46IFJlYWN0Tm9kZTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQmFkZ2UoeyBjbGFzc05hbWUsIGNoaWxkcmVuLCAuLi5wcm9wcyB9OiBCYWRnZVByb3BzKSB7XG4gIHJldHVybiAoXG4gICAgPHNwYW5cbiAgICAgIGNsYXNzTmFtZT17Y24oXG4gICAgICAgICdpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgcm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIGJnLXNsYXRlLTkwMC84MCBweC0yLjUgcHktMSB0ZXh0LXhzIGZvbnQtbWVkaXVtIHRleHQtc2xhdGUtMjAwJyxcbiAgICAgICAgY2xhc3NOYW1lXG4gICAgICApfVxuICAgICAgey4uLnByb3BzfVxuICAgID5cbiAgICAgIHtjaGlsZHJlbn1cbiAgICA8L3NwYW4+XG4gICk7XG59XG4iLCAiaW1wb3J0IHsgQWxlcnRUcmlhbmdsZSwgQ2hlY2tDaXJjbGUyLCBJbmZvIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7IGNuIH0gZnJvbSAnLi4vbGliL2NuJztcblxuaW50ZXJmYWNlIFN0YXR1c0Jhbm5lclByb3BzIHtcbiAgdG9uZT86ICdpbmZvJyB8ICdzdWNjZXNzJyB8ICdlcnJvcic7XG4gIG1lc3NhZ2U6IHN0cmluZztcbn1cblxuY29uc3QgdG9uZU1hcCA9IHtcbiAgaW5mbzoge1xuICAgIGNvbnRhaW5lcjogJ2JvcmRlci1ibHVlLTUwMC8zMCBiZy1ibHVlLTUwMC8xMCB0ZXh0LWJsdWUtMTAwJyxcbiAgICBpY29uOiBJbmZvLFxuICB9LFxuICBzdWNjZXNzOiB7XG4gICAgY29udGFpbmVyOiAnYm9yZGVyLWVtZXJhbGQtNTAwLzMwIGJnLWVtZXJhbGQtNTAwLzEwIHRleHQtZW1lcmFsZC0xMDAnLFxuICAgIGljb246IENoZWNrQ2lyY2xlMixcbiAgfSxcbiAgZXJyb3I6IHtcbiAgICBjb250YWluZXI6ICdib3JkZXItcmVkLTUwMC8zMCBiZy1yZWQtNTAwLzEwIHRleHQtcmVkLTEwMCcsXG4gICAgaWNvbjogQWxlcnRUcmlhbmdsZSxcbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFN0YXR1c0Jhbm5lcih7IHRvbmUgPSAnaW5mbycsIG1lc3NhZ2UgfTogU3RhdHVzQmFubmVyUHJvcHMpIHtcbiAgY29uc3QgSWNvbiA9IHRvbmVNYXBbdG9uZV0uaWNvbjtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPXtjbignZmxleCBpdGVtcy1zdGFydCBnYXAtMyByb3VuZGVkLTJ4bCBib3JkZXIgcHgtNCBweS0zIHRleHQtc20nLCB0b25lTWFwW3RvbmVdLmNvbnRhaW5lcil9PlxuICAgICAgPEljb24gY2xhc3NOYW1lPVwibXQtMC41IGgtNCB3LTQgc2hyaW5rLTBcIiAvPlxuICAgICAgPHAgY2xhc3NOYW1lPVwibS0wIGxlYWRpbmctNlwiPnttZXNzYWdlfTwvcD5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiIsICJpbXBvcnQgeyB1c2VSZWYgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgdHlwZSB7IENoYW5nZUV2ZW50LCBEcmFnRXZlbnQgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBDaGV2cm9uUmlnaHQsIEZpbGVUZXh0LCBOZXR3b3JrLCBTaGllbGQsIFVwbG9hZCB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQgeyB1c2VOYXZpZ2F0ZSB9IGZyb20gJ3JlYWN0LXJvdXRlci1kb20nO1xuaW1wb3J0IEJ1dHRvbiBmcm9tICcuLi9jb21wb25lbnRzL3VpL0J1dHRvbic7XG5pbXBvcnQgQmFkZ2UgZnJvbSAnLi4vY29tcG9uZW50cy91aS9CYWRnZSc7XG5pbXBvcnQgU3RhdHVzQmFubmVyIGZyb20gJy4uL2NvbXBvbmVudHMvU3RhdHVzQmFubmVyJztcbmltcG9ydCB7IGFwcENvbmZpZyB9IGZyb20gJy4uL2xpYi9jb25maWcnO1xuaW1wb3J0IHsgdXNlQXBwQ29udGV4dCB9IGZyb20gJy4uL3N0YXRlL0FwcENvbnRleHQnO1xuXG5mdW5jdGlvbiBmb3JtYXRGaWxlU2l6ZShzaXplOiBudW1iZXIpIHtcbiAgaWYgKHNpemUgPCAxMDI0ICogMTAyNCkge1xuICAgIHJldHVybiBgJHsoc2l6ZSAvIDEwMjQpLnRvRml4ZWQoMSl9IEtCYDtcbiAgfVxuICByZXR1cm4gYCR7KHNpemUgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCgyKX0gTUJgO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBMYW5kaW5nUGFnZSgpIHtcbiAgY29uc3QgbmF2aWdhdGUgPSB1c2VOYXZpZ2F0ZSgpO1xuICBjb25zdCBmaWxlSW5wdXRSZWYgPSB1c2VSZWY8SFRNTElucHV0RWxlbWVudCB8IG51bGw+KG51bGwpO1xuICBjb25zdCB7IHVwbG9hZCwgZ3JhcGgsIHNldERyYWdBY3RpdmUsIHNlbGVjdEZpbGUsIGNsZWFyU2VsZWN0ZWRGaWxlIH0gPSB1c2VBcHBDb250ZXh0KCk7XG5cbiAgY29uc3Qgc2VsZWN0ZWRGaWxlID0gdXBsb2FkLnNlbGVjdGVkRmlsZTtcblxuICBjb25zdCBoYW5kbGVGaWxlID0gKGZpbGU6IEZpbGUgfCBudWxsKSA9PiB7XG4gICAgc2VsZWN0RmlsZShmaWxlKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVEcm9wID0gKGV2ZW50OiBEcmFnRXZlbnQ8SFRNTERpdkVsZW1lbnQ+KSA9PiB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBzZXREcmFnQWN0aXZlKGZhbHNlKTtcbiAgICBoYW5kbGVGaWxlKGV2ZW50LmRhdGFUcmFuc2Zlci5maWxlcz8uWzBdID8/IG51bGwpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUZpbGVJbnB1dCA9IChldmVudDogQ2hhbmdlRXZlbnQ8SFRNTElucHV0RWxlbWVudD4pID0+IHtcbiAgICBoYW5kbGVGaWxlKGV2ZW50LnRhcmdldC5maWxlcz8uWzBdID8/IG51bGwpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gYmctWyMwRjE3MkFdIHRleHQtd2hpdGVcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXgtYXV0byBtYXgtdy03eGwgcHgtNiBweS0xMFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTYgZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtM1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCByb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNzAgcC0xXCI+XG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cInJvdW5kZWQteGwgYmctYmx1ZS02MDAgcHgtNCBweS0yIHRleHQtc20gZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+UmlzayBXb3Jrc3BhY2U8L2J1dHRvbj5cbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9kb2N1bWVudHMnKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicm91bmRlZC14bCBweC00IHB5LTIgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtc2xhdGUtMzAwIHRyYW5zaXRpb24gaG92ZXI6dGV4dC13aGl0ZVwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIERvY3VtZW50IFdvcmtzcGFjZVxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvZ3JhcGhzJyl9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInJvdW5kZWQteGwgcHgtNCBweS0yIHRleHQtc20gZm9udC1zZW1pYm9sZCB0ZXh0LXNsYXRlLTMwMCB0cmFuc2l0aW9uIGhvdmVyOnRleHQtd2hpdGVcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICBHcmFwaCBXb3Jrc3BhY2VcbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxCdXR0b24gdmFyaWFudD1cInNlY29uZGFyeVwiIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvcmlzaycpfSBkaXNhYmxlZD17IWdyYXBoLmRhdGF9PlxuICAgICAgICAgICAgT3BlbiBSaXNrIEdyYXBoXG4gICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ2FwLTEwIHhsOmdyaWQtY29scy1bMS4yZnJfMC44ZnJdXCI+XG4gICAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC1bMzJweF0gcHgtOCBweS0xMCBtZDpweC0xMCBtZDpweS0xMlwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi00IGZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYmctYmx1ZS01MDAvMTUgcC0zIHRleHQtYmx1ZS0zMDBcIj5cbiAgICAgICAgICAgICAgICA8TmV0d29yayBjbGFzc05hbWU9XCJoLTggdy04XCIgLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNtIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yMmVtXSB0ZXh0LWJsdWUtMzAwXCI+RGlnaXRhbCBUd2luIE9wZXJhdGlvbnM8L2Rpdj5cbiAgICAgICAgICAgICAgICA8aDEgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LTV4bCBmb250LWJvbGQgdHJhY2tpbmctdGlnaHQgdGV4dC13aGl0ZSBtZDp0ZXh0LTZ4bFwiPlR3aW5HcmFwaE9wczwvaDE+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm1heC13LTN4bCB0ZXh0LWxnIGxlYWRpbmctOCB0ZXh0LXNsYXRlLTMwMFwiPlxuICAgICAgICAgICAgICBEcm9wIGluIHlvdXIgc3lzdGVtIG1hbnVhbCBhbmQgbGV0IFR3aW5HcmFwaE9wcyBleHRyYWN0IHRoZSBhcmNoaXRlY3R1cmUsIHNjb3JlIG9wZXJhdGlvbmFsIHJpc2ssIGFuZCB0dXJuIHRoZSB3aG9sZSBzeXN0ZW0gaW50byBhIGdyYXBoIHlvdXIgdGVhbSBjYW4gaW5zcGVjdCBpbiBtaW51dGVzLlxuICAgICAgICAgICAgPC9wPlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTggZmxleCBmbGV4LXdyYXAgZ2FwLTNcIj5cbiAgICAgICAgICAgICAgPEJhZGdlIGNsYXNzTmFtZT1cImJvcmRlci1ibHVlLTUwMC8zMCBiZy1ibHVlLTUwMC8xMCB0ZXh0LWJsdWUtMTAwXCI+QVBJIHthcHBDb25maWcuYXBpQmFzZVVybH08L0JhZGdlPlxuICAgICAgICAgICAgICA8QmFkZ2UgY2xhc3NOYW1lPVwiYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05MDAvODAgdGV4dC1zbGF0ZS0yMDBcIj5cbiAgICAgICAgICAgICAgICBVcGxvYWQgbGltaXQge01hdGgucm91bmQoYXBwQ29uZmlnLm1heFVwbG9hZEJ5dGVzIC8gMTAyNCAvIDEwMjQpfSBNQlxuICAgICAgICAgICAgICA8L0JhZGdlPlxuICAgICAgICAgICAgICA8QmFkZ2UgY2xhc3NOYW1lPVwiYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05MDAvODAgdGV4dC1zbGF0ZS0yMDBcIj5cbiAgICAgICAgICAgICAgICBUaW1lb3V0IHsoYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMgLyAxMDAwKS50b0ZpeGVkKDApfXNcbiAgICAgICAgICAgICAgPC9CYWRnZT5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTEyIGdyaWQgZ2FwLTYgbWQ6Z3JpZC1jb2xzLTNcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLVsyOHB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNTUgcC02XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi00IGZsZXggaC0xMiB3LTEyIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLTJ4bCBiZy1ibHVlLTUwMC8xNSB0ZXh0LWJsdWUtMzAwXCI+XG4gICAgICAgICAgICAgICAgICA8VXBsb2FkIGNsYXNzTmFtZT1cImgtNiB3LTZcIiAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPjEuIFVwbG9hZCBEb2N1bWVudGF0aW9uPC9oMj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gbGVhZGluZy02IHRleHQtc2xhdGUtNDAwXCI+VXBsb2FkIGEgVVRGLTggYC5tZGAgb3IgYC50eHRgIGZpbGUgZGVzY3JpYmluZyB0aGUgc3lzdGVtLjwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMjhweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzU1IHAtNlwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWItNCBmbGV4IGgtMTIgdy0xMiBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC0yeGwgYmctcHVycGxlLTUwMC8xNSB0ZXh0LXB1cnBsZS0zMDBcIj5cbiAgICAgICAgICAgICAgICAgIDxOZXR3b3JrIGNsYXNzTmFtZT1cImgtNiB3LTZcIiAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPjIuIEJ1aWxkIEdyYXBoPC9oMj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gbGVhZGluZy02IHRleHQtc2xhdGUtNDAwXCI+VGhlIGJhY2tlbmQgZXh0cmFjdHMgbm9kZXMsIGVkZ2VzLCBhbmQgcmlzayBtZXRyaWNzIGludG8gdGhlIGFjdGl2ZSBncmFwaC48L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtWzI4cHhdIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC81NSBwLTZcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgZmxleCBoLTEyIHctMTIgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtMnhsIGJnLW9yYW5nZS01MDAvMTUgdGV4dC1vcmFuZ2UtMzAwXCI+XG4gICAgICAgICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cImgtNiB3LTZcIiAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPjMuIEluc3BlY3QgUmlza3M8L2gyPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBsZWFkaW5nLTYgdGV4dC1zbGF0ZS00MDBcIj5FeHBsb3JlIHRoZSBncmFwaCwgdGFibGVzLCBhbmQgZGV0YWlsIHBhbmVsIGZvciBvcGVyYXRpb25hbCBpbnNpZ2h0LjwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgICA8YXNpZGUgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC1bMzJweF0gcC04XCI+XG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC14bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj5BY3RpdmUgSW5nZXN0PC9oMj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgdGV4dC1zbSBsZWFkaW5nLTYgdGV4dC1zbGF0ZS0zMDBcIj5cbiAgICAgICAgICAgICAgUXVldWUgb25lIG1hbnVhbCBmb3IgaW5nZXN0aW9uLiBUaGUgYWN0aXZlIGdyYXBoIGluIHRoZSB3b3Jrc3BhY2Ugd2lsbCByZWZyZXNoIHdoZW4gcHJvY2Vzc2luZyBjb21wbGV0ZXMuXG4gICAgICAgICAgICA8L3A+XG5cbiAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgbXQtNiByb3VuZGVkLVsyOHB4XSBib3JkZXItMiBib3JkZXItZGFzaGVkIHAtOCB0ZXh0LWNlbnRlciB0cmFuc2l0aW9uICR7XG4gICAgICAgICAgICAgICAgdXBsb2FkLnBoYXNlID09PSAnZHJhZy1ob3ZlcidcbiAgICAgICAgICAgICAgICAgID8gJ2JvcmRlci1ibHVlLTQwMCBiZy1ibHVlLTUwMC8xMCdcbiAgICAgICAgICAgICAgICAgIDogJ2JvcmRlci1zbGF0ZS03MDAgYmctc2xhdGUtOTUwLzUwIGhvdmVyOmJvcmRlci1zbGF0ZS01MDAnXG4gICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICBvbkRyYWdPdmVyPXsoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHNldERyYWdBY3RpdmUodHJ1ZSk7XG4gICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgIG9uRHJhZ0xlYXZlPXsoKSA9PiBzZXREcmFnQWN0aXZlKGZhbHNlKX1cbiAgICAgICAgICAgICAgb25Ecm9wPXtoYW5kbGVEcm9wfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8VXBsb2FkIGNsYXNzTmFtZT1cIm14LWF1dG8gaC0xNCB3LTE0IHRleHQtc2xhdGUtNDAwXCIgLz5cbiAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cIm10LTQgdGV4dC14bCBmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+VXBsb2FkIFN5c3RlbSBEb2N1bWVudGF0aW9uPC9oMz5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+RHJhZyBhbmQgZHJvcCB5b3VyIGZpbGUgaGVyZSBvciBicm93c2UgbG9jYWxseS48L3A+XG4gICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgIHJlZj17ZmlsZUlucHV0UmVmfVxuICAgICAgICAgICAgICAgIHR5cGU9XCJmaWxlXCJcbiAgICAgICAgICAgICAgICBhY2NlcHQ9XCIubWQsLnR4dCx0ZXh0L3BsYWluLHRleHQvbWFya2Rvd25cIlxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImhpZGRlblwiXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9e2hhbmRsZUZpbGVJbnB1dH1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC02IGZsZXggZmxleC13cmFwIGp1c3RpZnktY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PVwic2Vjb25kYXJ5XCIgb25DbGljaz17KCkgPT4gZmlsZUlucHV0UmVmLmN1cnJlbnQ/LmNsaWNrKCl9PlxuICAgICAgICAgICAgICAgICAgPEZpbGVUZXh0IGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPlxuICAgICAgICAgICAgICAgICAgQ2hvb3NlIEZpbGVcbiAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICAgICA8QnV0dG9uIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvcHJvY2Vzc2luZycpfSBkaXNhYmxlZD17IXNlbGVjdGVkRmlsZX0+XG4gICAgICAgICAgICAgICAgICBBbmFseXplIERvY3VtZW50XG4gICAgICAgICAgICAgICAgICA8Q2hldnJvblJpZ2h0IGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPlxuICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtNCB0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yZW1dIHRleHQtc2xhdGUtNTAwXCI+U3VwcG9ydGVkIGZvcm1hdHM6IC5tZCBhbmQgLnR4dDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgcm91bmRlZC1bMjhweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzYwIHAtNFwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQganVzdGlmeS1iZXR3ZWVuIGdhcC00XCI+XG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNTAwXCI+U2VsZWN0ZWQgRmlsZTwvcD5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+e3NlbGVjdGVkRmlsZT8ubmFtZSA/PyAnTm8gZmlsZSBzZWxlY3RlZC4nfTwvcD5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTEgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICB7c2VsZWN0ZWRGaWxlID8gZm9ybWF0RmlsZVNpemUoc2VsZWN0ZWRGaWxlLnNpemUpIDogJ0Nob29zZSBhIG1hbnVhbCB0byBiZWdpbi4nfVxuICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIHtzZWxlY3RlZEZpbGUgPyAoXG4gICAgICAgICAgICAgICAgICA8QnV0dG9uIHZhcmlhbnQ9XCJnaG9zdFwiIG9uQ2xpY2s9e2NsZWFyU2VsZWN0ZWRGaWxlfT5cbiAgICAgICAgICAgICAgICAgICAgQ2xlYXJcbiAgICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTZcIj5cbiAgICAgICAgICAgICAgPFN0YXR1c0Jhbm5lclxuICAgICAgICAgICAgICAgIHRvbmU9e3VwbG9hZC5lcnJvciA/ICdlcnJvcicgOiBncmFwaC5kYXRhID8gJ3N1Y2Nlc3MnIDogJ2luZm8nfVxuICAgICAgICAgICAgICAgIG1lc3NhZ2U9e3VwbG9hZC5lcnJvciB8fCB1cGxvYWQuc3RhdHVzTWVzc2FnZSB8fCAnVXBsb2FkIGEgZmlsZSB0byBjb250aW51ZS4nfVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIHtncmFwaC5kYXRhID8gKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgcm91bmRlZC1bMjhweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzYwIHAtNFwiPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNTAwXCI+Q3VycmVudCBXb3Jrc3BhY2U8L3A+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC00IGdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTRcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntncmFwaC5kYXRhLm5vZGVzLmxlbmd0aH08L3A+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5Ob2RlczwvcD5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC0yeGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+e2dyYXBoLmRhdGEubGlua3MubGVuZ3RofTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPkVkZ2VzPC9wPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgPC9hc2lkZT5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiIsICJpbXBvcnQgeyBDaGVja0NpcmNsZTIsIENsb2NrMywgTG9hZGVyMiwgVGVybWluYWxTcXVhcmUsIFhDaXJjbGUgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHR5cGUgeyBQcm9jZXNzaW5nU3RhdHVzIH0gZnJvbSAnLi4vdHlwZXMvYXBpJztcblxuaW50ZXJmYWNlIFByb2Nlc3NpbmdBY3Rpdml0eVBhbmVsUHJvcHMge1xuICBzdGF0dXM6IFByb2Nlc3NpbmdTdGF0dXMgfCBudWxsO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRUaW1lc3RhbXAodGltZXN0YW1wOiBzdHJpbmcgfCBudWxsKSB7XG4gIGlmICghdGltZXN0YW1wKSB7XG4gICAgcmV0dXJuICdQZW5kaW5nJztcbiAgfVxuXG4gIHJldHVybiBuZXcgSW50bC5EYXRlVGltZUZvcm1hdCh1bmRlZmluZWQsIHtcbiAgICBob3VyOiAnbnVtZXJpYycsXG4gICAgbWludXRlOiAnMi1kaWdpdCcsXG4gICAgc2Vjb25kOiAnMi1kaWdpdCcsXG4gIH0pLmZvcm1hdChuZXcgRGF0ZSh0aW1lc3RhbXApKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gUHJvY2Vzc2luZ0FjdGl2aXR5UGFuZWwoeyBzdGF0dXMgfTogUHJvY2Vzc2luZ0FjdGl2aXR5UGFuZWxQcm9wcykge1xuICBjb25zdCBldmVudHMgPSBzdGF0dXM/LmV2ZW50cyA/PyBbXTtcbiAgY29uc3QgdmlzaWJsZUV2ZW50cyA9IFsuLi5ldmVudHNdLnJldmVyc2UoKS5zbGljZSgwLCA4KTtcbiAgY29uc3Qgc3RhdGUgPSBzdGF0dXM/LnN0YXRlID8/ICdwZW5kaW5nJztcblxuICByZXR1cm4gKFxuICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtWzI4cHhdIHAtNlwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBpdGVtcy1zdGFydCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTRcIj5cbiAgICAgICAgPGRpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICA8VGVybWluYWxTcXVhcmUgY2xhc3NOYW1lPVwiaC01IHctNSB0ZXh0LWN5YW4tMzAwXCIgLz5cbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPlByb2Nlc3NpbmcgQWN0aXZpdHk8L2gyPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05NTAvNzAgcHgtMyBweS0xIHRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtc2xhdGUtMzAwXCI+XG4gICAgICAgICAge3N0YXRlfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTUgZ3JpZCBnYXAtMyBzbTpncmlkLWNvbHMtM1wiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtWzIycHhdIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC83MCBwLTRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtc2xhdGUtNTAwXCI+Q3VycmVudCBTdGVwPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gZm9udC1tZWRpdW0gdGV4dC13aGl0ZVwiPntzdGF0dXM/LmxhdGVzdF9ldmVudCA/PyAnV2FpdGluZyBmb3IgdXBsb2FkIHRvIGJlZ2luLid9PC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtWzIycHhdIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC83MCBwLTRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtc2xhdGUtNTAwXCI+Q2h1bmsgUHJvZ3Jlc3M8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+XG4gICAgICAgICAgICB7c3RhdHVzPy5jdXJyZW50X2NodW5rICYmIHN0YXR1cz8uY2h1bmtzX3RvdGFsXG4gICAgICAgICAgICAgID8gYCR7TWF0aC5taW4oc3RhdHVzLmN1cnJlbnRfY2h1bmssIHN0YXR1cy5jaHVua3NfdG90YWwpfSBvZiAke3N0YXR1cy5jaHVua3NfdG90YWx9YFxuICAgICAgICAgICAgICA6IHN0YXR1cz8uY2h1bmtzX3RvdGFsXG4gICAgICAgICAgICAgICAgPyBgMCBvZiAke3N0YXR1cy5jaHVua3NfdG90YWx9YFxuICAgICAgICAgICAgICAgIDogJ1dhaXRpbmcnfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLVsyMnB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNzAgcC00XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LXNsYXRlLTUwMFwiPlN0YXJ0ZWQ8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+e2Zvcm1hdFRpbWVzdGFtcChzdGF0dXM/LnN0YXJ0ZWRfYXQgPz8gbnVsbCl9PC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNSBzcGFjZS15LTNcIj5cbiAgICAgICAge3Zpc2libGVFdmVudHMubGVuZ3RoID09PSAwID8gKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMjJweF0gYm9yZGVyIGJvcmRlci1kYXNoZWQgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNDUgcHgtNCBweS01IHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5cbiAgICAgICAgICAgIFdhaXRpbmcgZm9yIGJhY2tlbmQgYWN0aXZpdHkuLi5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKSA6IChcbiAgICAgICAgICB2aXNpYmxlRXZlbnRzLm1hcCgoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRvbmUgPVxuICAgICAgICAgICAgICBldmVudC5sZXZlbCA9PT0gJ0VSUk9SJ1xuICAgICAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgICAgICBpY29uOiA8WENpcmNsZSBjbGFzc05hbWU9XCJoLTQgdy00IHRleHQtcmVkLTMwMFwiIC8+LFxuICAgICAgICAgICAgICAgICAgICBib3JkZXI6ICdib3JkZXItcmVkLTUwMC8yMCcsXG4gICAgICAgICAgICAgICAgICAgIGJnOiAnYmctcmVkLTUwMC84JyxcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICA6IGV2ZW50LmV2ZW50LmVuZHNXaXRoKCdfY29tcGxldGVkJykgfHwgZXZlbnQuZXZlbnQuZW5kc1dpdGgoJ19zdWNjZWVkZWQnKVxuICAgICAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgICAgICAgaWNvbjogPENoZWNrQ2lyY2xlMiBjbGFzc05hbWU9XCJoLTQgdy00IHRleHQtZW1lcmFsZC0zMDBcIiAvPixcbiAgICAgICAgICAgICAgICAgICAgICBib3JkZXI6ICdib3JkZXItZW1lcmFsZC01MDAvMjAnLFxuICAgICAgICAgICAgICAgICAgICAgIGJnOiAnYmctZW1lcmFsZC01MDAvOCcsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIDogc3RhdGUgPT09ICdydW5uaW5nJ1xuICAgICAgICAgICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246IDxMb2FkZXIyIGNsYXNzTmFtZT1cImgtNCB3LTQgYW5pbWF0ZS1zcGluIHRleHQtYmx1ZS0zMDBcIiAvPixcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcjogJ2JvcmRlci1ibHVlLTUwMC8yMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBiZzogJ2JnLWJsdWUtNTAwLzgnLFxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uOiA8Q2xvY2szIGNsYXNzTmFtZT1cImgtNCB3LTQgdGV4dC1zbGF0ZS0zMDBcIiAvPixcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcjogJ2JvcmRlci1zbGF0ZS03MDAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmc6ICdiZy1zbGF0ZS05MDAvNzAnLFxuICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICBrZXk9e2Ake2V2ZW50LnRpbWVzdGFtcCA/PyAncGVuZGluZyd9LSR7ZXZlbnQuZXZlbnR9YH1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0zIHJvdW5kZWQtWzIycHhdIGJvcmRlciBweC00IHB5LTMgJHt0b25lLmJvcmRlcn0gJHt0b25lLmJnfWB9XG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTAuNVwiPnt0b25lLmljb259PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtaW4tdy0wIGZsZXgtMVwiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+e2V2ZW50Lm1lc3NhZ2V9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPntmb3JtYXRUaW1lc3RhbXAoZXZlbnQudGltZXN0YW1wKX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPntldmVudC5ldmVudH08L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pXG4gICAgICAgICl9XG4gICAgICA8L2Rpdj5cbiAgICA8L3NlY3Rpb24+XG4gICk7XG59XG4iLCAiaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VNZW1vLCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IENoZWNrQ2lyY2xlMiwgTG9hZGVyMiwgTmV0d29yayB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQgeyB1c2VOYXZpZ2F0ZSB9IGZyb20gJ3JlYWN0LXJvdXRlci1kb20nO1xuaW1wb3J0IFByb2Nlc3NpbmdBY3Rpdml0eVBhbmVsIGZyb20gJy4uL2NvbXBvbmVudHMvUHJvY2Vzc2luZ0FjdGl2aXR5UGFuZWwnO1xuaW1wb3J0IEJ1dHRvbiBmcm9tICcuLi9jb21wb25lbnRzL3VpL0J1dHRvbic7XG5pbXBvcnQgU3RhdHVzQmFubmVyIGZyb20gJy4uL2NvbXBvbmVudHMvU3RhdHVzQmFubmVyJztcbmltcG9ydCB7IHVzZUFwcENvbnRleHQgfSBmcm9tICcuLi9zdGF0ZS9BcHBDb250ZXh0JztcblxuY29uc3Qgc3RlcHMgPSBbXG4gICdVcGxvYWRpbmcgZG9jdW1lbnQnLFxuICAnRXh0cmFjdGluZyBhcmNoaXRlY3R1cmUgZ3JhcGgnLFxuICAnQ2FsY3VsYXRpbmcgcmlzayBtZXRyaWNzIGFuZCBsb2FkaW5nIHdvcmtzcGFjZScsXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBQcm9jZXNzaW5nUGFnZSgpIHtcbiAgY29uc3QgbmF2aWdhdGUgPSB1c2VOYXZpZ2F0ZSgpO1xuICBjb25zdCB7IHVwbG9hZCwgZ3JhcGgsIGJlZ2luUHJvY2Vzc2luZyB9ID0gdXNlQXBwQ29udGV4dCgpO1xuICBjb25zdCBbZWxhcHNlZCwgc2V0RWxhcHNlZF0gPSB1c2VTdGF0ZSgwKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghdXBsb2FkLnNlbGVjdGVkRmlsZSAmJiAhdXBsb2FkLmluZ2VzdGlvbiAmJiAhZ3JhcGguZGF0YSkge1xuICAgICAgbmF2aWdhdGUoJy8nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodXBsb2FkLnBoYXNlID09PSAnZmlsZS1zZWxlY3RlZCcpIHtcbiAgICAgIGJlZ2luUHJvY2Vzc2luZygpLmNhdGNoKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgfVxuICB9LCBbYmVnaW5Qcm9jZXNzaW5nLCBncmFwaC5kYXRhLCBuYXZpZ2F0ZSwgdXBsb2FkLmluZ2VzdGlvbiwgdXBsb2FkLnBoYXNlLCB1cGxvYWQuc2VsZWN0ZWRGaWxlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoISh1cGxvYWQucGhhc2UgPT09ICd1cGxvYWRpbmcnIHx8IHVwbG9hZC5waGFzZSA9PT0gJ3Byb2Nlc3NpbmcnKSB8fCAhdXBsb2FkLnN0YXJ0ZWRBdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGludGVydmFsID0gd2luZG93LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgIHNldEVsYXBzZWQoRGF0ZS5ub3coKSAtIHVwbG9hZC5zdGFydGVkQXQhKTtcbiAgICB9LCAyMDApO1xuXG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5jbGVhckludGVydmFsKGludGVydmFsKTtcbiAgfSwgW3VwbG9hZC5waGFzZSwgdXBsb2FkLnN0YXJ0ZWRBdF0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCh1cGxvYWQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCB1cGxvYWQucGhhc2UgPT09ICdlbXB0eS1ncmFwaCcpICYmIGdyYXBoLnN0YXR1cyA9PT0gJ3JlYWR5Jykge1xuICAgICAgY29uc3QgdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IG5hdmlnYXRlKCcvYXBwJyksIDcwMCk7XG4gICAgICByZXR1cm4gKCkgPT4gd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICB9XG4gIH0sIFtncmFwaC5zdGF0dXMsIG5hdmlnYXRlLCB1cGxvYWQucGhhc2VdKTtcblxuICBjb25zdCBjdXJyZW50U3RlcCA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGlmICh1cGxvYWQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCB1cGxvYWQucGhhc2UgPT09ICdlbXB0eS1ncmFwaCcpIHtcbiAgICAgIHJldHVybiBzdGVwcy5sZW5ndGg7XG4gICAgfVxuICAgIGlmICh1cGxvYWQucHJvY2Vzc2luZ1N0YXR1cz8uc3RhdGUgPT09ICdydW5uaW5nJyAmJiB1cGxvYWQucHJvY2Vzc2luZ1N0YXR1cy5jdXJyZW50X2NodW5rKSB7XG4gICAgICByZXR1cm4gdXBsb2FkLnByb2Nlc3NpbmdTdGF0dXMuY3VycmVudF9jaHVuayA+PSAodXBsb2FkLnByb2Nlc3NpbmdTdGF0dXMuY2h1bmtzX3RvdGFsID8/IDEpID8gMyA6IDI7XG4gICAgfVxuICAgIGlmICh1cGxvYWQucGhhc2UgPT09ICdwcm9jZXNzaW5nJykge1xuICAgICAgcmV0dXJuIGVsYXBzZWQgPiAyNTAwID8gMyA6IDI7XG4gICAgfVxuICAgIGlmICh1cGxvYWQucGhhc2UgPT09ICd1cGxvYWRpbmcnKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH0sIFtlbGFwc2VkLCB1cGxvYWQucGhhc2UsIHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzPy5jaHVua3NfdG90YWwsIHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzPy5jdXJyZW50X2NodW5rLCB1cGxvYWQucHJvY2Vzc2luZ1N0YXR1cz8uc3RhdGVdKTtcblxuICBjb25zdCBwcm9ncmVzcyA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGlmICh1cGxvYWQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCB1cGxvYWQucGhhc2UgPT09ICdlbXB0eS1ncmFwaCcpIHtcbiAgICAgIHJldHVybiAxMDA7XG4gICAgfVxuICAgIGlmICh1cGxvYWQucHJvY2Vzc2luZ1N0YXR1cz8uY2h1bmtzX3RvdGFsKSB7XG4gICAgICBjb25zdCBjaHVua1Byb2dyZXNzID0gKCh1cGxvYWQucHJvY2Vzc2luZ1N0YXR1cy5jdXJyZW50X2NodW5rID8/IDApIC8gdXBsb2FkLnByb2Nlc3NpbmdTdGF0dXMuY2h1bmtzX3RvdGFsKSAqIDEwMDtcbiAgICAgIHJldHVybiBNYXRoLm1heCgxOCwgTWF0aC5taW4oOTQsIE1hdGgucm91bmQoMjAgKyBjaHVua1Byb2dyZXNzICogMC43KSkpO1xuICAgIH1cbiAgICBpZiAodXBsb2FkLnBoYXNlID09PSAncHJvY2Vzc2luZycpIHtcbiAgICAgIHJldHVybiBNYXRoLm1pbig5MiwgZWxhcHNlZCA+IDI1MDAgPyA4MiA6IDU4KTtcbiAgICB9XG4gICAgaWYgKHVwbG9hZC5waGFzZSA9PT0gJ3VwbG9hZGluZycpIHtcbiAgICAgIHJldHVybiAyNDtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH0sIFtlbGFwc2VkLCB1cGxvYWQucGhhc2UsIHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzPy5jaHVua3NfdG90YWwsIHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzPy5jdXJyZW50X2NodW5rXSk7XG5cbiAgY29uc3QgaXNSZXRyeVN0YXRlID0gdXBsb2FkLnBoYXNlID09PSAncmV0cnknIHx8IHVwbG9hZC5waGFzZSA9PT0gJ2Vycm9yJztcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLVsjMEYxNzJBXSBweC02IHB5LTE2IHRleHQtd2hpdGVcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXgtYXV0byBtYXgtdy02eGxcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdhcC02IHhsOmdyaWQtY29scy1bbWlubWF4KDAsMS4xZnIpX21pbm1heCgzNDBweCwwLjlmcildXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLVszMnB4XSBwLTggbWQ6cC0xMFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJlbGF0aXZlIGlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWZ1bGwgYmctYmx1ZS01MDAvMTAgcC02IHRleHQtYmx1ZS0zMDBcIj5cbiAgICAgICAgICAgICAgICA8TmV0d29yayBjbGFzc05hbWU9XCJoLTE0IHctMTRcIiAvPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCByb3VuZGVkLWZ1bGwgYmctYmx1ZS01MDAvMTAgYmx1ci0yeGxcIiAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGgxIGNsYXNzTmFtZT1cIm10LTYgdGV4dC0zeGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+UHJvY2Vzc2luZyBZb3VyIERvY3VtZW50YXRpb248L2gxPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMTAgc3BhY2UteS00XCI+XG4gICAgICAgICAgICAgIHtzdGVwcy5tYXAoKGxhYmVsLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBsZXRlZCA9IGN1cnJlbnRTdGVwID4gaW5kZXggKyAxO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGl2ZSA9IGN1cnJlbnRTdGVwID09PSBpbmRleCArIDE7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICBrZXk9e2xhYmVsfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciBnYXAtNCByb3VuZGVkLVsyNHB4XSBib3JkZXIgcHgtNSBweS00IHRyYW5zaXRpb24gJHtcbiAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgID8gJ2JvcmRlci1lbWVyYWxkLTUwMC8zMCBiZy1lbWVyYWxkLTUwMC8xMCdcbiAgICAgICAgICAgICAgICAgICAgICAgIDogYWN0aXZlXG4gICAgICAgICAgICAgICAgICAgICAgICAgID8gJ2JvcmRlci1ibHVlLTUwMC8zMCBiZy1ibHVlLTUwMC8xMCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgOiAnYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNTUnXG4gICAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaC0xMCB3LTEwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWZ1bGwgYmctc2xhdGUtOTUwLzcwXCI+XG4gICAgICAgICAgICAgICAgICAgICAge2NvbXBsZXRlZCA/IChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxDaGVja0NpcmNsZTIgY2xhc3NOYW1lPVwiaC01IHctNSB0ZXh0LWVtZXJhbGQtMzAwXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICApIDogYWN0aXZlID8gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPExvYWRlcjIgY2xhc3NOYW1lPVwiaC01IHctNSBhbmltYXRlLXNwaW4gdGV4dC1ibHVlLTMwMFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC0zIHctMyByb3VuZGVkLWZ1bGwgYm9yZGVyIGJvcmRlci1zbGF0ZS02MDBcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMVwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj57bGFiZWx9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTEgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAge2NvbXBsZXRlZCA/ICdDb21wbGV0ZWQnIDogYWN0aXZlID8gdXBsb2FkLnN0YXR1c01lc3NhZ2UgOiAnV2FpdGluZyd9XG4gICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtOFwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtMiBvdmVyZmxvdy1oaWRkZW4gcm91bmRlZC1mdWxsIGJnLXNsYXRlLTgwMFwiPlxuICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImgtZnVsbCByb3VuZGVkLWZ1bGwgYmctZ3JhZGllbnQtdG8tciBmcm9tLWJsdWUtNTAwIHZpYS1jeWFuLTQwMCB0by1vcmFuZ2UtNDAwIHRyYW5zaXRpb24tYWxsXCJcbiAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IHdpZHRoOiBgJHtwcm9ncmVzc30lYCB9fVxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj57cHJvZ3Jlc3N9JTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LThcIj5cbiAgICAgICAgICAgICAgPFN0YXR1c0Jhbm5lclxuICAgICAgICAgICAgICAgIHRvbmU9e2lzUmV0cnlTdGF0ZSA/ICdlcnJvcicgOiB1cGxvYWQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCB1cGxvYWQucGhhc2UgPT09ICdlbXB0eS1ncmFwaCcgPyAnc3VjY2VzcycgOiAnaW5mbyd9XG4gICAgICAgICAgICAgICAgbWVzc2FnZT17dXBsb2FkLmVycm9yIHx8IHVwbG9hZC5zdGF0dXNNZXNzYWdlfVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtOCBmbGV4IGZsZXgtd3JhcCBqdXN0aWZ5LWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgICB7aXNSZXRyeVN0YXRlID8gKFxuICAgICAgICAgICAgICAgIDxCdXR0b24gb25DbGljaz17KCkgPT4gYmVnaW5Qcm9jZXNzaW5nKCkuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKX0+UmV0cnkgUHJvY2Vzc2luZzwvQnV0dG9uPlxuICAgICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgICAgeyh1cGxvYWQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCB1cGxvYWQucGhhc2UgPT09ICdlbXB0eS1ncmFwaCcpICYmIGdyYXBoLnN0YXR1cyA9PT0gJ3JlYWR5JyA/IChcbiAgICAgICAgICAgICAgICA8QnV0dG9uIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvYXBwJyl9Pk9wZW4gV29ya3NwYWNlPC9CdXR0b24+XG4gICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgICA8QnV0dG9uIHZhcmlhbnQ9XCJzZWNvbmRhcnlcIiBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnLycpfT5cbiAgICAgICAgICAgICAgICBCYWNrIHRvIFVwbG9hZFxuICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPFByb2Nlc3NpbmdBY3Rpdml0eVBhbmVsIHN0YXR1cz17dXBsb2FkLnByb2Nlc3NpbmdTdGF0dXN9IC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBEb2N1bWVudEV2aWRlbmNlLCBHcmFwaERhdGEsIEdyYXBoRWRnZSwgR3JhcGhOb2RlLCBHcmFwaFN1bW1hcnkgfSBmcm9tICcuLi90eXBlcy9hcHAnO1xuXG5leHBvcnQgY29uc3QgVFlQRV9DT0xPUlM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIHNvZnR3YXJlOiAnIzYwYTVmYScsXG4gIGRhdGE6ICcjMzRkMzk5JyxcbiAgaW50ZXJmYWNlOiAnI2MwODRmYycsXG4gIGhhcmR3YXJlOiAnI2ZiOTIzYycsXG4gIGh1bWFuOiAnI2Y0NzJiNicsXG4gIG90aGVyOiAnIzk0YTNiOCcsXG59O1xuXG5leHBvcnQgY29uc3QgUklTS19DT0xPUlM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIGxvdzogJyMyMmM1NWUnLFxuICBtZWRpdW06ICcjZjU5ZTBiJyxcbiAgaGlnaDogJyNlZjQ0NDQnLFxufTtcblxuZXhwb3J0IGNvbnN0IERPQ1VNRU5UX0tJTkRfQ09MT1JTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBlbnRpdHk6ICcjNjBhNWZhJyxcbiAgY29uY2VwdDogJyMzNGQzOTknLFxuICBzZWN0aW9uOiAnI2E3OGJmYScsXG4gIGNsYWltOiAnI2Y1OWUwYicsXG4gIG9ibGlnYXRpb246ICcjZmI3MTg1JyxcbiAgcmVxdWlyZW1lbnQ6ICcjMzhiZGY4JyxcbiAgZGF0ZTogJyNmOTczMTYnLFxuICBtZXRyaWM6ICcjMjJjNTVlJyxcbiAgcHJvY2VzczogJyNjMDg0ZmMnLFxuICByb2xlOiAnI2Y0NzJiNicsXG4gIHN5c3RlbTogJyMyZGQ0YmYnLFxuICByaXNrOiAnI2VmNDQ0NCcsXG4gIG90aGVyOiAnIzk0YTNiOCcsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZUNvbG9yKHR5cGU6IHN0cmluZykge1xuICByZXR1cm4gVFlQRV9DT0xPUlNbdHlwZV0gfHwgVFlQRV9DT0xPUlMub3RoZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSaXNrQ29sb3IobGV2ZWw6IHN0cmluZykge1xuICByZXR1cm4gUklTS19DT0xPUlNbbGV2ZWxdIHx8ICcjOTRhM2I4Jztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERvY3VtZW50S2luZENvbG9yKGtpbmQ6IHN0cmluZykge1xuICByZXR1cm4gRE9DVU1FTlRfS0lORF9DT0xPUlNba2luZF0gfHwgRE9DVU1FTlRfS0lORF9DT0xPUlMub3RoZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRMYWJlbCh2YWx1ZTogc3RyaW5nKSB7XG4gIHJldHVybiB2YWx1ZVxuICAgIC5zcGxpdCgvW18tXFxzXSsvKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChzZWdtZW50KSA9PiBzZWdtZW50LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc2VnbWVudC5zbGljZSgxKSlcbiAgICAuam9pbignICcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RG9jdW1lbnRFdmlkZW5jZVBhZ2VzKGV2aWRlbmNlOiBEb2N1bWVudEV2aWRlbmNlW10pIHtcbiAgY29uc3QgcmFuZ2VzID0gZXZpZGVuY2VcbiAgICAubWFwKChpdGVtKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIGl0ZW0ucGFnZVN0YXJ0ICE9PSAnbnVtYmVyJyAmJiB0eXBlb2YgaXRlbS5wYWdlRW5kICE9PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHN0YXJ0ID0gaXRlbS5wYWdlU3RhcnQgPz8gaXRlbS5wYWdlRW5kO1xuICAgICAgY29uc3QgZW5kID0gaXRlbS5wYWdlRW5kID8/IGl0ZW0ucGFnZVN0YXJ0O1xuICAgICAgaWYgKHR5cGVvZiBzdGFydCAhPT0gJ251bWJlcicgfHwgdHlwZW9mIGVuZCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGFydDogTWF0aC5taW4oc3RhcnQsIGVuZCksXG4gICAgICAgIGVuZDogTWF0aC5tYXgoc3RhcnQsIGVuZCksXG4gICAgICB9O1xuICAgIH0pXG4gICAgLmZpbHRlcigocmFuZ2UpOiByYW5nZSBpcyB7IHN0YXJ0OiBudW1iZXI7IGVuZDogbnVtYmVyIH0gPT4gcmFuZ2UgIT09IG51bGwpXG4gICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0LnN0YXJ0IC0gcmlnaHQuc3RhcnQgfHwgbGVmdC5lbmQgLSByaWdodC5lbmQpO1xuXG4gIGNvbnN0IHVuaXF1ZVJhbmdlcyA9IHJhbmdlcy5maWx0ZXIoXG4gICAgKHJhbmdlLCBpbmRleCkgPT4gaW5kZXggPT09IDAgfHwgcmFuZ2Uuc3RhcnQgIT09IHJhbmdlc1tpbmRleCAtIDFdLnN0YXJ0IHx8IHJhbmdlLmVuZCAhPT0gcmFuZ2VzW2luZGV4IC0gMV0uZW5kXG4gICk7XG5cbiAgaWYgKHVuaXF1ZVJhbmdlcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gJ05vIHBhZ2UgbWFya2VyJztcbiAgfVxuXG4gIGNvbnN0IHBhZ2VzID0gdW5pcXVlUmFuZ2VzLm1hcCgocmFuZ2UpID0+IChyYW5nZS5zdGFydCA9PT0gcmFuZ2UuZW5kID8gYCR7cmFuZ2Uuc3RhcnR9YCA6IGAke3JhbmdlLnN0YXJ0fS0ke3JhbmdlLmVuZH1gKSk7XG4gIHJldHVybiBgJHt1bmlxdWVSYW5nZXMubGVuZ3RoID09PSAxICYmIHVuaXF1ZVJhbmdlc1swXS5zdGFydCA9PT0gdW5pcXVlUmFuZ2VzWzBdLmVuZCA/ICdQYWdlJyA6ICdQYWdlcyd9ICR7cGFnZXMuam9pbignLCAnKX1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TGlua0VuZHBvaW50SWQoZW5kcG9pbnQ6IEdyYXBoRWRnZVsnc291cmNlJ10gfCBHcmFwaEVkZ2VbJ3RhcmdldCddKSB7XG4gIHJldHVybiB0eXBlb2YgZW5kcG9pbnQgPT09ICdzdHJpbmcnID8gZW5kcG9pbnQgOiBlbmRwb2ludC5pZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbm5lY3Rpb25Db3VudChncmFwaDogR3JhcGhEYXRhLCBub2RlSWQ6IHN0cmluZykge1xuICByZXR1cm4gZ3JhcGgubGlua3MuZmlsdGVyKChsaW5rKSA9PiBnZXRMaW5rRW5kcG9pbnRJZChsaW5rLnNvdXJjZSkgPT09IG5vZGVJZCB8fCBnZXRMaW5rRW5kcG9pbnRJZChsaW5rLnRhcmdldCkgPT09IG5vZGVJZCkubGVuZ3RoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRHcmFwaFN1bW1hcnkoZ3JhcGg6IEdyYXBoRGF0YSk6IEdyYXBoU3VtbWFyeSB7XG4gIGNvbnN0IHRvdGFsQ29tcG9uZW50cyA9IGdyYXBoLm5vZGVzLmxlbmd0aDtcbiAgY29uc3QgdG90YWxSZWxhdGlvbnNoaXBzID0gZ3JhcGgubGlua3MubGVuZ3RoO1xuICBjb25zdCBhdmdSaXNrID1cbiAgICB0b3RhbENvbXBvbmVudHMgPT09IDBcbiAgICAgID8gMFxuICAgICAgOiBOdW1iZXIoKGdyYXBoLm5vZGVzLnJlZHVjZSgoc3VtLCBub2RlKSA9PiBzdW0gKyBub2RlLnJpc2tTY29yZSwgMCkgLyB0b3RhbENvbXBvbmVudHMpLnRvRml4ZWQoMSkpO1xuICBjb25zdCBoaWdoUmlza05vZGVzID0gZ3JhcGgubm9kZXMuZmlsdGVyKChub2RlKSA9PiBub2RlLnJpc2tMZXZlbCA9PT0gJ2hpZ2gnKS5sZW5ndGg7XG4gIGNvbnN0IGhpZ2hlc3RSaXNrTm9kZSA9IFsuLi5ncmFwaC5ub2Rlc10uc29ydCgobGVmdCwgcmlnaHQpID0+IHJpZ2h0LnJpc2tTY29yZSAtIGxlZnQucmlza1Njb3JlKVswXSA/PyBudWxsO1xuXG4gIGNvbnN0IHJpc2tEaXN0cmlidXRpb24gPSBbXG4gICAgeyBsYWJlbDogJ0xvdycsIGtleTogJ2xvdycsIGNvdW50OiBncmFwaC5ub2Rlcy5maWx0ZXIoKG5vZGUpID0+IG5vZGUucmlza0xldmVsID09PSAnbG93JykubGVuZ3RoIH0sXG4gICAgeyBsYWJlbDogJ01lZGl1bScsIGtleTogJ21lZGl1bScsIGNvdW50OiBncmFwaC5ub2Rlcy5maWx0ZXIoKG5vZGUpID0+IG5vZGUucmlza0xldmVsID09PSAnbWVkaXVtJykubGVuZ3RoIH0sXG4gICAgeyBsYWJlbDogJ0hpZ2gnLCBrZXk6ICdoaWdoJywgY291bnQ6IGdyYXBoLm5vZGVzLmZpbHRlcigobm9kZSkgPT4gbm9kZS5yaXNrTGV2ZWwgPT09ICdoaWdoJykubGVuZ3RoIH0sXG4gIF07XG5cbiAgY29uc3QgdHlwZUNvdW50cyA9IGdyYXBoLm5vZGVzLnJlZHVjZTxSZWNvcmQ8c3RyaW5nLCBudW1iZXI+PigoYWNjdW11bGF0b3IsIG5vZGUpID0+IHtcbiAgICBhY2N1bXVsYXRvcltub2RlLnR5cGVdID0gKGFjY3VtdWxhdG9yW25vZGUudHlwZV0gPz8gMCkgKyAxO1xuICAgIHJldHVybiBhY2N1bXVsYXRvcjtcbiAgfSwge30pO1xuXG4gIGNvbnN0IHR5cGVEaXN0cmlidXRpb24gPSBPYmplY3QuZW50cmllcyh0eXBlQ291bnRzKVxuICAgIC5tYXAoKFt0eXBlLCBjb3VudF0pID0+ICh7IHR5cGUsIGNvdW50IH0pKVxuICAgIC5zb3J0KChsZWZ0LCByaWdodCkgPT4gcmlnaHQuY291bnQgLSBsZWZ0LmNvdW50KTtcblxuICBjb25zdCBtb3N0Q29ubmVjdGVkTm9kZXMgPSBbLi4uZ3JhcGgubm9kZXNdXG4gICAgLm1hcCgobm9kZSkgPT4gKHsgbm9kZSwgY29ubmVjdGlvbnM6IGdldENvbm5lY3Rpb25Db3VudChncmFwaCwgbm9kZS5pZCkgfSkpXG4gICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5jb25uZWN0aW9ucyAtIGxlZnQuY29ubmVjdGlvbnMpXG4gICAgLnNsaWNlKDAsIDUpO1xuXG4gIGNvbnN0IHRvcFJpc2tOb2RlcyA9IFsuLi5ncmFwaC5ub2Rlc10uc29ydCgobGVmdCwgcmlnaHQpID0+IHJpZ2h0LnJpc2tTY29yZSAtIGxlZnQucmlza1Njb3JlKS5zbGljZSgwLCA4KTtcblxuICBjb25zdCBibGFzdFJhZGl1c0xlYWRlcnMgPSBbLi4uZ3JhcGgubm9kZXNdXG4gICAgLm1hcCgobm9kZSkgPT4gKHsgbm9kZSwgY291bnQ6IG5vZGUuYmxhc3RSYWRpdXMgfSkpXG4gICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5jb3VudCAtIGxlZnQuY291bnQpXG4gICAgLnNsaWNlKDAsIDYpO1xuXG4gIHJldHVybiB7XG4gICAgdG90YWxDb21wb25lbnRzLFxuICAgIHRvdGFsUmVsYXRpb25zaGlwcyxcbiAgICBhdmdSaXNrLFxuICAgIGhpZ2hSaXNrTm9kZXMsXG4gICAgaGlnaGVzdFJpc2tOb2RlLFxuICAgIHJpc2tEaXN0cmlidXRpb24sXG4gICAgdHlwZURpc3RyaWJ1dGlvbixcbiAgICBtb3N0Q29ubmVjdGVkTm9kZXMsXG4gICAgdG9wUmlza05vZGVzLFxuICAgIGJsYXN0UmFkaXVzTGVhZGVycyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE5vZGVCeUlkKGdyYXBoOiBHcmFwaERhdGEsIG5vZGVJZDogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCk6IEdyYXBoTm9kZSB8IG51bGwge1xuICBpZiAoIW5vZGVJZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiBncmFwaC5ub2RlSW5kZXhbbm9kZUlkXSA/PyBudWxsO1xufVxuIiwgImltcG9ydCB7IEFjdGl2aXR5LCBBbGVydFRyaWFuZ2xlLCBCb3hlcywgR2l0QnJhbmNoIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB0eXBlIHsgR3JhcGhEYXRhIH0gZnJvbSAnLi4vdHlwZXMvYXBwJztcbmltcG9ydCB7IGJ1aWxkR3JhcGhTdW1tYXJ5LCBmb3JtYXRMYWJlbCwgZ2V0Umlza0NvbG9yLCBnZXRUeXBlQ29sb3IgfSBmcm9tICcuLi9saWIvc2VsZWN0b3JzJztcblxuaW50ZXJmYWNlIFN5c3RlbU92ZXJ2aWV3UHJvcHMge1xuICBncmFwaERhdGE6IEdyYXBoRGF0YTtcbiAgc291cmNlTGFiZWw/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFN5c3RlbU92ZXJ2aWV3KHsgZ3JhcGhEYXRhLCBzb3VyY2VMYWJlbCA9ICdhY3RpdmUgZ3JhcGgnIH06IFN5c3RlbU92ZXJ2aWV3UHJvcHMpIHtcbiAgY29uc3Qgc3VtbWFyeSA9IGJ1aWxkR3JhcGhTdW1tYXJ5KGdyYXBoRGF0YSk7XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBvdmVyZmxvdy15LWF1dG8gcC02IG1kOnAtOFwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJteC1hdXRvIG1heC13LTd4bCBzcGFjZS15LThcIj5cbiAgICAgICAgPGRpdj5cbiAgICAgICAgICA8aDEgY2xhc3NOYW1lPVwidGV4dC0zeGwgZm9udC1ib2xkIHRleHQtd2hpdGVcIj5TeXN0ZW0gT3ZlcnZpZXc8L2gxPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgbWF4LXctM3hsIHRleHQtc20gbGVhZGluZy03IHRleHQtc2xhdGUtMzAwXCI+XG4gICAgICAgICAgICBTdW1tYXJ5IGNhcmRzIGFuZCBicmVha2Rvd25zIGFyZSBjb21wdXRlZCBkaXJlY3RseSBmcm9tIHRoZSB7c291cmNlTGFiZWx9IHdpdGhvdXQgcmVxdWlyaW5nIGEgc2VwYXJhdGUgYXJjaGl0ZWN0dXJlIHN1bW1hcnkgZW5kcG9pbnQuXG4gICAgICAgICAgPC9wPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ2FwLTQgbWQ6Z3JpZC1jb2xzLTIgeGw6Z3JpZC1jb2xzLTRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgICAgICAgPEJveGVzIGNsYXNzTmFtZT1cImgtOCB3LTggdGV4dC1ibHVlLTMwMFwiIC8+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntzdW1tYXJ5LnRvdGFsQ29tcG9uZW50c308L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlRvdGFsIENvbXBvbmVudHM8L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLTN4bCBwLTVcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgICAgICAgIDxHaXRCcmFuY2ggY2xhc3NOYW1lPVwiaC04IHctOCB0ZXh0LXB1cnBsZS0zMDBcIiAvPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LTR4bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57c3VtbWFyeS50b3RhbFJlbGF0aW9uc2hpcHN9PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5SZWxhdGlvbnNoaXBzPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC01XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgICAgICA8QWxlcnRUcmlhbmdsZSBjbGFzc05hbWU9XCJoLTggdy04IHRleHQtb3JhbmdlLTMwMFwiIC8+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntzdW1tYXJ5LmhpZ2hSaXNrTm9kZXN9PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5IaWdoIFJpc2sgQ29tcG9uZW50czwvcD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgICAgICAgPEFjdGl2aXR5IGNsYXNzTmFtZT1cImgtOCB3LTggdGV4dC1lbWVyYWxkLTMwMFwiIC8+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntzdW1tYXJ5LmF2Z1Jpc2t9PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5BdmVyYWdlIFJpc2s8L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNlwiPlxuICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPk1vc3QgQ29ubmVjdGVkIENvbXBvbmVudHM8L2gyPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiBzcGFjZS15LTRcIj5cbiAgICAgICAgICAgIHtzdW1tYXJ5Lm1vc3RDb25uZWN0ZWROb2Rlcy5tYXAoKHsgbm9kZSwgY29ubmVjdGlvbnMgfSwgaW5kZXgpID0+IChcbiAgICAgICAgICAgICAgPGRpdiBrZXk9e25vZGUuaWR9IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiByb3VuZGVkLTN4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNzAgcC00XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtNFwiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGgtMTAgdy0xMCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC0yeGwgYmctYmx1ZS01MDAvMTUgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtYmx1ZS0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAge2luZGV4ICsgMX1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57bm9kZS5uYW1lfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTEgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgIHtmb3JtYXRMYWJlbChub2RlLnR5cGUpfSBcdTAwQjcge25vZGUuaWR9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXJpZ2h0XCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC1ibHVlLTMwMFwiPntjb25uZWN0aW9uc308L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS01MDBcIj5Db25uZWN0aW9uczwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdhcC04IHhsOmdyaWQtY29scy1bMWZyXzFmcl1cIj5cbiAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLTN4bCBwLTZcIj5cbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPkNvbXBvbmVudCBUeXBlIEJyZWFrZG93bjwvaDI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgc3BhY2UteS00XCI+XG4gICAgICAgICAgICAgIHtzdW1tYXJ5LnR5cGVEaXN0cmlidXRpb24ubWFwKChlbnRyeSkgPT4gKFxuICAgICAgICAgICAgICAgIDxkaXYga2V5PXtlbnRyeS50eXBlfSBjbGFzc05hbWU9XCJyb3VuZGVkLTN4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNzAgcC00XCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaC0zIHctMyByb3VuZGVkLWZ1bGxcIiBzdHlsZT17eyBiYWNrZ3JvdW5kQ29sb3I6IGdldFR5cGVDb2xvcihlbnRyeS50eXBlKSB9fSAvPlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj57Zm9ybWF0TGFiZWwoZW50cnkudHlwZSl9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57ZW50cnkuY291bnR9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC02XCI+XG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC14bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj5SaXNrIERpc3RyaWJ1dGlvbjwvaDI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgc3BhY2UteS00XCI+XG4gICAgICAgICAgICAgIHtzdW1tYXJ5LnJpc2tEaXN0cmlidXRpb24ubWFwKChlbnRyeSkgPT4gKFxuICAgICAgICAgICAgICAgIDxkaXYga2V5PXtlbnRyeS5rZXl9IGNsYXNzTmFtZT1cInJvdW5kZWQtM3hsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC83MCBwLTRcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj57ZW50cnkubGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntlbnRyeS5jb3VudH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMyBoLTIgb3ZlcmZsb3ctaGlkZGVuIHJvdW5kZWQtZnVsbCBiZy1zbGF0ZS04MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImgtZnVsbCByb3VuZGVkLWZ1bGxcIlxuICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogYCR7c3VtbWFyeS50b3RhbENvbXBvbmVudHMgPT09IDAgPyAwIDogKGVudHJ5LmNvdW50IC8gc3VtbWFyeS50b3RhbENvbXBvbmVudHMpICogMTAwfSVgLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBnZXRSaXNrQ29sb3IoZW50cnkua2V5KSxcbiAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9zZWN0aW9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuIiwgImltcG9ydCB7IHVzZVJlZiB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB0eXBlIHsgQ2hhbmdlRXZlbnQsIERyYWdFdmVudCB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IENoZXZyb25SaWdodCwgRmlsZVRleHQsIE5ldHdvcmssIFNoaWVsZCwgVXBsb2FkIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7IHVzZU5hdmlnYXRlIH0gZnJvbSAncmVhY3Qtcm91dGVyLWRvbSc7XG5pbXBvcnQgQmFkZ2UgZnJvbSAnLi4vY29tcG9uZW50cy91aS9CYWRnZSc7XG5pbXBvcnQgQnV0dG9uIGZyb20gJy4uL2NvbXBvbmVudHMvdWkvQnV0dG9uJztcbmltcG9ydCBTdGF0dXNCYW5uZXIgZnJvbSAnLi4vY29tcG9uZW50cy9TdGF0dXNCYW5uZXInO1xuaW1wb3J0IHsgYXBwQ29uZmlnIH0gZnJvbSAnLi4vbGliL2NvbmZpZyc7XG5pbXBvcnQgeyB1c2VBcHBDb250ZXh0IH0gZnJvbSAnLi4vc3RhdGUvQXBwQ29udGV4dCc7XG5cbmZ1bmN0aW9uIGZvcm1hdEZpbGVTaXplKHNpemU6IG51bWJlcikge1xuICBpZiAoc2l6ZSA8IDEwMjQgKiAxMDI0KSB7XG4gICAgcmV0dXJuIGAkeyhzaXplIC8gMTAyNCkudG9GaXhlZCgxKX0gS0JgO1xuICB9XG4gIHJldHVybiBgJHsoc2l6ZSAvIDEwMjQgLyAxMDI0KS50b0ZpeGVkKDIpfSBNQmA7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIERvY3VtZW50VXBsb2FkUGFnZSgpIHtcbiAgY29uc3QgbmF2aWdhdGUgPSB1c2VOYXZpZ2F0ZSgpO1xuICBjb25zdCBmaWxlSW5wdXRSZWYgPSB1c2VSZWY8SFRNTElucHV0RWxlbWVudCB8IG51bGw+KG51bGwpO1xuICBjb25zdCB7XG4gICAgZG9jdW1lbnRVcGxvYWQsXG4gICAgZG9jdW1lbnRHcmFwaCxcbiAgICBzZXREb2N1bWVudERyYWdBY3RpdmUsXG4gICAgc2VsZWN0RG9jdW1lbnRGaWxlLFxuICAgIGNsZWFyU2VsZWN0ZWREb2N1bWVudEZpbGUsXG4gIH0gPSB1c2VBcHBDb250ZXh0KCk7XG4gIGNvbnN0IHNlbGVjdGVkRmlsZSA9IGRvY3VtZW50VXBsb2FkLnNlbGVjdGVkRmlsZTtcblxuICBjb25zdCBoYW5kbGVGaWxlID0gKGZpbGU6IEZpbGUgfCBudWxsKSA9PiB7XG4gICAgc2VsZWN0RG9jdW1lbnRGaWxlKGZpbGUpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZURyb3AgPSAoZXZlbnQ6IERyYWdFdmVudDxIVE1MRGl2RWxlbWVudD4pID0+IHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHNldERvY3VtZW50RHJhZ0FjdGl2ZShmYWxzZSk7XG4gICAgaGFuZGxlRmlsZShldmVudC5kYXRhVHJhbnNmZXIuZmlsZXM/LlswXSA/PyBudWxsKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVGaWxlSW5wdXQgPSAoZXZlbnQ6IENoYW5nZUV2ZW50PEhUTUxJbnB1dEVsZW1lbnQ+KSA9PiB7XG4gICAgaGFuZGxlRmlsZShldmVudC50YXJnZXQuZmlsZXM/LlswXSA/PyBudWxsKTtcbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLVsjMEYxNzJBXSB0ZXh0LXdoaXRlXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gbWF4LXctN3hsIHB4LTYgcHktMTBcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi02IGZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTNcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzcwIHAtMVwiPlxuICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnLycpfSBjbGFzc05hbWU9XCJyb3VuZGVkLXhsIHB4LTQgcHktMiB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1zbGF0ZS0zMDAgdHJhbnNpdGlvbiBob3Zlcjp0ZXh0LXdoaXRlXCI+XG4gICAgICAgICAgICAgIFJpc2sgV29ya3NwYWNlXG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwicm91bmRlZC14bCBiZy1ibHVlLTYwMCBweC00IHB5LTIgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj5Eb2N1bWVudCBXb3Jrc3BhY2U8L2J1dHRvbj5cbiAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9ncmFwaHMnKX0gY2xhc3NOYW1lPVwicm91bmRlZC14bCBweC00IHB5LTIgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtc2xhdGUtMzAwIHRyYW5zaXRpb24gaG92ZXI6dGV4dC13aGl0ZVwiPlxuICAgICAgICAgICAgICBHcmFwaCBXb3Jrc3BhY2VcbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxCdXR0b24gdmFyaWFudD1cInNlY29uZGFyeVwiIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvZG9jdW1lbnRzL3dvcmtzcGFjZScpfSBkaXNhYmxlZD17IWRvY3VtZW50R3JhcGguZGF0YX0+XG4gICAgICAgICAgICBPcGVuIERvY3VtZW50IEdyYXBoXG4gICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBnYXAtMTAgeGw6Z3JpZC1jb2xzLVsxLjJmcl8wLjhmcl1cIj5cbiAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLVszMnB4XSBweC04IHB5LTEwIG1kOnB4LTEwIG1kOnB5LTEyXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTNcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBiZy1ibHVlLTUwMC8xNSBwLTMgdGV4dC1ibHVlLTMwMFwiPlxuICAgICAgICAgICAgICAgIDxGaWxlVGV4dCBjbGFzc05hbWU9XCJoLTggdy04XCIgLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNtIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yMmVtXSB0ZXh0LWJsdWUtMzAwXCI+RG9jdW1lbnQgS25vd2xlZGdlIEdyYXBoczwvZGl2PlxuICAgICAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJtdC0xIHRleHQtNXhsIGZvbnQtYm9sZCB0cmFja2luZy10aWdodCB0ZXh0LXdoaXRlIG1kOnRleHQtNnhsXCI+VHdpbkdyYXBoT3BzPC9oMT5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibWF4LXctM3hsIHRleHQtbGcgbGVhZGluZy04IHRleHQtc2xhdGUtMzAwXCI+XG4gICAgICAgICAgICAgIFVwbG9hZCBhIFBERiwgbWFya2Rvd24sIG9yIHRleHQgZG9jdW1lbnQgYW5kIGV4dHJhY3QgYSBnZW5lcmljIGtub3dsZWRnZSBncmFwaCB3aXRoIGV2aWRlbmNlLWJhY2tlZCBub2RlcywgcmVsYXRpb25zaGlwcywgYW5kIHNvdXJjZSBjaHVua3MuXG4gICAgICAgICAgICA8L3A+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtOCBmbGV4IGZsZXgtd3JhcCBnYXAtM1wiPlxuICAgICAgICAgICAgICA8QmFkZ2UgY2xhc3NOYW1lPVwiYm9yZGVyLWJsdWUtNTAwLzMwIGJnLWJsdWUtNTAwLzEwIHRleHQtYmx1ZS0xMDBcIj5BUEkge2FwcENvbmZpZy5hcGlCYXNlVXJsfTwvQmFkZ2U+XG4gICAgICAgICAgICAgIDxCYWRnZSBjbGFzc05hbWU9XCJib3JkZXItc2xhdGUtNzAwIGJnLXNsYXRlLTkwMC84MCB0ZXh0LXNsYXRlLTIwMFwiPlxuICAgICAgICAgICAgICAgIFVwbG9hZCBsaW1pdCB7TWF0aC5yb3VuZChhcHBDb25maWcubWF4VXBsb2FkQnl0ZXMgLyAxMDI0IC8gMTAyNCl9IE1CXG4gICAgICAgICAgICAgIDwvQmFkZ2U+XG4gICAgICAgICAgICAgIDxCYWRnZSBjbGFzc05hbWU9XCJib3JkZXItc2xhdGUtNzAwIGJnLXNsYXRlLTkwMC84MCB0ZXh0LXNsYXRlLTIwMFwiPlBERiBhdXRvLWNvbnZlcnQ8L0JhZGdlPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMTIgZ3JpZCBnYXAtNiBtZDpncmlkLWNvbHMtM1wiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtWzI4cHhdIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC81NSBwLTZcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgZmxleCBoLTEyIHctMTIgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtMnhsIGJnLWJsdWUtNTAwLzE1IHRleHQtYmx1ZS0zMDBcIj5cbiAgICAgICAgICAgICAgICAgIDxVcGxvYWQgY2xhc3NOYW1lPVwiaC02IHctNlwiIC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+MS4gVXBsb2FkIERvY3VtZW50PC9oMj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gbGVhZGluZy02IHRleHQtc2xhdGUtNDAwXCI+VXNlIGAucGRmYCwgYC5tZGAsIG9yIGAudHh0YDsgUERGcyBiZWNvbWUgcGFnZS1tYXJrZWQgbWFya2Rvd24gZmlyc3QuPC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLVsyOHB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNTUgcC02XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi00IGZsZXggaC0xMiB3LTEyIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLTJ4bCBiZy1wdXJwbGUtNTAwLzE1IHRleHQtcHVycGxlLTMwMFwiPlxuICAgICAgICAgICAgICAgICAgPE5ldHdvcmsgY2xhc3NOYW1lPVwiaC02IHctNlwiIC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+Mi4gQnVpbGQgR3JhcGg8L2gyPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBsZWFkaW5nLTYgdGV4dC1zbGF0ZS00MDBcIj5UaGUgYmFja2VuZCBleHRyYWN0cyBlbnRpdGllcywgY29uY2VwdHMsIGNsYWltcywgcmVxdWlyZW1lbnRzLCBhbmQgcmVsYXRpb25zaGlwcy48L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtWzI4cHhdIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC81NSBwLTZcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgZmxleCBoLTEyIHctMTIgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtMnhsIGJnLW9yYW5nZS01MDAvMTUgdGV4dC1vcmFuZ2UtMzAwXCI+XG4gICAgICAgICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cImgtNiB3LTZcIiAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPjMuIEluc3BlY3QgRXZpZGVuY2U8L2gyPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBsZWFkaW5nLTYgdGV4dC1zbGF0ZS00MDBcIj5SZXZpZXcgZ3JhcGggbm9kZXMsIGVkZ2VzLCBxdW90ZXMsIGFuZCBwYWdlIHJlZmVyZW5jZXMgaW4gYSBkZWRpY2F0ZWQgd29ya3NwYWNlLjwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgICA8YXNpZGUgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC1bMzJweF0gcC04XCI+XG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC14bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj5Eb2N1bWVudCBJbmdlc3Q8L2gyPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMyB0ZXh0LXNtIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTMwMFwiPlxuICAgICAgICAgICAgICBRdWV1ZSBvbmUgZG9jdW1lbnQgZm9yIGV4dHJhY3Rpb24uIFRoZSBkb2N1bWVudCBncmFwaCB3b3Jrc3BhY2UgcmVmcmVzaGVzIHdoZW4gcHJvY2Vzc2luZyBjb21wbGV0ZXMuXG4gICAgICAgICAgICA8L3A+XG5cbiAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgbXQtNiByb3VuZGVkLVsyOHB4XSBib3JkZXItMiBib3JkZXItZGFzaGVkIHAtOCB0ZXh0LWNlbnRlciB0cmFuc2l0aW9uICR7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnRVcGxvYWQucGhhc2UgPT09ICdkcmFnLWhvdmVyJ1xuICAgICAgICAgICAgICAgICAgPyAnYm9yZGVyLWJsdWUtNDAwIGJnLWJsdWUtNTAwLzEwJ1xuICAgICAgICAgICAgICAgICAgOiAnYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05NTAvNTAgaG92ZXI6Ym9yZGVyLXNsYXRlLTUwMCdcbiAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgIG9uRHJhZ092ZXI9eyhldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgc2V0RG9jdW1lbnREcmFnQWN0aXZlKHRydWUpO1xuICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICBvbkRyYWdMZWF2ZT17KCkgPT4gc2V0RG9jdW1lbnREcmFnQWN0aXZlKGZhbHNlKX1cbiAgICAgICAgICAgICAgb25Ecm9wPXtoYW5kbGVEcm9wfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8VXBsb2FkIGNsYXNzTmFtZT1cIm14LWF1dG8gaC0xNCB3LTE0IHRleHQtc2xhdGUtNDAwXCIgLz5cbiAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cIm10LTQgdGV4dC14bCBmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+VXBsb2FkIERvY3VtZW50PC9oMz5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+RHJhZyBhbmQgZHJvcCB5b3VyIGZpbGUgaGVyZSBvciBicm93c2UgbG9jYWxseS48L3A+XG4gICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgIHJlZj17ZmlsZUlucHV0UmVmfVxuICAgICAgICAgICAgICAgIHR5cGU9XCJmaWxlXCJcbiAgICAgICAgICAgICAgICBhY2NlcHQ9XCIucGRmLC5tZCwudHh0LGFwcGxpY2F0aW9uL3BkZix0ZXh0L3BsYWluLHRleHQvbWFya2Rvd25cIlxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImhpZGRlblwiXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9e2hhbmRsZUZpbGVJbnB1dH1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC02IGZsZXggZmxleC13cmFwIGp1c3RpZnktY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PVwic2Vjb25kYXJ5XCIgb25DbGljaz17KCkgPT4gZmlsZUlucHV0UmVmLmN1cnJlbnQ/LmNsaWNrKCl9PlxuICAgICAgICAgICAgICAgICAgPEZpbGVUZXh0IGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPlxuICAgICAgICAgICAgICAgICAgQ2hvb3NlIEZpbGVcbiAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICAgICA8QnV0dG9uIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvZG9jdW1lbnRzL3Byb2Nlc3NpbmcnKX0gZGlzYWJsZWQ9eyFzZWxlY3RlZEZpbGV9PlxuICAgICAgICAgICAgICAgICAgTWFwIERvY3VtZW50XG4gICAgICAgICAgICAgICAgICA8Q2hldnJvblJpZ2h0IGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPlxuICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtNCB0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yZW1dIHRleHQtc2xhdGUtNTAwXCI+U3VwcG9ydGVkIGZvcm1hdHM6IC5wZGYsIC5tZCwgYW5kIC50eHQ8L3A+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC02IHJvdW5kZWQtWzI4cHhdIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC82MCBwLTRcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtNFwiPlxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPlNlbGVjdGVkIEZpbGU8L3A+XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gZm9udC1tZWRpdW0gdGV4dC13aGl0ZVwiPntzZWxlY3RlZEZpbGU/Lm5hbWUgPz8gJ05vIGZpbGUgc2VsZWN0ZWQuJ308L3A+XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0xIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAge3NlbGVjdGVkRmlsZSA/IGZvcm1hdEZpbGVTaXplKHNlbGVjdGVkRmlsZS5zaXplKSA6ICdDaG9vc2UgYSBkb2N1bWVudCB0byBiZWdpbi4nfVxuICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIHtzZWxlY3RlZEZpbGUgPyAoXG4gICAgICAgICAgICAgICAgICA8QnV0dG9uIHZhcmlhbnQ9XCJnaG9zdFwiIG9uQ2xpY2s9e2NsZWFyU2VsZWN0ZWREb2N1bWVudEZpbGV9PlxuICAgICAgICAgICAgICAgICAgICBDbGVhclxuICAgICAgICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNlwiPlxuICAgICAgICAgICAgICA8U3RhdHVzQmFubmVyXG4gICAgICAgICAgICAgICAgdG9uZT17ZG9jdW1lbnRVcGxvYWQuZXJyb3IgPyAnZXJyb3InIDogZG9jdW1lbnRHcmFwaC5kYXRhID8gJ3N1Y2Nlc3MnIDogJ2luZm8nfVxuICAgICAgICAgICAgICAgIG1lc3NhZ2U9e2RvY3VtZW50VXBsb2FkLmVycm9yIHx8IGRvY3VtZW50VXBsb2FkLnN0YXR1c01lc3NhZ2UgfHwgJ1VwbG9hZCBhIGRvY3VtZW50IHRvIGNvbnRpbnVlLid9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2FzaWRlPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuIiwgImltcG9ydCB0eXBlIHsgSW5wdXRIVE1MQXR0cmlidXRlcyB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGNuIH0gZnJvbSAnLi4vLi4vbGliL2NuJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gSW5wdXQoeyBjbGFzc05hbWUsIC4uLnByb3BzIH06IElucHV0SFRNTEF0dHJpYnV0ZXM8SFRNTElucHV0RWxlbWVudD4pIHtcbiAgcmV0dXJuIChcbiAgICA8aW5wdXRcbiAgICAgIGNsYXNzTmFtZT17Y24oXG4gICAgICAgICd3LWZ1bGwgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05NTAvODAgcHgtMyBweS0yLjUgdGV4dC1zbSB0ZXh0LXdoaXRlIG91dGxpbmUtbm9uZSB0cmFuc2l0aW9uIGZvY3VzOmJvcmRlci1ibHVlLTQwMCBmb2N1czpyaW5nLTIgZm9jdXM6cmluZy1ibHVlLTUwMC8yNScsXG4gICAgICAgIGNsYXNzTmFtZVxuICAgICAgKX1cbiAgICAgIHsuLi5wcm9wc31cbiAgICAvPlxuICApO1xufVxuIiwgImltcG9ydCB7IHVzZURlZmVycmVkVmFsdWUsIHVzZUVmZmVjdCwgdXNlTWVtbywgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBBcnJvd1VwRG93biwgRXh0ZXJuYWxMaW5rLCBGaWx0ZXIsIFNlYXJjaCB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQgdHlwZSB7IERvY3VtZW50R3JhcGhEYXRhIH0gZnJvbSAnLi4vdHlwZXMvYXBwJztcbmltcG9ydCB7IGZvcm1hdExhYmVsLCBnZXREb2N1bWVudEtpbmRDb2xvciwgZ2V0TGlua0VuZHBvaW50SWQgfSBmcm9tICcuLi9saWIvc2VsZWN0b3JzJztcbmltcG9ydCBCYWRnZSBmcm9tICcuL3VpL0JhZGdlJztcbmltcG9ydCBCdXR0b24gZnJvbSAnLi91aS9CdXR0b24nO1xuaW1wb3J0IElucHV0IGZyb20gJy4vdWkvSW5wdXQnO1xuXG5pbnRlcmZhY2UgRG9jdW1lbnROb2Rlc0VkZ2VzVmlld1Byb3BzIHtcbiAgZ3JhcGhEYXRhOiBEb2N1bWVudEdyYXBoRGF0YTtcbiAgb25Ob2RlU2VsZWN0OiAobm9kZUlkOiBzdHJpbmcpID0+IHZvaWQ7XG59XG5cbnR5cGUgQWN0aXZlVGFibGUgPSAnbm9kZXMnIHwgJ2VkZ2VzJztcbnR5cGUgTm9kZVNvcnRGaWVsZCA9ICdjYW5vbmljYWxOYW1lJyB8ICdraW5kJyB8ICdkZWdyZWUnIHwgJ2V2aWRlbmNlJztcbnR5cGUgRWRnZVNvcnRGaWVsZCA9ICdzb3VyY2UnIHwgJ3RhcmdldCcgfCAndHlwZSc7XG5cbmNvbnN0IHBhZ2VTaXplID0gMTA7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIERvY3VtZW50Tm9kZXNFZGdlc1ZpZXcoeyBncmFwaERhdGEsIG9uTm9kZVNlbGVjdCB9OiBEb2N1bWVudE5vZGVzRWRnZXNWaWV3UHJvcHMpIHtcbiAgY29uc3QgW2FjdGl2ZVRhYmxlLCBzZXRBY3RpdmVUYWJsZV0gPSB1c2VTdGF0ZTxBY3RpdmVUYWJsZT4oJ25vZGVzJyk7XG4gIGNvbnN0IFtzZWFyY2hUZXJtLCBzZXRTZWFyY2hUZXJtXSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW2tpbmRGaWx0ZXIsIHNldEtpbmRGaWx0ZXJdID0gdXNlU3RhdGUoJ2FsbCcpO1xuICBjb25zdCBbcmVsYXRpb25GaWx0ZXIsIHNldFJlbGF0aW9uRmlsdGVyXSA9IHVzZVN0YXRlKCdhbGwnKTtcbiAgY29uc3QgW25vZGVTb3J0RmllbGQsIHNldE5vZGVTb3J0RmllbGRdID0gdXNlU3RhdGU8Tm9kZVNvcnRGaWVsZD4oJ2RlZ3JlZScpO1xuICBjb25zdCBbbm9kZVNvcnRPcmRlciwgc2V0Tm9kZVNvcnRPcmRlcl0gPSB1c2VTdGF0ZTwnYXNjJyB8ICdkZXNjJz4oJ2Rlc2MnKTtcbiAgY29uc3QgW2VkZ2VTb3J0RmllbGQsIHNldEVkZ2VTb3J0RmllbGRdID0gdXNlU3RhdGU8RWRnZVNvcnRGaWVsZD4oJ3NvdXJjZScpO1xuICBjb25zdCBbZWRnZVNvcnRPcmRlciwgc2V0RWRnZVNvcnRPcmRlcl0gPSB1c2VTdGF0ZTwnYXNjJyB8ICdkZXNjJz4oJ2FzYycpO1xuICBjb25zdCBbcGFnZSwgc2V0UGFnZV0gPSB1c2VTdGF0ZSgxKTtcbiAgY29uc3QgZGVmZXJyZWRTZWFyY2ggPSB1c2VEZWZlcnJlZFZhbHVlKHNlYXJjaFRlcm0udHJpbSgpLnRvTG93ZXJDYXNlKCkpO1xuXG4gIGNvbnN0IGZpbHRlcmVkTm9kZXMgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBjb25zdCBub2RlcyA9IGdyYXBoRGF0YS5ub2Rlcy5maWx0ZXIoKG5vZGUpID0+IHtcbiAgICAgIGNvbnN0IG1hdGNoZXNTZWFyY2ggPVxuICAgICAgICBkZWZlcnJlZFNlYXJjaC5sZW5ndGggPT09IDAgfHxcbiAgICAgICAgbm9kZS5sYWJlbC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGRlZmVycmVkU2VhcmNoKSB8fFxuICAgICAgICBub2RlLmNhbm9uaWNhbE5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhkZWZlcnJlZFNlYXJjaCkgfHxcbiAgICAgICAgbm9kZS5zdW1tYXJ5LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoZGVmZXJyZWRTZWFyY2gpO1xuICAgICAgY29uc3QgbWF0Y2hlc0tpbmQgPSBraW5kRmlsdGVyID09PSAnYWxsJyB8fCBub2RlLmtpbmQgPT09IGtpbmRGaWx0ZXI7XG4gICAgICByZXR1cm4gbWF0Y2hlc1NlYXJjaCAmJiBtYXRjaGVzS2luZDtcbiAgICB9KTtcblxuICAgIHJldHVybiBub2Rlcy5zb3J0KChsZWZ0LCByaWdodCkgPT4ge1xuICAgICAgbGV0IGNvbXBhcmlzb24gPSAwO1xuICAgICAgc3dpdGNoIChub2RlU29ydEZpZWxkKSB7XG4gICAgICAgIGNhc2UgJ2Nhbm9uaWNhbE5hbWUnOlxuICAgICAgICAgIGNvbXBhcmlzb24gPSBsZWZ0LmNhbm9uaWNhbE5hbWUubG9jYWxlQ29tcGFyZShyaWdodC5jYW5vbmljYWxOYW1lKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAna2luZCc6XG4gICAgICAgICAgY29tcGFyaXNvbiA9IGxlZnQua2luZC5sb2NhbGVDb21wYXJlKHJpZ2h0LmtpbmQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdldmlkZW5jZSc6XG4gICAgICAgICAgY29tcGFyaXNvbiA9IGxlZnQuZXZpZGVuY2UubGVuZ3RoIC0gcmlnaHQuZXZpZGVuY2UubGVuZ3RoO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkZWdyZWUnOlxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbXBhcmlzb24gPSBsZWZ0LmRlZ3JlZSAtIHJpZ2h0LmRlZ3JlZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlU29ydE9yZGVyID09PSAnYXNjJyA/IGNvbXBhcmlzb24gOiAtY29tcGFyaXNvbjtcbiAgICB9KTtcbiAgfSwgW2RlZmVycmVkU2VhcmNoLCBncmFwaERhdGEubm9kZXMsIGtpbmRGaWx0ZXIsIG5vZGVTb3J0RmllbGQsIG5vZGVTb3J0T3JkZXJdKTtcblxuICBjb25zdCBmaWx0ZXJlZEVkZ2VzID0gdXNlTWVtbygoKSA9PiB7XG4gICAgY29uc3QgZWRnZXMgPSBncmFwaERhdGEubGlua3MuZmlsdGVyKChlZGdlKSA9PiB7XG4gICAgICBjb25zdCBzb3VyY2VOYW1lID0gZ3JhcGhEYXRhLm5vZGVJbmRleFtnZXRMaW5rRW5kcG9pbnRJZChlZGdlLnNvdXJjZSldPy5jYW5vbmljYWxOYW1lID8/IGdldExpbmtFbmRwb2ludElkKGVkZ2Uuc291cmNlKTtcbiAgICAgIGNvbnN0IHRhcmdldE5hbWUgPSBncmFwaERhdGEubm9kZUluZGV4W2dldExpbmtFbmRwb2ludElkKGVkZ2UudGFyZ2V0KV0/LmNhbm9uaWNhbE5hbWUgPz8gZ2V0TGlua0VuZHBvaW50SWQoZWRnZS50YXJnZXQpO1xuICAgICAgY29uc3QgbWF0Y2hlc1NlYXJjaCA9XG4gICAgICAgIGRlZmVycmVkU2VhcmNoLmxlbmd0aCA9PT0gMCB8fFxuICAgICAgICBzb3VyY2VOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoZGVmZXJyZWRTZWFyY2gpIHx8XG4gICAgICAgIHRhcmdldE5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhkZWZlcnJlZFNlYXJjaCkgfHxcbiAgICAgICAgZWRnZS50eXBlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoZGVmZXJyZWRTZWFyY2gpIHx8XG4gICAgICAgIGVkZ2Uuc3VtbWFyeS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGRlZmVycmVkU2VhcmNoKTtcbiAgICAgIGNvbnN0IG1hdGNoZXNSZWxhdGlvbiA9IHJlbGF0aW9uRmlsdGVyID09PSAnYWxsJyB8fCBlZGdlLnR5cGUgPT09IHJlbGF0aW9uRmlsdGVyO1xuICAgICAgcmV0dXJuIG1hdGNoZXNTZWFyY2ggJiYgbWF0Y2hlc1JlbGF0aW9uO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGVkZ2VzLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiB7XG4gICAgICBsZXQgY29tcGFyaXNvbiA9IDA7XG4gICAgICBzd2l0Y2ggKGVkZ2VTb3J0RmllbGQpIHtcbiAgICAgICAgY2FzZSAndGFyZ2V0JzpcbiAgICAgICAgICBjb21wYXJpc29uID0gZ2V0TGlua0VuZHBvaW50SWQobGVmdC50YXJnZXQpLmxvY2FsZUNvbXBhcmUoZ2V0TGlua0VuZHBvaW50SWQocmlnaHQudGFyZ2V0KSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3R5cGUnOlxuICAgICAgICAgIGNvbXBhcmlzb24gPSBsZWZ0LnR5cGUubG9jYWxlQ29tcGFyZShyaWdodC50eXBlKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnc291cmNlJzpcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBjb21wYXJpc29uID0gZ2V0TGlua0VuZHBvaW50SWQobGVmdC5zb3VyY2UpLmxvY2FsZUNvbXBhcmUoZ2V0TGlua0VuZHBvaW50SWQocmlnaHQuc291cmNlKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZWRnZVNvcnRPcmRlciA9PT0gJ2FzYycgPyBjb21wYXJpc29uIDogLWNvbXBhcmlzb247XG4gICAgfSk7XG4gIH0sIFtkZWZlcnJlZFNlYXJjaCwgZWRnZVNvcnRGaWVsZCwgZWRnZVNvcnRPcmRlciwgZ3JhcGhEYXRhLmxpbmtzLCBncmFwaERhdGEubm9kZUluZGV4LCByZWxhdGlvbkZpbHRlcl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgc2V0UGFnZSgxKTtcbiAgfSwgW2FjdGl2ZVRhYmxlLCBkZWZlcnJlZFNlYXJjaCwgZWRnZVNvcnRGaWVsZCwgZWRnZVNvcnRPcmRlciwga2luZEZpbHRlciwgbm9kZVNvcnRGaWVsZCwgbm9kZVNvcnRPcmRlciwgcmVsYXRpb25GaWx0ZXJdKTtcblxuICBjb25zdCBwYWdlZE5vZGVzID0gZmlsdGVyZWROb2Rlcy5zbGljZSgocGFnZSAtIDEpICogcGFnZVNpemUsIHBhZ2UgKiBwYWdlU2l6ZSk7XG4gIGNvbnN0IHBhZ2VkRWRnZXMgPSBmaWx0ZXJlZEVkZ2VzLnNsaWNlKChwYWdlIC0gMSkgKiBwYWdlU2l6ZSwgcGFnZSAqIHBhZ2VTaXplKTtcbiAgY29uc3QgcGFnZUNvdW50ID0gTWF0aC5tYXgoMSwgTWF0aC5jZWlsKChhY3RpdmVUYWJsZSA9PT0gJ25vZGVzJyA/IGZpbHRlcmVkTm9kZXMubGVuZ3RoIDogZmlsdGVyZWRFZGdlcy5sZW5ndGgpIC8gcGFnZVNpemUpKTtcblxuICBjb25zdCB0b2dnbGVOb2RlU29ydCA9IChmaWVsZDogTm9kZVNvcnRGaWVsZCkgPT4ge1xuICAgIGlmIChub2RlU29ydEZpZWxkID09PSBmaWVsZCkge1xuICAgICAgc2V0Tm9kZVNvcnRPcmRlcigoY3VycmVudCkgPT4gKGN1cnJlbnQgPT09ICdhc2MnID8gJ2Rlc2MnIDogJ2FzYycpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2V0Tm9kZVNvcnRGaWVsZChmaWVsZCk7XG4gICAgc2V0Tm9kZVNvcnRPcmRlcihmaWVsZCA9PT0gJ2Nhbm9uaWNhbE5hbWUnIHx8IGZpZWxkID09PSAna2luZCcgPyAnYXNjJyA6ICdkZXNjJyk7XG4gIH07XG5cbiAgY29uc3QgdG9nZ2xlRWRnZVNvcnQgPSAoZmllbGQ6IEVkZ2VTb3J0RmllbGQpID0+IHtcbiAgICBpZiAoZWRnZVNvcnRGaWVsZCA9PT0gZmllbGQpIHtcbiAgICAgIHNldEVkZ2VTb3J0T3JkZXIoKGN1cnJlbnQpID0+IChjdXJyZW50ID09PSAnYXNjJyA/ICdkZXNjJyA6ICdhc2MnKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNldEVkZ2VTb3J0RmllbGQoZmllbGQpO1xuICAgIHNldEVkZ2VTb3J0T3JkZXIoJ2FzYycpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgb3ZlcmZsb3cteS1hdXRvIHAtNiBtZDpwLThcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXgtYXV0byBtYXgtdy03eGwgc3BhY2UteS02XCI+XG4gICAgICAgIDxkaXY+XG4gICAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYm9sZCB0ZXh0LXdoaXRlXCI+Tm9kZXMgJiBFZGdlczwvaDE+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIHRleHQtc2xhdGUtMzAwXCI+U2VhcmNoLCBmaWx0ZXIsIHNvcnQsIGFuZCBpbnNwZWN0IGV4dHJhY3RlZCBkb2N1bWVudCBrbm93bGVkZ2UuPC9wPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBnYXAtNCBsZzpncmlkLWNvbHMtW21pbm1heCgwLDFmcilfMjIwcHhfMjIwcHhfYXV0b11cIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmVcIj5cbiAgICAgICAgICAgICAgPFNlYXJjaCBjbGFzc05hbWU9XCJwb2ludGVyLWV2ZW50cy1ub25lIGFic29sdXRlIGxlZnQtMyB0b3AtMS8yIGgtNCB3LTQgLXRyYW5zbGF0ZS15LTEvMiB0ZXh0LXNsYXRlLTUwMFwiIC8+XG4gICAgICAgICAgICAgIDxJbnB1dFxuICAgICAgICAgICAgICAgIHZhbHVlPXtzZWFyY2hUZXJtfVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldFNlYXJjaFRlcm0oZXZlbnQudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj17YWN0aXZlVGFibGUgPT09ICdub2RlcycgPyAnU2VhcmNoIG5vZGVzIGJ5IG5hbWUsIGtpbmQsIG9yIHN1bW1hcnknIDogJ1NlYXJjaCBlZGdlcyBieSBzb3VyY2UsIHRhcmdldCwgb3IgcmVsYXRpb24nfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBsLTEwXCJcbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzcwIHB4LTNcIj5cbiAgICAgICAgICAgICAgPEZpbHRlciBjbGFzc05hbWU9XCJoLTQgdy00IHRleHQtc2xhdGUtNTAwXCIgLz5cbiAgICAgICAgICAgICAgPHNlbGVjdCB2YWx1ZT17a2luZEZpbHRlcn0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0S2luZEZpbHRlcihldmVudC50YXJnZXQudmFsdWUpfSBjbGFzc05hbWU9XCJ3LWZ1bGwgYmctdHJhbnNwYXJlbnQgcHktMyB0ZXh0LXNtIHRleHQtd2hpdGUgb3V0bGluZS1ub25lXCIgZGlzYWJsZWQ9e2FjdGl2ZVRhYmxlICE9PSAnbm9kZXMnfT5cbiAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwiYWxsXCI+QWxsIGtpbmRzPC9vcHRpb24+XG4gICAgICAgICAgICAgICAge2dyYXBoRGF0YS5raW5kVHlwZXMubWFwKChraW5kKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8b3B0aW9uIGtleT17a2luZH0gdmFsdWU9e2tpbmR9PlxuICAgICAgICAgICAgICAgICAgICB7Zm9ybWF0TGFiZWwoa2luZCl9XG4gICAgICAgICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICA8L2xhYmVsPlxuXG4gICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzcwIHB4LTNcIj5cbiAgICAgICAgICAgICAgPEZpbHRlciBjbGFzc05hbWU9XCJoLTQgdy00IHRleHQtc2xhdGUtNTAwXCIgLz5cbiAgICAgICAgICAgICAgPHNlbGVjdCB2YWx1ZT17cmVsYXRpb25GaWx0ZXJ9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldFJlbGF0aW9uRmlsdGVyKGV2ZW50LnRhcmdldC52YWx1ZSl9IGNsYXNzTmFtZT1cInctZnVsbCBiZy10cmFuc3BhcmVudCBweS0zIHRleHQtc20gdGV4dC13aGl0ZSBvdXRsaW5lLW5vbmVcIiBkaXNhYmxlZD17YWN0aXZlVGFibGUgIT09ICdlZGdlcyd9PlxuICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJhbGxcIj5BbGwgcmVsYXRpb25zPC9vcHRpb24+XG4gICAgICAgICAgICAgICAge2dyYXBoRGF0YS5yZWxhdGlvblR5cGVzLm1hcCgocmVsYXRpb24pID0+IChcbiAgICAgICAgICAgICAgICAgIDxvcHRpb24ga2V5PXtyZWxhdGlvbn0gdmFsdWU9e3JlbGF0aW9ufT5cbiAgICAgICAgICAgICAgICAgICAge2Zvcm1hdExhYmVsKHJlbGF0aW9uKX1cbiAgICAgICAgICAgICAgICAgIDwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgIDwvbGFiZWw+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PXthY3RpdmVUYWJsZSA9PT0gJ25vZGVzJyA/ICdwcmltYXJ5JyA6ICdzZWNvbmRhcnknfSBvbkNsaWNrPXsoKSA9PiBzZXRBY3RpdmVUYWJsZSgnbm9kZXMnKX0+Tm9kZXM8L0J1dHRvbj5cbiAgICAgICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PXthY3RpdmVUYWJsZSA9PT0gJ2VkZ2VzJyA/ICdwcmltYXJ5JyA6ICdzZWNvbmRhcnknfSBvbkNsaWNrPXsoKSA9PiBzZXRBY3RpdmVUYWJsZSgnZWRnZXMnKX0+RWRnZXM8L0J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIG92ZXJmbG93LWhpZGRlbiByb3VuZGVkLTN4bFwiPlxuICAgICAgICAgIHthY3RpdmVUYWJsZSA9PT0gJ25vZGVzJyA/IChcbiAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtWzEuNGZyXzAuOGZyXzAuN2ZyXzAuN2ZyXzFmcl8wLjdmcl0gZ2FwLTQgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvOTAgcHgtNCBweS00IHRleHQtbGVmdCB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgICAge1tcbiAgICAgICAgICAgICAgICAgIFsnY2Fub25pY2FsTmFtZScsICdOb2RlJ10sXG4gICAgICAgICAgICAgICAgICBbJ2tpbmQnLCAnS2luZCddLFxuICAgICAgICAgICAgICAgICAgWydkZWdyZWUnLCAnRGVncmVlJ10sXG4gICAgICAgICAgICAgICAgICBbJ2V2aWRlbmNlJywgJ0V2aWRlbmNlJ10sXG4gICAgICAgICAgICAgICAgXS5tYXAoKFtmaWVsZCwgbGFiZWxdKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIGtleT17ZmllbGR9IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHRleHQtbGVmdFwiIG9uQ2xpY2s9eygpID0+IHRvZ2dsZU5vZGVTb3J0KGZpZWxkIGFzIE5vZGVTb3J0RmllbGQpfT5cbiAgICAgICAgICAgICAgICAgICAge2xhYmVsfVxuICAgICAgICAgICAgICAgICAgICA8QXJyb3dVcERvd24gY2xhc3NOYW1lPVwiaC0zLjUgdy0zLjVcIiAvPlxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgPGRpdj5TdW1tYXJ5PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdj5BY3Rpb248L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJkaXZpZGUteSBkaXZpZGUtc2xhdGUtODAwXCI+XG4gICAgICAgICAgICAgICAge3BhZ2VkTm9kZXMubWFwKChub2RlKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGtleT17bm9kZS5pZH0gY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtWzEuNGZyXzAuOGZyXzAuN2ZyXzAuN2ZyXzFmcl8wLjdmcl0gZ2FwLTQgcHgtNCBweS00IHRleHQtc21cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj57bm9kZS5jYW5vbmljYWxOYW1lfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXhzIHRleHQtc2xhdGUtNDAwXCI+e25vZGUuaWR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDxCYWRnZSBjbGFzc05hbWU9XCJib3JkZXItdHJhbnNwYXJlbnQgdGV4dC13aGl0ZVwiIHN0eWxlPXt7IGJhY2tncm91bmRDb2xvcjogZ2V0RG9jdW1lbnRLaW5kQ29sb3Iobm9kZS5raW5kKSB9fT5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtmb3JtYXRMYWJlbChub2RlLmtpbmQpfVxuICAgICAgICAgICAgICAgICAgICAgIDwvQmFkZ2U+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc2xhdGUtMzAwXCI+e25vZGUuZGVncmVlfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc2xhdGUtMzAwXCI+e25vZGUuZXZpZGVuY2UubGVuZ3RofTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc2xhdGUtNDAwXCI+e25vZGUuc3VtbWFyeSB8fCAnTm8gc3VtbWFyeSBwcm92aWRlZC4nfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gb25Ob2RlU2VsZWN0KG5vZGUuaWQpfSBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgdGV4dC1ibHVlLTMwMCB0cmFuc2l0aW9uIGhvdmVyOnRleHQtYmx1ZS0yMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZXdcbiAgICAgICAgICAgICAgICAgICAgICAgIDxFeHRlcm5hbExpbmsgY2xhc3NOYW1lPVwiaC0zLjUgdy0zLjVcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvPlxuICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICA8PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLVsxZnJfMWZyXzFmcl8xLjRmcl8wLjdmcl0gZ2FwLTQgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvOTAgcHgtNCBweS00IHRleHQtbGVmdCB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgICAge1tcbiAgICAgICAgICAgICAgICAgIFsnc291cmNlJywgJ1NvdXJjZSddLFxuICAgICAgICAgICAgICAgICAgWyd0YXJnZXQnLCAnVGFyZ2V0J10sXG4gICAgICAgICAgICAgICAgICBbJ3R5cGUnLCAnUmVsYXRpb24nXSxcbiAgICAgICAgICAgICAgICBdLm1hcCgoW2ZpZWxkLCBsYWJlbF0pID0+IChcbiAgICAgICAgICAgICAgICAgIDxidXR0b24ga2V5PXtmaWVsZH0gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgdGV4dC1sZWZ0XCIgb25DbGljaz17KCkgPT4gdG9nZ2xlRWRnZVNvcnQoZmllbGQgYXMgRWRnZVNvcnRGaWVsZCl9PlxuICAgICAgICAgICAgICAgICAgICB7bGFiZWx9XG4gICAgICAgICAgICAgICAgICAgIDxBcnJvd1VwRG93biBjbGFzc05hbWU9XCJoLTMuNSB3LTMuNVwiIC8+XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICA8ZGl2PlN1bW1hcnk8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2PkFjdGlvbjwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImRpdmlkZS15IGRpdmlkZS1zbGF0ZS04MDBcIj5cbiAgICAgICAgICAgICAgICB7cGFnZWRFZGdlcy5tYXAoKGVkZ2UpID0+IChcbiAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXtlZGdlLmlkfSBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy1bMWZyXzFmcl8xZnJfMS40ZnJfMC43ZnJdIGdhcC00IHB4LTQgcHktNCB0ZXh0LXNtXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS0yMDBcIj57Z3JhcGhEYXRhLm5vZGVJbmRleFtnZXRMaW5rRW5kcG9pbnRJZChlZGdlLnNvdXJjZSldPy5jYW5vbmljYWxOYW1lID8/IGdldExpbmtFbmRwb2ludElkKGVkZ2Uuc291cmNlKX08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTIwMFwiPntncmFwaERhdGEubm9kZUluZGV4W2dldExpbmtFbmRwb2ludElkKGVkZ2UudGFyZ2V0KV0/LmNhbm9uaWNhbE5hbWUgPz8gZ2V0TGlua0VuZHBvaW50SWQoZWRnZS50YXJnZXQpfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc2xhdGUtMzAwXCI+e2Zvcm1hdExhYmVsKGVkZ2UudHlwZSl9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS00MDBcIj57ZWRnZS5zdW1tYXJ5IHx8ICdObyBzdW1tYXJ5IHByb3ZpZGVkLid9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBvbk5vZGVTZWxlY3QoZ2V0TGlua0VuZHBvaW50SWQoZWRnZS5zb3VyY2UpKX0gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHRleHQtYmx1ZS0zMDAgdHJhbnNpdGlvbiBob3Zlcjp0ZXh0LWJsdWUtMjAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICBJbnNwZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICA8RXh0ZXJuYWxMaW5rIGNsYXNzTmFtZT1cImgtMy41IHctMy41XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8Lz5cbiAgICAgICAgICApfVxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5cbiAgICAgICAgICAgIFNob3dpbmcge2FjdGl2ZVRhYmxlID09PSAnbm9kZXMnID8gcGFnZWROb2Rlcy5sZW5ndGggOiBwYWdlZEVkZ2VzLmxlbmd0aH0gb2Yge2FjdGl2ZVRhYmxlID09PSAnbm9kZXMnID8gZmlsdGVyZWROb2Rlcy5sZW5ndGggOiBmaWx0ZXJlZEVkZ2VzLmxlbmd0aH0ge2FjdGl2ZVRhYmxlfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgIDxCdXR0b24gdmFyaWFudD1cInNlY29uZGFyeVwiIGRpc2FibGVkPXtwYWdlID09PSAxfSBvbkNsaWNrPXsoKSA9PiBzZXRQYWdlKChjdXJyZW50KSA9PiBNYXRoLm1heCgxLCBjdXJyZW50IC0gMSkpfT5QcmV2aW91czwvQnV0dG9uPlxuICAgICAgICAgICAgPEJhZGdlPlBhZ2Uge3BhZ2V9IG9mIHtwYWdlQ291bnR9PC9CYWRnZT5cbiAgICAgICAgICAgIDxCdXR0b24gdmFyaWFudD1cInNlY29uZGFyeVwiIGRpc2FibGVkPXtwYWdlID09PSBwYWdlQ291bnR9IG9uQ2xpY2s9eygpID0+IHNldFBhZ2UoKGN1cnJlbnQpID0+IE1hdGgubWluKHBhZ2VDb3VudCwgY3VycmVudCArIDEpKX0+TmV4dDwvQnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuIiwgImltcG9ydCB7IEJveGVzLCBGaWxlVGV4dCwgR2l0QnJhbmNoLCBRdW90ZSB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQgdHlwZSB7IERvY3VtZW50R3JhcGhEYXRhIH0gZnJvbSAnLi4vdHlwZXMvYXBwJztcbmltcG9ydCB7IGZvcm1hdExhYmVsLCBnZXREb2N1bWVudEtpbmRDb2xvciB9IGZyb20gJy4uL2xpYi9zZWxlY3RvcnMnO1xuXG5pbnRlcmZhY2UgRG9jdW1lbnRPdmVydmlld1Byb3BzIHtcbiAgZ3JhcGhEYXRhOiBEb2N1bWVudEdyYXBoRGF0YTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRG9jdW1lbnRPdmVydmlldyh7IGdyYXBoRGF0YSB9OiBEb2N1bWVudE92ZXJ2aWV3UHJvcHMpIHtcbiAgY29uc3Qga2luZENvdW50cyA9IGdyYXBoRGF0YS5ub2Rlcy5yZWR1Y2U8UmVjb3JkPHN0cmluZywgbnVtYmVyPj4oKGNvdW50cywgbm9kZSkgPT4ge1xuICAgIGNvdW50c1tub2RlLmtpbmRdID0gKGNvdW50c1tub2RlLmtpbmRdID8/IDApICsgMTtcbiAgICByZXR1cm4gY291bnRzO1xuICB9LCB7fSk7XG4gIGNvbnN0IGtpbmREaXN0cmlidXRpb24gPSBPYmplY3QuZW50cmllcyhraW5kQ291bnRzKVxuICAgIC5tYXAoKFtraW5kLCBjb3VudF0pID0+ICh7IGtpbmQsIGNvdW50IH0pKVxuICAgIC5zb3J0KChsZWZ0LCByaWdodCkgPT4gcmlnaHQuY291bnQgLSBsZWZ0LmNvdW50KTtcbiAgY29uc3QgdG90YWxFdmlkZW5jZSA9XG4gICAgZ3JhcGhEYXRhLm5vZGVzLnJlZHVjZSgoc3VtLCBub2RlKSA9PiBzdW0gKyBub2RlLmV2aWRlbmNlLmxlbmd0aCwgMCkgK1xuICAgIGdyYXBoRGF0YS5saW5rcy5yZWR1Y2UoKHN1bSwgZWRnZSkgPT4gc3VtICsgZWRnZS5ldmlkZW5jZS5sZW5ndGgsIDApO1xuICBjb25zdCBtb3N0Q29ubmVjdGVkID0gWy4uLmdyYXBoRGF0YS5ub2Rlc10uc29ydCgobGVmdCwgcmlnaHQpID0+IHJpZ2h0LmRlZ3JlZSAtIGxlZnQuZGVncmVlKS5zbGljZSgwLCA1KTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIG92ZXJmbG93LXktYXV0byBwLTYgbWQ6cC04XCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gbWF4LXctN3hsIHNwYWNlLXktOFwiPlxuICAgICAgICA8ZGl2PlxuICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LWJvbGQgdGV4dC13aGl0ZVwiPkRvY3VtZW50IE92ZXJ2aWV3PC9oMT5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIG1heC13LTN4bCB0ZXh0LXNtIGxlYWRpbmctNyB0ZXh0LXNsYXRlLTMwMFwiPlxuICAgICAgICAgICAgU3VtbWFyeSBjYXJkcyBhbmQgYnJlYWtkb3ducyBhcmUgY29tcHV0ZWQgZGlyZWN0bHkgZnJvbSB0aGUgYWN0aXZlIGRvY3VtZW50IGdyYXBoLlxuICAgICAgICAgIDwvcD5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdhcC00IG1kOmdyaWQtY29scy0yIHhsOmdyaWQtY29scy00XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLTN4bCBwLTVcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgICAgICAgIDxCb3hlcyBjbGFzc05hbWU9XCJoLTggdy04IHRleHQtYmx1ZS0zMDBcIiAvPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LTR4bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57Z3JhcGhEYXRhLm5vZGVzLmxlbmd0aH08L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPkRvY3VtZW50IE5vZGVzPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC01XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgICAgICA8R2l0QnJhbmNoIGNsYXNzTmFtZT1cImgtOCB3LTggdGV4dC1wdXJwbGUtMzAwXCIgLz5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC00eGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+e2dyYXBoRGF0YS5saW5rcy5sZW5ndGh9PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5SZWxhdGlvbnNoaXBzPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC01XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgICAgICA8UXVvdGUgY2xhc3NOYW1lPVwiaC04IHctOCB0ZXh0LW9yYW5nZS0zMDBcIiAvPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LTR4bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57dG90YWxFdmlkZW5jZX08L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPkV2aWRlbmNlIEl0ZW1zPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC01XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgICAgICA8RmlsZVRleHQgY2xhc3NOYW1lPVwiaC04IHctOCB0ZXh0LWVtZXJhbGQtMzAwXCIgLz5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC00eGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+e2dyYXBoRGF0YS5raW5kVHlwZXMubGVuZ3RofTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMyB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+Tm9kZSBLaW5kczwvcD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC02XCI+XG4gICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+TW9zdCBDb25uZWN0ZWQgRG9jdW1lbnQgTm9kZXM8L2gyPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiBzcGFjZS15LTRcIj5cbiAgICAgICAgICAgIHttb3N0Q29ubmVjdGVkLm1hcCgobm9kZSwgaW5kZXgpID0+IChcbiAgICAgICAgICAgICAgPGRpdiBrZXk9e25vZGUuaWR9IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiByb3VuZGVkLTN4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNzAgcC00XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtNFwiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGgtMTAgdy0xMCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC0yeGwgYmctYmx1ZS01MDAvMTUgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtYmx1ZS0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAge2luZGV4ICsgMX1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57bm9kZS5jYW5vbmljYWxOYW1lfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTEgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgIHtmb3JtYXRMYWJlbChub2RlLmtpbmQpfSB8IHtub2RlLmlkfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1yaWdodFwiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LTJ4bCBmb250LXNlbWlib2xkIHRleHQtYmx1ZS0zMDBcIj57bm9kZS5kZWdyZWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNTAwXCI+Q29ubmVjdGlvbnM8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApKX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNlwiPlxuICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPktpbmQgQnJlYWtkb3duPC9oMj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgZ3JpZCBnYXAtNCBtZDpncmlkLWNvbHMtMlwiPlxuICAgICAgICAgICAge2tpbmREaXN0cmlidXRpb24ubWFwKChlbnRyeSkgPT4gKFxuICAgICAgICAgICAgICA8ZGl2IGtleT17ZW50cnkua2luZH0gY2xhc3NOYW1lPVwicm91bmRlZC0zeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzcwIHAtNFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImgtMyB3LTMgcm91bmRlZC1mdWxsXCIgc3R5bGU9e3sgYmFja2dyb3VuZENvbG9yOiBnZXREb2N1bWVudEtpbmRDb2xvcihlbnRyeS5raW5kKSB9fSAvPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+e2Zvcm1hdExhYmVsKGVudHJ5LmtpbmQpfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57ZW50cnkuY291bnR9PC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L3NlY3Rpb24+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IFJlYWN0Tm9kZSB9IGZyb20gJ3JlYWN0JztcblxuaW50ZXJmYWNlIEVtcHR5U3RhdGVQcm9wcyB7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIG1lc3NhZ2U6IHN0cmluZztcbiAgYWN0aW9uPzogUmVhY3ROb2RlO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBFbXB0eVN0YXRlKHsgdGl0bGUsIG1lc3NhZ2UsIGFjdGlvbiB9OiBFbXB0eVN0YXRlUHJvcHMpIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIGZsZXggbWluLWgtWzMyMHB4XSBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC0zeGwgcHgtOCBweS0xMiB0ZXh0LWNlbnRlclwiPlxuICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPnt0aXRsZX08L2gyPlxuICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMyBtYXgtdy14bCB0ZXh0LXNtIGxlYWRpbmctNyB0ZXh0LXNsYXRlLTMwMFwiPnttZXNzYWdlfTwvcD5cbiAgICAgIHthY3Rpb24gPyA8ZGl2IGNsYXNzTmFtZT1cIm10LTZcIj57YWN0aW9ufTwvZGl2PiA6IG51bGx9XG4gICAgPC9kaXY+XG4gICk7XG59XG4iLCAiaW1wb3J0IHsgdXNlQ2FsbGJhY2ssIHVzZUVmZmVjdCwgdXNlTWVtbywgdXNlUmVmLCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCBGb3JjZUdyYXBoMkQgZnJvbSAncmVhY3QtZm9yY2UtZ3JhcGgtMmQnO1xuaW1wb3J0IHsgRmlsZVNlYXJjaCwgTWF4aW1pemUyLCBOZXR3b3JrLCBRdW90ZSwgUmVmcmVzaENjdyB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQgdHlwZSB7IERvY3VtZW50R3JhcGhEYXRhLCBEb2N1bWVudE5vZGUgfSBmcm9tICcuLi90eXBlcy9hcHAnO1xuaW1wb3J0IHsgZm9ybWF0RG9jdW1lbnRFdmlkZW5jZVBhZ2VzLCBmb3JtYXRMYWJlbCwgZ2V0RG9jdW1lbnRLaW5kQ29sb3IsIGdldExpbmtFbmRwb2ludElkIH0gZnJvbSAnLi4vbGliL3NlbGVjdG9ycyc7XG5pbXBvcnQgQmFkZ2UgZnJvbSAnLi91aS9CYWRnZSc7XG5pbXBvcnQgQnV0dG9uIGZyb20gJy4vdWkvQnV0dG9uJztcblxuaW50ZXJmYWNlIERvY3VtZW50R3JhcGhWaWV3UHJvcHMge1xuICBncmFwaERhdGE6IERvY3VtZW50R3JhcGhEYXRhO1xuICBzZWxlY3RlZE5vZGVJZDogc3RyaW5nIHwgbnVsbDtcbiAgb25Ob2RlU2VsZWN0OiAobm9kZUlkOiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRQYWdlUmFuZ2Uobm9kZTogRG9jdW1lbnROb2RlKSB7XG4gIHJldHVybiBmb3JtYXREb2N1bWVudEV2aWRlbmNlUGFnZXMobm9kZS5ldmlkZW5jZSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIERvY3VtZW50R3JhcGhWaWV3KHsgZ3JhcGhEYXRhLCBzZWxlY3RlZE5vZGVJZCwgb25Ob2RlU2VsZWN0IH06IERvY3VtZW50R3JhcGhWaWV3UHJvcHMpIHtcbiAgY29uc3QgZ3JhcGhSZWYgPSB1c2VSZWY8YW55PihudWxsKTtcbiAgY29uc3QgY29udGFpbmVyUmVmID0gdXNlUmVmPEhUTUxEaXZFbGVtZW50IHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IFtkaW1lbnNpb25zLCBzZXREaW1lbnNpb25zXSA9IHVzZVN0YXRlKHsgd2lkdGg6IDEwMDAsIGhlaWdodDogNTYwIH0pO1xuXG4gIGNvbnN0IGZpdEdyYXBoVG9WaWV3cG9ydCA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBpZiAoIWdyYXBoUmVmLmN1cnJlbnQgfHwgZGltZW5zaW9ucy53aWR0aCA8PSAwIHx8IGRpbWVuc2lvbnMuaGVpZ2h0IDw9IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcGFkZGluZyA9IE1hdGgubWF4KDgwLCBNYXRoLm1pbihkaW1lbnNpb25zLndpZHRoLCBkaW1lbnNpb25zLmhlaWdodCkgKiAwLjEyKTtcbiAgICBncmFwaFJlZi5jdXJyZW50Lnpvb21Ub0ZpdCg2MDAsIHBhZGRpbmcpO1xuICB9LCBbZGltZW5zaW9ucy5oZWlnaHQsIGRpbWVuc2lvbnMud2lkdGhdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHVwZGF0ZURpbWVuc2lvbnMgPSAoKSA9PiB7XG4gICAgICBpZiAoIWNvbnRhaW5lclJlZi5jdXJyZW50KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNldERpbWVuc2lvbnMoe1xuICAgICAgICB3aWR0aDogY29udGFpbmVyUmVmLmN1cnJlbnQuY2xpZW50V2lkdGgsXG4gICAgICAgIGhlaWdodDogTWF0aC5tYXgoMzYwLCBjb250YWluZXJSZWYuY3VycmVudC5jbGllbnRIZWlnaHQpLFxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHVwZGF0ZURpbWVuc2lvbnMoKTtcbiAgICBjb25zdCByZXNpemVPYnNlcnZlciA9IG5ldyBSZXNpemVPYnNlcnZlcih1cGRhdGVEaW1lbnNpb25zKTtcbiAgICBpZiAoY29udGFpbmVyUmVmLmN1cnJlbnQpIHtcbiAgICAgIHJlc2l6ZU9ic2VydmVyLm9ic2VydmUoY29udGFpbmVyUmVmLmN1cnJlbnQpO1xuICAgIH1cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdXBkYXRlRGltZW5zaW9ucyk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHJlc2l6ZU9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB1cGRhdGVEaW1lbnNpb25zKTtcbiAgICB9O1xuICB9LCBbXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWdyYXBoUmVmLmN1cnJlbnQgfHwgZ3JhcGhEYXRhLm5vZGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBncmFwaFJlZi5jdXJyZW50LmQzRm9yY2UoJ2NoYXJnZScpPy5zdHJlbmd0aCgtNDYwKTtcbiAgICBncmFwaFJlZi5jdXJyZW50LmQzRm9yY2UoJ2xpbmsnKT8uZGlzdGFuY2UoKCkgPT4gMTUwKTtcbiAgICBjb25zdCB0aW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQoZml0R3JhcGhUb1ZpZXdwb3J0LCA3MDApO1xuICAgIHJldHVybiAoKSA9PiB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICB9LCBbZml0R3JhcGhUb1ZpZXdwb3J0LCBncmFwaERhdGEubGlua3MubGVuZ3RoLCBncmFwaERhdGEubm9kZXMubGVuZ3RoXSk7XG5cbiAgY29uc3Qgc2VsZWN0ZWROb2RlID0gc2VsZWN0ZWROb2RlSWQgPyBncmFwaERhdGEubm9kZUluZGV4W3NlbGVjdGVkTm9kZUlkXSA/PyBudWxsIDogbnVsbDtcbiAgY29uc3QgY29ubmVjdGVkTm9kZXMgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBpZiAoIXNlbGVjdGVkTm9kZUlkKSB7XG4gICAgICByZXR1cm4gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgfVxuICAgIGNvbnN0IGNvbm5lY3RlZCA9IG5ldyBTZXQ8c3RyaW5nPihbc2VsZWN0ZWROb2RlSWRdKTtcbiAgICBmb3IgKGNvbnN0IGxpbmsgb2YgZ3JhcGhEYXRhLmxpbmtzKSB7XG4gICAgICBpZiAoZ2V0TGlua0VuZHBvaW50SWQobGluay5zb3VyY2UpID09PSBzZWxlY3RlZE5vZGVJZCkge1xuICAgICAgICBjb25uZWN0ZWQuYWRkKGdldExpbmtFbmRwb2ludElkKGxpbmsudGFyZ2V0KSk7XG4gICAgICB9XG4gICAgICBpZiAoZ2V0TGlua0VuZHBvaW50SWQobGluay50YXJnZXQpID09PSBzZWxlY3RlZE5vZGVJZCkge1xuICAgICAgICBjb25uZWN0ZWQuYWRkKGdldExpbmtFbmRwb2ludElkKGxpbmsuc291cmNlKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb25uZWN0ZWQ7XG4gIH0sIFtncmFwaERhdGEubGlua3MsIHNlbGVjdGVkTm9kZUlkXSk7XG5cbiAgY29uc3QgZm9yY2VHcmFwaERhdGEgPSB1c2VNZW1vKFxuICAgICgpID0+ICh7XG4gICAgICBub2RlczogZ3JhcGhEYXRhLm5vZGVzLm1hcCgobm9kZSkgPT4gKHsgLi4ubm9kZSB9KSksXG4gICAgICBsaW5rczogZ3JhcGhEYXRhLmxpbmtzLm1hcCgobGluaykgPT4gKHtcbiAgICAgICAgLi4ubGluayxcbiAgICAgICAgc291cmNlOiBnZXRMaW5rRW5kcG9pbnRJZChsaW5rLnNvdXJjZSksXG4gICAgICAgIHRhcmdldDogZ2V0TGlua0VuZHBvaW50SWQobGluay50YXJnZXQpLFxuICAgICAgfSkpLFxuICAgIH0pLFxuICAgIFtncmFwaERhdGEubGlua3MsIGdyYXBoRGF0YS5ub2Rlc11cbiAgKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBtaW4taC1bNzIwcHhdIGdhcC02IHhsOmdyaWQtY29scy1bbWlubWF4KDAsMWZyKV8zNjBweF1cIj5cbiAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIGZsZXggbWluLWgtWzcyMHB4XSBtaW4tdy0wIGZsZXgtY29sIHJvdW5kZWQtWzI4cHhdIHAtNVwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTQgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMC85MCBwYi00XCI+XG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC1zbSB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMThlbV0gdGV4dC1ibHVlLTMwMFwiPlxuICAgICAgICAgICAgICA8TmV0d29yayBjbGFzc05hbWU9XCJoLTQgdy00XCIgLz5cbiAgICAgICAgICAgICAgR3JhcGggVmlld1xuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LTJ4bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj5Eb2N1bWVudCBLbm93bGVkZ2UgR3JhcGg8L2gyPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+Tm9kZSBjb2xvciB0cmFja3MgZXh0cmFjdGVkIGtpbmQ7IGRpcmVjdGVkIGVkZ2VzIHJlcHJlc2VudCBleHBsaWNpdCByZWxhdGlvbnNoaXBzLjwvcD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgPEJhZGdlPk5vZGVzIHtncmFwaERhdGEubm9kZXMubGVuZ3RofTwvQmFkZ2U+XG4gICAgICAgICAgICA8QmFkZ2U+RWRnZXMge2dyYXBoRGF0YS5saW5rcy5sZW5ndGh9PC9CYWRnZT5cbiAgICAgICAgICAgIDxCdXR0b24gdmFyaWFudD1cInNlY29uZGFyeVwiIG9uQ2xpY2s9e2ZpdEdyYXBoVG9WaWV3cG9ydH0+XG4gICAgICAgICAgICAgIDxNYXhpbWl6ZTIgY2xhc3NOYW1lPVwiaC00IHctNFwiIC8+XG4gICAgICAgICAgICAgIEZpdCBWaWV3XG4gICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC01IGZsZXggZmxleC13cmFwIGdhcC0zXCI+XG4gICAgICAgICAge2dyYXBoRGF0YS5raW5kVHlwZXMuc2xpY2UoMCwgOCkubWFwKChraW5kKSA9PiAoXG4gICAgICAgICAgICA8ZGl2IGtleT17a2luZH0gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC82MCBweC0zIHB5LTEuNSB0ZXh0LXhzIHRleHQtc2xhdGUtMzAwXCI+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImgtMi41IHctMi41IHJvdW5kZWQtZnVsbFwiIHN0eWxlPXt7IGJhY2tncm91bmRDb2xvcjogZ2V0RG9jdW1lbnRLaW5kQ29sb3Ioa2luZCkgfX0gLz5cbiAgICAgICAgICAgICAgPHNwYW4+e2Zvcm1hdExhYmVsKGtpbmQpfTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IHJlZj17Y29udGFpbmVyUmVmfSBjbGFzc05hbWU9XCJyZWxhdGl2ZSBtdC01IG1pbi1oLVs1NjBweF0gZmxleC0xIG92ZXJmbG93LWhpZGRlbiByb3VuZGVkLVsyNHB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBiZy1bI2Q5ZDlkOV1cIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHJpZ2h0LTQgdG9wLTQgei0xMCByb3VuZGVkLWZ1bGwgYm9yZGVyIGJvcmRlci1zbGF0ZS00MDAgYmctd2hpdGUvOTAgcHgtNCBweS0yIHRleHQteHMgdGV4dC1zbGF0ZS03MDBcIj5cbiAgICAgICAgICAgIERyYWcgdG8gcGFuLCBzY3JvbGwgdG8gem9vbSwgY2xpY2sgYSBub2RlIGZvciBldmlkZW5jZVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxGb3JjZUdyYXBoMkRcbiAgICAgICAgICAgIHJlZj17Z3JhcGhSZWZ9XG4gICAgICAgICAgICBncmFwaERhdGE9e2ZvcmNlR3JhcGhEYXRhfVxuICAgICAgICAgICAgd2lkdGg9e2RpbWVuc2lvbnMud2lkdGh9XG4gICAgICAgICAgICBoZWlnaHQ9e2RpbWVuc2lvbnMuaGVpZ2h0fVxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICBjb29sZG93blRpY2tzPXsxNjB9XG4gICAgICAgICAgICBsaW5rQ3VydmF0dXJlPXswLjA4fVxuICAgICAgICAgICAgbGlua1dpZHRoPXsobGluazogYW55KSA9PiAoZ2V0TGlua0VuZHBvaW50SWQobGluay5zb3VyY2UpID09PSBzZWxlY3RlZE5vZGVJZCB8fCBnZXRMaW5rRW5kcG9pbnRJZChsaW5rLnRhcmdldCkgPT09IHNlbGVjdGVkTm9kZUlkID8gMi4yIDogMC45KX1cbiAgICAgICAgICAgIGxpbmtDb2xvcj17KGxpbms6IGFueSkgPT4gKGdldExpbmtFbmRwb2ludElkKGxpbmsuc291cmNlKSA9PT0gc2VsZWN0ZWROb2RlSWQgfHwgZ2V0TGlua0VuZHBvaW50SWQobGluay50YXJnZXQpID09PSBzZWxlY3RlZE5vZGVJZCA/ICcjMjU2M2ViJyA6ICdyZ2JhKDE1LCAyMywgNDIsIDAuNTUpJyl9XG4gICAgICAgICAgICBsaW5rRGlyZWN0aW9uYWxBcnJvd0xlbmd0aD17NX1cbiAgICAgICAgICAgIGxpbmtEaXJlY3Rpb25hbEFycm93UmVsUG9zPXsxfVxuICAgICAgICAgICAgbm9kZVJlbFNpemU9ezF9XG4gICAgICAgICAgICBub2RlTGFiZWw9eyhub2RlOiBhbnkpID0+IGAke25vZGUuY2Fub25pY2FsTmFtZX0gKCR7Zm9ybWF0TGFiZWwobm9kZS5raW5kKX0pYH1cbiAgICAgICAgICAgIG5vZGVDYW52YXNPYmplY3RNb2RlPXsoKSA9PiAncmVwbGFjZSd9XG4gICAgICAgICAgICBvbk5vZGVDbGljaz17KG5vZGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICBvbk5vZGVTZWxlY3Qobm9kZS5pZCk7XG4gICAgICAgICAgICAgIGdyYXBoUmVmLmN1cnJlbnQ/LmNlbnRlckF0KG5vZGUueCwgbm9kZS55LCA1MDApO1xuICAgICAgICAgICAgICBncmFwaFJlZi5jdXJyZW50Py56b29tKDIsIDUwMCk7XG4gICAgICAgICAgICB9fVxuICAgICAgICAgICAgbm9kZVBvaW50ZXJBcmVhUGFpbnQ9eyhub2RlOiBhbnksIGNvbG9yLCBjb250ZXh0KSA9PiB7XG4gICAgICAgICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gY29sb3I7XG4gICAgICAgICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICAgIGNvbnRleHQuYXJjKG5vZGUueCwgbm9kZS55LCBNYXRoLm1heChub2RlLnZhbCArIDgsIDIyKSwgMCwgMiAqIE1hdGguUEkpO1xuICAgICAgICAgICAgICBjb250ZXh0LmZpbGwoKTtcbiAgICAgICAgICAgIH19XG4gICAgICAgICAgICBub2RlQ2FudmFzT2JqZWN0PXsobm9kZTogYW55LCBjb250ZXh0LCBnbG9iYWxTY2FsZSkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCByYWRpdXMgPSBub2RlLnZhbDtcbiAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IG5vZGUuaWQgPT09IHNlbGVjdGVkTm9kZUlkO1xuICAgICAgICAgICAgICBjb25zdCBpc0Nvbm5lY3RlZCA9IGNvbm5lY3RlZE5vZGVzLmhhcyhub2RlLmlkKTtcbiAgICAgICAgICAgICAgY29uc3QgZm9udFNpemUgPSBNYXRoLm1heCgxMCAvIGdsb2JhbFNjYWxlLCA0KTtcblxuICAgICAgICAgICAgICBjb250ZXh0LnNhdmUoKTtcbiAgICAgICAgICAgICAgY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgY29udGV4dC5hcmMobm9kZS54LCBub2RlLnksIHJhZGl1cywgMCwgMiAqIE1hdGguUEkpO1xuICAgICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9IGdldERvY3VtZW50S2luZENvbG9yKG5vZGUua2luZCk7XG4gICAgICAgICAgICAgIGNvbnRleHQuc2hhZG93Qmx1ciA9IGlzU2VsZWN0ZWQgPyAxOCA6IGlzQ29ubmVjdGVkID8gMTAgOiAwO1xuICAgICAgICAgICAgICBjb250ZXh0LnNoYWRvd0NvbG9yID0gZ2V0RG9jdW1lbnRLaW5kQ29sb3Iobm9kZS5raW5kKTtcbiAgICAgICAgICAgICAgY29udGV4dC5maWxsKCk7XG5cbiAgICAgICAgICAgICAgY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgY29udGV4dC5hcmMobm9kZS54LCBub2RlLnksIHJhZGl1cyArIDMsIDAsIDIgKiBNYXRoLlBJKTtcbiAgICAgICAgICAgICAgY29udGV4dC5saW5lV2lkdGggPSBpc1NlbGVjdGVkID8gNCAvIGdsb2JhbFNjYWxlIDogMiAvIGdsb2JhbFNjYWxlO1xuICAgICAgICAgICAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gaXNTZWxlY3RlZCA/ICcjMTExODI3JyA6ICdyZ2JhKDE1LCAyMywgNDIsIDAuMzUpJztcbiAgICAgICAgICAgICAgY29udGV4dC5zdHJva2UoKTtcblxuICAgICAgICAgICAgICBjb250ZXh0LnNoYWRvd0JsdXIgPSAwO1xuICAgICAgICAgICAgICBpZiAoaXNTZWxlY3RlZCB8fCBpc0Nvbm5lY3RlZCB8fCBnbG9iYWxTY2FsZSA+PSAxLjM1KSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5mb250ID0gYCR7Zm9udFNpemV9cHggSW50ZXJgO1xuICAgICAgICAgICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJyMxMTE4MjcnO1xuICAgICAgICAgICAgICAgIGNvbnRleHQudGV4dEFsaWduID0gJ2NlbnRlcic7XG4gICAgICAgICAgICAgICAgY29udGV4dC50ZXh0QmFzZWxpbmUgPSAndG9wJztcbiAgICAgICAgICAgICAgICBjb250ZXh0LmZpbGxUZXh0KG5vZGUubGFiZWwsIG5vZGUueCwgbm9kZS55ICsgcmFkaXVzICsgNik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29udGV4dC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9fVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICA8YXNpZGUgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgc2Nyb2xsYmFyLXRoaW4gZmxleCBtaW4taC1bNzIwcHhdIGZsZXgtY29sIG92ZXJmbG93LXktYXV0byByb3VuZGVkLVsyOHB4XSBwLTVcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtMyBib3JkZXItYiBib3JkZXItc2xhdGUtODAwLzkwIHBiLTRcIj5cbiAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMThlbV0gdGV4dC1ibHVlLTMwMFwiPkV2aWRlbmNlIC8gU291cmNlIERldGFpbDwvcD5cbiAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJtdC0yIHRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntzZWxlY3RlZE5vZGU/LmNhbm9uaWNhbE5hbWUgPz8gJ1NlbGVjdCBhIG5vZGUnfTwvaDM+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTMgZmxleCBmbGV4LXdyYXAgZ2FwLTJcIj5cbiAgICAgICAgICAgICAge3NlbGVjdGVkTm9kZSA/IDxCYWRnZT57Zm9ybWF0TGFiZWwoc2VsZWN0ZWROb2RlLmtpbmQpfTwvQmFkZ2U+IDogbnVsbH1cbiAgICAgICAgICAgICAge3NlbGVjdGVkTm9kZSA/IDxCYWRnZT57Zm9ybWF0UGFnZVJhbmdlKHNlbGVjdGVkTm9kZSl9PC9CYWRnZT4gOiBudWxsfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAge3NlbGVjdGVkTm9kZUlkID8gKFxuICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBvbk5vZGVTZWxlY3QobnVsbCl9IGNsYXNzTmFtZT1cInJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBwLTIgdGV4dC1zbGF0ZS00MDAgdHJhbnNpdGlvbiBob3Zlcjpib3JkZXItc2xhdGUtNTAwIGhvdmVyOnRleHQtd2hpdGVcIj5cbiAgICAgICAgICAgICAgPFJlZnJlc2hDY3cgY2xhc3NOYW1lPVwiaC00IHctNFwiIC8+XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC01IHNwYWNlLXktNFwiPlxuICAgICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC81NSBwLTRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS01MDBcIj5cbiAgICAgICAgICAgICAgPEZpbGVTZWFyY2ggY2xhc3NOYW1lPVwiaC00IHctNFwiIC8+XG4gICAgICAgICAgICAgIFN1bW1hcnlcbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMyB0ZXh0LXNtIGxlYWRpbmctNyB0ZXh0LXNsYXRlLTIwMFwiPntzZWxlY3RlZE5vZGU/LnN1bW1hcnkgfHwgJ1NlbGVjdCBhIG5vZGUgdG8gaW5zcGVjdCBleHRyYWN0ZWQgZXZpZGVuY2UuJ308L3A+XG4gICAgICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzU1IHAtNFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPlxuICAgICAgICAgICAgICA8UXVvdGUgY2xhc3NOYW1lPVwiaC00IHctNFwiIC8+XG4gICAgICAgICAgICAgIEV2aWRlbmNlXG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMyBzcGFjZS15LTNcIj5cbiAgICAgICAgICAgICAgeyhzZWxlY3RlZE5vZGU/LmV2aWRlbmNlID8/IFtdKS5sZW5ndGggPT09IDAgPyAoXG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPk5vIGV2aWRlbmNlIGF0dGFjaGVkIHRvIHRoaXMgc2VsZWN0aW9uLjwvcD5cbiAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICBzZWxlY3RlZE5vZGU/LmV2aWRlbmNlLnNsaWNlKDAsIDgpLm1hcCgoaXRlbSwgaW5kZXgpID0+IChcbiAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXtgJHtpdGVtLnF1b3RlfS0ke2luZGV4fWB9IGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTkwMC83MCBwLTNcIj5cbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSBsZWFkaW5nLTYgdGV4dC1zbGF0ZS0yMDBcIj57aXRlbS5xdW90ZX08L3A+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS01MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICB7Zm9ybWF0RG9jdW1lbnRFdmlkZW5jZVBhZ2VzKFtpdGVtXSl9XG4gICAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkpXG4gICAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNTUgcC00XCI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPlNvdXJjZXM8L3A+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTMgc3BhY2UteS0yXCI+XG4gICAgICAgICAgICAgIHsoc2VsZWN0ZWROb2RlPy5zb3VyY2VzID8/IFtdKS5sZW5ndGggPT09IDAgPyAoXG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPk5vIHNvdXJjZSBjaHVua3MgYXZhaWxhYmxlLjwvcD5cbiAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICBzZWxlY3RlZE5vZGU/LnNvdXJjZXMubWFwKChzb3VyY2UpID0+IChcbiAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXtgJHtzb3VyY2UuZG9jdW1lbnROYW1lfS0ke3NvdXJjZS5jaHVua0lkfWB9IGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTkwMC83MCBweC0zIHB5LTIgdGV4dC1zbSB0ZXh0LXNsYXRlLTIwMFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZvbnQtbWVkaXVtXCI+e3NvdXJjZS5kb2N1bWVudE5hbWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXhzIHRleHQtc2xhdGUtNTAwXCI+e3NvdXJjZS5jaHVua0lkfSB8IHtzb3VyY2UuY2h1bmtGaWxlfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKSlcbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvc2VjdGlvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2FzaWRlPlxuICAgIDwvZGl2PlxuICApO1xufVxuIiwgImltcG9ydCB7IGxhenksIFN1c3BlbnNlLCB1c2VFZmZlY3QsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgQmFyQ2hhcnQzLCBEb3dubG9hZCwgRmlsZUpzb24sIEZpbGVUZXh0LCBMaXN0LCBMb2FkZXIyLCBOZXR3b3JrLCBSZWZyZXNoQ2N3LCBVcGxvYWQgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHsgdXNlTmF2aWdhdGUgfSBmcm9tICdyZWFjdC1yb3V0ZXItZG9tJztcbmltcG9ydCBEb2N1bWVudE5vZGVzRWRnZXNWaWV3IGZyb20gJy4uL2NvbXBvbmVudHMvRG9jdW1lbnROb2Rlc0VkZ2VzVmlldyc7XG5pbXBvcnQgRG9jdW1lbnRPdmVydmlldyBmcm9tICcuLi9jb21wb25lbnRzL0RvY3VtZW50T3ZlcnZpZXcnO1xuaW1wb3J0IEVtcHR5U3RhdGUgZnJvbSAnLi4vY29tcG9uZW50cy9FbXB0eVN0YXRlJztcbmltcG9ydCBTdGF0dXNCYW5uZXIgZnJvbSAnLi4vY29tcG9uZW50cy9TdGF0dXNCYW5uZXInO1xuaW1wb3J0IEJ1dHRvbiBmcm9tICcuLi9jb21wb25lbnRzL3VpL0J1dHRvbic7XG5pbXBvcnQgQmFkZ2UgZnJvbSAnLi4vY29tcG9uZW50cy91aS9CYWRnZSc7XG5pbXBvcnQgeyBmb3JtYXRMYWJlbCB9IGZyb20gJy4uL2xpYi9zZWxlY3RvcnMnO1xuaW1wb3J0IHsgdXNlQXBwQ29udGV4dCB9IGZyb20gJy4uL3N0YXRlL0FwcENvbnRleHQnO1xuXG5jb25zdCBEb2N1bWVudEdyYXBoVmlldyA9IGxhenkoKCkgPT4gaW1wb3J0KCcuLi9jb21wb25lbnRzL0RvY3VtZW50R3JhcGhWaWV3JykpO1xuXG50eXBlIERvY3VtZW50Vmlld1R5cGUgPSAnZ3JhcGgnIHwgJ25vZGVzJyB8ICdvdmVydmlldyc7XG5cbmNvbnN0IG5hdkl0ZW1zOiBBcnJheTx7IGlkOiBEb2N1bWVudFZpZXdUeXBlOyBsYWJlbDogc3RyaW5nOyBpY29uOiB0eXBlb2YgTmV0d29yayB9PiA9IFtcbiAgeyBpZDogJ2dyYXBoJywgbGFiZWw6ICdHcmFwaCBWaWV3JywgaWNvbjogTmV0d29yayB9LFxuICB7IGlkOiAnbm9kZXMnLCBsYWJlbDogJ05vZGVzICYgRWRnZXMnLCBpY29uOiBMaXN0IH0sXG4gIHsgaWQ6ICdvdmVydmlldycsIGxhYmVsOiAnRG9jdW1lbnQgT3ZlcnZpZXcnLCBpY29uOiBCYXJDaGFydDMgfSxcbl07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIERvY3VtZW50V29ya3NwYWNlKCkge1xuICBjb25zdCBuYXZpZ2F0ZSA9IHVzZU5hdmlnYXRlKCk7XG4gIGNvbnN0IHsgZG9jdW1lbnRHcmFwaCwgbG9hZERvY3VtZW50R3JhcGggfSA9IHVzZUFwcENvbnRleHQoKTtcbiAgY29uc3QgW2N1cnJlbnRWaWV3LCBzZXRDdXJyZW50Vmlld10gPSB1c2VTdGF0ZTxEb2N1bWVudFZpZXdUeXBlPignZ3JhcGgnKTtcbiAgY29uc3QgW3NlbGVjdGVkTm9kZUlkLCBzZXRTZWxlY3RlZE5vZGVJZF0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChkb2N1bWVudEdyYXBoLnN0YXR1cyA9PT0gJ2lkbGUnICYmICFkb2N1bWVudEdyYXBoLmRhdGEpIHtcbiAgICAgIGxvYWREb2N1bWVudEdyYXBoKCkuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKTtcbiAgICB9XG4gIH0sIFtkb2N1bWVudEdyYXBoLmRhdGEsIGRvY3VtZW50R3JhcGguc3RhdHVzLCBsb2FkRG9jdW1lbnRHcmFwaF0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFkb2N1bWVudEdyYXBoLmRhdGEgfHwgIXNlbGVjdGVkTm9kZUlkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghZG9jdW1lbnRHcmFwaC5kYXRhLm5vZGVJbmRleFtzZWxlY3RlZE5vZGVJZF0pIHtcbiAgICAgIHNldFNlbGVjdGVkTm9kZUlkKG51bGwpO1xuICAgIH1cbiAgfSwgW2RvY3VtZW50R3JhcGguZGF0YSwgc2VsZWN0ZWROb2RlSWRdKTtcblxuICBpZiAoZG9jdW1lbnRHcmFwaC5zdGF0dXMgPT09ICdsb2FkaW5nJyAmJiAhZG9jdW1lbnRHcmFwaC5kYXRhKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBtaW4taC1zY3JlZW4gaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGJnLVsjMEYxNzJBXVwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHRleHQtc2xhdGUtMjAwXCI+XG4gICAgICAgICAgPExvYWRlcjIgY2xhc3NOYW1lPVwiaC01IHctNSBhbmltYXRlLXNwaW5cIiAvPlxuICAgICAgICAgIDxzcGFuPkxvYWRpbmcgZG9jdW1lbnQgZ3JhcGguLi48L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxuXG4gIGlmIChkb2N1bWVudEdyYXBoLnN0YXR1cyA9PT0gJ2Vycm9yJyAmJiAhZG9jdW1lbnRHcmFwaC5kYXRhKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLVsjMEYxNzJBXSBweC02IHB5LTE2XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXgtYXV0byBtYXgtdy00eGxcIj5cbiAgICAgICAgICA8RW1wdHlTdGF0ZVxuICAgICAgICAgICAgdGl0bGU9XCJEb2N1bWVudCBHcmFwaCBMb2FkaW5nIEZhaWxlZFwiXG4gICAgICAgICAgICBtZXNzYWdlPXtkb2N1bWVudEdyYXBoLmVycm9yIHx8ICdUaGUgZnJvbnRlbmQgY291bGQgbm90IGxvYWQgdGhlIGFjdGl2ZSBkb2N1bWVudCBncmFwaCBmcm9tIHRoZSBiYWNrZW5kLid9XG4gICAgICAgICAgICBhY3Rpb249e1xuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC13cmFwIGp1c3RpZnktY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgICAgPEJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBsb2FkRG9jdW1lbnRHcmFwaCgpLmNhdGNoKCgpID0+IHVuZGVmaW5lZCl9PlJldHJ5IEdyYXBoIExvYWQ8L0J1dHRvbj5cbiAgICAgICAgICAgICAgICA8QnV0dG9uIHZhcmlhbnQ9XCJzZWNvbmRhcnlcIiBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnL2RvY3VtZW50cycpfT5cbiAgICAgICAgICAgICAgICAgIFJldHVybiB0byBVcGxvYWRcbiAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICB9XG4gICAgICAgICAgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICApO1xuICB9XG5cbiAgaWYgKCFkb2N1bWVudEdyYXBoLmRhdGEgfHwgZG9jdW1lbnRHcmFwaC5kYXRhLm5vZGVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiAoXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1pbi1oLXNjcmVlbiBiZy1bIzBGMTcyQV0gcHgtNiBweS0xNlwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gbWF4LXctNHhsXCI+XG4gICAgICAgICAgPEVtcHR5U3RhdGVcbiAgICAgICAgICAgIHRpdGxlPVwiVGhlIERvY3VtZW50IEdyYXBoIElzIEVtcHR5XCJcbiAgICAgICAgICAgIG1lc3NhZ2U9XCJVcGxvYWQgYSBQREYsIG1hcmtkb3duLCBvciB0ZXh0IGRvY3VtZW50IHRvIGJ1aWxkIGEgZG9jdW1lbnQga25vd2xlZGdlIGdyYXBoLlwiXG4gICAgICAgICAgICBhY3Rpb249ezxCdXR0b24gb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9kb2N1bWVudHMnKX0+VXBsb2FkIERvY3VtZW50PC9CdXR0b24+fVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IGdyYXBoRGF0YSA9IGRvY3VtZW50R3JhcGguZGF0YTtcbiAgY29uc3QgYXJ0aWZhY3RNYW5pZmVzdCA9IGRvY3VtZW50R3JhcGguYXJ0aWZhY3RzO1xuICBjb25zdCBmaW5hbE1hcmtkb3duQXJ0aWZhY3QgPSBhcnRpZmFjdE1hbmlmZXN0Py5hcnRpZmFjdHMuZmluZCgoYXJ0aWZhY3QpID0+IGFydGlmYWN0LnR5cGUgPT09ICdmaW5hbC1tYXJrZG93bicpID8/IG51bGw7XG4gIGNvbnN0IG1lcmdlZEpzb25BcnRpZmFjdCA9IGFydGlmYWN0TWFuaWZlc3Q/LmFydGlmYWN0cy5maW5kKChhcnRpZmFjdCkgPT4gYXJ0aWZhY3QudHlwZSA9PT0gJ21lcmdlZC1qc29uJykgPz8gbnVsbDtcbiAgY29uc3QgY2h1bmtBcnRpZmFjdHMgPSBhcnRpZmFjdE1hbmlmZXN0Py5jaHVua19hcnRpZmFjdHMgPz8gW107XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggbWluLWgtc2NyZWVuIGJnLVsjMEYxNzJBXVwiPlxuICAgICAgPGFzaWRlIGNsYXNzTmFtZT1cImhpZGRlbiBtaW4taC1zY3JlZW4gdy03MiBzaHJpbmstMCBib3JkZXItciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC85NSB4bDpmbGV4IHhsOmZsZXgtY29sIHhsOnNlbGYtc3RyZXRjaFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcHgtNiBweS03XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBiZy1ibHVlLTUwMC8xNSBwLTMgdGV4dC1ibHVlLTMwMFwiPlxuICAgICAgICAgICAgICA8RmlsZVRleHQgY2xhc3NOYW1lPVwiaC03IHctN1wiIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtYm9sZCB0ZXh0LXdoaXRlXCI+VHdpbkdyYXBoT3BzPC9oMT5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPkRvY3VtZW50IGtub3dsZWRnZSBncmFwaCB3b3Jrc3BhY2U8L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiBncmlkIGdyaWQtY29scy0yIGdhcC0zXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTkwMC83MCBwLTNcIj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS01MDBcIj5Ob2RlczwvcD5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LTJ4bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57Z3JhcGhEYXRhLm5vZGVzLmxlbmd0aH08L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTAwLzcwIHAtM1wiPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPkVkZ2VzPC9wPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntncmFwaERhdGEubGlua3MubGVuZ3RofTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC00XCI+XG4gICAgICAgICAgICA8QmFkZ2UgY2xhc3NOYW1lPVwiYm9yZGVyLWJsdWUtNTAwLzMwIGJnLWJsdWUtNTAwLzEwIHRleHQtYmx1ZS0xMDBcIj5cbiAgICAgICAgICAgICAgQWN0aXZlIEdyYXBoOiB7Zm9ybWF0TGFiZWwoZ3JhcGhEYXRhLnNvdXJjZSl9XG4gICAgICAgICAgICA8L0JhZGdlPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC00IGdyaWQgZ3JpZC1jb2xzLTMgZ2FwLTJcIj5cbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9yaXNrJyl9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIHB4LTMgcHktMiB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1zbGF0ZS0zMDAgdHJhbnNpdGlvbiBob3Zlcjpib3JkZXItc2xhdGUtNTAwIGhvdmVyOnRleHQtd2hpdGVcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICBSaXNrXG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYmctYmx1ZS02MDAgcHgtMyBweS0yIHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+RG9jdW1lbnRzPC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvZ3JhcGhzJyl9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIHB4LTMgcHktMiB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1zbGF0ZS0zMDAgdHJhbnNpdGlvbiBob3Zlcjpib3JkZXItc2xhdGUtNTAwIGhvdmVyOnRleHQtd2hpdGVcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICBHcmFwaHNcbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8bmF2IGNsYXNzTmFtZT1cImZsZXgtMSBzcGFjZS15LTIgcC00XCI+XG4gICAgICAgICAge25hdkl0ZW1zLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgSWNvbiA9IGl0ZW0uaWNvbjtcbiAgICAgICAgICAgIGNvbnN0IGlzQWN0aXZlID0gY3VycmVudFZpZXcgPT09IGl0ZW0uaWQ7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAga2V5PXtpdGVtLmlkfVxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEN1cnJlbnRWaWV3KGl0ZW0uaWQpfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGZsZXggdy1mdWxsIGl0ZW1zLWNlbnRlciBnYXAtMyByb3VuZGVkLTJ4bCBweC00IHB5LTMgdGV4dC1sZWZ0IHRleHQtc20gZm9udC1tZWRpdW0gdHJhbnNpdGlvbiAke1xuICAgICAgICAgICAgICAgICAgaXNBY3RpdmUgPyAnYmctYmx1ZS02MDAgdGV4dC13aGl0ZSBzaGFkb3ctbGcgc2hhZG93LWJsdWUtOTUwLzQwJyA6ICd0ZXh0LXNsYXRlLTQwMCBob3ZlcjpiZy1zbGF0ZS05MDAgaG92ZXI6dGV4dC13aGl0ZSdcbiAgICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxJY29uIGNsYXNzTmFtZT1cImgtNSB3LTVcIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuPntpdGVtLmxhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pfVxuICAgICAgICA8L25hdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJvcmRlci10IGJvcmRlci1zbGF0ZS04MDAgcC00XCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9kb2N1bWVudHMnKX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggdy1mdWxsIGl0ZW1zLWNlbnRlciBnYXAtMyByb3VuZGVkLTJ4bCBweC00IHB5LTMgdGV4dC1sZWZ0IHRleHQtc20gZm9udC1tZWRpdW0gdGV4dC1zbGF0ZS00MDAgdHJhbnNpdGlvbiBob3ZlcjpiZy1zbGF0ZS05MDAgaG92ZXI6dGV4dC13aGl0ZVwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgPFVwbG9hZCBjbGFzc05hbWU9XCJoLTUgdy01XCIgLz5cbiAgICAgICAgICAgIDxzcGFuPlVwbG9hZCBOZXcgRG9jdW1lbnQ8L3NwYW4+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9ncmFwaHMnKX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cIm10LTIgZmxleCB3LWZ1bGwgaXRlbXMtY2VudGVyIGdhcC0zIHJvdW5kZWQtMnhsIHB4LTQgcHktMyB0ZXh0LWxlZnQgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LXNsYXRlLTQwMCB0cmFuc2l0aW9uIGhvdmVyOmJnLXNsYXRlLTkwMCBob3Zlcjp0ZXh0LXdoaXRlXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8TmV0d29yayBjbGFzc05hbWU9XCJoLTUgdy01XCIgLz5cbiAgICAgICAgICAgIDxzcGFuPkdyYXBoIFdvcmtzcGFjZTwvc3Bhbj5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2FzaWRlPlxuXG4gICAgICA8bWFpbiBjbGFzc05hbWU9XCJmbGV4IG1pbi13LTAgZmxleC0xIGZsZXgtY29sXCI+XG4gICAgICAgIDxoZWFkZXIgY2xhc3NOYW1lPVwiYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNjAgcHgtNiBweS00XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC00XCI+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICA8aDEgY2xhc3NOYW1lPVwidGV4dC0yeGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+RG9jdW1lbnQgR3JhcGggV29ya3NwYWNlPC9oMT5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgICAge2dyYXBoRGF0YS5ub2Rlcy5sZW5ndGh9IG5vZGVzLCB7Z3JhcGhEYXRhLmxpbmtzLmxlbmd0aH0gcmVsYXRpb25zaGlwcywge2dyYXBoRGF0YS5raW5kVHlwZXMubGVuZ3RofSBub2RlIGtpbmRzXG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgIHtkb2N1bWVudEdyYXBoLmVycm9yID8gPFN0YXR1c0Jhbm5lciB0b25lPVwiZXJyb3JcIiBtZXNzYWdlPXtkb2N1bWVudEdyYXBoLmVycm9yfSAvPiA6IG51bGx9XG4gICAgICAgICAgICAgIDxCdXR0b24gdmFyaWFudD1cInNlY29uZGFyeVwiIG9uQ2xpY2s9eygpID0+IGxvYWREb2N1bWVudEdyYXBoKHsga2VlcFN0YXR1czogdHJ1ZSB9KS5jYXRjaCgoKSA9PiB1bmRlZmluZWQpfT5cbiAgICAgICAgICAgICAgICA8UmVmcmVzaENjdyBjbGFzc05hbWU9XCJoLTQgdy00XCIgLz5cbiAgICAgICAgICAgICAgICBSZWZyZXNoXG4gICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvaGVhZGVyPlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xXCI+XG4gICAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNDAgcHgtNiBweS00XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC13cmFwIGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtNFwiPlxuICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLVswLjJlbV0gdGV4dC1zbGF0ZS00MDBcIj5Eb3dubG9hZCBTb3VyY2UgTWF0ZXJpYWxzPC9oMj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gdGV4dC1zbGF0ZS0zMDBcIj5cbiAgICAgICAgICAgICAgICAgIERvd25sb2FkIHRoZSBmaW5hbGl6ZWQgbWFya2Rvd24sIGNodW5rZWQgbWFya2Rvd24gZmlsZXMsIGFuZCBtZXJnZWQgZG9jdW1lbnQgZ3JhcGggSlNPTiBmb3IgdGhpcyB3b3Jrc3BhY2UuXG4gICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICB7YXJ0aWZhY3RNYW5pZmVzdCA/IChcbiAgICAgICAgICAgICAgICA8YVxuICAgICAgICAgICAgICAgICAgaHJlZj17YXJ0aWZhY3RNYW5pZmVzdC5idW5kbGUuZG93bmxvYWRfdXJsfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIHJvdW5kZWQteGwgYmctYmx1ZS02MDAgcHgtNCBweS0yLjUgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtd2hpdGUgc2hhZG93LWxnIHNoYWRvdy1ibHVlLTk1MC80MCB0cmFuc2l0aW9uLWFsbCBob3ZlcjpiZy1ibHVlLTUwMFwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPERvd25sb2FkIGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+RG93bmxvYWQgQnVuZGxlPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAge2FydGlmYWN0TWFuaWZlc3QgPyAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNCBncmlkIGdhcC0zIGxnOmdyaWQtY29scy1bbWlubWF4KDAsMWZyKV9taW5tYXgoMCwxZnIpX21pbm1heCgwLDEuNGZyKV1cIj5cbiAgICAgICAgICAgICAgICA8YVxuICAgICAgICAgICAgICAgICAgaHJlZj17ZmluYWxNYXJrZG93bkFydGlmYWN0Py5kb3dubG9hZF91cmwgfHwgJyMnfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTAwLzcwIHAtNCB0cmFuc2l0aW9uIGhvdmVyOmJvcmRlci1zbGF0ZS02MDAgaG92ZXI6Ymctc2xhdGUtOTAwXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHRleHQtd2hpdGVcIj5cbiAgICAgICAgICAgICAgICAgICAgPEZpbGVUZXh0IGNsYXNzTmFtZT1cImgtNSB3LTUgdGV4dC1ibHVlLTMwMFwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtbWVkaXVtXCI+RmluYWwgTWFya2Rvd248L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPntmaW5hbE1hcmtkb3duQXJ0aWZhY3Q/LmZpbGVuYW1lIHx8ICdVbmF2YWlsYWJsZSd9PC9wPlxuICAgICAgICAgICAgICAgIDwvYT5cblxuICAgICAgICAgICAgICAgIDxhXG4gICAgICAgICAgICAgICAgICBocmVmPXttZXJnZWRKc29uQXJ0aWZhY3Q/LmRvd25sb2FkX3VybCB8fCAnIyd9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05MDAvNzAgcC00IHRyYW5zaXRpb24gaG92ZXI6Ym9yZGVyLXNsYXRlLTYwMCBob3ZlcjpiZy1zbGF0ZS05MDBcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgdGV4dC13aGl0ZVwiPlxuICAgICAgICAgICAgICAgICAgICA8RmlsZUpzb24gY2xhc3NOYW1lPVwiaC01IHctNSB0ZXh0LWVtZXJhbGQtMzAwXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1tZWRpdW1cIj5NZXJnZWQgSlNPTjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+e21lcmdlZEpzb25BcnRpZmFjdD8uZmlsZW5hbWUgfHwgJ1VuYXZhaWxhYmxlJ308L3A+XG4gICAgICAgICAgICAgICAgPC9hPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05MDAvNzAgcC00XCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHRleHQtd2hpdGVcIj5cbiAgICAgICAgICAgICAgICAgICAgPEZpbGVUZXh0IGNsYXNzTmFtZT1cImgtNSB3LTUgdGV4dC1hbWJlci0zMDBcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LW1lZGl1bVwiPkNodW5rZWQgTWFya2Rvd24gRmlsZXM8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICB7Y2h1bmtBcnRpZmFjdHMubGVuZ3RofSBjaHVuayBmaWxle2NodW5rQXJ0aWZhY3RzLmxlbmd0aCA9PT0gMSA/ICcnIDogJ3MnfVxuICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0zIG1heC1oLTMyIHNwYWNlLXktMiBvdmVyZmxvdy1hdXRvIHByLTFcIj5cbiAgICAgICAgICAgICAgICAgICAge2NodW5rQXJ0aWZhY3RzLm1hcCgoYXJ0aWZhY3QpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICA8YVxuICAgICAgICAgICAgICAgICAgICAgICAga2V5PXthcnRpZmFjdC5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGhyZWY9e2FydGlmYWN0LmRvd25sb2FkX3VybH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJsb2NrIHRydW5jYXRlIHRleHQtc20gdGV4dC1ibHVlLTMwMCB0cmFuc2l0aW9uIGhvdmVyOnRleHQtYmx1ZS0yMDBcIlxuICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIHthcnRpZmFjdC5maWxlbmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKSA6IGRvY3VtZW50R3JhcGguYXJ0aWZhY3RzRXJyb3IgPyAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNFwiPlxuICAgICAgICAgICAgICAgIDxTdGF0dXNCYW5uZXIgdG9uZT1cImVycm9yXCIgbWVzc2FnZT17ZG9jdW1lbnRHcmFwaC5hcnRpZmFjdHNFcnJvcn0gLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTRcIj5cbiAgICAgICAgICAgICAgICA8U3RhdHVzQmFubmVyIHRvbmU9XCJpbmZvXCIgbWVzc2FnZT1cIlNvdXJjZSBtYXRlcmlhbCBkb3dubG9hZHMgYXJlIG5vdCBhdmFpbGFibGUgZm9yIHRoaXMgZG9jdW1lbnQgeWV0LlwiIC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKX1cbiAgICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgICB7Y3VycmVudFZpZXcgPT09ICdncmFwaCcgJiYgKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTZcIj5cbiAgICAgICAgICAgICAgPFN1c3BlbnNlXG4gICAgICAgICAgICAgICAgZmFsbGJhY2s9e1xuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IG1pbi1oLVs3MjBweF0gaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtWzI0cHhdIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIGJnLVsjZDlkOWQ5XVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHRleHQtc2xhdGUtNzAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPExvYWRlcjIgY2xhc3NOYW1lPVwiaC01IHctNSBhbmltYXRlLXNwaW5cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPkxvYWRpbmcgZ3JhcGggdmlldy4uLjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8RG9jdW1lbnRHcmFwaFZpZXcgZ3JhcGhEYXRhPXtncmFwaERhdGF9IHNlbGVjdGVkTm9kZUlkPXtzZWxlY3RlZE5vZGVJZH0gb25Ob2RlU2VsZWN0PXtzZXRTZWxlY3RlZE5vZGVJZH0gLz5cbiAgICAgICAgICAgICAgPC9TdXNwZW5zZT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICl9XG4gICAgICAgICAge2N1cnJlbnRWaWV3ID09PSAnbm9kZXMnICYmIChcbiAgICAgICAgICAgIDxEb2N1bWVudE5vZGVzRWRnZXNWaWV3XG4gICAgICAgICAgICAgIGdyYXBoRGF0YT17Z3JhcGhEYXRhfVxuICAgICAgICAgICAgICBvbk5vZGVTZWxlY3Q9eyhub2RlSWQpID0+IHtcbiAgICAgICAgICAgICAgICBzZXRDdXJyZW50VmlldygnZ3JhcGgnKTtcbiAgICAgICAgICAgICAgICBzZXRTZWxlY3RlZE5vZGVJZChub2RlSWQpO1xuICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICApfVxuICAgICAgICAgIHtjdXJyZW50VmlldyA9PT0gJ292ZXJ2aWV3JyAmJiA8RG9jdW1lbnRPdmVydmlldyBncmFwaERhdGE9e2dyYXBoRGF0YX0gLz59XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9tYWluPlxuICAgIDwvZGl2PlxuICApO1xufVxuIiwgImltcG9ydCB7IHVzZVJlZiB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB0eXBlIHsgQ2hhbmdlRXZlbnQsIERyYWdFdmVudCB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IENoZXZyb25SaWdodCwgRmlsZUpzb24sIE5ldHdvcmssIFNoaWVsZCwgVXBsb2FkIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7IHVzZU5hdmlnYXRlIH0gZnJvbSAncmVhY3Qtcm91dGVyLWRvbSc7XG5pbXBvcnQgQmFkZ2UgZnJvbSAnLi4vY29tcG9uZW50cy91aS9CYWRnZSc7XG5pbXBvcnQgQnV0dG9uIGZyb20gJy4uL2NvbXBvbmVudHMvdWkvQnV0dG9uJztcbmltcG9ydCBTdGF0dXNCYW5uZXIgZnJvbSAnLi4vY29tcG9uZW50cy9TdGF0dXNCYW5uZXInO1xuaW1wb3J0IHsgYXBwQ29uZmlnIH0gZnJvbSAnLi4vbGliL2NvbmZpZyc7XG5pbXBvcnQgeyB1c2VBcHBDb250ZXh0IH0gZnJvbSAnLi4vc3RhdGUvQXBwQ29udGV4dCc7XG5cbmZ1bmN0aW9uIGZvcm1hdEZpbGVTaXplKHNpemU6IG51bWJlcikge1xuICBpZiAoc2l6ZSA8IDEwMjQgKiAxMDI0KSB7XG4gICAgcmV0dXJuIGAkeyhzaXplIC8gMTAyNCkudG9GaXhlZCgxKX0gS0JgO1xuICB9XG4gIHJldHVybiBgJHsoc2l6ZSAvIDEwMjQgLyAxMDI0KS50b0ZpeGVkKDIpfSBNQmA7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFVwbG9hZGVkR3JhcGhVcGxvYWRQYWdlKCkge1xuICBjb25zdCBuYXZpZ2F0ZSA9IHVzZU5hdmlnYXRlKCk7XG4gIGNvbnN0IGZpbGVJbnB1dFJlZiA9IHVzZVJlZjxIVE1MSW5wdXRFbGVtZW50IHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IHtcbiAgICB1cGxvYWRlZEdyYXBoVXBsb2FkLFxuICAgIHVwbG9hZGVkR3JhcGgsXG4gICAgc2V0VXBsb2FkZWRHcmFwaERyYWdBY3RpdmUsXG4gICAgc2VsZWN0VXBsb2FkZWRHcmFwaEZpbGUsXG4gICAgY2xlYXJTZWxlY3RlZFVwbG9hZGVkR3JhcGhGaWxlLFxuICAgIGxvYWRVcGxvYWRlZEdyYXBoRnJvbVNlbGVjdGVkRmlsZSxcbiAgfSA9IHVzZUFwcENvbnRleHQoKTtcblxuICBjb25zdCBzZWxlY3RlZEZpbGUgPSB1cGxvYWRlZEdyYXBoVXBsb2FkLnNlbGVjdGVkRmlsZTtcblxuICBjb25zdCBoYW5kbGVGaWxlID0gKGZpbGU6IEZpbGUgfCBudWxsKSA9PiB7XG4gICAgc2VsZWN0VXBsb2FkZWRHcmFwaEZpbGUoZmlsZSk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlRHJvcCA9IChldmVudDogRHJhZ0V2ZW50PEhUTUxEaXZFbGVtZW50PikgPT4ge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgc2V0VXBsb2FkZWRHcmFwaERyYWdBY3RpdmUoZmFsc2UpO1xuICAgIGhhbmRsZUZpbGUoZXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzPy5bMF0gPz8gbnVsbCk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlRmlsZUlucHV0ID0gKGV2ZW50OiBDaGFuZ2VFdmVudDxIVE1MSW5wdXRFbGVtZW50PikgPT4ge1xuICAgIGhhbmRsZUZpbGUoZXZlbnQudGFyZ2V0LmZpbGVzPy5bMF0gPz8gbnVsbCk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlT3BlbldvcmtzcGFjZSA9IGFzeW5jICgpID0+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgbG9hZFVwbG9hZGVkR3JhcGhGcm9tU2VsZWN0ZWRGaWxlKCk7XG4gICAgICBuYXZpZ2F0ZSgnL2dyYXBocy93b3Jrc3BhY2UnKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFRoZSB1cGxvYWQgc3RhdGUgYWxyZWFkeSBzdXJmYWNlcyB0aGUgdmFsaWRhdGlvbiBmYWlsdXJlLlxuICAgIH1cbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLVsjMEYxNzJBXSB0ZXh0LXdoaXRlXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gbWF4LXctN3hsIHB4LTYgcHktMTBcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi02IGZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTNcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzcwIHAtMVwiPlxuICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnLycpfSBjbGFzc05hbWU9XCJyb3VuZGVkLXhsIHB4LTQgcHktMiB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1zbGF0ZS0zMDAgdHJhbnNpdGlvbiBob3Zlcjp0ZXh0LXdoaXRlXCI+XG4gICAgICAgICAgICAgIFJpc2sgV29ya3NwYWNlXG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9kb2N1bWVudHMnKX0gY2xhc3NOYW1lPVwicm91bmRlZC14bCBweC00IHB5LTIgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtc2xhdGUtMzAwIHRyYW5zaXRpb24gaG92ZXI6dGV4dC13aGl0ZVwiPlxuICAgICAgICAgICAgICBEb2N1bWVudCBXb3Jrc3BhY2VcbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9XCJyb3VuZGVkLXhsIGJnLWJsdWUtNjAwIHB4LTQgcHktMiB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPkdyYXBoIFdvcmtzcGFjZTwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxCdXR0b25cbiAgICAgICAgICAgIHZhcmlhbnQ9XCJzZWNvbmRhcnlcIlxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9ncmFwaHMvd29ya3NwYWNlJyl9XG4gICAgICAgICAgICBkaXNhYmxlZD17IXVwbG9hZGVkR3JhcGgub3BlcmF0aW9uYWxEYXRhICYmICF1cGxvYWRlZEdyYXBoLmRvY3VtZW50RGF0YX1cbiAgICAgICAgICA+XG4gICAgICAgICAgICBPcGVuIFVwbG9hZGVkIEdyYXBoXG4gICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBnYXAtMTAgeGw6Z3JpZC1jb2xzLVsxLjJmcl8wLjhmcl1cIj5cbiAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLVszMnB4XSBweC04IHB5LTEwIG1kOnB4LTEwIG1kOnB5LTEyXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTNcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBiZy1ibHVlLTUwMC8xNSBwLTMgdGV4dC1ibHVlLTMwMFwiPlxuICAgICAgICAgICAgICAgIDxOZXR3b3JrIGNsYXNzTmFtZT1cImgtOCB3LThcIiAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc20gdXBwZXJjYXNlIHRyYWNraW5nLVswLjIyZW1dIHRleHQtYmx1ZS0zMDBcIj5GaW5hbGl6ZWQgS25vd2xlZGdlIEdyYXBoczwvZGl2PlxuICAgICAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJtdC0xIHRleHQtNXhsIGZvbnQtYm9sZCB0cmFja2luZy10aWdodCB0ZXh0LXdoaXRlIG1kOnRleHQtNnhsXCI+VHdpbkdyYXBoT3BzPC9oMT5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibWF4LXctM3hsIHRleHQtbGcgbGVhZGluZy04IHRleHQtc2xhdGUtMzAwXCI+XG4gICAgICAgICAgICAgIFVwbG9hZCBlaXRoZXIgYW4gb3BlcmF0aW9uYWwgb3IgZG9jdW1lbnQgZ3JhcGggYXJ0aWZhY3QgSlNPTiwgYW5kIFR3aW5HcmFwaE9wcyB3aWxsIGRldGVjdCB0aGUgc2hhcGUgbG9jYWxseSBhbmQgb3BlbiB0aGUgcmlnaHQgdmlld2VyIGF1dG9tYXRpY2FsbHkuXG4gICAgICAgICAgICA8L3A+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtOCBmbGV4IGZsZXgtd3JhcCBnYXAtM1wiPlxuICAgICAgICAgICAgICA8QmFkZ2UgY2xhc3NOYW1lPVwiYm9yZGVyLWJsdWUtNTAwLzMwIGJnLWJsdWUtNTAwLzEwIHRleHQtYmx1ZS0xMDBcIj5Mb2NhbCBvbmx5PC9CYWRnZT5cbiAgICAgICAgICAgICAgPEJhZGdlIGNsYXNzTmFtZT1cImJvcmRlci1zbGF0ZS03MDAgYmctc2xhdGUtOTAwLzgwIHRleHQtc2xhdGUtMjAwXCI+XG4gICAgICAgICAgICAgICAgVXBsb2FkIGxpbWl0IHtNYXRoLnJvdW5kKGFwcENvbmZpZy5tYXhVcGxvYWRCeXRlcyAvIDEwMjQgLyAxMDI0KX0gTUJcbiAgICAgICAgICAgICAgPC9CYWRnZT5cbiAgICAgICAgICAgICAgPEJhZGdlIGNsYXNzTmFtZT1cImJvcmRlci1zbGF0ZS03MDAgYmctc2xhdGUtOTAwLzgwIHRleHQtc2xhdGUtMjAwXCI+T3BlcmF0aW9uYWwgKyBkb2N1bWVudCBhcnRpZmFjdHM8L0JhZGdlPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMTIgZ3JpZCBnYXAtNiBtZDpncmlkLWNvbHMtM1wiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtWzI4cHhdIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC81NSBwLTZcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgZmxleCBoLTEyIHctMTIgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtMnhsIGJnLWJsdWUtNTAwLzE1IHRleHQtYmx1ZS0zMDBcIj5cbiAgICAgICAgICAgICAgICAgIDxVcGxvYWQgY2xhc3NOYW1lPVwiaC02IHctNlwiIC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+MS4gVXBsb2FkIEpTT048L2gyPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBsZWFkaW5nLTYgdGV4dC1zbGF0ZS00MDBcIj5DaG9vc2UgYW4gb3BlcmF0aW9uYWwgb3IgZG9jdW1lbnQgYXJ0aWZhY3QgSlNPTiBmaWxlLjwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMjhweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzU1IHAtNlwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWItNCBmbGV4IGgtMTIgdy0xMiBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC0yeGwgYmctcHVycGxlLTUwMC8xNSB0ZXh0LXB1cnBsZS0zMDBcIj5cbiAgICAgICAgICAgICAgICAgIDxGaWxlSnNvbiBjbGFzc05hbWU9XCJoLTYgdy02XCIgLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj4yLiBWYWxpZGF0ZSBMb2NhbGx5PC9oMj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gbGVhZGluZy02IHRleHQtc2xhdGUtNDAwXCI+VGhlIGZpbGUgaXMgcGFyc2VkIGluLWJyb3dzZXIgYW5kIG1hdGNoZWQgYWdhaW5zdCBvcGVyYXRpb25hbCBhbmQgZG9jdW1lbnQgYXJ0aWZhY3Qgc2NoZW1hcy48L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtWzI4cHhdIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC81NSBwLTZcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgZmxleCBoLTEyIHctMTIgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtMnhsIGJnLW9yYW5nZS01MDAvMTUgdGV4dC1vcmFuZ2UtMzAwXCI+XG4gICAgICAgICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cImgtNiB3LTZcIiAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPjMuIEluc3BlY3QgQnJlYWtkb3duPC9oMj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gbGVhZGluZy02IHRleHQtc2xhdGUtNDAwXCI+VHdpbkdyYXBoT3BzIGF1dG8tcm91dGVzIHRvIHRoZSBjb3JyZWN0IG9wZXJhdGlvbmFsIG9yIGRvY3VtZW50IGJyZWFrZG93biB3aXRob3V0IHNlbmRpbmcgYW55dGhpbmcgdG8gdGhlIGJhY2tlbmQuPC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgICAgIDxhc2lkZSBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLVszMnB4XSBwLThcIj5cbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPkdyYXBoIFVwbG9hZDwvaDI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gbGVhZGluZy02IHRleHQtc2xhdGUtMzAwXCI+XG4gICAgICAgICAgICAgIExvYWQgb25lIG9wZXJhdGlvbmFsIG9yIGRvY3VtZW50IGdyYXBoIGFydGlmYWN0IGludG8gYSBicm93c2VyLXNlc3Npb24gd29ya3NwYWNlLiBUaGUgSlNPTiBuZXZlciBsZWF2ZXMgdGhlIGZyb250ZW5kLlxuICAgICAgICAgICAgPC9wPlxuXG4gICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT17YG10LTYgcm91bmRlZC1bMjhweF0gYm9yZGVyLTIgYm9yZGVyLWRhc2hlZCBwLTggdGV4dC1jZW50ZXIgdHJhbnNpdGlvbiAke1xuICAgICAgICAgICAgICAgIHVwbG9hZGVkR3JhcGhVcGxvYWQucGhhc2UgPT09ICdkcmFnLWhvdmVyJ1xuICAgICAgICAgICAgICAgICAgPyAnYm9yZGVyLWJsdWUtNDAwIGJnLWJsdWUtNTAwLzEwJ1xuICAgICAgICAgICAgICAgICAgOiAnYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05NTAvNTAgaG92ZXI6Ym9yZGVyLXNsYXRlLTUwMCdcbiAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgIG9uRHJhZ092ZXI9eyhldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgc2V0VXBsb2FkZWRHcmFwaERyYWdBY3RpdmUodHJ1ZSk7XG4gICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgIG9uRHJhZ0xlYXZlPXsoKSA9PiBzZXRVcGxvYWRlZEdyYXBoRHJhZ0FjdGl2ZShmYWxzZSl9XG4gICAgICAgICAgICAgIG9uRHJvcD17aGFuZGxlRHJvcH1cbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPFVwbG9hZCBjbGFzc05hbWU9XCJteC1hdXRvIGgtMTQgdy0xNCB0ZXh0LXNsYXRlLTQwMFwiIC8+XG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJtdC00IHRleHQteGwgZm9udC1tZWRpdW0gdGV4dC13aGl0ZVwiPlVwbG9hZCBHcmFwaCBBcnRpZmFjdCBKU09OPC9oMz5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+RHJhZyBhbmQgZHJvcCBhbiBvcGVyYXRpb25hbCBvciBkb2N1bWVudCBhcnRpZmFjdCBoZXJlIG9yIGJyb3dzZSBsb2NhbGx5LjwvcD5cbiAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgcmVmPXtmaWxlSW5wdXRSZWZ9XG4gICAgICAgICAgICAgICAgdHlwZT1cImZpbGVcIlxuICAgICAgICAgICAgICAgIGFjY2VwdD1cIi5qc29uLGFwcGxpY2F0aW9uL2pzb25cIlxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImhpZGRlblwiXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9e2hhbmRsZUZpbGVJbnB1dH1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC02IGZsZXggZmxleC13cmFwIGp1c3RpZnktY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PVwic2Vjb25kYXJ5XCIgb25DbGljaz17KCkgPT4gZmlsZUlucHV0UmVmLmN1cnJlbnQ/LmNsaWNrKCl9PlxuICAgICAgICAgICAgICAgICAgPEZpbGVKc29uIGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPlxuICAgICAgICAgICAgICAgICAgQ2hvb3NlIEpTT05cbiAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICAgICA8QnV0dG9uIG9uQ2xpY2s9eygpID0+IHZvaWQgaGFuZGxlT3BlbldvcmtzcGFjZSgpfSBkaXNhYmxlZD17IXNlbGVjdGVkRmlsZX0+XG4gICAgICAgICAgICAgICAgICBPcGVuIEdyYXBoIFdvcmtzcGFjZVxuICAgICAgICAgICAgICAgICAgPENoZXZyb25SaWdodCBjbGFzc05hbWU9XCJoLTQgdy00XCIgLz5cbiAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTQgdGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMmVtXSB0ZXh0LXNsYXRlLTUwMFwiPlN1cHBvcnRlZCBmb3JtYXQ6IC5qc29uIGFydGlmYWN0IGZpbGVzPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiByb3VuZGVkLVsyOHB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNjAgcC00XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS01MDBcIj5TZWxlY3RlZCBGaWxlPC9wPlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj57c2VsZWN0ZWRGaWxlPy5uYW1lID8/ICdObyBmaWxlIHNlbGVjdGVkLid9PC9wPlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgIHtzZWxlY3RlZEZpbGUgPyBmb3JtYXRGaWxlU2l6ZShzZWxlY3RlZEZpbGUuc2l6ZSkgOiAnQ2hvb3NlIGFuIG9wZXJhdGlvbmFsIG9yIGRvY3VtZW50IGFydGlmYWN0IHRvIGJlZ2luLid9XG4gICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAge3NlbGVjdGVkRmlsZSA/IChcbiAgICAgICAgICAgICAgICAgIDxCdXR0b24gdmFyaWFudD1cImdob3N0XCIgb25DbGljaz17Y2xlYXJTZWxlY3RlZFVwbG9hZGVkR3JhcGhGaWxlfT5cbiAgICAgICAgICAgICAgICAgICAgQ2xlYXJcbiAgICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTZcIj5cbiAgICAgICAgICAgICAgPFN0YXR1c0Jhbm5lclxuICAgICAgICAgICAgICAgIHRvbmU9e3VwbG9hZGVkR3JhcGhVcGxvYWQuZXJyb3IgPyAnZXJyb3InIDogdXBsb2FkZWRHcmFwaC5vcGVyYXRpb25hbERhdGEgfHwgdXBsb2FkZWRHcmFwaC5kb2N1bWVudERhdGEgPyAnc3VjY2VzcycgOiAnaW5mbyd9XG4gICAgICAgICAgICAgICAgbWVzc2FnZT17dXBsb2FkZWRHcmFwaFVwbG9hZC5lcnJvciB8fCB1cGxvYWRlZEdyYXBoVXBsb2FkLnN0YXR1c01lc3NhZ2UgfHwgJ1VwbG9hZCBhIGdyYXBoIGFydGlmYWN0IEpTT04gZmlsZSB0byBjb250aW51ZS4nfVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9hc2lkZT5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiIsICJpbXBvcnQgeyB1c2VEZWZlcnJlZFZhbHVlLCB1c2VFZmZlY3QsIHVzZU1lbW8sIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgQXJyb3dVcERvd24sIEV4dGVybmFsTGluaywgRmlsdGVyLCBTZWFyY2ggfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHR5cGUgeyBHcmFwaERhdGEgfSBmcm9tICcuLi90eXBlcy9hcHAnO1xuaW1wb3J0IEJhZGdlIGZyb20gJy4vdWkvQmFkZ2UnO1xuaW1wb3J0IElucHV0IGZyb20gJy4vdWkvSW5wdXQnO1xuaW1wb3J0IEJ1dHRvbiBmcm9tICcuL3VpL0J1dHRvbic7XG5pbXBvcnQgeyBmb3JtYXRMYWJlbCwgZ2V0Q29ubmVjdGlvbkNvdW50LCBnZXRMaW5rRW5kcG9pbnRJZCwgZ2V0Umlza0NvbG9yLCBnZXRUeXBlQ29sb3IgfSBmcm9tICcuLi9saWIvc2VsZWN0b3JzJztcblxuaW50ZXJmYWNlIE5vZGVzRWRnZXNWaWV3UHJvcHMge1xuICBncmFwaERhdGE6IEdyYXBoRGF0YTtcbiAgb25Ob2RlU2VsZWN0OiAobm9kZUlkOiBzdHJpbmcpID0+IHZvaWQ7XG59XG5cbnR5cGUgQWN0aXZlVGFibGUgPSAnbm9kZXMnIHwgJ2VkZ2VzJztcbnR5cGUgTm9kZVNvcnRGaWVsZCA9ICduYW1lJyB8ICdyaXNrU2NvcmUnIHwgJ3R5cGUnIHwgJ2RlcGVuZGVuY2llcycgfCAnY29ubmVjdGlvbnMnO1xudHlwZSBFZGdlU29ydEZpZWxkID0gJ3NvdXJjZScgfCAndGFyZ2V0JyB8ICdyZWxhdGlvbic7XG5cbmNvbnN0IHBhZ2VTaXplID0gMTA7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE5vZGVzRWRnZXNWaWV3KHsgZ3JhcGhEYXRhLCBvbk5vZGVTZWxlY3QgfTogTm9kZXNFZGdlc1ZpZXdQcm9wcykge1xuICBjb25zdCBbYWN0aXZlVGFibGUsIHNldEFjdGl2ZVRhYmxlXSA9IHVzZVN0YXRlPEFjdGl2ZVRhYmxlPignbm9kZXMnKTtcbiAgY29uc3QgW3NlYXJjaFRlcm0sIHNldFNlYXJjaFRlcm1dID0gdXNlU3RhdGUoJycpO1xuICBjb25zdCBbdHlwZUZpbHRlciwgc2V0VHlwZUZpbHRlcl0gPSB1c2VTdGF0ZSgnYWxsJyk7XG4gIGNvbnN0IFtyZWxhdGlvbkZpbHRlciwgc2V0UmVsYXRpb25GaWx0ZXJdID0gdXNlU3RhdGUoJ2FsbCcpO1xuICBjb25zdCBbbm9kZVNvcnRGaWVsZCwgc2V0Tm9kZVNvcnRGaWVsZF0gPSB1c2VTdGF0ZTxOb2RlU29ydEZpZWxkPigncmlza1Njb3JlJyk7XG4gIGNvbnN0IFtub2RlU29ydE9yZGVyLCBzZXROb2RlU29ydE9yZGVyXSA9IHVzZVN0YXRlPCdhc2MnIHwgJ2Rlc2MnPignZGVzYycpO1xuICBjb25zdCBbZWRnZVNvcnRGaWVsZCwgc2V0RWRnZVNvcnRGaWVsZF0gPSB1c2VTdGF0ZTxFZGdlU29ydEZpZWxkPignc291cmNlJyk7XG4gIGNvbnN0IFtlZGdlU29ydE9yZGVyLCBzZXRFZGdlU29ydE9yZGVyXSA9IHVzZVN0YXRlPCdhc2MnIHwgJ2Rlc2MnPignYXNjJyk7XG4gIGNvbnN0IFtwYWdlLCBzZXRQYWdlXSA9IHVzZVN0YXRlKDEpO1xuICBjb25zdCBkZWZlcnJlZFNlYXJjaCA9IHVzZURlZmVycmVkVmFsdWUoc2VhcmNoVGVybS50cmltKCkudG9Mb3dlckNhc2UoKSk7XG5cbiAgY29uc3Qgbm9kZVR5cGVzID0gdXNlTWVtbyhcbiAgICAoKSA9PiBbLi4ubmV3IFNldChncmFwaERhdGEubm9kZXMubWFwKChub2RlKSA9PiBub2RlLnR5cGUpKV0uc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQubG9jYWxlQ29tcGFyZShyaWdodCkpLFxuICAgIFtncmFwaERhdGEubm9kZXNdXG4gICk7XG5cbiAgY29uc3QgZmlsdGVyZWROb2RlcyA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IG5vZGVzID0gZ3JhcGhEYXRhLm5vZGVzLmZpbHRlcigobm9kZSkgPT4ge1xuICAgICAgY29uc3QgbWF0Y2hlc1NlYXJjaCA9XG4gICAgICAgIGRlZmVycmVkU2VhcmNoLmxlbmd0aCA9PT0gMCB8fFxuICAgICAgICBub2RlLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhkZWZlcnJlZFNlYXJjaCkgfHxcbiAgICAgICAgbm9kZS5pZC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGRlZmVycmVkU2VhcmNoKSB8fFxuICAgICAgICBub2RlLmRlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoZGVmZXJyZWRTZWFyY2gpO1xuICAgICAgY29uc3QgbWF0Y2hlc1R5cGUgPSB0eXBlRmlsdGVyID09PSAnYWxsJyB8fCBub2RlLnR5cGUgPT09IHR5cGVGaWx0ZXI7XG4gICAgICByZXR1cm4gbWF0Y2hlc1NlYXJjaCAmJiBtYXRjaGVzVHlwZTtcbiAgICB9KTtcblxuICAgIHJldHVybiBub2Rlcy5zb3J0KChsZWZ0LCByaWdodCkgPT4ge1xuICAgICAgY29uc3QgbGVmdENvbm5lY3Rpb25zID0gZ2V0Q29ubmVjdGlvbkNvdW50KGdyYXBoRGF0YSwgbGVmdC5pZCk7XG4gICAgICBjb25zdCByaWdodENvbm5lY3Rpb25zID0gZ2V0Q29ubmVjdGlvbkNvdW50KGdyYXBoRGF0YSwgcmlnaHQuaWQpO1xuXG4gICAgICBsZXQgY29tcGFyaXNvbiA9IDA7XG4gICAgICBzd2l0Y2ggKG5vZGVTb3J0RmllbGQpIHtcbiAgICAgICAgY2FzZSAnbmFtZSc6XG4gICAgICAgICAgY29tcGFyaXNvbiA9IGxlZnQubmFtZS5sb2NhbGVDb21wYXJlKHJpZ2h0Lm5hbWUpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd0eXBlJzpcbiAgICAgICAgICBjb21wYXJpc29uID0gbGVmdC50eXBlLmxvY2FsZUNvbXBhcmUocmlnaHQudHlwZSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2RlcGVuZGVuY2llcyc6XG4gICAgICAgICAgY29tcGFyaXNvbiA9IGxlZnQuZGVwZW5kZW5jaWVzLmxlbmd0aCAtIHJpZ2h0LmRlcGVuZGVuY2llcy5sZW5ndGg7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Nvbm5lY3Rpb25zJzpcbiAgICAgICAgICBjb21wYXJpc29uID0gbGVmdENvbm5lY3Rpb25zIC0gcmlnaHRDb25uZWN0aW9ucztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncmlza1Njb3JlJzpcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBjb21wYXJpc29uID0gbGVmdC5yaXNrU2NvcmUgLSByaWdodC5yaXNrU2NvcmU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBub2RlU29ydE9yZGVyID09PSAnYXNjJyA/IGNvbXBhcmlzb24gOiAtY29tcGFyaXNvbjtcbiAgICB9KTtcbiAgfSwgW2RlZmVycmVkU2VhcmNoLCBncmFwaERhdGEsIG5vZGVTb3J0RmllbGQsIG5vZGVTb3J0T3JkZXIsIHR5cGVGaWx0ZXJdKTtcblxuICBjb25zdCBmaWx0ZXJlZEVkZ2VzID0gdXNlTWVtbygoKSA9PiB7XG4gICAgY29uc3QgZWRnZXMgPSBncmFwaERhdGEubGlua3MuZmlsdGVyKChlZGdlKSA9PiB7XG4gICAgICBjb25zdCBtYXRjaGVzU2VhcmNoID1cbiAgICAgICAgZGVmZXJyZWRTZWFyY2gubGVuZ3RoID09PSAwIHx8XG4gICAgICAgIGdldExpbmtFbmRwb2ludElkKGVkZ2Uuc291cmNlKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGRlZmVycmVkU2VhcmNoKSB8fFxuICAgICAgICBnZXRMaW5rRW5kcG9pbnRJZChlZGdlLnRhcmdldCkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhkZWZlcnJlZFNlYXJjaCkgfHxcbiAgICAgICAgZWRnZS5yZWxhdGlvbi50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGRlZmVycmVkU2VhcmNoKTtcbiAgICAgIGNvbnN0IG1hdGNoZXNSZWxhdGlvbiA9IHJlbGF0aW9uRmlsdGVyID09PSAnYWxsJyB8fCBlZGdlLnJlbGF0aW9uID09PSByZWxhdGlvbkZpbHRlcjtcbiAgICAgIHJldHVybiBtYXRjaGVzU2VhcmNoICYmIG1hdGNoZXNSZWxhdGlvbjtcbiAgICB9KTtcblxuICAgIHJldHVybiBlZGdlcy5zb3J0KChsZWZ0LCByaWdodCkgPT4ge1xuICAgICAgbGV0IGNvbXBhcmlzb24gPSAwO1xuICAgICAgc3dpdGNoIChlZGdlU29ydEZpZWxkKSB7XG4gICAgICAgIGNhc2UgJ3RhcmdldCc6XG4gICAgICAgICAgY29tcGFyaXNvbiA9IGdldExpbmtFbmRwb2ludElkKGxlZnQudGFyZ2V0KS5sb2NhbGVDb21wYXJlKGdldExpbmtFbmRwb2ludElkKHJpZ2h0LnRhcmdldCkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdyZWxhdGlvbic6XG4gICAgICAgICAgY29tcGFyaXNvbiA9IGxlZnQucmVsYXRpb24ubG9jYWxlQ29tcGFyZShyaWdodC5yZWxhdGlvbik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3NvdXJjZSc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29tcGFyaXNvbiA9IGdldExpbmtFbmRwb2ludElkKGxlZnQuc291cmNlKS5sb2NhbGVDb21wYXJlKGdldExpbmtFbmRwb2ludElkKHJpZ2h0LnNvdXJjZSkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZWRnZVNvcnRPcmRlciA9PT0gJ2FzYycgPyBjb21wYXJpc29uIDogLWNvbXBhcmlzb247XG4gICAgfSk7XG4gIH0sIFtkZWZlcnJlZFNlYXJjaCwgZWRnZVNvcnRGaWVsZCwgZWRnZVNvcnRPcmRlciwgZ3JhcGhEYXRhLmxpbmtzLCByZWxhdGlvbkZpbHRlcl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgc2V0UGFnZSgxKTtcbiAgfSwgW2FjdGl2ZVRhYmxlLCBkZWZlcnJlZFNlYXJjaCwgZWRnZVNvcnRGaWVsZCwgZWRnZVNvcnRPcmRlciwgbm9kZVNvcnRGaWVsZCwgbm9kZVNvcnRPcmRlciwgcmVsYXRpb25GaWx0ZXIsIHR5cGVGaWx0ZXJdKTtcblxuICBjb25zdCBub2RlUGFnZUNvdW50ID0gTWF0aC5tYXgoMSwgTWF0aC5jZWlsKGZpbHRlcmVkTm9kZXMubGVuZ3RoIC8gcGFnZVNpemUpKTtcbiAgY29uc3QgZWRnZVBhZ2VDb3VudCA9IE1hdGgubWF4KDEsIE1hdGguY2VpbChmaWx0ZXJlZEVkZ2VzLmxlbmd0aCAvIHBhZ2VTaXplKSk7XG4gIGNvbnN0IHBhZ2VkTm9kZXMgPSBmaWx0ZXJlZE5vZGVzLnNsaWNlKChwYWdlIC0gMSkgKiBwYWdlU2l6ZSwgcGFnZSAqIHBhZ2VTaXplKTtcbiAgY29uc3QgcGFnZWRFZGdlcyA9IGZpbHRlcmVkRWRnZXMuc2xpY2UoKHBhZ2UgLSAxKSAqIHBhZ2VTaXplLCBwYWdlICogcGFnZVNpemUpO1xuXG4gIGNvbnN0IHRvZ2dsZU5vZGVTb3J0ID0gKGZpZWxkOiBOb2RlU29ydEZpZWxkKSA9PiB7XG4gICAgaWYgKG5vZGVTb3J0RmllbGQgPT09IGZpZWxkKSB7XG4gICAgICBzZXROb2RlU29ydE9yZGVyKChjdXJyZW50KSA9PiAoY3VycmVudCA9PT0gJ2FzYycgPyAnZGVzYycgOiAnYXNjJykpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzZXROb2RlU29ydEZpZWxkKGZpZWxkKTtcbiAgICBzZXROb2RlU29ydE9yZGVyKGZpZWxkID09PSAnbmFtZScgfHwgZmllbGQgPT09ICd0eXBlJyA/ICdhc2MnIDogJ2Rlc2MnKTtcbiAgfTtcblxuICBjb25zdCB0b2dnbGVFZGdlU29ydCA9IChmaWVsZDogRWRnZVNvcnRGaWVsZCkgPT4ge1xuICAgIGlmIChlZGdlU29ydEZpZWxkID09PSBmaWVsZCkge1xuICAgICAgc2V0RWRnZVNvcnRPcmRlcigoY3VycmVudCkgPT4gKGN1cnJlbnQgPT09ICdhc2MnID8gJ2Rlc2MnIDogJ2FzYycpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2V0RWRnZVNvcnRGaWVsZChmaWVsZCk7XG4gICAgc2V0RWRnZVNvcnRPcmRlcignYXNjJyk7XG4gIH07XG5cbiAgY29uc3QgcGFnZUNvdW50ID0gYWN0aXZlVGFibGUgPT09ICdub2RlcycgPyBub2RlUGFnZUNvdW50IDogZWRnZVBhZ2VDb3VudDtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIG92ZXJmbG93LXktYXV0byBwLTYgbWQ6cC04XCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gbWF4LXctN3hsIHNwYWNlLXktNlwiPlxuICAgICAgICA8ZGl2PlxuICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LWJvbGQgdGV4dC13aGl0ZVwiPk5vZGVzICYgRWRnZXM8L2gxPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSB0ZXh0LXNsYXRlLTMwMFwiPlxuICAgICAgICAgICAgU2VhcmNoLCBmaWx0ZXIsIHNvcnQsIGFuZCBwYWdlIHRocm91Z2ggY29tcG9uZW50cyBhbmQgcmVsYXRpb25zaGlwcyBmcm9tIHRoZSBhY3RpdmUgYmFja2VuZCBncmFwaC5cbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC00XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdhcC00IGxnOmdyaWQtY29scy1bbWlubWF4KDAsMWZyKV8yMjBweF8yMjBweF9hdXRvXVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyZWxhdGl2ZVwiPlxuICAgICAgICAgICAgICA8U2VhcmNoIGNsYXNzTmFtZT1cInBvaW50ZXItZXZlbnRzLW5vbmUgYWJzb2x1dGUgbGVmdC0zIHRvcC0xLzIgaC00IHctNCAtdHJhbnNsYXRlLXktMS8yIHRleHQtc2xhdGUtNTAwXCIgLz5cbiAgICAgICAgICAgICAgPElucHV0XG4gICAgICAgICAgICAgICAgdmFsdWU9e3NlYXJjaFRlcm19XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0U2VhcmNoVGVybShldmVudC50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPXthY3RpdmVUYWJsZSA9PT0gJ25vZGVzJyA/ICdTZWFyY2ggbm9kZXMgYnkgaWQsIG5hbWUsIG9yIGRlc2NyaXB0aW9uJyA6ICdTZWFyY2ggZWRnZXMgYnkgc291cmNlLCB0YXJnZXQsIG9yIHJlbGF0aW9uJ31cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwbC0xMFwiXG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC83MCBweC0zXCI+XG4gICAgICAgICAgICAgIDxGaWx0ZXIgY2xhc3NOYW1lPVwiaC00IHctNCB0ZXh0LXNsYXRlLTUwMFwiIC8+XG4gICAgICAgICAgICAgIDxzZWxlY3RcbiAgICAgICAgICAgICAgICB2YWx1ZT17dHlwZUZpbHRlcn1cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRUeXBlRmlsdGVyKGV2ZW50LnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLXRyYW5zcGFyZW50IHB5LTMgdGV4dC1zbSB0ZXh0LXdoaXRlIG91dGxpbmUtbm9uZVwiXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2FjdGl2ZVRhYmxlICE9PSAnbm9kZXMnfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cImFsbFwiPkFsbCB0eXBlczwvb3B0aW9uPlxuICAgICAgICAgICAgICAgIHtub2RlVHlwZXMubWFwKCh0eXBlKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8b3B0aW9uIGtleT17dHlwZX0gdmFsdWU9e3R5cGV9PlxuICAgICAgICAgICAgICAgICAgICB7Zm9ybWF0TGFiZWwodHlwZSl9XG4gICAgICAgICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICA8L2xhYmVsPlxuXG4gICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzcwIHB4LTNcIj5cbiAgICAgICAgICAgICAgPEZpbHRlciBjbGFzc05hbWU9XCJoLTQgdy00IHRleHQtc2xhdGUtNTAwXCIgLz5cbiAgICAgICAgICAgICAgPHNlbGVjdFxuICAgICAgICAgICAgICAgIHZhbHVlPXtyZWxhdGlvbkZpbHRlcn1cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRSZWxhdGlvbkZpbHRlcihldmVudC50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy10cmFuc3BhcmVudCBweS0zIHRleHQtc20gdGV4dC13aGl0ZSBvdXRsaW5lLW5vbmVcIlxuICAgICAgICAgICAgICAgIGRpc2FibGVkPXthY3RpdmVUYWJsZSAhPT0gJ2VkZ2VzJ31cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJhbGxcIj5BbGwgcmVsYXRpb25zPC9vcHRpb24+XG4gICAgICAgICAgICAgICAge2dyYXBoRGF0YS5yZWxhdGlvblR5cGVzLm1hcCgocmVsYXRpb24pID0+IChcbiAgICAgICAgICAgICAgICAgIDxvcHRpb24ga2V5PXtyZWxhdGlvbn0gdmFsdWU9e3JlbGF0aW9ufT5cbiAgICAgICAgICAgICAgICAgICAge2Zvcm1hdExhYmVsKHJlbGF0aW9uKX1cbiAgICAgICAgICAgICAgICAgIDwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgIDwvbGFiZWw+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PXthY3RpdmVUYWJsZSA9PT0gJ25vZGVzJyA/ICdwcmltYXJ5JyA6ICdzZWNvbmRhcnknfSBvbkNsaWNrPXsoKSA9PiBzZXRBY3RpdmVUYWJsZSgnbm9kZXMnKX0+XG4gICAgICAgICAgICAgICAgTm9kZXNcbiAgICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgICAgIDxCdXR0b24gdmFyaWFudD17YWN0aXZlVGFibGUgPT09ICdlZGdlcycgPyAncHJpbWFyeScgOiAnc2Vjb25kYXJ5J30gb25DbGljaz17KCkgPT4gc2V0QWN0aXZlVGFibGUoJ2VkZ2VzJyl9PlxuICAgICAgICAgICAgICAgIEVkZ2VzXG4gICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgb3ZlcmZsb3ctaGlkZGVuIHJvdW5kZWQtM3hsXCI+XG4gICAgICAgICAge2FjdGl2ZVRhYmxlID09PSAnbm9kZXMnID8gKFxuICAgICAgICAgICAgPD5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy1bMS4zZnJfMWZyXzAuN2ZyXzAuN2ZyXzAuN2ZyXzAuOGZyXSBnYXAtNCBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC85MCBweC00IHB5LTQgdGV4dC1sZWZ0IHRleHQteHMgZm9udC1zZW1pYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS00MDBcIj5cbiAgICAgICAgICAgICAgICB7W1xuICAgICAgICAgICAgICAgICAgWyduYW1lJywgJ0NvbXBvbmVudCddLFxuICAgICAgICAgICAgICAgICAgWyd0eXBlJywgJ1R5cGUnXSxcbiAgICAgICAgICAgICAgICAgIFsncmlza1Njb3JlJywgJ1Jpc2snXSxcbiAgICAgICAgICAgICAgICAgIFsnZGVwZW5kZW5jaWVzJywgJ0RlcGVuZGVuY2llcyddLFxuICAgICAgICAgICAgICAgICAgWydjb25uZWN0aW9ucycsICdDb25uZWN0aW9ucyddLFxuICAgICAgICAgICAgICAgIF0ubWFwKChbZmllbGQsIGxhYmVsXSkgPT4gKFxuICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBrZXk9e2ZpZWxkfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSB0ZXh0LWxlZnRcIlxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB0b2dnbGVOb2RlU29ydChmaWVsZCBhcyBOb2RlU29ydEZpZWxkKX1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAge2xhYmVsfVxuICAgICAgICAgICAgICAgICAgICA8QXJyb3dVcERvd24gY2xhc3NOYW1lPVwiaC0zLjUgdy0zLjVcIiAvPlxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgPGRpdj5BY3Rpb248L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJkaXZpZGUteSBkaXZpZGUtc2xhdGUtODAwXCI+XG4gICAgICAgICAgICAgICAge3BhZ2VkTm9kZXMubWFwKChub2RlKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGtleT17bm9kZS5pZH0gY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtWzEuM2ZyXzFmcl8wLjdmcl8wLjdmcl8wLjdmcl8wLjhmcl0gZ2FwLTQgcHgtNCBweS00IHRleHQtc21cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj57bm9kZS5uYW1lfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXhzIHRleHQtc2xhdGUtNDAwXCI+e25vZGUuaWR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDxCYWRnZVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYm9yZGVyLXRyYW5zcGFyZW50IHRleHQtd2hpdGVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgYmFja2dyb3VuZENvbG9yOiBnZXRUeXBlQ29sb3Iobm9kZS50eXBlKSB9fVxuICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtmb3JtYXRMYWJlbChub2RlLnR5cGUpfVxuICAgICAgICAgICAgICAgICAgICAgIDwvQmFkZ2U+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDxCYWRnZVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYm9yZGVyLXRyYW5zcGFyZW50IHRleHQtd2hpdGVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgYmFja2dyb3VuZENvbG9yOiBnZXRSaXNrQ29sb3Iobm9kZS5yaXNrTGV2ZWwpIH19XG4gICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAge25vZGUucmlza1Njb3JlfVxuICAgICAgICAgICAgICAgICAgICAgIDwvQmFkZ2U+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc2xhdGUtMzAwXCI+e25vZGUuZGVwZW5kZW5jaWVzLmxlbmd0aH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTMwMFwiPntnZXRDb25uZWN0aW9uQ291bnQoZ3JhcGhEYXRhLCBub2RlLmlkKX08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvbk5vZGVTZWxlY3Qobm9kZS5pZCl9XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgdGV4dC1ibHVlLTMwMCB0cmFuc2l0aW9uIGhvdmVyOnRleHQtYmx1ZS0yMDBcIlxuICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZXdcbiAgICAgICAgICAgICAgICAgICAgICAgIDxFeHRlcm5hbExpbmsgY2xhc3NOYW1lPVwiaC0zLjUgdy0zLjVcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvPlxuICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICA8PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLVsxZnJfMWZyXzFmcl8xLjRmcl8wLjhmcl0gZ2FwLTQgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvOTAgcHgtNCBweS00IHRleHQtbGVmdCB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgICAge1tcbiAgICAgICAgICAgICAgICAgIFsnc291cmNlJywgJ1NvdXJjZSddLFxuICAgICAgICAgICAgICAgICAgWyd0YXJnZXQnLCAnVGFyZ2V0J10sXG4gICAgICAgICAgICAgICAgICBbJ3JlbGF0aW9uJywgJ1JlbGF0aW9uJ10sXG4gICAgICAgICAgICAgICAgXS5tYXAoKFtmaWVsZCwgbGFiZWxdKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIGtleT17ZmllbGR9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHRleHQtbGVmdFwiXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHRvZ2dsZUVkZ2VTb3J0KGZpZWxkIGFzIEVkZ2VTb3J0RmllbGQpfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICB7bGFiZWx9XG4gICAgICAgICAgICAgICAgICAgIDxBcnJvd1VwRG93biBjbGFzc05hbWU9XCJoLTMuNSB3LTMuNVwiIC8+XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICA8ZGl2PlJhdGlvbmFsZTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXY+QWN0aW9uPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZGl2aWRlLXkgZGl2aWRlLXNsYXRlLTgwMFwiPlxuICAgICAgICAgICAgICAgIHtwYWdlZEVkZ2VzLm1hcCgoZWRnZSkgPT4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e2VkZ2UuaWR9IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLVsxZnJfMWZyXzFmcl8xLjRmcl8wLjhmcl0gZ2FwLTQgcHgtNCBweS00IHRleHQtc21cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTIwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgIHtncmFwaERhdGEubm9kZUluZGV4W2dldExpbmtFbmRwb2ludElkKGVkZ2Uuc291cmNlKV0/Lm5hbWUgPz8gZ2V0TGlua0VuZHBvaW50SWQoZWRnZS5zb3VyY2UpfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTIwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgIHtncmFwaERhdGEubm9kZUluZGV4W2dldExpbmtFbmRwb2ludElkKGVkZ2UudGFyZ2V0KV0/Lm5hbWUgPz8gZ2V0TGlua0VuZHBvaW50SWQoZWRnZS50YXJnZXQpfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTMwMFwiPntmb3JtYXRMYWJlbChlZGdlLnJlbGF0aW9uKX08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTQwMFwiPntlZGdlLnJhdGlvbmFsZSB8fCAnTm8gcmF0aW9uYWxlIHByb3ZpZGVkLid9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gb25Ob2RlU2VsZWN0KGdldExpbmtFbmRwb2ludElkKGVkZ2Uuc291cmNlKSl9XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgdGV4dC1ibHVlLTMwMCB0cmFuc2l0aW9uIGhvdmVyOnRleHQtYmx1ZS0yMDBcIlxuICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIEluc3BlY3RcbiAgICAgICAgICAgICAgICAgICAgICAgIDxFeHRlcm5hbExpbmsgY2xhc3NOYW1lPVwiaC0zLjUgdy0zLjVcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvPlxuICAgICAgICAgICl9XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtNFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlxuICAgICAgICAgICAgU2hvd2luZyB7YWN0aXZlVGFibGUgPT09ICdub2RlcycgPyBwYWdlZE5vZGVzLmxlbmd0aCA6IHBhZ2VkRWRnZXMubGVuZ3RofSBvZnsnICd9XG4gICAgICAgICAgICB7YWN0aXZlVGFibGUgPT09ICdub2RlcycgPyBmaWx0ZXJlZE5vZGVzLmxlbmd0aCA6IGZpbHRlcmVkRWRnZXMubGVuZ3RofSB7YWN0aXZlVGFibGV9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PVwic2Vjb25kYXJ5XCIgZGlzYWJsZWQ9e3BhZ2UgPT09IDF9IG9uQ2xpY2s9eygpID0+IHNldFBhZ2UoKGN1cnJlbnQpID0+IE1hdGgubWF4KDEsIGN1cnJlbnQgLSAxKSl9PlxuICAgICAgICAgICAgICBQcmV2aW91c1xuICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgICA8QmFkZ2U+XG4gICAgICAgICAgICAgIFBhZ2Uge3BhZ2V9IG9mIHtwYWdlQ291bnR9XG4gICAgICAgICAgICA8L0JhZGdlPlxuICAgICAgICAgICAgPEJ1dHRvblxuICAgICAgICAgICAgICB2YXJpYW50PVwic2Vjb25kYXJ5XCJcbiAgICAgICAgICAgICAgZGlzYWJsZWQ9e3BhZ2UgPT09IHBhZ2VDb3VudH1cbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0UGFnZSgoY3VycmVudCkgPT4gTWF0aC5taW4ocGFnZUNvdW50LCBjdXJyZW50ICsgMSkpfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICBOZXh0XG4gICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiIsICJpbXBvcnQgeyBBbGVydFRyaWFuZ2xlLCBHaXRCcmFuY2gsIFNoaWVsZCwgVGFyZ2V0IH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB0eXBlIHsgR3JhcGhEYXRhIH0gZnJvbSAnLi4vdHlwZXMvYXBwJztcbmltcG9ydCB7IGJ1aWxkR3JhcGhTdW1tYXJ5LCBmb3JtYXRMYWJlbCwgZ2V0Umlza0NvbG9yLCBnZXRUeXBlQ29sb3IgfSBmcm9tICcuLi9saWIvc2VsZWN0b3JzJztcblxuaW50ZXJmYWNlIFJpc2tBbmFseXNpc1Byb3BzIHtcbiAgZ3JhcGhEYXRhOiBHcmFwaERhdGE7XG4gIHNvdXJjZUxhYmVsPzogc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBSaXNrQW5hbHlzaXMoeyBncmFwaERhdGEsIHNvdXJjZUxhYmVsID0gJ2FjdGl2ZSBncmFwaCcgfTogUmlza0FuYWx5c2lzUHJvcHMpIHtcbiAgY29uc3Qgc3VtbWFyeSA9IGJ1aWxkR3JhcGhTdW1tYXJ5KGdyYXBoRGF0YSk7XG4gIGNvbnN0IG1heFJpc2tCdWNrZXQgPSBNYXRoLm1heCguLi5zdW1tYXJ5LnJpc2tEaXN0cmlidXRpb24ubWFwKChpdGVtKSA9PiBpdGVtLmNvdW50KSwgMSk7XG4gIGNvbnN0IG1heFR5cGVDb3VudCA9IE1hdGgubWF4KC4uLnN1bW1hcnkudHlwZURpc3RyaWJ1dGlvbi5tYXAoKGl0ZW0pID0+IGl0ZW0uY291bnQpLCAxKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIG92ZXJmbG93LXktYXV0byBwLTYgbWQ6cC04XCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gbWF4LXctN3hsIHNwYWNlLXktOFwiPlxuICAgICAgICA8ZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgdGV4dC1zbSB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMThlbV0gdGV4dC1vcmFuZ2UtMzAwXCI+XG4gICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPlxuICAgICAgICAgICAgUmlzayBBbmFseXNpc1xuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJtdC0yIHRleHQtM3hsIGZvbnQtYm9sZCB0ZXh0LXdoaXRlXCI+T3BlcmF0aW9uYWwgUmlzayBEYXNoYm9hcmQ8L2gxPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgbWF4LXctM3hsIHRleHQtc20gbGVhZGluZy03IHRleHQtc2xhdGUtMzAwXCI+XG4gICAgICAgICAgICBEYXNoYm9hcmQgdmFsdWVzIGFyZSBkZXJpdmVkIGRpcmVjdGx5IGZyb20gdGhlIHtzb3VyY2VMYWJlbH0gYmVjYXVzZSB0aGUgY3VycmVudCBmcm9udGVuZCBkb2VzIG5vdCBkZXBlbmQgb24gYSBzZXBhcmF0ZSByYW5rZWQtcmlzayBlbmRwb2ludCBoZXJlLlxuICAgICAgICAgIDwvcD5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdhcC00IG1kOmdyaWQtY29scy0yIHhsOmdyaWQtY29scy00XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLTN4bCBwLTVcIj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5BdmVyYWdlIFJpc2s8L3A+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtNHhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntzdW1tYXJ5LmF2Z1Jpc2t9PC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC01XCI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+SGlnaCBSaXNrIE5vZGVzPC9wPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMyB0ZXh0LTR4bCBmb250LXNlbWlib2xkIHRleHQtcmVkLTQwMFwiPntzdW1tYXJ5LmhpZ2hSaXNrTm9kZXN9PC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC01XCI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+UmVsYXRpb25zaGlwczwvcD5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgdGV4dC00eGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+e3N1bW1hcnkudG90YWxSZWxhdGlvbnNoaXBzfTwvcD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNVwiPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPkhpZ2hlc3QgUmlzayBDb21wb25lbnQ8L3A+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtbGcgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+e3N1bW1hcnkuaGlnaGVzdFJpc2tOb2RlPy5uYW1lID8/ICduL2EnfTwvcD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdhcC04IHhsOmdyaWQtY29scy1bMC45ZnJfMS4xZnJdXCI+XG4gICAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC02XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHRleHQtd2hpdGVcIj5cbiAgICAgICAgICAgICAgPEFsZXJ0VHJpYW5nbGUgY2xhc3NOYW1lPVwiaC01IHctNSB0ZXh0LW9yYW5nZS0zMDBcIiAvPlxuICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC14bCBmb250LXNlbWlib2xkXCI+UmlzayBEaXN0cmlidXRpb248L2gyPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgc3BhY2UteS00XCI+XG4gICAgICAgICAgICAgIHtzdW1tYXJ5LnJpc2tEaXN0cmlidXRpb24ubWFwKChidWNrZXQpID0+IChcbiAgICAgICAgICAgICAgICA8ZGl2IGtleT17YnVja2V0LmtleX0+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTIgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHRleHQtc21cIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS0yMDBcIj57YnVja2V0LmxhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS00MDBcIj57YnVja2V0LmNvdW50fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTMgb3ZlcmZsb3ctaGlkZGVuIHJvdW5kZWQtZnVsbCBiZy1zbGF0ZS04MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImgtZnVsbCByb3VuZGVkLWZ1bGxcIlxuICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogYCR7KGJ1Y2tldC5jb3VudCAvIG1heFJpc2tCdWNrZXQpICogMTAwfSVgLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBnZXRSaXNrQ29sb3IoYnVja2V0LmtleSksXG4gICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LThcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyB0ZXh0LXdoaXRlXCI+XG4gICAgICAgICAgICAgICAgPEdpdEJyYW5jaCBjbGFzc05hbWU9XCJoLTUgdy01IHRleHQtYmx1ZS0zMDBcIiAvPlxuICAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGRcIj5Db21wb25lbnQgVHlwZXM8L2gzPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC00IHNwYWNlLXktNFwiPlxuICAgICAgICAgICAgICAgIHtzdW1tYXJ5LnR5cGVEaXN0cmlidXRpb24ubWFwKChlbnRyeSkgPT4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e2VudHJ5LnR5cGV9PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTIgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHRleHQtc21cIj5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTIwMFwiPntmb3JtYXRMYWJlbChlbnRyeS50eXBlKX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS00MDBcIj57ZW50cnkuY291bnR9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTMgb3ZlcmZsb3ctaGlkZGVuIHJvdW5kZWQtZnVsbCBiZy1zbGF0ZS04MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoLWZ1bGwgcm91bmRlZC1mdWxsXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBgJHsoZW50cnkuY291bnQgLyBtYXhUeXBlQ291bnQpICogMTAwfSVgLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IGdldFR5cGVDb2xvcihlbnRyeS50eXBlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLTN4bCBwLTZcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgdGV4dC13aGl0ZVwiPlxuICAgICAgICAgICAgICA8VGFyZ2V0IGNsYXNzTmFtZT1cImgtNSB3LTUgdGV4dC1yZWQtMzAwXCIgLz5cbiAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1zZW1pYm9sZFwiPlRvcCBSaXNrIENvbXBvbmVudHM8L2gyPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgc3BhY2UteS00XCI+XG4gICAgICAgICAgICAgIHtzdW1tYXJ5LnRvcFJpc2tOb2Rlcy5tYXAoKG5vZGUsIGluZGV4KSA9PiAoXG4gICAgICAgICAgICAgICAgPGRpdiBrZXk9e25vZGUuaWR9IGNsYXNzTmFtZT1cInJvdW5kZWQtM3hsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC83MCBwLTRcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtc2xhdGUtNTAwXCI+I3tpbmRleCArIDF9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cImZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntub2RlLm5hbWV9PC9oMz5cbiAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gbGVhZGluZy02IHRleHQtc2xhdGUtMzAwXCI+e25vZGUuZGVzY3JpcHRpb24gfHwgJ05vIGRlc2NyaXB0aW9uIGF2YWlsYWJsZS4nfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTMgZmxleCBmbGV4LXdyYXAgZ2FwLTIgdGV4dC14cyB0ZXh0LXNsYXRlLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4+VHlwZToge2Zvcm1hdExhYmVsKG5vZGUudHlwZSl9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4+RGVwZW5kZW5jaWVzOiB7bm9kZS5kZXBlbmRlbmNpZXMubGVuZ3RofTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPkJsYXN0IFJhZGl1czoge25vZGUuYmxhc3RSYWRpdXN9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIHB4LTMgcHktMiB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiXG4gICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgYmFja2dyb3VuZENvbG9yOiBnZXRSaXNrQ29sb3Iobm9kZS5yaXNrTGV2ZWwpIH19XG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICB7bm9kZS5yaXNrU2NvcmV9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTQgaC0yIG92ZXJmbG93LWhpZGRlbiByb3VuZGVkLWZ1bGwgYmctc2xhdGUtODAwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoLWZ1bGwgcm91bmRlZC1mdWxsXCJcbiAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGAke25vZGUucmlza1Njb3JlfSVgLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBnZXRSaXNrQ29sb3Iobm9kZS5yaXNrTGV2ZWwpLFxuICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L3NlY3Rpb24+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNlwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgdGV4dC13aGl0ZVwiPlxuICAgICAgICAgICAgPEFsZXJ0VHJpYW5nbGUgY2xhc3NOYW1lPVwiaC01IHctNSB0ZXh0LXB1cnBsZS0zMDBcIiAvPlxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1zZW1pYm9sZFwiPkJsYXN0IFJhZGl1cyBMZWFkZXJzPC9oMj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgZ3JpZCBnYXAtNCBtZDpncmlkLWNvbHMtMiB4bDpncmlkLWNvbHMtM1wiPlxuICAgICAgICAgICAge3N1bW1hcnkuYmxhc3RSYWRpdXNMZWFkZXJzLm1hcCgoeyBub2RlLCBjb3VudCB9KSA9PiAoXG4gICAgICAgICAgICAgIDxkaXYga2V5PXtub2RlLmlkfSBjbGFzc05hbWU9XCJyb3VuZGVkLTN4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNzAgcC00XCI+XG4gICAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cImZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntub2RlLm5hbWV9PC9oMz5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0xIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj57Zm9ybWF0TGFiZWwobm9kZS50eXBlKX08L3A+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC00IGZsZXggaXRlbXMtZW5kIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlBvdGVudGlhbGx5IGltcGFjdGVkIGNvbXBvbmVudHM8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LXNlbWlib2xkIHRleHQtb3JhbmdlLTMwMFwiPntjb3VudH08L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKSl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuIiwgImltcG9ydCB7IGxhenksIFN1c3BlbnNlLCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IEJhckNoYXJ0MywgRmlsZUpzb24sIEZpbGVUZXh0LCBMaXN0LCBMb2FkZXIyLCBOZXR3b3JrIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7IHVzZU5hdmlnYXRlIH0gZnJvbSAncmVhY3Qtcm91dGVyLWRvbSc7XG5pbXBvcnQgRG9jdW1lbnROb2Rlc0VkZ2VzVmlldyBmcm9tICcuLi9jb21wb25lbnRzL0RvY3VtZW50Tm9kZXNFZGdlc1ZpZXcnO1xuaW1wb3J0IERvY3VtZW50T3ZlcnZpZXcgZnJvbSAnLi4vY29tcG9uZW50cy9Eb2N1bWVudE92ZXJ2aWV3JztcbmltcG9ydCBFbXB0eVN0YXRlIGZyb20gJy4uL2NvbXBvbmVudHMvRW1wdHlTdGF0ZSc7XG5pbXBvcnQgU3RhdHVzQmFubmVyIGZyb20gJy4uL2NvbXBvbmVudHMvU3RhdHVzQmFubmVyJztcbmltcG9ydCBCdXR0b24gZnJvbSAnLi4vY29tcG9uZW50cy91aS9CdXR0b24nO1xuaW1wb3J0IEJhZGdlIGZyb20gJy4uL2NvbXBvbmVudHMvdWkvQmFkZ2UnO1xuaW1wb3J0IHsgZm9ybWF0TGFiZWwgfSBmcm9tICcuLi9saWIvc2VsZWN0b3JzJztcbmltcG9ydCB7IHVzZUFwcENvbnRleHQgfSBmcm9tICcuLi9zdGF0ZS9BcHBDb250ZXh0JztcblxuY29uc3QgRG9jdW1lbnRHcmFwaFZpZXcgPSBsYXp5KCgpID0+IGltcG9ydCgnLi4vY29tcG9uZW50cy9Eb2N1bWVudEdyYXBoVmlldycpKTtcblxudHlwZSBEb2N1bWVudFZpZXdUeXBlID0gJ2dyYXBoJyB8ICdub2RlcycgfCAnb3ZlcnZpZXcnO1xuXG5jb25zdCBuYXZJdGVtczogQXJyYXk8eyBpZDogRG9jdW1lbnRWaWV3VHlwZTsgbGFiZWw6IHN0cmluZzsgaWNvbjogdHlwZW9mIE5ldHdvcmsgfT4gPSBbXG4gIHsgaWQ6ICdncmFwaCcsIGxhYmVsOiAnR3JhcGggVmlldycsIGljb246IE5ldHdvcmsgfSxcbiAgeyBpZDogJ25vZGVzJywgbGFiZWw6ICdOb2RlcyAmIEVkZ2VzJywgaWNvbjogTGlzdCB9LFxuICB7IGlkOiAnb3ZlcnZpZXcnLCBsYWJlbDogJ0RvY3VtZW50IE92ZXJ2aWV3JywgaWNvbjogQmFyQ2hhcnQzIH0sXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBVcGxvYWRlZERvY3VtZW50V29ya3NwYWNlKCkge1xuICBjb25zdCBuYXZpZ2F0ZSA9IHVzZU5hdmlnYXRlKCk7XG4gIGNvbnN0IHsgdXBsb2FkZWRHcmFwaCB9ID0gdXNlQXBwQ29udGV4dCgpO1xuICBjb25zdCBbY3VycmVudFZpZXcsIHNldEN1cnJlbnRWaWV3XSA9IHVzZVN0YXRlPERvY3VtZW50Vmlld1R5cGU+KCdncmFwaCcpO1xuICBjb25zdCBbc2VsZWN0ZWROb2RlSWQsIHNldFNlbGVjdGVkTm9kZUlkXSA9IHVzZVN0YXRlPHN0cmluZyB8IG51bGw+KG51bGwpO1xuICBjb25zdCBncmFwaERhdGEgPSB1cGxvYWRlZEdyYXBoLmRvY3VtZW50RGF0YTtcblxuICBpZiAodXBsb2FkZWRHcmFwaC5zdGF0dXMgPT09ICdsb2FkaW5nJyAmJiAhZ3JhcGhEYXRhKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBtaW4taC1zY3JlZW4gaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGJnLVsjMEYxNzJBXVwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHRleHQtc2xhdGUtMjAwXCI+XG4gICAgICAgICAgPExvYWRlcjIgY2xhc3NOYW1lPVwiaC01IHctNSBhbmltYXRlLXNwaW5cIiAvPlxuICAgICAgICAgIDxzcGFuPkxvYWRpbmcgdXBsb2FkZWQgZG9jdW1lbnQgZ3JhcGguLi48L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxuXG4gIGlmICh1cGxvYWRlZEdyYXBoLnN0YXR1cyA9PT0gJ2Vycm9yJyAmJiAhZ3JhcGhEYXRhKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLVsjMEYxNzJBXSBweC02IHB5LTE2XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXgtYXV0byBtYXgtdy00eGxcIj5cbiAgICAgICAgICA8RW1wdHlTdGF0ZVxuICAgICAgICAgICAgdGl0bGU9XCJVcGxvYWRlZCBEb2N1bWVudCBHcmFwaCBMb2FkaW5nIEZhaWxlZFwiXG4gICAgICAgICAgICBtZXNzYWdlPXt1cGxvYWRlZEdyYXBoLmVycm9yIHx8ICdUaGUgZnJvbnRlbmQgY291bGQgbm90IGxvYWQgdGhlIHNlbGVjdGVkIGRvY3VtZW50IGdyYXBoIEpTT04uJ31cbiAgICAgICAgICAgIGFjdGlvbj17PEJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnL2dyYXBocycpfT5SZXR1cm4gdG8gR3JhcGggVXBsb2FkPC9CdXR0b24+fVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxuXG4gIGlmICghZ3JhcGhEYXRhKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLVsjMEYxNzJBXSBweC02IHB5LTE2XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXgtYXV0byBtYXgtdy00eGxcIj5cbiAgICAgICAgICA8RW1wdHlTdGF0ZVxuICAgICAgICAgICAgdGl0bGU9XCJObyBVcGxvYWRlZCBEb2N1bWVudCBHcmFwaCBMb2FkZWRcIlxuICAgICAgICAgICAgbWVzc2FnZT1cIlVwbG9hZCBhIGRvY3VtZW50IGdyYXBoIGFydGlmYWN0IEpTT04gdG8gaW5zcGVjdCBhIGxvY2FsIGRvY3VtZW50IHdvcmtzcGFjZS5cIlxuICAgICAgICAgICAgYWN0aW9uPXs8QnV0dG9uIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvZ3JhcGhzJyl9PlVwbG9hZCBHcmFwaCBKU09OPC9CdXR0b24+fVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxuXG4gIGlmIChncmFwaERhdGEubm9kZXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLVsjMEYxNzJBXSBweC02IHB5LTE2XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXgtYXV0byBtYXgtdy00eGxcIj5cbiAgICAgICAgICA8RW1wdHlTdGF0ZVxuICAgICAgICAgICAgdGl0bGU9XCJUaGUgVXBsb2FkZWQgRG9jdW1lbnQgR3JhcGggSXMgRW1wdHlcIlxuICAgICAgICAgICAgbWVzc2FnZT1cIlRoZSBzZWxlY3RlZCBkb2N1bWVudCBncmFwaCBhcnRpZmFjdCBsb2FkZWQgc3VjY2Vzc2Z1bGx5LCBidXQgaXQgY29udGFpbnMgbm8gbm9kZXMuXCJcbiAgICAgICAgICAgIGFjdGlvbj17PEJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnL2dyYXBocycpfT5VcGxvYWQgQW5vdGhlciBHcmFwaDwvQnV0dG9uPn1cbiAgICAgICAgICAvPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICk7XG4gIH1cblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBoLXNjcmVlbiBvdmVyZmxvdy1oaWRkZW4gYmctWyMwRjE3MkFdXCI+XG4gICAgICA8YXNpZGUgY2xhc3NOYW1lPVwiaGlkZGVuIGgtZnVsbCB3LTcyIHNocmluay0wIGJvcmRlci1yIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzk1IHhsOmZsZXggeGw6ZmxleC1jb2xcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHB4LTYgcHktN1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTNcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYmctYmx1ZS01MDAvMTUgcC0zIHRleHQtYmx1ZS0zMDBcIj5cbiAgICAgICAgICAgICAgPEZpbGVUZXh0IGNsYXNzTmFtZT1cImgtNyB3LTdcIiAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICA8aDEgY2xhc3NOYW1lPVwidGV4dC14bCBmb250LWJvbGQgdGV4dC13aGl0ZVwiPlR3aW5HcmFwaE9wczwvaDE+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5VcGxvYWRlZCBkb2N1bWVudCBncmFwaCB3b3Jrc3BhY2U8L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiBncmlkIGdyaWQtY29scy0yIGdhcC0zXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTkwMC83MCBwLTNcIj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS01MDBcIj5Ob2RlczwvcD5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LTJ4bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57Z3JhcGhEYXRhLm5vZGVzLmxlbmd0aH08L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTAwLzcwIHAtM1wiPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPkVkZ2VzPC9wPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntncmFwaERhdGEubGlua3MubGVuZ3RofTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC00XCI+XG4gICAgICAgICAgICA8QmFkZ2UgY2xhc3NOYW1lPVwiYm9yZGVyLWJsdWUtNTAwLzMwIGJnLWJsdWUtNTAwLzEwIHRleHQtYmx1ZS0xMDBcIj5cbiAgICAgICAgICAgICAgQWN0aXZlIEdyYXBoOiB7dXBsb2FkZWRHcmFwaC5maWxlbmFtZSB8fCBmb3JtYXRMYWJlbChncmFwaERhdGEuc291cmNlKX1cbiAgICAgICAgICAgIDwvQmFkZ2U+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTQgZ3JpZCBncmlkLWNvbHMtMyBnYXAtMlwiPlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnL3Jpc2snKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcHgtMyBweS0yIHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LXNsYXRlLTMwMCB0cmFuc2l0aW9uIGhvdmVyOmJvcmRlci1zbGF0ZS01MDAgaG92ZXI6dGV4dC13aGl0ZVwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIFJpc2tcbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnL2RvY3VtZW50cycpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBweC0zIHB5LTIgdGV4dC14cyBmb250LXNlbWlib2xkIHRleHQtc2xhdGUtMzAwIHRyYW5zaXRpb24gaG92ZXI6Ym9yZGVyLXNsYXRlLTUwMCBob3Zlcjp0ZXh0LXdoaXRlXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgRG9jdW1lbnRzXG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYmctYmx1ZS02MDAgcHgtMyBweS0yIHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+R3JhcGhzPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxuYXYgY2xhc3NOYW1lPVwiZmxleC0xIHNwYWNlLXktMiBwLTRcIj5cbiAgICAgICAgICB7bmF2SXRlbXMubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBJY29uID0gaXRlbS5pY29uO1xuICAgICAgICAgICAgY29uc3QgaXNBY3RpdmUgPSBjdXJyZW50VmlldyA9PT0gaXRlbS5pZDtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBrZXk9e2l0ZW0uaWR9XG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0Q3VycmVudFZpZXcoaXRlbS5pZCl9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgZmxleCB3LWZ1bGwgaXRlbXMtY2VudGVyIGdhcC0zIHJvdW5kZWQtMnhsIHB4LTQgcHktMyB0ZXh0LWxlZnQgdGV4dC1zbSBmb250LW1lZGl1bSB0cmFuc2l0aW9uICR7XG4gICAgICAgICAgICAgICAgICBpc0FjdGl2ZSA/ICdiZy1ibHVlLTYwMCB0ZXh0LXdoaXRlIHNoYWRvdy1sZyBzaGFkb3ctYmx1ZS05NTAvNDAnIDogJ3RleHQtc2xhdGUtNDAwIGhvdmVyOmJnLXNsYXRlLTkwMCBob3Zlcjp0ZXh0LXdoaXRlJ1xuICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPEljb24gY2xhc3NOYW1lPVwiaC01IHctNVwiIC8+XG4gICAgICAgICAgICAgICAgPHNwYW4+e2l0ZW0ubGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSl9XG4gICAgICAgIDwvbmF2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYm9yZGVyLXQgYm9yZGVyLXNsYXRlLTgwMCBwLTRcIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnL2dyYXBocycpfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCB3LWZ1bGwgaXRlbXMtY2VudGVyIGdhcC0zIHJvdW5kZWQtMnhsIHB4LTQgcHktMyB0ZXh0LWxlZnQgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LXNsYXRlLTQwMCB0cmFuc2l0aW9uIGhvdmVyOmJnLXNsYXRlLTkwMCBob3Zlcjp0ZXh0LXdoaXRlXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8RmlsZUpzb24gY2xhc3NOYW1lPVwiaC01IHctNVwiIC8+XG4gICAgICAgICAgICA8c3Bhbj5VcGxvYWQgTmV3IEdyYXBoPC9zcGFuPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvYXNpZGU+XG5cbiAgICAgIDxtYWluIGNsYXNzTmFtZT1cImZsZXggbWluLXctMCBmbGV4LTEgZmxleC1jb2wgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgIDxoZWFkZXIgY2xhc3NOYW1lPVwiYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNjAgcHgtNiBweS00XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC00XCI+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICA8aDEgY2xhc3NOYW1lPVwidGV4dC0yeGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+VXBsb2FkZWQgRG9jdW1lbnQgR3JhcGggV29ya3NwYWNlPC9oMT5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgICAge2dyYXBoRGF0YS5ub2Rlcy5sZW5ndGh9IG5vZGVzLCB7Z3JhcGhEYXRhLmxpbmtzLmxlbmd0aH0gcmVsYXRpb25zaGlwcywge2dyYXBoRGF0YS5raW5kVHlwZXMubGVuZ3RofSBub2RlIGtpbmRzXG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgIHt1cGxvYWRlZEdyYXBoLmVycm9yID8gPFN0YXR1c0Jhbm5lciB0b25lPVwiZXJyb3JcIiBtZXNzYWdlPXt1cGxvYWRlZEdyYXBoLmVycm9yfSAvPiA6IG51bGx9XG4gICAgICAgICAgICAgIDxCYWRnZSBjbGFzc05hbWU9XCJib3JkZXItc2xhdGUtNzAwIGJnLXNsYXRlLTkwMC84MCB0ZXh0LXNsYXRlLTIwMFwiPkF1dG8tZGV0ZWN0ZWQgZG9jdW1lbnQgYXJ0aWZhY3Q8L0JhZGdlPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvaGVhZGVyPlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtMCBmbGV4LTEgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgICAge2N1cnJlbnRWaWV3ID09PSAnZ3JhcGgnICYmIChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIHAtNlwiPlxuICAgICAgICAgICAgICA8U3VzcGVuc2VcbiAgICAgICAgICAgICAgICBmYWxsYmFjaz17XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaC1mdWxsIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLVsyNHB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBiZy1bI2Q5ZDlkOV1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyB0ZXh0LXNsYXRlLTcwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxMb2FkZXIyIGNsYXNzTmFtZT1cImgtNSB3LTUgYW5pbWF0ZS1zcGluXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj5Mb2FkaW5nIGdyYXBoIHZpZXcuLi48L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPERvY3VtZW50R3JhcGhWaWV3IGdyYXBoRGF0YT17Z3JhcGhEYXRhfSBzZWxlY3RlZE5vZGVJZD17c2VsZWN0ZWROb2RlSWR9IG9uTm9kZVNlbGVjdD17c2V0U2VsZWN0ZWROb2RlSWR9IC8+XG4gICAgICAgICAgICAgIDwvU3VzcGVuc2U+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApfVxuICAgICAgICAgIHtjdXJyZW50VmlldyA9PT0gJ25vZGVzJyAmJiAoXG4gICAgICAgICAgICA8RG9jdW1lbnROb2Rlc0VkZ2VzVmlld1xuICAgICAgICAgICAgICBncmFwaERhdGE9e2dyYXBoRGF0YX1cbiAgICAgICAgICAgICAgb25Ob2RlU2VsZWN0PXsobm9kZUlkKSA9PiB7XG4gICAgICAgICAgICAgICAgc2V0Q3VycmVudFZpZXcoJ2dyYXBoJyk7XG4gICAgICAgICAgICAgICAgc2V0U2VsZWN0ZWROb2RlSWQobm9kZUlkKTtcbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgKX1cbiAgICAgICAgICB7Y3VycmVudFZpZXcgPT09ICdvdmVydmlldycgJiYgPERvY3VtZW50T3ZlcnZpZXcgZ3JhcGhEYXRhPXtncmFwaERhdGF9IC8+fVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvbWFpbj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiIsICJpbXBvcnQgeyB1c2VDYWxsYmFjaywgdXNlRWZmZWN0LCB1c2VNZW1vLCB1c2VSZWYsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IEZvcmNlR3JhcGgyRCBmcm9tICdyZWFjdC1mb3JjZS1ncmFwaC0yZCc7XG5pbXBvcnQgeyBBbGVydFRyaWFuZ2xlLCBJbmZvLCBMaW5rMiwgTWF4aW1pemUyLCBOZXR3b3JrLCBSZWZyZXNoQ2N3IH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB0eXBlIHsgR3JhcGhEYXRhLCBMb2FkU3RhdHVzLCBOb2RlRGV0YWlscyB9IGZyb20gJy4uL3R5cGVzL2FwcCc7XG5pbXBvcnQgQmFkZ2UgZnJvbSAnLi91aS9CYWRnZSc7XG5pbXBvcnQgQnV0dG9uIGZyb20gJy4vdWkvQnV0dG9uJztcbmltcG9ydCB7IGZvcm1hdExhYmVsLCBnZXRMaW5rRW5kcG9pbnRJZCwgZ2V0Umlza0NvbG9yIH0gZnJvbSAnLi4vbGliL3NlbGVjdG9ycyc7XG5cbmludGVyZmFjZSBHcmFwaFZpZXdQcm9wcyB7XG4gIGdyYXBoRGF0YTogR3JhcGhEYXRhO1xuICBzZWxlY3RlZE5vZGVJZDogc3RyaW5nIHwgbnVsbDtcbiAgc2VsZWN0ZWROb2RlRGV0YWlsczogTm9kZURldGFpbHMgfCBudWxsO1xuICBkZXRhaWxzU3RhdHVzOiBMb2FkU3RhdHVzO1xuICBkZXRhaWxzRXJyb3I6IHN0cmluZyB8IG51bGw7XG4gIG9uTm9kZVNlbGVjdDogKG5vZGVJZDogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZDtcbiAgb25SZXRyeURldGFpbHM6ICgpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEdyYXBoVmlldyh7XG4gIGdyYXBoRGF0YSxcbiAgc2VsZWN0ZWROb2RlSWQsXG4gIHNlbGVjdGVkTm9kZURldGFpbHMsXG4gIGRldGFpbHNTdGF0dXMsXG4gIGRldGFpbHNFcnJvcixcbiAgb25Ob2RlU2VsZWN0LFxuICBvblJldHJ5RGV0YWlscyxcbn06IEdyYXBoVmlld1Byb3BzKSB7XG4gIGNvbnN0IGdyYXBoUmVmID0gdXNlUmVmPGFueT4obnVsbCk7XG4gIGNvbnN0IGNvbnRhaW5lclJlZiA9IHVzZVJlZjxIVE1MRGl2RWxlbWVudCB8IG51bGw+KG51bGwpO1xuICBjb25zdCBbZGltZW5zaW9ucywgc2V0RGltZW5zaW9uc10gPSB1c2VTdGF0ZSh7IHdpZHRoOiAxMDAwLCBoZWlnaHQ6IDU2MCB9KTtcblxuICBjb25zdCBmaXRHcmFwaFRvVmlld3BvcnQgPSB1c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgaWYgKCFncmFwaFJlZi5jdXJyZW50IHx8IGRpbWVuc2lvbnMud2lkdGggPD0gMCB8fCBkaW1lbnNpb25zLmhlaWdodCA8PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGFkZGluZyA9IE1hdGgubWF4KDgwLCBNYXRoLm1pbihkaW1lbnNpb25zLndpZHRoLCBkaW1lbnNpb25zLmhlaWdodCkgKiAwLjEyKTtcbiAgICBncmFwaFJlZi5jdXJyZW50Lnpvb21Ub0ZpdCg2MDAsIHBhZGRpbmcpO1xuICB9LCBbZGltZW5zaW9ucy5oZWlnaHQsIGRpbWVuc2lvbnMud2lkdGhdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHVwZGF0ZURpbWVuc2lvbnMgPSAoKSA9PiB7XG4gICAgICBpZiAoIWNvbnRhaW5lclJlZi5jdXJyZW50KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgc2V0RGltZW5zaW9ucyh7XG4gICAgICAgIHdpZHRoOiBjb250YWluZXJSZWYuY3VycmVudC5jbGllbnRXaWR0aCxcbiAgICAgICAgaGVpZ2h0OiBNYXRoLm1heCgzNjAsIGNvbnRhaW5lclJlZi5jdXJyZW50LmNsaWVudEhlaWdodCksXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgdXBkYXRlRGltZW5zaW9ucygpO1xuICAgIGNvbnN0IHJlc2l6ZU9ic2VydmVyID0gbmV3IFJlc2l6ZU9ic2VydmVyKCgpID0+IHtcbiAgICAgIHVwZGF0ZURpbWVuc2lvbnMoKTtcbiAgICB9KTtcblxuICAgIGlmIChjb250YWluZXJSZWYuY3VycmVudCkge1xuICAgICAgcmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZShjb250YWluZXJSZWYuY3VycmVudCk7XG4gICAgfVxuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHVwZGF0ZURpbWVuc2lvbnMpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICByZXNpemVPYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdXBkYXRlRGltZW5zaW9ucyk7XG4gICAgfTtcbiAgfSwgW10pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFncmFwaFJlZi5jdXJyZW50IHx8IGdyYXBoRGF0YS5ub2Rlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBncmFwaFJlZi5jdXJyZW50LmQzRm9yY2UoJ2NoYXJnZScpPy5zdHJlbmd0aCgtNTIwKTtcbiAgICBncmFwaFJlZi5jdXJyZW50LmQzRm9yY2UoJ2xpbmsnKT8uZGlzdGFuY2UoKCkgPT4gMTYwKTtcbiAgICBncmFwaFJlZi5jdXJyZW50LmQzRm9yY2UoJ2NlbnRlcicpPy5zdHJlbmd0aCgwLjA4KTtcblxuICAgIGNvbnN0IHRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBmaXRHcmFwaFRvVmlld3BvcnQoKTtcbiAgICB9LCA3MDApO1xuXG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5jbGVhclRpbWVvdXQodGltZW91dCk7XG4gIH0sIFtmaXRHcmFwaFRvVmlld3BvcnQsIGdyYXBoRGF0YS5saW5rcy5sZW5ndGgsIGdyYXBoRGF0YS5ub2Rlcy5sZW5ndGhdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghZ3JhcGhSZWYuY3VycmVudCB8fCBncmFwaERhdGEubm9kZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGZpdEdyYXBoVG9WaWV3cG9ydCgpO1xuICAgIH0sIDEyMCk7XG5cbiAgICByZXR1cm4gKCkgPT4gd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgfSwgW2RpbWVuc2lvbnMuaGVpZ2h0LCBkaW1lbnNpb25zLndpZHRoLCBmaXRHcmFwaFRvVmlld3BvcnQsIGdyYXBoRGF0YS5ub2Rlcy5sZW5ndGhdKTtcblxuICBjb25zdCBoaWdobGlnaHRlZExpbmtzID0gdXNlTWVtbygoKSA9PiB7XG4gICAgaWYgKCFzZWxlY3RlZE5vZGVJZCkge1xuICAgICAgcmV0dXJuIG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgU2V0KFxuICAgICAgZ3JhcGhEYXRhLmxpbmtzXG4gICAgICAgIC5maWx0ZXIoKGxpbmspID0+IGdldExpbmtFbmRwb2ludElkKGxpbmsuc291cmNlKSA9PT0gc2VsZWN0ZWROb2RlSWQgfHwgZ2V0TGlua0VuZHBvaW50SWQobGluay50YXJnZXQpID09PSBzZWxlY3RlZE5vZGVJZClcbiAgICAgICAgLm1hcCgobGluaykgPT4gbGluay5pZClcbiAgICApO1xuICB9LCBbZ3JhcGhEYXRhLmxpbmtzLCBzZWxlY3RlZE5vZGVJZF0pO1xuXG4gIGNvbnN0IGNvbm5lY3RlZE5vZGVzID0gdXNlTWVtbygoKSA9PiB7XG4gICAgaWYgKCFzZWxlY3RlZE5vZGVJZCkge1xuICAgICAgcmV0dXJuIG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbm5lY3RlZCA9IG5ldyBTZXQ8c3RyaW5nPihbc2VsZWN0ZWROb2RlSWRdKTtcbiAgICBmb3IgKGNvbnN0IGxpbmsgb2YgZ3JhcGhEYXRhLmxpbmtzKSB7XG4gICAgICBpZiAoZ2V0TGlua0VuZHBvaW50SWQobGluay5zb3VyY2UpID09PSBzZWxlY3RlZE5vZGVJZCkge1xuICAgICAgICBjb25uZWN0ZWQuYWRkKGdldExpbmtFbmRwb2ludElkKGxpbmsudGFyZ2V0KSk7XG4gICAgICB9XG4gICAgICBpZiAoZ2V0TGlua0VuZHBvaW50SWQobGluay50YXJnZXQpID09PSBzZWxlY3RlZE5vZGVJZCkge1xuICAgICAgICBjb25uZWN0ZWQuYWRkKGdldExpbmtFbmRwb2ludElkKGxpbmsuc291cmNlKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb25uZWN0ZWQ7XG4gIH0sIFtncmFwaERhdGEubGlua3MsIHNlbGVjdGVkTm9kZUlkXSk7XG5cbiAgY29uc3QgZm9yY2VHcmFwaERhdGEgPSB1c2VNZW1vKFxuICAgICgpID0+ICh7XG4gICAgICBub2RlczogZ3JhcGhEYXRhLm5vZGVzLm1hcCgobm9kZSkgPT4gKHsgLi4ubm9kZSB9KSksXG4gICAgICBsaW5rczogZ3JhcGhEYXRhLmxpbmtzLm1hcCgobGluaykgPT4gKHtcbiAgICAgICAgLi4ubGluayxcbiAgICAgICAgc291cmNlOiBnZXRMaW5rRW5kcG9pbnRJZChsaW5rLnNvdXJjZSksXG4gICAgICAgIHRhcmdldDogZ2V0TGlua0VuZHBvaW50SWQobGluay50YXJnZXQpLFxuICAgICAgfSkpLFxuICAgIH0pLFxuICAgIFtncmFwaERhdGEubGlua3MsIGdyYXBoRGF0YS5ub2Rlc11cbiAgKTtcblxuICBjb25zdCBmYWxsYmFja05vZGUgPSBzZWxlY3RlZE5vZGVJZCA/IGdyYXBoRGF0YS5ub2RlSW5kZXhbc2VsZWN0ZWROb2RlSWRdID8/IG51bGwgOiBudWxsO1xuICBjb25zdCBkZXRhaWxUaXRsZSA9IHNlbGVjdGVkTm9kZURldGFpbHM/Lm5hbWUgfHwgZmFsbGJhY2tOb2RlPy5uYW1lIHx8ICdTZWxlY3QgYSBub2RlJztcbiAgY29uc3QgZGV0YWlsVHlwZSA9IHNlbGVjdGVkTm9kZURldGFpbHM/LnR5cGUgfHwgZmFsbGJhY2tOb2RlPy50eXBlIHx8IG51bGw7XG4gIGNvbnN0IGRldGFpbFJpc2tTY29yZSA9IHNlbGVjdGVkTm9kZURldGFpbHM/LnJpc2tTY29yZSA/PyBmYWxsYmFja05vZGU/LnJpc2tTY29yZSA/PyBudWxsO1xuICBjb25zdCBkZXRhaWxSaXNrTGV2ZWwgPSBzZWxlY3RlZE5vZGVEZXRhaWxzPy5yaXNrTGV2ZWwgfHwgZmFsbGJhY2tOb2RlPy5yaXNrTGV2ZWwgfHwgbnVsbDtcbiAgY29uc3QgZGV0YWlsRGVzY3JpcHRpb24gPVxuICAgIHNlbGVjdGVkTm9kZURldGFpbHM/LmRlc2NyaXB0aW9uIHx8XG4gICAgZmFsbGJhY2tOb2RlPy5kZXNjcmlwdGlvbiB8fFxuICAgICdTZWxlY3QgYSBub2RlIHRvIGluc3BlY3QgaXRzIG9wZXJhdGlvbmFsIGNvbnRleHQuJztcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBoLWZ1bGwgbWluLWgtMCBnYXAtNiB4bDpncmlkLWNvbHMtW21pbm1heCgwLDFmcilfMzYwcHhdXCI+XG4gICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCBmbGV4IG1pbi1oLTAgbWluLXctMCBmbGV4LWNvbCByb3VuZGVkLVsyOHB4XSBwLTVcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC00IGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAvOTAgcGItNFwiPlxuICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtc20gdXBwZXJjYXNlIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtYmx1ZS0zMDBcIj5cbiAgICAgICAgICAgICAgPE5ldHdvcmsgY2xhc3NOYW1lPVwiaC00IHctNFwiIC8+XG4gICAgICAgICAgICAgIEdyYXBoIFZpZXdcbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cIm10LTIgdGV4dC0yeGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+VG9wb2xvZ3kgKyBSaXNrIE92ZXJsYXk8L2gyPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgIE5vZGUgc2l6ZSB0cmFja3MgYmFja2VuZCByaXNrIHNjb3JlLiBOb2RlIGNvbG9yIHRyYWNrcyBiYWNrZW5kIHJpc2sgbGV2ZWwgYW5kIGxpbmtzIHJlbmRlciBhcyBkaXJlY3RlZCByZWxhdGlvbnNoaXBzLlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgIDxCYWRnZT5Ob2RlcyB7Z3JhcGhEYXRhLm5vZGVzLmxlbmd0aH08L0JhZGdlPlxuICAgICAgICAgICAgPEJhZGdlPkVkZ2VzIHtncmFwaERhdGEubGlua3MubGVuZ3RofTwvQmFkZ2U+XG4gICAgICAgICAgICA8QnV0dG9uIHZhcmlhbnQ9XCJzZWNvbmRhcnlcIiBvbkNsaWNrPXtmaXRHcmFwaFRvVmlld3BvcnR9PlxuICAgICAgICAgICAgICA8TWF4aW1pemUyIGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPlxuICAgICAgICAgICAgICBGaXQgVmlld1xuICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNSBmbGV4IGZsZXgtd3JhcCBnYXAtM1wiPlxuICAgICAgICAgIHtPYmplY3QuZW50cmllcyh7XG4gICAgICAgICAgICBsb3c6IGdldFJpc2tDb2xvcignbG93JyksXG4gICAgICAgICAgICBtZWRpdW06IGdldFJpc2tDb2xvcignbWVkaXVtJyksXG4gICAgICAgICAgICBoaWdoOiBnZXRSaXNrQ29sb3IoJ2hpZ2gnKSxcbiAgICAgICAgICB9KS5tYXAoKFtsYWJlbCwgY29sb3JdKSA9PiAoXG4gICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgIGtleT17bGFiZWx9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNjAgcHgtMyBweS0xLjUgdGV4dC14cyB0ZXh0LXNsYXRlLTMwMFwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImgtMi41IHctMi41IHJvdW5kZWQtZnVsbFwiIHN0eWxlPXt7IGJhY2tncm91bmRDb2xvcjogY29sb3IgfX0gLz5cbiAgICAgICAgICAgICAgPHNwYW4+e2Zvcm1hdExhYmVsKGxhYmVsKX0gUmlzazwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2XG4gICAgICAgICAgcmVmPXtjb250YWluZXJSZWZ9XG4gICAgICAgICAgY2xhc3NOYW1lPVwicmVsYXRpdmUgbXQtNSBtaW4taC1bMzYwcHhdIGZsZXgtMSBvdmVyZmxvdy1oaWRkZW4gcm91bmRlZC1bMjRweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgYmctWyNkOWQ5ZDldXCJcbiAgICAgICAgPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgcmlnaHQtNCB0b3AtNCB6LTEwIHJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXNsYXRlLTQwMCBiZy13aGl0ZS85MCBweC00IHB5LTIgdGV4dC14cyB0ZXh0LXNsYXRlLTcwMFwiPlxuICAgICAgICAgICAgRHJhZyB0byBwYW4sIHNjcm9sbCB0byB6b29tLCBjbGljayBhIG5vZGUgZm9yIGRldGFpbHNcbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxGb3JjZUdyYXBoMkRcbiAgICAgICAgICAgIHJlZj17Z3JhcGhSZWZ9XG4gICAgICAgICAgICBncmFwaERhdGE9e2ZvcmNlR3JhcGhEYXRhfVxuICAgICAgICAgICAgd2lkdGg9e2RpbWVuc2lvbnMud2lkdGh9XG4gICAgICAgICAgICBoZWlnaHQ9e2RpbWVuc2lvbnMuaGVpZ2h0fVxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICBjb29sZG93blRpY2tzPXsxNjB9XG4gICAgICAgICAgICBkM1ZlbG9jaXR5RGVjYXk9ezAuMTh9XG4gICAgICAgICAgICBsaW5rQ3VydmF0dXJlPXswLjA4fVxuICAgICAgICAgICAgbGlua1dpZHRoPXsobGluazogYW55KSA9PiAoaGlnaGxpZ2h0ZWRMaW5rcy5oYXMobGluay5pZCkgPyAyLjIgOiAwLjkpfVxuICAgICAgICAgICAgbGlua0NvbG9yPXsobGluazogYW55KSA9PiAoaGlnaGxpZ2h0ZWRMaW5rcy5oYXMobGluay5pZCkgPyAnIzI1NjNlYicgOiAncmdiYSgxNSwgMjMsIDQyLCAwLjU1KScpfVxuICAgICAgICAgICAgbGlua0RpcmVjdGlvbmFsQXJyb3dMZW5ndGg9eyhsaW5rOiBhbnkpID0+IChoaWdobGlnaHRlZExpbmtzLmhhcyhsaW5rLmlkKSA/IDcgOiA1KX1cbiAgICAgICAgICAgIGxpbmtEaXJlY3Rpb25hbEFycm93UmVsUG9zPXsxfVxuICAgICAgICAgICAgbGlua0RpcmVjdGlvbmFsQXJyb3dDb2xvcj17KGxpbms6IGFueSkgPT4gKGhpZ2hsaWdodGVkTGlua3MuaGFzKGxpbmsuaWQpID8gJyMyNTYzZWInIDogJ3JnYmEoMTUsIDIzLCA0MiwgMC43NSknKX1cbiAgICAgICAgICAgIG5vZGVSZWxTaXplPXsxfVxuICAgICAgICAgICAgbm9kZUxhYmVsPXsobm9kZTogYW55KSA9PiBgJHtub2RlLm5hbWV9ICgke25vZGUucmlza1Njb3JlfSlgfVxuICAgICAgICAgICAgbm9kZUNhbnZhc09iamVjdE1vZGU9eygpID0+ICdyZXBsYWNlJ31cbiAgICAgICAgICAgIG9uTm9kZUNsaWNrPXsobm9kZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgIG9uTm9kZVNlbGVjdChub2RlLmlkKTtcbiAgICAgICAgICAgICAgZ3JhcGhSZWYuY3VycmVudD8uY2VudGVyQXQobm9kZS54LCBub2RlLnksIDUwMCk7XG4gICAgICAgICAgICAgIGdyYXBoUmVmLmN1cnJlbnQ/Lnpvb20oMiwgNTAwKTtcbiAgICAgICAgICAgIH19XG4gICAgICAgICAgICBub2RlUG9pbnRlckFyZWFQYWludD17KG5vZGU6IGFueSwgY29sb3IsIGNvbnRleHQpID0+IHtcbiAgICAgICAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgICAgICAgY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgY29udGV4dC5hcmMobm9kZS54LCBub2RlLnksIE1hdGgubWF4KG5vZGUudmFsICsgOCwgMjIpLCAwLCAyICogTWF0aC5QSSk7XG4gICAgICAgICAgICAgIGNvbnRleHQuZmlsbCgpO1xuICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIG5vZGVDYW52YXNPYmplY3Q9eyhub2RlOiBhbnksIGNvbnRleHQsIGdsb2JhbFNjYWxlKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHJhZGl1cyA9IG5vZGUudmFsO1xuICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gbm9kZS5pZCA9PT0gc2VsZWN0ZWROb2RlSWQ7XG4gICAgICAgICAgICAgIGNvbnN0IGlzQ29ubmVjdGVkID0gY29ubmVjdGVkTm9kZXMuaGFzKG5vZGUuaWQpO1xuICAgICAgICAgICAgICBjb25zdCBmb250U2l6ZSA9IE1hdGgubWF4KDEwIC8gZ2xvYmFsU2NhbGUsIDQpO1xuICAgICAgICAgICAgICBjb25zdCBzaG91bGREcmF3TGFiZWwgPSBpc1NlbGVjdGVkIHx8IGlzQ29ubmVjdGVkIHx8IGdsb2JhbFNjYWxlID49IDEuMzU7XG5cbiAgICAgICAgICAgICAgY29udGV4dC5zYXZlKCk7XG4gICAgICAgICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICAgIGNvbnRleHQuYXJjKG5vZGUueCwgbm9kZS55LCByYWRpdXMsIDAsIDIgKiBNYXRoLlBJKTtcbiAgICAgICAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBnZXRSaXNrQ29sb3Iobm9kZS5yaXNrTGV2ZWwpO1xuICAgICAgICAgICAgICBjb250ZXh0LnNoYWRvd0JsdXIgPSBpc1NlbGVjdGVkID8gMTggOiBpc0Nvbm5lY3RlZCA/IDEwIDogMDtcbiAgICAgICAgICAgICAgY29udGV4dC5zaGFkb3dDb2xvciA9IGdldFJpc2tDb2xvcihub2RlLnJpc2tMZXZlbCk7XG4gICAgICAgICAgICAgIGNvbnRleHQuZmlsbCgpO1xuXG4gICAgICAgICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICAgIGNvbnRleHQuYXJjKG5vZGUueCwgbm9kZS55LCByYWRpdXMgKyAzLCAwLCAyICogTWF0aC5QSSk7XG4gICAgICAgICAgICAgIGNvbnRleHQubGluZVdpZHRoID0gaXNTZWxlY3RlZCA/IDQgLyBnbG9iYWxTY2FsZSA6IDIgLyBnbG9iYWxTY2FsZTtcbiAgICAgICAgICAgICAgY29udGV4dC5zdHJva2VTdHlsZSA9IGlzU2VsZWN0ZWQgPyAnIzExMTgyNycgOiAncmdiYSgxNSwgMjMsIDQyLCAwLjM1KSc7XG4gICAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XG5cbiAgICAgICAgICAgICAgY29udGV4dC5zaGFkb3dCbHVyID0gMDtcbiAgICAgICAgICAgICAgaWYgKHNob3VsZERyYXdMYWJlbCkge1xuICAgICAgICAgICAgICAgIGNvbnRleHQuZm9udCA9IGAke2ZvbnRTaXplfXB4IEludGVyYDtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICcjMTExODI3JztcbiAgICAgICAgICAgICAgICBjb250ZXh0LnRleHRBbGlnbiA9ICdjZW50ZXInO1xuICAgICAgICAgICAgICAgIGNvbnRleHQudGV4dEJhc2VsaW5lID0gJ3RvcCc7XG4gICAgICAgICAgICAgICAgY29udGV4dC5maWxsVGV4dChub2RlLm5hbWUsIG5vZGUueCwgbm9kZS55ICsgcmFkaXVzICsgNik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29udGV4dC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9fVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICA8YXNpZGUgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgc2Nyb2xsYmFyLXRoaW4gZmxleCBtaW4taC0wIGZsZXgtY29sIG92ZXJmbG93LXktYXV0byByb3VuZGVkLVsyOHB4XSBwLTVcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtMyBib3JkZXItYiBib3JkZXItc2xhdGUtODAwLzkwIHBiLTRcIj5cbiAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMThlbV0gdGV4dC1ibHVlLTMwMFwiPlNlbGVjdGVkIENvbXBvbmVudDwvcD5cbiAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJtdC0yIHRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntkZXRhaWxUaXRsZX08L2gzPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0zIGZsZXggZmxleC13cmFwIGdhcC0yXCI+XG4gICAgICAgICAgICAgIHtkZXRhaWxUeXBlID8gPEJhZGdlPntmb3JtYXRMYWJlbChkZXRhaWxUeXBlKX08L0JhZGdlPiA6IG51bGx9XG4gICAgICAgICAgICAgIHtkZXRhaWxSaXNrTGV2ZWwgJiYgZGV0YWlsUmlza1Njb3JlICE9PSBudWxsID8gKFxuICAgICAgICAgICAgICAgIDxCYWRnZVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYm9yZGVyLXRyYW5zcGFyZW50IHRleHQtd2hpdGVcIlxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgYmFja2dyb3VuZENvbG9yOiBnZXRSaXNrQ29sb3IoZGV0YWlsUmlza0xldmVsKSB9fVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHtmb3JtYXRMYWJlbChkZXRhaWxSaXNrTGV2ZWwpfSBSaXNrIFx1MDBCNyB7ZGV0YWlsUmlza1Njb3JlfVxuICAgICAgICAgICAgICAgIDwvQmFkZ2U+XG4gICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7c2VsZWN0ZWROb2RlSWQgPyAoXG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uTm9kZVNlbGVjdChudWxsKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIHAtMiB0ZXh0LXNsYXRlLTQwMCB0cmFuc2l0aW9uIGhvdmVyOmJvcmRlci1zbGF0ZS01MDAgaG92ZXI6dGV4dC13aGl0ZVwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxSZWZyZXNoQ2N3IGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNSBzcGFjZS15LTRcIj5cbiAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNTUgcC00XCI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPkRlc2NyaXB0aW9uPC9wPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMyB0ZXh0LXNtIGxlYWRpbmctNyB0ZXh0LXNsYXRlLTIwMFwiPntkZXRhaWxEZXNjcmlwdGlvbiB8fCAnTm8gZGVzY3JpcHRpb24gYXZhaWxhYmxlLid9PC9wPlxuICAgICAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC81NSBwLTRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS01MDBcIj5cbiAgICAgICAgICAgICAgPEFsZXJ0VHJpYW5nbGUgY2xhc3NOYW1lPVwiaC00IHctNFwiIC8+XG4gICAgICAgICAgICAgIFJpc2sgU3VtbWFyeVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICB7ZGV0YWlsc1N0YXR1cyA9PT0gJ2xvYWRpbmcnICYmIHNlbGVjdGVkTm9kZUlkID8gKFxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gdGV4dC1zbGF0ZS0zMDBcIj5Mb2FkaW5nIGxpdmUgcmlzayBhbmQgaW1wYWN0IGRhdGEuLi48L3A+XG4gICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTMgc3BhY2UteS0zXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTIgb3ZlcmZsb3ctaGlkZGVuIHJvdW5kZWQtZnVsbCBiZy1zbGF0ZS04MDBcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaC1mdWxsIHJvdW5kZWQtZnVsbFwiXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGAke2RldGFpbFJpc2tTY29yZSA/PyAwfSVgLFxuICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogZGV0YWlsUmlza0xldmVsID8gZ2V0Umlza0NvbG9yKGRldGFpbFJpc2tMZXZlbCkgOiAnIzMzNDE1NScsXG4gICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gbGVhZGluZy03IHRleHQtc2xhdGUtMjAwXCI+XG4gICAgICAgICAgICAgICAgICB7c2VsZWN0ZWROb2RlRGV0YWlscz8uZXhwbGFuYXRpb24gfHwgZmFsbGJhY2tOb2RlPy5yaXNrRXhwbGFuYXRpb24gfHwgJ05vIHJpc2sgZXhwbGFuYXRpb24gYXZhaWxhYmxlLid9XG4gICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzU1IHAtNFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPlxuICAgICAgICAgICAgICA8TGluazIgY2xhc3NOYW1lPVwiaC00IHctNFwiIC8+XG4gICAgICAgICAgICAgIERlcGVuZGVuY2llc1xuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTMgc3BhY2UteS0yXCI+XG4gICAgICAgICAgICAgIHsoc2VsZWN0ZWROb2RlRGV0YWlscz8uZGVwZW5kZW5jaWVzID8/IFtdKS5sZW5ndGggPT09IDAgPyAoXG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPk5vIGRpcmVjdCBkZXBlbmRlbmNpZXMgcmV0dXJuZWQgZm9yIHRoaXMgY29tcG9uZW50LjwvcD5cbiAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICBzZWxlY3RlZE5vZGVEZXRhaWxzPy5kZXBlbmRlbmNpZXMubWFwKChkZXBlbmRlbmN5KSA9PiAoXG4gICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIGtleT17ZGVwZW5kZW5jeS5pZH1cbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gb25Ob2RlU2VsZWN0KGRlcGVuZGVuY3kuaWQpfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IHctZnVsbCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTkwMC84MCBweC0zIHB5LTIgdGV4dC1sZWZ0IHRleHQtc20gdGV4dC1zbGF0ZS0yMDAgdHJhbnNpdGlvbiBob3Zlcjpib3JkZXItc2xhdGUtNjAwXCJcbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+e2RlcGVuZGVuY3kubmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS01MDBcIj57ZGVwZW5kZW5jeS5pZH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICApKVxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzU1IHAtNFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPlxuICAgICAgICAgICAgICA8SW5mbyBjbGFzc05hbWU9XCJoLTQgdy00XCIgLz5cbiAgICAgICAgICAgICAgQWZmZWN0ZWQgU3lzdGVtc1xuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTMgc3BhY2UteS0yXCI+XG4gICAgICAgICAgICAgIHsoc2VsZWN0ZWROb2RlRGV0YWlscz8uYWZmZWN0ZWRTeXN0ZW1zID8/IFtdKS5sZW5ndGggPT09IDAgPyAoXG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPk5vIGRvd25zdHJlYW0gaW1wYWN0IHJldHVybmVkIGZvciB0aGlzIGNvbXBvbmVudC48L3A+XG4gICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWROb2RlRGV0YWlscz8uYWZmZWN0ZWRTeXN0ZW1zLm1hcCgoaXRlbSkgPT4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e2l0ZW0uaWR9IGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTkwMC84MCBweC0zIHB5LTIgdGV4dC1zbSB0ZXh0LXNsYXRlLTIwMFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZvbnQtbWVkaXVtXCI+e2l0ZW0ubmFtZX08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0xIHRleHQteHMgdGV4dC1zbGF0ZS01MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICB7aXRlbS5pZH0gXHUwMEI3IHtmb3JtYXRMYWJlbChpdGVtLnR5cGUpfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkpXG4gICAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNTUgcC00XCI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPklzc3VlcyAvIEZpbmRpbmdzPC9wPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0zIHNwYWNlLXktMlwiPlxuICAgICAgICAgICAgICB7KHNlbGVjdGVkTm9kZURldGFpbHM/Lmlzc3VlcyA/PyBbXSkubGVuZ3RoID09PSAwID8gKFxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5ObyBiYWNrZW5kIGZpbmRpbmdzIHdlcmUgcHJvdmlkZWQgZm9yIHRoaXMgc2VsZWN0aW9uLjwvcD5cbiAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICBzZWxlY3RlZE5vZGVEZXRhaWxzPy5pc3N1ZXMubWFwKChpc3N1ZSkgPT4gKFxuICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICBrZXk9e2lzc3VlfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05MDAvNzAgcHgtMyBweS0yIHRleHQtc20gbGVhZGluZy02IHRleHQtc2xhdGUtMjAwXCJcbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAge2lzc3VlfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKSlcbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC81NSBwLTRcIj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNTAwXCI+QmFja2VuZCBNZXRhZGF0YTwvcD5cbiAgICAgICAgICAgIHtkZXRhaWxzU3RhdHVzID09PSAnZXJyb3InICYmIGRldGFpbHNFcnJvciA/IChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0zIHNwYWNlLXktM1wiPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gdGV4dC1yZWQtMzAwXCI+e2RldGFpbHNFcnJvcn08L3A+XG4gICAgICAgICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PVwic2Vjb25kYXJ5XCIgb25DbGljaz17b25SZXRyeURldGFpbHN9PlxuICAgICAgICAgICAgICAgICAgUmV0cnkgRGV0YWlsIExvYWRcbiAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTMgZ3JpZCBncmlkLWNvbHMtMiBnYXAtM1wiPlxuICAgICAgICAgICAgICAgIHsoc2VsZWN0ZWROb2RlRGV0YWlscz8ubWV0YWRhdGEgPz8gW10pLm1hcCgoaXRlbSkgPT4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e2l0ZW0ubGFiZWx9IGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTkwMC83MCBwLTNcIj5cbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNTAwXCI+e2l0ZW0ubGFiZWx9PC9wPlxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtc20gZm9udC1tZWRpdW0gdGV4dC13aGl0ZVwiPntpdGVtLnZhbHVlfTwvcD5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgPC9zZWN0aW9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvYXNpZGU+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iLCAiaW1wb3J0IHsgbGF6eSwgU3VzcGVuc2UsIHVzZU1lbW8sIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgQmFyQ2hhcnQzLCBGaWxlSnNvbiwgTGlzdCwgTG9hZGVyMiwgTmV0d29yaywgU2hpZWxkIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7IHVzZU5hdmlnYXRlIH0gZnJvbSAncmVhY3Qtcm91dGVyLWRvbSc7XG5pbXBvcnQgRW1wdHlTdGF0ZSBmcm9tICcuLi9jb21wb25lbnRzL0VtcHR5U3RhdGUnO1xuaW1wb3J0IE5vZGVzRWRnZXNWaWV3IGZyb20gJy4uL2NvbXBvbmVudHMvTm9kZXNFZGdlc1ZpZXcnO1xuaW1wb3J0IFJpc2tBbmFseXNpcyBmcm9tICcuLi9jb21wb25lbnRzL1Jpc2tBbmFseXNpcyc7XG5pbXBvcnQgU3lzdGVtT3ZlcnZpZXcgZnJvbSAnLi4vY29tcG9uZW50cy9TeXN0ZW1PdmVydmlldyc7XG5pbXBvcnQgU3RhdHVzQmFubmVyIGZyb20gJy4uL2NvbXBvbmVudHMvU3RhdHVzQmFubmVyJztcbmltcG9ydCBCdXR0b24gZnJvbSAnLi4vY29tcG9uZW50cy91aS9CdXR0b24nO1xuaW1wb3J0IEJhZGdlIGZyb20gJy4uL2NvbXBvbmVudHMvdWkvQmFkZ2UnO1xuaW1wb3J0IHsgYnVpbGRHcmFwaFN1bW1hcnksIGZvcm1hdExhYmVsIH0gZnJvbSAnLi4vbGliL3NlbGVjdG9ycyc7XG5pbXBvcnQgeyB1c2VBcHBDb250ZXh0IH0gZnJvbSAnLi4vc3RhdGUvQXBwQ29udGV4dCc7XG5pbXBvcnQgdHlwZSB7IEdyYXBoRGF0YSwgTm9kZURldGFpbHMgfSBmcm9tICcuLi90eXBlcy9hcHAnO1xuaW1wb3J0IFVwbG9hZGVkRG9jdW1lbnRXb3Jrc3BhY2UgZnJvbSAnLi9VcGxvYWRlZERvY3VtZW50V29ya3NwYWNlJztcblxuY29uc3QgR3JhcGhWaWV3ID0gbGF6eSgoKSA9PiBpbXBvcnQoJy4uL2NvbXBvbmVudHMvR3JhcGhWaWV3JykpO1xuXG50eXBlIFVwbG9hZGVkR3JhcGhWaWV3VHlwZSA9ICdncmFwaCcgfCAncmlzaycgfCAnbm9kZXMnIHwgJ292ZXJ2aWV3JztcblxuY29uc3QgbmF2SXRlbXM6IEFycmF5PHsgaWQ6IFVwbG9hZGVkR3JhcGhWaWV3VHlwZTsgbGFiZWw6IHN0cmluZzsgaWNvbjogdHlwZW9mIE5ldHdvcmsgfT4gPSBbXG4gIHsgaWQ6ICdncmFwaCcsIGxhYmVsOiAnR3JhcGggVmlldycsIGljb246IE5ldHdvcmsgfSxcbiAgeyBpZDogJ3Jpc2snLCBsYWJlbDogJ1Jpc2sgQW5hbHlzaXMnLCBpY29uOiBTaGllbGQgfSxcbiAgeyBpZDogJ25vZGVzJywgbGFiZWw6ICdOb2RlcyAmIEVkZ2VzJywgaWNvbjogTGlzdCB9LFxuICB7IGlkOiAnb3ZlcnZpZXcnLCBsYWJlbDogJ1N5c3RlbSBPdmVydmlldycsIGljb246IEJhckNoYXJ0MyB9LFxuXTtcblxuZnVuY3Rpb24gZm9ybWF0TWV0cmljKHZhbHVlOiBudW1iZXIpIHtcbiAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIodmFsdWUpID8gU3RyaW5nKHZhbHVlKSA6IHZhbHVlLnRvRml4ZWQoMyk7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkTG9jYWxOb2RlRGV0YWlscyhncmFwaERhdGE6IEdyYXBoRGF0YSwgbm9kZUlkOiBzdHJpbmcpOiBOb2RlRGV0YWlscyB8IG51bGwge1xuICBjb25zdCBub2RlID0gZ3JhcGhEYXRhLm5vZGVJbmRleFtub2RlSWRdO1xuICBpZiAoIW5vZGUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGRlcGVuZGVuY2llcyA9IG5vZGUuZGVwZW5kZW5jaWVzXG4gICAgLm1hcCgoZGVwZW5kZW5jeUlkKSA9PiBncmFwaERhdGEubm9kZUluZGV4W2RlcGVuZGVuY3lJZF0pXG4gICAgLmZpbHRlcigoY2FuZGlkYXRlKTogY2FuZGlkYXRlIGlzIEdyYXBoRGF0YVsnbm9kZXMnXVtudW1iZXJdID0+IEJvb2xlYW4oY2FuZGlkYXRlKSlcbiAgICAubWFwKChkZXBlbmRlbmN5KSA9PiAoeyBpZDogZGVwZW5kZW5jeS5pZCwgbmFtZTogZGVwZW5kZW5jeS5uYW1lLCB0eXBlOiBkZXBlbmRlbmN5LnR5cGUgfSkpO1xuXG4gIGNvbnN0IGFmZmVjdGVkU3lzdGVtcyA9IG5vZGUuZGVwZW5kZW50c1xuICAgIC5tYXAoKGRlcGVuZGVudElkKSA9PiBncmFwaERhdGEubm9kZUluZGV4W2RlcGVuZGVudElkXSlcbiAgICAuZmlsdGVyKChjYW5kaWRhdGUpOiBjYW5kaWRhdGUgaXMgR3JhcGhEYXRhWydub2RlcyddW251bWJlcl0gPT4gQm9vbGVhbihjYW5kaWRhdGUpKVxuICAgIC5tYXAoKGRlcGVuZGVudCkgPT4gKHsgaWQ6IGRlcGVuZGVudC5pZCwgbmFtZTogZGVwZW5kZW50Lm5hbWUsIHR5cGU6IGRlcGVuZGVudC50eXBlIH0pKTtcblxuICBjb25zdCBpc3N1ZXMgPSBncmFwaERhdGEubGlua3NcbiAgICAuZmlsdGVyKChsaW5rKSA9PiBsaW5rLnNvdXJjZSA9PT0gbm9kZUlkIHx8IGxpbmsudGFyZ2V0ID09PSBub2RlSWQpXG4gICAgLm1hcCgobGluaykgPT4gbGluay5yYXRpb25hbGUpXG4gICAgLmZpbHRlcigocmF0aW9uYWxlLCBpbmRleCwgY29sbGVjdGlvbikgPT4gcmF0aW9uYWxlLnRyaW0oKS5sZW5ndGggPiAwICYmIGNvbGxlY3Rpb24uaW5kZXhPZihyYXRpb25hbGUpID09PSBpbmRleCk7XG5cbiAgcmV0dXJuIHtcbiAgICBjb21wb25lbnRJZDogbm9kZS5pZCxcbiAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgdHlwZTogbm9kZS50eXBlLFxuICAgIHJpc2tTY29yZTogbm9kZS5yaXNrU2NvcmUsXG4gICAgcmlza0xldmVsOiBub2RlLnJpc2tMZXZlbCxcbiAgICBkZXNjcmlwdGlvbjogbm9kZS5kZXNjcmlwdGlvbixcbiAgICBkZXBlbmRlbmNpZXMsXG4gICAgYWZmZWN0ZWRTeXN0ZW1zLFxuICAgIGlzc3VlcyxcbiAgICBleHBsYW5hdGlvbjogbm9kZS5yaXNrRXhwbGFuYXRpb24sXG4gICAgaW1wYWN0Q291bnQ6IG5vZGUuZGVwZW5kZW50cy5sZW5ndGgsXG4gICAgbWV0YWRhdGE6IFtcbiAgICAgIHsgbGFiZWw6ICdEZWdyZWUnLCB2YWx1ZTogZm9ybWF0TWV0cmljKG5vZGUuZGVncmVlKSB9LFxuICAgICAgeyBsYWJlbDogJ0JldHdlZW5uZXNzJywgdmFsdWU6IGZvcm1hdE1ldHJpYyhub2RlLmJldHdlZW5uZXNzKSB9LFxuICAgICAgeyBsYWJlbDogJ0Nsb3NlbmVzcycsIHZhbHVlOiBmb3JtYXRNZXRyaWMobm9kZS5jbG9zZW5lc3MpIH0sXG4gICAgICB7IGxhYmVsOiAnQmxhc3QgUmFkaXVzJywgdmFsdWU6IFN0cmluZyhub2RlLmJsYXN0UmFkaXVzKSB9LFxuICAgICAgeyBsYWJlbDogJ0RlcGVuZGVuY3kgU3BhbicsIHZhbHVlOiBTdHJpbmcobm9kZS5kZXBlbmRlbmN5U3BhbikgfSxcbiAgICAgIHsgbGFiZWw6ICdTb3VyY2UnLCB2YWx1ZTogbm9kZS5zb3VyY2UgfSxcbiAgICBdLFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBVcGxvYWRlZEdyYXBoV29ya3NwYWNlKCkge1xuICBjb25zdCBuYXZpZ2F0ZSA9IHVzZU5hdmlnYXRlKCk7XG4gIGNvbnN0IHsgdXBsb2FkZWRHcmFwaCB9ID0gdXNlQXBwQ29udGV4dCgpO1xuICBjb25zdCBbY3VycmVudFZpZXcsIHNldEN1cnJlbnRWaWV3XSA9IHVzZVN0YXRlPFVwbG9hZGVkR3JhcGhWaWV3VHlwZT4oJ2dyYXBoJyk7XG4gIGNvbnN0IFtzZWxlY3RlZE5vZGVJZCwgc2V0U2VsZWN0ZWROb2RlSWRdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG5cbiAgaWYgKHVwbG9hZGVkR3JhcGgua2luZCA9PT0gJ2RvY3VtZW50Jykge1xuICAgIHJldHVybiA8VXBsb2FkZWREb2N1bWVudFdvcmtzcGFjZSAvPjtcbiAgfVxuXG4gIGNvbnN0IGdyYXBoRGF0YSA9IHVwbG9hZGVkR3JhcGgub3BlcmF0aW9uYWxEYXRhO1xuICBjb25zdCBzZWxlY3RlZE5vZGVEZXRhaWxzID0gdXNlTWVtbyhcbiAgICAoKSA9PiAoZ3JhcGhEYXRhICYmIHNlbGVjdGVkTm9kZUlkID8gYnVpbGRMb2NhbE5vZGVEZXRhaWxzKGdyYXBoRGF0YSwgc2VsZWN0ZWROb2RlSWQpIDogbnVsbCksXG4gICAgW2dyYXBoRGF0YSwgc2VsZWN0ZWROb2RlSWRdXG4gICk7XG4gIGNvbnN0IGdyYXBoU3VtbWFyeSA9IHVzZU1lbW8oKCkgPT4gKGdyYXBoRGF0YSA/IGJ1aWxkR3JhcGhTdW1tYXJ5KGdyYXBoRGF0YSkgOiBudWxsKSwgW2dyYXBoRGF0YV0pO1xuXG4gIGlmICh1cGxvYWRlZEdyYXBoLnN0YXR1cyA9PT0gJ2xvYWRpbmcnICYmICFncmFwaERhdGEpIHtcbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IG1pbi1oLXNjcmVlbiBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgYmctWyMwRjE3MkFdXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgdGV4dC1zbGF0ZS0yMDBcIj5cbiAgICAgICAgICA8TG9hZGVyMiBjbGFzc05hbWU9XCJoLTUgdy01IGFuaW1hdGUtc3BpblwiIC8+XG4gICAgICAgICAgPHNwYW4+TG9hZGluZyB1cGxvYWRlZCBncmFwaC4uLjwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICApO1xuICB9XG5cbiAgaWYgKHVwbG9hZGVkR3JhcGguc3RhdHVzID09PSAnZXJyb3InICYmICFncmFwaERhdGEpIHtcbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gYmctWyMwRjE3MkFdIHB4LTYgcHktMTZcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJteC1hdXRvIG1heC13LTR4bFwiPlxuICAgICAgICAgIDxFbXB0eVN0YXRlXG4gICAgICAgICAgICB0aXRsZT1cIlVwbG9hZGVkIEdyYXBoIExvYWRpbmcgRmFpbGVkXCJcbiAgICAgICAgICAgIG1lc3NhZ2U9e3VwbG9hZGVkR3JhcGguZXJyb3IgfHwgJ1RoZSBmcm9udGVuZCBjb3VsZCBub3QgbG9hZCB0aGUgc2VsZWN0ZWQgb3BlcmF0aW9uYWwgZ3JhcGggSlNPTi4nfVxuICAgICAgICAgICAgYWN0aW9uPXtcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBqdXN0aWZ5LWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgICAgIDxCdXR0b24gb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9ncmFwaHMnKX0+UmV0dXJuIHRvIEdyYXBoIFVwbG9hZDwvQnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAvPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICk7XG4gIH1cblxuICBpZiAoIWdyYXBoRGF0YSkge1xuICAgIHJldHVybiAoXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1pbi1oLXNjcmVlbiBiZy1bIzBGMTcyQV0gcHgtNiBweS0xNlwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gbWF4LXctNHhsXCI+XG4gICAgICAgICAgPEVtcHR5U3RhdGVcbiAgICAgICAgICAgIHRpdGxlPVwiTm8gVXBsb2FkZWQgR3JhcGggTG9hZGVkXCJcbiAgICAgICAgICAgIG1lc3NhZ2U9XCJVcGxvYWQgYW4gb3BlcmF0aW9uYWwgb3IgZG9jdW1lbnQgZ3JhcGggYXJ0aWZhY3QgSlNPTiB0byBpbnNwZWN0IGEgbG9jYWwgZ3JhcGggd29ya3NwYWNlLlwiXG4gICAgICAgICAgICBhY3Rpb249ezxCdXR0b24gb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9ncmFwaHMnKX0+VXBsb2FkIEdyYXBoIEpTT048L0J1dHRvbj59XG4gICAgICAgICAgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICApO1xuICB9XG5cbiAgaWYgKGdyYXBoRGF0YS5ub2Rlcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gYmctWyMwRjE3MkFdIHB4LTYgcHktMTZcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJteC1hdXRvIG1heC13LTR4bFwiPlxuICAgICAgICAgIDxFbXB0eVN0YXRlXG4gICAgICAgICAgICB0aXRsZT1cIlRoZSBVcGxvYWRlZCBHcmFwaCBJcyBFbXB0eVwiXG4gICAgICAgICAgICBtZXNzYWdlPVwiVGhlIHNlbGVjdGVkIG9wZXJhdGlvbmFsIGdyYXBoIGFydGlmYWN0IGxvYWRlZCBzdWNjZXNzZnVsbHksIGJ1dCBpdCBjb250YWlucyBubyBub2Rlcy5cIlxuICAgICAgICAgICAgYWN0aW9uPXs8QnV0dG9uIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvZ3JhcGhzJyl9PlVwbG9hZCBBbm90aGVyIEdyYXBoPC9CdXR0b24+fVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGgtc2NyZWVuIG92ZXJmbG93LWhpZGRlbiBiZy1bIzBGMTcyQV1cIj5cbiAgICAgIDxhc2lkZSBjbGFzc05hbWU9XCJoaWRkZW4gaC1mdWxsIHctNzIgc2hyaW5rLTAgYm9yZGVyLXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvOTUgeGw6ZmxleCB4bDpmbGV4LWNvbFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcHgtNiBweS03XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBiZy1ibHVlLTUwMC8xNSBwLTMgdGV4dC1ibHVlLTMwMFwiPlxuICAgICAgICAgICAgICA8RmlsZUpzb24gY2xhc3NOYW1lPVwiaC03IHctN1wiIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtYm9sZCB0ZXh0LXdoaXRlXCI+VHdpbkdyYXBoT3BzPC9oMT5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlVwbG9hZGVkIGdyYXBoIHdvcmtzcGFjZTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC02IGdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTNcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTAwLzcwIHAtM1wiPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPk5vZGVzPC9wPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntncmFwaERhdGEubm9kZXMubGVuZ3RofTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05MDAvNzAgcC0zXCI+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNTAwXCI+RWRnZXM8L3A+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC0yeGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+e2dyYXBoRGF0YS5saW5rcy5sZW5ndGh9PC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTRcIj5cbiAgICAgICAgICAgIDxCYWRnZSBjbGFzc05hbWU9XCJib3JkZXItYmx1ZS01MDAvMzAgYmctYmx1ZS01MDAvMTAgdGV4dC1ibHVlLTEwMFwiPlxuICAgICAgICAgICAgICBBY3RpdmUgR3JhcGg6IHt1cGxvYWRlZEdyYXBoLmZpbGVuYW1lIHx8IGZvcm1hdExhYmVsKGdyYXBoRGF0YS5zb3VyY2UpfVxuICAgICAgICAgICAgPC9CYWRnZT5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNCBncmlkIGdyaWQtY29scy0zIGdhcC0yXCI+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvcmlzaycpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBweC0zIHB5LTIgdGV4dC14cyBmb250LXNlbWlib2xkIHRleHQtc2xhdGUtMzAwIHRyYW5zaXRpb24gaG92ZXI6Ym9yZGVyLXNsYXRlLTUwMCBob3Zlcjp0ZXh0LXdoaXRlXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgUmlza1xuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvZG9jdW1lbnRzJyl9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIHB4LTMgcHktMiB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1zbGF0ZS0zMDAgdHJhbnNpdGlvbiBob3Zlcjpib3JkZXItc2xhdGUtNTAwIGhvdmVyOnRleHQtd2hpdGVcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICBEb2N1bWVudHNcbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBiZy1ibHVlLTYwMCBweC0zIHB5LTIgdGV4dC14cyBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj5HcmFwaHM8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPG5hdiBjbGFzc05hbWU9XCJmbGV4LTEgc3BhY2UteS0yIHAtNFwiPlxuICAgICAgICAgIHtuYXZJdGVtcy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IEljb24gPSBpdGVtLmljb247XG4gICAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IGN1cnJlbnRWaWV3ID09PSBpdGVtLmlkO1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIGtleT17aXRlbS5pZH1cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRDdXJyZW50VmlldyhpdGVtLmlkKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IHctZnVsbCBpdGVtcy1jZW50ZXIgZ2FwLTMgcm91bmRlZC0yeGwgcHgtNCBweS0zIHRleHQtbGVmdCB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRyYW5zaXRpb24gJHtcbiAgICAgICAgICAgICAgICAgIGlzQWN0aXZlID8gJ2JnLWJsdWUtNjAwIHRleHQtd2hpdGUgc2hhZG93LWxnIHNoYWRvdy1ibHVlLTk1MC80MCcgOiAndGV4dC1zbGF0ZS00MDAgaG92ZXI6Ymctc2xhdGUtOTAwIGhvdmVyOnRleHQtd2hpdGUnXG4gICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8SWNvbiBjbGFzc05hbWU9XCJoLTUgdy01XCIgLz5cbiAgICAgICAgICAgICAgICA8c3Bhbj57aXRlbS5sYWJlbH08L3NwYW4+XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KX1cbiAgICAgICAgPC9uYXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJib3JkZXItdCBib3JkZXItc2xhdGUtODAwIHAtNFwiPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvZ3JhcGhzJyl9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IHctZnVsbCBpdGVtcy1jZW50ZXIgZ2FwLTMgcm91bmRlZC0yeGwgcHgtNCBweS0zIHRleHQtbGVmdCB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtc2xhdGUtNDAwIHRyYW5zaXRpb24gaG92ZXI6Ymctc2xhdGUtOTAwIGhvdmVyOnRleHQtd2hpdGVcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxGaWxlSnNvbiBjbGFzc05hbWU9XCJoLTUgdy01XCIgLz5cbiAgICAgICAgICAgIDxzcGFuPlVwbG9hZCBOZXcgR3JhcGg8L3NwYW4+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9hc2lkZT5cblxuICAgICAgPG1haW4gY2xhc3NOYW1lPVwiZmxleCBtaW4tdy0wIGZsZXgtMSBmbGV4LWNvbCBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgPGhlYWRlciBjbGFzc05hbWU9XCJib3JkZXItYiBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC82MCBweC02IHB5LTRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTRcIj5cbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LTJ4bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj5VcGxvYWRlZCBHcmFwaCBXb3Jrc3BhY2U8L2gxPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0xIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5cbiAgICAgICAgICAgICAgICB7Z3JhcGhTdW1tYXJ5Py50b3RhbENvbXBvbmVudHMgPz8gMH0gY29tcG9uZW50cywge2dyYXBoU3VtbWFyeT8udG90YWxSZWxhdGlvbnNoaXBzID8/IDB9IHJlbGF0aW9uc2hpcHMsIGF2ZXJhZ2UgcmlzayB7Z3JhcGhTdW1tYXJ5Py5hdmdSaXNrID8/IDB9XG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgIHt1cGxvYWRlZEdyYXBoLmVycm9yID8gPFN0YXR1c0Jhbm5lciB0b25lPVwiZXJyb3JcIiBtZXNzYWdlPXt1cGxvYWRlZEdyYXBoLmVycm9yfSAvPiA6IG51bGx9XG4gICAgICAgICAgICAgIDxCYWRnZSBjbGFzc05hbWU9XCJib3JkZXItc2xhdGUtNzAwIGJnLXNsYXRlLTkwMC84MCB0ZXh0LXNsYXRlLTIwMFwiPkF1dG8tZGV0ZWN0ZWQgb3BlcmF0aW9uYWwgYXJ0aWZhY3Q8L0JhZGdlPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvaGVhZGVyPlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtMCBmbGV4LTEgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgICAge2N1cnJlbnRWaWV3ID09PSAnZ3JhcGgnICYmIChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIHAtNlwiPlxuICAgICAgICAgICAgICA8U3VzcGVuc2VcbiAgICAgICAgICAgICAgICBmYWxsYmFjaz17XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaC1mdWxsIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLVsyNHB4XSBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBiZy1bI2Q5ZDlkOV1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyB0ZXh0LXNsYXRlLTcwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxMb2FkZXIyIGNsYXNzTmFtZT1cImgtNSB3LTUgYW5pbWF0ZS1zcGluXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj5Mb2FkaW5nIGdyYXBoIHZpZXcuLi48L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPEdyYXBoVmlld1xuICAgICAgICAgICAgICAgICAgZ3JhcGhEYXRhPXtncmFwaERhdGF9XG4gICAgICAgICAgICAgICAgICBzZWxlY3RlZE5vZGVJZD17c2VsZWN0ZWROb2RlSWR9XG4gICAgICAgICAgICAgICAgICBzZWxlY3RlZE5vZGVEZXRhaWxzPXtzZWxlY3RlZE5vZGVEZXRhaWxzfVxuICAgICAgICAgICAgICAgICAgZGV0YWlsc1N0YXR1cz1cInJlYWR5XCJcbiAgICAgICAgICAgICAgICAgIGRldGFpbHNFcnJvcj17bnVsbH1cbiAgICAgICAgICAgICAgICAgIG9uTm9kZVNlbGVjdD17c2V0U2VsZWN0ZWROb2RlSWR9XG4gICAgICAgICAgICAgICAgICBvblJldHJ5RGV0YWlscz17KCkgPT4gdW5kZWZpbmVkfVxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgIDwvU3VzcGVuc2U+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApfVxuICAgICAgICAgIHtjdXJyZW50VmlldyA9PT0gJ3Jpc2snICYmIDxSaXNrQW5hbHlzaXMgZ3JhcGhEYXRhPXtncmFwaERhdGF9IHNvdXJjZUxhYmVsPVwidXBsb2FkZWQgZ3JhcGggSlNPTlwiIC8+fVxuICAgICAgICAgIHtjdXJyZW50VmlldyA9PT0gJ25vZGVzJyAmJiAoXG4gICAgICAgICAgICA8Tm9kZXNFZGdlc1ZpZXdcbiAgICAgICAgICAgICAgZ3JhcGhEYXRhPXtncmFwaERhdGF9XG4gICAgICAgICAgICAgIG9uTm9kZVNlbGVjdD17KG5vZGVJZCkgPT4ge1xuICAgICAgICAgICAgICAgIHNldEN1cnJlbnRWaWV3KCdncmFwaCcpO1xuICAgICAgICAgICAgICAgIHNldFNlbGVjdGVkTm9kZUlkKG5vZGVJZCk7XG4gICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICl9XG4gICAgICAgICAge2N1cnJlbnRWaWV3ID09PSAnb3ZlcnZpZXcnICYmIDxTeXN0ZW1PdmVydmlldyBncmFwaERhdGE9e2dyYXBoRGF0YX0gc291cmNlTGFiZWw9XCJ1cGxvYWRlZCBncmFwaCBKU09OXCIgLz59XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9tYWluPlxuICAgIDwvZGl2PlxuICApO1xufVxuIiwgImltcG9ydCBhc3NlcnQgZnJvbSAnbm9kZTphc3NlcnQvc3RyaWN0JztcbmltcG9ydCB0ZXN0IGZyb20gJ25vZGU6dGVzdCc7XG5pbXBvcnQgdHlwZSB7IFJlYWN0Tm9kZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IHJlbmRlclRvU3RhdGljTWFya3VwIH0gZnJvbSAncmVhY3QtZG9tL3NlcnZlcic7XG5pbXBvcnQgeyBNZW1vcnlSb3V0ZXIgfSBmcm9tICdyZWFjdC1yb3V0ZXItZG9tJztcbmltcG9ydCB7XG4gIGNyZWF0ZU1vY2tDb250ZXh0LFxuICBjcmVhdGVTYW1wbGVEb2N1bWVudEdyYXBoRGF0YSxcbiAgY3JlYXRlU2FtcGxlR3JhcGhEYXRhLFxuICBpbnN0YWxsUnVudGltZVdpbmRvd0NvbmZpZyxcbn0gZnJvbSAnLi90ZXN0LXV0aWxzJztcblxuaW5zdGFsbFJ1bnRpbWVXaW5kb3dDb25maWcoKTtcblxuY29uc3QgeyBBcHBDb250ZXh0IH0gPSBhd2FpdCBpbXBvcnQoJy4uL3NyYy9zdGF0ZS9BcHBDb250ZXh0Jyk7XG5jb25zdCB7IGRlZmF1bHQ6IExhbmRpbmdQYWdlIH0gPSBhd2FpdCBpbXBvcnQoJy4uL3NyYy9wYWdlcy9MYW5kaW5nUGFnZScpO1xuY29uc3QgeyBkZWZhdWx0OiBQcm9jZXNzaW5nUGFnZSB9ID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvcGFnZXMvUHJvY2Vzc2luZ1BhZ2UnKTtcbmNvbnN0IHsgZGVmYXVsdDogU3lzdGVtT3ZlcnZpZXcgfSA9IGF3YWl0IGltcG9ydCgnLi4vc3JjL2NvbXBvbmVudHMvU3lzdGVtT3ZlcnZpZXcnKTtcbmNvbnN0IHsgZGVmYXVsdDogRG9jdW1lbnRVcGxvYWRQYWdlIH0gPSBhd2FpdCBpbXBvcnQoJy4uL3NyYy9wYWdlcy9Eb2N1bWVudFVwbG9hZFBhZ2UnKTtcbmNvbnN0IHsgZGVmYXVsdDogRG9jdW1lbnRXb3Jrc3BhY2UgfSA9IGF3YWl0IGltcG9ydCgnLi4vc3JjL3BhZ2VzL0RvY3VtZW50V29ya3NwYWNlJyk7XG5jb25zdCB7IGRlZmF1bHQ6IERvY3VtZW50T3ZlcnZpZXcgfSA9IGF3YWl0IGltcG9ydCgnLi4vc3JjL2NvbXBvbmVudHMvRG9jdW1lbnRPdmVydmlldycpO1xuY29uc3QgeyBkZWZhdWx0OiBVcGxvYWRlZEdyYXBoVXBsb2FkUGFnZSB9ID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvcGFnZXMvVXBsb2FkZWRHcmFwaFVwbG9hZFBhZ2UnKTtcbmNvbnN0IHsgZGVmYXVsdDogVXBsb2FkZWRHcmFwaFdvcmtzcGFjZSB9ID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvcGFnZXMvVXBsb2FkZWRHcmFwaFdvcmtzcGFjZScpO1xuXG5mdW5jdGlvbiByZW5kZXJXaXRoQ29udGV4dChcbiAgZWxlbWVudDogUmVhY3ROb2RlLFxuICBjb250ZXh0T3ZlcnJpZGVzID0ge30sXG4gIGluaXRpYWxFbnRyaWVzID0gWycvJ11cbikge1xuICByZXR1cm4gcmVuZGVyVG9TdGF0aWNNYXJrdXAoXG4gICAgPE1lbW9yeVJvdXRlciBpbml0aWFsRW50cmllcz17aW5pdGlhbEVudHJpZXN9PlxuICAgICAgPEFwcENvbnRleHQuUHJvdmlkZXIgdmFsdWU9e2NyZWF0ZU1vY2tDb250ZXh0KGNvbnRleHRPdmVycmlkZXMpfT57ZWxlbWVudH08L0FwcENvbnRleHQuUHJvdmlkZXI+XG4gICAgPC9NZW1vcnlSb3V0ZXI+XG4gICk7XG59XG5cbnRlc3QoJ2xhbmRpbmcgcGFnZSByZW5kZXJzIHRoZSB1cGxvYWQgd29ya3NwYWNlIGNvbnRlbnQnLCAoKSA9PiB7XG4gIGNvbnN0IGh0bWwgPSByZW5kZXJXaXRoQ29udGV4dCg8TGFuZGluZ1BhZ2UgLz4pO1xuXG4gIGFzc2VydC5tYXRjaChodG1sLCAvVHdpbkdyYXBoT3BzLyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvVXBsb2FkIFN5c3RlbSBEb2N1bWVudGF0aW9uLyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvU3VwcG9ydGVkIGZvcm1hdHM6IFxcLm1kIGFuZCBcXC50eHQvKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9Eb2N1bWVudCBXb3Jrc3BhY2UvKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9HcmFwaCBXb3Jrc3BhY2UvKTtcbn0pO1xuXG50ZXN0KCdwcm9jZXNzaW5nIHBhZ2UgcmVuZGVycyB0aGUgYWN0aXZlIHByb2Nlc3Npbmcgc3RhdGUnLCAoKSA9PiB7XG4gIGNvbnN0IGh0bWwgPSByZW5kZXJXaXRoQ29udGV4dChcbiAgICA8UHJvY2Vzc2luZ1BhZ2UgLz4sXG4gICAge1xuICAgICAgdXBsb2FkOiB7XG4gICAgICAgIC4uLmNyZWF0ZU1vY2tDb250ZXh0KCkudXBsb2FkLFxuICAgICAgICBwaGFzZTogJ3VwbG9hZGluZycsXG4gICAgICAgIHNlbGVjdGVkRmlsZTogbmV3IEZpbGUoWydoZWxsbyddLCAnc3lzdGVtLm1kJywgeyB0eXBlOiAndGV4dC9tYXJrZG93bicgfSksXG4gICAgICAgIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWRpbmcgc3lzdGVtLm1kLi4uJyxcbiAgICAgICAgc3RhcnRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgfSxcbiAgICB9LFxuICAgIFsnL3Byb2Nlc3NpbmcnXVxuICApO1xuXG4gIGFzc2VydC5tYXRjaChodG1sLCAvUHJvY2Vzc2luZyBZb3VyIERvY3VtZW50YXRpb24vKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9VcGxvYWRpbmcgZG9jdW1lbnQvKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9VcGxvYWRpbmcgc3lzdGVtXFwubWQvKTtcbn0pO1xuXG50ZXN0KCdzeXN0ZW0gb3ZlcnZpZXcgcmVuZGVycyB0aGUgbG9hZGVkIHdvcmtzcGFjZSBzdW1tYXJ5JywgKCkgPT4ge1xuICBjb25zdCBncmFwaERhdGEgPSBjcmVhdGVTYW1wbGVHcmFwaERhdGEoKTtcbiAgY29uc3QgaHRtbCA9IHJlbmRlclRvU3RhdGljTWFya3VwKDxTeXN0ZW1PdmVydmlldyBncmFwaERhdGE9e2dyYXBoRGF0YX0gLz4pO1xuXG4gIGFzc2VydC5tYXRjaChodG1sLCAvU3lzdGVtIE92ZXJ2aWV3Lyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvVG90YWwgQ29tcG9uZW50cy8pO1xuICBhc3NlcnQubWF0Y2goaHRtbCwgL1JlbGF0aW9uc2hpcHMvKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9Nb3N0IENvbm5lY3RlZCBDb21wb25lbnRzLyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvQVBJIFNlcnZpY2UvKTtcbn0pO1xuXG50ZXN0KCdkb2N1bWVudCB1cGxvYWQgcGFnZSByZW5kZXJzIHBkZiBtYXJrZG93biBhbmQgdGV4dCBzdXBwb3J0JywgKCkgPT4ge1xuICBjb25zdCBodG1sID0gcmVuZGVyV2l0aENvbnRleHQoPERvY3VtZW50VXBsb2FkUGFnZSAvPiwge30sIFsnL2RvY3VtZW50cyddKTtcblxuICBhc3NlcnQubWF0Y2goaHRtbCwgL0RvY3VtZW50IEtub3dsZWRnZSBHcmFwaHMvKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9TdXBwb3J0ZWQgZm9ybWF0czogXFwucGRmLCBcXC5tZCwgYW5kIFxcLnR4dC8pO1xuICBhc3NlcnQubWF0Y2goaHRtbCwgL1Jpc2sgV29ya3NwYWNlLyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvR3JhcGggV29ya3NwYWNlLyk7XG59KTtcblxudGVzdCgndXBsb2FkZWQgZ3JhcGggdXBsb2FkIHBhZ2UgcmVuZGVycyBqc29uLW9ubHkgY29weScsICgpID0+IHtcbiAgY29uc3QgaHRtbCA9IHJlbmRlcldpdGhDb250ZXh0KDxVcGxvYWRlZEdyYXBoVXBsb2FkUGFnZSAvPiwge30sIFsnL2dyYXBocyddKTtcblxuICBhc3NlcnQubWF0Y2goaHRtbCwgL0ZpbmFsaXplZCBLbm93bGVkZ2UgR3JhcGhzLyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvb3BlcmF0aW9uYWwgb3IgZG9jdW1lbnQgZ3JhcGggYXJ0aWZhY3QgSlNPTi9pKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9PcGVuIFVwbG9hZGVkIEdyYXBoLyk7XG59KTtcblxudGVzdCgndXBsb2FkZWQgZ3JhcGggd29ya3NwYWNlIHJlbmRlcnMgbG9hZGVkIGdyYXBoIHN1bW1hcnknLCAoKSA9PiB7XG4gIGNvbnN0IGdyYXBoRGF0YSA9IGNyZWF0ZVNhbXBsZUdyYXBoRGF0YSgpO1xuICBjb25zdCBodG1sID0gcmVuZGVyV2l0aENvbnRleHQoXG4gICAgPFVwbG9hZGVkR3JhcGhXb3Jrc3BhY2UgLz4sXG4gICAge1xuICAgICAgdXBsb2FkZWRHcmFwaDoge1xuICAgICAgICAuLi5jcmVhdGVNb2NrQ29udGV4dCgpLnVwbG9hZGVkR3JhcGgsXG4gICAgICAgIHN0YXR1czogJ3JlYWR5JyxcbiAgICAgICAga2luZDogJ29wZXJhdGlvbmFsJyxcbiAgICAgICAgb3BlcmF0aW9uYWxEYXRhOiBncmFwaERhdGEsXG4gICAgICAgIGZpbGVuYW1lOiAnbWVyZ2VkX2dyYXBoLmpzb24nLFxuICAgICAgfSxcbiAgICB9LFxuICAgIFsnL2dyYXBocy93b3Jrc3BhY2UnXVxuICApO1xuXG4gIGFzc2VydC5tYXRjaChodG1sLCAvVXBsb2FkZWQgR3JhcGggV29ya3NwYWNlLyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvQXV0by1kZXRlY3RlZCBvcGVyYXRpb25hbCBhcnRpZmFjdC8pO1xuICBhc3NlcnQubWF0Y2goaHRtbCwgL21lcmdlZF9ncmFwaFxcLmpzb24vaSk7XG59KTtcblxudGVzdCgndXBsb2FkZWQgZ3JhcGggd29ya3NwYWNlIHJlbmRlcnMgZW1wdHkgc3RhdGUgd2hlbiBubyBncmFwaCBpcyBsb2FkZWQnLCAoKSA9PiB7XG4gIGNvbnN0IGh0bWwgPSByZW5kZXJXaXRoQ29udGV4dCg8VXBsb2FkZWRHcmFwaFdvcmtzcGFjZSAvPiwge30sIFsnL2dyYXBocy93b3Jrc3BhY2UnXSk7XG5cbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9ObyBVcGxvYWRlZCBHcmFwaCBMb2FkZWQvKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9VcGxvYWQgR3JhcGggSlNPTi8pO1xufSk7XG5cbnRlc3QoJ3VwbG9hZGVkIGdyYXBoIHdvcmtzcGFjZSByZW5kZXJzIGRvY3VtZW50LXN0eWxlIHZpZXdlciBmb3IgZG9jdW1lbnQgYXJ0aWZhY3RzJywgKCkgPT4ge1xuICBjb25zdCBncmFwaERhdGEgPSBjcmVhdGVTYW1wbGVEb2N1bWVudEdyYXBoRGF0YSgpO1xuICBjb25zdCBodG1sID0gcmVuZGVyV2l0aENvbnRleHQoXG4gICAgPFVwbG9hZGVkR3JhcGhXb3Jrc3BhY2UgLz4sXG4gICAge1xuICAgICAgdXBsb2FkZWRHcmFwaDoge1xuICAgICAgICAuLi5jcmVhdGVNb2NrQ29udGV4dCgpLnVwbG9hZGVkR3JhcGgsXG4gICAgICAgIHN0YXR1czogJ3JlYWR5JyxcbiAgICAgICAga2luZDogJ2RvY3VtZW50JyxcbiAgICAgICAgZG9jdW1lbnREYXRhOiBncmFwaERhdGEsXG4gICAgICAgIGZpbGVuYW1lOiAnbWVyZ2VkX2RvY3VtZW50X2dyYXBoLmpzb24nLFxuICAgICAgfSxcbiAgICB9LFxuICAgIFsnL2dyYXBocy93b3Jrc3BhY2UnXVxuICApO1xuXG4gIGFzc2VydC5tYXRjaChodG1sLCAvVXBsb2FkZWQgRG9jdW1lbnQgR3JhcGggV29ya3NwYWNlLyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvQXV0by1kZXRlY3RlZCBkb2N1bWVudCBhcnRpZmFjdC8pO1xuICBhc3NlcnQubWF0Y2goaHRtbCwgL21lcmdlZF9kb2N1bWVudF9ncmFwaFxcLmpzb24vaSk7XG59KTtcblxudGVzdCgnZG9jdW1lbnQgb3ZlcnZpZXcgcmVuZGVycyB0aGUgbG9hZGVkIGRvY3VtZW50IGdyYXBoIHN1bW1hcnknLCAoKSA9PiB7XG4gIGNvbnN0IGdyYXBoRGF0YSA9IGNyZWF0ZVNhbXBsZURvY3VtZW50R3JhcGhEYXRhKCk7XG4gIGNvbnN0IGh0bWwgPSByZW5kZXJUb1N0YXRpY01hcmt1cCg8RG9jdW1lbnRPdmVydmlldyBncmFwaERhdGE9e2dyYXBoRGF0YX0gLz4pO1xuXG4gIGFzc2VydC5tYXRjaChodG1sLCAvRG9jdW1lbnQgT3ZlcnZpZXcvKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9Eb2N1bWVudCBOb2Rlcy8pO1xuICBhc3NlcnQubWF0Y2goaHRtbCwgL0V2aWRlbmNlIEl0ZW1zLyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvUmV0ZW50aW9uIFBvbGljeS8pO1xufSk7XG5cbnRlc3QoJ2RvY3VtZW50IHdvcmtzcGFjZSByZW5kZXJzIHNvdXJjZS1tYXRlcmlhbCBkb3dubG9hZHMgd2hlbiBhcnRpZmFjdHMgYXJlIGF2YWlsYWJsZScsICgpID0+IHtcbiAgY29uc3QgZ3JhcGhEYXRhID0gY3JlYXRlU2FtcGxlRG9jdW1lbnRHcmFwaERhdGEoKTtcbiAgY29uc3QgaHRtbCA9IHJlbmRlcldpdGhDb250ZXh0KFxuICAgIDxEb2N1bWVudFdvcmtzcGFjZSAvPixcbiAgICB7XG4gICAgICBkb2N1bWVudEdyYXBoOiB7XG4gICAgICAgIC4uLmNyZWF0ZU1vY2tDb250ZXh0KCkuZG9jdW1lbnRHcmFwaCxcbiAgICAgICAgc3RhdHVzOiAncmVhZHknLFxuICAgICAgICBkYXRhOiBncmFwaERhdGEsXG4gICAgICAgIGFydGlmYWN0czoge1xuICAgICAgICAgIGluZ2VzdGlvbl9pZDogJ2RvYy0xMjMnLFxuICAgICAgICAgIGJ1bmRsZToge1xuICAgICAgICAgICAgZmlsZW5hbWU6ICdkb2N1bWVudF9zb3VyY2VfbWF0ZXJpYWxzLnppcCcsXG4gICAgICAgICAgICBkb3dubG9hZF91cmw6ICcvYXBpL2RvY3VtZW50L2FydGlmYWN0cy9kb2MtMTIzL2J1bmRsZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBhcnRpZmFjdHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgaWQ6ICdmaW5hbC1tYXJrZG93bicsXG4gICAgICAgICAgICAgIHR5cGU6ICdmaW5hbC1tYXJrZG93bicsXG4gICAgICAgICAgICAgIGZpbGVuYW1lOiAnc291cmNlX2RvY3VtZW50Lm1kJyxcbiAgICAgICAgICAgICAgcmVsYXRpdmVfcGF0aDogJ3NvdXJjZV9kb2N1bWVudC5tZCcsXG4gICAgICAgICAgICAgIHNpemVfYnl0ZXM6IDEyOCxcbiAgICAgICAgICAgICAgZG93bmxvYWRfdXJsOiAnL2FwaS9kb2N1bWVudC9hcnRpZmFjdHMvZG9jLTEyMy9maWxlcy9maW5hbC1tYXJrZG93bicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBpZDogJ21lcmdlZC1qc29uJyxcbiAgICAgICAgICAgICAgdHlwZTogJ21lcmdlZC1qc29uJyxcbiAgICAgICAgICAgICAgZmlsZW5hbWU6ICdtZXJnZWRfZG9jdW1lbnRfZ3JhcGguanNvbicsXG4gICAgICAgICAgICAgIHJlbGF0aXZlX3BhdGg6ICdtZXJnZWRfZG9jdW1lbnRfZ3JhcGguanNvbicsXG4gICAgICAgICAgICAgIHNpemVfYnl0ZXM6IDI1NixcbiAgICAgICAgICAgICAgZG93bmxvYWRfdXJsOiAnL2FwaS9kb2N1bWVudC9hcnRpZmFjdHMvZG9jLTEyMy9maWxlcy9tZXJnZWQtanNvbicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgY2h1bmtfYXJ0aWZhY3RzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlkOiAnY2h1bmstc291cmNlX2RvY3VtZW50X3BhcnRfMDAxJyxcbiAgICAgICAgICAgICAgdHlwZTogJ2NodW5rLW1hcmtkb3duJyxcbiAgICAgICAgICAgICAgZmlsZW5hbWU6ICdzb3VyY2VfZG9jdW1lbnRfcGFydF8wMDEubWQnLFxuICAgICAgICAgICAgICByZWxhdGl2ZV9wYXRoOiAnY2h1bmtzL3NvdXJjZV9kb2N1bWVudF9wYXJ0XzAwMS5tZCcsXG4gICAgICAgICAgICAgIHNpemVfYnl0ZXM6IDY0LFxuICAgICAgICAgICAgICBkb3dubG9hZF91cmw6ICcvYXBpL2RvY3VtZW50L2FydGlmYWN0cy9kb2MtMTIzL2ZpbGVzL2NodW5rLXNvdXJjZV9kb2N1bWVudF9wYXJ0XzAwMScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGFydGlmYWN0c0Vycm9yOiBudWxsLFxuICAgICAgfSxcbiAgICB9LFxuICAgIFsnL2RvY3VtZW50cy93b3Jrc3BhY2UnXVxuICApO1xuXG4gIGFzc2VydC5tYXRjaChodG1sLCAvRG93bmxvYWQgU291cmNlIE1hdGVyaWFscy8pO1xuICBhc3NlcnQubWF0Y2goaHRtbCwgL0Rvd25sb2FkIEJ1bmRsZS8pO1xuICBhc3NlcnQubWF0Y2goaHRtbCwgL0RvY3VtZW50IEtub3dsZWRnZSBHcmFwaC8pO1xuICBhc3NlcnQubWF0Y2goaHRtbCwgL0V2aWRlbmNlIFxcLyBTb3VyY2UgRGV0YWlsLyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvc291cmNlX2RvY3VtZW50XFwubWQvKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9tZXJnZWRfZG9jdW1lbnRfZ3JhcGhcXC5qc29uLyk7XG4gIGFzc2VydC5tYXRjaChodG1sLCAvc291cmNlX2RvY3VtZW50X3BhcnRfMDAxXFwubWQvKTtcbn0pO1xuXG50ZXN0KCdkb2N1bWVudCB3b3Jrc3BhY2Ugc2hvd3MgYXJ0aWZhY3QgZXJyb3Igd2l0aG91dCBibG9ja2luZyB0aGUgZ3JhcGggd29ya3NwYWNlJywgKCkgPT4ge1xuICBjb25zdCBncmFwaERhdGEgPSBjcmVhdGVTYW1wbGVEb2N1bWVudEdyYXBoRGF0YSgpO1xuICBjb25zdCBodG1sID0gcmVuZGVyV2l0aENvbnRleHQoXG4gICAgPERvY3VtZW50V29ya3NwYWNlIC8+LFxuICAgIHtcbiAgICAgIGRvY3VtZW50R3JhcGg6IHtcbiAgICAgICAgLi4uY3JlYXRlTW9ja0NvbnRleHQoKS5kb2N1bWVudEdyYXBoLFxuICAgICAgICBzdGF0dXM6ICdyZWFkeScsXG4gICAgICAgIGRhdGE6IGdyYXBoRGF0YSxcbiAgICAgICAgYXJ0aWZhY3RzOiBudWxsLFxuICAgICAgICBhcnRpZmFjdHNFcnJvcjogJ1NvdXJjZSBtYXRlcmlhbHMgYXJlIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlLicsXG4gICAgICB9LFxuICAgIH0sXG4gICAgWycvZG9jdW1lbnRzL3dvcmtzcGFjZSddXG4gICk7XG5cbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9Eb2N1bWVudCBHcmFwaCBXb3Jrc3BhY2UvKTtcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9Tb3VyY2UgbWF0ZXJpYWxzIGFyZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZVxcLi8pO1xufSk7XG5cbnRlc3QoJ2RvY3VtZW50IHdvcmtzcGFjZSBleHBsYWlucyB3aGVuIGRvd25sb2FkcyBhcmUgdW5hdmFpbGFibGUnLCAoKSA9PiB7XG4gIGNvbnN0IGdyYXBoRGF0YSA9IGNyZWF0ZVNhbXBsZURvY3VtZW50R3JhcGhEYXRhKCk7XG4gIGNvbnN0IGh0bWwgPSByZW5kZXJXaXRoQ29udGV4dChcbiAgICA8RG9jdW1lbnRXb3Jrc3BhY2UgLz4sXG4gICAge1xuICAgICAgZG9jdW1lbnRHcmFwaDoge1xuICAgICAgICAuLi5jcmVhdGVNb2NrQ29udGV4dCgpLmRvY3VtZW50R3JhcGgsXG4gICAgICAgIHN0YXR1czogJ3JlYWR5JyxcbiAgICAgICAgZGF0YTogZ3JhcGhEYXRhLFxuICAgICAgICBhcnRpZmFjdHM6IG51bGwsXG4gICAgICAgIGFydGlmYWN0c0Vycm9yOiBudWxsLFxuICAgICAgfSxcbiAgICB9LFxuICAgIFsnL2RvY3VtZW50cy93b3Jrc3BhY2UnXVxuICApO1xuXG4gIGFzc2VydC5tYXRjaChodG1sLCAvU291cmNlIG1hdGVyaWFsIGRvd25sb2FkcyBhcmUgbm90IGF2YWlsYWJsZSBmb3IgdGhpcyBkb2N1bWVudCB5ZXRcXC4vKTtcbn0pO1xuXG50ZXN0KCdkb2N1bWVudCB3b3Jrc3BhY2UgdXNlcyBhIHNjcm9sbGFibGUgcGFnZSBsYXlvdXQgaW5zdGVhZCBvZiBhIHZpZXdwb3J0LWxvY2tlZCBzaGVsbCcsICgpID0+IHtcbiAgY29uc3QgZ3JhcGhEYXRhID0gY3JlYXRlU2FtcGxlRG9jdW1lbnRHcmFwaERhdGEoKTtcbiAgY29uc3QgaHRtbCA9IHJlbmRlcldpdGhDb250ZXh0KFxuICAgIDxEb2N1bWVudFdvcmtzcGFjZSAvPixcbiAgICB7XG4gICAgICBkb2N1bWVudEdyYXBoOiB7XG4gICAgICAgIC4uLmNyZWF0ZU1vY2tDb250ZXh0KCkuZG9jdW1lbnRHcmFwaCxcbiAgICAgICAgc3RhdHVzOiAncmVhZHknLFxuICAgICAgICBkYXRhOiBncmFwaERhdGEsXG4gICAgICAgIGFydGlmYWN0czogbnVsbCxcbiAgICAgICAgYXJ0aWZhY3RzRXJyb3I6IG51bGwsXG4gICAgICB9LFxuICAgIH0sXG4gICAgWycvZG9jdW1lbnRzL3dvcmtzcGFjZSddXG4gICk7XG5cbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9taW4taC1zY3JlZW4gYmctXFxbIzBGMTcyQVxcXS8pO1xuICBhc3NlcnQuZG9lc05vdE1hdGNoKGh0bWwsIC9oLXNjcmVlbiBvdmVyZmxvdy1oaWRkZW4gYmctXFxbIzBGMTcyQVxcXS8pO1xufSk7XG4iLCAiZXhwb3J0IGZ1bmN0aW9uIGluc3RhbGxSdW50aW1lV2luZG93Q29uZmlnKG92ZXJyaWRlczogUGFydGlhbDxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXI+PiA9IHt9KSB7XG4gIGNvbnN0IHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IChjYWxsYmFjazogRnJhbWVSZXF1ZXN0Q2FsbGJhY2spID0+IHNldFRpbWVvdXQoKCkgPT4gY2FsbGJhY2soRGF0ZS5ub3coKSksIDApO1xuICBjb25zdCBjYW5jZWxBbmltYXRpb25GcmFtZSA9IChoYW5kbGU6IG51bWJlcikgPT4gY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICd3aW5kb3cnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiB7XG4gICAgICBfX1RXSU5fQ09ORklHX186IHtcbiAgICAgICAgTUFYX1VQTE9BRF9NQjogNTAsXG4gICAgICAgIFBST0NFU1NJTkdfVElNRU9VVF9NUzogOTAwMDAsXG4gICAgICAgIEFQUF9FTlY6ICd0ZXN0JyxcbiAgICAgICAgLi4ub3ZlcnJpZGVzLFxuICAgICAgfSxcbiAgICAgIHNldFRpbWVvdXQsXG4gICAgICBjbGVhclRpbWVvdXQsXG4gICAgICBzZXRJbnRlcnZhbCxcbiAgICAgIGNsZWFySW50ZXJ2YWwsXG4gICAgICBhZGRFdmVudExpc3RlbmVyOiAoKSA9PiB7fSxcbiAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6ICgpID0+IHt9LFxuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUsXG4gICAgICBkZXZpY2VQaXhlbFJhdGlvOiAxLFxuICAgIH0sXG4gIH0pO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnZG9jdW1lbnQnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiB7XG4gICAgICBjcmVhdGVFbGVtZW50OiAoKSA9PiAoe1xuICAgICAgICBnZXRDb250ZXh0OiAoKSA9PiAoe30pLFxuICAgICAgICBzdHlsZToge30sXG4gICAgICAgIHNldEF0dHJpYnV0ZTogKCkgPT4ge30sXG4gICAgICAgIGFwcGVuZENoaWxkOiAoKSA9PiB7fSxcbiAgICAgIH0pLFxuICAgICAgYm9keToge1xuICAgICAgICBhcHBlbmRDaGlsZDogKCkgPT4ge30sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnbmF2aWdhdG9yJywge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICB2YWx1ZToge1xuICAgICAgdXNlckFnZW50OiAnbm9kZS5qcycsXG4gICAgfSxcbiAgfSk7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICdyZXF1ZXN0QW5pbWF0aW9uRnJhbWUnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXG4gIH0pO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnY2FuY2VsQW5pbWF0aW9uRnJhbWUnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiBjYW5jZWxBbmltYXRpb25GcmFtZSxcbiAgfSk7XG5cbiAgaWYgKCEoJ1Jlc2l6ZU9ic2VydmVyJyBpbiBnbG9iYWxUaGlzKSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnUmVzaXplT2JzZXJ2ZXInLCB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIHZhbHVlOiBjbGFzcyBSZXNpemVPYnNlcnZlciB7XG4gICAgICAgIG9ic2VydmUoKSB7fVxuICAgICAgICB1bm9ic2VydmUoKSB7fVxuICAgICAgICBkaXNjb25uZWN0KCkge31cbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNhbXBsZUdyYXBoRGF0YSgpIHtcbiAgY29uc3Qgbm9kZXMgPSBbXG4gICAge1xuICAgICAgaWQ6ICdhcGknLFxuICAgICAgbmFtZTogJ0FQSSBTZXJ2aWNlJyxcbiAgICAgIHR5cGU6ICdzb2Z0d2FyZScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvcmUgQVBJJyxcbiAgICAgIHJpc2tTY29yZTogODIsXG4gICAgICByaXNrTGV2ZWw6ICdoaWdoJyxcbiAgICAgIGRlZ3JlZTogMixcbiAgICAgIGJldHdlZW5uZXNzOiAwLjU1LFxuICAgICAgY2xvc2VuZXNzOiAwLjY3LFxuICAgICAgYmxhc3RSYWRpdXM6IDMsXG4gICAgICBkZXBlbmRlbmN5U3BhbjogMixcbiAgICAgIHJpc2tFeHBsYW5hdGlvbjogJ0hhbmRsZXMgY29yZSByZXF1ZXN0cy4nLFxuICAgICAgc291cmNlOiAnc2FtcGxlJyxcbiAgICAgIGRlcGVuZGVuY2llczogWydkYiddLFxuICAgICAgZGVwZW5kZW50czogWydmcm9udGVuZCddLFxuICAgICAgdmFsOiAzNixcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAnZGInLFxuICAgICAgbmFtZTogJ0RhdGFiYXNlJyxcbiAgICAgIHR5cGU6ICdkYXRhJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUGVyc2lzdGVuY2UgbGF5ZXInLFxuICAgICAgcmlza1Njb3JlOiA0NCxcbiAgICAgIHJpc2tMZXZlbDogJ21lZGl1bScsXG4gICAgICBkZWdyZWU6IDEsXG4gICAgICBiZXR3ZWVubmVzczogMC4yMixcbiAgICAgIGNsb3NlbmVzczogMC40NCxcbiAgICAgIGJsYXN0UmFkaXVzOiAxLFxuICAgICAgZGVwZW5kZW5jeVNwYW46IDEsXG4gICAgICByaXNrRXhwbGFuYXRpb246ICdTdG9yZXMgcmVjb3Jkcy4nLFxuICAgICAgc291cmNlOiAnc2FtcGxlJyxcbiAgICAgIGRlcGVuZGVuY2llczogW10sXG4gICAgICBkZXBlbmRlbnRzOiBbJ2FwaSddLFxuICAgICAgdmFsOiAyOCxcbiAgICB9LFxuICBdO1xuXG4gIHJldHVybiB7XG4gICAgc291cmNlOiAnc2FtcGxlJyxcbiAgICBub2RlcyxcbiAgICBsaW5rczogW1xuICAgICAge1xuICAgICAgICBpZDogJ2FwaS1kYi0wJyxcbiAgICAgICAgc291cmNlOiAnYXBpJyxcbiAgICAgICAgdGFyZ2V0OiAnZGInLFxuICAgICAgICByZWxhdGlvbjogJ2RlcGVuZHNfb24nLFxuICAgICAgICByYXRpb25hbGU6ICdSZWFkcyBhbmQgd3JpdGVzIHJlY29yZHMuJyxcbiAgICAgIH0sXG4gICAgXSxcbiAgICBub2RlSW5kZXg6IE9iamVjdC5mcm9tRW50cmllcyhub2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLmlkLCBub2RlXSkpLFxuICAgIHJlbGF0aW9uVHlwZXM6IFsnZGVwZW5kc19vbiddLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2FtcGxlTWVyZ2VkR3JhcGhEYXRhKCkge1xuICByZXR1cm4ge1xuICAgIG5vZGVzOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnYXBpJyxcbiAgICAgICAgbmFtZTogJ0FQSSBTZXJ2aWNlJyxcbiAgICAgICAgdHlwZTogJ3NvZnR3YXJlJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdDb3JlIEFQSScsXG4gICAgICAgIHJpc2tfc2NvcmU6IDgyLFxuICAgICAgICByaXNrX2xldmVsOiAnaGlnaCcsXG4gICAgICAgIGRlZ3JlZTogMixcbiAgICAgICAgYmV0d2Vlbm5lc3M6IDAuNTUsXG4gICAgICAgIGNsb3NlbmVzczogMC42NyxcbiAgICAgICAgYmxhc3RfcmFkaXVzOiAzLFxuICAgICAgICBkZXBlbmRlbmN5X3NwYW46IDIsXG4gICAgICAgIHJpc2tfZXhwbGFuYXRpb246ICdIYW5kbGVzIGNvcmUgcmVxdWVzdHMuJyxcbiAgICAgICAgc291cmNlOiAnc2FtcGxlJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiAnZGInLFxuICAgICAgICBuYW1lOiAnRGF0YWJhc2UnLFxuICAgICAgICB0eXBlOiAnZGF0YScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnUGVyc2lzdGVuY2UgbGF5ZXInLFxuICAgICAgICByaXNrX3Njb3JlOiA0NCxcbiAgICAgICAgcmlza19sZXZlbDogJ21lZGl1bScsXG4gICAgICAgIGRlZ3JlZTogMSxcbiAgICAgICAgYmV0d2Vlbm5lc3M6IDAuMjIsXG4gICAgICAgIGNsb3NlbmVzczogMC40NCxcbiAgICAgICAgYmxhc3RfcmFkaXVzOiAxLFxuICAgICAgICBkZXBlbmRlbmN5X3NwYW46IDEsXG4gICAgICAgIHJpc2tfZXhwbGFuYXRpb246ICdTdG9yZXMgcmVjb3Jkcy4nLFxuICAgICAgICBzb3VyY2U6ICdzYW1wbGUnLFxuICAgICAgfSxcbiAgICBdLFxuICAgIGVkZ2VzOiBbXG4gICAgICB7XG4gICAgICAgIHNvdXJjZTogJ2FwaScsXG4gICAgICAgIHRhcmdldDogJ2RiJyxcbiAgICAgICAgcmVsYXRpb246ICdkZXBlbmRzX29uJyxcbiAgICAgICAgcmF0aW9uYWxlOiAnUmVhZHMgYW5kIHdyaXRlcyByZWNvcmRzLicsXG4gICAgICB9LFxuICAgIF0sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTYW1wbGVEb2N1bWVudEdyYXBoRGF0YSgpIHtcbiAgY29uc3Qgbm9kZXMgPSBbXG4gICAge1xuICAgICAgaWQ6ICdEMScsXG4gICAgICBsYWJlbDogJ1JldGVudGlvbiBQb2xpY3knLFxuICAgICAga2luZDogJ3JlcXVpcmVtZW50JyxcbiAgICAgIGNhbm9uaWNhbE5hbWU6ICdSZXRlbnRpb24gUG9saWN5JyxcbiAgICAgIGFsaWFzZXM6IFsncmVjb3JkcyBwb2xpY3knXSxcbiAgICAgIHN1bW1hcnk6ICdEZWZpbmVzIHJlY29yZCByZXRlbnRpb24uJyxcbiAgICAgIGV2aWRlbmNlOiBbeyBxdW90ZTogJ1JlY29yZHMgYXJlIHJldGFpbmVkIGZvciA3IHllYXJzLicsIHBhZ2VTdGFydDogMSwgcGFnZUVuZDogMSB9XSxcbiAgICAgIHNvdXJjZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGRvY3VtZW50TmFtZTogJ3BvbGljeS5wZGYnLFxuICAgICAgICAgIGNodW5rRmlsZTogJ2NodW5rXzAxLnR4dCcsXG4gICAgICAgICAgY2h1bmtJZDogJ2NodW5rXzAxJyxcbiAgICAgICAgICBwZGZQYWdlU3RhcnQ6IDEsXG4gICAgICAgICAgcGRmUGFnZUVuZDogMSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBkZWdyZWU6IDEsXG4gICAgICBzb3VyY2U6ICdkb2N1bWVudCcsXG4gICAgICB2YWw6IDIwLFxuICAgIH0sXG4gICAge1xuICAgICAgaWQ6ICdEMicsXG4gICAgICBsYWJlbDogJ1NldmVuIFllYXJzJyxcbiAgICAgIGtpbmQ6ICdkYXRlJyxcbiAgICAgIGNhbm9uaWNhbE5hbWU6ICdTZXZlbiBZZWFycycsXG4gICAgICBhbGlhc2VzOiBbXSxcbiAgICAgIHN1bW1hcnk6ICdSZXRlbnRpb24gZHVyYXRpb24uJyxcbiAgICAgIGV2aWRlbmNlOiBbeyBxdW90ZTogJzcgeWVhcnMnLCBwYWdlU3RhcnQ6IDEsIHBhZ2VFbmQ6IDEgfV0sXG4gICAgICBzb3VyY2VzOiBbXSxcbiAgICAgIGRlZ3JlZTogMSxcbiAgICAgIHNvdXJjZTogJ2RvY3VtZW50JyxcbiAgICAgIHZhbDogMjAsXG4gICAgfSxcbiAgXTtcblxuICByZXR1cm4ge1xuICAgIHNvdXJjZTogJ2RvY3VtZW50JyxcbiAgICBpbmdlc3Rpb25JZDogJ2RvYy0xMjMnLFxuICAgIG5vZGVzLFxuICAgIGxpbmtzOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnREUxJyxcbiAgICAgICAgc291cmNlOiAnRDEnLFxuICAgICAgICB0YXJnZXQ6ICdEMicsXG4gICAgICAgIHR5cGU6ICdyZXF1aXJlcycsXG4gICAgICAgIHN1bW1hcnk6ICdSZXRlbnRpb24gcG9saWN5IHJlcXVpcmVzIHNldmVuIHllYXJzLicsXG4gICAgICAgIGV2aWRlbmNlOiBbeyBxdW90ZTogJ3JldGFpbmVkIGZvciA3IHllYXJzJywgcGFnZVN0YXJ0OiAxLCBwYWdlRW5kOiAxIH1dLFxuICAgICAgICBzb3VyY2VDaHVuazoge1xuICAgICAgICAgIGRvY3VtZW50TmFtZTogJ3BvbGljeS5wZGYnLFxuICAgICAgICAgIGNodW5rRmlsZTogJ2NodW5rXzAxLnR4dCcsXG4gICAgICAgICAgY2h1bmtJZDogJ2NodW5rXzAxJyxcbiAgICAgICAgICBwZGZQYWdlU3RhcnQ6IDEsXG4gICAgICAgICAgcGRmUGFnZUVuZDogMSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgXSxcbiAgICBub2RlSW5kZXg6IE9iamVjdC5mcm9tRW50cmllcyhub2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLmlkLCBub2RlXSkpLFxuICAgIGtpbmRUeXBlczogWydkYXRlJywgJ3JlcXVpcmVtZW50J10sXG4gICAgcmVsYXRpb25UeXBlczogWydyZXF1aXJlcyddLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTW9ja0NvbnRleHQob3ZlcnJpZGVzID0ge30pIHtcbiAgcmV0dXJuIHtcbiAgICB1cGxvYWQ6IHtcbiAgICAgIHBoYXNlOiAnaWRsZScsXG4gICAgICBzZWxlY3RlZEZpbGU6IG51bGwsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWQgYSAubWQgb3IgLnR4dCBmaWxlIHRvIGJ1aWxkIHRoZSBncmFwaC4nLFxuICAgICAgaW5nZXN0aW9uSWQ6IG51bGwsXG4gICAgICBpbmdlc3Rpb246IG51bGwsXG4gICAgICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxuICAgICAgc3RhcnRlZEF0OiBudWxsLFxuICAgICAgY29tcGxldGVkQXQ6IG51bGwsXG4gICAgICByZXRyeUNvdW50OiAwLFxuICAgIH0sXG4gICAgZ3JhcGg6IHtcbiAgICAgIHN0YXR1czogJ2lkbGUnLFxuICAgICAgZGF0YTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxuICAgIH0sXG4gICAgZG9jdW1lbnRVcGxvYWQ6IHtcbiAgICAgIHBoYXNlOiAnaWRsZScsXG4gICAgICBzZWxlY3RlZEZpbGU6IG51bGwsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWQgYSAucGRmLCAubWQsIG9yIC50eHQgZmlsZSB0byBidWlsZCBhIGRvY3VtZW50IGdyYXBoLicsXG4gICAgICBpbmdlc3Rpb25JZDogbnVsbCxcbiAgICAgIGluZ2VzdGlvbjogbnVsbCxcbiAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IG51bGwsXG4gICAgICBzdGFydGVkQXQ6IG51bGwsXG4gICAgICBjb21wbGV0ZWRBdDogbnVsbCxcbiAgICAgIHJldHJ5Q291bnQ6IDAsXG4gICAgfSxcbiAgICBkb2N1bWVudEdyYXBoOiB7XG4gICAgICBzdGF0dXM6ICdpZGxlJyxcbiAgICAgIGRhdGE6IG51bGwsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIGxhc3RMb2FkZWRBdDogbnVsbCxcbiAgICAgIGFydGlmYWN0czogbnVsbCxcbiAgICAgIGFydGlmYWN0c0Vycm9yOiBudWxsLFxuICAgIH0sXG4gICAgdXBsb2FkZWRHcmFwaFVwbG9hZDoge1xuICAgICAgcGhhc2U6ICdpZGxlJyxcbiAgICAgIHNlbGVjdGVkRmlsZTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgc3RhdHVzTWVzc2FnZTogJ1VwbG9hZCBhIG1lcmdlZF9ncmFwaC5qc29uIGZpbGUgdG8gaW5zcGVjdCBhIGZpbmFsaXplZCBrbm93bGVkZ2UgZ3JhcGguJyxcbiAgICB9LFxuICAgIHVwbG9hZGVkR3JhcGg6IHtcbiAgICAgIHN0YXR1czogJ2lkbGUnLFxuICAgICAga2luZDogbnVsbCxcbiAgICAgIG9wZXJhdGlvbmFsRGF0YTogbnVsbCxcbiAgICAgIGRvY3VtZW50RGF0YTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxuICAgICAgZmlsZW5hbWU6IG51bGwsXG4gICAgICByYXdEYXRhOiBudWxsLFxuICAgIH0sXG4gICAgc2V0RHJhZ0FjdGl2ZTogKCkgPT4ge30sXG4gICAgc2VsZWN0RmlsZTogKCkgPT4gdHJ1ZSxcbiAgICBjbGVhclNlbGVjdGVkRmlsZTogKCkgPT4ge30sXG4gICAgYmVnaW5Qcm9jZXNzaW5nOiBhc3luYyAoKSA9PiB7fSxcbiAgICBsb2FkR3JhcGg6IGFzeW5jICgpID0+IHt9LFxuICAgIHNldERvY3VtZW50RHJhZ0FjdGl2ZTogKCkgPT4ge30sXG4gICAgc2VsZWN0RG9jdW1lbnRGaWxlOiAoKSA9PiB0cnVlLFxuICAgIGNsZWFyU2VsZWN0ZWREb2N1bWVudEZpbGU6ICgpID0+IHt9LFxuICAgIGJlZ2luRG9jdW1lbnRQcm9jZXNzaW5nOiBhc3luYyAoKSA9PiB7fSxcbiAgICBsb2FkRG9jdW1lbnRHcmFwaDogYXN5bmMgKCkgPT4ge30sXG4gICAgc2V0VXBsb2FkZWRHcmFwaERyYWdBY3RpdmU6ICgpID0+IHt9LFxuICAgIHNlbGVjdFVwbG9hZGVkR3JhcGhGaWxlOiAoKSA9PiB0cnVlLFxuICAgIGNsZWFyU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZTogKCkgPT4ge30sXG4gICAgbG9hZFVwbG9hZGVkR3JhcGhGcm9tU2VsZWN0ZWRGaWxlOiBhc3luYyAoKSA9PiB7fSxcbiAgICByZXNldFVwbG9hZFN0YXRlOiAoKSA9PiB7fSxcbiAgICAuLi5vdmVycmlkZXMsXG4gIH07XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQTRCQSxTQUFTLGFBQWEsT0FBZ0IsT0FBZTtBQUNuRCxNQUFJLE9BQU8sVUFBVSxVQUFVO0FBQzdCLFVBQU0sSUFBSSxNQUFNLG9DQUFvQyxLQUFLLGtCQUFrQjtBQUFBLEVBQzdFO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxhQUFhLE9BQWdCLE9BQWU7QUFDbkQsTUFBSSxPQUFPLFVBQVUsWUFBWSxPQUFPLE1BQU0sS0FBSyxHQUFHO0FBQ3BELFVBQU0sSUFBSSxNQUFNLG9DQUFvQyxLQUFLLGtCQUFrQjtBQUFBLEVBQzdFO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxZQUFlLE9BQWdCLE9BQWU7QUFDckQsTUFBSSxDQUFDLE1BQU0sUUFBUSxLQUFLLEdBQUc7QUFDekIsVUFBTSxJQUFJLE1BQU0sb0NBQW9DLEtBQUssa0JBQWtCO0FBQUEsRUFDN0U7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLGNBQWMsTUFBb0IsZUFBc0MsY0FBZ0Q7QUFDL0gsU0FBTztBQUFBLElBQ0wsSUFBSSxhQUFhLEtBQUssSUFBSSxTQUFTO0FBQUEsSUFDbkMsTUFBTSxhQUFhLEtBQUssTUFBTSxXQUFXO0FBQUEsSUFDekMsTUFBTSxhQUFhLEtBQUss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Q2xCO0FBQUEsSUFDRjtBQUFBLElBQ0EsQ0FBQyxzQkFBc0I7QUFBQSxFQUN6QjtBQUVBLFNBQU8sTUFBTSxNQUFNLDZCQUE2QjtBQUNoRCxTQUFPLGFBQWEsTUFBTSx5Q0FBeUM7QUFDckUsQ0FBQzsiLAogICJuYW1lcyI6IFsianN4IiwgImpzeCIsICJqc3giLCAidXNlUmVmIiwgImpzeCIsICJqc3hzIiwgIkNoZWNrQ2lyY2xlMiIsICJqc3giLCAianN4cyIsICJ1c2VNZW1vIiwgInVzZVN0YXRlIiwgIkNoZWNrQ2lyY2xlMiIsICJMb2FkZXIyIiwgIk5ldHdvcmsiLCAidXNlTmF2aWdhdGUiLCAianN4IiwgImpzeHMiLCAiQWxlcnRUcmlhbmdsZSIsICJqc3giLCAianN4cyIsICJ1c2VSZWYiLCAiQ2hldnJvblJpZ2h0IiwgIkZpbGVUZXh0IiwgIk5ldHdvcmsiLCAiU2hpZWxkIiwgIlVwbG9hZCIsICJ1c2VOYXZpZ2F0ZSIsICJqc3giLCAianN4cyIsICJmb3JtYXRGaWxlU2l6ZSIsICJqc3giLCAidXNlRWZmZWN0IiwgInVzZU1lbW8iLCAidXNlU3RhdGUiLCAianN4IiwgImpzeHMiLCAiQm94ZXMiLCAiRmlsZVRleHQiLCAiR2l0QnJhbmNoIiwgImpzeCIsICJqc3hzIiwgImpzeCIsICJqc3hzIiwgInVzZUNhbGxiYWNrIiwgInVzZUVmZmVjdCIsICJ1c2VNZW1vIiwgInVzZVJlZiIsICJ1c2VTdGF0ZSIsICJOZXR3b3JrIiwgIlF1b3RlIiwgImpzeCIsICJqc3hzIiwgInVzZUVmZmVjdCIsICJ1c2VTdGF0ZSIsICJGaWxlVGV4dCIsICJMb2FkZXIyIiwgIk5ldHdvcmsiLCAiUmVmcmVzaENjdyIsICJVcGxvYWQiLCAidXNlTmF2aWdhdGUiLCAianN4IiwgImpzeHMiLCAiRG9jdW1lbnRHcmFwaFZpZXciLCAidXNlUmVmIiwgIkNoZXZyb25SaWdodCIsICJGaWxlSnNvbiIsICJOZXR3b3JrIiwgIlNoaWVsZCIsICJVcGxvYWQiLCAidXNlTmF2aWdhdGUiLCAianN4IiwgImpzeHMiLCAiZm9ybWF0RmlsZVNpemUiLCAidXNlRGVmZXJyZWRWYWx1ZSIsICJ1c2VFZmZlY3QiLCAidXNlTWVtbyIsICJ1c2VTdGF0ZSIsICJBcnJvd1VwRG93biIsICJFeHRlcm5hbExpbmsiLCAiRmlsdGVyIiwgIlNlYXJjaCIsICJGcmFnbWVudCIsICJqc3giLCAianN4cyIsICJwYWdlU2l6ZSIsICJBbGVydFRyaWFuZ2xlIiwgIkdpdEJyYW5jaCIsICJTaGllbGQiLCAianN4IiwgImpzeHMiLCAibGF6eSIsICJTdXNwZW5zZSIsICJ1c2VTdGF0ZSIsICJCYXJDaGFydDMiLCAiRmlsZUpzb24iLCAiRmlsZVRleHQiLCAiTGlzdCIsICJMb2FkZXIyIiwgIk5ldHdvcmsiLCAidXNlTmF2aWdhdGUiLCAianN4IiwgImpzeHMiLCAibmF2SXRlbXMiLCAiRG9jdW1lbnRHcmFwaFZpZXciLCAidXNlQ2FsbGJhY2siLCAidXNlRWZmZWN0IiwgInVzZU1lbW8iLCAidXNlUmVmIiwgInVzZVN0YXRlIiwgIkZvcmNlR3JhcGgyRCIsICJBbGVydFRyaWFuZ2xlIiwgIkluZm8iLCAiTWF4aW1pemUyIiwgIk5ldHdvcmsiLCAiUmVmcmVzaENjdyIsICJqc3giLCAianN4cyIsICJsYXp5IiwgIlN1c3BlbnNlIiwgInVzZU1lbW8iLCAidXNlU3RhdGUiLCAiQmFyQ2hhcnQzIiwgIkZpbGVKc29uIiwgIkxpc3QiLCAiTG9hZGVyMiIsICJOZXR3b3JrIiwgIlNoaWVsZCIsICJ1c2VOYXZpZ2F0ZSIsICJqc3giLCAianN4cyIsICJuYXZJdGVtcyIsICJHcmFwaFZpZXciLCAianN4IiwgIkFwcENvbnRleHQiLCAiTGFuZGluZ1BhZ2UiLCAiUHJvY2Vzc2luZ1BhZ2UiLCAiU3lzdGVtT3ZlcnZpZXciLCAiRG9jdW1lbnRVcGxvYWRQYWdlIiwgIkRvY3VtZW50V29ya3NwYWNlIiwgIkRvY3VtZW50T3ZlcnZpZXciLCAiVXBsb2FkZWRHcmFwaFVwbG9hZFBhZ2UiLCAiVXBsb2FkZWRHcmFwaFdvcmtzcGFjZSJdCn0K
