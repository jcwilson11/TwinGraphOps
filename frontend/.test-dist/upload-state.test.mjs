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

// tests/upload-state.test.ts
installRuntimeWindowConfig();
var stateModule = await Promise.resolve().then(() => (init_AppContext(), AppContext_exports));
var {
  createSelectedDocumentFileUploadState: createSelectedDocumentFileUploadState2,
  createSelectedFileUploadState: createSelectedFileUploadState2,
  createSelectedUploadedGraphFileState: createSelectedUploadedGraphFileState2,
  getFileExtension: getFileExtension2,
  parseUploadedGraphJson: parseUploadedGraphJson2,
  validateSelectedDocumentFile: validateSelectedDocumentFile2,
  validateSelectedFile: validateSelectedFile2,
  validateSelectedUploadedGraphFile: validateSelectedUploadedGraphFile2
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
  Object.defineProperty(file, "size", { configurable: true, value: 52 * 1024 * 1024 });
  const result = validateSelectedFile2(file, 50 * 1024 * 1024);
  assert.equal(result.phase, "error");
  assert.match(result.error || "", /50 MB upload limit/);
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
test("validateSelectedUploadedGraphFile rejects non-json files", () => {
  const file = new File(["bad"], "graph.md", { type: "text/markdown" });
  const result = validateSelectedUploadedGraphFile2(file, 10 * 1024 * 1024);
  assert.equal(result.phase, "error");
  assert.equal(result.error, "Only .json graph artifact files are supported.");
});
test("validateSelectedUploadedGraphFile accepts json files", () => {
  const file = new File(["{}"], "merged_graph.json", { type: "application/json" });
  const result = validateSelectedUploadedGraphFile2(file, 10 * 1024 * 1024);
  assert.deepEqual(result, createSelectedUploadedGraphFileState2(file));
});
test("parseUploadedGraphJson rejects malformed JSON text", () => {
  assert.throws(() => parseUploadedGraphJson2("{bad json}"), /not valid JSON/);
});
test("parseUploadedGraphJson rejects valid JSON with the wrong schema", () => {
  assert.throws(
    () => parseUploadedGraphJson2(JSON.stringify({ nodes: [{ id: "n1" }], edges: [] })),
    /supported operational or document graph artifact schema/
  );
});
test("parseUploadedGraphJson accepts finalized merged graph payloads", () => {
  const payload = parseUploadedGraphJson2(
    JSON.stringify({
      nodes: [
        {
          id: "api",
          name: "API",
          type: "software",
          description: "Core API",
          risk_score: 82,
          risk_level: "high",
          degree: 2,
          betweenness: 0.5,
          closeness: 0.6,
          blast_radius: 3,
          dependency_span: 2,
          risk_explanation: "Critical dependency hub.",
          source: "user"
        }
      ],
      edges: []
    })
  );
  assert.equal(payload.kind, "operational");
  assert.equal(payload.rawData.nodes[0].id, "api");
  assert.deepEqual(payload.rawData.edges, []);
});
test("parseUploadedGraphJson accepts merged_document_graph payloads", () => {
  const payload = parseUploadedGraphJson2(
    JSON.stringify({
      source: "document",
      nodes: [
        {
          id: "D1",
          label: "Retention Policy",
          kind: "requirement",
          canonical_name: "Retention Policy",
          aliases: ["records policy"],
          summary: "Defines retention.",
          evidence: [],
          sources: [],
          degree: 1,
          source: "document"
        }
      ],
      edges: [
        {
          id: "DE1",
          source: "D1",
          target: "D1",
          type: "references",
          summary: "Self reference in fixture only.",
          evidence: [],
          source_chunk: null
        }
      ]
    })
  );
  assert.equal(payload.kind, "document");
  assert.equal(payload.rawData.source, "document");
});
test("parseUploadedGraphJson accepts neo4j_document_payload-style payloads", () => {
  const payload = parseUploadedGraphJson2(
    JSON.stringify({
      source: "document",
      nodes: [
        {
          id: "D1",
          label: "Retention Policy",
          kind: "requirement",
          canonical_name: "Retention Policy",
          aliases: [],
          summary: "Defines retention.",
          evidence: [],
          sources: [],
          degree: 1,
          source: "document"
        }
      ],
      edges: []
    })
  );
  assert.equal(payload.kind, "document");
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2xpYi9hZGFwdGVycy50cyIsICIuLi9zcmMvbGliL2NvbmZpZy50cyIsICIuLi9zcmMvbGliL2FwaS50cyIsICIuLi9zcmMvc3RhdGUvQXBwQ29udGV4dC50c3giLCAiLi4vdGVzdHMvdXBsb2FkLXN0YXRlLnRlc3QudHMiLCAiLi4vdGVzdHMvdGVzdC11dGlscy50c3giXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB0eXBlIHtcbiAgQXBpRG9jdW1lbnRFZGdlLFxuICBBcGlEb2N1bWVudEV2aWRlbmNlLFxuICBBcGlEb2N1bWVudEdyYXBoRGF0YSxcbiAgQXBpRG9jdW1lbnROb2RlLFxuICBBcGlEb2N1bWVudFNvdXJjZSxcbiAgQXBpR3JhcGhEYXRhLFxuICBBcGlHcmFwaEVkZ2UsXG4gIEFwaUdyYXBoTm9kZSxcbiAgQXBpTWVyZ2VkR3JhcGhEYXRhLFxuICBBcGlNZXJnZWRHcmFwaEVkZ2UsXG4gIEFwaU1lcmdlZEdyYXBoTm9kZSxcbiAgSW1wYWN0UmVzcG9uc2UsXG4gIFJpc2tSZXNwb25zZSxcbn0gZnJvbSAnLi4vdHlwZXMvYXBpJztcbmltcG9ydCB0eXBlIHtcbiAgRG9jdW1lbnRFZGdlLFxuICBEb2N1bWVudEV2aWRlbmNlLFxuICBEb2N1bWVudEdyYXBoRGF0YSxcbiAgRG9jdW1lbnROb2RlLFxuICBEb2N1bWVudFNvdXJjZSxcbiAgR3JhcGhEYXRhLFxuICBHcmFwaEVkZ2UsXG4gIEdyYXBoTm9kZSxcbiAgTm9kZURldGFpbHMsXG4gIE5vZGVSZWZlcmVuY2UsXG59IGZyb20gJy4uL3R5cGVzL2FwcCc7XG5cbmZ1bmN0aW9uIGVuc3VyZVN0cmluZyh2YWx1ZTogdW5rbm93biwgbGFiZWw6IHN0cmluZykge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWFsZm9ybWVkIEFQSSByZXNwb25zZTogZXhwZWN0ZWQgJHtsYWJlbH0gdG8gYmUgYSBzdHJpbmcuYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVOdW1iZXIodmFsdWU6IHVua25vd24sIGxhYmVsOiBzdHJpbmcpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicgfHwgTnVtYmVyLmlzTmFOKHZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWFsZm9ybWVkIEFQSSByZXNwb25zZTogZXhwZWN0ZWQgJHtsYWJlbH0gdG8gYmUgYSBudW1iZXIuYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVBcnJheTxUPih2YWx1ZTogdW5rbm93biwgbGFiZWw6IHN0cmluZykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNYWxmb3JtZWQgQVBJIHJlc3BvbnNlOiBleHBlY3RlZCAke2xhYmVsfSB0byBiZSBhbiBhcnJheS5gKTtcbiAgfVxuICByZXR1cm4gdmFsdWUgYXMgVFtdO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVOb2RlKG5vZGU6IEFwaUdyYXBoTm9kZSwgZGVwZW5kZW5jeU1hcDogTWFwPHN0cmluZywgc3RyaW5nW10+LCBkZXBlbmRlbnRNYXA6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPik6IEdyYXBoTm9kZSB7XG4gIHJldHVybiB7XG4gICAgaWQ6IGVuc3VyZVN0cmluZyhub2RlLmlkLCAnbm9kZS5pZCcpLFxuICAgIG5hbWU6IGVuc3VyZVN0cmluZyhub2RlLm5hbWUsICdub2RlLm5hbWUnKSxcbiAgICB0eXBlOiBlbnN1cmVTdHJpbmcobm9kZS50eXBlLCAnbm9kZS50eXBlJyksXG4gICAgZGVzY3JpcHRpb246IGVuc3VyZVN0cmluZyhub2RlLmRlc2NyaXB0aW9uLCAnbm9kZS5kZXNjcmlwdGlvbicpLFxuICAgIHJpc2tTY29yZTogZW5zdXJlTnVtYmVyKG5vZGUucmlza19zY29yZSwgJ25vZGUucmlza19zY29yZScpLFxuICAgIHJpc2tMZXZlbDogZW5zdXJlU3RyaW5nKG5vZGUucmlza19sZXZlbCwgJ25vZGUucmlza19sZXZlbCcpLFxuICAgIGRlZ3JlZTogZW5zdXJlTnVtYmVyKG5vZGUuZGVncmVlLCAnbm9kZS5kZWdyZWUnKSxcbiAgICBiZXR3ZWVubmVzczogZW5zdXJlTnVtYmVyKG5vZGUuYmV0d2Vlbm5lc3MsICdub2RlLmJldHdlZW5uZXNzJyksXG4gICAgY2xvc2VuZXNzOiBlbnN1cmVOdW1iZXIobm9kZS5jbG9zZW5lc3MsICdub2RlLmNsb3NlbmVzcycpLFxuICAgIGJsYXN0UmFkaXVzOiBlbnN1cmVOdW1iZXIobm9kZS5ibGFzdF9yYWRpdXMsICdub2RlLmJsYXN0X3JhZGl1cycpLFxuICAgIGRlcGVuZGVuY3lTcGFuOiBlbnN1cmVOdW1iZXIobm9kZS5kZXBlbmRlbmN5X3NwYW4sICdub2RlLmRlcGVuZGVuY3lfc3BhbicpLFxuICAgIHJpc2tFeHBsYW5hdGlvbjogZW5zdXJlU3RyaW5nKG5vZGUucmlza19leHBsYW5hdGlvbiwgJ25vZGUucmlza19leHBsYW5hdGlvbicpLFxuICAgIHNvdXJjZTogZW5zdXJlU3RyaW5nKG5vZGUuc291cmNlLCAnbm9kZS5zb3VyY2UnKSxcbiAgICBkZXBlbmRlbmNpZXM6IGRlcGVuZGVuY3lNYXAuZ2V0KG5vZGUuaWQpID8/IFtdLFxuICAgIGRlcGVuZGVudHM6IGRlcGVuZGVudE1hcC5nZXQobm9kZS5pZCkgPz8gW10sXG4gICAgdmFsOiAxOCArIE1hdGgucm91bmQoKG5vZGUucmlza19zY29yZSAvIDEwMCkgKiAyMiksXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUVkZ2UoZWRnZTogQXBpR3JhcGhFZGdlLCBpbmRleDogbnVtYmVyKTogR3JhcGhFZGdlIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogYCR7ZW5zdXJlU3RyaW5nKGVkZ2Uuc291cmNlLCAnZWRnZS5zb3VyY2UnKX0tJHtlbnN1cmVTdHJpbmcoZWRnZS50YXJnZXQsICdlZGdlLnRhcmdldCcpfS0ke2luZGV4fWAsXG4gICAgc291cmNlOiBlZGdlLnNvdXJjZSxcbiAgICB0YXJnZXQ6IGVkZ2UudGFyZ2V0LFxuICAgIHJlbGF0aW9uOiBlbnN1cmVTdHJpbmcoZWRnZS5yZWxhdGlvbiwgJ2VkZ2UucmVsYXRpb24nKSxcbiAgICByYXRpb25hbGU6IGVuc3VyZVN0cmluZyhlZGdlLnJhdGlvbmFsZSwgJ2VkZ2UucmF0aW9uYWxlJyksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGFwdEdyYXBoKGFwaUdyYXBoOiBBcGlHcmFwaERhdGEpOiBHcmFwaERhdGEge1xuICBjb25zdCBzb3VyY2UgPSBlbnN1cmVTdHJpbmcoYXBpR3JhcGguc291cmNlLCAnZ3JhcGguc291cmNlJyk7XG4gIGNvbnN0IGFwaU5vZGVzID0gZW5zdXJlQXJyYXk8QXBpR3JhcGhOb2RlPihhcGlHcmFwaC5ub2RlcywgJ2dyYXBoLm5vZGVzJyk7XG4gIGNvbnN0IGFwaUVkZ2VzID0gZW5zdXJlQXJyYXk8QXBpR3JhcGhFZGdlPihhcGlHcmFwaC5lZGdlcywgJ2dyYXBoLmVkZ2VzJyk7XG5cbiAgY29uc3QgZGVwZW5kZW5jeU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcbiAgY29uc3QgZGVwZW5kZW50TWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xuXG4gIGZvciAoY29uc3QgZWRnZSBvZiBhcGlFZGdlcykge1xuICAgIGNvbnN0IHNvdXJjZUlkID0gZW5zdXJlU3RyaW5nKGVkZ2Uuc291cmNlLCAnZWRnZS5zb3VyY2UnKTtcbiAgICBjb25zdCB0YXJnZXRJZCA9IGVuc3VyZVN0cmluZyhlZGdlLnRhcmdldCwgJ2VkZ2UudGFyZ2V0Jyk7XG4gICAgZGVwZW5kZW5jeU1hcC5zZXQoc291cmNlSWQsIFsuLi4oZGVwZW5kZW5jeU1hcC5nZXQoc291cmNlSWQpID8/IFtdKSwgdGFyZ2V0SWRdKTtcbiAgICBkZXBlbmRlbnRNYXAuc2V0KHRhcmdldElkLCBbLi4uKGRlcGVuZGVudE1hcC5nZXQodGFyZ2V0SWQpID8/IFtdKSwgc291cmNlSWRdKTtcbiAgfVxuXG4gIGNvbnN0IG5vZGVzID0gYXBpTm9kZXMubWFwKChub2RlKSA9PiBub3JtYWxpemVOb2RlKG5vZGUsIGRlcGVuZGVuY3lNYXAsIGRlcGVuZGVudE1hcCkpO1xuICBjb25zdCBsaW5rcyA9IGFwaUVkZ2VzLm1hcCgoZWRnZSwgaW5kZXgpID0+IG5vcm1hbGl6ZUVkZ2UoZWRnZSwgaW5kZXgpKTtcbiAgY29uc3Qgbm9kZUluZGV4ID0gT2JqZWN0LmZyb21FbnRyaWVzKG5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUuaWQsIG5vZGVdKSk7XG4gIGNvbnN0IHJlbGF0aW9uVHlwZXMgPSBbLi4ubmV3IFNldChsaW5rcy5tYXAoKGVkZ2UpID0+IGVkZ2UucmVsYXRpb24pKV0uc29ydCgpO1xuXG4gIHJldHVybiB7XG4gICAgc291cmNlLFxuICAgIG5vZGVzLFxuICAgIGxpbmtzLFxuICAgIG5vZGVJbmRleCxcbiAgICByZWxhdGlvblR5cGVzLFxuICB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVNZXJnZWROb2RlKG5vZGU6IEFwaU1lcmdlZEdyYXBoTm9kZSwgZGVwZW5kZW5jeU1hcDogTWFwPHN0cmluZywgc3RyaW5nW10+LCBkZXBlbmRlbnRNYXA6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPik6IEdyYXBoTm9kZSB7XG4gIHJldHVybiB7XG4gICAgaWQ6IGVuc3VyZVN0cmluZyhub2RlLmlkLCAnbWVyZ2VkLm5vZGUuaWQnKSxcbiAgICBuYW1lOiBlbnN1cmVTdHJpbmcobm9kZS5uYW1lLCAnbWVyZ2VkLm5vZGUubmFtZScpLFxuICAgIHR5cGU6IGVuc3VyZVN0cmluZyhub2RlLnR5cGUsICdtZXJnZWQubm9kZS50eXBlJyksXG4gICAgZGVzY3JpcHRpb246IGVuc3VyZVN0cmluZyhub2RlLmRlc2NyaXB0aW9uLCAnbWVyZ2VkLm5vZGUuZGVzY3JpcHRpb24nKSxcbiAgICByaXNrU2NvcmU6IGVuc3VyZU51bWJlcihub2RlLnJpc2tfc2NvcmUsICdtZXJnZWQubm9kZS5yaXNrX3Njb3JlJyksXG4gICAgcmlza0xldmVsOiBlbnN1cmVTdHJpbmcobm9kZS5yaXNrX2xldmVsLCAnbWVyZ2VkLm5vZGUucmlza19sZXZlbCcpLFxuICAgIGRlZ3JlZTogZW5zdXJlTnVtYmVyKG5vZGUuZGVncmVlLCAnbWVyZ2VkLm5vZGUuZGVncmVlJyksXG4gICAgYmV0d2Vlbm5lc3M6IGVuc3VyZU51bWJlcihub2RlLmJldHdlZW5uZXNzLCAnbWVyZ2VkLm5vZGUuYmV0d2Vlbm5lc3MnKSxcbiAgICBjbG9zZW5lc3M6IGVuc3VyZU51bWJlcihub2RlLmNsb3NlbmVzcywgJ21lcmdlZC5ub2RlLmNsb3NlbmVzcycpLFxuICAgIGJsYXN0UmFkaXVzOiBlbnN1cmVOdW1iZXIobm9kZS5ibGFzdF9yYWRpdXMsICdtZXJnZWQubm9kZS5ibGFzdF9yYWRpdXMnKSxcbiAgICBkZXBlbmRlbmN5U3BhbjogZW5zdXJlTnVtYmVyKG5vZGUuZGVwZW5kZW5jeV9zcGFuLCAnbWVyZ2VkLm5vZGUuZGVwZW5kZW5jeV9zcGFuJyksXG4gICAgcmlza0V4cGxhbmF0aW9uOiBlbnN1cmVTdHJpbmcobm9kZS5yaXNrX2V4cGxhbmF0aW9uLCAnbWVyZ2VkLm5vZGUucmlza19leHBsYW5hdGlvbicpLFxuICAgIHNvdXJjZTogZW5zdXJlU3RyaW5nKG5vZGUuc291cmNlLCAnbWVyZ2VkLm5vZGUuc291cmNlJyksXG4gICAgZGVwZW5kZW5jaWVzOiBkZXBlbmRlbmN5TWFwLmdldChub2RlLmlkKSA/PyBbXSxcbiAgICBkZXBlbmRlbnRzOiBkZXBlbmRlbnRNYXAuZ2V0KG5vZGUuaWQpID8/IFtdLFxuICAgIHZhbDogMTggKyBNYXRoLnJvdW5kKChub2RlLnJpc2tfc2NvcmUgLyAxMDApICogMjIpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVNZXJnZWRFZGdlKGVkZ2U6IEFwaU1lcmdlZEdyYXBoRWRnZSwgaW5kZXg6IG51bWJlcik6IEdyYXBoRWRnZSB7XG4gIHJldHVybiB7XG4gICAgaWQ6IGAke2Vuc3VyZVN0cmluZyhlZGdlLnNvdXJjZSwgJ21lcmdlZC5lZGdlLnNvdXJjZScpfS0ke2Vuc3VyZVN0cmluZyhlZGdlLnRhcmdldCwgJ21lcmdlZC5lZGdlLnRhcmdldCcpfS0ke2luZGV4fWAsXG4gICAgc291cmNlOiBlZGdlLnNvdXJjZSxcbiAgICB0YXJnZXQ6IGVkZ2UudGFyZ2V0LFxuICAgIHJlbGF0aW9uOiBlbnN1cmVTdHJpbmcoZWRnZS5yZWxhdGlvbiwgJ21lcmdlZC5lZGdlLnJlbGF0aW9uJyksXG4gICAgcmF0aW9uYWxlOiBlbnN1cmVTdHJpbmcoZWRnZS5yYXRpb25hbGUsICdtZXJnZWQuZWRnZS5yYXRpb25hbGUnKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0TWVyZ2VkR3JhcGgoYXBpR3JhcGg6IEFwaU1lcmdlZEdyYXBoRGF0YSwgc291cmNlTGFiZWwgPSAndXBsb2FkZWQnKTogR3JhcGhEYXRhIHtcbiAgY29uc3QgYXBpTm9kZXMgPSBlbnN1cmVBcnJheTxBcGlNZXJnZWRHcmFwaE5vZGU+KGFwaUdyYXBoLm5vZGVzLCAnbWVyZ2VkLmdyYXBoLm5vZGVzJyk7XG4gIGNvbnN0IGFwaUVkZ2VzID0gZW5zdXJlQXJyYXk8QXBpTWVyZ2VkR3JhcGhFZGdlPihhcGlHcmFwaC5lZGdlcywgJ21lcmdlZC5ncmFwaC5lZGdlcycpO1xuXG4gIGNvbnN0IGRlcGVuZGVuY3lNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XG4gIGNvbnN0IGRlcGVuZGVudE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcblxuICBmb3IgKGNvbnN0IGVkZ2Ugb2YgYXBpRWRnZXMpIHtcbiAgICBjb25zdCBzb3VyY2VJZCA9IGVuc3VyZVN0cmluZyhlZGdlLnNvdXJjZSwgJ21lcmdlZC5lZGdlLnNvdXJjZScpO1xuICAgIGNvbnN0IHRhcmdldElkID0gZW5zdXJlU3RyaW5nKGVkZ2UudGFyZ2V0LCAnbWVyZ2VkLmVkZ2UudGFyZ2V0Jyk7XG4gICAgZGVwZW5kZW5jeU1hcC5zZXQoc291cmNlSWQsIFsuLi4oZGVwZW5kZW5jeU1hcC5nZXQoc291cmNlSWQpID8/IFtdKSwgdGFyZ2V0SWRdKTtcbiAgICBkZXBlbmRlbnRNYXAuc2V0KHRhcmdldElkLCBbLi4uKGRlcGVuZGVudE1hcC5nZXQodGFyZ2V0SWQpID8/IFtdKSwgc291cmNlSWRdKTtcbiAgfVxuXG4gIGNvbnN0IG5vZGVzID0gYXBpTm9kZXMubWFwKChub2RlKSA9PiBub3JtYWxpemVNZXJnZWROb2RlKG5vZGUsIGRlcGVuZGVuY3lNYXAsIGRlcGVuZGVudE1hcCkpO1xuICBjb25zdCBsaW5rcyA9IGFwaUVkZ2VzLm1hcCgoZWRnZSwgaW5kZXgpID0+IG5vcm1hbGl6ZU1lcmdlZEVkZ2UoZWRnZSwgaW5kZXgpKTtcbiAgY29uc3Qgbm9kZUluZGV4ID0gT2JqZWN0LmZyb21FbnRyaWVzKG5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUuaWQsIG5vZGVdKSk7XG4gIGNvbnN0IHJlbGF0aW9uVHlwZXMgPSBbLi4ubmV3IFNldChsaW5rcy5tYXAoKGVkZ2UpID0+IGVkZ2UucmVsYXRpb24pKV0uc29ydCgpO1xuXG4gIHJldHVybiB7XG4gICAgc291cmNlOiBub2Rlc1swXT8uc291cmNlIHx8IHNvdXJjZUxhYmVsLFxuICAgIG5vZGVzLFxuICAgIGxpbmtzLFxuICAgIG5vZGVJbmRleCxcbiAgICByZWxhdGlvblR5cGVzLFxuICB9O1xufVxuXG5mdW5jdGlvbiB0b05vZGVSZWZlcmVuY2Uobm9kZT86IEdyYXBoTm9kZSB8IG51bGwpOiBOb2RlUmVmZXJlbmNlIHwgbnVsbCB7XG4gIGlmICghbm9kZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpZDogbm9kZS5pZCxcbiAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgdHlwZTogbm9kZS50eXBlLFxuICB9O1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNZXRyaWModmFsdWU6IG51bWJlcikge1xuICByZXR1cm4gTnVtYmVyLmlzSW50ZWdlcih2YWx1ZSkgPyBTdHJpbmcodmFsdWUpIDogdmFsdWUudG9GaXhlZCgzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0Tm9kZURldGFpbHMoXG4gIGdyYXBoOiBHcmFwaERhdGEsXG4gIGNvbXBvbmVudElkOiBzdHJpbmcsXG4gIHJpc2s6IFJpc2tSZXNwb25zZSxcbiAgaW1wYWN0OiBJbXBhY3RSZXNwb25zZVxuKTogTm9kZURldGFpbHMge1xuICBjb25zdCBub2RlID0gZ3JhcGgubm9kZUluZGV4W2NvbXBvbmVudElkXTtcbiAgaWYgKCFub2RlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb21wb25lbnQgJyR7Y29tcG9uZW50SWR9JyBpcyBtaXNzaW5nIGZyb20gdGhlIGFjdGl2ZSBncmFwaC5gKTtcbiAgfVxuXG4gIGNvbnN0IGRlcGVuZGVuY2llcyA9IG5vZGUuZGVwZW5kZW5jaWVzXG4gICAgLm1hcCgoZGVwZW5kZW5jeUlkKSA9PiB0b05vZGVSZWZlcmVuY2UoZ3JhcGgubm9kZUluZGV4W2RlcGVuZGVuY3lJZF0pKVxuICAgIC5maWx0ZXIoKGNhbmRpZGF0ZSk6IGNhbmRpZGF0ZSBpcyBOb2RlUmVmZXJlbmNlID0+IEJvb2xlYW4oY2FuZGlkYXRlKSk7XG5cbiAgY29uc3QgYWZmZWN0ZWRTeXN0ZW1zID0gaW1wYWN0LmltcGFjdGVkX2NvbXBvbmVudHNcbiAgICAubWFwKChhZmZlY3RlZElkKSA9PiB0b05vZGVSZWZlcmVuY2UoZ3JhcGgubm9kZUluZGV4W2FmZmVjdGVkSWRdKSA/PyB7IGlkOiBhZmZlY3RlZElkLCBuYW1lOiBhZmZlY3RlZElkLCB0eXBlOiAndW5rbm93bicgfSlcbiAgICAuZmlsdGVyKChjYW5kaWRhdGUpOiBjYW5kaWRhdGUgaXMgTm9kZVJlZmVyZW5jZSA9PiBCb29sZWFuKGNhbmRpZGF0ZSkpO1xuXG4gIGNvbnN0IHJlbGF0ZWRSYXRpb25hbGVzID0gZ3JhcGgubGlua3NcbiAgICAuZmlsdGVyKChsaW5rKSA9PiBsaW5rLnNvdXJjZSA9PT0gY29tcG9uZW50SWQgfHwgbGluay50YXJnZXQgPT09IGNvbXBvbmVudElkKVxuICAgIC5tYXAoKGxpbmspID0+IGxpbmsucmF0aW9uYWxlKVxuICAgIC5maWx0ZXIoKHJhdGlvbmFsZSkgPT4gcmF0aW9uYWxlLnRyaW0oKS5sZW5ndGggPiAwKTtcblxuICBjb25zdCBpc3N1ZXMgPSBbcmlzay5leHBsYW5hdGlvbiwgLi4ucmVsYXRlZFJhdGlvbmFsZXNdLmZpbHRlcihcbiAgICAodmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTogdmFsdWUgaXMgc3RyaW5nID0+IHZhbHVlLnRyaW0oKS5sZW5ndGggPiAwICYmIGNvbGxlY3Rpb24uaW5kZXhPZih2YWx1ZSkgPT09IGluZGV4XG4gICk7XG5cbiAgcmV0dXJuIHtcbiAgICBjb21wb25lbnRJZDogbm9kZS5pZCxcbiAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgdHlwZTogbm9kZS50eXBlLFxuICAgIHJpc2tTY29yZTogcmlzay5zY29yZSxcbiAgICByaXNrTGV2ZWw6IHJpc2subGV2ZWwsXG4gICAgZGVzY3JpcHRpb246IG5vZGUuZGVzY3JpcHRpb24sXG4gICAgZGVwZW5kZW5jaWVzLFxuICAgIGFmZmVjdGVkU3lzdGVtcyxcbiAgICBpc3N1ZXMsXG4gICAgZXhwbGFuYXRpb246IHJpc2suZXhwbGFuYXRpb24sXG4gICAgaW1wYWN0Q291bnQ6IGltcGFjdC5pbXBhY3RfY291bnQsXG4gICAgbWV0YWRhdGE6IFtcbiAgICAgIHsgbGFiZWw6ICdEZWdyZWUnLCB2YWx1ZTogZm9ybWF0TWV0cmljKG5vZGUuZGVncmVlKSB9LFxuICAgICAgeyBsYWJlbDogJ0JldHdlZW5uZXNzJywgdmFsdWU6IGZvcm1hdE1ldHJpYyhub2RlLmJldHdlZW5uZXNzKSB9LFxuICAgICAgeyBsYWJlbDogJ0Nsb3NlbmVzcycsIHZhbHVlOiBmb3JtYXRNZXRyaWMobm9kZS5jbG9zZW5lc3MpIH0sXG4gICAgICB7IGxhYmVsOiAnQmxhc3QgUmFkaXVzJywgdmFsdWU6IFN0cmluZyhub2RlLmJsYXN0UmFkaXVzKSB9LFxuICAgICAgeyBsYWJlbDogJ0RlcGVuZGVuY3kgU3BhbicsIHZhbHVlOiBTdHJpbmcobm9kZS5kZXBlbmRlbmN5U3BhbikgfSxcbiAgICAgIHsgbGFiZWw6ICdTb3VyY2UnLCB2YWx1ZTogbm9kZS5zb3VyY2UgfSxcbiAgICBdLFxuICB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVEb2N1bWVudEV2aWRlbmNlKGV2aWRlbmNlOiBBcGlEb2N1bWVudEV2aWRlbmNlKTogRG9jdW1lbnRFdmlkZW5jZSB7XG4gIHJldHVybiB7XG4gICAgcXVvdGU6IGVuc3VyZVN0cmluZyhldmlkZW5jZS5xdW90ZSwgJ2RvY3VtZW50LmV2aWRlbmNlLnF1b3RlJyksXG4gICAgcGFnZVN0YXJ0OiBldmlkZW5jZS5wYWdlX3N0YXJ0LFxuICAgIHBhZ2VFbmQ6IGV2aWRlbmNlLnBhZ2VfZW5kLFxuICB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVEb2N1bWVudFNvdXJjZShzb3VyY2U6IEFwaURvY3VtZW50U291cmNlKTogRG9jdW1lbnRTb3VyY2Uge1xuICByZXR1cm4ge1xuICAgIGRvY3VtZW50TmFtZTogZW5zdXJlU3RyaW5nKHNvdXJjZS5kb2N1bWVudF9uYW1lLCAnZG9jdW1lbnQuc291cmNlLmRvY3VtZW50X25hbWUnKSxcbiAgICBjaHVua0ZpbGU6IGVuc3VyZVN0cmluZyhzb3VyY2UuY2h1bmtfZmlsZSwgJ2RvY3VtZW50LnNvdXJjZS5jaHVua19maWxlJyksXG4gICAgY2h1bmtJZDogZW5zdXJlU3RyaW5nKHNvdXJjZS5jaHVua19pZCwgJ2RvY3VtZW50LnNvdXJjZS5jaHVua19pZCcpLFxuICAgIHBkZlBhZ2VTdGFydDogc291cmNlLnBkZl9wYWdlX3N0YXJ0LFxuICAgIHBkZlBhZ2VFbmQ6IHNvdXJjZS5wZGZfcGFnZV9lbmQsXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZURvY3VtZW50Tm9kZShub2RlOiBBcGlEb2N1bWVudE5vZGUpOiBEb2N1bWVudE5vZGUge1xuICBjb25zdCBkZWdyZWUgPSBlbnN1cmVOdW1iZXIobm9kZS5kZWdyZWUsICdkb2N1bWVudC5ub2RlLmRlZ3JlZScpO1xuICByZXR1cm4ge1xuICAgIGlkOiBlbnN1cmVTdHJpbmcobm9kZS5pZCwgJ2RvY3VtZW50Lm5vZGUuaWQnKSxcbiAgICBsYWJlbDogZW5zdXJlU3RyaW5nKG5vZGUubGFiZWwsICdkb2N1bWVudC5ub2RlLmxhYmVsJyksXG4gICAga2luZDogZW5zdXJlU3RyaW5nKG5vZGUua2luZCwgJ2RvY3VtZW50Lm5vZGUua2luZCcpLFxuICAgIGNhbm9uaWNhbE5hbWU6IGVuc3VyZVN0cmluZyhub2RlLmNhbm9uaWNhbF9uYW1lLCAnZG9jdW1lbnQubm9kZS5jYW5vbmljYWxfbmFtZScpLFxuICAgIGFsaWFzZXM6IGVuc3VyZUFycmF5PHN0cmluZz4obm9kZS5hbGlhc2VzLCAnZG9jdW1lbnQubm9kZS5hbGlhc2VzJyksXG4gICAgc3VtbWFyeTogZW5zdXJlU3RyaW5nKG5vZGUuc3VtbWFyeSwgJ2RvY3VtZW50Lm5vZGUuc3VtbWFyeScpLFxuICAgIGV2aWRlbmNlOiBlbnN1cmVBcnJheTxBcGlEb2N1bWVudEV2aWRlbmNlPihub2RlLmV2aWRlbmNlLCAnZG9jdW1lbnQubm9kZS5ldmlkZW5jZScpLm1hcChub3JtYWxpemVEb2N1bWVudEV2aWRlbmNlKSxcbiAgICBzb3VyY2VzOiBlbnN1cmVBcnJheTxBcGlEb2N1bWVudFNvdXJjZT4obm9kZS5zb3VyY2VzLCAnZG9jdW1lbnQubm9kZS5zb3VyY2VzJykubWFwKG5vcm1hbGl6ZURvY3VtZW50U291cmNlKSxcbiAgICBkZWdyZWUsXG4gICAgc291cmNlOiBlbnN1cmVTdHJpbmcobm9kZS5zb3VyY2UsICdkb2N1bWVudC5ub2RlLnNvdXJjZScpLFxuICAgIHZhbDogMTYgKyBNYXRoLm1pbigxOCwgTWF0aC5yb3VuZChkZWdyZWUgKiA0KSksXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZURvY3VtZW50RWRnZShlZGdlOiBBcGlEb2N1bWVudEVkZ2UpOiBEb2N1bWVudEVkZ2Uge1xuICByZXR1cm4ge1xuICAgIGlkOiBlbnN1cmVTdHJpbmcoZWRnZS5pZCwgJ2RvY3VtZW50LmVkZ2UuaWQnKSxcbiAgICBzb3VyY2U6IGVuc3VyZVN0cmluZyhlZGdlLnNvdXJjZSwgJ2RvY3VtZW50LmVkZ2Uuc291cmNlJyksXG4gICAgdGFyZ2V0OiBlbnN1cmVTdHJpbmcoZWRnZS50YXJnZXQsICdkb2N1bWVudC5lZGdlLnRhcmdldCcpLFxuICAgIHR5cGU6IGVuc3VyZVN0cmluZyhlZGdlLnR5cGUsICdkb2N1bWVudC5lZGdlLnR5cGUnKSxcbiAgICBzdW1tYXJ5OiBlbnN1cmVTdHJpbmcoZWRnZS5zdW1tYXJ5LCAnZG9jdW1lbnQuZWRnZS5zdW1tYXJ5JyksXG4gICAgZXZpZGVuY2U6IGVuc3VyZUFycmF5PEFwaURvY3VtZW50RXZpZGVuY2U+KGVkZ2UuZXZpZGVuY2UsICdkb2N1bWVudC5lZGdlLmV2aWRlbmNlJykubWFwKG5vcm1hbGl6ZURvY3VtZW50RXZpZGVuY2UpLFxuICAgIHNvdXJjZUNodW5rOiBlZGdlLnNvdXJjZV9jaHVuayA/IG5vcm1hbGl6ZURvY3VtZW50U291cmNlKGVkZ2Uuc291cmNlX2NodW5rKSA6IG51bGwsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGFwdERvY3VtZW50R3JhcGgoYXBpR3JhcGg6IEFwaURvY3VtZW50R3JhcGhEYXRhKTogRG9jdW1lbnRHcmFwaERhdGEge1xuICBjb25zdCBzb3VyY2UgPSBlbnN1cmVTdHJpbmcoYXBpR3JhcGguc291cmNlLCAnZG9jdW1lbnQuZ3JhcGguc291cmNlJyk7XG4gIGNvbnN0IG5vZGVzID0gZW5zdXJlQXJyYXk8QXBpRG9jdW1lbnROb2RlPihhcGlHcmFwaC5ub2RlcywgJ2RvY3VtZW50LmdyYXBoLm5vZGVzJykubWFwKG5vcm1hbGl6ZURvY3VtZW50Tm9kZSk7XG4gIGNvbnN0IGxpbmtzID0gZW5zdXJlQXJyYXk8QXBpRG9jdW1lbnRFZGdlPihhcGlHcmFwaC5lZGdlcywgJ2RvY3VtZW50LmdyYXBoLmVkZ2VzJykubWFwKG5vcm1hbGl6ZURvY3VtZW50RWRnZSk7XG4gIGNvbnN0IG5vZGVJbmRleCA9IE9iamVjdC5mcm9tRW50cmllcyhub2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLmlkLCBub2RlXSkpO1xuICBjb25zdCBraW5kVHlwZXMgPSBbLi4ubmV3IFNldChub2Rlcy5tYXAoKG5vZGUpID0+IG5vZGUua2luZCkpXS5zb3J0KCk7XG4gIGNvbnN0IHJlbGF0aW9uVHlwZXMgPSBbLi4ubmV3IFNldChsaW5rcy5tYXAoKGVkZ2UpID0+IGVkZ2UudHlwZSkpXS5zb3J0KCk7XG5cbiAgcmV0dXJuIHtcbiAgICBzb3VyY2UsXG4gICAgaW5nZXN0aW9uSWQ6IGFwaUdyYXBoLmluZ2VzdGlvbl9pZCA/PyBudWxsLFxuICAgIG5vZGVzLFxuICAgIGxpbmtzLFxuICAgIG5vZGVJbmRleCxcbiAgICBraW5kVHlwZXMsXG4gICAgcmVsYXRpb25UeXBlcyxcbiAgfTtcbn1cbiIsICJjb25zdCBydW50aW1lQ29uZmlnID0gd2luZG93Ll9fVFdJTl9DT05GSUdfXyA/PyB7fTtcblxuZnVuY3Rpb24gcmVhZE51bWJlcih2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgdW5kZWZpbmVkLCBmYWxsYmFjazogbnVtYmVyKSB7XG4gIGNvbnN0IHBhcnNlZCA9IE51bWJlcih2YWx1ZSk7XG4gIHJldHVybiBOdW1iZXIuaXNGaW5pdGUocGFyc2VkKSAmJiBwYXJzZWQgPiAwID8gcGFyc2VkIDogZmFsbGJhY2s7XG59XG5cbmV4cG9ydCBjb25zdCBhcHBDb25maWcgPSB7XG4gIGFwaUJhc2VVcmw6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICBtYXhVcGxvYWRCeXRlczpcbiAgICByZWFkTnVtYmVyKHJ1bnRpbWVDb25maWcuTUFYX1VQTE9BRF9NQiB8fCBpbXBvcnQubWV0YS5lbnYuVklURV9NQVhfVVBMT0FEX01CLCA1MCkgKiAxMDI0ICogMTAyNCxcbiAgcHJvY2Vzc2luZ1RpbWVvdXRNczogcmVhZE51bWJlcihcbiAgICBydW50aW1lQ29uZmlnLlBST0NFU1NJTkdfVElNRU9VVF9NUyB8fCBpbXBvcnQubWV0YS5lbnYuVklURV9QUk9DRVNTSU5HX1RJTUVPVVRfTVMsXG4gICAgMzAwMDAwXG4gICksXG4gIGVudmlyb25tZW50OiBydW50aW1lQ29uZmlnLkFQUF9FTlYgfHwgJ2xvY2FsJyxcbn07XG4iLCAiaW1wb3J0IHsgYXBwQ29uZmlnIH0gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHR5cGUge1xuICBBcGlHcmFwaERhdGEsXG4gIEFwaVBheWxvYWQsXG4gIEFwaURvY3VtZW50R3JhcGhEYXRhLFxuICBEb2N1bWVudEFydGlmYWN0TWFuaWZlc3QsXG4gIERvY3VtZW50SW5nZXN0UmVzcG9uc2UsXG4gIEltcGFjdFJlc3BvbnNlLFxuICBJbmdlc3RSZXNwb25zZSxcbiAgUHJvY2Vzc2luZ1N0YXR1cyxcbiAgUmlza1Jlc3BvbnNlLFxufSBmcm9tICcuLi90eXBlcy9hcGknO1xuXG5leHBvcnQgY2xhc3MgQXBpQ2xpZW50RXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvZGU/OiBzdHJpbmc7XG4gIHN0YXR1cz86IG51bWJlcjtcbiAgZGV0YWlscz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICByZXRyeWFibGU6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IHtcbiAgICAgIGNvZGU/OiBzdHJpbmc7XG4gICAgICBzdGF0dXM/OiBudW1iZXI7XG4gICAgICBkZXRhaWxzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgICByZXRyeWFibGU/OiBib29sZWFuO1xuICAgIH0gPSB7fVxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnQXBpQ2xpZW50RXJyb3InO1xuICAgIHRoaXMuY29kZSA9IG9wdGlvbnMuY29kZTtcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzO1xuICAgIHRoaXMuZGV0YWlscyA9IG9wdGlvbnMuZGV0YWlscztcbiAgICB0aGlzLnJldHJ5YWJsZSA9IG9wdGlvbnMucmV0cnlhYmxlID8/IGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBVbnN1cHBvcnRlZEVuZHBvaW50RXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdVbnN1cHBvcnRlZEVuZHBvaW50RXJyb3InO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHBhcnNlSnNvblNhZmVseShyZXNwb25zZTogUmVzcG9uc2UpIHtcbiAgY29uc3QgdGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgY29uc29sZS5sb2coJ0JBQ0tFTkQgUkVTUE9OU0U6JywgdGV4dCk7XG5cbiAgaWYgKCF0ZXh0KSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHRleHQpIGFzIEFwaVBheWxvYWQ8dW5rbm93bj47XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignUEFSU0UgRVJST1I6JywgZXJyb3IpO1xuICAgIGNvbnNvbGUuZXJyb3IoJ1JBVyBSRVNQT05TRSBURVhUOicsIHRleHQpO1xuICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcignVGhlIEFQSSByZXR1cm5lZCBtYWxmb3JtZWQgSlNPTi4nLCB7XG4gICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgIHJldHJ5YWJsZTogZmFsc2UsXG4gICAgfSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVxdWVzdDxUPihwYXRoOiBzdHJpbmcsIGluaXQ6IFJlcXVlc3RJbml0ID0ge30sIHRpbWVvdXRNcyA9IDMwMDAwKTogUHJvbWlzZTxUPiB7XG4gIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gIGNvbnN0IHRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIHRpbWVvdXRNcyk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAvYXBpJHtwYXRofWAsIHtcbiAgICAgIC4uLmluaXQsXG4gICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgIH0pO1xuICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCBwYXJzZUpzb25TYWZlbHkocmVzcG9uc2UpO1xuXG4gICAgaWYgKCFwYXlsb2FkIHx8IHR5cGVvZiBwYXlsb2FkICE9PSAnb2JqZWN0Jykge1xuICAgICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdUaGUgQVBJIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLicsIHtcbiAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXG4gICAgICAgIHJldHJ5YWJsZTogZmFsc2UsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rIHx8IHBheWxvYWQuc3RhdHVzICE9PSAnb2snKSB7XG4gICAgICBjb25zdCBlcnJvclBheWxvYWQgPSBwYXlsb2FkIGFzIEV4Y2x1ZGU8QXBpUGF5bG9hZDxUPiwgeyBzdGF0dXM6ICdvaycgfT47XG4gICAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoZXJyb3JQYXlsb2FkLmVycm9yPy5tZXNzYWdlIHx8ICdUaGUgcmVxdWVzdCBmYWlsZWQuJywge1xuICAgICAgICBjb2RlOiBlcnJvclBheWxvYWQuZXJyb3I/LmNvZGUsXG4gICAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgICBkZXRhaWxzOiBlcnJvclBheWxvYWQuZXJyb3I/LmRldGFpbHMsXG4gICAgICAgIHJldHJ5YWJsZTogcmVzcG9uc2Uuc3RhdHVzID49IDUwMCB8fCByZXNwb25zZS5zdGF0dXMgPT09IDAsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGF5bG9hZC5kYXRhIGFzIFQ7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXBpQ2xpZW50RXJyb3IpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnJvci5uYW1lID09PSAnQWJvcnRFcnJvcicpIHtcbiAgICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcignUHJvY2Vzc2luZyB0aW1lZCBvdXQgYmVmb3JlIHRoZSBiYWNrZW5kIGNvbXBsZXRlZCB0aGUgZ3JhcGggYnVpbGQuJywge1xuICAgICAgICBjb2RlOiAncmVxdWVzdF90aW1lb3V0JyxcbiAgICAgICAgcmV0cnlhYmxlOiB0cnVlLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdOZXR3b3JrIGZhaWx1cmUgd2hpbGUgY29udGFjdGluZyB0aGUgVHdpbkdyYXBoT3BzIEFQSS4nLCB7XG4gICAgICBjb2RlOiAnbmV0d29ya19lcnJvcicsXG4gICAgICByZXRyeWFibGU6IHRydWUsXG4gICAgfSk7XG4gIH0gZmluYWxseSB7XG4gICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBsb2FkRG9jdW1lbnQoXG4gIGZpbGU6IEZpbGUsXG4gIHJlcGxhY2VFeGlzdGluZyA9IHRydWUsXG4gIHRpbWVvdXRNcyA9IGFwcENvbmZpZy5wcm9jZXNzaW5nVGltZW91dE1zLFxuICBpbmdlc3Rpb25JZD86IHN0cmluZ1xuKSB7XG4gIGNvbnN0IGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKCk7XG4gIGZvcm1EYXRhLmFwcGVuZCgnZmlsZScsIGZpbGUpO1xuICBmb3JtRGF0YS5hcHBlbmQoJ3JlcGxhY2VfZXhpc3RpbmcnLCBTdHJpbmcocmVwbGFjZUV4aXN0aW5nKSk7XG4gIGlmIChpbmdlc3Rpb25JZCkge1xuICAgIGZvcm1EYXRhLmFwcGVuZCgnaW5nZXN0aW9uX2lkJywgaW5nZXN0aW9uSWQpO1xuICB9XG5cbiAgcmV0dXJuIHJlcXVlc3Q8SW5nZXN0UmVzcG9uc2U+KFxuICAgICcvaW5nZXN0JyxcbiAgICB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGJvZHk6IGZvcm1EYXRhLFxuICAgIH0sXG4gICAgdGltZW91dE1zXG4gICk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWRLbm93bGVkZ2VEb2N1bWVudChcbiAgZmlsZTogRmlsZSxcbiAgcmVwbGFjZUV4aXN0aW5nID0gdHJ1ZSxcbiAgdGltZW91dE1zID0gYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMsXG4gIGluZ2VzdGlvbklkPzogc3RyaW5nXG4pIHtcbiAgY29uc3QgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgZm9ybURhdGEuYXBwZW5kKCdmaWxlJywgZmlsZSk7XG4gIGZvcm1EYXRhLmFwcGVuZCgncmVwbGFjZV9leGlzdGluZycsIFN0cmluZyhyZXBsYWNlRXhpc3RpbmcpKTtcbiAgaWYgKGluZ2VzdGlvbklkKSB7XG4gICAgZm9ybURhdGEuYXBwZW5kKCdpbmdlc3Rpb25faWQnLCBpbmdlc3Rpb25JZCk7XG4gIH1cblxuICByZXR1cm4gcmVxdWVzdDxEb2N1bWVudEluZ2VzdFJlc3BvbnNlPihcbiAgICAnL2RvY3VtZW50L2luZ2VzdCcsXG4gICAge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBib2R5OiBmb3JtRGF0YSxcbiAgICB9LFxuICAgIHRpbWVvdXRNc1xuICApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0R3JhcGgoKSB7XG4gIHJldHVybiByZXF1ZXN0PEFwaUdyYXBoRGF0YT4oJy9ncmFwaCcpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0RG9jdW1lbnRHcmFwaCgpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8QXBpRG9jdW1lbnRHcmFwaERhdGE+KCcvZG9jdW1lbnQvZ3JhcGgnKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFjdGl2ZURvY3VtZW50QXJ0aWZhY3RzKCkge1xuICByZXR1cm4gcmVxdWVzdDxEb2N1bWVudEFydGlmYWN0TWFuaWZlc3Q+KCcvZG9jdW1lbnQvYXJ0aWZhY3RzJyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXREb2N1bWVudEFydGlmYWN0cyhpbmdlc3Rpb25JZDogc3RyaW5nKSB7XG4gIHJldHVybiByZXF1ZXN0PERvY3VtZW50QXJ0aWZhY3RNYW5pZmVzdD4oYC9kb2N1bWVudC9hcnRpZmFjdHMvJHtlbmNvZGVVUklDb21wb25lbnQoaW5nZXN0aW9uSWQpfWApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG9jdW1lbnRBcnRpZmFjdERvd25sb2FkVXJsKGluZ2VzdGlvbklkOiBzdHJpbmcsIGFydGlmYWN0SWQ6IHN0cmluZykge1xuICByZXR1cm4gYC9hcGkvZG9jdW1lbnQvYXJ0aWZhY3RzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGluZ2VzdGlvbklkKX0vZmlsZXMvJHtlbmNvZGVVUklDb21wb25lbnQoYXJ0aWZhY3RJZCl9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERvY3VtZW50QXJ0aWZhY3RCdW5kbGVEb3dubG9hZFVybChpbmdlc3Rpb25JZDogc3RyaW5nKSB7XG4gIHJldHVybiBgL2FwaS9kb2N1bWVudC9hcnRpZmFjdHMvJHtlbmNvZGVVUklDb21wb25lbnQoaW5nZXN0aW9uSWQpfS9idW5kbGVgO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0Umlzayhjb21wb25lbnRJZDogc3RyaW5nKSB7XG4gIHJldHVybiByZXF1ZXN0PFJpc2tSZXNwb25zZT4oYC9yaXNrP2NvbXBvbmVudF9pZD0ke2VuY29kZVVSSUNvbXBvbmVudChjb21wb25lbnRJZCl9YCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRJbXBhY3QoY29tcG9uZW50SWQ6IHN0cmluZykge1xuICByZXR1cm4gcmVxdWVzdDxJbXBhY3RSZXNwb25zZT4oYC9pbXBhY3Q/Y29tcG9uZW50X2lkPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGNvbXBvbmVudElkKX1gKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlZWREZW1vR3JhcGgoKSB7XG4gIHJldHVybiByZXF1ZXN0PHsgc291cmNlOiBzdHJpbmc7IG5vZGVzX2NyZWF0ZWQ6IG51bWJlcjsgZWRnZXNfY3JlYXRlZDogbnVtYmVyOyByaXNrX25vZGVzX3Njb3JlZDogbnVtYmVyIH0+KFxuICAgICcvc2VlZCcsXG4gICAgeyBtZXRob2Q6ICdQT1NUJyB9XG4gICk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8UHJvY2Vzc2luZ1N0YXR1cz4oYC9pbmdlc3QvJHtlbmNvZGVVUklDb21wb25lbnQoaW5nZXN0aW9uSWQpfS9ldmVudHNgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldERvY3VtZW50UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZDogc3RyaW5nKSB7XG4gIHJldHVybiByZXF1ZXN0PFByb2Nlc3NpbmdTdGF0dXM+KGAvZG9jdW1lbnQvaW5nZXN0LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGluZ2VzdGlvbklkKX0vZXZlbnRzYCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRSaXNrUmFua2VkSXRlbXMoKTogUHJvbWlzZTxuZXZlcj4ge1xuICAvLyBUT0RPOiByZXBsYWNlIGNsaWVudC1zaWRlIHJpc2sgcmFua2luZyB3aGVuIHRoZSBiYWNrZW5kIGV4cG9zZXMgYSBkZWRpY2F0ZWQgcmlzayBsaXN0IGVuZHBvaW50LlxuICB0aHJvdyBuZXcgVW5zdXBwb3J0ZWRFbmRwb2ludEVycm9yKCdUaGUgY3VycmVudCBiYWNrZW5kIGNvbnRyYWN0IGRvZXMgbm90IGV4cG9zZSBhIHJhbmtlZCByaXNrIGxpc3QgZW5kcG9pbnQuJyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBcmNoaXRlY3R1cmVTdW1tYXJ5KCk6IFByb21pc2U8bmV2ZXI+IHtcbiAgLy8gVE9ETzogcmVwbGFjZSBjbGllbnQtc2lkZSBzdW1tYXJ5IGRlcml2YXRpb24gd2hlbiB0aGUgYmFja2VuZCBleHBvc2VzIGEgZGVkaWNhdGVkIHN1bW1hcnkgZW5kcG9pbnQuXG4gIHRocm93IG5ldyBVbnN1cHBvcnRlZEVuZHBvaW50RXJyb3IoJ1RoZSBjdXJyZW50IGJhY2tlbmQgY29udHJhY3QgZG9lcyBub3QgZXhwb3NlIGFuIGFyY2hpdGVjdHVyZSBzdW1tYXJ5IGVuZHBvaW50LicpO1xufVxuIiwgImltcG9ydCB7IGNyZWF0ZUNvbnRleHQsIHVzZUNhbGxiYWNrLCB1c2VDb250ZXh0LCB1c2VNZW1vLCB1c2VSZWYsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHR5cGUgeyBSZWFjdE5vZGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBhZGFwdERvY3VtZW50R3JhcGgsIGFkYXB0R3JhcGgsIGFkYXB0TWVyZ2VkR3JhcGggfSBmcm9tICcuLi9saWIvYWRhcHRlcnMnO1xuaW1wb3J0IHtcbiAgQXBpQ2xpZW50RXJyb3IsXG4gIGdldERvY3VtZW50QXJ0aWZhY3RzLFxuICBnZXREb2N1bWVudEdyYXBoLFxuICBnZXREb2N1bWVudFByb2Nlc3NpbmdTdGF0dXMsXG4gIGdldEdyYXBoLFxuICBnZXRQcm9jZXNzaW5nU3RhdHVzLFxuICB1cGxvYWREb2N1bWVudCxcbiAgdXBsb2FkS25vd2xlZGdlRG9jdW1lbnQsXG59IGZyb20gJy4uL2xpYi9hcGknO1xuaW1wb3J0IHsgYXBwQ29uZmlnIH0gZnJvbSAnLi4vbGliL2NvbmZpZyc7XG5pbXBvcnQgdHlwZSB7XG4gIERvY3VtZW50R3JhcGhTdGF0ZSxcbiAgRG9jdW1lbnRVcGxvYWRTdGF0ZSxcbiAgR3JhcGhTdGF0ZSxcbiAgVXBsb2FkU3RhdGUsXG4gIFVwbG9hZGVkQXJ0aWZhY3RLaW5kLFxuICBVcGxvYWRlZEdyYXBoU3RhdGUsXG4gIFVwbG9hZGVkR3JhcGhVcGxvYWRTdGF0ZSxcbn0gZnJvbSAnLi4vdHlwZXMvYXBwJztcbmltcG9ydCB0eXBlIHsgQXBpRG9jdW1lbnRHcmFwaERhdGEsIEFwaU1lcmdlZEdyYXBoRGF0YSB9IGZyb20gJy4uL3R5cGVzL2FwaSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBwQ29udGV4dFZhbHVlIHtcbiAgdXBsb2FkOiBVcGxvYWRTdGF0ZTtcbiAgZ3JhcGg6IEdyYXBoU3RhdGU7XG4gIGRvY3VtZW50VXBsb2FkOiBEb2N1bWVudFVwbG9hZFN0YXRlO1xuICBkb2N1bWVudEdyYXBoOiBEb2N1bWVudEdyYXBoU3RhdGU7XG4gIHVwbG9hZGVkR3JhcGhVcGxvYWQ6IFVwbG9hZGVkR3JhcGhVcGxvYWRTdGF0ZTtcbiAgdXBsb2FkZWRHcmFwaDogVXBsb2FkZWRHcmFwaFN0YXRlO1xuICBzZXREcmFnQWN0aXZlOiAoYWN0aXZlOiBib29sZWFuKSA9PiB2b2lkO1xuICBzZWxlY3RGaWxlOiAoZmlsZTogRmlsZSB8IG51bGwpID0+IGJvb2xlYW47XG4gIGNsZWFyU2VsZWN0ZWRGaWxlOiAoKSA9PiB2b2lkO1xuICBiZWdpblByb2Nlc3Npbmc6ICgpID0+IFByb21pc2U8dm9pZD47XG4gIGxvYWRHcmFwaDogKG9wdGlvbnM/OiB7IGtlZXBTdGF0dXM/OiBib29sZWFuIH0pID0+IFByb21pc2U8dm9pZD47XG4gIHNldERvY3VtZW50RHJhZ0FjdGl2ZTogKGFjdGl2ZTogYm9vbGVhbikgPT4gdm9pZDtcbiAgc2VsZWN0RG9jdW1lbnRGaWxlOiAoZmlsZTogRmlsZSB8IG51bGwpID0+IGJvb2xlYW47XG4gIGNsZWFyU2VsZWN0ZWREb2N1bWVudEZpbGU6ICgpID0+IHZvaWQ7XG4gIGJlZ2luRG9jdW1lbnRQcm9jZXNzaW5nOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xuICBsb2FkRG9jdW1lbnRHcmFwaDogKG9wdGlvbnM/OiB7IGtlZXBTdGF0dXM/OiBib29sZWFuIH0pID0+IFByb21pc2U8dm9pZD47XG4gIHNldFVwbG9hZGVkR3JhcGhEcmFnQWN0aXZlOiAoYWN0aXZlOiBib29sZWFuKSA9PiB2b2lkO1xuICBzZWxlY3RVcGxvYWRlZEdyYXBoRmlsZTogKGZpbGU6IEZpbGUgfCBudWxsKSA9PiBib29sZWFuO1xuICBjbGVhclNlbGVjdGVkVXBsb2FkZWRHcmFwaEZpbGU6ICgpID0+IHZvaWQ7XG4gIGxvYWRVcGxvYWRlZEdyYXBoRnJvbVNlbGVjdGVkRmlsZTogKCkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgcmVzZXRVcGxvYWRTdGF0ZTogKCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGNvbnN0IEFwcENvbnRleHQgPSBjcmVhdGVDb250ZXh0PEFwcENvbnRleHRWYWx1ZSB8IG51bGw+KG51bGwpO1xuXG5leHBvcnQgY29uc3QgaW5pdGlhbFVwbG9hZFN0YXRlOiBVcGxvYWRTdGF0ZSA9IHtcbiAgcGhhc2U6ICdpZGxlJyxcbiAgc2VsZWN0ZWRGaWxlOiBudWxsLFxuICBlcnJvcjogbnVsbCxcbiAgc3RhdHVzTWVzc2FnZTogJ1VwbG9hZCBhIC5tZCBvciAudHh0IGZpbGUgdG8gYnVpbGQgdGhlIGdyYXBoLicsXG4gIGluZ2VzdGlvbklkOiBudWxsLFxuICBpbmdlc3Rpb246IG51bGwsXG4gIHByb2Nlc3NpbmdTdGF0dXM6IG51bGwsXG4gIHN0YXJ0ZWRBdDogbnVsbCxcbiAgY29tcGxldGVkQXQ6IG51bGwsXG4gIHJldHJ5Q291bnQ6IDAsXG59O1xuXG5jb25zdCBpbml0aWFsR3JhcGhTdGF0ZTogR3JhcGhTdGF0ZSA9IHtcbiAgc3RhdHVzOiAnaWRsZScsXG4gIGRhdGE6IG51bGwsXG4gIGVycm9yOiBudWxsLFxuICBsYXN0TG9hZGVkQXQ6IG51bGwsXG59O1xuXG5leHBvcnQgY29uc3QgaW5pdGlhbFVwbG9hZGVkR3JhcGhVcGxvYWRTdGF0ZTogVXBsb2FkZWRHcmFwaFVwbG9hZFN0YXRlID0ge1xuICBwaGFzZTogJ2lkbGUnLFxuICBzZWxlY3RlZEZpbGU6IG51bGwsXG4gIGVycm9yOiBudWxsLFxuICBzdGF0dXNNZXNzYWdlOiAnVXBsb2FkIGEgbWVyZ2VkX2dyYXBoLmpzb24gZmlsZSB0byBpbnNwZWN0IGEgZmluYWxpemVkIGtub3dsZWRnZSBncmFwaC4nLFxufTtcblxuY29uc3QgaW5pdGlhbFVwbG9hZGVkR3JhcGhTdGF0ZTogVXBsb2FkZWRHcmFwaFN0YXRlID0ge1xuICBzdGF0dXM6ICdpZGxlJyxcbiAga2luZDogbnVsbCxcbiAgb3BlcmF0aW9uYWxEYXRhOiBudWxsLFxuICBkb2N1bWVudERhdGE6IG51bGwsXG4gIGVycm9yOiBudWxsLFxuICBsYXN0TG9hZGVkQXQ6IG51bGwsXG4gIGZpbGVuYW1lOiBudWxsLFxuICByYXdEYXRhOiBudWxsLFxufTtcblxuZXhwb3J0IGNvbnN0IGluaXRpYWxEb2N1bWVudFVwbG9hZFN0YXRlOiBEb2N1bWVudFVwbG9hZFN0YXRlID0ge1xuICBwaGFzZTogJ2lkbGUnLFxuICBzZWxlY3RlZEZpbGU6IG51bGwsXG4gIGVycm9yOiBudWxsLFxuICBzdGF0dXNNZXNzYWdlOiAnVXBsb2FkIGEgLnBkZiwgLm1kLCBvciAudHh0IGZpbGUgdG8gYnVpbGQgYSBkb2N1bWVudCBncmFwaC4nLFxuICBpbmdlc3Rpb25JZDogbnVsbCxcbiAgaW5nZXN0aW9uOiBudWxsLFxuICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxuICBzdGFydGVkQXQ6IG51bGwsXG4gIGNvbXBsZXRlZEF0OiBudWxsLFxuICByZXRyeUNvdW50OiAwLFxufTtcblxuY29uc3QgaW5pdGlhbERvY3VtZW50R3JhcGhTdGF0ZTogRG9jdW1lbnRHcmFwaFN0YXRlID0ge1xuICBzdGF0dXM6ICdpZGxlJyxcbiAgZGF0YTogbnVsbCxcbiAgZXJyb3I6IG51bGwsXG4gIGxhc3RMb2FkZWRBdDogbnVsbCxcbiAgYXJ0aWZhY3RzOiBudWxsLFxuICBhcnRpZmFjdHNFcnJvcjogbnVsbCxcbn07XG5cbmNvbnN0IERPQ1VNRU5UX0FSVElGQUNUX0ZFVENIX0FUVEVNUFRTID0gNTtcbmNvbnN0IERPQ1VNRU5UX0FSVElGQUNUX0ZFVENIX0RFTEFZX01TID0gODAwO1xuXG5leHBvcnQgY29uc3Qgc3VwcG9ydGVkRXh0ZW5zaW9ucyA9IFsnLm1kJywgJy50eHQnXTtcbmV4cG9ydCBjb25zdCBzdXBwb3J0ZWREb2N1bWVudEV4dGVuc2lvbnMgPSBbJy5wZGYnLCAnLm1kJywgJy50eHQnXTtcbmV4cG9ydCBjb25zdCBzdXBwb3J0ZWRVcGxvYWRlZEdyYXBoRXh0ZW5zaW9ucyA9IFsnLmpzb24nXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVFeHRlbnNpb24oZmlsZW5hbWU6IHN0cmluZykge1xuICBjb25zdCBzZWdtZW50cyA9IGZpbGVuYW1lLnRvTG93ZXJDYXNlKCkuc3BsaXQoJy4nKTtcbiAgcmV0dXJuIHNlZ21lbnRzLmxlbmd0aCA+IDEgPyBgLiR7c2VnbWVudHMucG9wKCl9YCA6ICcnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2VsZWN0ZWRGaWxlVXBsb2FkU3RhdGUoZmlsZTogRmlsZSk6IFVwbG9hZFN0YXRlIHtcbiAgcmV0dXJuIHtcbiAgICBwaGFzZTogJ2ZpbGUtc2VsZWN0ZWQnLFxuICAgIHNlbGVjdGVkRmlsZTogZmlsZSxcbiAgICBlcnJvcjogbnVsbCxcbiAgICBzdGF0dXNNZXNzYWdlOiBgUmVhZHkgdG8gYW5hbHl6ZSAke2ZpbGUubmFtZX0uYCxcbiAgICBpbmdlc3Rpb25JZDogbnVsbCxcbiAgICBpbmdlc3Rpb246IG51bGwsXG4gICAgcHJvY2Vzc2luZ1N0YXR1czogbnVsbCxcbiAgICBzdGFydGVkQXQ6IG51bGwsXG4gICAgY29tcGxldGVkQXQ6IG51bGwsXG4gICAgcmV0cnlDb3VudDogMCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVVwbG9hZEVycm9yU3RhdGUoZXJyb3I6IHN0cmluZywgc3RhdHVzTWVzc2FnZTogc3RyaW5nKTogVXBsb2FkU3RhdGUge1xuICByZXR1cm4ge1xuICAgIC4uLmluaXRpYWxVcGxvYWRTdGF0ZSxcbiAgICBwaGFzZTogJ2Vycm9yJyxcbiAgICBlcnJvcixcbiAgICBzdGF0dXNNZXNzYWdlLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2VsZWN0ZWREb2N1bWVudEZpbGVVcGxvYWRTdGF0ZShmaWxlOiBGaWxlKTogRG9jdW1lbnRVcGxvYWRTdGF0ZSB7XG4gIHJldHVybiB7XG4gICAgcGhhc2U6ICdmaWxlLXNlbGVjdGVkJyxcbiAgICBzZWxlY3RlZEZpbGU6IGZpbGUsXG4gICAgZXJyb3I6IG51bGwsXG4gICAgc3RhdHVzTWVzc2FnZTogYFJlYWR5IHRvIG1hcCAke2ZpbGUubmFtZX0uYCxcbiAgICBpbmdlc3Rpb25JZDogbnVsbCxcbiAgICBpbmdlc3Rpb246IG51bGwsXG4gICAgcHJvY2Vzc2luZ1N0YXR1czogbnVsbCxcbiAgICBzdGFydGVkQXQ6IG51bGwsXG4gICAgY29tcGxldGVkQXQ6IG51bGwsXG4gICAgcmV0cnlDb3VudDogMCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURvY3VtZW50VXBsb2FkRXJyb3JTdGF0ZShlcnJvcjogc3RyaW5nLCBzdGF0dXNNZXNzYWdlOiBzdHJpbmcpOiBEb2N1bWVudFVwbG9hZFN0YXRlIHtcbiAgcmV0dXJuIHtcbiAgICAuLi5pbml0aWFsRG9jdW1lbnRVcGxvYWRTdGF0ZSxcbiAgICBwaGFzZTogJ2Vycm9yJyxcbiAgICBlcnJvcixcbiAgICBzdGF0dXNNZXNzYWdlLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZVN0YXRlKGZpbGU6IEZpbGUpOiBVcGxvYWRlZEdyYXBoVXBsb2FkU3RhdGUge1xuICByZXR1cm4ge1xuICAgIHBoYXNlOiAnZmlsZS1zZWxlY3RlZCcsXG4gICAgc2VsZWN0ZWRGaWxlOiBmaWxlLFxuICAgIGVycm9yOiBudWxsLFxuICAgIHN0YXR1c01lc3NhZ2U6IGBSZWFkeSB0byBpbnNwZWN0ICR7ZmlsZS5uYW1lfS5gLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVXBsb2FkZWRHcmFwaEVycm9yU3RhdGUoZXJyb3I6IHN0cmluZywgc3RhdHVzTWVzc2FnZTogc3RyaW5nKTogVXBsb2FkZWRHcmFwaFVwbG9hZFN0YXRlIHtcbiAgcmV0dXJuIHtcbiAgICAuLi5pbml0aWFsVXBsb2FkZWRHcmFwaFVwbG9hZFN0YXRlLFxuICAgIHBoYXNlOiAnZXJyb3InLFxuICAgIGVycm9yLFxuICAgIHN0YXR1c01lc3NhZ2UsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVNlbGVjdGVkRmlsZShmaWxlOiBGaWxlIHwgbnVsbCwgbWF4VXBsb2FkQnl0ZXM6IG51bWJlcik6IFVwbG9hZFN0YXRlIHtcbiAgaWYgKCFmaWxlKSB7XG4gICAgcmV0dXJuIGluaXRpYWxVcGxvYWRTdGF0ZTtcbiAgfVxuXG4gIGNvbnN0IGV4dGVuc2lvbiA9IGdldEZpbGVFeHRlbnNpb24oZmlsZS5uYW1lKTtcbiAgaWYgKCFzdXBwb3J0ZWRFeHRlbnNpb25zLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcbiAgICByZXR1cm4gY3JlYXRlVXBsb2FkRXJyb3JTdGF0ZSgnT25seSAubWQgYW5kIC50eHQgZmlsZXMgYXJlIHN1cHBvcnRlZC4nLCAnVW5zdXBwb3J0ZWQgZmlsZSB0eXBlLicpO1xuICB9XG5cbiAgaWYgKGZpbGUuc2l6ZSA+IG1heFVwbG9hZEJ5dGVzKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVVwbG9hZEVycm9yU3RhdGUoXG4gICAgICBgRmlsZSBleGNlZWRzIHRoZSAke01hdGgucm91bmQobWF4VXBsb2FkQnl0ZXMgLyAxMDI0IC8gMTAyNCl9IE1CIHVwbG9hZCBsaW1pdC5gLFxuICAgICAgJ1NlbGVjdGVkIGZpbGUgaXMgdG9vIGxhcmdlLidcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGNyZWF0ZVNlbGVjdGVkRmlsZVVwbG9hZFN0YXRlKGZpbGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVTZWxlY3RlZERvY3VtZW50RmlsZShmaWxlOiBGaWxlIHwgbnVsbCwgbWF4VXBsb2FkQnl0ZXM6IG51bWJlcik6IERvY3VtZW50VXBsb2FkU3RhdGUge1xuICBpZiAoIWZpbGUpIHtcbiAgICByZXR1cm4gaW5pdGlhbERvY3VtZW50VXBsb2FkU3RhdGU7XG4gIH1cblxuICBjb25zdCBleHRlbnNpb24gPSBnZXRGaWxlRXh0ZW5zaW9uKGZpbGUubmFtZSk7XG4gIGlmICghc3VwcG9ydGVkRG9jdW1lbnRFeHRlbnNpb25zLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcbiAgICByZXR1cm4gY3JlYXRlRG9jdW1lbnRVcGxvYWRFcnJvclN0YXRlKCdPbmx5IC5wZGYsIC5tZCwgYW5kIC50eHQgZmlsZXMgYXJlIHN1cHBvcnRlZC4nLCAnVW5zdXBwb3J0ZWQgZmlsZSB0eXBlLicpO1xuICB9XG5cbiAgaWYgKGZpbGUuc2l6ZSA+IG1heFVwbG9hZEJ5dGVzKSB7XG4gICAgcmV0dXJuIGNyZWF0ZURvY3VtZW50VXBsb2FkRXJyb3JTdGF0ZShcbiAgICAgIGBGaWxlIGV4Y2VlZHMgdGhlICR7TWF0aC5yb3VuZChtYXhVcGxvYWRCeXRlcyAvIDEwMjQgLyAxMDI0KX0gTUIgdXBsb2FkIGxpbWl0LmAsXG4gICAgICAnU2VsZWN0ZWQgZmlsZSBpcyB0b28gbGFyZ2UuJ1xuICAgICk7XG4gIH1cblxuICByZXR1cm4gY3JlYXRlU2VsZWN0ZWREb2N1bWVudEZpbGVVcGxvYWRTdGF0ZShmaWxlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZShmaWxlOiBGaWxlIHwgbnVsbCwgbWF4VXBsb2FkQnl0ZXM6IG51bWJlcik6IFVwbG9hZGVkR3JhcGhVcGxvYWRTdGF0ZSB7XG4gIGlmICghZmlsZSkge1xuICAgIHJldHVybiBpbml0aWFsVXBsb2FkZWRHcmFwaFVwbG9hZFN0YXRlO1xuICB9XG5cbiAgY29uc3QgZXh0ZW5zaW9uID0gZ2V0RmlsZUV4dGVuc2lvbihmaWxlLm5hbWUpO1xuICBpZiAoIXN1cHBvcnRlZFVwbG9hZGVkR3JhcGhFeHRlbnNpb25zLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcbiAgICByZXR1cm4gY3JlYXRlVXBsb2FkZWRHcmFwaEVycm9yU3RhdGUoJ09ubHkgLmpzb24gZ3JhcGggYXJ0aWZhY3QgZmlsZXMgYXJlIHN1cHBvcnRlZC4nLCAnVW5zdXBwb3J0ZWQgZmlsZSB0eXBlLicpO1xuICB9XG5cbiAgaWYgKGZpbGUuc2l6ZSA+IG1heFVwbG9hZEJ5dGVzKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVVwbG9hZGVkR3JhcGhFcnJvclN0YXRlKFxuICAgICAgYEZpbGUgZXhjZWVkcyB0aGUgJHtNYXRoLnJvdW5kKG1heFVwbG9hZEJ5dGVzIC8gMTAyNCAvIDEwMjQpfSBNQiB1cGxvYWQgbGltaXQuYCxcbiAgICAgICdTZWxlY3RlZCBmaWxlIGlzIHRvbyBsYXJnZS4nXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVTZWxlY3RlZFVwbG9hZGVkR3JhcGhGaWxlU3RhdGUoZmlsZSk7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZU9wZXJhdGlvbmFsVXBsb2FkZWRHcmFwaFNoYXBlKHBheWxvYWQ6IHVua25vd24pOiBBcGlNZXJnZWRHcmFwaERhdGEge1xuICBpZiAoIXBheWxvYWQgfHwgdHlwZW9mIHBheWxvYWQgIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkocGF5bG9hZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSB1cGxvYWRlZCBmaWxlIG11c3QgYmUgYSBKU09OIG9iamVjdCB3aXRoIG5vZGVzIGFuZCBlZGdlcy4nKTtcbiAgfVxuXG4gIGNvbnN0IGNhbmRpZGF0ZSA9IHBheWxvYWQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGlmICghQXJyYXkuaXNBcnJheShjYW5kaWRhdGUubm9kZXMpIHx8ICFBcnJheS5pc0FycmF5KGNhbmRpZGF0ZS5lZGdlcykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSB1cGxvYWRlZCBmaWxlIG11c3QgaW5jbHVkZSB0b3AtbGV2ZWwgbm9kZXMgYW5kIGVkZ2VzIGFycmF5cy4nKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbm9kZXM6IGNhbmRpZGF0ZS5ub2RlcyBhcyBBcGlNZXJnZWRHcmFwaERhdGFbJ25vZGVzJ10sXG4gICAgZWRnZXM6IGNhbmRpZGF0ZS5lZGdlcyBhcyBBcGlNZXJnZWRHcmFwaERhdGFbJ2VkZ2VzJ10sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGVuc3VyZURvY3VtZW50VXBsb2FkZWRHcmFwaFNoYXBlKHBheWxvYWQ6IHVua25vd24pOiBBcGlEb2N1bWVudEdyYXBoRGF0YSB7XG4gIGlmICghcGF5bG9hZCB8fCB0eXBlb2YgcGF5bG9hZCAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShwYXlsb2FkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignVGhlIHVwbG9hZGVkIGZpbGUgbXVzdCBiZSBhIGRvY3VtZW50IGdyYXBoIEpTT04gb2JqZWN0IHdpdGggbm9kZXMgYW5kIGVkZ2VzLicpO1xuICB9XG5cbiAgY29uc3QgY2FuZGlkYXRlID0gcGF5bG9hZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGNhbmRpZGF0ZS5ub2RlcykgfHwgIUFycmF5LmlzQXJyYXkoY2FuZGlkYXRlLmVkZ2VzKSB8fCB0eXBlb2YgY2FuZGlkYXRlLnNvdXJjZSAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSB1cGxvYWRlZCBkb2N1bWVudCBhcnRpZmFjdCBtdXN0IGluY2x1ZGUgc291cmNlLCBub2RlcywgYW5kIGVkZ2VzLicpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzb3VyY2U6IGNhbmRpZGF0ZS5zb3VyY2UgYXMgQXBpRG9jdW1lbnRHcmFwaERhdGFbJ3NvdXJjZSddLFxuICAgIGluZ2VzdGlvbl9pZDogbnVsbCxcbiAgICBub2RlczogY2FuZGlkYXRlLm5vZGVzIGFzIEFwaURvY3VtZW50R3JhcGhEYXRhWydub2RlcyddLFxuICAgIGVkZ2VzOiBjYW5kaWRhdGUuZWRnZXMgYXMgQXBpRG9jdW1lbnRHcmFwaERhdGFbJ2VkZ2VzJ10sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGlzT3BlcmF0aW9uYWxBcnRpZmFjdFBheWxvYWQocGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHtcbiAgY29uc3QgZmlyc3ROb2RlID0gQXJyYXkuaXNBcnJheShwYXlsb2FkLm5vZGVzKSA/IHBheWxvYWQubm9kZXNbMF0gOiBudWxsO1xuICBjb25zdCBmaXJzdEVkZ2UgPSBBcnJheS5pc0FycmF5KHBheWxvYWQuZWRnZXMpID8gcGF5bG9hZC5lZGdlc1swXSA6IG51bGw7XG4gIGlmIChBcnJheS5pc0FycmF5KHBheWxvYWQubm9kZXMpICYmIHBheWxvYWQubm9kZXMubGVuZ3RoID09PSAwICYmIEFycmF5LmlzQXJyYXkocGF5bG9hZC5lZGdlcykgJiYgcGF5bG9hZC5lZGdlcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHlwZW9mIHBheWxvYWQuc291cmNlICE9PSAnc3RyaW5nJztcbiAgfVxuICByZXR1cm4gKFxuICAgICEhZmlyc3ROb2RlICYmXG4gICAgdHlwZW9mIGZpcnN0Tm9kZSA9PT0gJ29iamVjdCcgJiZcbiAgICBmaXJzdE5vZGUgIT09IG51bGwgJiZcbiAgICAnbmFtZScgaW4gZmlyc3ROb2RlICYmXG4gICAgJ3R5cGUnIGluIGZpcnN0Tm9kZSAmJlxuICAgICdyaXNrX3Njb3JlJyBpbiBmaXJzdE5vZGUgJiZcbiAgICAoISFmaXJzdEVkZ2VcbiAgICAgID8gdHlwZW9mIGZpcnN0RWRnZSA9PT0gJ29iamVjdCcgJiYgZmlyc3RFZGdlICE9PSBudWxsICYmICdyZWxhdGlvbicgaW4gZmlyc3RFZGdlICYmICdyYXRpb25hbGUnIGluIGZpcnN0RWRnZVxuICAgICAgOiB0cnVlKVxuICApO1xufVxuXG5mdW5jdGlvbiBpc0RvY3VtZW50QXJ0aWZhY3RQYXlsb2FkKHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gIGNvbnN0IGZpcnN0Tm9kZSA9IEFycmF5LmlzQXJyYXkocGF5bG9hZC5ub2RlcykgPyBwYXlsb2FkLm5vZGVzWzBdIDogbnVsbDtcbiAgY29uc3QgZmlyc3RFZGdlID0gQXJyYXkuaXNBcnJheShwYXlsb2FkLmVkZ2VzKSA/IHBheWxvYWQuZWRnZXNbMF0gOiBudWxsO1xuICBpZiAoQXJyYXkuaXNBcnJheShwYXlsb2FkLm5vZGVzKSAmJiBwYXlsb2FkLm5vZGVzLmxlbmd0aCA9PT0gMCAmJiBBcnJheS5pc0FycmF5KHBheWxvYWQuZWRnZXMpICYmIHBheWxvYWQuZWRnZXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBwYXlsb2FkLnNvdXJjZSA9PT0gJ3N0cmluZyc7XG4gIH1cbiAgcmV0dXJuIChcbiAgICB0eXBlb2YgcGF5bG9hZC5zb3VyY2UgPT09ICdzdHJpbmcnICYmXG4gICAgISFmaXJzdE5vZGUgJiZcbiAgICB0eXBlb2YgZmlyc3ROb2RlID09PSAnb2JqZWN0JyAmJlxuICAgIGZpcnN0Tm9kZSAhPT0gbnVsbCAmJlxuICAgICdsYWJlbCcgaW4gZmlyc3ROb2RlICYmXG4gICAgJ2tpbmQnIGluIGZpcnN0Tm9kZSAmJlxuICAgICdjYW5vbmljYWxfbmFtZScgaW4gZmlyc3ROb2RlICYmXG4gICAgKCEhZmlyc3RFZGdlXG4gICAgICA/IHR5cGVvZiBmaXJzdEVkZ2UgPT09ICdvYmplY3QnICYmIGZpcnN0RWRnZSAhPT0gbnVsbCAmJiAndHlwZScgaW4gZmlyc3RFZGdlICYmICdzdW1tYXJ5JyBpbiBmaXJzdEVkZ2VcbiAgICAgIDogdHJ1ZSlcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVXBsb2FkZWRHcmFwaEpzb24oZmlsZUNvbnRlbnRzOiBzdHJpbmcpOiB7XG4gIGtpbmQ6IFVwbG9hZGVkQXJ0aWZhY3RLaW5kO1xuICByYXdEYXRhOiBBcGlNZXJnZWRHcmFwaERhdGEgfCBBcGlEb2N1bWVudEdyYXBoRGF0YTtcbn0ge1xuICBsZXQgcGFyc2VkOiB1bmtub3duO1xuICB0cnkge1xuICAgIHBhcnNlZCA9IEpTT04ucGFyc2UoZmlsZUNvbnRlbnRzKTtcbiAgfSBjYXRjaCB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgc2VsZWN0ZWQgZmlsZSBpcyBub3QgdmFsaWQgSlNPTi4nKTtcbiAgfVxuXG4gIGlmICghcGFyc2VkIHx8IHR5cGVvZiBwYXJzZWQgIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkocGFyc2VkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignVGhlIHVwbG9hZGVkIGZpbGUgbXVzdCBiZSBhIEpTT04gb2JqZWN0IHdpdGggZ3JhcGggbm9kZXMgYW5kIGVkZ2VzLicpO1xuICB9XG5cbiAgY29uc3QgY2FuZGlkYXRlID0gcGFyc2VkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBpZiAoIUFycmF5LmlzQXJyYXkoY2FuZGlkYXRlLm5vZGVzKSB8fCAhQXJyYXkuaXNBcnJheShjYW5kaWRhdGUuZWRnZXMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgdXBsb2FkZWQgZmlsZSBtdXN0IGluY2x1ZGUgdG9wLWxldmVsIG5vZGVzIGFuZCBlZGdlcyBhcnJheXMuJyk7XG4gIH1cblxuICBpZiAoaXNPcGVyYXRpb25hbEFydGlmYWN0UGF5bG9hZChjYW5kaWRhdGUpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6ICdvcGVyYXRpb25hbCcsXG4gICAgICByYXdEYXRhOiBlbnN1cmVPcGVyYXRpb25hbFVwbG9hZGVkR3JhcGhTaGFwZShjYW5kaWRhdGUpLFxuICAgIH07XG4gIH1cblxuICBpZiAoaXNEb2N1bWVudEFydGlmYWN0UGF5bG9hZChjYW5kaWRhdGUpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6ICdkb2N1bWVudCcsXG4gICAgICByYXdEYXRhOiBlbnN1cmVEb2N1bWVudFVwbG9hZGVkR3JhcGhTaGFwZShjYW5kaWRhdGUpLFxuICAgIH07XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSB1cGxvYWRlZCBKU09OIGRvZXMgbm90IG1hdGNoIGEgc3VwcG9ydGVkIG9wZXJhdGlvbmFsIG9yIGRvY3VtZW50IGdyYXBoIGFydGlmYWN0IHNjaGVtYS4nKTtcbn1cblxuZnVuY3Rpb24gdG9GcmllbmRseU1lc3NhZ2UoZXJyb3I6IHVua25vd24pIHtcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXBpQ2xpZW50RXJyb3IpIHtcbiAgICByZXR1cm4gZXJyb3IubWVzc2FnZTtcbiAgfVxuXG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgcmV0dXJuIGVycm9yLm1lc3NhZ2U7XG4gIH1cblxuICByZXR1cm4gJ0FuIHVuZXhwZWN0ZWQgZnJvbnRlbmQgZXJyb3Igb2NjdXJyZWQuJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIEFwcFByb3ZpZGVyKHsgY2hpbGRyZW4gfTogeyBjaGlsZHJlbjogUmVhY3ROb2RlIH0pIHtcbiAgY29uc3QgW3VwbG9hZCwgc2V0VXBsb2FkXSA9IHVzZVN0YXRlPFVwbG9hZFN0YXRlPihpbml0aWFsVXBsb2FkU3RhdGUpO1xuICBjb25zdCBbZ3JhcGgsIHNldEdyYXBoXSA9IHVzZVN0YXRlPEdyYXBoU3RhdGU+KGluaXRpYWxHcmFwaFN0YXRlKTtcbiAgY29uc3QgW2RvY3VtZW50VXBsb2FkLCBzZXREb2N1bWVudFVwbG9hZF0gPSB1c2VTdGF0ZTxEb2N1bWVudFVwbG9hZFN0YXRlPihpbml0aWFsRG9jdW1lbnRVcGxvYWRTdGF0ZSk7XG4gIGNvbnN0IFtkb2N1bWVudEdyYXBoLCBzZXREb2N1bWVudEdyYXBoXSA9IHVzZVN0YXRlPERvY3VtZW50R3JhcGhTdGF0ZT4oaW5pdGlhbERvY3VtZW50R3JhcGhTdGF0ZSk7XG4gIGNvbnN0IFt1cGxvYWRlZEdyYXBoVXBsb2FkLCBzZXRVcGxvYWRlZEdyYXBoVXBsb2FkXSA9IHVzZVN0YXRlPFVwbG9hZGVkR3JhcGhVcGxvYWRTdGF0ZT4oaW5pdGlhbFVwbG9hZGVkR3JhcGhVcGxvYWRTdGF0ZSk7XG4gIGNvbnN0IFt1cGxvYWRlZEdyYXBoLCBzZXRVcGxvYWRlZEdyYXBoXSA9IHVzZVN0YXRlPFVwbG9hZGVkR3JhcGhTdGF0ZT4oaW5pdGlhbFVwbG9hZGVkR3JhcGhTdGF0ZSk7XG4gIGNvbnN0IHByb2Nlc3NpbmdQcm9taXNlUmVmID0gdXNlUmVmPFByb21pc2U8dm9pZD4gfCBudWxsPihudWxsKTtcbiAgY29uc3QgZG9jdW1lbnRQcm9jZXNzaW5nUHJvbWlzZVJlZiA9IHVzZVJlZjxQcm9taXNlPHZvaWQ+IHwgbnVsbD4obnVsbCk7XG5cbiAgY29uc3QgZ2V0RG9jdW1lbnRBcnRpZmFjdHNXaXRoUmV0cnkgPSB1c2VDYWxsYmFjayhhc3luYyAoaW5nZXN0aW9uSWQ6IHN0cmluZykgPT4ge1xuICAgIGxldCBsYXN0RXJyb3I6IHVua25vd24gPSBudWxsO1xuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgRE9DVU1FTlRfQVJUSUZBQ1RfRkVUQ0hfQVRURU1QVFM7IGF0dGVtcHQgKz0gMSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IGdldERvY3VtZW50QXJ0aWZhY3RzKGluZ2VzdGlvbklkKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGxhc3RFcnJvciA9IGVycm9yO1xuICAgICAgICBpZiAoYXR0ZW1wdCA8IERPQ1VNRU5UX0FSVElGQUNUX0ZFVENIX0FUVEVNUFRTIC0gMSkge1xuICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB3aW5kb3cuc2V0VGltZW91dChyZXNvbHZlLCBET0NVTUVOVF9BUlRJRkFDVF9GRVRDSF9ERUxBWV9NUykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IGxhc3RFcnJvcjtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHNldERyYWdBY3RpdmUgPSB1c2VDYWxsYmFjaygoYWN0aXZlOiBib29sZWFuKSA9PiB7XG4gICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PiB7XG4gICAgICBpZiAoYWN0aXZlKSB7XG4gICAgICAgIHJldHVybiB7IC4uLmN1cnJlbnQsIHBoYXNlOiAnZHJhZy1ob3ZlcicsIHN0YXR1c01lc3NhZ2U6ICdEcm9wIHRoZSBmaWxlIHRvIHF1ZXVlIGl0IGZvciBpbmdlc3Rpb24uJyB9O1xuICAgICAgfVxuXG4gICAgICBpZiAoY3VycmVudC5zZWxlY3RlZEZpbGUpIHtcbiAgICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdmaWxlLXNlbGVjdGVkJywgc3RhdHVzTWVzc2FnZTogYFJlYWR5IHRvIGFuYWx5emUgJHtjdXJyZW50LnNlbGVjdGVkRmlsZS5uYW1lfS5gIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IC4uLmN1cnJlbnQsIHBoYXNlOiAnaWRsZScsIHN0YXR1c01lc3NhZ2U6IGluaXRpYWxVcGxvYWRTdGF0ZS5zdGF0dXNNZXNzYWdlIH07XG4gICAgfSk7XG4gIH0sIFtdKTtcblxuICBjb25zdCBzZWxlY3RGaWxlID0gdXNlQ2FsbGJhY2soKGZpbGU6IEZpbGUgfCBudWxsKSA9PiB7XG4gICAgY29uc3QgbmV4dFN0YXRlID0gdmFsaWRhdGVTZWxlY3RlZEZpbGUoZmlsZSwgYXBwQ29uZmlnLm1heFVwbG9hZEJ5dGVzKTtcbiAgICBzZXRVcGxvYWQobmV4dFN0YXRlKTtcbiAgICByZXR1cm4gbmV4dFN0YXRlLnBoYXNlID09PSAnZmlsZS1zZWxlY3RlZCc7XG4gIH0sIFtdKTtcblxuICBjb25zdCBjbGVhclNlbGVjdGVkRmlsZSA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBzZXRVcGxvYWQoaW5pdGlhbFVwbG9hZFN0YXRlKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHNldERvY3VtZW50RHJhZ0FjdGl2ZSA9IHVzZUNhbGxiYWNrKChhY3RpdmU6IGJvb2xlYW4pID0+IHtcbiAgICBzZXREb2N1bWVudFVwbG9hZCgoY3VycmVudCkgPT4ge1xuICAgICAgaWYgKGFjdGl2ZSkge1xuICAgICAgICByZXR1cm4geyAuLi5jdXJyZW50LCBwaGFzZTogJ2RyYWctaG92ZXInLCBzdGF0dXNNZXNzYWdlOiAnRHJvcCB0aGUgZG9jdW1lbnQgdG8gcXVldWUgaXQgZm9yIGdyYXBoIGV4dHJhY3Rpb24uJyB9O1xuICAgICAgfVxuXG4gICAgICBpZiAoY3VycmVudC5zZWxlY3RlZEZpbGUpIHtcbiAgICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdmaWxlLXNlbGVjdGVkJywgc3RhdHVzTWVzc2FnZTogYFJlYWR5IHRvIG1hcCAke2N1cnJlbnQuc2VsZWN0ZWRGaWxlLm5hbWV9LmAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdpZGxlJywgc3RhdHVzTWVzc2FnZTogaW5pdGlhbERvY3VtZW50VXBsb2FkU3RhdGUuc3RhdHVzTWVzc2FnZSB9O1xuICAgIH0pO1xuICB9LCBbXSk7XG5cbiAgY29uc3Qgc2VsZWN0RG9jdW1lbnRGaWxlID0gdXNlQ2FsbGJhY2soKGZpbGU6IEZpbGUgfCBudWxsKSA9PiB7XG4gICAgY29uc3QgbmV4dFN0YXRlID0gdmFsaWRhdGVTZWxlY3RlZERvY3VtZW50RmlsZShmaWxlLCBhcHBDb25maWcubWF4VXBsb2FkQnl0ZXMpO1xuICAgIHNldERvY3VtZW50VXBsb2FkKG5leHRTdGF0ZSk7XG4gICAgcmV0dXJuIG5leHRTdGF0ZS5waGFzZSA9PT0gJ2ZpbGUtc2VsZWN0ZWQnO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgY2xlYXJTZWxlY3RlZERvY3VtZW50RmlsZSA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBzZXREb2N1bWVudFVwbG9hZChpbml0aWFsRG9jdW1lbnRVcGxvYWRTdGF0ZSk7XG4gIH0sIFtdKTtcblxuICBjb25zdCBzZXRVcGxvYWRlZEdyYXBoRHJhZ0FjdGl2ZSA9IHVzZUNhbGxiYWNrKChhY3RpdmU6IGJvb2xlYW4pID0+IHtcbiAgICBzZXRVcGxvYWRlZEdyYXBoVXBsb2FkKChjdXJyZW50KSA9PiB7XG4gICAgICBpZiAoYWN0aXZlKSB7XG4gICAgICAgIHJldHVybiB7IC4uLmN1cnJlbnQsIHBoYXNlOiAnZHJhZy1ob3ZlcicsIHN0YXR1c01lc3NhZ2U6ICdEcm9wIG1lcmdlZF9ncmFwaC5qc29uIHRvIG9wZW4gaXQgbG9jYWxseS4nIH07XG4gICAgICB9XG5cbiAgICAgIGlmIChjdXJyZW50LnNlbGVjdGVkRmlsZSkge1xuICAgICAgICByZXR1cm4geyAuLi5jdXJyZW50LCBwaGFzZTogJ2ZpbGUtc2VsZWN0ZWQnLCBzdGF0dXNNZXNzYWdlOiBgUmVhZHkgdG8gaW5zcGVjdCAke2N1cnJlbnQuc2VsZWN0ZWRGaWxlLm5hbWV9LmAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdpZGxlJywgc3RhdHVzTWVzc2FnZTogaW5pdGlhbFVwbG9hZGVkR3JhcGhVcGxvYWRTdGF0ZS5zdGF0dXNNZXNzYWdlIH07XG4gICAgfSk7XG4gIH0sIFtdKTtcblxuICBjb25zdCBzZWxlY3RVcGxvYWRlZEdyYXBoRmlsZSA9IHVzZUNhbGxiYWNrKChmaWxlOiBGaWxlIHwgbnVsbCkgPT4ge1xuICAgIGNvbnN0IG5leHRTdGF0ZSA9IHZhbGlkYXRlU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZShmaWxlLCBhcHBDb25maWcubWF4VXBsb2FkQnl0ZXMpO1xuICAgIHNldFVwbG9hZGVkR3JhcGhVcGxvYWQobmV4dFN0YXRlKTtcbiAgICBpZiAobmV4dFN0YXRlLnBoYXNlICE9PSAnZmlsZS1zZWxlY3RlZCcpIHtcbiAgICAgIHNldFVwbG9hZGVkR3JhcGgoaW5pdGlhbFVwbG9hZGVkR3JhcGhTdGF0ZSk7XG4gICAgfVxuICAgIHJldHVybiBuZXh0U3RhdGUucGhhc2UgPT09ICdmaWxlLXNlbGVjdGVkJztcbiAgfSwgW10pO1xuXG4gIGNvbnN0IGNsZWFyU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZSA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBzZXRVcGxvYWRlZEdyYXBoVXBsb2FkKGluaXRpYWxVcGxvYWRlZEdyYXBoVXBsb2FkU3RhdGUpO1xuICAgIHNldFVwbG9hZGVkR3JhcGgoaW5pdGlhbFVwbG9hZGVkR3JhcGhTdGF0ZSk7XG4gIH0sIFtdKTtcblxuICBjb25zdCBsb2FkR3JhcGggPSB1c2VDYWxsYmFjayhhc3luYyAob3B0aW9ucz86IHsga2VlcFN0YXR1cz86IGJvb2xlYW4gfSkgPT4ge1xuICAgIHNldEdyYXBoKChjdXJyZW50KSA9PiAoe1xuICAgICAgLi4uY3VycmVudCxcbiAgICAgIHN0YXR1czogJ2xvYWRpbmcnLFxuICAgICAgZXJyb3I6IG51bGwsXG4gICAgfSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCBnZXRHcmFwaCgpO1xuICAgICAgY29uc3QgYWRhcHRlZEdyYXBoID0gYWRhcHRHcmFwaChwYXlsb2FkKTtcbiAgICAgIHNldEdyYXBoKHtcbiAgICAgICAgc3RhdHVzOiAncmVhZHknLFxuICAgICAgICBkYXRhOiBhZGFwdGVkR3JhcGgsXG4gICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICBsYXN0TG9hZGVkQXQ6IERhdGUubm93KCksXG4gICAgICB9KTtcblxuICAgICAgaWYgKCFvcHRpb25zPy5rZWVwU3RhdHVzKSB7XG4gICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4ge1xuICAgICAgICAgIGlmIChjdXJyZW50LnBoYXNlID09PSAnc3VjY2VzcycgfHwgY3VycmVudC5waGFzZSA9PT0gJ2VtcHR5LWdyYXBoJykge1xuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgICBwaGFzZTogYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMCA/ICdlbXB0eS1ncmFwaCcgOiBjdXJyZW50LnBoYXNlLFxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gdG9GcmllbmRseU1lc3NhZ2UoZXJyb3IpO1xuICAgICAgc2V0R3JhcGgoe1xuICAgICAgICBzdGF0dXM6ICdlcnJvcicsXG4gICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgIGVycm9yOiBtZXNzYWdlLFxuICAgICAgICBsYXN0TG9hZGVkQXQ6IG51bGwsXG4gICAgICB9KTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfSwgW10pO1xuXG4gIGNvbnN0IGxvYWREb2N1bWVudEdyYXBoID0gdXNlQ2FsbGJhY2soYXN5bmMgKG9wdGlvbnM/OiB7IGtlZXBTdGF0dXM/OiBib29sZWFuIH0pID0+IHtcbiAgICBzZXREb2N1bWVudEdyYXBoKChjdXJyZW50KSA9PiAoe1xuICAgICAgLi4uY3VycmVudCxcbiAgICAgIHN0YXR1czogJ2xvYWRpbmcnLFxuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBhcnRpZmFjdHNFcnJvcjogY3VycmVudC5hcnRpZmFjdHNFcnJvcixcbiAgICB9KSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IGdldERvY3VtZW50R3JhcGgoKTtcbiAgICAgIGNvbnN0IGFkYXB0ZWRHcmFwaCA9IGFkYXB0RG9jdW1lbnRHcmFwaChwYXlsb2FkKTtcbiAgICAgIGNvbnN0IGFydGlmYWN0TWFuaWZlc3QgPSBhZGFwdGVkR3JhcGguaW5nZXN0aW9uSWRcbiAgICAgICAgPyBhd2FpdCBnZXREb2N1bWVudEFydGlmYWN0c1dpdGhSZXRyeShhZGFwdGVkR3JhcGguaW5nZXN0aW9uSWQpLmNhdGNoKCgpID0+IG51bGwpXG4gICAgICAgIDogbnVsbDtcbiAgICAgIHNldERvY3VtZW50R3JhcGgoe1xuICAgICAgICBzdGF0dXM6ICdyZWFkeScsXG4gICAgICAgIGRhdGE6IGFkYXB0ZWRHcmFwaCxcbiAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgIGxhc3RMb2FkZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgYXJ0aWZhY3RzOiBhcnRpZmFjdE1hbmlmZXN0LFxuICAgICAgICBhcnRpZmFjdHNFcnJvcjpcbiAgICAgICAgICBhZGFwdGVkR3JhcGguaW5nZXN0aW9uSWQgJiYgIWFydGlmYWN0TWFuaWZlc3RcbiAgICAgICAgICAgID8gJ1NvdXJjZSBtYXRlcmlhbHMgYXJlIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlIGZvciB0aGlzIGRvY3VtZW50IHJpZ2h0IG5vdy4nXG4gICAgICAgICAgICA6ICFhZGFwdGVkR3JhcGguaW5nZXN0aW9uSWRcbiAgICAgICAgICAgICAgPyAnU291cmNlIG1hdGVyaWFsIGRvd25sb2FkcyBhcmUgdW5hdmFpbGFibGUgYmVjYXVzZSB0aGlzIGRvY3VtZW50IGdyYXBoIHdhcyBsb2FkZWQgd2l0aG91dCBhbiBpbmdlc3Rpb24gSUQuJ1xuICAgICAgICAgICAgICA6IG51bGwsXG4gICAgICB9KTtcblxuICAgICAgaWYgKCFvcHRpb25zPy5rZWVwU3RhdHVzKSB7XG4gICAgICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGN1cnJlbnQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCBjdXJyZW50LnBoYXNlID09PSAnZW1wdHktZ3JhcGgnKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VycmVudDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICAgIHBoYXNlOiBhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwID8gJ2VtcHR5LWdyYXBoJyA6IGN1cnJlbnQucGhhc2UsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0b0ZyaWVuZGx5TWVzc2FnZShlcnJvcik7XG4gICAgICBzZXREb2N1bWVudEdyYXBoKHtcbiAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICBlcnJvcjogbWVzc2FnZSxcbiAgICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxuICAgICAgICBhcnRpZmFjdHM6IG51bGwsXG4gICAgICAgIGFydGlmYWN0c0Vycm9yOiBudWxsLFxuICAgICAgfSk7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH0sIFtdKTtcblxuICBjb25zdCBiZWdpblByb2Nlc3NpbmcgPSB1c2VDYWxsYmFjayhhc3luYyAoKSA9PiB7XG4gICAgaWYgKCF1cGxvYWQuc2VsZWN0ZWRGaWxlKSB7XG4gICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgIHBoYXNlOiAnZXJyb3InLFxuICAgICAgICBlcnJvcjogJ0Nob29zZSBhIC5tZCBvciAudHh0IGZpbGUgYmVmb3JlIHByb2Nlc3NpbmcuJyxcbiAgICAgICAgc3RhdHVzTWVzc2FnZTogJ05vIGZpbGUgc2VsZWN0ZWQuJyxcbiAgICAgIH0pKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAocHJvY2Vzc2luZ1Byb21pc2VSZWYuY3VycmVudCkge1xuICAgICAgcmV0dXJuIHByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQ7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZWN0ZWRGaWxlID0gdXBsb2FkLnNlbGVjdGVkRmlsZTtcblxuICAgIGNvbnN0IHRhc2sgPSAoYXN5bmMgKCkgPT4ge1xuICAgICAgbGV0IHByb2Nlc3NpbmdQaGFzZVRpbWVyID0gMDtcbiAgICAgIGNvbnN0IGluZ2VzdGlvbklkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICAgIGxldCBrZWVwUG9sbGluZyA9IHRydWU7XG5cbiAgICAgIGNvbnN0IHBvbGxQcm9jZXNzaW5nID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICB3aGlsZSAoa2VlcFBvbGxpbmcpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc2luZ1N0YXR1cyA9IGF3YWl0IGdldFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQpO1xuICAgICAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PlxuICAgICAgICAgICAgICBjdXJyZW50LmluZ2VzdGlvbklkICE9PSBpbmdlc3Rpb25JZFxuICAgICAgICAgICAgICAgID8gY3VycmVudFxuICAgICAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzLFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBwcm9jZXNzaW5nU3RhdHVzLmxhdGVzdF9ldmVudCB8fCBjdXJyZW50LnN0YXR1c01lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gUG9sbGluZyBpcyBiZXN0LWVmZm9ydCBzbyB0aGUgbWFpbiB1cGxvYWQgZmxvdyBjYW4gY29udGludWUgZXZlbiBpZiBzdGF0dXMgcmVmcmVzaCBmYWlscy5cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIWtlZXBQb2xsaW5nKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gd2luZG93LnNldFRpbWVvdXQocmVzb2x2ZSwgODAwKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIHBoYXNlOiAndXBsb2FkaW5nJyxcbiAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBgVXBsb2FkaW5nICR7c2VsZWN0ZWRGaWxlLm5hbWV9Li4uYCxcbiAgICAgICAgICBpbmdlc3Rpb25JZCxcbiAgICAgICAgICBzdGFydGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgICAgY29tcGxldGVkQXQ6IG51bGwsXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czoge1xuICAgICAgICAgICAgaW5nZXN0aW9uX2lkOiBpbmdlc3Rpb25JZCxcbiAgICAgICAgICAgIHN0YXRlOiAncGVuZGluZycsXG4gICAgICAgICAgICBmaWxlbmFtZTogc2VsZWN0ZWRGaWxlLm5hbWUsXG4gICAgICAgICAgICBjaHVua3NfdG90YWw6IG51bGwsXG4gICAgICAgICAgICBjdXJyZW50X2NodW5rOiBudWxsLFxuICAgICAgICAgICAgc3RhcnRlZF9hdDogbnVsbCxcbiAgICAgICAgICAgIGNvbXBsZXRlZF9hdDogbnVsbCxcbiAgICAgICAgICAgIGxhdGVzdF9ldmVudDogYFVwbG9hZGluZyAke3NlbGVjdGVkRmlsZS5uYW1lfS4uLmAsXG4gICAgICAgICAgICBldmVudHM6IFtdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pKTtcblxuICAgICAgICBjb25zdCBwb2xsaW5nVGFzayA9IHBvbGxQcm9jZXNzaW5nKCk7XG5cbiAgICAgICAgcHJvY2Vzc2luZ1BoYXNlVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PlxuICAgICAgICAgICAgY3VycmVudC5waGFzZSA9PT0gJ3VwbG9hZGluZydcbiAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgICAgICAgICAgcGhhc2U6ICdwcm9jZXNzaW5nJyxcbiAgICAgICAgICAgICAgICAgIHN0YXR1c01lc3NhZ2U6ICdFeHRyYWN0aW5nIGNvbXBvbmVudHMsIHJlbGF0aW9uc2hpcHMsIGFuZCByaXNrIG1ldHJpY3MuLi4nLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgOiBjdXJyZW50XG4gICAgICAgICAgKTtcbiAgICAgICAgfSwgOTAwKTtcblxuICAgICAgICBjb25zdCBpbmdlc3Rpb24gPSBhd2FpdCB1cGxvYWREb2N1bWVudChzZWxlY3RlZEZpbGUsIHRydWUsIGFwcENvbmZpZy5wcm9jZXNzaW5nVGltZW91dE1zLCBpbmdlc3Rpb25JZCk7XG4gICAgICAgIGNvbnN0IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgPSBhd2FpdCBnZXRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkKS5jYXRjaCgoKSA9PiBudWxsKTtcblxuICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBpbmdlc3Rpb24sXG4gICAgICAgICAgcGhhc2U6ICdwcm9jZXNzaW5nJyxcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzPy5sYXRlc3RfZXZlbnQgfHwgJ0xvYWRpbmcgdGhlIGdlbmVyYXRlZCBncmFwaCB3b3Jrc3BhY2UuLi4nLFxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgfHwgY3VycmVudC5wcm9jZXNzaW5nU3RhdHVzLFxuICAgICAgICB9KSk7XG5cbiAgICAgICAgY29uc3QgZ3JhcGhQYXlsb2FkID0gYXdhaXQgZ2V0R3JhcGgoKTtcbiAgICAgICAgY29uc3QgYWRhcHRlZEdyYXBoID0gYWRhcHRHcmFwaChncmFwaFBheWxvYWQpO1xuXG4gICAgICAgIHNldEdyYXBoKHtcbiAgICAgICAgICBzdGF0dXM6ICdyZWFkeScsXG4gICAgICAgICAgZGF0YTogYWRhcHRlZEdyYXBoLFxuICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgIGxhc3RMb2FkZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgaW5nZXN0aW9uLFxuICAgICAgICAgIGluZ2VzdGlvbklkLFxuICAgICAgICAgIHBoYXNlOiBhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwID8gJ2VtcHR5LWdyYXBoJyA6ICdzdWNjZXNzJyxcbiAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOlxuICAgICAgICAgICAgbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cz8ubGF0ZXN0X2V2ZW50IHx8XG4gICAgICAgICAgICAoYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICAgICA/ICdQcm9jZXNzaW5nIGNvbXBsZXRlZCwgYnV0IHRoZSBhY3RpdmUgZ3JhcGggaXMgZW1wdHkuJ1xuICAgICAgICAgICAgICA6ICdUd2luR3JhcGhPcHMgZmluaXNoZWQgcHJvY2Vzc2luZyB5b3VyIGRvY3VtZW50LicpLFxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6XG4gICAgICAgICAgICBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzID8/XG4gICAgICAgICAgICBjdXJyZW50LnByb2Nlc3NpbmdTdGF0dXMsXG4gICAgICAgICAgY29tcGxldGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgIH0pKTtcbiAgICAgICAga2VlcFBvbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgYXdhaXQgcG9sbGluZ1Rhc2s7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBrZWVwUG9sbGluZyA9IGZhbHNlO1xuICAgICAgICBjb25zdCBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzID0gYXdhaXQgZ2V0UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZCkuY2F0Y2goKCkgPT4gbnVsbCk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0b0ZyaWVuZGx5TWVzc2FnZShlcnJvcik7XG4gICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIHBoYXNlOiAncmV0cnknLFxuICAgICAgICAgIGVycm9yOiBtZXNzYWdlLFxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czogbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyB8fCBjdXJyZW50LnByb2Nlc3NpbmdTdGF0dXMsXG4gICAgICAgICAgY29tcGxldGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgICAgcmV0cnlDb3VudDogY3VycmVudC5yZXRyeUNvdW50ICsgMSxcbiAgICAgICAgfSkpO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGtlZXBQb2xsaW5nID0gZmFsc2U7XG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQocHJvY2Vzc2luZ1BoYXNlVGltZXIpO1xuICAgICAgICBwcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9KSgpO1xuXG4gICAgcHJvY2Vzc2luZ1Byb21pc2VSZWYuY3VycmVudCA9IHRhc2s7XG4gICAgcmV0dXJuIHRhc2s7XG4gIH0sIFt1cGxvYWQuc2VsZWN0ZWRGaWxlXSk7XG5cbiAgY29uc3QgYmVnaW5Eb2N1bWVudFByb2Nlc3NpbmcgPSB1c2VDYWxsYmFjayhhc3luYyAoKSA9PiB7XG4gICAgaWYgKCFkb2N1bWVudFVwbG9hZC5zZWxlY3RlZEZpbGUpIHtcbiAgICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICBwaGFzZTogJ2Vycm9yJyxcbiAgICAgICAgZXJyb3I6ICdDaG9vc2UgYSAucGRmLCAubWQsIG9yIC50eHQgZmlsZSBiZWZvcmUgcHJvY2Vzc2luZy4nLFxuICAgICAgICBzdGF0dXNNZXNzYWdlOiAnTm8gZG9jdW1lbnQgc2VsZWN0ZWQuJyxcbiAgICAgIH0pKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZG9jdW1lbnRQcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50KSB7XG4gICAgICByZXR1cm4gZG9jdW1lbnRQcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50O1xuICAgIH1cblxuICAgIGNvbnN0IHNlbGVjdGVkRmlsZSA9IGRvY3VtZW50VXBsb2FkLnNlbGVjdGVkRmlsZTtcblxuICAgIGNvbnN0IHRhc2sgPSAoYXN5bmMgKCkgPT4ge1xuICAgICAgbGV0IHByb2Nlc3NpbmdQaGFzZVRpbWVyID0gMDtcbiAgICAgIGNvbnN0IGluZ2VzdGlvbklkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICAgIGxldCBrZWVwUG9sbGluZyA9IHRydWU7XG5cbiAgICAgIGNvbnN0IHBvbGxQcm9jZXNzaW5nID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICB3aGlsZSAoa2VlcFBvbGxpbmcpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc2luZ1N0YXR1cyA9IGF3YWl0IGdldERvY3VtZW50UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZCk7XG4gICAgICAgICAgICBzZXREb2N1bWVudFVwbG9hZCgoY3VycmVudCkgPT5cbiAgICAgICAgICAgICAgY3VycmVudC5pbmdlc3Rpb25JZCAhPT0gaW5nZXN0aW9uSWRcbiAgICAgICAgICAgICAgICA/IGN1cnJlbnRcbiAgICAgICAgICAgICAgICA6IHtcbiAgICAgICAgICAgICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1cyxcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzTWVzc2FnZTogcHJvY2Vzc2luZ1N0YXR1cy5sYXRlc3RfZXZlbnQgfHwgY3VycmVudC5zdGF0dXNNZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIFBvbGxpbmcgaXMgYmVzdC1lZmZvcnQgc28gdGhlIG1haW4gdXBsb2FkIGZsb3cgY2FuIGNvbnRpbnVlLlxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICgha2VlcFBvbGxpbmcpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB3aW5kb3cuc2V0VGltZW91dChyZXNvbHZlLCA4MDApKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBwaGFzZTogJ3VwbG9hZGluZycsXG4gICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTogYFVwbG9hZGluZyAke3NlbGVjdGVkRmlsZS5uYW1lfS4uLmAsXG4gICAgICAgICAgaW5nZXN0aW9uSWQsXG4gICAgICAgICAgc3RhcnRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICAgIGNvbXBsZXRlZEF0OiBudWxsLFxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IHtcbiAgICAgICAgICAgIGluZ2VzdGlvbl9pZDogaW5nZXN0aW9uSWQsXG4gICAgICAgICAgICBzdGF0ZTogJ3BlbmRpbmcnLFxuICAgICAgICAgICAgZmlsZW5hbWU6IHNlbGVjdGVkRmlsZS5uYW1lLFxuICAgICAgICAgICAgY2h1bmtzX3RvdGFsOiBudWxsLFxuICAgICAgICAgICAgY3VycmVudF9jaHVuazogbnVsbCxcbiAgICAgICAgICAgIHN0YXJ0ZWRfYXQ6IG51bGwsXG4gICAgICAgICAgICBjb21wbGV0ZWRfYXQ6IG51bGwsXG4gICAgICAgICAgICBsYXRlc3RfZXZlbnQ6IGBVcGxvYWRpbmcgJHtzZWxlY3RlZEZpbGUubmFtZX0uLi5gLFxuICAgICAgICAgICAgZXZlbnRzOiBbXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KSk7XG5cbiAgICAgICAgY29uc3QgcG9sbGluZ1Rhc2sgPSBwb2xsUHJvY2Vzc2luZygpO1xuXG4gICAgICAgIHByb2Nlc3NpbmdQaGFzZVRpbWVyID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PlxuICAgICAgICAgICAgY3VycmVudC5waGFzZSA9PT0gJ3VwbG9hZGluZydcbiAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgICAgICAgICAgcGhhc2U6ICdwcm9jZXNzaW5nJyxcbiAgICAgICAgICAgICAgICAgIHN0YXR1c01lc3NhZ2U6ICdFeHRyYWN0aW5nIGRvY3VtZW50IGVudGl0aWVzLCBldmlkZW5jZSwgYW5kIHJlbGF0aW9uc2hpcHMuLi4nLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgOiBjdXJyZW50XG4gICAgICAgICAgKTtcbiAgICAgICAgfSwgOTAwKTtcblxuICAgICAgICBjb25zdCBpbmdlc3Rpb24gPSBhd2FpdCB1cGxvYWRLbm93bGVkZ2VEb2N1bWVudChzZWxlY3RlZEZpbGUsIHRydWUsIGFwcENvbmZpZy5wcm9jZXNzaW5nVGltZW91dE1zLCBpbmdlc3Rpb25JZCk7XG4gICAgICAgIHNldERvY3VtZW50VXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgaW5nZXN0aW9uLFxuICAgICAgICAgIHBoYXNlOiAncHJvY2Vzc2luZycsXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTogJ0RvY3VtZW50IGFjY2VwdGVkLiBXYWl0aW5nIGZvciBwcm9jZXNzaW5nIHByb2dyZXNzLi4uJyxcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIGxldCBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzID0gYXdhaXQgZ2V0RG9jdW1lbnRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkKS5jYXRjaCgoKSA9PiBudWxsKTtcbiAgICAgICAgd2hpbGUgKGtlZXBQb2xsaW5nICYmIGxhdGVzdFByb2Nlc3NpbmdTdGF0dXM/LnN0YXRlICE9PSAnc3VjY2VlZGVkJyAmJiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzPy5zdGF0ZSAhPT0gJ2ZhaWxlZCcpIHtcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gd2luZG93LnNldFRpbWVvdXQocmVzb2x2ZSwgODAwKSk7XG4gICAgICAgICAgbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyA9IGF3YWl0IGdldERvY3VtZW50UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZCkuY2F0Y2goKCkgPT4gbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cz8uc3RhdGUgPT09ICdmYWlsZWQnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKFxuICAgICAgICAgICAgbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cy5sYXRlc3RfZXZlbnQgfHwgJ0RvY3VtZW50IHByb2Nlc3NpbmcgZmFpbGVkIGJlZm9yZSB0aGUgZ3JhcGggd2FzIHJlYWR5LicsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvZGU6ICdkb2N1bWVudF9wcm9jZXNzaW5nX2ZhaWxlZCcsXG4gICAgICAgICAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZ3JhcGhQYXlsb2FkID0gYXdhaXQgZ2V0RG9jdW1lbnRHcmFwaCgpO1xuICAgICAgICBjb25zdCBhZGFwdGVkR3JhcGggPSBhZGFwdERvY3VtZW50R3JhcGgoZ3JhcGhQYXlsb2FkKTtcbiAgICAgICAgY29uc3QgYXJ0aWZhY3RNYW5pZmVzdCA9IGFkYXB0ZWRHcmFwaC5pbmdlc3Rpb25JZFxuICAgICAgICAgID8gYXdhaXQgZ2V0RG9jdW1lbnRBcnRpZmFjdHNXaXRoUmV0cnkoYWRhcHRlZEdyYXBoLmluZ2VzdGlvbklkKS5jYXRjaCgoKSA9PiBudWxsKVxuICAgICAgICAgIDogbnVsbDtcblxuICAgICAgICBzZXREb2N1bWVudEdyYXBoKHtcbiAgICAgICAgICBzdGF0dXM6ICdyZWFkeScsXG4gICAgICAgICAgZGF0YTogYWRhcHRlZEdyYXBoLFxuICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgIGxhc3RMb2FkZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgICBhcnRpZmFjdHM6IGFydGlmYWN0TWFuaWZlc3QsXG4gICAgICAgICAgYXJ0aWZhY3RzRXJyb3I6XG4gICAgICAgICAgICBhZGFwdGVkR3JhcGguaW5nZXN0aW9uSWQgJiYgIWFydGlmYWN0TWFuaWZlc3RcbiAgICAgICAgICAgICAgPyAnU291cmNlIG1hdGVyaWFscyBhcmUgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUgZm9yIHRoaXMgZG9jdW1lbnQgcmlnaHQgbm93LidcbiAgICAgICAgICAgICAgOiAhYWRhcHRlZEdyYXBoLmluZ2VzdGlvbklkXG4gICAgICAgICAgICAgICAgPyAnU291cmNlIG1hdGVyaWFsIGRvd25sb2FkcyBhcmUgdW5hdmFpbGFibGUgYmVjYXVzZSB0aGlzIGRvY3VtZW50IGdyYXBoIHdhcyBsb2FkZWQgd2l0aG91dCBhbiBpbmdlc3Rpb24gSUQuJ1xuICAgICAgICAgICAgICAgIDogbnVsbCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2V0RG9jdW1lbnRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBpbmdlc3Rpb24sXG4gICAgICAgICAgaW5nZXN0aW9uSWQsXG4gICAgICAgICAgcGhhc2U6IGFkYXB0ZWRHcmFwaC5ub2Rlcy5sZW5ndGggPT09IDAgPyAnZW1wdHktZ3JhcGgnIDogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6XG4gICAgICAgICAgICBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzPy5sYXRlc3RfZXZlbnQgfHxcbiAgICAgICAgICAgIChhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgID8gJ1Byb2Nlc3NpbmcgY29tcGxldGVkLCBidXQgdGhlIGRvY3VtZW50IGdyYXBoIGlzIGVtcHR5LidcbiAgICAgICAgICAgICAgOiAnVHdpbkdyYXBoT3BzIGZpbmlzaGVkIG1hcHBpbmcgeW91ciBkb2N1bWVudC4nKSxcbiAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzOiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzID8/IGN1cnJlbnQucHJvY2Vzc2luZ1N0YXR1cyxcbiAgICAgICAgICBjb21wbGV0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgfSkpO1xuICAgICAgICBrZWVwUG9sbGluZyA9IGZhbHNlO1xuICAgICAgICBhd2FpdCBwb2xsaW5nVGFzaztcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGtlZXBQb2xsaW5nID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgPSBhd2FpdCBnZXREb2N1bWVudFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQpLmNhdGNoKCgpID0+IG51bGwpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gdG9GcmllbmRseU1lc3NhZ2UoZXJyb3IpO1xuICAgICAgICBzZXREb2N1bWVudFVwbG9hZCgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIHBoYXNlOiAncmV0cnknLFxuICAgICAgICAgIGVycm9yOiBtZXNzYWdlLFxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czogbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyB8fCBjdXJyZW50LnByb2Nlc3NpbmdTdGF0dXMsXG4gICAgICAgICAgY29tcGxldGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgICAgcmV0cnlDb3VudDogY3VycmVudC5yZXRyeUNvdW50ICsgMSxcbiAgICAgICAgfSkpO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGtlZXBQb2xsaW5nID0gZmFsc2U7XG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQocHJvY2Vzc2luZ1BoYXNlVGltZXIpO1xuICAgICAgICBkb2N1bWVudFByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgfVxuICAgIH0pKCk7XG5cbiAgICBkb2N1bWVudFByb2Nlc3NpbmdQcm9taXNlUmVmLmN1cnJlbnQgPSB0YXNrO1xuICAgIHJldHVybiB0YXNrO1xuICB9LCBbZG9jdW1lbnRVcGxvYWQuc2VsZWN0ZWRGaWxlXSk7XG5cbiAgY29uc3QgbG9hZFVwbG9hZGVkR3JhcGhGcm9tU2VsZWN0ZWRGaWxlID0gdXNlQ2FsbGJhY2soYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHNlbGVjdGVkRmlsZSA9IHVwbG9hZGVkR3JhcGhVcGxvYWQuc2VsZWN0ZWRGaWxlO1xuICAgIGlmICghc2VsZWN0ZWRGaWxlKSB7XG4gICAgICBzZXRVcGxvYWRlZEdyYXBoVXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICBwaGFzZTogJ2Vycm9yJyxcbiAgICAgICAgZXJyb3I6ICdDaG9vc2UgYSBncmFwaCBhcnRpZmFjdCBKU09OIGZpbGUgYmVmb3JlIG9wZW5pbmcgdGhlIGdyYXBoIHdvcmtzcGFjZS4nLFxuICAgICAgICBzdGF0dXNNZXNzYWdlOiAnTm8gZ3JhcGggZmlsZSBzZWxlY3RlZC4nLFxuICAgICAgfSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNldFVwbG9hZGVkR3JhcGgoKGN1cnJlbnQpID0+ICh7XG4gICAgICAuLi5jdXJyZW50LFxuICAgICAgc3RhdHVzOiAnbG9hZGluZycsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIGZpbGVuYW1lOiBzZWxlY3RlZEZpbGUubmFtZSxcbiAgICB9KSk7XG4gICAgc2V0VXBsb2FkZWRHcmFwaFVwbG9hZCgoY3VycmVudCkgPT4gKHtcbiAgICAgIC4uLmN1cnJlbnQsXG4gICAgICBwaGFzZTogJ3VwbG9hZGluZycsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIHN0YXR1c01lc3NhZ2U6IGBMb2FkaW5nICR7c2VsZWN0ZWRGaWxlLm5hbWV9IGxvY2FsbHkuLi5gLFxuICAgIH0pKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBmaWxlQ29udGVudHMgPSBhd2FpdCBzZWxlY3RlZEZpbGUudGV4dCgpO1xuICAgICAgY29uc3QgcGFyc2VkQXJ0aWZhY3QgPSBwYXJzZVVwbG9hZGVkR3JhcGhKc29uKGZpbGVDb250ZW50cyk7XG4gICAgICBpZiAocGFyc2VkQXJ0aWZhY3Qua2luZCA9PT0gJ29wZXJhdGlvbmFsJykge1xuICAgICAgICBjb25zdCBhZGFwdGVkR3JhcGggPSBhZGFwdE1lcmdlZEdyYXBoKHBhcnNlZEFydGlmYWN0LnJhd0RhdGEgYXMgQXBpTWVyZ2VkR3JhcGhEYXRhLCBzZWxlY3RlZEZpbGUubmFtZSk7XG4gICAgICAgIHNldFVwbG9hZGVkR3JhcGgoe1xuICAgICAgICAgIHN0YXR1czogJ3JlYWR5JyxcbiAgICAgICAgICBraW5kOiAnb3BlcmF0aW9uYWwnLFxuICAgICAgICAgIG9wZXJhdGlvbmFsRGF0YTogYWRhcHRlZEdyYXBoLFxuICAgICAgICAgIGRvY3VtZW50RGF0YTogbnVsbCxcbiAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICBsYXN0TG9hZGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgICAgZmlsZW5hbWU6IHNlbGVjdGVkRmlsZS5uYW1lLFxuICAgICAgICAgIHJhd0RhdGE6IHBhcnNlZEFydGlmYWN0LnJhd0RhdGEsXG4gICAgICAgIH0pO1xuICAgICAgICBzZXRVcGxvYWRlZEdyYXBoVXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgcGhhc2U6IGFkYXB0ZWRHcmFwaC5ub2Rlcy5sZW5ndGggPT09IDAgPyAnZW1wdHktZ3JhcGgnIDogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6XG4gICAgICAgICAgICBhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgID8gJ1RoZSB1cGxvYWRlZCBvcGVyYXRpb25hbCBncmFwaCBjb250YWlucyBubyBub2Rlcy4nXG4gICAgICAgICAgICAgIDogYExvYWRlZCBvcGVyYXRpb25hbCBncmFwaCBhcnRpZmFjdCAke3NlbGVjdGVkRmlsZS5uYW1lfS5gLFxuICAgICAgICB9KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBhZGFwdGVkR3JhcGggPSBhZGFwdERvY3VtZW50R3JhcGgocGFyc2VkQXJ0aWZhY3QucmF3RGF0YSBhcyBBcGlEb2N1bWVudEdyYXBoRGF0YSk7XG4gICAgICAgIHNldFVwbG9hZGVkR3JhcGgoe1xuICAgICAgICAgIHN0YXR1czogJ3JlYWR5JyxcbiAgICAgICAgICBraW5kOiAnZG9jdW1lbnQnLFxuICAgICAgICAgIG9wZXJhdGlvbmFsRGF0YTogbnVsbCxcbiAgICAgICAgICBkb2N1bWVudERhdGE6IGFkYXB0ZWRHcmFwaCxcbiAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICBsYXN0TG9hZGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgICAgZmlsZW5hbWU6IHNlbGVjdGVkRmlsZS5uYW1lLFxuICAgICAgICAgIHJhd0RhdGE6IHBhcnNlZEFydGlmYWN0LnJhd0RhdGEsXG4gICAgICAgIH0pO1xuICAgICAgICBzZXRVcGxvYWRlZEdyYXBoVXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgcGhhc2U6IGFkYXB0ZWRHcmFwaC5ub2Rlcy5sZW5ndGggPT09IDAgPyAnZW1wdHktZ3JhcGgnIDogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6XG4gICAgICAgICAgICBhZGFwdGVkR3JhcGgubm9kZXMubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgID8gJ1RoZSB1cGxvYWRlZCBkb2N1bWVudCBncmFwaCBjb250YWlucyBubyBub2Rlcy4nXG4gICAgICAgICAgICAgIDogYExvYWRlZCBkb2N1bWVudCBncmFwaCBhcnRpZmFjdCAke3NlbGVjdGVkRmlsZS5uYW1lfS5gLFxuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0b0ZyaWVuZGx5TWVzc2FnZShlcnJvcik7XG4gICAgICBzZXRVcGxvYWRlZEdyYXBoKHtcbiAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgICBraW5kOiBudWxsLFxuICAgICAgICBvcGVyYXRpb25hbERhdGE6IG51bGwsXG4gICAgICAgIGRvY3VtZW50RGF0YTogbnVsbCxcbiAgICAgICAgZXJyb3I6IG1lc3NhZ2UsXG4gICAgICAgIGxhc3RMb2FkZWRBdDogbnVsbCxcbiAgICAgICAgZmlsZW5hbWU6IHNlbGVjdGVkRmlsZS5uYW1lLFxuICAgICAgICByYXdEYXRhOiBudWxsLFxuICAgICAgfSk7XG4gICAgICBzZXRVcGxvYWRlZEdyYXBoVXBsb2FkKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICBwaGFzZTogJ2Vycm9yJyxcbiAgICAgICAgZXJyb3I6IG1lc3NhZ2UsXG4gICAgICAgIHN0YXR1c01lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICB9KSk7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH0sIFt1cGxvYWRlZEdyYXBoVXBsb2FkLnNlbGVjdGVkRmlsZV0pO1xuXG4gIGNvbnN0IHJlc2V0VXBsb2FkU3RhdGUgPSB1c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgc2V0VXBsb2FkKGluaXRpYWxVcGxvYWRTdGF0ZSk7XG4gICAgc2V0RG9jdW1lbnRVcGxvYWQoaW5pdGlhbERvY3VtZW50VXBsb2FkU3RhdGUpO1xuICAgIHNldFVwbG9hZGVkR3JhcGhVcGxvYWQoaW5pdGlhbFVwbG9hZGVkR3JhcGhVcGxvYWRTdGF0ZSk7XG4gICAgc2V0VXBsb2FkZWRHcmFwaChpbml0aWFsVXBsb2FkZWRHcmFwaFN0YXRlKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHZhbHVlID0gdXNlTWVtbzxBcHBDb250ZXh0VmFsdWU+KFxuICAgICgpID0+ICh7XG4gICAgICB1cGxvYWQsXG4gICAgICBncmFwaCxcbiAgICAgIGRvY3VtZW50VXBsb2FkLFxuICAgICAgZG9jdW1lbnRHcmFwaCxcbiAgICAgIHVwbG9hZGVkR3JhcGhVcGxvYWQsXG4gICAgICB1cGxvYWRlZEdyYXBoLFxuICAgICAgc2V0RHJhZ0FjdGl2ZSxcbiAgICAgIHNlbGVjdEZpbGUsXG4gICAgICBjbGVhclNlbGVjdGVkRmlsZSxcbiAgICAgIGJlZ2luUHJvY2Vzc2luZyxcbiAgICAgIGxvYWRHcmFwaCxcbiAgICAgIHNldERvY3VtZW50RHJhZ0FjdGl2ZSxcbiAgICAgIHNlbGVjdERvY3VtZW50RmlsZSxcbiAgICAgIGNsZWFyU2VsZWN0ZWREb2N1bWVudEZpbGUsXG4gICAgICBiZWdpbkRvY3VtZW50UHJvY2Vzc2luZyxcbiAgICAgIGxvYWREb2N1bWVudEdyYXBoLFxuICAgICAgc2V0VXBsb2FkZWRHcmFwaERyYWdBY3RpdmUsXG4gICAgICBzZWxlY3RVcGxvYWRlZEdyYXBoRmlsZSxcbiAgICAgIGNsZWFyU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZSxcbiAgICAgIGxvYWRVcGxvYWRlZEdyYXBoRnJvbVNlbGVjdGVkRmlsZSxcbiAgICAgIHJlc2V0VXBsb2FkU3RhdGUsXG4gICAgfSksXG4gICAgW1xuICAgICAgdXBsb2FkLFxuICAgICAgZ3JhcGgsXG4gICAgICBkb2N1bWVudFVwbG9hZCxcbiAgICAgIGRvY3VtZW50R3JhcGgsXG4gICAgICB1cGxvYWRlZEdyYXBoVXBsb2FkLFxuICAgICAgdXBsb2FkZWRHcmFwaCxcbiAgICAgIHNldERyYWdBY3RpdmUsXG4gICAgICBzZWxlY3RGaWxlLFxuICAgICAgY2xlYXJTZWxlY3RlZEZpbGUsXG4gICAgICBiZWdpblByb2Nlc3NpbmcsXG4gICAgICBsb2FkR3JhcGgsXG4gICAgICBzZXREb2N1bWVudERyYWdBY3RpdmUsXG4gICAgICBzZWxlY3REb2N1bWVudEZpbGUsXG4gICAgICBjbGVhclNlbGVjdGVkRG9jdW1lbnRGaWxlLFxuICAgICAgYmVnaW5Eb2N1bWVudFByb2Nlc3NpbmcsXG4gICAgICBsb2FkRG9jdW1lbnRHcmFwaCxcbiAgICAgIHNldFVwbG9hZGVkR3JhcGhEcmFnQWN0aXZlLFxuICAgICAgc2VsZWN0VXBsb2FkZWRHcmFwaEZpbGUsXG4gICAgICBjbGVhclNlbGVjdGVkVXBsb2FkZWRHcmFwaEZpbGUsXG4gICAgICBsb2FkVXBsb2FkZWRHcmFwaEZyb21TZWxlY3RlZEZpbGUsXG4gICAgICByZXNldFVwbG9hZFN0YXRlLFxuICAgIF1cbiAgKTtcblxuICByZXR1cm4gPEFwcENvbnRleHQuUHJvdmlkZXIgdmFsdWU9e3ZhbHVlfT57Y2hpbGRyZW59PC9BcHBDb250ZXh0LlByb3ZpZGVyPjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZUFwcENvbnRleHQoKSB7XG4gIGNvbnN0IGNvbnRleHQgPSB1c2VDb250ZXh0KEFwcENvbnRleHQpO1xuICBpZiAoIWNvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3VzZUFwcENvbnRleHQgbXVzdCBiZSB1c2VkIHdpdGhpbiBBcHBQcm92aWRlci4nKTtcbiAgfVxuICByZXR1cm4gY29udGV4dDtcbn1cbiIsICJpbXBvcnQgYXNzZXJ0IGZyb20gJ25vZGU6YXNzZXJ0L3N0cmljdCc7XG5pbXBvcnQgdGVzdCBmcm9tICdub2RlOnRlc3QnO1xuaW1wb3J0IHsgaW5zdGFsbFJ1bnRpbWVXaW5kb3dDb25maWcgfSBmcm9tICcuL3Rlc3QtdXRpbHMnO1xuXG5pbnN0YWxsUnVudGltZVdpbmRvd0NvbmZpZygpO1xuXG5jb25zdCBzdGF0ZU1vZHVsZSA9IGF3YWl0IGltcG9ydCgnLi4vc3JjL3N0YXRlL0FwcENvbnRleHQnKTtcbmNvbnN0IHtcbiAgY3JlYXRlU2VsZWN0ZWREb2N1bWVudEZpbGVVcGxvYWRTdGF0ZSxcbiAgY3JlYXRlU2VsZWN0ZWRGaWxlVXBsb2FkU3RhdGUsXG4gIGNyZWF0ZVNlbGVjdGVkVXBsb2FkZWRHcmFwaEZpbGVTdGF0ZSxcbiAgZ2V0RmlsZUV4dGVuc2lvbixcbiAgcGFyc2VVcGxvYWRlZEdyYXBoSnNvbixcbiAgdmFsaWRhdGVTZWxlY3RlZERvY3VtZW50RmlsZSxcbiAgdmFsaWRhdGVTZWxlY3RlZEZpbGUsXG4gIHZhbGlkYXRlU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZSxcbn0gPSBzdGF0ZU1vZHVsZTtcblxudGVzdCgnZ2V0RmlsZUV4dGVuc2lvbiBub3JtYWxpemVzIGZpbGUgZXh0ZW5zaW9ucycsICgpID0+IHtcbiAgYXNzZXJ0LmVxdWFsKGdldEZpbGVFeHRlbnNpb24oJ21hbnVhbC5NRCcpLCAnLm1kJyk7XG4gIGFzc2VydC5lcXVhbChnZXRGaWxlRXh0ZW5zaW9uKCdub3Rlcy50eHQnKSwgJy50eHQnKTtcbiAgYXNzZXJ0LmVxdWFsKGdldEZpbGVFeHRlbnNpb24oJ1JFQURNRScpLCAnJyk7XG59KTtcblxudGVzdCgndmFsaWRhdGVTZWxlY3RlZEZpbGUgcmVqZWN0cyB1bnN1cHBvcnRlZCBmaWxlIHR5cGVzJywgKCkgPT4ge1xuICBjb25zdCBmaWxlID0gbmV3IEZpbGUoWydiYWQnXSwgJ2RpYWdyYW0ucGRmJywgeyB0eXBlOiAnYXBwbGljYXRpb24vcGRmJyB9KTtcbiAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVTZWxlY3RlZEZpbGUoZmlsZSwgMTAgKiAxMDI0ICogMTAyNCk7XG5cbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5waGFzZSwgJ2Vycm9yJyk7XG4gIGFzc2VydC5lcXVhbChyZXN1bHQuZXJyb3IsICdPbmx5IC5tZCBhbmQgLnR4dCBmaWxlcyBhcmUgc3VwcG9ydGVkLicpO1xuICBhc3NlcnQuZXF1YWwocmVzdWx0LnN0YXR1c01lc3NhZ2UsICdVbnN1cHBvcnRlZCBmaWxlIHR5cGUuJyk7XG59KTtcblxudGVzdCgndmFsaWRhdGVTZWxlY3RlZEZpbGUgcmVqZWN0cyBvdmVyc2l6ZWQgZmlsZXMnLCAoKSA9PiB7XG4gIGNvbnN0IGZpbGUgPSBuZXcgRmlsZShbbmV3IFVpbnQ4QXJyYXkoMTIpXSwgJ3N5c3RlbS5tZCcsIHsgdHlwZTogJ3RleHQvbWFya2Rvd24nIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZmlsZSwgJ3NpemUnLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IDUyICogMTAyNCAqIDEwMjQgfSk7XG5cbiAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVTZWxlY3RlZEZpbGUoZmlsZSwgNTAgKiAxMDI0ICogMTAyNCk7XG5cbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5waGFzZSwgJ2Vycm9yJyk7XG4gIGFzc2VydC5tYXRjaChyZXN1bHQuZXJyb3IgfHwgJycsIC81MCBNQiB1cGxvYWQgbGltaXQvKTtcbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5zdGF0dXNNZXNzYWdlLCAnU2VsZWN0ZWQgZmlsZSBpcyB0b28gbGFyZ2UuJyk7XG59KTtcblxudGVzdCgndmFsaWRhdGVTZWxlY3RlZEZpbGUgYWNjZXB0cyBzdXBwb3J0ZWQgZmlsZXMgYW5kIHJldHVybnMgdGhlIHNlbGVjdGVkLWZpbGUgc3RhdGUnLCAoKSA9PiB7XG4gIGNvbnN0IGZpbGUgPSBuZXcgRmlsZShbJ2hlbGxvJ10sICdzeXN0ZW0ubWQnLCB7IHR5cGU6ICd0ZXh0L21hcmtkb3duJyB9KTtcbiAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVTZWxlY3RlZEZpbGUoZmlsZSwgMTAgKiAxMDI0ICogMTAyNCk7XG5cbiAgYXNzZXJ0LmRlZXBFcXVhbChyZXN1bHQsIGNyZWF0ZVNlbGVjdGVkRmlsZVVwbG9hZFN0YXRlKGZpbGUpKTtcbn0pO1xuXG50ZXN0KCd2YWxpZGF0ZVNlbGVjdGVkRG9jdW1lbnRGaWxlIGFjY2VwdHMgcGRmIG1hcmtkb3duIGFuZCB0ZXh0IGZpbGVzJywgKCkgPT4ge1xuICBmb3IgKGNvbnN0IGZpbGVuYW1lIG9mIFsncG9saWN5LnBkZicsICdwb2xpY3kubWQnLCAncG9saWN5LnR4dCddKSB7XG4gICAgY29uc3QgZmlsZSA9IG5ldyBGaWxlKFsnaGVsbG8nXSwgZmlsZW5hbWUpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlU2VsZWN0ZWREb2N1bWVudEZpbGUoZmlsZSwgMTAgKiAxMDI0ICogMTAyNCk7XG5cbiAgICBhc3NlcnQuZGVlcEVxdWFsKHJlc3VsdCwgY3JlYXRlU2VsZWN0ZWREb2N1bWVudEZpbGVVcGxvYWRTdGF0ZShmaWxlKSk7XG4gIH1cbn0pO1xuXG50ZXN0KCd2YWxpZGF0ZVNlbGVjdGVkVXBsb2FkZWRHcmFwaEZpbGUgcmVqZWN0cyBub24tanNvbiBmaWxlcycsICgpID0+IHtcbiAgY29uc3QgZmlsZSA9IG5ldyBGaWxlKFsnYmFkJ10sICdncmFwaC5tZCcsIHsgdHlwZTogJ3RleHQvbWFya2Rvd24nIH0pO1xuICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZVNlbGVjdGVkVXBsb2FkZWRHcmFwaEZpbGUoZmlsZSwgMTAgKiAxMDI0ICogMTAyNCk7XG5cbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5waGFzZSwgJ2Vycm9yJyk7XG4gIGFzc2VydC5lcXVhbChyZXN1bHQuZXJyb3IsICdPbmx5IC5qc29uIGdyYXBoIGFydGlmYWN0IGZpbGVzIGFyZSBzdXBwb3J0ZWQuJyk7XG59KTtcblxudGVzdCgndmFsaWRhdGVTZWxlY3RlZFVwbG9hZGVkR3JhcGhGaWxlIGFjY2VwdHMganNvbiBmaWxlcycsICgpID0+IHtcbiAgY29uc3QgZmlsZSA9IG5ldyBGaWxlKFsne30nXSwgJ21lcmdlZF9ncmFwaC5qc29uJywgeyB0eXBlOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG4gIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZShmaWxlLCAxMCAqIDEwMjQgKiAxMDI0KTtcblxuICBhc3NlcnQuZGVlcEVxdWFsKHJlc3VsdCwgY3JlYXRlU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZVN0YXRlKGZpbGUpKTtcbn0pO1xuXG50ZXN0KCdwYXJzZVVwbG9hZGVkR3JhcGhKc29uIHJlamVjdHMgbWFsZm9ybWVkIEpTT04gdGV4dCcsICgpID0+IHtcbiAgYXNzZXJ0LnRocm93cygoKSA9PiBwYXJzZVVwbG9hZGVkR3JhcGhKc29uKCd7YmFkIGpzb259JyksIC9ub3QgdmFsaWQgSlNPTi8pO1xufSk7XG5cbnRlc3QoJ3BhcnNlVXBsb2FkZWRHcmFwaEpzb24gcmVqZWN0cyB2YWxpZCBKU09OIHdpdGggdGhlIHdyb25nIHNjaGVtYScsICgpID0+IHtcbiAgYXNzZXJ0LnRocm93cyhcbiAgICAoKSA9PiBwYXJzZVVwbG9hZGVkR3JhcGhKc29uKEpTT04uc3RyaW5naWZ5KHsgbm9kZXM6IFt7IGlkOiAnbjEnIH1dLCBlZGdlczogW10gfSkpLFxuICAgIC9zdXBwb3J0ZWQgb3BlcmF0aW9uYWwgb3IgZG9jdW1lbnQgZ3JhcGggYXJ0aWZhY3Qgc2NoZW1hL1xuICApO1xufSk7XG5cbnRlc3QoJ3BhcnNlVXBsb2FkZWRHcmFwaEpzb24gYWNjZXB0cyBmaW5hbGl6ZWQgbWVyZ2VkIGdyYXBoIHBheWxvYWRzJywgKCkgPT4ge1xuICBjb25zdCBwYXlsb2FkID0gcGFyc2VVcGxvYWRlZEdyYXBoSnNvbihcbiAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICBub2RlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdhcGknLFxuICAgICAgICAgIG5hbWU6ICdBUEknLFxuICAgICAgICAgIHR5cGU6ICdzb2Z0d2FyZScsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdDb3JlIEFQSScsXG4gICAgICAgICAgcmlza19zY29yZTogODIsXG4gICAgICAgICAgcmlza19sZXZlbDogJ2hpZ2gnLFxuICAgICAgICAgIGRlZ3JlZTogMixcbiAgICAgICAgICBiZXR3ZWVubmVzczogMC41LFxuICAgICAgICAgIGNsb3NlbmVzczogMC42LFxuICAgICAgICAgIGJsYXN0X3JhZGl1czogMyxcbiAgICAgICAgICBkZXBlbmRlbmN5X3NwYW46IDIsXG4gICAgICAgICAgcmlza19leHBsYW5hdGlvbjogJ0NyaXRpY2FsIGRlcGVuZGVuY3kgaHViLicsXG4gICAgICAgICAgc291cmNlOiAndXNlcicsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgZWRnZXM6IFtdLFxuICAgIH0pXG4gICk7XG5cbiAgYXNzZXJ0LmVxdWFsKHBheWxvYWQua2luZCwgJ29wZXJhdGlvbmFsJyk7XG4gIGFzc2VydC5lcXVhbCgocGF5bG9hZC5yYXdEYXRhIGFzIGFueSkubm9kZXNbMF0uaWQsICdhcGknKTtcbiAgYXNzZXJ0LmRlZXBFcXVhbCgocGF5bG9hZC5yYXdEYXRhIGFzIGFueSkuZWRnZXMsIFtdKTtcbn0pO1xuXG50ZXN0KCdwYXJzZVVwbG9hZGVkR3JhcGhKc29uIGFjY2VwdHMgbWVyZ2VkX2RvY3VtZW50X2dyYXBoIHBheWxvYWRzJywgKCkgPT4ge1xuICBjb25zdCBwYXlsb2FkID0gcGFyc2VVcGxvYWRlZEdyYXBoSnNvbihcbiAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICBzb3VyY2U6ICdkb2N1bWVudCcsXG4gICAgICBub2RlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdEMScsXG4gICAgICAgICAgbGFiZWw6ICdSZXRlbnRpb24gUG9saWN5JyxcbiAgICAgICAgICBraW5kOiAncmVxdWlyZW1lbnQnLFxuICAgICAgICAgIGNhbm9uaWNhbF9uYW1lOiAnUmV0ZW50aW9uIFBvbGljeScsXG4gICAgICAgICAgYWxpYXNlczogWydyZWNvcmRzIHBvbGljeSddLFxuICAgICAgICAgIHN1bW1hcnk6ICdEZWZpbmVzIHJldGVudGlvbi4nLFxuICAgICAgICAgIGV2aWRlbmNlOiBbXSxcbiAgICAgICAgICBzb3VyY2VzOiBbXSxcbiAgICAgICAgICBkZWdyZWU6IDEsXG4gICAgICAgICAgc291cmNlOiAnZG9jdW1lbnQnLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGVkZ2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0RFMScsXG4gICAgICAgICAgc291cmNlOiAnRDEnLFxuICAgICAgICAgIHRhcmdldDogJ0QxJyxcbiAgICAgICAgICB0eXBlOiAncmVmZXJlbmNlcycsXG4gICAgICAgICAgc3VtbWFyeTogJ1NlbGYgcmVmZXJlbmNlIGluIGZpeHR1cmUgb25seS4nLFxuICAgICAgICAgIGV2aWRlbmNlOiBbXSxcbiAgICAgICAgICBzb3VyY2VfY2h1bms6IG51bGwsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pXG4gICk7XG5cbiAgYXNzZXJ0LmVxdWFsKHBheWxvYWQua2luZCwgJ2RvY3VtZW50Jyk7XG4gIGFzc2VydC5lcXVhbCgocGF5bG9hZC5yYXdEYXRhIGFzIGFueSkuc291cmNlLCAnZG9jdW1lbnQnKTtcbn0pO1xuXG50ZXN0KCdwYXJzZVVwbG9hZGVkR3JhcGhKc29uIGFjY2VwdHMgbmVvNGpfZG9jdW1lbnRfcGF5bG9hZC1zdHlsZSBwYXlsb2FkcycsICgpID0+IHtcbiAgY29uc3QgcGF5bG9hZCA9IHBhcnNlVXBsb2FkZWRHcmFwaEpzb24oXG4gICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgc291cmNlOiAnZG9jdW1lbnQnLFxuICAgICAgbm9kZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnRDEnLFxuICAgICAgICAgIGxhYmVsOiAnUmV0ZW50aW9uIFBvbGljeScsXG4gICAgICAgICAga2luZDogJ3JlcXVpcmVtZW50JyxcbiAgICAgICAgICBjYW5vbmljYWxfbmFtZTogJ1JldGVudGlvbiBQb2xpY3knLFxuICAgICAgICAgIGFsaWFzZXM6IFtdLFxuICAgICAgICAgIHN1bW1hcnk6ICdEZWZpbmVzIHJldGVudGlvbi4nLFxuICAgICAgICAgIGV2aWRlbmNlOiBbXSxcbiAgICAgICAgICBzb3VyY2VzOiBbXSxcbiAgICAgICAgICBkZWdyZWU6IDEsXG4gICAgICAgICAgc291cmNlOiAnZG9jdW1lbnQnLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGVkZ2VzOiBbXSxcbiAgICB9KVxuICApO1xuXG4gIGFzc2VydC5lcXVhbChwYXlsb2FkLmtpbmQsICdkb2N1bWVudCcpO1xufSk7XG4iLCAiZXhwb3J0IGZ1bmN0aW9uIGluc3RhbGxSdW50aW1lV2luZG93Q29uZmlnKG92ZXJyaWRlczogUGFydGlhbDxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXI+PiA9IHt9KSB7XG4gIGNvbnN0IHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IChjYWxsYmFjazogRnJhbWVSZXF1ZXN0Q2FsbGJhY2spID0+IHNldFRpbWVvdXQoKCkgPT4gY2FsbGJhY2soRGF0ZS5ub3coKSksIDApO1xuICBjb25zdCBjYW5jZWxBbmltYXRpb25GcmFtZSA9IChoYW5kbGU6IG51bWJlcikgPT4gY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICd3aW5kb3cnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiB7XG4gICAgICBfX1RXSU5fQ09ORklHX186IHtcbiAgICAgICAgTUFYX1VQTE9BRF9NQjogNTAsXG4gICAgICAgIFBST0NFU1NJTkdfVElNRU9VVF9NUzogOTAwMDAsXG4gICAgICAgIEFQUF9FTlY6ICd0ZXN0JyxcbiAgICAgICAgLi4ub3ZlcnJpZGVzLFxuICAgICAgfSxcbiAgICAgIHNldFRpbWVvdXQsXG4gICAgICBjbGVhclRpbWVvdXQsXG4gICAgICBzZXRJbnRlcnZhbCxcbiAgICAgIGNsZWFySW50ZXJ2YWwsXG4gICAgICBhZGRFdmVudExpc3RlbmVyOiAoKSA9PiB7fSxcbiAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6ICgpID0+IHt9LFxuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUsXG4gICAgICBkZXZpY2VQaXhlbFJhdGlvOiAxLFxuICAgIH0sXG4gIH0pO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnZG9jdW1lbnQnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiB7XG4gICAgICBjcmVhdGVFbGVtZW50OiAoKSA9PiAoe1xuICAgICAgICBnZXRDb250ZXh0OiAoKSA9PiAoe30pLFxuICAgICAgICBzdHlsZToge30sXG4gICAgICAgIHNldEF0dHJpYnV0ZTogKCkgPT4ge30sXG4gICAgICAgIGFwcGVuZENoaWxkOiAoKSA9PiB7fSxcbiAgICAgIH0pLFxuICAgICAgYm9keToge1xuICAgICAgICBhcHBlbmRDaGlsZDogKCkgPT4ge30sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnbmF2aWdhdG9yJywge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICB2YWx1ZToge1xuICAgICAgdXNlckFnZW50OiAnbm9kZS5qcycsXG4gICAgfSxcbiAgfSk7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICdyZXF1ZXN0QW5pbWF0aW9uRnJhbWUnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXG4gIH0pO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnY2FuY2VsQW5pbWF0aW9uRnJhbWUnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiBjYW5jZWxBbmltYXRpb25GcmFtZSxcbiAgfSk7XG5cbiAgaWYgKCEoJ1Jlc2l6ZU9ic2VydmVyJyBpbiBnbG9iYWxUaGlzKSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnUmVzaXplT2JzZXJ2ZXInLCB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIHZhbHVlOiBjbGFzcyBSZXNpemVPYnNlcnZlciB7XG4gICAgICAgIG9ic2VydmUoKSB7fVxuICAgICAgICB1bm9ic2VydmUoKSB7fVxuICAgICAgICBkaXNjb25uZWN0KCkge31cbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNhbXBsZUdyYXBoRGF0YSgpIHtcbiAgY29uc3Qgbm9kZXMgPSBbXG4gICAge1xuICAgICAgaWQ6ICdhcGknLFxuICAgICAgbmFtZTogJ0FQSSBTZXJ2aWNlJyxcbiAgICAgIHR5cGU6ICdzb2Z0d2FyZScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvcmUgQVBJJyxcbiAgICAgIHJpc2tTY29yZTogODIsXG4gICAgICByaXNrTGV2ZWw6ICdoaWdoJyxcbiAgICAgIGRlZ3JlZTogMixcbiAgICAgIGJldHdlZW5uZXNzOiAwLjU1LFxuICAgICAgY2xvc2VuZXNzOiAwLjY3LFxuICAgICAgYmxhc3RSYWRpdXM6IDMsXG4gICAgICBkZXBlbmRlbmN5U3BhbjogMixcbiAgICAgIHJpc2tFeHBsYW5hdGlvbjogJ0hhbmRsZXMgY29yZSByZXF1ZXN0cy4nLFxuICAgICAgc291cmNlOiAnc2FtcGxlJyxcbiAgICAgIGRlcGVuZGVuY2llczogWydkYiddLFxuICAgICAgZGVwZW5kZW50czogWydmcm9udGVuZCddLFxuICAgICAgdmFsOiAzNixcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAnZGInLFxuICAgICAgbmFtZTogJ0RhdGFiYXNlJyxcbiAgICAgIHR5cGU6ICdkYXRhJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUGVyc2lzdGVuY2UgbGF5ZXInLFxuICAgICAgcmlza1Njb3JlOiA0NCxcbiAgICAgIHJpc2tMZXZlbDogJ21lZGl1bScsXG4gICAgICBkZWdyZWU6IDEsXG4gICAgICBiZXR3ZWVubmVzczogMC4yMixcbiAgICAgIGNsb3NlbmVzczogMC40NCxcbiAgICAgIGJsYXN0UmFkaXVzOiAxLFxuICAgICAgZGVwZW5kZW5jeVNwYW46IDEsXG4gICAgICByaXNrRXhwbGFuYXRpb246ICdTdG9yZXMgcmVjb3Jkcy4nLFxuICAgICAgc291cmNlOiAnc2FtcGxlJyxcbiAgICAgIGRlcGVuZGVuY2llczogW10sXG4gICAgICBkZXBlbmRlbnRzOiBbJ2FwaSddLFxuICAgICAgdmFsOiAyOCxcbiAgICB9LFxuICBdO1xuXG4gIHJldHVybiB7XG4gICAgc291cmNlOiAnc2FtcGxlJyxcbiAgICBub2RlcyxcbiAgICBsaW5rczogW1xuICAgICAge1xuICAgICAgICBpZDogJ2FwaS1kYi0wJyxcbiAgICAgICAgc291cmNlOiAnYXBpJyxcbiAgICAgICAgdGFyZ2V0OiAnZGInLFxuICAgICAgICByZWxhdGlvbjogJ2RlcGVuZHNfb24nLFxuICAgICAgICByYXRpb25hbGU6ICdSZWFkcyBhbmQgd3JpdGVzIHJlY29yZHMuJyxcbiAgICAgIH0sXG4gICAgXSxcbiAgICBub2RlSW5kZXg6IE9iamVjdC5mcm9tRW50cmllcyhub2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLmlkLCBub2RlXSkpLFxuICAgIHJlbGF0aW9uVHlwZXM6IFsnZGVwZW5kc19vbiddLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2FtcGxlTWVyZ2VkR3JhcGhEYXRhKCkge1xuICByZXR1cm4ge1xuICAgIG5vZGVzOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnYXBpJyxcbiAgICAgICAgbmFtZTogJ0FQSSBTZXJ2aWNlJyxcbiAgICAgICAgdHlwZTogJ3NvZnR3YXJlJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdDb3JlIEFQSScsXG4gICAgICAgIHJpc2tfc2NvcmU6IDgyLFxuICAgICAgICByaXNrX2xldmVsOiAnaGlnaCcsXG4gICAgICAgIGRlZ3JlZTogMixcbiAgICAgICAgYmV0d2Vlbm5lc3M6IDAuNTUsXG4gICAgICAgIGNsb3NlbmVzczogMC42NyxcbiAgICAgICAgYmxhc3RfcmFkaXVzOiAzLFxuICAgICAgICBkZXBlbmRlbmN5X3NwYW46IDIsXG4gICAgICAgIHJpc2tfZXhwbGFuYXRpb246ICdIYW5kbGVzIGNvcmUgcmVxdWVzdHMuJyxcbiAgICAgICAgc291cmNlOiAnc2FtcGxlJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiAnZGInLFxuICAgICAgICBuYW1lOiAnRGF0YWJhc2UnLFxuICAgICAgICB0eXBlOiAnZGF0YScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnUGVyc2lzdGVuY2UgbGF5ZXInLFxuICAgICAgICByaXNrX3Njb3JlOiA0NCxcbiAgICAgICAgcmlza19sZXZlbDogJ21lZGl1bScsXG4gICAgICAgIGRlZ3JlZTogMSxcbiAgICAgICAgYmV0d2Vlbm5lc3M6IDAuMjIsXG4gICAgICAgIGNsb3NlbmVzczogMC40NCxcbiAgICAgICAgYmxhc3RfcmFkaXVzOiAxLFxuICAgICAgICBkZXBlbmRlbmN5X3NwYW46IDEsXG4gICAgICAgIHJpc2tfZXhwbGFuYXRpb246ICdTdG9yZXMgcmVjb3Jkcy4nLFxuICAgICAgICBzb3VyY2U6ICdzYW1wbGUnLFxuICAgICAgfSxcbiAgICBdLFxuICAgIGVkZ2VzOiBbXG4gICAgICB7XG4gICAgICAgIHNvdXJjZTogJ2FwaScsXG4gICAgICAgIHRhcmdldDogJ2RiJyxcbiAgICAgICAgcmVsYXRpb246ICdkZXBlbmRzX29uJyxcbiAgICAgICAgcmF0aW9uYWxlOiAnUmVhZHMgYW5kIHdyaXRlcyByZWNvcmRzLicsXG4gICAgICB9LFxuICAgIF0sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTYW1wbGVEb2N1bWVudEdyYXBoRGF0YSgpIHtcbiAgY29uc3Qgbm9kZXMgPSBbXG4gICAge1xuICAgICAgaWQ6ICdEMScsXG4gICAgICBsYWJlbDogJ1JldGVudGlvbiBQb2xpY3knLFxuICAgICAga2luZDogJ3JlcXVpcmVtZW50JyxcbiAgICAgIGNhbm9uaWNhbE5hbWU6ICdSZXRlbnRpb24gUG9saWN5JyxcbiAgICAgIGFsaWFzZXM6IFsncmVjb3JkcyBwb2xpY3knXSxcbiAgICAgIHN1bW1hcnk6ICdEZWZpbmVzIHJlY29yZCByZXRlbnRpb24uJyxcbiAgICAgIGV2aWRlbmNlOiBbeyBxdW90ZTogJ1JlY29yZHMgYXJlIHJldGFpbmVkIGZvciA3IHllYXJzLicsIHBhZ2VTdGFydDogMSwgcGFnZUVuZDogMSB9XSxcbiAgICAgIHNvdXJjZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGRvY3VtZW50TmFtZTogJ3BvbGljeS5wZGYnLFxuICAgICAgICAgIGNodW5rRmlsZTogJ2NodW5rXzAxLnR4dCcsXG4gICAgICAgICAgY2h1bmtJZDogJ2NodW5rXzAxJyxcbiAgICAgICAgICBwZGZQYWdlU3RhcnQ6IDEsXG4gICAgICAgICAgcGRmUGFnZUVuZDogMSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBkZWdyZWU6IDEsXG4gICAgICBzb3VyY2U6ICdkb2N1bWVudCcsXG4gICAgICB2YWw6IDIwLFxuICAgIH0sXG4gICAge1xuICAgICAgaWQ6ICdEMicsXG4gICAgICBsYWJlbDogJ1NldmVuIFllYXJzJyxcbiAgICAgIGtpbmQ6ICdkYXRlJyxcbiAgICAgIGNhbm9uaWNhbE5hbWU6ICdTZXZlbiBZZWFycycsXG4gICAgICBhbGlhc2VzOiBbXSxcbiAgICAgIHN1bW1hcnk6ICdSZXRlbnRpb24gZHVyYXRpb24uJyxcbiAgICAgIGV2aWRlbmNlOiBbeyBxdW90ZTogJzcgeWVhcnMnLCBwYWdlU3RhcnQ6IDEsIHBhZ2VFbmQ6IDEgfV0sXG4gICAgICBzb3VyY2VzOiBbXSxcbiAgICAgIGRlZ3JlZTogMSxcbiAgICAgIHNvdXJjZTogJ2RvY3VtZW50JyxcbiAgICAgIHZhbDogMjAsXG4gICAgfSxcbiAgXTtcblxuICByZXR1cm4ge1xuICAgIHNvdXJjZTogJ2RvY3VtZW50JyxcbiAgICBpbmdlc3Rpb25JZDogJ2RvYy0xMjMnLFxuICAgIG5vZGVzLFxuICAgIGxpbmtzOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnREUxJyxcbiAgICAgICAgc291cmNlOiAnRDEnLFxuICAgICAgICB0YXJnZXQ6ICdEMicsXG4gICAgICAgIHR5cGU6ICdyZXF1aXJlcycsXG4gICAgICAgIHN1bW1hcnk6ICdSZXRlbnRpb24gcG9saWN5IHJlcXVpcmVzIHNldmVuIHllYXJzLicsXG4gICAgICAgIGV2aWRlbmNlOiBbeyBxdW90ZTogJ3JldGFpbmVkIGZvciA3IHllYXJzJywgcGFnZVN0YXJ0OiAxLCBwYWdlRW5kOiAxIH1dLFxuICAgICAgICBzb3VyY2VDaHVuazoge1xuICAgICAgICAgIGRvY3VtZW50TmFtZTogJ3BvbGljeS5wZGYnLFxuICAgICAgICAgIGNodW5rRmlsZTogJ2NodW5rXzAxLnR4dCcsXG4gICAgICAgICAgY2h1bmtJZDogJ2NodW5rXzAxJyxcbiAgICAgICAgICBwZGZQYWdlU3RhcnQ6IDEsXG4gICAgICAgICAgcGRmUGFnZUVuZDogMSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgXSxcbiAgICBub2RlSW5kZXg6IE9iamVjdC5mcm9tRW50cmllcyhub2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLmlkLCBub2RlXSkpLFxuICAgIGtpbmRUeXBlczogWydkYXRlJywgJ3JlcXVpcmVtZW50J10sXG4gICAgcmVsYXRpb25UeXBlczogWydyZXF1aXJlcyddLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTW9ja0NvbnRleHQob3ZlcnJpZGVzID0ge30pIHtcbiAgcmV0dXJuIHtcbiAgICB1cGxvYWQ6IHtcbiAgICAgIHBoYXNlOiAnaWRsZScsXG4gICAgICBzZWxlY3RlZEZpbGU6IG51bGwsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWQgYSAubWQgb3IgLnR4dCBmaWxlIHRvIGJ1aWxkIHRoZSBncmFwaC4nLFxuICAgICAgaW5nZXN0aW9uSWQ6IG51bGwsXG4gICAgICBpbmdlc3Rpb246IG51bGwsXG4gICAgICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxuICAgICAgc3RhcnRlZEF0OiBudWxsLFxuICAgICAgY29tcGxldGVkQXQ6IG51bGwsXG4gICAgICByZXRyeUNvdW50OiAwLFxuICAgIH0sXG4gICAgZ3JhcGg6IHtcbiAgICAgIHN0YXR1czogJ2lkbGUnLFxuICAgICAgZGF0YTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxuICAgIH0sXG4gICAgZG9jdW1lbnRVcGxvYWQ6IHtcbiAgICAgIHBoYXNlOiAnaWRsZScsXG4gICAgICBzZWxlY3RlZEZpbGU6IG51bGwsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWQgYSAucGRmLCAubWQsIG9yIC50eHQgZmlsZSB0byBidWlsZCBhIGRvY3VtZW50IGdyYXBoLicsXG4gICAgICBpbmdlc3Rpb25JZDogbnVsbCxcbiAgICAgIGluZ2VzdGlvbjogbnVsbCxcbiAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IG51bGwsXG4gICAgICBzdGFydGVkQXQ6IG51bGwsXG4gICAgICBjb21wbGV0ZWRBdDogbnVsbCxcbiAgICAgIHJldHJ5Q291bnQ6IDAsXG4gICAgfSxcbiAgICBkb2N1bWVudEdyYXBoOiB7XG4gICAgICBzdGF0dXM6ICdpZGxlJyxcbiAgICAgIGRhdGE6IG51bGwsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIGxhc3RMb2FkZWRBdDogbnVsbCxcbiAgICAgIGFydGlmYWN0czogbnVsbCxcbiAgICAgIGFydGlmYWN0c0Vycm9yOiBudWxsLFxuICAgIH0sXG4gICAgdXBsb2FkZWRHcmFwaFVwbG9hZDoge1xuICAgICAgcGhhc2U6ICdpZGxlJyxcbiAgICAgIHNlbGVjdGVkRmlsZTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgc3RhdHVzTWVzc2FnZTogJ1VwbG9hZCBhIG1lcmdlZF9ncmFwaC5qc29uIGZpbGUgdG8gaW5zcGVjdCBhIGZpbmFsaXplZCBrbm93bGVkZ2UgZ3JhcGguJyxcbiAgICB9LFxuICAgIHVwbG9hZGVkR3JhcGg6IHtcbiAgICAgIHN0YXR1czogJ2lkbGUnLFxuICAgICAga2luZDogbnVsbCxcbiAgICAgIG9wZXJhdGlvbmFsRGF0YTogbnVsbCxcbiAgICAgIGRvY3VtZW50RGF0YTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxuICAgICAgZmlsZW5hbWU6IG51bGwsXG4gICAgICByYXdEYXRhOiBudWxsLFxuICAgIH0sXG4gICAgc2V0RHJhZ0FjdGl2ZTogKCkgPT4ge30sXG4gICAgc2VsZWN0RmlsZTogKCkgPT4gdHJ1ZSxcbiAgICBjbGVhclNlbGVjdGVkRmlsZTogKCkgPT4ge30sXG4gICAgYmVnaW5Qcm9jZXNzaW5nOiBhc3luYyAoKSA9PiB7fSxcbiAgICBsb2FkR3JhcGg6IGFzeW5jICgpID0+IHt9LFxuICAgIHNldERvY3VtZW50RHJhZ0FjdGl2ZTogKCkgPT4ge30sXG4gICAgc2VsZWN0RG9jdW1lbnRGaWxlOiAoKSA9PiB0cnVlLFxuICAgIGNsZWFyU2VsZWN0ZWREb2N1bWVudEZpbGU6ICgpID0+IHt9LFxuICAgIGJlZ2luRG9jdW1lbnRQcm9jZXNzaW5nOiBhc3luYyAoKSA9PiB7fSxcbiAgICBsb2FkRG9jdW1lbnRHcmFwaDogYXN5bmMgKCkgPT4ge30sXG4gICAgc2V0VXBsb2FkZWRHcmFwaERyYWdBY3RpdmU6ICgpID0+IHt9LFxuICAgIHNlbGVjdFVwbG9hZGVkR3JhcGhGaWxlOiAoKSA9PiB0cnVlLFxuICAgIGNsZWFyU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZTogKCkgPT4ge30sXG4gICAgbG9hZFVwbG9hZGVkR3JhcGhGcm9tU2VsZWN0ZWRGaWxlOiBhc3luYyAoKSA9PiB7fSxcbiAgICByZXNldFVwbG9hZFN0YXRlOiAoKSA9PiB7fSxcbiAgICAuLi5vdmVycmlkZXMsXG4gIH07XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQTRCQSxTQUFTLGFBQWEsT0FBZ0IsT0FBZTtBQUNuRCxNQUFJLE9BQU8sVUFBVSxVQUFVO0FBQzdCLFVBQU0sSUFBSSxNQUFNLG9DQUFvQyxLQUFLLGtCQUFrQjtBQUFBLEVBQzdFO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxhQUFhLE9BQWdCLE9BQWU7QUFDbkQsTUFBSSxPQUFPLFVBQVUsWUFBWSxPQUFPLE1BQU0sS0FBSyxHQUFHO0FBQ3BELFVBQU0sSUFBSSxNQUFNLG9DQUFvQyxLQUFLLGtCQUFrQjtBQUFBLEVBQzdFO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxZQUFlLE9BQWdCLE9BQWU7QUFDckQsTUFBSSxDQUFDLE1BQU0sUUFBUSxLQUFLLEdBQUc7QUFDekIsVUFBTSxJQUFJLE1BQU0sb0NBQW9DLEtBQUssa0JBQWtCO0FBQUEsRUFDN0U7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLGNBQWMsTUFBb0IsZUFBc0MsY0FBZ0Q7QUFDL0gsU0FBTztBQUFBLElBQ0wsSUFBSSxhQUFhLEtBQUssSUFBSSxTQUFTO0FBQUEsSUFDbkMsTUFBTSxhQUFhLEtBQUssTUFBTSxXQUFXO0FBQUEsSUFDekMsTUFBTSxhQUFhLEtBQUssTUFBTSxXQUFXO0FBQUEsSUFDekMsYUFBYSxhQUFhLEtBQUssYUFBYSxrQkFBa0I7QUFBQSxJQUM5RCxXQUFXLGFBQWEsS0FBSyxZQUFZLGlCQUFpQjtBQUFBLElBQzFELFdBQVcsYUFBYSxLQUFLLFlBQVksaUJBQWlCO0FBQUEsSUFDMUQsUUFBUSxhQUFhLEtBQUssUUFBUSxhQUFhO0FBQUEsSUFDL0MsYUFBYSxhQUFhLEtBQUssYUFBYSxrQkFBa0I7QUFBQSxJQUM5RCxXQUFXLGFBQWEsS0FBSyxXQUFXLGdCQUFnQjtBQUFBLElB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QUEsTUFDRjtBQUFBLE1BQ0EsT0FBTztBQUFBLFFBQ0w7QUFBQSxVQUNFLElBQUk7QUFBQSxVQUNKLFFBQVE7QUFBQSxVQUNSLFFBQVE7QUFBQSxVQUNSLE1BQU07QUFBQSxVQUNOLFNBQVM7QUFBQSxVQUNULFVBQVUsQ0FBQztBQUFBLFVBQ1gsY0FBYztBQUFBLFFBQ2hCO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFFQSxTQUFPLE1BQU0sUUFBUSxNQUFNLFVBQVU7QUFDckMsU0FBTyxNQUFPLFFBQVEsUUFBZ0IsUUFBUSxVQUFVO0FBQzFELENBQUM7QUFFRCxLQUFLLHdFQUF3RSxNQUFNO0FBQ2pGLFFBQU0sVUFBVUE7QUFBQSxJQUNkLEtBQUssVUFBVTtBQUFBLE1BQ2IsUUFBUTtBQUFBLE1BQ1IsT0FBTztBQUFBLFFBQ0w7QUFBQSxVQUNFLElBQUk7QUFBQSxVQUNKLE9BQU87QUFBQSxVQUNQLE1BQU07QUFBQSxVQUNOLGdCQUFnQjtBQUFBLFVBQ2hCLFNBQVMsQ0FBQztBQUFBLFVBQ1YsU0FBUztBQUFBLFVBQ1QsVUFBVSxDQUFDO0FBQUEsVUFDWCxTQUFTLENBQUM7QUFBQSxVQUNWLFFBQVE7QUFBQSxVQUNSLFFBQVE7QUFBQSxRQUNWO0FBQUEsTUFDRjtBQUFBLE1BQ0EsT0FBTyxDQUFDO0FBQUEsSUFDVixDQUFDO0FBQUEsRUFDSDtBQUVBLFNBQU8sTUFBTSxRQUFRLE1BQU0sVUFBVTtBQUN2QyxDQUFDOyIsCiAgIm5hbWVzIjogWyJjcmVhdGVTZWxlY3RlZERvY3VtZW50RmlsZVVwbG9hZFN0YXRlIiwgImNyZWF0ZVNlbGVjdGVkRmlsZVVwbG9hZFN0YXRlIiwgImNyZWF0ZVNlbGVjdGVkVXBsb2FkZWRHcmFwaEZpbGVTdGF0ZSIsICJnZXRGaWxlRXh0ZW5zaW9uIiwgInBhcnNlVXBsb2FkZWRHcmFwaEpzb24iLCAidmFsaWRhdGVTZWxlY3RlZERvY3VtZW50RmlsZSIsICJ2YWxpZGF0ZVNlbGVjdGVkRmlsZSIsICJ2YWxpZGF0ZVNlbGVjdGVkVXBsb2FkZWRHcmFwaEZpbGUiXQp9Cg==
