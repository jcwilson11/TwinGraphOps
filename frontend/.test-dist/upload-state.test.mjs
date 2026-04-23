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
async function getGraph() {
  return request("/graph");
}
async function getProcessingStatus(ingestionId) {
  return request(`/ingest/${encodeURIComponent(ingestionId)}/events`);
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
  createSelectedFileUploadState: () => createSelectedFileUploadState,
  createUploadErrorState: () => createUploadErrorState,
  getFileExtension: () => getFileExtension,
  initialUploadState: () => initialUploadState,
  supportedExtensions: () => supportedExtensions,
  useAppContext: () => useAppContext,
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
  const processingPromiseRef = useRef(null);
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
  const resetUploadState = useCallback(() => {
    setUpload(initialUploadState);
  }, []);
  const value = useMemo(
    () => ({
      upload,
      graph,
      setDragActive,
      selectFile,
      clearSelectedFile,
      beginProcessing,
      loadGraph,
      resetUploadState
    }),
    [upload, graph, setDragActive, selectFile, clearSelectedFile, beginProcessing, loadGraph, resetUploadState]
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
var AppContext, initialUploadState, initialGraphState, supportedExtensions;
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
    supportedExtensions = [".md", ".txt"];
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
var { createSelectedFileUploadState: createSelectedFileUploadState2, getFileExtension: getFileExtension2, validateSelectedFile: validateSelectedFile2 } = stateModule;
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2xpYi9hZGFwdGVycy50cyIsICIuLi9zcmMvbGliL2NvbmZpZy50cyIsICIuLi9zcmMvbGliL2FwaS50cyIsICIuLi9zcmMvc3RhdGUvQXBwQ29udGV4dC50c3giLCAiLi4vdGVzdHMvdXBsb2FkLXN0YXRlLnRlc3QudHMiLCAiLi4vdGVzdHMvdGVzdC11dGlscy50c3giXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB0eXBlIHsgQXBpR3JhcGhEYXRhLCBBcGlHcmFwaEVkZ2UsIEFwaUdyYXBoTm9kZSwgSW1wYWN0UmVzcG9uc2UsIFJpc2tSZXNwb25zZSB9IGZyb20gJy4uL3R5cGVzL2FwaSc7XHJcbmltcG9ydCB0eXBlIHsgR3JhcGhEYXRhLCBHcmFwaEVkZ2UsIEdyYXBoTm9kZSwgTm9kZURldGFpbHMsIE5vZGVSZWZlcmVuY2UgfSBmcm9tICcuLi90eXBlcy9hcHAnO1xyXG5cclxuZnVuY3Rpb24gZW5zdXJlU3RyaW5nKHZhbHVlOiB1bmtub3duLCBsYWJlbDogc3RyaW5nKSB7XHJcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgTWFsZm9ybWVkIEFQSSByZXNwb25zZTogZXhwZWN0ZWQgJHtsYWJlbH0gdG8gYmUgYSBzdHJpbmcuYCk7XHJcbiAgfVxyXG4gIHJldHVybiB2YWx1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZW5zdXJlTnVtYmVyKHZhbHVlOiB1bmtub3duLCBsYWJlbDogc3RyaW5nKSB7XHJcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicgfHwgTnVtYmVyLmlzTmFOKHZhbHVlKSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBNYWxmb3JtZWQgQVBJIHJlc3BvbnNlOiBleHBlY3RlZCAke2xhYmVsfSB0byBiZSBhIG51bWJlci5gKTtcclxuICB9XHJcbiAgcmV0dXJuIHZhbHVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlbnN1cmVBcnJheTxUPih2YWx1ZTogdW5rbm93biwgbGFiZWw6IHN0cmluZykge1xyXG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgTWFsZm9ybWVkIEFQSSByZXNwb25zZTogZXhwZWN0ZWQgJHtsYWJlbH0gdG8gYmUgYW4gYXJyYXkuYCk7XHJcbiAgfVxyXG4gIHJldHVybiB2YWx1ZSBhcyBUW107XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5vcm1hbGl6ZU5vZGUobm9kZTogQXBpR3JhcGhOb2RlLCBkZXBlbmRlbmN5TWFwOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT4sIGRlcGVuZGVudE1hcDogTWFwPHN0cmluZywgc3RyaW5nW10+KTogR3JhcGhOb2RlIHtcclxuICByZXR1cm4ge1xyXG4gICAgaWQ6IGVuc3VyZVN0cmluZyhub2RlLmlkLCAnbm9kZS5pZCcpLFxyXG4gICAgbmFtZTogZW5zdXJlU3RyaW5nKG5vZGUubmFtZSwgJ25vZGUubmFtZScpLFxyXG4gICAgdHlwZTogZW5zdXJlU3RyaW5nKG5vZGUudHlwZSwgJ25vZGUudHlwZScpLFxyXG4gICAgZGVzY3JpcHRpb246IGVuc3VyZVN0cmluZyhub2RlLmRlc2NyaXB0aW9uLCAnbm9kZS5kZXNjcmlwdGlvbicpLFxyXG4gICAgcmlza1Njb3JlOiBlbnN1cmVOdW1iZXIobm9kZS5yaXNrX3Njb3JlLCAnbm9kZS5yaXNrX3Njb3JlJyksXHJcbiAgICByaXNrTGV2ZWw6IGVuc3VyZVN0cmluZyhub2RlLnJpc2tfbGV2ZWwsICdub2RlLnJpc2tfbGV2ZWwnKSxcclxuICAgIGRlZ3JlZTogZW5zdXJlTnVtYmVyKG5vZGUuZGVncmVlLCAnbm9kZS5kZWdyZWUnKSxcclxuICAgIGJldHdlZW5uZXNzOiBlbnN1cmVOdW1iZXIobm9kZS5iZXR3ZWVubmVzcywgJ25vZGUuYmV0d2Vlbm5lc3MnKSxcclxuICAgIGNsb3NlbmVzczogZW5zdXJlTnVtYmVyKG5vZGUuY2xvc2VuZXNzLCAnbm9kZS5jbG9zZW5lc3MnKSxcclxuICAgIGJsYXN0UmFkaXVzOiBlbnN1cmVOdW1iZXIobm9kZS5ibGFzdF9yYWRpdXMsICdub2RlLmJsYXN0X3JhZGl1cycpLFxyXG4gICAgZGVwZW5kZW5jeVNwYW46IGVuc3VyZU51bWJlcihub2RlLmRlcGVuZGVuY3lfc3BhbiwgJ25vZGUuZGVwZW5kZW5jeV9zcGFuJyksXHJcbiAgICByaXNrRXhwbGFuYXRpb246IGVuc3VyZVN0cmluZyhub2RlLnJpc2tfZXhwbGFuYXRpb24sICdub2RlLnJpc2tfZXhwbGFuYXRpb24nKSxcclxuICAgIHNvdXJjZTogZW5zdXJlU3RyaW5nKG5vZGUuc291cmNlLCAnbm9kZS5zb3VyY2UnKSxcclxuICAgIGRlcGVuZGVuY2llczogZGVwZW5kZW5jeU1hcC5nZXQobm9kZS5pZCkgPz8gW10sXHJcbiAgICBkZXBlbmRlbnRzOiBkZXBlbmRlbnRNYXAuZ2V0KG5vZGUuaWQpID8/IFtdLFxyXG4gICAgdmFsOiAxOCArIE1hdGgucm91bmQoKG5vZGUucmlza19zY29yZSAvIDEwMCkgKiAyMiksXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gbm9ybWFsaXplRWRnZShlZGdlOiBBcGlHcmFwaEVkZ2UsIGluZGV4OiBudW1iZXIpOiBHcmFwaEVkZ2Uge1xyXG4gIHJldHVybiB7XHJcbiAgICBpZDogYCR7ZW5zdXJlU3RyaW5nKGVkZ2Uuc291cmNlLCAnZWRnZS5zb3VyY2UnKX0tJHtlbnN1cmVTdHJpbmcoZWRnZS50YXJnZXQsICdlZGdlLnRhcmdldCcpfS0ke2luZGV4fWAsXHJcbiAgICBzb3VyY2U6IGVkZ2Uuc291cmNlLFxyXG4gICAgdGFyZ2V0OiBlZGdlLnRhcmdldCxcclxuICAgIHJlbGF0aW9uOiBlbnN1cmVTdHJpbmcoZWRnZS5yZWxhdGlvbiwgJ2VkZ2UucmVsYXRpb24nKSxcclxuICAgIHJhdGlvbmFsZTogZW5zdXJlU3RyaW5nKGVkZ2UucmF0aW9uYWxlLCAnZWRnZS5yYXRpb25hbGUnKSxcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYWRhcHRHcmFwaChhcGlHcmFwaDogQXBpR3JhcGhEYXRhKTogR3JhcGhEYXRhIHtcclxuICBjb25zdCBzb3VyY2UgPSBlbnN1cmVTdHJpbmcoYXBpR3JhcGguc291cmNlLCAnZ3JhcGguc291cmNlJyk7XHJcbiAgY29uc3QgYXBpTm9kZXMgPSBlbnN1cmVBcnJheTxBcGlHcmFwaE5vZGU+KGFwaUdyYXBoLm5vZGVzLCAnZ3JhcGgubm9kZXMnKTtcclxuICBjb25zdCBhcGlFZGdlcyA9IGVuc3VyZUFycmF5PEFwaUdyYXBoRWRnZT4oYXBpR3JhcGguZWRnZXMsICdncmFwaC5lZGdlcycpO1xyXG5cclxuICBjb25zdCBkZXBlbmRlbmN5TWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xyXG4gIGNvbnN0IGRlcGVuZGVudE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcclxuXHJcbiAgZm9yIChjb25zdCBlZGdlIG9mIGFwaUVkZ2VzKSB7XHJcbiAgICBjb25zdCBzb3VyY2VJZCA9IGVuc3VyZVN0cmluZyhlZGdlLnNvdXJjZSwgJ2VkZ2Uuc291cmNlJyk7XHJcbiAgICBjb25zdCB0YXJnZXRJZCA9IGVuc3VyZVN0cmluZyhlZGdlLnRhcmdldCwgJ2VkZ2UudGFyZ2V0Jyk7XHJcbiAgICBkZXBlbmRlbmN5TWFwLnNldChzb3VyY2VJZCwgWy4uLihkZXBlbmRlbmN5TWFwLmdldChzb3VyY2VJZCkgPz8gW10pLCB0YXJnZXRJZF0pO1xyXG4gICAgZGVwZW5kZW50TWFwLnNldCh0YXJnZXRJZCwgWy4uLihkZXBlbmRlbnRNYXAuZ2V0KHRhcmdldElkKSA/PyBbXSksIHNvdXJjZUlkXSk7XHJcbiAgfVxyXG5cclxuICBjb25zdCBub2RlcyA9IGFwaU5vZGVzLm1hcCgobm9kZSkgPT4gbm9ybWFsaXplTm9kZShub2RlLCBkZXBlbmRlbmN5TWFwLCBkZXBlbmRlbnRNYXApKTtcclxuICBjb25zdCBsaW5rcyA9IGFwaUVkZ2VzLm1hcCgoZWRnZSwgaW5kZXgpID0+IG5vcm1hbGl6ZUVkZ2UoZWRnZSwgaW5kZXgpKTtcclxuICBjb25zdCBub2RlSW5kZXggPSBPYmplY3QuZnJvbUVudHJpZXMobm9kZXMubWFwKChub2RlKSA9PiBbbm9kZS5pZCwgbm9kZV0pKTtcclxuICBjb25zdCByZWxhdGlvblR5cGVzID0gWy4uLm5ldyBTZXQobGlua3MubWFwKChlZGdlKSA9PiBlZGdlLnJlbGF0aW9uKSldLnNvcnQoKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHNvdXJjZSxcclxuICAgIG5vZGVzLFxyXG4gICAgbGlua3MsXHJcbiAgICBub2RlSW5kZXgsXHJcbiAgICByZWxhdGlvblR5cGVzLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRvTm9kZVJlZmVyZW5jZShub2RlPzogR3JhcGhOb2RlIHwgbnVsbCk6IE5vZGVSZWZlcmVuY2UgfCBudWxsIHtcclxuICBpZiAoIW5vZGUpIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGlkOiBub2RlLmlkLFxyXG4gICAgbmFtZTogbm9kZS5uYW1lLFxyXG4gICAgdHlwZTogbm9kZS50eXBlLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZvcm1hdE1ldHJpYyh2YWx1ZTogbnVtYmVyKSB7XHJcbiAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIodmFsdWUpID8gU3RyaW5nKHZhbHVlKSA6IHZhbHVlLnRvRml4ZWQoMyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGFwdE5vZGVEZXRhaWxzKFxyXG4gIGdyYXBoOiBHcmFwaERhdGEsXHJcbiAgY29tcG9uZW50SWQ6IHN0cmluZyxcclxuICByaXNrOiBSaXNrUmVzcG9uc2UsXHJcbiAgaW1wYWN0OiBJbXBhY3RSZXNwb25zZVxyXG4pOiBOb2RlRGV0YWlscyB7XHJcbiAgY29uc3Qgbm9kZSA9IGdyYXBoLm5vZGVJbmRleFtjb21wb25lbnRJZF07XHJcbiAgaWYgKCFub2RlKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvbXBvbmVudCAnJHtjb21wb25lbnRJZH0nIGlzIG1pc3NpbmcgZnJvbSB0aGUgYWN0aXZlIGdyYXBoLmApO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgZGVwZW5kZW5jaWVzID0gbm9kZS5kZXBlbmRlbmNpZXNcclxuICAgIC5tYXAoKGRlcGVuZGVuY3lJZCkgPT4gdG9Ob2RlUmVmZXJlbmNlKGdyYXBoLm5vZGVJbmRleFtkZXBlbmRlbmN5SWRdKSlcclxuICAgIC5maWx0ZXIoKGNhbmRpZGF0ZSk6IGNhbmRpZGF0ZSBpcyBOb2RlUmVmZXJlbmNlID0+IEJvb2xlYW4oY2FuZGlkYXRlKSk7XHJcblxyXG4gIGNvbnN0IGFmZmVjdGVkU3lzdGVtcyA9IGltcGFjdC5pbXBhY3RlZF9jb21wb25lbnRzXHJcbiAgICAubWFwKChhZmZlY3RlZElkKSA9PiB0b05vZGVSZWZlcmVuY2UoZ3JhcGgubm9kZUluZGV4W2FmZmVjdGVkSWRdKSA/PyB7IGlkOiBhZmZlY3RlZElkLCBuYW1lOiBhZmZlY3RlZElkLCB0eXBlOiAndW5rbm93bicgfSlcclxuICAgIC5maWx0ZXIoKGNhbmRpZGF0ZSk6IGNhbmRpZGF0ZSBpcyBOb2RlUmVmZXJlbmNlID0+IEJvb2xlYW4oY2FuZGlkYXRlKSk7XHJcblxyXG4gIGNvbnN0IHJlbGF0ZWRSYXRpb25hbGVzID0gZ3JhcGgubGlua3NcclxuICAgIC5maWx0ZXIoKGxpbmspID0+IGxpbmsuc291cmNlID09PSBjb21wb25lbnRJZCB8fCBsaW5rLnRhcmdldCA9PT0gY29tcG9uZW50SWQpXHJcbiAgICAubWFwKChsaW5rKSA9PiBsaW5rLnJhdGlvbmFsZSlcclxuICAgIC5maWx0ZXIoKHJhdGlvbmFsZSkgPT4gcmF0aW9uYWxlLnRyaW0oKS5sZW5ndGggPiAwKTtcclxuXHJcbiAgY29uc3QgaXNzdWVzID0gW3Jpc2suZXhwbGFuYXRpb24sIC4uLnJlbGF0ZWRSYXRpb25hbGVzXS5maWx0ZXIoXHJcbiAgICAodmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTogdmFsdWUgaXMgc3RyaW5nID0+IHZhbHVlLnRyaW0oKS5sZW5ndGggPiAwICYmIGNvbGxlY3Rpb24uaW5kZXhPZih2YWx1ZSkgPT09IGluZGV4XHJcbiAgKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGNvbXBvbmVudElkOiBub2RlLmlkLFxyXG4gICAgbmFtZTogbm9kZS5uYW1lLFxyXG4gICAgdHlwZTogbm9kZS50eXBlLFxyXG4gICAgcmlza1Njb3JlOiByaXNrLnNjb3JlLFxyXG4gICAgcmlza0xldmVsOiByaXNrLmxldmVsLFxyXG4gICAgZGVzY3JpcHRpb246IG5vZGUuZGVzY3JpcHRpb24sXHJcbiAgICBkZXBlbmRlbmNpZXMsXHJcbiAgICBhZmZlY3RlZFN5c3RlbXMsXHJcbiAgICBpc3N1ZXMsXHJcbiAgICBleHBsYW5hdGlvbjogcmlzay5leHBsYW5hdGlvbixcclxuICAgIGltcGFjdENvdW50OiBpbXBhY3QuaW1wYWN0X2NvdW50LFxyXG4gICAgbWV0YWRhdGE6IFtcclxuICAgICAgeyBsYWJlbDogJ0RlZ3JlZScsIHZhbHVlOiBmb3JtYXRNZXRyaWMobm9kZS5kZWdyZWUpIH0sXHJcbiAgICAgIHsgbGFiZWw6ICdCZXR3ZWVubmVzcycsIHZhbHVlOiBmb3JtYXRNZXRyaWMobm9kZS5iZXR3ZWVubmVzcykgfSxcclxuICAgICAgeyBsYWJlbDogJ0Nsb3NlbmVzcycsIHZhbHVlOiBmb3JtYXRNZXRyaWMobm9kZS5jbG9zZW5lc3MpIH0sXHJcbiAgICAgIHsgbGFiZWw6ICdCbGFzdCBSYWRpdXMnLCB2YWx1ZTogU3RyaW5nKG5vZGUuYmxhc3RSYWRpdXMpIH0sXHJcbiAgICAgIHsgbGFiZWw6ICdEZXBlbmRlbmN5IFNwYW4nLCB2YWx1ZTogU3RyaW5nKG5vZGUuZGVwZW5kZW5jeVNwYW4pIH0sXHJcbiAgICAgIHsgbGFiZWw6ICdTb3VyY2UnLCB2YWx1ZTogbm9kZS5zb3VyY2UgfSxcclxuICAgIF0sXHJcbiAgfTtcclxufVxyXG4iLCAiY29uc3QgcnVudGltZUNvbmZpZyA9IHdpbmRvdy5fX1RXSU5fQ09ORklHX18gPz8ge307XHJcblxyXG5mdW5jdGlvbiByZWFkTnVtYmVyKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCB1bmRlZmluZWQsIGZhbGxiYWNrOiBudW1iZXIpIHtcclxuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIodmFsdWUpO1xyXG4gIHJldHVybiBOdW1iZXIuaXNGaW5pdGUocGFyc2VkKSAmJiBwYXJzZWQgPiAwID8gcGFyc2VkIDogZmFsbGJhY2s7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBhcHBDb25maWcgPSB7XHJcbiAgYXBpQmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXHJcbiAgbWF4VXBsb2FkQnl0ZXM6XHJcbiAgICByZWFkTnVtYmVyKHJ1bnRpbWVDb25maWcuTUFYX1VQTE9BRF9NQiB8fCBpbXBvcnQubWV0YS5lbnYuVklURV9NQVhfVVBMT0FEX01CLCAxMCkgKiAxMDI0ICogMTAyNCxcclxuICBwcm9jZXNzaW5nVGltZW91dE1zOiByZWFkTnVtYmVyKFxyXG4gICAgcnVudGltZUNvbmZpZy5QUk9DRVNTSU5HX1RJTUVPVVRfTVMgfHwgaW1wb3J0Lm1ldGEuZW52LlZJVEVfUFJPQ0VTU0lOR19USU1FT1VUX01TLFxyXG4gICAgMzAwMDAwXHJcbiAgKSxcclxuICBlbnZpcm9ubWVudDogcnVudGltZUNvbmZpZy5BUFBfRU5WIHx8ICdsb2NhbCcsXHJcbn07XHJcbiIsICJpbXBvcnQgeyBhcHBDb25maWcgfSBmcm9tICcuL2NvbmZpZyc7XHJcbmltcG9ydCB0eXBlIHtcclxuICBBcGlHcmFwaERhdGEsXHJcbiAgQXBpUGF5bG9hZCxcclxuICBJbXBhY3RSZXNwb25zZSxcclxuICBJbmdlc3RSZXNwb25zZSxcclxuICBQcm9jZXNzaW5nU3RhdHVzLFxyXG4gIFJpc2tSZXNwb25zZSxcclxufSBmcm9tICcuLi90eXBlcy9hcGknO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFwaUNsaWVudEVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gIGNvZGU/OiBzdHJpbmc7XHJcbiAgc3RhdHVzPzogbnVtYmVyO1xyXG4gIGRldGFpbHM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxuICByZXRyeWFibGU6IGJvb2xlYW47XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgbWVzc2FnZTogc3RyaW5nLFxyXG4gICAgb3B0aW9uczoge1xyXG4gICAgICBjb2RlPzogc3RyaW5nO1xyXG4gICAgICBzdGF0dXM/OiBudW1iZXI7XHJcbiAgICAgIGRldGFpbHM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxuICAgICAgcmV0cnlhYmxlPzogYm9vbGVhbjtcclxuICAgIH0gPSB7fVxyXG4gICkge1xyXG4gICAgc3VwZXIobWVzc2FnZSk7XHJcbiAgICB0aGlzLm5hbWUgPSAnQXBpQ2xpZW50RXJyb3InO1xyXG4gICAgdGhpcy5jb2RlID0gb3B0aW9ucy5jb2RlO1xyXG4gICAgdGhpcy5zdGF0dXMgPSBvcHRpb25zLnN0YXR1cztcclxuICAgIHRoaXMuZGV0YWlscyA9IG9wdGlvbnMuZGV0YWlscztcclxuICAgIHRoaXMucmV0cnlhYmxlID0gb3B0aW9ucy5yZXRyeWFibGUgPz8gZmFsc2U7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVW5zdXBwb3J0ZWRFbmRwb2ludEVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZykge1xyXG4gICAgc3VwZXIobWVzc2FnZSk7XHJcbiAgICB0aGlzLm5hbWUgPSAnVW5zdXBwb3J0ZWRFbmRwb2ludEVycm9yJztcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHBhcnNlSnNvblNhZmVseShyZXNwb25zZTogUmVzcG9uc2UpIHtcclxuICBjb25zdCB0ZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG4gIGNvbnNvbGUubG9nKCdCQUNLRU5EIFJFU1BPTlNFOicsIHRleHQpO1xyXG5cclxuICBpZiAoIXRleHQpIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuXHJcbiAgdHJ5IHtcclxuICAgIHJldHVybiBKU09OLnBhcnNlKHRleHQpIGFzIEFwaVBheWxvYWQ8dW5rbm93bj47XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1BBUlNFIEVSUk9SOicsIGVycm9yKTtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1JBVyBSRVNQT05TRSBURVhUOicsIHRleHQpO1xyXG4gICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdUaGUgQVBJIHJldHVybmVkIG1hbGZvcm1lZCBKU09OLicsIHtcclxuICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXHJcbiAgICAgIHJldHJ5YWJsZTogZmFsc2UsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHJlcXVlc3Q8VD4ocGF0aDogc3RyaW5nLCBpbml0OiBSZXF1ZXN0SW5pdCA9IHt9LCB0aW1lb3V0TXMgPSAzMDAwMCk6IFByb21pc2U8VD4ge1xyXG4gIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XHJcbiAgY29uc3QgdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgdGltZW91dE1zKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYC9hcGkke3BhdGh9YCwge1xyXG4gICAgICAuLi5pbml0LFxyXG4gICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxyXG4gICAgfSk7XHJcbiAgICBjb25zdCBwYXlsb2FkID0gYXdhaXQgcGFyc2VKc29uU2FmZWx5KHJlc3BvbnNlKTtcclxuXHJcbiAgICBpZiAoIXBheWxvYWQgfHwgdHlwZW9mIHBheWxvYWQgIT09ICdvYmplY3QnKSB7XHJcbiAgICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcignVGhlIEFQSSByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS4nLCB7XHJcbiAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXHJcbiAgICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5vayB8fCBwYXlsb2FkLnN0YXR1cyAhPT0gJ29rJykge1xyXG4gICAgICBjb25zdCBlcnJvclBheWxvYWQgPSBwYXlsb2FkIGFzIEV4Y2x1ZGU8QXBpUGF5bG9hZDxUPiwgeyBzdGF0dXM6ICdvaycgfT47XHJcbiAgICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcihlcnJvclBheWxvYWQuZXJyb3I/Lm1lc3NhZ2UgfHwgJ1RoZSByZXF1ZXN0IGZhaWxlZC4nLCB7XHJcbiAgICAgICAgY29kZTogZXJyb3JQYXlsb2FkLmVycm9yPy5jb2RlLFxyXG4gICAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxyXG4gICAgICAgIGRldGFpbHM6IGVycm9yUGF5bG9hZC5lcnJvcj8uZGV0YWlscyxcclxuICAgICAgICByZXRyeWFibGU6IHJlc3BvbnNlLnN0YXR1cyA+PSA1MDAgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSAwLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcGF5bG9hZC5kYXRhIGFzIFQ7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEFwaUNsaWVudEVycm9yKSB7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnJvci5uYW1lID09PSAnQWJvcnRFcnJvcicpIHtcclxuICAgICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdQcm9jZXNzaW5nIHRpbWVkIG91dCBiZWZvcmUgdGhlIGJhY2tlbmQgY29tcGxldGVkIHRoZSBncmFwaCBidWlsZC4nLCB7XHJcbiAgICAgICAgY29kZTogJ3JlcXVlc3RfdGltZW91dCcsXHJcbiAgICAgICAgcmV0cnlhYmxlOiB0cnVlLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoJ05ldHdvcmsgZmFpbHVyZSB3aGlsZSBjb250YWN0aW5nIHRoZSBUd2luR3JhcGhPcHMgQVBJLicsIHtcclxuICAgICAgY29kZTogJ25ldHdvcmtfZXJyb3InLFxyXG4gICAgICByZXRyeWFibGU6IHRydWUsXHJcbiAgICB9KTtcclxuICB9IGZpbmFsbHkge1xyXG4gICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0KTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWREb2N1bWVudChcclxuICBmaWxlOiBGaWxlLFxyXG4gIHJlcGxhY2VFeGlzdGluZyA9IHRydWUsXHJcbiAgdGltZW91dE1zID0gYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMsXHJcbiAgaW5nZXN0aW9uSWQ/OiBzdHJpbmdcclxuKSB7XHJcbiAgY29uc3QgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoKTtcclxuICBmb3JtRGF0YS5hcHBlbmQoJ2ZpbGUnLCBmaWxlKTtcclxuICBmb3JtRGF0YS5hcHBlbmQoJ3JlcGxhY2VfZXhpc3RpbmcnLCBTdHJpbmcocmVwbGFjZUV4aXN0aW5nKSk7XHJcbiAgaWYgKGluZ2VzdGlvbklkKSB7XHJcbiAgICBmb3JtRGF0YS5hcHBlbmQoJ2luZ2VzdGlvbl9pZCcsIGluZ2VzdGlvbklkKTtcclxuICB9XHJcblxyXG4gIHJldHVybiByZXF1ZXN0PEluZ2VzdFJlc3BvbnNlPihcclxuICAgICcvaW5nZXN0JyxcclxuICAgIHtcclxuICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgIGJvZHk6IGZvcm1EYXRhLFxyXG4gICAgfSxcclxuICAgIHRpbWVvdXRNc1xyXG4gICk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRHcmFwaCgpIHtcclxuICByZXR1cm4gcmVxdWVzdDxBcGlHcmFwaERhdGE+KCcvZ3JhcGgnKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFJpc2soY29tcG9uZW50SWQ6IHN0cmluZykge1xyXG4gIHJldHVybiByZXF1ZXN0PFJpc2tSZXNwb25zZT4oYC9yaXNrP2NvbXBvbmVudF9pZD0ke2VuY29kZVVSSUNvbXBvbmVudChjb21wb25lbnRJZCl9YCk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRJbXBhY3QoY29tcG9uZW50SWQ6IHN0cmluZykge1xyXG4gIHJldHVybiByZXF1ZXN0PEltcGFjdFJlc3BvbnNlPihgL2ltcGFjdD9jb21wb25lbnRfaWQ9JHtlbmNvZGVVUklDb21wb25lbnQoY29tcG9uZW50SWQpfWApO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VlZERlbW9HcmFwaCgpIHtcclxuICByZXR1cm4gcmVxdWVzdDx7IHNvdXJjZTogc3RyaW5nOyBub2Rlc19jcmVhdGVkOiBudW1iZXI7IGVkZ2VzX2NyZWF0ZWQ6IG51bWJlcjsgcmlza19ub2Rlc19zY29yZWQ6IG51bWJlciB9PihcclxuICAgICcvc2VlZCcsXHJcbiAgICB7IG1ldGhvZDogJ1BPU1QnIH1cclxuICApO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZDogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIHJlcXVlc3Q8UHJvY2Vzc2luZ1N0YXR1cz4oYC9pbmdlc3QvJHtlbmNvZGVVUklDb21wb25lbnQoaW5nZXN0aW9uSWQpfS9ldmVudHNgKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFJpc2tSYW5rZWRJdGVtcygpOiBQcm9taXNlPG5ldmVyPiB7XHJcbiAgLy8gVE9ETzogcmVwbGFjZSBjbGllbnQtc2lkZSByaXNrIHJhbmtpbmcgd2hlbiB0aGUgYmFja2VuZCBleHBvc2VzIGEgZGVkaWNhdGVkIHJpc2sgbGlzdCBlbmRwb2ludC5cclxuICB0aHJvdyBuZXcgVW5zdXBwb3J0ZWRFbmRwb2ludEVycm9yKCdUaGUgY3VycmVudCBiYWNrZW5kIGNvbnRyYWN0IGRvZXMgbm90IGV4cG9zZSBhIHJhbmtlZCByaXNrIGxpc3QgZW5kcG9pbnQuJyk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBcmNoaXRlY3R1cmVTdW1tYXJ5KCk6IFByb21pc2U8bmV2ZXI+IHtcclxuICAvLyBUT0RPOiByZXBsYWNlIGNsaWVudC1zaWRlIHN1bW1hcnkgZGVyaXZhdGlvbiB3aGVuIHRoZSBiYWNrZW5kIGV4cG9zZXMgYSBkZWRpY2F0ZWQgc3VtbWFyeSBlbmRwb2ludC5cclxuICB0aHJvdyBuZXcgVW5zdXBwb3J0ZWRFbmRwb2ludEVycm9yKCdUaGUgY3VycmVudCBiYWNrZW5kIGNvbnRyYWN0IGRvZXMgbm90IGV4cG9zZSBhbiBhcmNoaXRlY3R1cmUgc3VtbWFyeSBlbmRwb2ludC4nKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgY3JlYXRlQ29udGV4dCwgdXNlQ2FsbGJhY2ssIHVzZUNvbnRleHQsIHVzZU1lbW8sIHVzZVJlZiwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCB0eXBlIHsgUmVhY3ROb2RlIH0gZnJvbSAncmVhY3QnO1xyXG5pbXBvcnQgeyBhZGFwdEdyYXBoIH0gZnJvbSAnLi4vbGliL2FkYXB0ZXJzJztcclxuaW1wb3J0IHsgQXBpQ2xpZW50RXJyb3IsIGdldEdyYXBoLCBnZXRQcm9jZXNzaW5nU3RhdHVzLCB1cGxvYWREb2N1bWVudCB9IGZyb20gJy4uL2xpYi9hcGknO1xyXG5pbXBvcnQgeyBhcHBDb25maWcgfSBmcm9tICcuLi9saWIvY29uZmlnJztcclxuaW1wb3J0IHR5cGUgeyBHcmFwaFN0YXRlLCBVcGxvYWRTdGF0ZSB9IGZyb20gJy4uL3R5cGVzL2FwcCc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbnRleHRWYWx1ZSB7XHJcbiAgdXBsb2FkOiBVcGxvYWRTdGF0ZTtcclxuICBncmFwaDogR3JhcGhTdGF0ZTtcclxuICBzZXREcmFnQWN0aXZlOiAoYWN0aXZlOiBib29sZWFuKSA9PiB2b2lkO1xyXG4gIHNlbGVjdEZpbGU6IChmaWxlOiBGaWxlIHwgbnVsbCkgPT4gYm9vbGVhbjtcclxuICBjbGVhclNlbGVjdGVkRmlsZTogKCkgPT4gdm9pZDtcclxuICBiZWdpblByb2Nlc3Npbmc6ICgpID0+IFByb21pc2U8dm9pZD47XHJcbiAgbG9hZEdyYXBoOiAob3B0aW9ucz86IHsga2VlcFN0YXR1cz86IGJvb2xlYW4gfSkgPT4gUHJvbWlzZTx2b2lkPjtcclxuICByZXNldFVwbG9hZFN0YXRlOiAoKSA9PiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgQXBwQ29udGV4dCA9IGNyZWF0ZUNvbnRleHQ8QXBwQ29udGV4dFZhbHVlIHwgbnVsbD4obnVsbCk7XHJcblxyXG5leHBvcnQgY29uc3QgaW5pdGlhbFVwbG9hZFN0YXRlOiBVcGxvYWRTdGF0ZSA9IHtcclxuICBwaGFzZTogJ2lkbGUnLFxyXG4gIHNlbGVjdGVkRmlsZTogbnVsbCxcclxuICBlcnJvcjogbnVsbCxcclxuICBzdGF0dXNNZXNzYWdlOiAnVXBsb2FkIGEgLm1kIG9yIC50eHQgZmlsZSB0byBidWlsZCB0aGUgZ3JhcGguJyxcclxuICBpbmdlc3Rpb25JZDogbnVsbCxcclxuICBpbmdlc3Rpb246IG51bGwsXHJcbiAgcHJvY2Vzc2luZ1N0YXR1czogbnVsbCxcclxuICBzdGFydGVkQXQ6IG51bGwsXHJcbiAgY29tcGxldGVkQXQ6IG51bGwsXHJcbiAgcmV0cnlDb3VudDogMCxcclxufTtcclxuXHJcbmNvbnN0IGluaXRpYWxHcmFwaFN0YXRlOiBHcmFwaFN0YXRlID0ge1xyXG4gIHN0YXR1czogJ2lkbGUnLFxyXG4gIGRhdGE6IG51bGwsXHJcbiAgZXJyb3I6IG51bGwsXHJcbiAgbGFzdExvYWRlZEF0OiBudWxsLFxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHN1cHBvcnRlZEV4dGVuc2lvbnMgPSBbJy5tZCcsICcudHh0J107XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZUV4dGVuc2lvbihmaWxlbmFtZTogc3RyaW5nKSB7XHJcbiAgY29uc3Qgc2VnbWVudHMgPSBmaWxlbmFtZS50b0xvd2VyQ2FzZSgpLnNwbGl0KCcuJyk7XHJcbiAgcmV0dXJuIHNlZ21lbnRzLmxlbmd0aCA+IDEgPyBgLiR7c2VnbWVudHMucG9wKCl9YCA6ICcnO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2VsZWN0ZWRGaWxlVXBsb2FkU3RhdGUoZmlsZTogRmlsZSk6IFVwbG9hZFN0YXRlIHtcbiAgcmV0dXJuIHtcbiAgICBwaGFzZTogJ2ZpbGUtc2VsZWN0ZWQnLFxuICAgIHNlbGVjdGVkRmlsZTogZmlsZSxcbiAgICBlcnJvcjogbnVsbCxcbiAgICBzdGF0dXNNZXNzYWdlOiBgUmVhZHkgdG8gYW5hbHl6ZSAke2ZpbGUubmFtZX0uYCxcbiAgICBpbmdlc3Rpb25JZDogbnVsbCxcbiAgICBpbmdlc3Rpb246IG51bGwsXG4gICAgcHJvY2Vzc2luZ1N0YXR1czogbnVsbCxcbiAgICBzdGFydGVkQXQ6IG51bGwsXG4gICAgY29tcGxldGVkQXQ6IG51bGwsXG4gICAgcmV0cnlDb3VudDogMCxcbiAgfTtcbn1cblxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVXBsb2FkRXJyb3JTdGF0ZShlcnJvcjogc3RyaW5nLCBzdGF0dXNNZXNzYWdlOiBzdHJpbmcpOiBVcGxvYWRTdGF0ZSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIC4uLmluaXRpYWxVcGxvYWRTdGF0ZSxcclxuICAgIHBoYXNlOiAnZXJyb3InLFxyXG4gICAgZXJyb3IsXHJcbiAgICBzdGF0dXNNZXNzYWdlLFxyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVNlbGVjdGVkRmlsZShmaWxlOiBGaWxlIHwgbnVsbCwgbWF4VXBsb2FkQnl0ZXM6IG51bWJlcik6IFVwbG9hZFN0YXRlIHtcclxuICBpZiAoIWZpbGUpIHtcclxuICAgIHJldHVybiBpbml0aWFsVXBsb2FkU3RhdGU7XHJcbiAgfVxyXG5cclxuICBjb25zdCBleHRlbnNpb24gPSBnZXRGaWxlRXh0ZW5zaW9uKGZpbGUubmFtZSk7XHJcbiAgaWYgKCFzdXBwb3J0ZWRFeHRlbnNpb25zLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcclxuICAgIHJldHVybiBjcmVhdGVVcGxvYWRFcnJvclN0YXRlKCdPbmx5IC5tZCBhbmQgLnR4dCBmaWxlcyBhcmUgc3VwcG9ydGVkLicsICdVbnN1cHBvcnRlZCBmaWxlIHR5cGUuJyk7XHJcbiAgfVxyXG5cclxuICBpZiAoZmlsZS5zaXplID4gbWF4VXBsb2FkQnl0ZXMpIHtcclxuICAgIHJldHVybiBjcmVhdGVVcGxvYWRFcnJvclN0YXRlKFxyXG4gICAgICBgRmlsZSBleGNlZWRzIHRoZSAke01hdGgucm91bmQobWF4VXBsb2FkQnl0ZXMgLyAxMDI0IC8gMTAyNCl9IE1CIHVwbG9hZCBsaW1pdC5gLFxyXG4gICAgICAnU2VsZWN0ZWQgZmlsZSBpcyB0b28gbGFyZ2UuJ1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBjcmVhdGVTZWxlY3RlZEZpbGVVcGxvYWRTdGF0ZShmaWxlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdG9GcmllbmRseU1lc3NhZ2UoZXJyb3I6IHVua25vd24pIHtcclxuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlDbGllbnRFcnJvcikge1xyXG4gICAgcmV0dXJuIGVycm9yLm1lc3NhZ2U7XHJcbiAgfVxyXG5cclxuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgcmV0dXJuIGVycm9yLm1lc3NhZ2U7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gJ0FuIHVuZXhwZWN0ZWQgZnJvbnRlbmQgZXJyb3Igb2NjdXJyZWQuJztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIEFwcFByb3ZpZGVyKHsgY2hpbGRyZW4gfTogeyBjaGlsZHJlbjogUmVhY3ROb2RlIH0pIHtcclxuICBjb25zdCBbdXBsb2FkLCBzZXRVcGxvYWRdID0gdXNlU3RhdGU8VXBsb2FkU3RhdGU+KGluaXRpYWxVcGxvYWRTdGF0ZSk7XHJcbiAgY29uc3QgW2dyYXBoLCBzZXRHcmFwaF0gPSB1c2VTdGF0ZTxHcmFwaFN0YXRlPihpbml0aWFsR3JhcGhTdGF0ZSk7XHJcbiAgY29uc3QgcHJvY2Vzc2luZ1Byb21pc2VSZWYgPSB1c2VSZWY8UHJvbWlzZTx2b2lkPiB8IG51bGw+KG51bGwpO1xyXG5cclxuICBjb25zdCBzZXREcmFnQWN0aXZlID0gdXNlQ2FsbGJhY2soKGFjdGl2ZTogYm9vbGVhbikgPT4ge1xyXG4gICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PiB7XHJcbiAgICAgIGlmIChhY3RpdmUpIHtcclxuICAgICAgICByZXR1cm4geyAuLi5jdXJyZW50LCBwaGFzZTogJ2RyYWctaG92ZXInLCBzdGF0dXNNZXNzYWdlOiAnRHJvcCB0aGUgZmlsZSB0byBxdWV1ZSBpdCBmb3IgaW5nZXN0aW9uLicgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGN1cnJlbnQuc2VsZWN0ZWRGaWxlKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdmaWxlLXNlbGVjdGVkJywgc3RhdHVzTWVzc2FnZTogYFJlYWR5IHRvIGFuYWx5emUgJHtjdXJyZW50LnNlbGVjdGVkRmlsZS5uYW1lfS5gIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB7IC4uLmN1cnJlbnQsIHBoYXNlOiAnaWRsZScsIHN0YXR1c01lc3NhZ2U6IGluaXRpYWxVcGxvYWRTdGF0ZS5zdGF0dXNNZXNzYWdlIH07XHJcbiAgICB9KTtcclxuICB9LCBbXSk7XG5cbiAgY29uc3Qgc2VsZWN0RmlsZSA9IHVzZUNhbGxiYWNrKChmaWxlOiBGaWxlIHwgbnVsbCkgPT4ge1xuICAgIGNvbnN0IG5leHRTdGF0ZSA9IHZhbGlkYXRlU2VsZWN0ZWRGaWxlKGZpbGUsIGFwcENvbmZpZy5tYXhVcGxvYWRCeXRlcyk7XG4gICAgc2V0VXBsb2FkKG5leHRTdGF0ZSk7XG4gICAgcmV0dXJuIG5leHRTdGF0ZS5waGFzZSA9PT0gJ2ZpbGUtc2VsZWN0ZWQnO1xuICB9LCBbXSk7XG5cclxuICBjb25zdCBjbGVhclNlbGVjdGVkRmlsZSA9IHVzZUNhbGxiYWNrKCgpID0+IHtcclxuICAgIHNldFVwbG9hZChpbml0aWFsVXBsb2FkU3RhdGUpO1xyXG4gIH0sIFtdKTtcclxuXHJcbiAgY29uc3QgbG9hZEdyYXBoID0gdXNlQ2FsbGJhY2soYXN5bmMgKG9wdGlvbnM/OiB7IGtlZXBTdGF0dXM/OiBib29sZWFuIH0pID0+IHtcclxuICAgIHNldEdyYXBoKChjdXJyZW50KSA9PiAoe1xyXG4gICAgICAuLi5jdXJyZW50LFxyXG4gICAgICBzdGF0dXM6ICdsb2FkaW5nJyxcclxuICAgICAgZXJyb3I6IG51bGwsXHJcbiAgICB9KSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IGdldEdyYXBoKCk7XHJcbiAgICAgIGNvbnN0IGFkYXB0ZWRHcmFwaCA9IGFkYXB0R3JhcGgocGF5bG9hZCk7XHJcbiAgICAgIHNldEdyYXBoKHtcclxuICAgICAgICBzdGF0dXM6ICdyZWFkeScsXHJcbiAgICAgICAgZGF0YTogYWRhcHRlZEdyYXBoLFxyXG4gICAgICAgIGVycm9yOiBudWxsLFxyXG4gICAgICAgIGxhc3RMb2FkZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAoIW9wdGlvbnM/LmtlZXBTdGF0dXMpIHtcclxuICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+IHtcclxuICAgICAgICAgIGlmIChjdXJyZW50LnBoYXNlID09PSAnc3VjY2VzcycgfHwgY3VycmVudC5waGFzZSA9PT0gJ2VtcHR5LWdyYXBoJykge1xyXG4gICAgICAgICAgICByZXR1cm4gY3VycmVudDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgICAgICBwaGFzZTogYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMCA/ICdlbXB0eS1ncmFwaCcgOiBjdXJyZW50LnBoYXNlLFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgbWVzc2FnZSA9IHRvRnJpZW5kbHlNZXNzYWdlKGVycm9yKTtcclxuICAgICAgc2V0R3JhcGgoe1xyXG4gICAgICAgIHN0YXR1czogJ2Vycm9yJyxcclxuICAgICAgICBkYXRhOiBudWxsLFxyXG4gICAgICAgIGVycm9yOiBtZXNzYWdlLFxyXG4gICAgICAgIGxhc3RMb2FkZWRBdDogbnVsbCxcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH0sIFtdKTtcclxuXHJcbiAgY29uc3QgYmVnaW5Qcm9jZXNzaW5nID0gdXNlQ2FsbGJhY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgaWYgKCF1cGxvYWQuc2VsZWN0ZWRGaWxlKSB7XHJcbiAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4gKHtcclxuICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgIHBoYXNlOiAnZXJyb3InLFxyXG4gICAgICAgIGVycm9yOiAnQ2hvb3NlIGEgLm1kIG9yIC50eHQgZmlsZSBiZWZvcmUgcHJvY2Vzc2luZy4nLFxyXG4gICAgICAgIHN0YXR1c01lc3NhZ2U6ICdObyBmaWxlIHNlbGVjdGVkLicsXHJcbiAgICAgIH0pKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChwcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50KSB7XHJcbiAgICAgIHJldHVybiBwcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHNlbGVjdGVkRmlsZSA9IHVwbG9hZC5zZWxlY3RlZEZpbGU7XHJcblxyXG4gICAgY29uc3QgdGFzayA9IChhc3luYyAoKSA9PiB7XHJcbiAgICAgIGxldCBwcm9jZXNzaW5nUGhhc2VUaW1lciA9IDA7XHJcbiAgICAgIGNvbnN0IGluZ2VzdGlvbklkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcclxuICAgICAgbGV0IGtlZXBQb2xsaW5nID0gdHJ1ZTtcclxuXHJcbiAgICAgIGNvbnN0IHBvbGxQcm9jZXNzaW5nID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIHdoaWxlIChrZWVwUG9sbGluZykge1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc2luZ1N0YXR1cyA9IGF3YWl0IGdldFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQpO1xyXG4gICAgICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+XHJcbiAgICAgICAgICAgICAgY3VycmVudC5pbmdlc3Rpb25JZCAhPT0gaW5nZXN0aW9uSWRcclxuICAgICAgICAgICAgICAgID8gY3VycmVudFxyXG4gICAgICAgICAgICAgICAgOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uY3VycmVudCxcclxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c01lc3NhZ2U6IHByb2Nlc3NpbmdTdGF0dXMubGF0ZXN0X2V2ZW50IHx8IGN1cnJlbnQuc3RhdHVzTWVzc2FnZSxcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIC8vIFBvbGxpbmcgaXMgYmVzdC1lZmZvcnQgc28gdGhlIG1haW4gdXBsb2FkIGZsb3cgY2FuIGNvbnRpbnVlIGV2ZW4gaWYgc3RhdHVzIHJlZnJlc2ggZmFpbHMuXHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKCFrZWVwUG9sbGluZykge1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gd2luZG93LnNldFRpbWVvdXQocmVzb2x2ZSwgODAwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XHJcbiAgICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgICAgcGhhc2U6ICd1cGxvYWRpbmcnLFxyXG4gICAgICAgICAgZXJyb3I6IG51bGwsXHJcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBgVXBsb2FkaW5nICR7c2VsZWN0ZWRGaWxlLm5hbWV9Li4uYCxcclxuICAgICAgICAgIGluZ2VzdGlvbklkLFxyXG4gICAgICAgICAgc3RhcnRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgY29tcGxldGVkQXQ6IG51bGwsXHJcbiAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzOiB7XHJcbiAgICAgICAgICAgIGluZ2VzdGlvbl9pZDogaW5nZXN0aW9uSWQsXHJcbiAgICAgICAgICAgIHN0YXRlOiAncGVuZGluZycsXHJcbiAgICAgICAgICAgIGZpbGVuYW1lOiBzZWxlY3RlZEZpbGUubmFtZSxcclxuICAgICAgICAgICAgY2h1bmtzX3RvdGFsOiBudWxsLFxyXG4gICAgICAgICAgICBjdXJyZW50X2NodW5rOiBudWxsLFxyXG4gICAgICAgICAgICBzdGFydGVkX2F0OiBudWxsLFxyXG4gICAgICAgICAgICBjb21wbGV0ZWRfYXQ6IG51bGwsXHJcbiAgICAgICAgICAgIGxhdGVzdF9ldmVudDogYFVwbG9hZGluZyAke3NlbGVjdGVkRmlsZS5uYW1lfS4uLmAsXHJcbiAgICAgICAgICAgIGV2ZW50czogW10sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgY29uc3QgcG9sbGluZ1Rhc2sgPSBwb2xsUHJvY2Vzc2luZygpO1xyXG5cclxuICAgICAgICBwcm9jZXNzaW5nUGhhc2VUaW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT5cclxuICAgICAgICAgICAgY3VycmVudC5waGFzZSA9PT0gJ3VwbG9hZGluZydcclxuICAgICAgICAgICAgICA/IHtcclxuICAgICAgICAgICAgICAgICAgLi4uY3VycmVudCxcclxuICAgICAgICAgICAgICAgICAgcGhhc2U6ICdwcm9jZXNzaW5nJyxcclxuICAgICAgICAgICAgICAgICAgc3RhdHVzTWVzc2FnZTogJ0V4dHJhY3RpbmcgY29tcG9uZW50cywgcmVsYXRpb25zaGlwcywgYW5kIHJpc2sgbWV0cmljcy4uLicsXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgOiBjdXJyZW50XHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH0sIDkwMCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGluZ2VzdGlvbiA9IGF3YWl0IHVwbG9hZERvY3VtZW50KHNlbGVjdGVkRmlsZSwgdHJ1ZSwgYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMsIGluZ2VzdGlvbklkKTtcclxuICAgICAgICBjb25zdCBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzID0gYXdhaXQgZ2V0UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZCkuY2F0Y2goKCkgPT4gbnVsbCk7XHJcblxyXG4gICAgICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4gKHtcclxuICAgICAgICAgIC4uLmN1cnJlbnQsXHJcbiAgICAgICAgICBpbmdlc3Rpb24sXHJcbiAgICAgICAgICBwaGFzZTogJ3Byb2Nlc3NpbmcnLFxyXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTogbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cz8ubGF0ZXN0X2V2ZW50IHx8ICdMb2FkaW5nIHRoZSBnZW5lcmF0ZWQgZ3JhcGggd29ya3NwYWNlLi4uJyxcclxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgfHwgY3VycmVudC5wcm9jZXNzaW5nU3RhdHVzLFxyXG4gICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgY29uc3QgZ3JhcGhQYXlsb2FkID0gYXdhaXQgZ2V0R3JhcGgoKTtcclxuICAgICAgICBjb25zdCBhZGFwdGVkR3JhcGggPSBhZGFwdEdyYXBoKGdyYXBoUGF5bG9hZCk7XHJcblxyXG4gICAgICAgIHNldEdyYXBoKHtcclxuICAgICAgICAgIHN0YXR1czogJ3JlYWR5JyxcclxuICAgICAgICAgIGRhdGE6IGFkYXB0ZWRHcmFwaCxcclxuICAgICAgICAgIGVycm9yOiBudWxsLFxyXG4gICAgICAgICAgbGFzdExvYWRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XHJcbiAgICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgICAgaW5nZXN0aW9uLFxyXG4gICAgICAgICAgaW5nZXN0aW9uSWQsXHJcbiAgICAgICAgICBwaGFzZTogYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMCA/ICdlbXB0eS1ncmFwaCcgOiAnc3VjY2VzcycsXHJcbiAgICAgICAgICBlcnJvcjogbnVsbCxcclxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6XHJcbiAgICAgICAgICAgIGxhdGVzdFByb2Nlc3NpbmdTdGF0dXM/LmxhdGVzdF9ldmVudCB8fFxyXG4gICAgICAgICAgICAoYWRhcHRlZEdyYXBoLm5vZGVzLmxlbmd0aCA9PT0gMFxyXG4gICAgICAgICAgICAgID8gJ1Byb2Nlc3NpbmcgY29tcGxldGVkLCBidXQgdGhlIGFjdGl2ZSBncmFwaCBpcyBlbXB0eS4nXHJcbiAgICAgICAgICAgICAgOiAnVHdpbkdyYXBoT3BzIGZpbmlzaGVkIHByb2Nlc3NpbmcgeW91ciBkb2N1bWVudC4nKSxcclxuICAgICAgICAgIHByb2Nlc3NpbmdTdGF0dXM6XHJcbiAgICAgICAgICAgIGxhdGVzdFByb2Nlc3NpbmdTdGF0dXMgPz9cclxuICAgICAgICAgICAgY3VycmVudC5wcm9jZXNzaW5nU3RhdHVzLFxyXG4gICAgICAgICAgY29tcGxldGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICAgIGtlZXBQb2xsaW5nID0gZmFsc2U7XHJcbiAgICAgICAgYXdhaXQgcG9sbGluZ1Rhc2s7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAga2VlcFBvbGxpbmcgPSBmYWxzZTtcclxuICAgICAgICBjb25zdCBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzID0gYXdhaXQgZ2V0UHJvY2Vzc2luZ1N0YXR1cyhpbmdlc3Rpb25JZCkuY2F0Y2goKCkgPT4gbnVsbCk7XHJcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRvRnJpZW5kbHlNZXNzYWdlKGVycm9yKTtcclxuICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XHJcbiAgICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgICAgcGhhc2U6ICdyZXRyeScsXHJcbiAgICAgICAgICBlcnJvcjogbWVzc2FnZSxcclxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6IG1lc3NhZ2UsXHJcbiAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzOiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzIHx8IGN1cnJlbnQucHJvY2Vzc2luZ1N0YXR1cyxcclxuICAgICAgICAgIGNvbXBsZXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgcmV0cnlDb3VudDogY3VycmVudC5yZXRyeUNvdW50ICsgMSxcclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAga2VlcFBvbGxpbmcgPSBmYWxzZTtcclxuICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHByb2Nlc3NpbmdQaGFzZVRpbWVyKTtcclxuICAgICAgICBwcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50ID0gbnVsbDtcclxuICAgICAgfVxyXG4gICAgfSkoKTtcclxuXHJcbiAgICBwcm9jZXNzaW5nUHJvbWlzZVJlZi5jdXJyZW50ID0gdGFzaztcclxuICAgIHJldHVybiB0YXNrO1xyXG4gIH0sIFt1cGxvYWQuc2VsZWN0ZWRGaWxlXSk7XHJcblxyXG4gIGNvbnN0IHJlc2V0VXBsb2FkU3RhdGUgPSB1c2VDYWxsYmFjaygoKSA9PiB7XHJcbiAgICBzZXRVcGxvYWQoaW5pdGlhbFVwbG9hZFN0YXRlKTtcclxuICB9LCBbXSk7XHJcblxyXG4gIGNvbnN0IHZhbHVlID0gdXNlTWVtbzxBcHBDb250ZXh0VmFsdWU+KFxyXG4gICAgKCkgPT4gKHtcclxuICAgICAgdXBsb2FkLFxyXG4gICAgICBncmFwaCxcclxuICAgICAgc2V0RHJhZ0FjdGl2ZSxcclxuICAgICAgc2VsZWN0RmlsZSxcclxuICAgICAgY2xlYXJTZWxlY3RlZEZpbGUsXHJcbiAgICAgIGJlZ2luUHJvY2Vzc2luZyxcclxuICAgICAgbG9hZEdyYXBoLFxyXG4gICAgICByZXNldFVwbG9hZFN0YXRlLFxyXG4gICAgfSksXHJcbiAgICBbdXBsb2FkLCBncmFwaCwgc2V0RHJhZ0FjdGl2ZSwgc2VsZWN0RmlsZSwgY2xlYXJTZWxlY3RlZEZpbGUsIGJlZ2luUHJvY2Vzc2luZywgbG9hZEdyYXBoLCByZXNldFVwbG9hZFN0YXRlXVxyXG4gICk7XHJcblxyXG4gIHJldHVybiA8QXBwQ29udGV4dC5Qcm92aWRlciB2YWx1ZT17dmFsdWV9PntjaGlsZHJlbn08L0FwcENvbnRleHQuUHJvdmlkZXI+O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdXNlQXBwQ29udGV4dCgpIHtcclxuICBjb25zdCBjb250ZXh0ID0gdXNlQ29udGV4dChBcHBDb250ZXh0KTtcclxuICBpZiAoIWNvbnRleHQpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcigndXNlQXBwQ29udGV4dCBtdXN0IGJlIHVzZWQgd2l0aGluIEFwcFByb3ZpZGVyLicpO1xyXG4gIH1cclxuICByZXR1cm4gY29udGV4dDtcclxufVxyXG4iLCAiaW1wb3J0IGFzc2VydCBmcm9tICdub2RlOmFzc2VydC9zdHJpY3QnO1xyXG5pbXBvcnQgdGVzdCBmcm9tICdub2RlOnRlc3QnO1xyXG5pbXBvcnQgeyBpbnN0YWxsUnVudGltZVdpbmRvd0NvbmZpZyB9IGZyb20gJy4vdGVzdC11dGlscyc7XHJcblxyXG5pbnN0YWxsUnVudGltZVdpbmRvd0NvbmZpZygpO1xyXG5cclxuY29uc3Qgc3RhdGVNb2R1bGUgPSBhd2FpdCBpbXBvcnQoJy4uL3NyYy9zdGF0ZS9BcHBDb250ZXh0Jyk7XHJcbmNvbnN0IHsgY3JlYXRlU2VsZWN0ZWRGaWxlVXBsb2FkU3RhdGUsIGdldEZpbGVFeHRlbnNpb24sIHZhbGlkYXRlU2VsZWN0ZWRGaWxlIH0gPSBzdGF0ZU1vZHVsZTtcclxuXHJcbnRlc3QoJ2dldEZpbGVFeHRlbnNpb24gbm9ybWFsaXplcyBmaWxlIGV4dGVuc2lvbnMnLCAoKSA9PiB7XHJcbiAgYXNzZXJ0LmVxdWFsKGdldEZpbGVFeHRlbnNpb24oJ21hbnVhbC5NRCcpLCAnLm1kJyk7XHJcbiAgYXNzZXJ0LmVxdWFsKGdldEZpbGVFeHRlbnNpb24oJ25vdGVzLnR4dCcpLCAnLnR4dCcpO1xyXG4gIGFzc2VydC5lcXVhbChnZXRGaWxlRXh0ZW5zaW9uKCdSRUFETUUnKSwgJycpO1xyXG59KTtcclxuXHJcbnRlc3QoJ3ZhbGlkYXRlU2VsZWN0ZWRGaWxlIHJlamVjdHMgdW5zdXBwb3J0ZWQgZmlsZSB0eXBlcycsICgpID0+IHtcclxuICBjb25zdCBmaWxlID0gbmV3IEZpbGUoWydiYWQnXSwgJ2RpYWdyYW0ucGRmJywgeyB0eXBlOiAnYXBwbGljYXRpb24vcGRmJyB9KTtcclxuICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZVNlbGVjdGVkRmlsZShmaWxlLCAxMCAqIDEwMjQgKiAxMDI0KTtcclxuXHJcbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5waGFzZSwgJ2Vycm9yJyk7XHJcbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5lcnJvciwgJ09ubHkgLm1kIGFuZCAudHh0IGZpbGVzIGFyZSBzdXBwb3J0ZWQuJyk7XHJcbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5zdGF0dXNNZXNzYWdlLCAnVW5zdXBwb3J0ZWQgZmlsZSB0eXBlLicpO1xyXG59KTtcclxuXHJcbnRlc3QoJ3ZhbGlkYXRlU2VsZWN0ZWRGaWxlIHJlamVjdHMgb3ZlcnNpemVkIGZpbGVzJywgKCkgPT4ge1xyXG4gIGNvbnN0IGZpbGUgPSBuZXcgRmlsZShbbmV3IFVpbnQ4QXJyYXkoMTIpXSwgJ3N5c3RlbS5tZCcsIHsgdHlwZTogJ3RleHQvbWFya2Rvd24nIH0pO1xyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShmaWxlLCAnc2l6ZScsIHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogMTIgKiAxMDI0ICogMTAyNCB9KTtcclxuXHJcbiAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVTZWxlY3RlZEZpbGUoZmlsZSwgMTAgKiAxMDI0ICogMTAyNCk7XHJcblxyXG4gIGFzc2VydC5lcXVhbChyZXN1bHQucGhhc2UsICdlcnJvcicpO1xyXG4gIGFzc2VydC5tYXRjaChyZXN1bHQuZXJyb3IgfHwgJycsIC8xMCBNQiB1cGxvYWQgbGltaXQvKTtcclxuICBhc3NlcnQuZXF1YWwocmVzdWx0LnN0YXR1c01lc3NhZ2UsICdTZWxlY3RlZCBmaWxlIGlzIHRvbyBsYXJnZS4nKTtcclxufSk7XHJcblxyXG50ZXN0KCd2YWxpZGF0ZVNlbGVjdGVkRmlsZSBhY2NlcHRzIHN1cHBvcnRlZCBmaWxlcyBhbmQgcmV0dXJucyB0aGUgc2VsZWN0ZWQtZmlsZSBzdGF0ZScsICgpID0+IHtcclxuICBjb25zdCBmaWxlID0gbmV3IEZpbGUoWydoZWxsbyddLCAnc3lzdGVtLm1kJywgeyB0eXBlOiAndGV4dC9tYXJrZG93bicgfSk7XHJcbiAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVTZWxlY3RlZEZpbGUoZmlsZSwgMTAgKiAxMDI0ICogMTAyNCk7XHJcblxyXG4gIGFzc2VydC5kZWVwRXF1YWwocmVzdWx0LCBjcmVhdGVTZWxlY3RlZEZpbGVVcGxvYWRTdGF0ZShmaWxlKSk7XHJcbn0pO1xyXG4iLCAiZXhwb3J0IGZ1bmN0aW9uIGluc3RhbGxSdW50aW1lV2luZG93Q29uZmlnKG92ZXJyaWRlczogUGFydGlhbDxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXI+PiA9IHt9KSB7XHJcbiAgY29uc3QgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gKGNhbGxiYWNrOiBGcmFtZVJlcXVlc3RDYWxsYmFjaykgPT4gc2V0VGltZW91dCgoKSA9PiBjYWxsYmFjayhEYXRlLm5vdygpKSwgMCk7XHJcbiAgY29uc3QgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSAoaGFuZGxlOiBudW1iZXIpID0+IGNsZWFyVGltZW91dChoYW5kbGUpO1xyXG5cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ3dpbmRvdycsIHtcclxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIHdyaXRhYmxlOiB0cnVlLFxyXG4gICAgdmFsdWU6IHtcclxuICAgICAgX19UV0lOX0NPTkZJR19fOiB7XHJcbiAgICAgICAgTUFYX1VQTE9BRF9NQjogMTAsXHJcbiAgICAgICAgUFJPQ0VTU0lOR19USU1FT1VUX01TOiA5MDAwMCxcclxuICAgICAgICBBUFBfRU5WOiAndGVzdCcsXHJcbiAgICAgICAgLi4ub3ZlcnJpZGVzLFxyXG4gICAgICB9LFxyXG4gICAgICBzZXRUaW1lb3V0LFxyXG4gICAgICBjbGVhclRpbWVvdXQsXHJcbiAgICAgIHNldEludGVydmFsLFxyXG4gICAgICBjbGVhckludGVydmFsLFxyXG4gICAgICBhZGRFdmVudExpc3RlbmVyOiAoKSA9PiB7fSxcclxuICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogKCkgPT4ge30sXHJcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSxcclxuICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUsXHJcbiAgICAgIGRldmljZVBpeGVsUmF0aW86IDEsXHJcbiAgICB9LFxyXG4gIH0pO1xyXG5cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ2RvY3VtZW50Jywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZToge1xyXG4gICAgICBjcmVhdGVFbGVtZW50OiAoKSA9PiAoe1xyXG4gICAgICAgIGdldENvbnRleHQ6ICgpID0+ICh7fSksXHJcbiAgICAgICAgc3R5bGU6IHt9LFxyXG4gICAgICAgIHNldEF0dHJpYnV0ZTogKCkgPT4ge30sXHJcbiAgICAgICAgYXBwZW5kQ2hpbGQ6ICgpID0+IHt9LFxyXG4gICAgICB9KSxcclxuICAgICAgYm9keToge1xyXG4gICAgICAgIGFwcGVuZENoaWxkOiAoKSA9PiB7fSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSk7XHJcblxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnbmF2aWdhdG9yJywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZToge1xyXG4gICAgICB1c2VyQWdlbnQ6ICdub2RlLmpzJyxcclxuICAgIH0sXHJcbiAgfSk7XHJcblxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAncmVxdWVzdEFuaW1hdGlvbkZyYW1lJywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZTogcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxyXG4gIH0pO1xyXG5cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ2NhbmNlbEFuaW1hdGlvbkZyYW1lJywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZTogY2FuY2VsQW5pbWF0aW9uRnJhbWUsXHJcbiAgfSk7XHJcblxyXG4gIGlmICghKCdSZXNpemVPYnNlcnZlcicgaW4gZ2xvYmFsVGhpcykpIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnUmVzaXplT2JzZXJ2ZXInLCB7XHJcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICAgIHZhbHVlOiBjbGFzcyBSZXNpemVPYnNlcnZlciB7XHJcbiAgICAgICAgb2JzZXJ2ZSgpIHt9XHJcbiAgICAgICAgdW5vYnNlcnZlKCkge31cclxuICAgICAgICBkaXNjb25uZWN0KCkge31cclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNhbXBsZUdyYXBoRGF0YSgpIHtcclxuICBjb25zdCBub2RlcyA9IFtcclxuICAgIHtcclxuICAgICAgaWQ6ICdhcGknLFxyXG4gICAgICBuYW1lOiAnQVBJIFNlcnZpY2UnLFxyXG4gICAgICB0eXBlOiAnc29mdHdhcmUnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvcmUgQVBJJyxcclxuICAgICAgcmlza1Njb3JlOiA4MixcclxuICAgICAgcmlza0xldmVsOiAnaGlnaCcsXHJcbiAgICAgIGRlZ3JlZTogMixcclxuICAgICAgYmV0d2Vlbm5lc3M6IDAuNTUsXHJcbiAgICAgIGNsb3NlbmVzczogMC42NyxcclxuICAgICAgYmxhc3RSYWRpdXM6IDMsXHJcbiAgICAgIGRlcGVuZGVuY3lTcGFuOiAyLFxyXG4gICAgICByaXNrRXhwbGFuYXRpb246ICdIYW5kbGVzIGNvcmUgcmVxdWVzdHMuJyxcclxuICAgICAgc291cmNlOiAnc2FtcGxlJyxcclxuICAgICAgZGVwZW5kZW5jaWVzOiBbJ2RiJ10sXHJcbiAgICAgIGRlcGVuZGVudHM6IFsnZnJvbnRlbmQnXSxcclxuICAgICAgdmFsOiAzNixcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGlkOiAnZGInLFxyXG4gICAgICBuYW1lOiAnRGF0YWJhc2UnLFxyXG4gICAgICB0eXBlOiAnZGF0YScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUGVyc2lzdGVuY2UgbGF5ZXInLFxyXG4gICAgICByaXNrU2NvcmU6IDQ0LFxyXG4gICAgICByaXNrTGV2ZWw6ICdtZWRpdW0nLFxyXG4gICAgICBkZWdyZWU6IDEsXHJcbiAgICAgIGJldHdlZW5uZXNzOiAwLjIyLFxyXG4gICAgICBjbG9zZW5lc3M6IDAuNDQsXHJcbiAgICAgIGJsYXN0UmFkaXVzOiAxLFxyXG4gICAgICBkZXBlbmRlbmN5U3BhbjogMSxcclxuICAgICAgcmlza0V4cGxhbmF0aW9uOiAnU3RvcmVzIHJlY29yZHMuJyxcclxuICAgICAgc291cmNlOiAnc2FtcGxlJyxcclxuICAgICAgZGVwZW5kZW5jaWVzOiBbXSxcclxuICAgICAgZGVwZW5kZW50czogWydhcGknXSxcclxuICAgICAgdmFsOiAyOCxcclxuICAgIH0sXHJcbiAgXTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHNvdXJjZTogJ3NhbXBsZScsXHJcbiAgICBub2RlcyxcclxuICAgIGxpbmtzOiBbXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ2FwaS1kYi0wJyxcclxuICAgICAgICBzb3VyY2U6ICdhcGknLFxyXG4gICAgICAgIHRhcmdldDogJ2RiJyxcclxuICAgICAgICByZWxhdGlvbjogJ2RlcGVuZHNfb24nLFxyXG4gICAgICAgIHJhdGlvbmFsZTogJ1JlYWRzIGFuZCB3cml0ZXMgcmVjb3Jkcy4nLFxyXG4gICAgICB9LFxyXG4gICAgXSxcclxuICAgIG5vZGVJbmRleDogT2JqZWN0LmZyb21FbnRyaWVzKG5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUuaWQsIG5vZGVdKSksXHJcbiAgICByZWxhdGlvblR5cGVzOiBbJ2RlcGVuZHNfb24nXSxcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTW9ja0NvbnRleHQob3ZlcnJpZGVzID0ge30pIHtcclxuICByZXR1cm4ge1xyXG4gICAgdXBsb2FkOiB7XG4gICAgICBwaGFzZTogJ2lkbGUnLFxuICAgICAgc2VsZWN0ZWRGaWxlOiBudWxsLFxuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBzdGF0dXNNZXNzYWdlOiAnVXBsb2FkIGEgLm1kIG9yIC50eHQgZmlsZSB0byBidWlsZCB0aGUgZ3JhcGguJyxcbiAgICAgIGluZ2VzdGlvbklkOiBudWxsLFxuICAgICAgaW5nZXN0aW9uOiBudWxsLFxuICAgICAgcHJvY2Vzc2luZ1N0YXR1czogbnVsbCxcbiAgICAgIHN0YXJ0ZWRBdDogbnVsbCxcbiAgICAgIGNvbXBsZXRlZEF0OiBudWxsLFxuICAgICAgcmV0cnlDb3VudDogMCxcbiAgICB9LFxuICAgIGdyYXBoOiB7XHJcbiAgICAgIHN0YXR1czogJ2lkbGUnLFxyXG4gICAgICBkYXRhOiBudWxsLFxyXG4gICAgICBlcnJvcjogbnVsbCxcclxuICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxyXG4gICAgfSxcclxuICAgIHNldERyYWdBY3RpdmU6ICgpID0+IHt9LFxyXG4gICAgc2VsZWN0RmlsZTogKCkgPT4gdHJ1ZSxcclxuICAgIGNsZWFyU2VsZWN0ZWRGaWxlOiAoKSA9PiB7fSxcclxuICAgIGJlZ2luUHJvY2Vzc2luZzogYXN5bmMgKCkgPT4ge30sXHJcbiAgICBsb2FkR3JhcGg6IGFzeW5jICgpID0+IHt9LFxyXG4gICAgcmVzZXRVcGxvYWRTdGF0ZTogKCkgPT4ge30sXHJcbiAgICAuLi5vdmVycmlkZXMsXHJcbiAgfTtcclxufVxyXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQUdBLFNBQVMsYUFBYSxPQUFnQixPQUFlO0FBQ25ELE1BQUksT0FBTyxVQUFVLFVBQVU7QUFDN0IsVUFBTSxJQUFJLE1BQU0sb0NBQW9DLEtBQUssa0JBQWtCO0FBQUEsRUFDN0U7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLGFBQWEsT0FBZ0IsT0FBZTtBQUNuRCxNQUFJLE9BQU8sVUFBVSxZQUFZLE9BQU8sTUFBTSxLQUFLLEdBQUc7QUFDcEQsVUFBTSxJQUFJLE1BQU0s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QUFJLFdBQVcsRUFBRSxDQUFDLEdBQUcsYUFBYSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDbEYsU0FBTyxlQUFlLE1BQU0sUUFBUSxFQUFFLGNBQWMsTUFBTSxPQUFPLEtBQUssT0FBTyxLQUFLLENBQUM7QUFFbkYsUUFBTSxTQUFTQSxzQkFBcUIsTUFBTSxLQUFLLE9BQU8sSUFBSTtBQUUxRCxTQUFPLE1BQU0sT0FBTyxPQUFPLE9BQU87QUFDbEMsU0FBTyxNQUFNLE9BQU8sU0FBUyxJQUFJLG9CQUFvQjtBQUNyRCxTQUFPLE1BQU0sT0FBTyxlQUFlLDZCQUE2QjtBQUNsRSxDQUFDO0FBRUQsS0FBSyxvRkFBb0YsTUFBTTtBQUM3RixRQUFNLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxHQUFHLGFBQWEsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3ZFLFFBQU0sU0FBU0Esc0JBQXFCLE1BQU0sS0FBSyxPQUFPLElBQUk7QUFFMUQsU0FBTyxVQUFVLFFBQVFGLCtCQUE4QixJQUFJLENBQUM7QUFDOUQsQ0FBQzsiLAogICJuYW1lcyI6IFsiY3JlYXRlU2VsZWN0ZWRGaWxlVXBsb2FkU3RhdGUiLCAiZ2V0RmlsZUV4dGVuc2lvbiIsICJ2YWxpZGF0ZVNlbGVjdGVkRmlsZSJdCn0K
