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
  return /* @__PURE__ */ jsx5("div", { className: "min-h-screen bg-[#0F172A] text-white", children: /* @__PURE__ */ jsx5("div", { className: "mx-auto max-w-7xl px-6 py-16", children: /* @__PURE__ */ jsxs2("div", { className: "grid gap-10 xl:grid-cols-[1.2fr_0.8fr]", children: [
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
  ] }) }) });
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
var TYPE_COLORS, RISK_COLORS;
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
    setDragActive: () => {
    },
    selectFile: () => true,
    clearSelectedFile: () => {
    },
    beginProcessing: async () => {
    },
    loadGraph: async () => {
    },
    resetUploadState: () => {
    },
    ...overrides
  };
}

// tests/pages.test.tsx
import { jsx as jsx9 } from "react/jsx-runtime";
installRuntimeWindowConfig();
var { AppContext: AppContext2 } = await Promise.resolve().then(() => (init_AppContext(), AppContext_exports));
var { default: LandingPage2 } = await Promise.resolve().then(() => (init_LandingPage(), LandingPage_exports));
var { default: ProcessingPage2 } = await Promise.resolve().then(() => (init_ProcessingPage(), ProcessingPage_exports));
var { default: SystemOverview2 } = await Promise.resolve().then(() => (init_SystemOverview(), SystemOverview_exports));
function renderWithContext(element, contextOverrides = {}, initialEntries = ["/"]) {
  return renderToStaticMarkup(
    /* @__PURE__ */ jsx9(MemoryRouter, { initialEntries, children: /* @__PURE__ */ jsx9(AppContext2.Provider, { value: createMockContext(contextOverrides), children: element }) })
  );
}
test("landing page renders the upload workspace content", () => {
  const html = renderWithContext(/* @__PURE__ */ jsx9(LandingPage2, {}));
  assert.match(html, /TwinGraphOps/);
  assert.match(html, /Upload System Documentation/);
  assert.match(html, /Supported formats: \.md and \.txt/);
});
test("processing page renders the active processing state", () => {
  const html = renderWithContext(
    /* @__PURE__ */ jsx9(ProcessingPage2, {}),
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
  const html = renderToStaticMarkup(/* @__PURE__ */ jsx9(SystemOverview2, { graphData }));
  assert.match(html, /System Overview/);
  assert.match(html, /Total Components/);
  assert.match(html, /Relationships/);
  assert.match(html, /Most Connected Components/);
  assert.match(html, /API Service/);
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2xpYi9hZGFwdGVycy50cyIsICIuLi9zcmMvbGliL2NvbmZpZy50cyIsICIuLi9zcmMvbGliL2FwaS50cyIsICIuLi9zcmMvc3RhdGUvQXBwQ29udGV4dC50c3giLCAiLi4vc3JjL2xpYi9jbi50cyIsICIuLi9zcmMvY29tcG9uZW50cy91aS9CdXR0b24udHN4IiwgIi4uL3NyYy9jb21wb25lbnRzL3VpL0JhZGdlLnRzeCIsICIuLi9zcmMvY29tcG9uZW50cy9TdGF0dXNCYW5uZXIudHN4IiwgIi4uL3NyYy9wYWdlcy9MYW5kaW5nUGFnZS50c3giLCAiLi4vc3JjL2NvbXBvbmVudHMvUHJvY2Vzc2luZ0FjdGl2aXR5UGFuZWwudHN4IiwgIi4uL3NyYy9wYWdlcy9Qcm9jZXNzaW5nUGFnZS50c3giLCAiLi4vc3JjL2xpYi9zZWxlY3RvcnMudHMiLCAiLi4vc3JjL2NvbXBvbmVudHMvU3lzdGVtT3ZlcnZpZXcudHN4IiwgIi4uL3Rlc3RzL3BhZ2VzLnRlc3QudHN4IiwgIi4uL3Rlc3RzL3Rlc3QtdXRpbHMudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgdHlwZSB7IEFwaUdyYXBoRGF0YSwgQXBpR3JhcGhFZGdlLCBBcGlHcmFwaE5vZGUsIEltcGFjdFJlc3BvbnNlLCBSaXNrUmVzcG9uc2UgfSBmcm9tICcuLi90eXBlcy9hcGknO1xyXG5pbXBvcnQgdHlwZSB7IEdyYXBoRGF0YSwgR3JhcGhFZGdlLCBHcmFwaE5vZGUsIE5vZGVEZXRhaWxzLCBOb2RlUmVmZXJlbmNlIH0gZnJvbSAnLi4vdHlwZXMvYXBwJztcclxuXHJcbmZ1bmN0aW9uIGVuc3VyZVN0cmluZyh2YWx1ZTogdW5rbm93biwgbGFiZWw6IHN0cmluZykge1xyXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1hbGZvcm1lZCBBUEkgcmVzcG9uc2U6IGV4cGVjdGVkICR7bGFiZWx9IHRvIGJlIGEgc3RyaW5nLmApO1xyXG4gIH1cclxuICByZXR1cm4gdmFsdWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVuc3VyZU51bWJlcih2YWx1ZTogdW5rbm93biwgbGFiZWw6IHN0cmluZykge1xyXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInIHx8IE51bWJlci5pc05hTih2YWx1ZSkpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgTWFsZm9ybWVkIEFQSSByZXNwb25zZTogZXhwZWN0ZWQgJHtsYWJlbH0gdG8gYmUgYSBudW1iZXIuYCk7XHJcbiAgfVxyXG4gIHJldHVybiB2YWx1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZW5zdXJlQXJyYXk8VD4odmFsdWU6IHVua25vd24sIGxhYmVsOiBzdHJpbmcpIHtcclxuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1hbGZvcm1lZCBBUEkgcmVzcG9uc2U6IGV4cGVjdGVkICR7bGFiZWx9IHRvIGJlIGFuIGFycmF5LmApO1xyXG4gIH1cclxuICByZXR1cm4gdmFsdWUgYXMgVFtdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBub3JtYWxpemVOb2RlKG5vZGU6IEFwaUdyYXBoTm9kZSwgZGVwZW5kZW5jeU1hcDogTWFwPHN0cmluZywgc3RyaW5nW10+LCBkZXBlbmRlbnRNYXA6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPik6IEdyYXBoTm9kZSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIGlkOiBlbnN1cmVTdHJpbmcobm9kZS5pZCwgJ25vZGUuaWQnKSxcclxuICAgIG5hbWU6IGVuc3VyZVN0cmluZyhub2RlLm5hbWUsICdub2RlLm5hbWUnKSxcclxuICAgIHR5cGU6IGVuc3VyZVN0cmluZyhub2RlLnR5cGUsICdub2RlLnR5cGUnKSxcclxuICAgIGRlc2NyaXB0aW9uOiBlbnN1cmVTdHJpbmcobm9kZS5kZXNjcmlwdGlvbiwgJ25vZGUuZGVzY3JpcHRpb24nKSxcclxuICAgIHJpc2tTY29yZTogZW5zdXJlTnVtYmVyKG5vZGUucmlza19zY29yZSwgJ25vZGUucmlza19zY29yZScpLFxyXG4gICAgcmlza0xldmVsOiBlbnN1cmVTdHJpbmcobm9kZS5yaXNrX2xldmVsLCAnbm9kZS5yaXNrX2xldmVsJyksXHJcbiAgICBkZWdyZWU6IGVuc3VyZU51bWJlcihub2RlLmRlZ3JlZSwgJ25vZGUuZGVncmVlJyksXHJcbiAgICBiZXR3ZWVubmVzczogZW5zdXJlTnVtYmVyKG5vZGUuYmV0d2Vlbm5lc3MsICdub2RlLmJldHdlZW5uZXNzJyksXHJcbiAgICBjbG9zZW5lc3M6IGVuc3VyZU51bWJlcihub2RlLmNsb3NlbmVzcywgJ25vZGUuY2xvc2VuZXNzJyksXHJcbiAgICBibGFzdFJhZGl1czogZW5zdXJlTnVtYmVyKG5vZGUuYmxhc3RfcmFkaXVzLCAnbm9kZS5ibGFzdF9yYWRpdXMnKSxcclxuICAgIGRlcGVuZGVuY3lTcGFuOiBlbnN1cmVOdW1iZXIobm9kZS5kZXBlbmRlbmN5X3NwYW4sICdub2RlLmRlcGVuZGVuY3lfc3BhbicpLFxyXG4gICAgcmlza0V4cGxhbmF0aW9uOiBlbnN1cmVTdHJpbmcobm9kZS5yaXNrX2V4cGxhbmF0aW9uLCAnbm9kZS5yaXNrX2V4cGxhbmF0aW9uJyksXHJcbiAgICBzb3VyY2U6IGVuc3VyZVN0cmluZyhub2RlLnNvdXJjZSwgJ25vZGUuc291cmNlJyksXHJcbiAgICBkZXBlbmRlbmNpZXM6IGRlcGVuZGVuY3lNYXAuZ2V0KG5vZGUuaWQpID8/IFtdLFxyXG4gICAgZGVwZW5kZW50czogZGVwZW5kZW50TWFwLmdldChub2RlLmlkKSA/PyBbXSxcclxuICAgIHZhbDogMTggKyBNYXRoLnJvdW5kKChub2RlLnJpc2tfc2NvcmUgLyAxMDApICogMjIpLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5vcm1hbGl6ZUVkZ2UoZWRnZTogQXBpR3JhcGhFZGdlLCBpbmRleDogbnVtYmVyKTogR3JhcGhFZGdlIHtcclxuICByZXR1cm4ge1xyXG4gICAgaWQ6IGAke2Vuc3VyZVN0cmluZyhlZGdlLnNvdXJjZSwgJ2VkZ2Uuc291cmNlJyl9LSR7ZW5zdXJlU3RyaW5nKGVkZ2UudGFyZ2V0LCAnZWRnZS50YXJnZXQnKX0tJHtpbmRleH1gLFxyXG4gICAgc291cmNlOiBlZGdlLnNvdXJjZSxcclxuICAgIHRhcmdldDogZWRnZS50YXJnZXQsXHJcbiAgICByZWxhdGlvbjogZW5zdXJlU3RyaW5nKGVkZ2UucmVsYXRpb24sICdlZGdlLnJlbGF0aW9uJyksXHJcbiAgICByYXRpb25hbGU6IGVuc3VyZVN0cmluZyhlZGdlLnJhdGlvbmFsZSwgJ2VkZ2UucmF0aW9uYWxlJyksXHJcbiAgfTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0R3JhcGgoYXBpR3JhcGg6IEFwaUdyYXBoRGF0YSk6IEdyYXBoRGF0YSB7XHJcbiAgY29uc3Qgc291cmNlID0gZW5zdXJlU3RyaW5nKGFwaUdyYXBoLnNvdXJjZSwgJ2dyYXBoLnNvdXJjZScpO1xyXG4gIGNvbnN0IGFwaU5vZGVzID0gZW5zdXJlQXJyYXk8QXBpR3JhcGhOb2RlPihhcGlHcmFwaC5ub2RlcywgJ2dyYXBoLm5vZGVzJyk7XHJcbiAgY29uc3QgYXBpRWRnZXMgPSBlbnN1cmVBcnJheTxBcGlHcmFwaEVkZ2U+KGFwaUdyYXBoLmVkZ2VzLCAnZ3JhcGguZWRnZXMnKTtcclxuXHJcbiAgY29uc3QgZGVwZW5kZW5jeU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcclxuICBjb25zdCBkZXBlbmRlbnRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XHJcblxyXG4gIGZvciAoY29uc3QgZWRnZSBvZiBhcGlFZGdlcykge1xyXG4gICAgY29uc3Qgc291cmNlSWQgPSBlbnN1cmVTdHJpbmcoZWRnZS5zb3VyY2UsICdlZGdlLnNvdXJjZScpO1xyXG4gICAgY29uc3QgdGFyZ2V0SWQgPSBlbnN1cmVTdHJpbmcoZWRnZS50YXJnZXQsICdlZGdlLnRhcmdldCcpO1xyXG4gICAgZGVwZW5kZW5jeU1hcC5zZXQoc291cmNlSWQsIFsuLi4oZGVwZW5kZW5jeU1hcC5nZXQoc291cmNlSWQpID8/IFtdKSwgdGFyZ2V0SWRdKTtcclxuICAgIGRlcGVuZGVudE1hcC5zZXQodGFyZ2V0SWQsIFsuLi4oZGVwZW5kZW50TWFwLmdldCh0YXJnZXRJZCkgPz8gW10pLCBzb3VyY2VJZF0pO1xyXG4gIH1cclxuXHJcbiAgY29uc3Qgbm9kZXMgPSBhcGlOb2Rlcy5tYXAoKG5vZGUpID0+IG5vcm1hbGl6ZU5vZGUobm9kZSwgZGVwZW5kZW5jeU1hcCwgZGVwZW5kZW50TWFwKSk7XHJcbiAgY29uc3QgbGlua3MgPSBhcGlFZGdlcy5tYXAoKGVkZ2UsIGluZGV4KSA9PiBub3JtYWxpemVFZGdlKGVkZ2UsIGluZGV4KSk7XHJcbiAgY29uc3Qgbm9kZUluZGV4ID0gT2JqZWN0LmZyb21FbnRyaWVzKG5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUuaWQsIG5vZGVdKSk7XHJcbiAgY29uc3QgcmVsYXRpb25UeXBlcyA9IFsuLi5uZXcgU2V0KGxpbmtzLm1hcCgoZWRnZSkgPT4gZWRnZS5yZWxhdGlvbikpXS5zb3J0KCk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBzb3VyY2UsXHJcbiAgICBub2RlcyxcclxuICAgIGxpbmtzLFxyXG4gICAgbm9kZUluZGV4LFxyXG4gICAgcmVsYXRpb25UeXBlcyxcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiB0b05vZGVSZWZlcmVuY2Uobm9kZT86IEdyYXBoTm9kZSB8IG51bGwpOiBOb2RlUmVmZXJlbmNlIHwgbnVsbCB7XHJcbiAgaWYgKCFub2RlKSB7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBpZDogbm9kZS5pZCxcclxuICAgIG5hbWU6IG5vZGUubmFtZSxcclxuICAgIHR5cGU6IG5vZGUudHlwZSxcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JtYXRNZXRyaWModmFsdWU6IG51bWJlcikge1xyXG4gIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKHZhbHVlKSA/IFN0cmluZyh2YWx1ZSkgOiB2YWx1ZS50b0ZpeGVkKDMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYWRhcHROb2RlRGV0YWlscyhcclxuICBncmFwaDogR3JhcGhEYXRhLFxyXG4gIGNvbXBvbmVudElkOiBzdHJpbmcsXHJcbiAgcmlzazogUmlza1Jlc3BvbnNlLFxyXG4gIGltcGFjdDogSW1wYWN0UmVzcG9uc2VcclxuKTogTm9kZURldGFpbHMge1xyXG4gIGNvbnN0IG5vZGUgPSBncmFwaC5ub2RlSW5kZXhbY29tcG9uZW50SWRdO1xyXG4gIGlmICghbm9kZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb21wb25lbnQgJyR7Y29tcG9uZW50SWR9JyBpcyBtaXNzaW5nIGZyb20gdGhlIGFjdGl2ZSBncmFwaC5gKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGRlcGVuZGVuY2llcyA9IG5vZGUuZGVwZW5kZW5jaWVzXHJcbiAgICAubWFwKChkZXBlbmRlbmN5SWQpID0+IHRvTm9kZVJlZmVyZW5jZShncmFwaC5ub2RlSW5kZXhbZGVwZW5kZW5jeUlkXSkpXHJcbiAgICAuZmlsdGVyKChjYW5kaWRhdGUpOiBjYW5kaWRhdGUgaXMgTm9kZVJlZmVyZW5jZSA9PiBCb29sZWFuKGNhbmRpZGF0ZSkpO1xyXG5cclxuICBjb25zdCBhZmZlY3RlZFN5c3RlbXMgPSBpbXBhY3QuaW1wYWN0ZWRfY29tcG9uZW50c1xyXG4gICAgLm1hcCgoYWZmZWN0ZWRJZCkgPT4gdG9Ob2RlUmVmZXJlbmNlKGdyYXBoLm5vZGVJbmRleFthZmZlY3RlZElkXSkgPz8geyBpZDogYWZmZWN0ZWRJZCwgbmFtZTogYWZmZWN0ZWRJZCwgdHlwZTogJ3Vua25vd24nIH0pXHJcbiAgICAuZmlsdGVyKChjYW5kaWRhdGUpOiBjYW5kaWRhdGUgaXMgTm9kZVJlZmVyZW5jZSA9PiBCb29sZWFuKGNhbmRpZGF0ZSkpO1xyXG5cclxuICBjb25zdCByZWxhdGVkUmF0aW9uYWxlcyA9IGdyYXBoLmxpbmtzXHJcbiAgICAuZmlsdGVyKChsaW5rKSA9PiBsaW5rLnNvdXJjZSA9PT0gY29tcG9uZW50SWQgfHwgbGluay50YXJnZXQgPT09IGNvbXBvbmVudElkKVxyXG4gICAgLm1hcCgobGluaykgPT4gbGluay5yYXRpb25hbGUpXHJcbiAgICAuZmlsdGVyKChyYXRpb25hbGUpID0+IHJhdGlvbmFsZS50cmltKCkubGVuZ3RoID4gMCk7XHJcblxyXG4gIGNvbnN0IGlzc3VlcyA9IFtyaXNrLmV4cGxhbmF0aW9uLCAuLi5yZWxhdGVkUmF0aW9uYWxlc10uZmlsdGVyKFxyXG4gICAgKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik6IHZhbHVlIGlzIHN0cmluZyA9PiB2YWx1ZS50cmltKCkubGVuZ3RoID4gMCAmJiBjb2xsZWN0aW9uLmluZGV4T2YodmFsdWUpID09PSBpbmRleFxyXG4gICk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBjb21wb25lbnRJZDogbm9kZS5pZCxcclxuICAgIG5hbWU6IG5vZGUubmFtZSxcclxuICAgIHR5cGU6IG5vZGUudHlwZSxcclxuICAgIHJpc2tTY29yZTogcmlzay5zY29yZSxcclxuICAgIHJpc2tMZXZlbDogcmlzay5sZXZlbCxcclxuICAgIGRlc2NyaXB0aW9uOiBub2RlLmRlc2NyaXB0aW9uLFxyXG4gICAgZGVwZW5kZW5jaWVzLFxyXG4gICAgYWZmZWN0ZWRTeXN0ZW1zLFxyXG4gICAgaXNzdWVzLFxyXG4gICAgZXhwbGFuYXRpb246IHJpc2suZXhwbGFuYXRpb24sXHJcbiAgICBpbXBhY3RDb3VudDogaW1wYWN0LmltcGFjdF9jb3VudCxcclxuICAgIG1ldGFkYXRhOiBbXHJcbiAgICAgIHsgbGFiZWw6ICdEZWdyZWUnLCB2YWx1ZTogZm9ybWF0TWV0cmljKG5vZGUuZGVncmVlKSB9LFxyXG4gICAgICB7IGxhYmVsOiAnQmV0d2Vlbm5lc3MnLCB2YWx1ZTogZm9ybWF0TWV0cmljKG5vZGUuYmV0d2Vlbm5lc3MpIH0sXHJcbiAgICAgIHsgbGFiZWw6ICdDbG9zZW5lc3MnLCB2YWx1ZTogZm9ybWF0TWV0cmljKG5vZGUuY2xvc2VuZXNzKSB9LFxyXG4gICAgICB7IGxhYmVsOiAnQmxhc3QgUmFkaXVzJywgdmFsdWU6IFN0cmluZyhub2RlLmJsYXN0UmFkaXVzKSB9LFxyXG4gICAgICB7IGxhYmVsOiAnRGVwZW5kZW5jeSBTcGFuJywgdmFsdWU6IFN0cmluZyhub2RlLmRlcGVuZGVuY3lTcGFuKSB9LFxyXG4gICAgICB7IGxhYmVsOiAnU291cmNlJywgdmFsdWU6IG5vZGUuc291cmNlIH0sXHJcbiAgICBdLFxyXG4gIH07XHJcbn1cclxuIiwgImNvbnN0IHJ1bnRpbWVDb25maWcgPSB3aW5kb3cuX19UV0lOX0NPTkZJR19fID8/IHt9O1xyXG5cclxuZnVuY3Rpb24gcmVhZE51bWJlcih2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgdW5kZWZpbmVkLCBmYWxsYmFjazogbnVtYmVyKSB7XHJcbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHZhbHVlKTtcclxuICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgJiYgcGFyc2VkID4gMCA/IHBhcnNlZCA6IGZhbGxiYWNrO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgYXBwQ29uZmlnID0ge1xyXG4gIGFwaUJhc2VVcmw6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxyXG4gIG1heFVwbG9hZEJ5dGVzOlxyXG4gICAgcmVhZE51bWJlcihydW50aW1lQ29uZmlnLk1BWF9VUExPQURfTUIgfHwgaW1wb3J0Lm1ldGEuZW52LlZJVEVfTUFYX1VQTE9BRF9NQiwgMTApICogMTAyNCAqIDEwMjQsXHJcbiAgcHJvY2Vzc2luZ1RpbWVvdXRNczogcmVhZE51bWJlcihcclxuICAgIHJ1bnRpbWVDb25maWcuUFJPQ0VTU0lOR19USU1FT1VUX01TIHx8IGltcG9ydC5tZXRhLmVudi5WSVRFX1BST0NFU1NJTkdfVElNRU9VVF9NUyxcclxuICAgIDMwMDAwMFxyXG4gICksXHJcbiAgZW52aXJvbm1lbnQ6IHJ1bnRpbWVDb25maWcuQVBQX0VOViB8fCAnbG9jYWwnLFxyXG59O1xyXG4iLCAiaW1wb3J0IHsgYXBwQ29uZmlnIH0gZnJvbSAnLi9jb25maWcnO1xyXG5pbXBvcnQgdHlwZSB7XHJcbiAgQXBpR3JhcGhEYXRhLFxyXG4gIEFwaVBheWxvYWQsXHJcbiAgSW1wYWN0UmVzcG9uc2UsXHJcbiAgSW5nZXN0UmVzcG9uc2UsXHJcbiAgUHJvY2Vzc2luZ1N0YXR1cyxcclxuICBSaXNrUmVzcG9uc2UsXHJcbn0gZnJvbSAnLi4vdHlwZXMvYXBpJztcclxuXHJcbmV4cG9ydCBjbGFzcyBBcGlDbGllbnRFcnJvciBleHRlbmRzIEVycm9yIHtcclxuICBjb2RlPzogc3RyaW5nO1xyXG4gIHN0YXR1cz86IG51bWJlcjtcclxuICBkZXRhaWxzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcbiAgcmV0cnlhYmxlOiBib29sZWFuO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIG1lc3NhZ2U6IHN0cmluZyxcclxuICAgIG9wdGlvbnM6IHtcclxuICAgICAgY29kZT86IHN0cmluZztcclxuICAgICAgc3RhdHVzPzogbnVtYmVyO1xyXG4gICAgICBkZXRhaWxzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcbiAgICAgIHJldHJ5YWJsZT86IGJvb2xlYW47XHJcbiAgICB9ID0ge31cclxuICApIHtcclxuICAgIHN1cGVyKG1lc3NhZ2UpO1xyXG4gICAgdGhpcy5uYW1lID0gJ0FwaUNsaWVudEVycm9yJztcclxuICAgIHRoaXMuY29kZSA9IG9wdGlvbnMuY29kZTtcclxuICAgIHRoaXMuc3RhdHVzID0gb3B0aW9ucy5zdGF0dXM7XHJcbiAgICB0aGlzLmRldGFpbHMgPSBvcHRpb25zLmRldGFpbHM7XHJcbiAgICB0aGlzLnJldHJ5YWJsZSA9IG9wdGlvbnMucmV0cnlhYmxlID8/IGZhbHNlO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFVuc3VwcG9ydGVkRW5kcG9pbnRFcnJvciBleHRlbmRzIEVycm9yIHtcclxuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcpIHtcclxuICAgIHN1cGVyKG1lc3NhZ2UpO1xyXG4gICAgdGhpcy5uYW1lID0gJ1Vuc3VwcG9ydGVkRW5kcG9pbnRFcnJvcic7XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBwYXJzZUpzb25TYWZlbHkocmVzcG9uc2U6IFJlc3BvbnNlKSB7XHJcbiAgY29uc3QgdGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuICBjb25zb2xlLmxvZygnQkFDS0VORCBSRVNQT05TRTonLCB0ZXh0KTtcclxuXHJcbiAgaWYgKCF0ZXh0KSB7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIHRyeSB7XHJcbiAgICByZXR1cm4gSlNPTi5wYXJzZSh0ZXh0KSBhcyBBcGlQYXlsb2FkPHVua25vd24+O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdQQVJTRSBFUlJPUjonLCBlcnJvcik7XHJcbiAgICBjb25zb2xlLmVycm9yKCdSQVcgUkVTUE9OU0UgVEVYVDonLCB0ZXh0KTtcclxuICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcignVGhlIEFQSSByZXR1cm5lZCBtYWxmb3JtZWQgSlNPTi4nLCB7XHJcbiAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxyXG4gICAgICByZXRyeWFibGU6IGZhbHNlLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiByZXF1ZXN0PFQ+KHBhdGg6IHN0cmluZywgaW5pdDogUmVxdWVzdEluaXQgPSB7fSwgdGltZW91dE1zID0gMzAwMDApOiBQcm9taXNlPFQ+IHtcclxuICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xyXG4gIGNvbnN0IHRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIHRpbWVvdXRNcyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAvYXBpJHtwYXRofWAsIHtcclxuICAgICAgLi4uaW5pdCxcclxuICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCxcclxuICAgIH0pO1xyXG4gICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IHBhcnNlSnNvblNhZmVseShyZXNwb25zZSk7XHJcblxyXG4gICAgaWYgKCFwYXlsb2FkIHx8IHR5cGVvZiBwYXlsb2FkICE9PSAnb2JqZWN0Jykge1xyXG4gICAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoJ1RoZSBBUEkgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuJywge1xyXG4gICAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxyXG4gICAgICAgIHJldHJ5YWJsZTogZmFsc2UsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghcmVzcG9uc2Uub2sgfHwgcGF5bG9hZC5zdGF0dXMgIT09ICdvaycpIHtcclxuICAgICAgY29uc3QgZXJyb3JQYXlsb2FkID0gcGF5bG9hZCBhcyBFeGNsdWRlPEFwaVBheWxvYWQ8VD4sIHsgc3RhdHVzOiAnb2snIH0+O1xyXG4gICAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoZXJyb3JQYXlsb2FkLmVycm9yPy5tZXNzYWdlIHx8ICdUaGUgcmVxdWVzdCBmYWlsZWQuJywge1xyXG4gICAgICAgIGNvZGU6IGVycm9yUGF5bG9hZC5lcnJvcj8uY29kZSxcclxuICAgICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcclxuICAgICAgICBkZXRhaWxzOiBlcnJvclBheWxvYWQuZXJyb3I/LmRldGFpbHMsXHJcbiAgICAgICAgcmV0cnlhYmxlOiByZXNwb25zZS5zdGF0dXMgPj0gNTAwIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gMCxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHBheWxvYWQuZGF0YSBhcyBUO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlDbGllbnRFcnJvcikge1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyb3IubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSB7XHJcbiAgICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcignUHJvY2Vzc2luZyB0aW1lZCBvdXQgYmVmb3JlIHRoZSBiYWNrZW5kIGNvbXBsZXRlZCB0aGUgZ3JhcGggYnVpbGQuJywge1xyXG4gICAgICAgIGNvZGU6ICdyZXF1ZXN0X3RpbWVvdXQnLFxyXG4gICAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdOZXR3b3JrIGZhaWx1cmUgd2hpbGUgY29udGFjdGluZyB0aGUgVHdpbkdyYXBoT3BzIEFQSS4nLCB7XHJcbiAgICAgIGNvZGU6ICduZXR3b3JrX2Vycm9yJyxcclxuICAgICAgcmV0cnlhYmxlOiB0cnVlLFxyXG4gICAgfSk7XHJcbiAgfSBmaW5hbGx5IHtcclxuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZW91dCk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBsb2FkRG9jdW1lbnQoXHJcbiAgZmlsZTogRmlsZSxcclxuICByZXBsYWNlRXhpc3RpbmcgPSB0cnVlLFxyXG4gIHRpbWVvdXRNcyA9IGFwcENvbmZpZy5wcm9jZXNzaW5nVGltZW91dE1zLFxyXG4gIGluZ2VzdGlvbklkPzogc3RyaW5nXHJcbikge1xyXG4gIGNvbnN0IGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKCk7XHJcbiAgZm9ybURhdGEuYXBwZW5kKCdmaWxlJywgZmlsZSk7XHJcbiAgZm9ybURhdGEuYXBwZW5kKCdyZXBsYWNlX2V4aXN0aW5nJywgU3RyaW5nKHJlcGxhY2VFeGlzdGluZykpO1xyXG4gIGlmIChpbmdlc3Rpb25JZCkge1xyXG4gICAgZm9ybURhdGEuYXBwZW5kKCdpbmdlc3Rpb25faWQnLCBpbmdlc3Rpb25JZCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVxdWVzdDxJbmdlc3RSZXNwb25zZT4oXHJcbiAgICAnL2luZ2VzdCcsXHJcbiAgICB7XHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICBib2R5OiBmb3JtRGF0YSxcclxuICAgIH0sXHJcbiAgICB0aW1lb3V0TXNcclxuICApO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0R3JhcGgoKSB7XHJcbiAgcmV0dXJuIHJlcXVlc3Q8QXBpR3JhcGhEYXRhPignL2dyYXBoJyk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRSaXNrKGNvbXBvbmVudElkOiBzdHJpbmcpIHtcclxuICByZXR1cm4gcmVxdWVzdDxSaXNrUmVzcG9uc2U+KGAvcmlzaz9jb21wb25lbnRfaWQ9JHtlbmNvZGVVUklDb21wb25lbnQoY29tcG9uZW50SWQpfWApO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0SW1wYWN0KGNvbXBvbmVudElkOiBzdHJpbmcpIHtcclxuICByZXR1cm4gcmVxdWVzdDxJbXBhY3RSZXNwb25zZT4oYC9pbXBhY3Q/Y29tcG9uZW50X2lkPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGNvbXBvbmVudElkKX1gKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlZWREZW1vR3JhcGgoKSB7XHJcbiAgcmV0dXJuIHJlcXVlc3Q8eyBzb3VyY2U6IHN0cmluZzsgbm9kZXNfY3JlYXRlZDogbnVtYmVyOyBlZGdlc19jcmVhdGVkOiBudW1iZXI7IHJpc2tfbm9kZXNfc2NvcmVkOiBudW1iZXIgfT4oXHJcbiAgICAnL3NlZWQnLFxyXG4gICAgeyBtZXRob2Q6ICdQT1NUJyB9XHJcbiAgKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQ6IHN0cmluZykge1xyXG4gIHJldHVybiByZXF1ZXN0PFByb2Nlc3NpbmdTdGF0dXM+KGAvaW5nZXN0LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGluZ2VzdGlvbklkKX0vZXZlbnRzYCk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRSaXNrUmFua2VkSXRlbXMoKTogUHJvbWlzZTxuZXZlcj4ge1xyXG4gIC8vIFRPRE86IHJlcGxhY2UgY2xpZW50LXNpZGUgcmlzayByYW5raW5nIHdoZW4gdGhlIGJhY2tlbmQgZXhwb3NlcyBhIGRlZGljYXRlZCByaXNrIGxpc3QgZW5kcG9pbnQuXHJcbiAgdGhyb3cgbmV3IFVuc3VwcG9ydGVkRW5kcG9pbnRFcnJvcignVGhlIGN1cnJlbnQgYmFja2VuZCBjb250cmFjdCBkb2VzIG5vdCBleHBvc2UgYSByYW5rZWQgcmlzayBsaXN0IGVuZHBvaW50LicpO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXJjaGl0ZWN0dXJlU3VtbWFyeSgpOiBQcm9taXNlPG5ldmVyPiB7XHJcbiAgLy8gVE9ETzogcmVwbGFjZSBjbGllbnQtc2lkZSBzdW1tYXJ5IGRlcml2YXRpb24gd2hlbiB0aGUgYmFja2VuZCBleHBvc2VzIGEgZGVkaWNhdGVkIHN1bW1hcnkgZW5kcG9pbnQuXHJcbiAgdGhyb3cgbmV3IFVuc3VwcG9ydGVkRW5kcG9pbnRFcnJvcignVGhlIGN1cnJlbnQgYmFja2VuZCBjb250cmFjdCBkb2VzIG5vdCBleHBvc2UgYW4gYXJjaGl0ZWN0dXJlIHN1bW1hcnkgZW5kcG9pbnQuJyk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUNvbnRleHQsIHVzZUNhbGxiYWNrLCB1c2VDb250ZXh0LCB1c2VNZW1vLCB1c2VSZWYsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xyXG5pbXBvcnQgdHlwZSB7IFJlYWN0Tm9kZSB9IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IHsgYWRhcHRHcmFwaCB9IGZyb20gJy4uL2xpYi9hZGFwdGVycyc7XHJcbmltcG9ydCB7IEFwaUNsaWVudEVycm9yLCBnZXRHcmFwaCwgZ2V0UHJvY2Vzc2luZ1N0YXR1cywgdXBsb2FkRG9jdW1lbnQgfSBmcm9tICcuLi9saWIvYXBpJztcclxuaW1wb3J0IHsgYXBwQ29uZmlnIH0gZnJvbSAnLi4vbGliL2NvbmZpZyc7XHJcbmltcG9ydCB0eXBlIHsgR3JhcGhTdGF0ZSwgVXBsb2FkU3RhdGUgfSBmcm9tICcuLi90eXBlcy9hcHAnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBcHBDb250ZXh0VmFsdWUge1xyXG4gIHVwbG9hZDogVXBsb2FkU3RhdGU7XHJcbiAgZ3JhcGg6IEdyYXBoU3RhdGU7XHJcbiAgc2V0RHJhZ0FjdGl2ZTogKGFjdGl2ZTogYm9vbGVhbikgPT4gdm9pZDtcclxuICBzZWxlY3RGaWxlOiAoZmlsZTogRmlsZSB8IG51bGwpID0+IGJvb2xlYW47XHJcbiAgY2xlYXJTZWxlY3RlZEZpbGU6ICgpID0+IHZvaWQ7XHJcbiAgYmVnaW5Qcm9jZXNzaW5nOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG4gIGxvYWRHcmFwaDogKG9wdGlvbnM/OiB7IGtlZXBTdGF0dXM/OiBib29sZWFuIH0pID0+IFByb21pc2U8dm9pZD47XHJcbiAgcmVzZXRVcGxvYWRTdGF0ZTogKCkgPT4gdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IEFwcENvbnRleHQgPSBjcmVhdGVDb250ZXh0PEFwcENvbnRleHRWYWx1ZSB8IG51bGw+KG51bGwpO1xyXG5cclxuZXhwb3J0IGNvbnN0IGluaXRpYWxVcGxvYWRTdGF0ZTogVXBsb2FkU3RhdGUgPSB7XHJcbiAgcGhhc2U6ICdpZGxlJyxcclxuICBzZWxlY3RlZEZpbGU6IG51bGwsXHJcbiAgZXJyb3I6IG51bGwsXHJcbiAgc3RhdHVzTWVzc2FnZTogJ1VwbG9hZCBhIC5tZCBvciAudHh0IGZpbGUgdG8gYnVpbGQgdGhlIGdyYXBoLicsXHJcbiAgaW5nZXN0aW9uSWQ6IG51bGwsXHJcbiAgaW5nZXN0aW9uOiBudWxsLFxyXG4gIHByb2Nlc3NpbmdTdGF0dXM6IG51bGwsXHJcbiAgc3RhcnRlZEF0OiBudWxsLFxyXG4gIGNvbXBsZXRlZEF0OiBudWxsLFxyXG4gIHJldHJ5Q291bnQ6IDAsXHJcbn07XHJcblxyXG5jb25zdCBpbml0aWFsR3JhcGhTdGF0ZTogR3JhcGhTdGF0ZSA9IHtcclxuICBzdGF0dXM6ICdpZGxlJyxcclxuICBkYXRhOiBudWxsLFxyXG4gIGVycm9yOiBudWxsLFxyXG4gIGxhc3RMb2FkZWRBdDogbnVsbCxcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBzdXBwb3J0ZWRFeHRlbnNpb25zID0gWycubWQnLCAnLnR4dCddO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVFeHRlbnNpb24oZmlsZW5hbWU6IHN0cmluZykge1xyXG4gIGNvbnN0IHNlZ21lbnRzID0gZmlsZW5hbWUudG9Mb3dlckNhc2UoKS5zcGxpdCgnLicpO1xyXG4gIHJldHVybiBzZWdtZW50cy5sZW5ndGggPiAxID8gYC4ke3NlZ21lbnRzLnBvcCgpfWAgOiAnJztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlbGVjdGVkRmlsZVVwbG9hZFN0YXRlKGZpbGU6IEZpbGUpOiBVcGxvYWRTdGF0ZSB7XG4gIHJldHVybiB7XG4gICAgcGhhc2U6ICdmaWxlLXNlbGVjdGVkJyxcbiAgICBzZWxlY3RlZEZpbGU6IGZpbGUsXG4gICAgZXJyb3I6IG51bGwsXG4gICAgc3RhdHVzTWVzc2FnZTogYFJlYWR5IHRvIGFuYWx5emUgJHtmaWxlLm5hbWV9LmAsXG4gICAgaW5nZXN0aW9uSWQ6IG51bGwsXG4gICAgaW5nZXN0aW9uOiBudWxsLFxuICAgIHByb2Nlc3NpbmdTdGF0dXM6IG51bGwsXG4gICAgc3RhcnRlZEF0OiBudWxsLFxuICAgIGNvbXBsZXRlZEF0OiBudWxsLFxuICAgIHJldHJ5Q291bnQ6IDAsXG4gIH07XG59XG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVVwbG9hZEVycm9yU3RhdGUoZXJyb3I6IHN0cmluZywgc3RhdHVzTWVzc2FnZTogc3RyaW5nKTogVXBsb2FkU3RhdGUge1xyXG4gIHJldHVybiB7XHJcbiAgICAuLi5pbml0aWFsVXBsb2FkU3RhdGUsXHJcbiAgICBwaGFzZTogJ2Vycm9yJyxcclxuICAgIGVycm9yLFxyXG4gICAgc3RhdHVzTWVzc2FnZSxcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVTZWxlY3RlZEZpbGUoZmlsZTogRmlsZSB8IG51bGwsIG1heFVwbG9hZEJ5dGVzOiBudW1iZXIpOiBVcGxvYWRTdGF0ZSB7XHJcbiAgaWYgKCFmaWxlKSB7XHJcbiAgICByZXR1cm4gaW5pdGlhbFVwbG9hZFN0YXRlO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgZXh0ZW5zaW9uID0gZ2V0RmlsZUV4dGVuc2lvbihmaWxlLm5hbWUpO1xyXG4gIGlmICghc3VwcG9ydGVkRXh0ZW5zaW9ucy5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICByZXR1cm4gY3JlYXRlVXBsb2FkRXJyb3JTdGF0ZSgnT25seSAubWQgYW5kIC50eHQgZmlsZXMgYXJlIHN1cHBvcnRlZC4nLCAnVW5zdXBwb3J0ZWQgZmlsZSB0eXBlLicpO1xyXG4gIH1cclxuXHJcbiAgaWYgKGZpbGUuc2l6ZSA+IG1heFVwbG9hZEJ5dGVzKSB7XHJcbiAgICByZXR1cm4gY3JlYXRlVXBsb2FkRXJyb3JTdGF0ZShcclxuICAgICAgYEZpbGUgZXhjZWVkcyB0aGUgJHtNYXRoLnJvdW5kKG1heFVwbG9hZEJ5dGVzIC8gMTAyNCAvIDEwMjQpfSBNQiB1cGxvYWQgbGltaXQuYCxcclxuICAgICAgJ1NlbGVjdGVkIGZpbGUgaXMgdG9vIGxhcmdlLidcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gY3JlYXRlU2VsZWN0ZWRGaWxlVXBsb2FkU3RhdGUoZmlsZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRvRnJpZW5kbHlNZXNzYWdlKGVycm9yOiB1bmtub3duKSB7XHJcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXBpQ2xpZW50RXJyb3IpIHtcclxuICAgIHJldHVybiBlcnJvci5tZXNzYWdlO1xyXG4gIH1cclxuXHJcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgIHJldHVybiBlcnJvci5tZXNzYWdlO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuICdBbiB1bmV4cGVjdGVkIGZyb250ZW5kIGVycm9yIG9jY3VycmVkLic7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBBcHBQcm92aWRlcih7IGNoaWxkcmVuIH06IHsgY2hpbGRyZW46IFJlYWN0Tm9kZSB9KSB7XHJcbiAgY29uc3QgW3VwbG9hZCwgc2V0VXBsb2FkXSA9IHVzZVN0YXRlPFVwbG9hZFN0YXRlPihpbml0aWFsVXBsb2FkU3RhdGUpO1xyXG4gIGNvbnN0IFtncmFwaCwgc2V0R3JhcGhdID0gdXNlU3RhdGU8R3JhcGhTdGF0ZT4oaW5pdGlhbEdyYXBoU3RhdGUpO1xyXG4gIGNvbnN0IHByb2Nlc3NpbmdQcm9taXNlUmVmID0gdXNlUmVmPFByb21pc2U8dm9pZD4gfCBudWxsPihudWxsKTtcclxuXHJcbiAgY29uc3Qgc2V0RHJhZ0FjdGl2ZSA9IHVzZUNhbGxiYWNrKChhY3RpdmU6IGJvb2xlYW4pID0+IHtcclxuICAgIHNldFVwbG9hZCgoY3VycmVudCkgPT4ge1xyXG4gICAgICBpZiAoYWN0aXZlKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgLi4uY3VycmVudCwgcGhhc2U6ICdkcmFnLWhvdmVyJywgc3RhdHVzTWVzc2FnZTogJ0Ryb3AgdGhlIGZpbGUgdG8gcXVldWUgaXQgZm9yIGluZ2VzdGlvbi4nIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChjdXJyZW50LnNlbGVjdGVkRmlsZSkge1xyXG4gICAgICAgIHJldHVybiB7IC4uLmN1cnJlbnQsIHBoYXNlOiAnZmlsZS1zZWxlY3RlZCcsIHN0YXR1c01lc3NhZ2U6IGBSZWFkeSB0byBhbmFseXplICR7Y3VycmVudC5zZWxlY3RlZEZpbGUubmFtZX0uYCB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4geyAuLi5jdXJyZW50LCBwaGFzZTogJ2lkbGUnLCBzdGF0dXNNZXNzYWdlOiBpbml0aWFsVXBsb2FkU3RhdGUuc3RhdHVzTWVzc2FnZSB9O1xyXG4gICAgfSk7XHJcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHNlbGVjdEZpbGUgPSB1c2VDYWxsYmFjaygoZmlsZTogRmlsZSB8IG51bGwpID0+IHtcbiAgICBjb25zdCBuZXh0U3RhdGUgPSB2YWxpZGF0ZVNlbGVjdGVkRmlsZShmaWxlLCBhcHBDb25maWcubWF4VXBsb2FkQnl0ZXMpO1xuICAgIHNldFVwbG9hZChuZXh0U3RhdGUpO1xuICAgIHJldHVybiBuZXh0U3RhdGUucGhhc2UgPT09ICdmaWxlLXNlbGVjdGVkJztcbiAgfSwgW10pO1xuXHJcbiAgY29uc3QgY2xlYXJTZWxlY3RlZEZpbGUgPSB1c2VDYWxsYmFjaygoKSA9PiB7XHJcbiAgICBzZXRVcGxvYWQoaW5pdGlhbFVwbG9hZFN0YXRlKTtcclxuICB9LCBbXSk7XHJcblxyXG4gIGNvbnN0IGxvYWRHcmFwaCA9IHVzZUNhbGxiYWNrKGFzeW5jIChvcHRpb25zPzogeyBrZWVwU3RhdHVzPzogYm9vbGVhbiB9KSA9PiB7XHJcbiAgICBzZXRHcmFwaCgoY3VycmVudCkgPT4gKHtcclxuICAgICAgLi4uY3VycmVudCxcclxuICAgICAgc3RhdHVzOiAnbG9hZGluZycsXHJcbiAgICAgIGVycm9yOiBudWxsLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCBnZXRHcmFwaCgpO1xyXG4gICAgICBjb25zdCBhZGFwdGVkR3JhcGggPSBhZGFwdEdyYXBoKHBheWxvYWQpO1xyXG4gICAgICBzZXRHcmFwaCh7XHJcbiAgICAgICAgc3RhdHVzOiAncmVhZHknLFxyXG4gICAgICAgIGRhdGE6IGFkYXB0ZWRHcmFwaCxcclxuICAgICAgICBlcnJvcjogbnVsbCxcclxuICAgICAgICBsYXN0TG9hZGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgaWYgKCFvcHRpb25zPy5rZWVwU3RhdHVzKSB7XHJcbiAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PiB7XHJcbiAgICAgICAgICBpZiAoY3VycmVudC5waGFzZSA9PT0gJ3N1Y2Nlc3MnIHx8IGN1cnJlbnQucGhhc2UgPT09ICdlbXB0eS1ncmFwaCcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnQ7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgLi4uY3VycmVudCxcclxuICAgICAgICAgICAgcGhhc2U6IGFkYXB0ZWRHcmFwaC5ub2Rlcy5sZW5ndGggPT09IDAgPyAnZW1wdHktZ3JhcGgnIDogY3VycmVudC5waGFzZSxcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0b0ZyaWVuZGx5TWVzc2FnZShlcnJvcik7XHJcbiAgICAgIHNldEdyYXBoKHtcclxuICAgICAgICBzdGF0dXM6ICdlcnJvcicsXHJcbiAgICAgICAgZGF0YTogbnVsbCxcclxuICAgICAgICBlcnJvcjogbWVzc2FnZSxcclxuICAgICAgICBsYXN0TG9hZGVkQXQ6IG51bGwsXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9LCBbXSk7XHJcblxyXG4gIGNvbnN0IGJlZ2luUHJvY2Vzc2luZyA9IHVzZUNhbGxiYWNrKGFzeW5jICgpID0+IHtcclxuICAgIGlmICghdXBsb2FkLnNlbGVjdGVkRmlsZSkge1xyXG4gICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XHJcbiAgICAgICAgLi4uY3VycmVudCxcclxuICAgICAgICBwaGFzZTogJ2Vycm9yJyxcclxuICAgICAgICBlcnJvcjogJ0Nob29zZSBhIC5tZCBvciAudHh0IGZpbGUgYmVmb3JlIHByb2Nlc3NpbmcuJyxcclxuICAgICAgICBzdGF0dXNNZXNzYWdlOiAnTm8gZmlsZSBzZWxlY3RlZC4nLFxyXG4gICAgICB9KSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocHJvY2Vzc2luZ1Byb21pc2VSZWYuY3VycmVudCkge1xyXG4gICAgICByZXR1cm4gcHJvY2Vzc2luZ1Byb21pc2VSZWYuY3VycmVudDtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzZWxlY3RlZEZpbGUgPSB1cGxvYWQuc2VsZWN0ZWRGaWxlO1xyXG5cclxuICAgIGNvbnN0IHRhc2sgPSAoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBsZXQgcHJvY2Vzc2luZ1BoYXNlVGltZXIgPSAwO1xyXG4gICAgICBjb25zdCBpbmdlc3Rpb25JZCA9IGNyeXB0by5yYW5kb21VVUlEKCk7XHJcbiAgICAgIGxldCBrZWVwUG9sbGluZyA9IHRydWU7XHJcblxyXG4gICAgICBjb25zdCBwb2xsUHJvY2Vzc2luZyA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICB3aGlsZSAoa2VlcFBvbGxpbmcpIHtcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NpbmdTdGF0dXMgPSBhd2FpdCBnZXRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkKTtcclxuICAgICAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PlxyXG4gICAgICAgICAgICAgIGN1cnJlbnQuaW5nZXN0aW9uSWQgIT09IGluZ2VzdGlvbklkXHJcbiAgICAgICAgICAgICAgICA/IGN1cnJlbnRcclxuICAgICAgICAgICAgICAgIDoge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLmN1cnJlbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1cyxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBwcm9jZXNzaW5nU3RhdHVzLmxhdGVzdF9ldmVudCB8fCBjdXJyZW50LnN0YXR1c01lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAvLyBQb2xsaW5nIGlzIGJlc3QtZWZmb3J0IHNvIHRoZSBtYWluIHVwbG9hZCBmbG93IGNhbiBjb250aW51ZSBldmVuIGlmIHN0YXR1cyByZWZyZXNoIGZhaWxzLlxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmICgha2VlcFBvbGxpbmcpIHtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHdpbmRvdy5zZXRUaW1lb3V0KHJlc29sdmUsIDgwMCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PiAoe1xyXG4gICAgICAgICAgLi4uY3VycmVudCxcclxuICAgICAgICAgIHBoYXNlOiAndXBsb2FkaW5nJyxcclxuICAgICAgICAgIGVycm9yOiBudWxsLFxyXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZTogYFVwbG9hZGluZyAke3NlbGVjdGVkRmlsZS5uYW1lfS4uLmAsXHJcbiAgICAgICAgICBpbmdlc3Rpb25JZCxcclxuICAgICAgICAgIHN0YXJ0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgIGNvbXBsZXRlZEF0OiBudWxsLFxyXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czoge1xyXG4gICAgICAgICAgICBpbmdlc3Rpb25faWQ6IGluZ2VzdGlvbklkLFxyXG4gICAgICAgICAgICBzdGF0ZTogJ3BlbmRpbmcnLFxyXG4gICAgICAgICAgICBmaWxlbmFtZTogc2VsZWN0ZWRGaWxlLm5hbWUsXHJcbiAgICAgICAgICAgIGNodW5rc190b3RhbDogbnVsbCxcclxuICAgICAgICAgICAgY3VycmVudF9jaHVuazogbnVsbCxcclxuICAgICAgICAgICAgc3RhcnRlZF9hdDogbnVsbCxcclxuICAgICAgICAgICAgY29tcGxldGVkX2F0OiBudWxsLFxyXG4gICAgICAgICAgICBsYXRlc3RfZXZlbnQ6IGBVcGxvYWRpbmcgJHtzZWxlY3RlZEZpbGUubmFtZX0uLi5gLFxyXG4gICAgICAgICAgICBldmVudHM6IFtdLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIGNvbnN0IHBvbGxpbmdUYXNrID0gcG9sbFByb2Nlc3NpbmcoKTtcclxuXHJcbiAgICAgICAgcHJvY2Vzc2luZ1BoYXNlVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+XHJcbiAgICAgICAgICAgIGN1cnJlbnQucGhhc2UgPT09ICd1cGxvYWRpbmcnXHJcbiAgICAgICAgICAgICAgPyB7XHJcbiAgICAgICAgICAgICAgICAgIC4uLmN1cnJlbnQsXHJcbiAgICAgICAgICAgICAgICAgIHBoYXNlOiAncHJvY2Vzc2luZycsXHJcbiAgICAgICAgICAgICAgICAgIHN0YXR1c01lc3NhZ2U6ICdFeHRyYWN0aW5nIGNvbXBvbmVudHMsIHJlbGF0aW9uc2hpcHMsIGFuZCByaXNrIG1ldHJpY3MuLi4nLFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIDogY3VycmVudFxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9LCA5MDApO1xyXG5cclxuICAgICAgICBjb25zdCBpbmdlc3Rpb24gPSBhd2FpdCB1cGxvYWREb2N1bWVudChzZWxlY3RlZEZpbGUsIHRydWUsIGFwcENvbmZpZy5wcm9jZXNzaW5nVGltZW91dE1zLCBpbmdlc3Rpb25JZCk7XHJcbiAgICAgICAgY29uc3QgbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyA9IGF3YWl0IGdldFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQpLmNhdGNoKCgpID0+IG51bGwpO1xyXG5cclxuICAgICAgICBzZXRVcGxvYWQoKGN1cnJlbnQpID0+ICh7XHJcbiAgICAgICAgICAuLi5jdXJyZW50LFxyXG4gICAgICAgICAgaW5nZXN0aW9uLFxyXG4gICAgICAgICAgcGhhc2U6ICdwcm9jZXNzaW5nJyxcclxuICAgICAgICAgIHN0YXR1c01lc3NhZ2U6IGxhdGVzdFByb2Nlc3NpbmdTdGF0dXM/LmxhdGVzdF9ldmVudCB8fCAnTG9hZGluZyB0aGUgZ2VuZXJhdGVkIGdyYXBoIHdvcmtzcGFjZS4uLicsXHJcbiAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzOiBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzIHx8IGN1cnJlbnQucHJvY2Vzc2luZ1N0YXR1cyxcclxuICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGdyYXBoUGF5bG9hZCA9IGF3YWl0IGdldEdyYXBoKCk7XHJcbiAgICAgICAgY29uc3QgYWRhcHRlZEdyYXBoID0gYWRhcHRHcmFwaChncmFwaFBheWxvYWQpO1xyXG5cclxuICAgICAgICBzZXRHcmFwaCh7XHJcbiAgICAgICAgICBzdGF0dXM6ICdyZWFkeScsXHJcbiAgICAgICAgICBkYXRhOiBhZGFwdGVkR3JhcGgsXHJcbiAgICAgICAgICBlcnJvcjogbnVsbCxcclxuICAgICAgICAgIGxhc3RMb2FkZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PiAoe1xyXG4gICAgICAgICAgLi4uY3VycmVudCxcclxuICAgICAgICAgIGluZ2VzdGlvbixcclxuICAgICAgICAgIGluZ2VzdGlvbklkLFxyXG4gICAgICAgICAgcGhhc2U6IGFkYXB0ZWRHcmFwaC5ub2Rlcy5sZW5ndGggPT09IDAgPyAnZW1wdHktZ3JhcGgnIDogJ3N1Y2Nlc3MnLFxyXG4gICAgICAgICAgZXJyb3I6IG51bGwsXHJcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOlxyXG4gICAgICAgICAgICBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzPy5sYXRlc3RfZXZlbnQgfHxcclxuICAgICAgICAgICAgKGFkYXB0ZWRHcmFwaC5ub2Rlcy5sZW5ndGggPT09IDBcclxuICAgICAgICAgICAgICA/ICdQcm9jZXNzaW5nIGNvbXBsZXRlZCwgYnV0IHRoZSBhY3RpdmUgZ3JhcGggaXMgZW1wdHkuJ1xyXG4gICAgICAgICAgICAgIDogJ1R3aW5HcmFwaE9wcyBmaW5pc2hlZCBwcm9jZXNzaW5nIHlvdXIgZG9jdW1lbnQuJyksXHJcbiAgICAgICAgICBwcm9jZXNzaW5nU3RhdHVzOlxyXG4gICAgICAgICAgICBsYXRlc3RQcm9jZXNzaW5nU3RhdHVzID8/XHJcbiAgICAgICAgICAgIGN1cnJlbnQucHJvY2Vzc2luZ1N0YXR1cyxcclxuICAgICAgICAgIGNvbXBsZXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICBrZWVwUG9sbGluZyA9IGZhbHNlO1xyXG4gICAgICAgIGF3YWl0IHBvbGxpbmdUYXNrO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGtlZXBQb2xsaW5nID0gZmFsc2U7XHJcbiAgICAgICAgY29uc3QgbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyA9IGF3YWl0IGdldFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQpLmNhdGNoKCgpID0+IG51bGwpO1xyXG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0b0ZyaWVuZGx5TWVzc2FnZShlcnJvcik7XHJcbiAgICAgICAgc2V0VXBsb2FkKChjdXJyZW50KSA9PiAoe1xyXG4gICAgICAgICAgLi4uY3VycmVudCxcclxuICAgICAgICAgIHBoYXNlOiAncmV0cnknLFxyXG4gICAgICAgICAgZXJyb3I6IG1lc3NhZ2UsXHJcbiAgICAgICAgICBzdGF0dXNNZXNzYWdlOiBtZXNzYWdlLFxyXG4gICAgICAgICAgcHJvY2Vzc2luZ1N0YXR1czogbGF0ZXN0UHJvY2Vzc2luZ1N0YXR1cyB8fCBjdXJyZW50LnByb2Nlc3NpbmdTdGF0dXMsXHJcbiAgICAgICAgICBjb21wbGV0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgIHJldHJ5Q291bnQ6IGN1cnJlbnQucmV0cnlDb3VudCArIDEsXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIGtlZXBQb2xsaW5nID0gZmFsc2U7XHJcbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dChwcm9jZXNzaW5nUGhhc2VUaW1lcik7XHJcbiAgICAgICAgcHJvY2Vzc2luZ1Byb21pc2VSZWYuY3VycmVudCA9IG51bGw7XHJcbiAgICAgIH1cclxuICAgIH0pKCk7XHJcblxyXG4gICAgcHJvY2Vzc2luZ1Byb21pc2VSZWYuY3VycmVudCA9IHRhc2s7XHJcbiAgICByZXR1cm4gdGFzaztcclxuICB9LCBbdXBsb2FkLnNlbGVjdGVkRmlsZV0pO1xyXG5cclxuICBjb25zdCByZXNldFVwbG9hZFN0YXRlID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xyXG4gICAgc2V0VXBsb2FkKGluaXRpYWxVcGxvYWRTdGF0ZSk7XHJcbiAgfSwgW10pO1xyXG5cclxuICBjb25zdCB2YWx1ZSA9IHVzZU1lbW88QXBwQ29udGV4dFZhbHVlPihcclxuICAgICgpID0+ICh7XHJcbiAgICAgIHVwbG9hZCxcclxuICAgICAgZ3JhcGgsXHJcbiAgICAgIHNldERyYWdBY3RpdmUsXHJcbiAgICAgIHNlbGVjdEZpbGUsXHJcbiAgICAgIGNsZWFyU2VsZWN0ZWRGaWxlLFxyXG4gICAgICBiZWdpblByb2Nlc3NpbmcsXHJcbiAgICAgIGxvYWRHcmFwaCxcclxuICAgICAgcmVzZXRVcGxvYWRTdGF0ZSxcclxuICAgIH0pLFxyXG4gICAgW3VwbG9hZCwgZ3JhcGgsIHNldERyYWdBY3RpdmUsIHNlbGVjdEZpbGUsIGNsZWFyU2VsZWN0ZWRGaWxlLCBiZWdpblByb2Nlc3NpbmcsIGxvYWRHcmFwaCwgcmVzZXRVcGxvYWRTdGF0ZV1cclxuICApO1xyXG5cclxuICByZXR1cm4gPEFwcENvbnRleHQuUHJvdmlkZXIgdmFsdWU9e3ZhbHVlfT57Y2hpbGRyZW59PC9BcHBDb250ZXh0LlByb3ZpZGVyPjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVzZUFwcENvbnRleHQoKSB7XHJcbiAgY29uc3QgY29udGV4dCA9IHVzZUNvbnRleHQoQXBwQ29udGV4dCk7XHJcbiAgaWYgKCFjb250ZXh0KSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3VzZUFwcENvbnRleHQgbXVzdCBiZSB1c2VkIHdpdGhpbiBBcHBQcm92aWRlci4nKTtcclxuICB9XHJcbiAgcmV0dXJuIGNvbnRleHQ7XHJcbn1cclxuIiwgImV4cG9ydCBmdW5jdGlvbiBjbiguLi52YWx1ZXM6IEFycmF5PHN0cmluZyB8IGZhbHNlIHwgbnVsbCB8IHVuZGVmaW5lZD4pIHtcclxuICByZXR1cm4gdmFsdWVzLmZpbHRlcihCb29sZWFuKS5qb2luKCcgJyk7XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgQnV0dG9uSFRNTEF0dHJpYnV0ZXMsIFJlYWN0Tm9kZSB9IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IHsgY24gfSBmcm9tICcuLi8uLi9saWIvY24nO1xyXG5cclxudHlwZSBCdXR0b25WYXJpYW50ID0gJ3ByaW1hcnknIHwgJ3NlY29uZGFyeScgfCAnZ2hvc3QnIHwgJ2Rhbmdlcic7XHJcblxyXG5pbnRlcmZhY2UgQnV0dG9uUHJvcHMgZXh0ZW5kcyBCdXR0b25IVE1MQXR0cmlidXRlczxIVE1MQnV0dG9uRWxlbWVudD4ge1xyXG4gIHZhcmlhbnQ/OiBCdXR0b25WYXJpYW50O1xyXG4gIGNoaWxkcmVuOiBSZWFjdE5vZGU7XHJcbn1cclxuXHJcbmNvbnN0IHZhcmlhbnRDbGFzc2VzOiBSZWNvcmQ8QnV0dG9uVmFyaWFudCwgc3RyaW5nPiA9IHtcclxuICBwcmltYXJ5OiAnYmctYmx1ZS02MDAgdGV4dC13aGl0ZSBob3ZlcjpiZy1ibHVlLTUwMCBzaGFkb3ctbGcgc2hhZG93LWJsdWUtOTUwLzQwJyxcclxuICBzZWNvbmRhcnk6ICdib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05MDAvODAgdGV4dC1zbGF0ZS0xMDAgaG92ZXI6Ym9yZGVyLXNsYXRlLTUwMCBob3ZlcjpiZy1zbGF0ZS04MDAnLFxyXG4gIGdob3N0OiAndGV4dC1zbGF0ZS0zMDAgaG92ZXI6Ymctc2xhdGUtODAwLzcwIGhvdmVyOnRleHQtd2hpdGUnLFxyXG4gIGRhbmdlcjogJ2JnLXJlZC02MDAgdGV4dC13aGl0ZSBob3ZlcjpiZy1yZWQtNTAwIHNoYWRvdy1sZyBzaGFkb3ctcmVkLTk1MC80MCcsXHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBCdXR0b24oeyBjbGFzc05hbWUsIHZhcmlhbnQgPSAncHJpbWFyeScsIGNoaWxkcmVuLCAuLi5wcm9wcyB9OiBCdXR0b25Qcm9wcykge1xyXG4gIHJldHVybiAoXHJcbiAgICA8YnV0dG9uXHJcbiAgICAgIGNsYXNzTmFtZT17Y24oXHJcbiAgICAgICAgJ2lubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiByb3VuZGVkLXhsIHB4LTQgcHktMi41IHRleHQtc20gZm9udC1zZW1pYm9sZCB0cmFuc2l0aW9uLWFsbCBkaXNhYmxlZDpjdXJzb3Itbm90LWFsbG93ZWQgZGlzYWJsZWQ6b3BhY2l0eS01MCcsXHJcbiAgICAgICAgdmFyaWFudENsYXNzZXNbdmFyaWFudF0sXHJcbiAgICAgICAgY2xhc3NOYW1lXHJcbiAgICAgICl9XHJcbiAgICAgIHsuLi5wcm9wc31cclxuICAgID5cclxuICAgICAge2NoaWxkcmVufVxyXG4gICAgPC9idXR0b24+XHJcbiAgKTtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBIVE1MQXR0cmlidXRlcywgUmVhY3ROb2RlIH0gZnJvbSAncmVhY3QnO1xyXG5pbXBvcnQgeyBjbiB9IGZyb20gJy4uLy4uL2xpYi9jbic7XHJcblxyXG5pbnRlcmZhY2UgQmFkZ2VQcm9wcyBleHRlbmRzIEhUTUxBdHRyaWJ1dGVzPEhUTUxTcGFuRWxlbWVudD4ge1xyXG4gIGNoaWxkcmVuOiBSZWFjdE5vZGU7XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEJhZGdlKHsgY2xhc3NOYW1lLCBjaGlsZHJlbiwgLi4ucHJvcHMgfTogQmFkZ2VQcm9wcykge1xyXG4gIHJldHVybiAoXHJcbiAgICA8c3BhblxyXG4gICAgICBjbGFzc05hbWU9e2NuKFxyXG4gICAgICAgICdpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgcm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIGJnLXNsYXRlLTkwMC84MCBweC0yLjUgcHktMSB0ZXh0LXhzIGZvbnQtbWVkaXVtIHRleHQtc2xhdGUtMjAwJyxcclxuICAgICAgICBjbGFzc05hbWVcclxuICAgICAgKX1cclxuICAgICAgey4uLnByb3BzfVxyXG4gICAgPlxyXG4gICAgICB7Y2hpbGRyZW59XHJcbiAgICA8L3NwYW4+XHJcbiAgKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgQWxlcnRUcmlhbmdsZSwgQ2hlY2tDaXJjbGUyLCBJbmZvIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcclxuaW1wb3J0IHsgY24gfSBmcm9tICcuLi9saWIvY24nO1xyXG5cclxuaW50ZXJmYWNlIFN0YXR1c0Jhbm5lclByb3BzIHtcclxuICB0b25lPzogJ2luZm8nIHwgJ3N1Y2Nlc3MnIHwgJ2Vycm9yJztcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmNvbnN0IHRvbmVNYXAgPSB7XHJcbiAgaW5mbzoge1xyXG4gICAgY29udGFpbmVyOiAnYm9yZGVyLWJsdWUtNTAwLzMwIGJnLWJsdWUtNTAwLzEwIHRleHQtYmx1ZS0xMDAnLFxyXG4gICAgaWNvbjogSW5mbyxcclxuICB9LFxyXG4gIHN1Y2Nlc3M6IHtcclxuICAgIGNvbnRhaW5lcjogJ2JvcmRlci1lbWVyYWxkLTUwMC8zMCBiZy1lbWVyYWxkLTUwMC8xMCB0ZXh0LWVtZXJhbGQtMTAwJyxcclxuICAgIGljb246IENoZWNrQ2lyY2xlMixcclxuICB9LFxyXG4gIGVycm9yOiB7XHJcbiAgICBjb250YWluZXI6ICdib3JkZXItcmVkLTUwMC8zMCBiZy1yZWQtNTAwLzEwIHRleHQtcmVkLTEwMCcsXHJcbiAgICBpY29uOiBBbGVydFRyaWFuZ2xlLFxyXG4gIH0sXHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTdGF0dXNCYW5uZXIoeyB0b25lID0gJ2luZm8nLCBtZXNzYWdlIH06IFN0YXR1c0Jhbm5lclByb3BzKSB7XHJcbiAgY29uc3QgSWNvbiA9IHRvbmVNYXBbdG9uZV0uaWNvbjtcclxuXHJcbiAgcmV0dXJuIChcclxuICAgIDxkaXYgY2xhc3NOYW1lPXtjbignZmxleCBpdGVtcy1zdGFydCBnYXAtMyByb3VuZGVkLTJ4bCBib3JkZXIgcHgtNCBweS0zIHRleHQtc20nLCB0b25lTWFwW3RvbmVdLmNvbnRhaW5lcil9PlxyXG4gICAgICA8SWNvbiBjbGFzc05hbWU9XCJtdC0wLjUgaC00IHctNCBzaHJpbmstMFwiIC8+XHJcbiAgICAgIDxwIGNsYXNzTmFtZT1cIm0tMCBsZWFkaW5nLTZcIj57bWVzc2FnZX08L3A+XHJcbiAgICA8L2Rpdj5cclxuICApO1xyXG59XHJcbiIsICJpbXBvcnQgeyB1c2VSZWYgfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCB0eXBlIHsgQ2hhbmdlRXZlbnQsIERyYWdFdmVudCB9IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IHsgQ2hldnJvblJpZ2h0LCBGaWxlVGV4dCwgTmV0d29yaywgU2hpZWxkLCBVcGxvYWQgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xyXG5pbXBvcnQgeyB1c2VOYXZpZ2F0ZSB9IGZyb20gJ3JlYWN0LXJvdXRlci1kb20nO1xyXG5pbXBvcnQgQnV0dG9uIGZyb20gJy4uL2NvbXBvbmVudHMvdWkvQnV0dG9uJztcclxuaW1wb3J0IEJhZGdlIGZyb20gJy4uL2NvbXBvbmVudHMvdWkvQmFkZ2UnO1xyXG5pbXBvcnQgU3RhdHVzQmFubmVyIGZyb20gJy4uL2NvbXBvbmVudHMvU3RhdHVzQmFubmVyJztcclxuaW1wb3J0IHsgYXBwQ29uZmlnIH0gZnJvbSAnLi4vbGliL2NvbmZpZyc7XHJcbmltcG9ydCB7IHVzZUFwcENvbnRleHQgfSBmcm9tICcuLi9zdGF0ZS9BcHBDb250ZXh0JztcclxuXHJcbmZ1bmN0aW9uIGZvcm1hdEZpbGVTaXplKHNpemU6IG51bWJlcikge1xyXG4gIGlmIChzaXplIDwgMTAyNCAqIDEwMjQpIHtcclxuICAgIHJldHVybiBgJHsoc2l6ZSAvIDEwMjQpLnRvRml4ZWQoMSl9IEtCYDtcclxuICB9XHJcbiAgcmV0dXJuIGAkeyhzaXplIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoMil9IE1CYDtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTGFuZGluZ1BhZ2UoKSB7XHJcbiAgY29uc3QgbmF2aWdhdGUgPSB1c2VOYXZpZ2F0ZSgpO1xyXG4gIGNvbnN0IGZpbGVJbnB1dFJlZiA9IHVzZVJlZjxIVE1MSW5wdXRFbGVtZW50IHwgbnVsbD4obnVsbCk7XHJcbiAgY29uc3QgeyB1cGxvYWQsIGdyYXBoLCBzZXREcmFnQWN0aXZlLCBzZWxlY3RGaWxlLCBjbGVhclNlbGVjdGVkRmlsZSB9ID0gdXNlQXBwQ29udGV4dCgpO1xyXG5cclxuICBjb25zdCBzZWxlY3RlZEZpbGUgPSB1cGxvYWQuc2VsZWN0ZWRGaWxlO1xyXG5cclxuICBjb25zdCBoYW5kbGVGaWxlID0gKGZpbGU6IEZpbGUgfCBudWxsKSA9PiB7XHJcbiAgICBzZWxlY3RGaWxlKGZpbGUpO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IGhhbmRsZURyb3AgPSAoZXZlbnQ6IERyYWdFdmVudDxIVE1MRGl2RWxlbWVudD4pID0+IHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBzZXREcmFnQWN0aXZlKGZhbHNlKTtcclxuICAgIGhhbmRsZUZpbGUoZXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzPy5bMF0gPz8gbnVsbCk7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgaGFuZGxlRmlsZUlucHV0ID0gKGV2ZW50OiBDaGFuZ2VFdmVudDxIVE1MSW5wdXRFbGVtZW50PikgPT4ge1xyXG4gICAgaGFuZGxlRmlsZShldmVudC50YXJnZXQuZmlsZXM/LlswXSA/PyBudWxsKTtcclxuICB9O1xyXG5cclxuICByZXR1cm4gKFxyXG4gICAgPGRpdiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gYmctWyMwRjE3MkFdIHRleHQtd2hpdGVcIj5cclxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJteC1hdXRvIG1heC13LTd4bCBweC02IHB5LTE2XCI+XHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdhcC0xMCB4bDpncmlkLWNvbHMtWzEuMmZyXzAuOGZyXVwiPlxyXG4gICAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC1bMzJweF0gcHgtOCBweS0xMCBtZDpweC0xMCBtZDpweS0xMlwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTNcIj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJnLWJsdWUtNTAwLzE1IHAtMyB0ZXh0LWJsdWUtMzAwXCI+XHJcbiAgICAgICAgICAgICAgICA8TmV0d29yayBjbGFzc05hbWU9XCJoLTggdy04XCIgLz5cclxuICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNtIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yMmVtXSB0ZXh0LWJsdWUtMzAwXCI+RGlnaXRhbCBUd2luIE9wZXJhdGlvbnM8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJtdC0xIHRleHQtNXhsIGZvbnQtYm9sZCB0cmFja2luZy10aWdodCB0ZXh0LXdoaXRlIG1kOnRleHQtNnhsXCI+VHdpbkdyYXBoT3BzPC9oMT5cclxuICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtYXgtdy0zeGwgdGV4dC1sZyBsZWFkaW5nLTggdGV4dC1zbGF0ZS0zMDBcIj5cclxuICAgICAgICAgICAgICBEcm9wIGluIHlvdXIgc3lzdGVtIG1hbnVhbCBhbmQgbGV0IFR3aW5HcmFwaE9wcyBleHRyYWN0IHRoZSBhcmNoaXRlY3R1cmUsIHNjb3JlIG9wZXJhdGlvbmFsIHJpc2ssIGFuZCB0dXJuIHRoZSB3aG9sZSBzeXN0ZW0gaW50byBhIGdyYXBoIHlvdXIgdGVhbSBjYW4gaW5zcGVjdCBpbiBtaW51dGVzLlxyXG4gICAgICAgICAgICA8L3A+XHJcblxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTggZmxleCBmbGV4LXdyYXAgZ2FwLTNcIj5cclxuICAgICAgICAgICAgICA8QmFkZ2UgY2xhc3NOYW1lPVwiYm9yZGVyLWJsdWUtNTAwLzMwIGJnLWJsdWUtNTAwLzEwIHRleHQtYmx1ZS0xMDBcIj5BUEkge2FwcENvbmZpZy5hcGlCYXNlVXJsfTwvQmFkZ2U+XHJcbiAgICAgICAgICAgICAgPEJhZGdlIGNsYXNzTmFtZT1cImJvcmRlci1zbGF0ZS03MDAgYmctc2xhdGUtOTAwLzgwIHRleHQtc2xhdGUtMjAwXCI+XHJcbiAgICAgICAgICAgICAgICBVcGxvYWQgbGltaXQge01hdGgucm91bmQoYXBwQ29uZmlnLm1heFVwbG9hZEJ5dGVzIC8gMTAyNCAvIDEwMjQpfSBNQlxyXG4gICAgICAgICAgICAgIDwvQmFkZ2U+XHJcbiAgICAgICAgICAgICAgPEJhZGdlIGNsYXNzTmFtZT1cImJvcmRlci1zbGF0ZS03MDAgYmctc2xhdGUtOTAwLzgwIHRleHQtc2xhdGUtMjAwXCI+XHJcbiAgICAgICAgICAgICAgICBUaW1lb3V0IHsoYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMgLyAxMDAwKS50b0ZpeGVkKDApfXNcclxuICAgICAgICAgICAgICA8L0JhZGdlPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMTIgZ3JpZCBnYXAtNiBtZDpncmlkLWNvbHMtM1wiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMjhweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzU1IHAtNlwiPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi00IGZsZXggaC0xMiB3LTEyIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLTJ4bCBiZy1ibHVlLTUwMC8xNSB0ZXh0LWJsdWUtMzAwXCI+XHJcbiAgICAgICAgICAgICAgICAgIDxVcGxvYWQgY2xhc3NOYW1lPVwiaC02IHctNlwiIC8+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPjEuIFVwbG9hZCBEb2N1bWVudGF0aW9uPC9oMj5cclxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBsZWFkaW5nLTYgdGV4dC1zbGF0ZS00MDBcIj5VcGxvYWQgYSBVVEYtOCBgLm1kYCBvciBgLnR4dGAgZmlsZSBkZXNjcmliaW5nIHRoZSBzeXN0ZW0uPC9wPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMjhweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzU1IHAtNlwiPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi00IGZsZXggaC0xMiB3LTEyIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLTJ4bCBiZy1wdXJwbGUtNTAwLzE1IHRleHQtcHVycGxlLTMwMFwiPlxyXG4gICAgICAgICAgICAgICAgICA8TmV0d29yayBjbGFzc05hbWU9XCJoLTYgdy02XCIgLz5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+Mi4gQnVpbGQgR3JhcGg8L2gyPlxyXG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTQwMFwiPlRoZSBiYWNrZW5kIGV4dHJhY3RzIG5vZGVzLCBlZGdlcywgYW5kIHJpc2sgbWV0cmljcyBpbnRvIHRoZSBhY3RpdmUgZ3JhcGguPC9wPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMjhweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzU1IHAtNlwiPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi00IGZsZXggaC0xMiB3LTEyIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLTJ4bCBiZy1vcmFuZ2UtNTAwLzE1IHRleHQtb3JhbmdlLTMwMFwiPlxyXG4gICAgICAgICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cImgtNiB3LTZcIiAvPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj4zLiBJbnNwZWN0IFJpc2tzPC9oMj5cclxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBsZWFkaW5nLTYgdGV4dC1zbGF0ZS00MDBcIj5FeHBsb3JlIHRoZSBncmFwaCwgdGFibGVzLCBhbmQgZGV0YWlsIHBhbmVsIGZvciBvcGVyYXRpb25hbCBpbnNpZ2h0LjwvcD5cclxuICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L3NlY3Rpb24+XHJcblxyXG4gICAgICAgICAgPGFzaWRlIGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtWzMycHhdIHAtOFwiPlxyXG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC14bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj5BY3RpdmUgSW5nZXN0PC9oMj5cclxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMyB0ZXh0LXNtIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTMwMFwiPlxyXG4gICAgICAgICAgICAgIFF1ZXVlIG9uZSBtYW51YWwgZm9yIGluZ2VzdGlvbi4gVGhlIGFjdGl2ZSBncmFwaCBpbiB0aGUgd29ya3NwYWNlIHdpbGwgcmVmcmVzaCB3aGVuIHByb2Nlc3NpbmcgY29tcGxldGVzLlxyXG4gICAgICAgICAgICA8L3A+XHJcblxyXG4gICAgICAgICAgICA8ZGl2XHJcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgbXQtNiByb3VuZGVkLVsyOHB4XSBib3JkZXItMiBib3JkZXItZGFzaGVkIHAtOCB0ZXh0LWNlbnRlciB0cmFuc2l0aW9uICR7XHJcbiAgICAgICAgICAgICAgICB1cGxvYWQucGhhc2UgPT09ICdkcmFnLWhvdmVyJ1xyXG4gICAgICAgICAgICAgICAgICA/ICdib3JkZXItYmx1ZS00MDAgYmctYmx1ZS01MDAvMTAnXHJcbiAgICAgICAgICAgICAgICAgIDogJ2JvcmRlci1zbGF0ZS03MDAgYmctc2xhdGUtOTUwLzUwIGhvdmVyOmJvcmRlci1zbGF0ZS01MDAnXHJcbiAgICAgICAgICAgICAgfWB9XHJcbiAgICAgICAgICAgICAgb25EcmFnT3Zlcj17KGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgc2V0RHJhZ0FjdGl2ZSh0cnVlKTtcclxuICAgICAgICAgICAgICB9fVxyXG4gICAgICAgICAgICAgIG9uRHJhZ0xlYXZlPXsoKSA9PiBzZXREcmFnQWN0aXZlKGZhbHNlKX1cclxuICAgICAgICAgICAgICBvbkRyb3A9e2hhbmRsZURyb3B9XHJcbiAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICA8VXBsb2FkIGNsYXNzTmFtZT1cIm14LWF1dG8gaC0xNCB3LTE0IHRleHQtc2xhdGUtNDAwXCIgLz5cclxuICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwibXQtNCB0ZXh0LXhsIGZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj5VcGxvYWQgU3lzdGVtIERvY3VtZW50YXRpb248L2gzPlxyXG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPkRyYWcgYW5kIGRyb3AgeW91ciBmaWxlIGhlcmUgb3IgYnJvd3NlIGxvY2FsbHkuPC9wPlxyXG4gICAgICAgICAgICAgIDxpbnB1dFxyXG4gICAgICAgICAgICAgICAgcmVmPXtmaWxlSW5wdXRSZWZ9XHJcbiAgICAgICAgICAgICAgICB0eXBlPVwiZmlsZVwiXHJcbiAgICAgICAgICAgICAgICBhY2NlcHQ9XCIubWQsLnR4dCx0ZXh0L3BsYWluLHRleHQvbWFya2Rvd25cIlxyXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaGlkZGVuXCJcclxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXtoYW5kbGVGaWxlSW5wdXR9XHJcbiAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgZmxleCBmbGV4LXdyYXAganVzdGlmeS1jZW50ZXIgZ2FwLTNcIj5cclxuICAgICAgICAgICAgICAgIDxCdXR0b24gdmFyaWFudD1cInNlY29uZGFyeVwiIG9uQ2xpY2s9eygpID0+IGZpbGVJbnB1dFJlZi5jdXJyZW50Py5jbGljaygpfT5cclxuICAgICAgICAgICAgICAgICAgPEZpbGVUZXh0IGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPlxyXG4gICAgICAgICAgICAgICAgICBDaG9vc2UgRmlsZVxyXG4gICAgICAgICAgICAgICAgPC9CdXR0b24+XHJcbiAgICAgICAgICAgICAgICA8QnV0dG9uIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvcHJvY2Vzc2luZycpfSBkaXNhYmxlZD17IXNlbGVjdGVkRmlsZX0+XHJcbiAgICAgICAgICAgICAgICAgIEFuYWx5emUgRG9jdW1lbnRcclxuICAgICAgICAgICAgICAgICAgPENoZXZyb25SaWdodCBjbGFzc05hbWU9XCJoLTQgdy00XCIgLz5cclxuICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTQgdGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMmVtXSB0ZXh0LXNsYXRlLTUwMFwiPlN1cHBvcnRlZCBmb3JtYXRzOiAubWQgYW5kIC50eHQ8L3A+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC02IHJvdW5kZWQtWzI4cHhdIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC82MCBwLTRcIj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQganVzdGlmeS1iZXR3ZWVuIGdhcC00XCI+XHJcbiAgICAgICAgICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPlNlbGVjdGVkIEZpbGU8L3A+XHJcbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+e3NlbGVjdGVkRmlsZT8ubmFtZSA/PyAnTm8gZmlsZSBzZWxlY3RlZC4nfTwvcD5cclxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAge3NlbGVjdGVkRmlsZSA/IGZvcm1hdEZpbGVTaXplKHNlbGVjdGVkRmlsZS5zaXplKSA6ICdDaG9vc2UgYSBtYW51YWwgdG8gYmVnaW4uJ31cclxuICAgICAgICAgICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICB7c2VsZWN0ZWRGaWxlID8gKFxyXG4gICAgICAgICAgICAgICAgICA8QnV0dG9uIHZhcmlhbnQ9XCJnaG9zdFwiIG9uQ2xpY2s9e2NsZWFyU2VsZWN0ZWRGaWxlfT5cclxuICAgICAgICAgICAgICAgICAgICBDbGVhclxyXG4gICAgICAgICAgICAgICAgICA8L0J1dHRvbj5cclxuICAgICAgICAgICAgICAgICkgOiBudWxsfVxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNlwiPlxyXG4gICAgICAgICAgICAgIDxTdGF0dXNCYW5uZXJcclxuICAgICAgICAgICAgICAgIHRvbmU9e3VwbG9hZC5lcnJvciA/ICdlcnJvcicgOiBncmFwaC5kYXRhID8gJ3N1Y2Nlc3MnIDogJ2luZm8nfVxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZT17dXBsb2FkLmVycm9yIHx8IHVwbG9hZC5zdGF0dXNNZXNzYWdlIHx8ICdVcGxvYWQgYSBmaWxlIHRvIGNvbnRpbnVlLid9XHJcbiAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICB7Z3JhcGguZGF0YSA/IChcclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgcm91bmRlZC1bMjhweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzYwIHAtNFwiPlxyXG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS01MDBcIj5DdXJyZW50IFdvcmtzcGFjZTwvcD5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNCBncmlkIGdyaWQtY29scy0yIGdhcC00XCI+XHJcbiAgICAgICAgICAgICAgICAgIDxkaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC0yeGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+e2dyYXBoLmRhdGEubm9kZXMubGVuZ3RofTwvcD5cclxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+Tm9kZXM8L3A+XHJcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntncmFwaC5kYXRhLmxpbmtzLmxlbmd0aH08L3A+XHJcbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPkVkZ2VzPC9wPlxyXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICApIDogbnVsbH1cclxuICAgICAgICAgIDwvYXNpZGU+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgPC9kaXY+XHJcbiAgKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgQ2hlY2tDaXJjbGUyLCBDbG9jazMsIExvYWRlcjIsIFRlcm1pbmFsU3F1YXJlLCBYQ2lyY2xlIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcclxuaW1wb3J0IHR5cGUgeyBQcm9jZXNzaW5nU3RhdHVzIH0gZnJvbSAnLi4vdHlwZXMvYXBpJztcclxuXHJcbmludGVyZmFjZSBQcm9jZXNzaW5nQWN0aXZpdHlQYW5lbFByb3BzIHtcclxuICBzdGF0dXM6IFByb2Nlc3NpbmdTdGF0dXMgfCBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JtYXRUaW1lc3RhbXAodGltZXN0YW1wOiBzdHJpbmcgfCBudWxsKSB7XHJcbiAgaWYgKCF0aW1lc3RhbXApIHtcclxuICAgIHJldHVybiAnUGVuZGluZyc7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQodW5kZWZpbmVkLCB7XHJcbiAgICBob3VyOiAnbnVtZXJpYycsXHJcbiAgICBtaW51dGU6ICcyLWRpZ2l0JyxcclxuICAgIHNlY29uZDogJzItZGlnaXQnLFxyXG4gIH0pLmZvcm1hdChuZXcgRGF0ZSh0aW1lc3RhbXApKTtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gUHJvY2Vzc2luZ0FjdGl2aXR5UGFuZWwoeyBzdGF0dXMgfTogUHJvY2Vzc2luZ0FjdGl2aXR5UGFuZWxQcm9wcykge1xyXG4gIGNvbnN0IGV2ZW50cyA9IHN0YXR1cz8uZXZlbnRzID8/IFtdO1xyXG4gIGNvbnN0IHZpc2libGVFdmVudHMgPSBbLi4uZXZlbnRzXS5yZXZlcnNlKCkuc2xpY2UoMCwgOCk7XHJcbiAgY29uc3Qgc3RhdGUgPSBzdGF0dXM/LnN0YXRlID8/ICdwZW5kaW5nJztcclxuXHJcbiAgcmV0dXJuIChcclxuICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtWzI4cHhdIHAtNlwiPlxyXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC13cmFwIGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtNFwiPlxyXG4gICAgICAgIDxkaXY+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XHJcbiAgICAgICAgICAgIDxUZXJtaW5hbFNxdWFyZSBjbGFzc05hbWU9XCJoLTUgdy01IHRleHQtY3lhbi0zMDBcIiAvPlxyXG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj5Qcm9jZXNzaW5nIEFjdGl2aXR5PC9oMj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05NTAvNzAgcHgtMyBweS0xIHRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtc2xhdGUtMzAwXCI+XHJcbiAgICAgICAgICB7c3RhdGV9XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC01IGdyaWQgZ2FwLTMgc206Z3JpZC1jb2xzLTNcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtWzIycHhdIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC83MCBwLTRcIj5cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMThlbV0gdGV4dC1zbGF0ZS01MDBcIj5DdXJyZW50IFN0ZXA8L2Rpdj5cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj57c3RhdHVzPy5sYXRlc3RfZXZlbnQgPz8gJ1dhaXRpbmcgZm9yIHVwbG9hZCB0byBiZWdpbi4nfTwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMjJweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzcwIHAtNFwiPlxyXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LXNsYXRlLTUwMFwiPkNodW5rIFByb2dyZXNzPC9kaXY+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+XHJcbiAgICAgICAgICAgIHtzdGF0dXM/LmN1cnJlbnRfY2h1bmsgJiYgc3RhdHVzPy5jaHVua3NfdG90YWxcclxuICAgICAgICAgICAgICA/IGAke01hdGgubWluKHN0YXR1cy5jdXJyZW50X2NodW5rLCBzdGF0dXMuY2h1bmtzX3RvdGFsKX0gb2YgJHtzdGF0dXMuY2h1bmtzX3RvdGFsfWBcclxuICAgICAgICAgICAgICA6IHN0YXR1cz8uY2h1bmtzX3RvdGFsXHJcbiAgICAgICAgICAgICAgICA/IGAwIG9mICR7c3RhdHVzLmNodW5rc190b3RhbH1gXHJcbiAgICAgICAgICAgICAgICA6ICdXYWl0aW5nJ31cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMjJweF0gYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwLzcwIHAtNFwiPlxyXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xOGVtXSB0ZXh0LXNsYXRlLTUwMFwiPlN0YXJ0ZWQ8L2Rpdj5cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtd2hpdGVcIj57Zm9ybWF0VGltZXN0YW1wKHN0YXR1cz8uc3RhcnRlZF9hdCA/PyBudWxsKX08L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgPC9kaXY+XHJcblxyXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTUgc3BhY2UteS0zXCI+XHJcbiAgICAgICAge3Zpc2libGVFdmVudHMubGVuZ3RoID09PSAwID8gKFxyXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLVsyMnB4XSBib3JkZXIgYm9yZGVyLWRhc2hlZCBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC80NSBweC00IHB5LTUgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPlxyXG4gICAgICAgICAgICBXYWl0aW5nIGZvciBiYWNrZW5kIGFjdGl2aXR5Li4uXHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICApIDogKFxyXG4gICAgICAgICAgdmlzaWJsZUV2ZW50cy5tYXAoKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRvbmUgPVxyXG4gICAgICAgICAgICAgIGV2ZW50LmxldmVsID09PSAnRVJST1InXHJcbiAgICAgICAgICAgICAgICA/IHtcclxuICAgICAgICAgICAgICAgICAgICBpY29uOiA8WENpcmNsZSBjbGFzc05hbWU9XCJoLTQgdy00IHRleHQtcmVkLTMwMFwiIC8+LFxyXG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcjogJ2JvcmRlci1yZWQtNTAwLzIwJyxcclxuICAgICAgICAgICAgICAgICAgICBiZzogJ2JnLXJlZC01MDAvOCcsXHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIDogZXZlbnQuZXZlbnQuZW5kc1dpdGgoJ19jb21wbGV0ZWQnKSB8fCBldmVudC5ldmVudC5lbmRzV2l0aCgnX3N1Y2NlZWRlZCcpXHJcbiAgICAgICAgICAgICAgICAgID8ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgaWNvbjogPENoZWNrQ2lyY2xlMiBjbGFzc05hbWU9XCJoLTQgdy00IHRleHQtZW1lcmFsZC0zMDBcIiAvPixcclxuICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcjogJ2JvcmRlci1lbWVyYWxkLTUwMC8yMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICBiZzogJ2JnLWVtZXJhbGQtNTAwLzgnLFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgOiBzdGF0ZSA9PT0gJ3J1bm5pbmcnXHJcbiAgICAgICAgICAgICAgICAgICAgPyB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb246IDxMb2FkZXIyIGNsYXNzTmFtZT1cImgtNCB3LTQgYW5pbWF0ZS1zcGluIHRleHQtYmx1ZS0zMDBcIiAvPixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAnYm9yZGVyLWJsdWUtNTAwLzIwJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYmc6ICdiZy1ibHVlLTUwMC84JyxcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogPENsb2NrMyBjbGFzc05hbWU9XCJoLTQgdy00IHRleHQtc2xhdGUtMzAwXCIgLz4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcjogJ2JvcmRlci1zbGF0ZS03MDAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBiZzogJ2JnLXNsYXRlLTkwMC83MCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICA8ZGl2XHJcbiAgICAgICAgICAgICAgICBrZXk9e2Ake2V2ZW50LnRpbWVzdGFtcCA/PyAncGVuZGluZyd9LSR7ZXZlbnQuZXZlbnR9YH1cclxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGZsZXggaXRlbXMtc3RhcnQgZ2FwLTMgcm91bmRlZC1bMjJweF0gYm9yZGVyIHB4LTQgcHktMyAke3RvbmUuYm9yZGVyfSAke3RvbmUuYmd9YH1cclxuICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTAuNVwiPnt0b25lLmljb259PC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1pbi13LTAgZmxleC0xXCI+XHJcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGdhcC0yXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LXdoaXRlXCI+e2V2ZW50Lm1lc3NhZ2V9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtc2xhdGUtNTAwXCI+e2Zvcm1hdFRpbWVzdGFtcChldmVudC50aW1lc3RhbXApfTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNmVtXSB0ZXh0LXNsYXRlLTUwMFwiPntldmVudC5ldmVudH08L2Rpdj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICApfVxyXG4gICAgICA8L2Rpdj5cclxuICAgIDwvc2VjdGlvbj5cclxuICApO1xyXG59XHJcbiIsICJpbXBvcnQgeyB1c2VFZmZlY3QsIHVzZU1lbW8sIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xyXG5pbXBvcnQgeyBDaGVja0NpcmNsZTIsIExvYWRlcjIsIE5ldHdvcmsgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xyXG5pbXBvcnQgeyB1c2VOYXZpZ2F0ZSB9IGZyb20gJ3JlYWN0LXJvdXRlci1kb20nO1xyXG5pbXBvcnQgUHJvY2Vzc2luZ0FjdGl2aXR5UGFuZWwgZnJvbSAnLi4vY29tcG9uZW50cy9Qcm9jZXNzaW5nQWN0aXZpdHlQYW5lbCc7XHJcbmltcG9ydCBCdXR0b24gZnJvbSAnLi4vY29tcG9uZW50cy91aS9CdXR0b24nO1xyXG5pbXBvcnQgU3RhdHVzQmFubmVyIGZyb20gJy4uL2NvbXBvbmVudHMvU3RhdHVzQmFubmVyJztcclxuaW1wb3J0IHsgdXNlQXBwQ29udGV4dCB9IGZyb20gJy4uL3N0YXRlL0FwcENvbnRleHQnO1xyXG5cclxuY29uc3Qgc3RlcHMgPSBbXHJcbiAgJ1VwbG9hZGluZyBkb2N1bWVudCcsXHJcbiAgJ0V4dHJhY3RpbmcgYXJjaGl0ZWN0dXJlIGdyYXBoJyxcclxuICAnQ2FsY3VsYXRpbmcgcmlzayBtZXRyaWNzIGFuZCBsb2FkaW5nIHdvcmtzcGFjZScsXHJcbl07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBQcm9jZXNzaW5nUGFnZSgpIHtcclxuICBjb25zdCBuYXZpZ2F0ZSA9IHVzZU5hdmlnYXRlKCk7XHJcbiAgY29uc3QgeyB1cGxvYWQsIGdyYXBoLCBiZWdpblByb2Nlc3NpbmcgfSA9IHVzZUFwcENvbnRleHQoKTtcclxuICBjb25zdCBbZWxhcHNlZCwgc2V0RWxhcHNlZF0gPSB1c2VTdGF0ZSgwKTtcclxuXHJcbiAgdXNlRWZmZWN0KCgpID0+IHtcclxuICAgIGlmICghdXBsb2FkLnNlbGVjdGVkRmlsZSAmJiAhdXBsb2FkLmluZ2VzdGlvbiAmJiAhZ3JhcGguZGF0YSkge1xyXG4gICAgICBuYXZpZ2F0ZSgnLycpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHVwbG9hZC5waGFzZSA9PT0gJ2ZpbGUtc2VsZWN0ZWQnKSB7XHJcbiAgICAgIGJlZ2luUHJvY2Vzc2luZygpLmNhdGNoKCgpID0+IHVuZGVmaW5lZCk7XHJcbiAgICB9XHJcbiAgfSwgW2JlZ2luUHJvY2Vzc2luZywgZ3JhcGguZGF0YSwgbmF2aWdhdGUsIHVwbG9hZC5pbmdlc3Rpb24sIHVwbG9hZC5waGFzZSwgdXBsb2FkLnNlbGVjdGVkRmlsZV0pO1xyXG5cclxuICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgaWYgKCEodXBsb2FkLnBoYXNlID09PSAndXBsb2FkaW5nJyB8fCB1cGxvYWQucGhhc2UgPT09ICdwcm9jZXNzaW5nJykgfHwgIXVwbG9hZC5zdGFydGVkQXQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGludGVydmFsID0gd2luZG93LnNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgc2V0RWxhcHNlZChEYXRlLm5vdygpIC0gdXBsb2FkLnN0YXJ0ZWRBdCEpO1xyXG4gICAgfSwgMjAwKTtcclxuXHJcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LmNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xyXG4gIH0sIFt1cGxvYWQucGhhc2UsIHVwbG9hZC5zdGFydGVkQXRdKTtcclxuXHJcbiAgdXNlRWZmZWN0KCgpID0+IHtcclxuICAgIGlmICgodXBsb2FkLnBoYXNlID09PSAnc3VjY2VzcycgfHwgdXBsb2FkLnBoYXNlID09PSAnZW1wdHktZ3JhcGgnKSAmJiBncmFwaC5zdGF0dXMgPT09ICdyZWFkeScpIHtcclxuICAgICAgY29uc3QgdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IG5hdmlnYXRlKCcvYXBwJyksIDcwMCk7XHJcbiAgICAgIHJldHVybiAoKSA9PiB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xyXG4gICAgfVxyXG4gIH0sIFtncmFwaC5zdGF0dXMsIG5hdmlnYXRlLCB1cGxvYWQucGhhc2VdKTtcclxuXHJcbiAgY29uc3QgY3VycmVudFN0ZXAgPSB1c2VNZW1vKCgpID0+IHtcclxuICAgIGlmICh1cGxvYWQucGhhc2UgPT09ICdzdWNjZXNzJyB8fCB1cGxvYWQucGhhc2UgPT09ICdlbXB0eS1ncmFwaCcpIHtcclxuICAgICAgcmV0dXJuIHN0ZXBzLmxlbmd0aDtcclxuICAgIH1cclxuICAgIGlmICh1cGxvYWQucHJvY2Vzc2luZ1N0YXR1cz8uc3RhdGUgPT09ICdydW5uaW5nJyAmJiB1cGxvYWQucHJvY2Vzc2luZ1N0YXR1cy5jdXJyZW50X2NodW5rKSB7XHJcbiAgICAgIHJldHVybiB1cGxvYWQucHJvY2Vzc2luZ1N0YXR1cy5jdXJyZW50X2NodW5rID49ICh1cGxvYWQucHJvY2Vzc2luZ1N0YXR1cy5jaHVua3NfdG90YWwgPz8gMSkgPyAzIDogMjtcclxuICAgIH1cclxuICAgIGlmICh1cGxvYWQucGhhc2UgPT09ICdwcm9jZXNzaW5nJykge1xyXG4gICAgICByZXR1cm4gZWxhcHNlZCA+IDI1MDAgPyAzIDogMjtcclxuICAgIH1cclxuICAgIGlmICh1cGxvYWQucGhhc2UgPT09ICd1cGxvYWRpbmcnKSB7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDA7XHJcbiAgfSwgW2VsYXBzZWQsIHVwbG9hZC5waGFzZSwgdXBsb2FkLnByb2Nlc3NpbmdTdGF0dXM/LmNodW5rc190b3RhbCwgdXBsb2FkLnByb2Nlc3NpbmdTdGF0dXM/LmN1cnJlbnRfY2h1bmssIHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzPy5zdGF0ZV0pO1xyXG5cclxuICBjb25zdCBwcm9ncmVzcyA9IHVzZU1lbW8oKCkgPT4ge1xyXG4gICAgaWYgKHVwbG9hZC5waGFzZSA9PT0gJ3N1Y2Nlc3MnIHx8IHVwbG9hZC5waGFzZSA9PT0gJ2VtcHR5LWdyYXBoJykge1xyXG4gICAgICByZXR1cm4gMTAwO1xyXG4gICAgfVxyXG4gICAgaWYgKHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzPy5jaHVua3NfdG90YWwpIHtcclxuICAgICAgY29uc3QgY2h1bmtQcm9ncmVzcyA9ICgodXBsb2FkLnByb2Nlc3NpbmdTdGF0dXMuY3VycmVudF9jaHVuayA/PyAwKSAvIHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzLmNodW5rc190b3RhbCkgKiAxMDA7XHJcbiAgICAgIHJldHVybiBNYXRoLm1heCgxOCwgTWF0aC5taW4oOTQsIE1hdGgucm91bmQoMjAgKyBjaHVua1Byb2dyZXNzICogMC43KSkpO1xyXG4gICAgfVxyXG4gICAgaWYgKHVwbG9hZC5waGFzZSA9PT0gJ3Byb2Nlc3NpbmcnKSB7XHJcbiAgICAgIHJldHVybiBNYXRoLm1pbig5MiwgZWxhcHNlZCA+IDI1MDAgPyA4MiA6IDU4KTtcclxuICAgIH1cclxuICAgIGlmICh1cGxvYWQucGhhc2UgPT09ICd1cGxvYWRpbmcnKSB7XHJcbiAgICAgIHJldHVybiAyNDtcclxuICAgIH1cclxuICAgIHJldHVybiAwO1xyXG4gIH0sIFtlbGFwc2VkLCB1cGxvYWQucGhhc2UsIHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzPy5jaHVua3NfdG90YWwsIHVwbG9hZC5wcm9jZXNzaW5nU3RhdHVzPy5jdXJyZW50X2NodW5rXSk7XHJcblxyXG4gIGNvbnN0IGlzUmV0cnlTdGF0ZSA9IHVwbG9hZC5waGFzZSA9PT0gJ3JldHJ5JyB8fCB1cGxvYWQucGhhc2UgPT09ICdlcnJvcic7XHJcblxyXG4gIHJldHVybiAoXHJcbiAgICA8ZGl2IGNsYXNzTmFtZT1cIm1pbi1oLXNjcmVlbiBiZy1bIzBGMTcyQV0gcHgtNiBweS0xNiB0ZXh0LXdoaXRlXCI+XHJcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXgtYXV0byBtYXgtdy02eGxcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ2FwLTYgeGw6Z3JpZC1jb2xzLVttaW5tYXgoMCwxLjFmcilfbWlubWF4KDM0MHB4LDAuOWZyKV1cIj5cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC1bMzJweF0gcC04IG1kOnAtMTBcIj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlclwiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmUgaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtZnVsbCBiZy1ibHVlLTUwMC8xMCBwLTYgdGV4dC1ibHVlLTMwMFwiPlxyXG4gICAgICAgICAgICAgICAgPE5ldHdvcmsgY2xhc3NOYW1lPVwiaC0xNCB3LTE0XCIgLz5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCByb3VuZGVkLWZ1bGwgYmctYmx1ZS01MDAvMTAgYmx1ci0yeGxcIiAvPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJtdC02IHRleHQtM3hsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPlByb2Nlc3NpbmcgWW91ciBEb2N1bWVudGF0aW9uPC9oMT5cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTEwIHNwYWNlLXktNFwiPlxyXG4gICAgICAgICAgICAgIHtzdGVwcy5tYXAoKGxhYmVsLCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29tcGxldGVkID0gY3VycmVudFN0ZXAgPiBpbmRleCArIDE7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhY3RpdmUgPSBjdXJyZW50U3RlcCA9PT0gaW5kZXggKyAxO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICAgIDxkaXZcclxuICAgICAgICAgICAgICAgICAgICBrZXk9e2xhYmVsfVxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGZsZXggaXRlbXMtY2VudGVyIGdhcC00IHJvdW5kZWQtWzI0cHhdIGJvcmRlciBweC01IHB5LTQgdHJhbnNpdGlvbiAke1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgID8gJ2JvcmRlci1lbWVyYWxkLTUwMC8zMCBiZy1lbWVyYWxkLTUwMC8xMCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgOiBhY3RpdmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICA/ICdib3JkZXItYmx1ZS01MDAvMzAgYmctYmx1ZS01MDAvMTAnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgOiAnYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNTUnXHJcbiAgICAgICAgICAgICAgICAgICAgfWB9XHJcbiAgICAgICAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaC0xMCB3LTEwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWZ1bGwgYmctc2xhdGUtOTUwLzcwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICB7Y29tcGxldGVkID8gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8Q2hlY2tDaXJjbGUyIGNsYXNzTmFtZT1cImgtNSB3LTUgdGV4dC1lbWVyYWxkLTMwMFwiIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICApIDogYWN0aXZlID8gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8TG9hZGVyMiBjbGFzc05hbWU9XCJoLTUgdy01IGFuaW1hdGUtc3BpbiB0ZXh0LWJsdWUtMzAwXCIgLz5cclxuICAgICAgICAgICAgICAgICAgICAgICkgOiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC0zIHctMyByb3VuZGVkLWZ1bGwgYm9yZGVyIGJvcmRlci1zbGF0ZS02MDBcIiAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgKX1cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwiZm9udC1tZWRpdW0gdGV4dC13aGl0ZVwiPntsYWJlbH08L3A+XHJcbiAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0xIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAge2NvbXBsZXRlZCA/ICdDb21wbGV0ZWQnIDogYWN0aXZlID8gdXBsb2FkLnN0YXR1c01lc3NhZ2UgOiAnV2FpdGluZyd9XHJcbiAgICAgICAgICAgICAgICAgICAgICA8L3A+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICB9KX1cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LThcIj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtMiBvdmVyZmxvdy1oaWRkZW4gcm91bmRlZC1mdWxsIGJnLXNsYXRlLTgwMFwiPlxyXG4gICAgICAgICAgICAgICAgPGRpdlxyXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoLWZ1bGwgcm91bmRlZC1mdWxsIGJnLWdyYWRpZW50LXRvLXIgZnJvbS1ibHVlLTUwMCB2aWEtY3lhbi00MDAgdG8tb3JhbmdlLTQwMCB0cmFuc2l0aW9uLWFsbFwiXHJcbiAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IHdpZHRoOiBgJHtwcm9ncmVzc30lYCB9fVxyXG4gICAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj57cHJvZ3Jlc3N9JTwvcD5cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LThcIj5cclxuICAgICAgICAgICAgICA8U3RhdHVzQmFubmVyXHJcbiAgICAgICAgICAgICAgICB0b25lPXtpc1JldHJ5U3RhdGUgPyAnZXJyb3InIDogdXBsb2FkLnBoYXNlID09PSAnc3VjY2VzcycgfHwgdXBsb2FkLnBoYXNlID09PSAnZW1wdHktZ3JhcGgnID8gJ3N1Y2Nlc3MnIDogJ2luZm8nfVxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZT17dXBsb2FkLmVycm9yIHx8IHVwbG9hZC5zdGF0dXNNZXNzYWdlfVxyXG4gICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC04IGZsZXggZmxleC13cmFwIGp1c3RpZnktY2VudGVyIGdhcC0zXCI+XHJcbiAgICAgICAgICAgICAge2lzUmV0cnlTdGF0ZSA/IChcclxuICAgICAgICAgICAgICAgIDxCdXR0b24gb25DbGljaz17KCkgPT4gYmVnaW5Qcm9jZXNzaW5nKCkuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKX0+UmV0cnkgUHJvY2Vzc2luZzwvQnV0dG9uPlxyXG4gICAgICAgICAgICAgICkgOiBudWxsfVxyXG4gICAgICAgICAgICAgIHsodXBsb2FkLnBoYXNlID09PSAnc3VjY2VzcycgfHwgdXBsb2FkLnBoYXNlID09PSAnZW1wdHktZ3JhcGgnKSAmJiBncmFwaC5zdGF0dXMgPT09ICdyZWFkeScgPyAoXHJcbiAgICAgICAgICAgICAgICA8QnV0dG9uIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvYXBwJyl9Pk9wZW4gV29ya3NwYWNlPC9CdXR0b24+XHJcbiAgICAgICAgICAgICAgKSA6IG51bGx9XHJcbiAgICAgICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PVwic2Vjb25kYXJ5XCIgb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy8nKX0+XHJcbiAgICAgICAgICAgICAgICBCYWNrIHRvIFVwbG9hZFxyXG4gICAgICAgICAgICAgIDwvQnV0dG9uPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgIDxQcm9jZXNzaW5nQWN0aXZpdHlQYW5lbCBzdGF0dXM9e3VwbG9hZC5wcm9jZXNzaW5nU3RhdHVzfSAvPlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICA8L2Rpdj5cclxuICAgIDwvZGl2PlxyXG4gICk7XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgR3JhcGhEYXRhLCBHcmFwaEVkZ2UsIEdyYXBoTm9kZSwgR3JhcGhTdW1tYXJ5IH0gZnJvbSAnLi4vdHlwZXMvYXBwJztcclxuXHJcbmV4cG9ydCBjb25zdCBUWVBFX0NPTE9SUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICBzb2Z0d2FyZTogJyM2MGE1ZmEnLFxyXG4gIGRhdGE6ICcjMzRkMzk5JyxcclxuICBpbnRlcmZhY2U6ICcjYzA4NGZjJyxcclxuICBoYXJkd2FyZTogJyNmYjkyM2MnLFxyXG4gIGh1bWFuOiAnI2Y0NzJiNicsXHJcbiAgb3RoZXI6ICcjOTRhM2I4JyxcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBSSVNLX0NPTE9SUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICBsb3c6ICcjMjJjNTVlJyxcclxuICBtZWRpdW06ICcjZjU5ZTBiJyxcclxuICBoaWdoOiAnI2VmNDQ0NCcsXHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZUNvbG9yKHR5cGU6IHN0cmluZykge1xyXG4gIHJldHVybiBUWVBFX0NPTE9SU1t0eXBlXSB8fCBUWVBFX0NPTE9SUy5vdGhlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFJpc2tDb2xvcihsZXZlbDogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIFJJU0tfQ09MT1JTW2xldmVsXSB8fCAnIzk0YTNiOCc7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRMYWJlbCh2YWx1ZTogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIHZhbHVlXHJcbiAgICAuc3BsaXQoL1tfLVxcc10rLylcclxuICAgIC5maWx0ZXIoQm9vbGVhbilcclxuICAgIC5tYXAoKHNlZ21lbnQpID0+IHNlZ21lbnQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzZWdtZW50LnNsaWNlKDEpKVxyXG4gICAgLmpvaW4oJyAnKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldExpbmtFbmRwb2ludElkKGVuZHBvaW50OiBHcmFwaEVkZ2VbJ3NvdXJjZSddIHwgR3JhcGhFZGdlWyd0YXJnZXQnXSkge1xyXG4gIHJldHVybiB0eXBlb2YgZW5kcG9pbnQgPT09ICdzdHJpbmcnID8gZW5kcG9pbnQgOiBlbmRwb2ludC5pZDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbm5lY3Rpb25Db3VudChncmFwaDogR3JhcGhEYXRhLCBub2RlSWQ6IHN0cmluZykge1xyXG4gIHJldHVybiBncmFwaC5saW5rcy5maWx0ZXIoKGxpbmspID0+IGdldExpbmtFbmRwb2ludElkKGxpbmsuc291cmNlKSA9PT0gbm9kZUlkIHx8IGdldExpbmtFbmRwb2ludElkKGxpbmsudGFyZ2V0KSA9PT0gbm9kZUlkKS5sZW5ndGg7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBidWlsZEdyYXBoU3VtbWFyeShncmFwaDogR3JhcGhEYXRhKTogR3JhcGhTdW1tYXJ5IHtcclxuICBjb25zdCB0b3RhbENvbXBvbmVudHMgPSBncmFwaC5ub2Rlcy5sZW5ndGg7XHJcbiAgY29uc3QgdG90YWxSZWxhdGlvbnNoaXBzID0gZ3JhcGgubGlua3MubGVuZ3RoO1xyXG4gIGNvbnN0IGF2Z1Jpc2sgPVxyXG4gICAgdG90YWxDb21wb25lbnRzID09PSAwXHJcbiAgICAgID8gMFxyXG4gICAgICA6IE51bWJlcigoZ3JhcGgubm9kZXMucmVkdWNlKChzdW0sIG5vZGUpID0+IHN1bSArIG5vZGUucmlza1Njb3JlLCAwKSAvIHRvdGFsQ29tcG9uZW50cykudG9GaXhlZCgxKSk7XHJcbiAgY29uc3QgaGlnaFJpc2tOb2RlcyA9IGdyYXBoLm5vZGVzLmZpbHRlcigobm9kZSkgPT4gbm9kZS5yaXNrTGV2ZWwgPT09ICdoaWdoJykubGVuZ3RoO1xyXG4gIGNvbnN0IGhpZ2hlc3RSaXNrTm9kZSA9IFsuLi5ncmFwaC5ub2Rlc10uc29ydCgobGVmdCwgcmlnaHQpID0+IHJpZ2h0LnJpc2tTY29yZSAtIGxlZnQucmlza1Njb3JlKVswXSA/PyBudWxsO1xyXG5cclxuICBjb25zdCByaXNrRGlzdHJpYnV0aW9uID0gW1xyXG4gICAgeyBsYWJlbDogJ0xvdycsIGtleTogJ2xvdycsIGNvdW50OiBncmFwaC5ub2Rlcy5maWx0ZXIoKG5vZGUpID0+IG5vZGUucmlza0xldmVsID09PSAnbG93JykubGVuZ3RoIH0sXHJcbiAgICB7IGxhYmVsOiAnTWVkaXVtJywga2V5OiAnbWVkaXVtJywgY291bnQ6IGdyYXBoLm5vZGVzLmZpbHRlcigobm9kZSkgPT4gbm9kZS5yaXNrTGV2ZWwgPT09ICdtZWRpdW0nKS5sZW5ndGggfSxcclxuICAgIHsgbGFiZWw6ICdIaWdoJywga2V5OiAnaGlnaCcsIGNvdW50OiBncmFwaC5ub2Rlcy5maWx0ZXIoKG5vZGUpID0+IG5vZGUucmlza0xldmVsID09PSAnaGlnaCcpLmxlbmd0aCB9LFxyXG4gIF07XHJcblxyXG4gIGNvbnN0IHR5cGVDb3VudHMgPSBncmFwaC5ub2Rlcy5yZWR1Y2U8UmVjb3JkPHN0cmluZywgbnVtYmVyPj4oKGFjY3VtdWxhdG9yLCBub2RlKSA9PiB7XHJcbiAgICBhY2N1bXVsYXRvcltub2RlLnR5cGVdID0gKGFjY3VtdWxhdG9yW25vZGUudHlwZV0gPz8gMCkgKyAxO1xyXG4gICAgcmV0dXJuIGFjY3VtdWxhdG9yO1xyXG4gIH0sIHt9KTtcclxuXHJcbiAgY29uc3QgdHlwZURpc3RyaWJ1dGlvbiA9IE9iamVjdC5lbnRyaWVzKHR5cGVDb3VudHMpXHJcbiAgICAubWFwKChbdHlwZSwgY291bnRdKSA9PiAoeyB0eXBlLCBjb3VudCB9KSlcclxuICAgIC5zb3J0KChsZWZ0LCByaWdodCkgPT4gcmlnaHQuY291bnQgLSBsZWZ0LmNvdW50KTtcclxuXHJcbiAgY29uc3QgbW9zdENvbm5lY3RlZE5vZGVzID0gWy4uLmdyYXBoLm5vZGVzXVxyXG4gICAgLm1hcCgobm9kZSkgPT4gKHsgbm9kZSwgY29ubmVjdGlvbnM6IGdldENvbm5lY3Rpb25Db3VudChncmFwaCwgbm9kZS5pZCkgfSkpXHJcbiAgICAuc29ydCgobGVmdCwgcmlnaHQpID0+IHJpZ2h0LmNvbm5lY3Rpb25zIC0gbGVmdC5jb25uZWN0aW9ucylcclxuICAgIC5zbGljZSgwLCA1KTtcclxuXHJcbiAgY29uc3QgdG9wUmlza05vZGVzID0gWy4uLmdyYXBoLm5vZGVzXS5zb3J0KChsZWZ0LCByaWdodCkgPT4gcmlnaHQucmlza1Njb3JlIC0gbGVmdC5yaXNrU2NvcmUpLnNsaWNlKDAsIDgpO1xyXG5cclxuICBjb25zdCBibGFzdFJhZGl1c0xlYWRlcnMgPSBbLi4uZ3JhcGgubm9kZXNdXHJcbiAgICAubWFwKChub2RlKSA9PiAoeyBub2RlLCBjb3VudDogbm9kZS5ibGFzdFJhZGl1cyB9KSlcclxuICAgIC5zb3J0KChsZWZ0LCByaWdodCkgPT4gcmlnaHQuY291bnQgLSBsZWZ0LmNvdW50KVxyXG4gICAgLnNsaWNlKDAsIDYpO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgdG90YWxDb21wb25lbnRzLFxyXG4gICAgdG90YWxSZWxhdGlvbnNoaXBzLFxyXG4gICAgYXZnUmlzayxcclxuICAgIGhpZ2hSaXNrTm9kZXMsXHJcbiAgICBoaWdoZXN0Umlza05vZGUsXHJcbiAgICByaXNrRGlzdHJpYnV0aW9uLFxyXG4gICAgdHlwZURpc3RyaWJ1dGlvbixcclxuICAgIG1vc3RDb25uZWN0ZWROb2RlcyxcclxuICAgIHRvcFJpc2tOb2RlcyxcclxuICAgIGJsYXN0UmFkaXVzTGVhZGVycyxcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Tm9kZUJ5SWQoZ3JhcGg6IEdyYXBoRGF0YSwgbm9kZUlkOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkKTogR3JhcGhOb2RlIHwgbnVsbCB7XHJcbiAgaWYgKCFub2RlSWQpIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuICByZXR1cm4gZ3JhcGgubm9kZUluZGV4W25vZGVJZF0gPz8gbnVsbDtcclxufVxyXG4iLCAiaW1wb3J0IHsgQWN0aXZpdHksIEFsZXJ0VHJpYW5nbGUsIEJveGVzLCBHaXRCcmFuY2ggfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xyXG5pbXBvcnQgdHlwZSB7IEdyYXBoRGF0YSB9IGZyb20gJy4uL3R5cGVzL2FwcCc7XHJcbmltcG9ydCB7IGJ1aWxkR3JhcGhTdW1tYXJ5LCBmb3JtYXRMYWJlbCwgZ2V0Umlza0NvbG9yLCBnZXRUeXBlQ29sb3IgfSBmcm9tICcuLi9saWIvc2VsZWN0b3JzJztcclxuXHJcbmludGVyZmFjZSBTeXN0ZW1PdmVydmlld1Byb3BzIHtcclxuICBncmFwaERhdGE6IEdyYXBoRGF0YTtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gU3lzdGVtT3ZlcnZpZXcoeyBncmFwaERhdGEgfTogU3lzdGVtT3ZlcnZpZXdQcm9wcykge1xyXG4gIGNvbnN0IHN1bW1hcnkgPSBidWlsZEdyYXBoU3VtbWFyeShncmFwaERhdGEpO1xyXG5cclxuICByZXR1cm4gKFxyXG4gICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgb3ZlcmZsb3cteS1hdXRvIHAtNiBtZDpwLThcIj5cclxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJteC1hdXRvIG1heC13LTd4bCBzcGFjZS15LThcIj5cclxuICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYm9sZCB0ZXh0LXdoaXRlXCI+U3lzdGVtIE92ZXJ2aWV3PC9oMT5cclxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgbWF4LXctM3hsIHRleHQtc20gbGVhZGluZy03IHRleHQtc2xhdGUtMzAwXCI+XHJcbiAgICAgICAgICAgIFN1bW1hcnkgY2FyZHMgYW5kIGJyZWFrZG93bnMgYXJlIGNvbXB1dGVkIGRpcmVjdGx5IGZyb20gdGhlIGFjdGl2ZSBncmFwaCBiZWNhdXNlIHRoZSBjdXJyZW50IGJhY2tlbmQgY29udHJhY3QgZG9lcyBub3QgcHJvdmlkZSBhIHNlcGFyYXRlIGFyY2hpdGVjdHVyZSBzdW1tYXJ5IGVuZHBvaW50IHlldC5cclxuICAgICAgICAgIDwvcD5cclxuICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdhcC00IG1kOmdyaWQtY29scy0yIHhsOmdyaWQtY29scy00XCI+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNVwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxyXG4gICAgICAgICAgICAgIDxCb3hlcyBjbGFzc05hbWU9XCJoLTggdy04IHRleHQtYmx1ZS0zMDBcIiAvPlxyXG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntzdW1tYXJ5LnRvdGFsQ29tcG9uZW50c308L3NwYW4+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5Ub3RhbCBDb21wb25lbnRzPC9wPlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNVwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxyXG4gICAgICAgICAgICAgIDxHaXRCcmFuY2ggY2xhc3NOYW1lPVwiaC04IHctOCB0ZXh0LXB1cnBsZS0zMDBcIiAvPlxyXG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntzdW1tYXJ5LnRvdGFsUmVsYXRpb25zaGlwc308L3NwYW4+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0zIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5SZWxhdGlvbnNoaXBzPC9wPlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNVwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxyXG4gICAgICAgICAgICAgIDxBbGVydFRyaWFuZ2xlIGNsYXNzTmFtZT1cImgtOCB3LTggdGV4dC1vcmFuZ2UtMzAwXCIgLz5cclxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LTR4bCBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57c3VtbWFyeS5oaWdoUmlza05vZGVzfTwvc3Bhbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgdGV4dC1zbSB0ZXh0LXNsYXRlLTQwMFwiPkhpZ2ggUmlzayBDb21wb25lbnRzPC9wPlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNVwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxyXG4gICAgICAgICAgICAgIDxBY3Rpdml0eSBjbGFzc05hbWU9XCJoLTggdy04IHRleHQtZW1lcmFsZC0zMDBcIiAvPlxyXG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntzdW1tYXJ5LmF2Z1Jpc2t9PC9zcGFuPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMyB0ZXh0LXNtIHRleHQtc2xhdGUtNDAwXCI+QXZlcmFnZSBSaXNrPC9wPlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImdsYXNzLXBhbmVsIHJvdW5kZWQtM3hsIHAtNlwiPlxyXG4gICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+TW9zdCBDb25uZWN0ZWQgQ29tcG9uZW50czwvaDI+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgc3BhY2UteS00XCI+XHJcbiAgICAgICAgICAgIHtzdW1tYXJ5Lm1vc3RDb25uZWN0ZWROb2Rlcy5tYXAoKHsgbm9kZSwgY29ubmVjdGlvbnMgfSwgaW5kZXgpID0+IChcclxuICAgICAgICAgICAgICA8ZGl2IGtleT17bm9kZS5pZH0gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHJvdW5kZWQtM3hsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MC83MCBwLTRcIj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTRcIj5cclxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGgtMTAgdy0xMCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC0yeGwgYmctYmx1ZS01MDAvMTUgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtYmx1ZS0xMDBcIj5cclxuICAgICAgICAgICAgICAgICAgICB7aW5kZXggKyAxfVxyXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPntub2RlLm5hbWV9PC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0xIHRleHQtc20gdGV4dC1zbGF0ZS00MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgIHtmb3JtYXRMYWJlbChub2RlLnR5cGUpfSBcdTAwQjcge25vZGUuaWR9XHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtcmlnaHRcIj5cclxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LTJ4bCBmb250LXNlbWlib2xkIHRleHQtYmx1ZS0zMDBcIj57Y29ubmVjdGlvbnN9PC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS01MDBcIj5Db25uZWN0aW9uczwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICkpfVxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9zZWN0aW9uPlxyXG5cclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ2FwLTggeGw6Z3JpZC1jb2xzLVsxZnJfMWZyXVwiPlxyXG4gICAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiZ2xhc3MtcGFuZWwgcm91bmRlZC0zeGwgcC02XCI+XHJcbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZVwiPkNvbXBvbmVudCBUeXBlIEJyZWFrZG93bjwvaDI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiBzcGFjZS15LTRcIj5cclxuICAgICAgICAgICAgICB7c3VtbWFyeS50eXBlRGlzdHJpYnV0aW9uLm1hcCgoZW50cnkpID0+IChcclxuICAgICAgICAgICAgICAgIDxkaXYga2V5PXtlbnRyeS50eXBlfSBjbGFzc05hbWU9XCJyb3VuZGVkLTN4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNzAgcC00XCI+XHJcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaC0zIHctMyByb3VuZGVkLWZ1bGxcIiBzdHlsZT17eyBiYWNrZ3JvdW5kQ29sb3I6IGdldFR5cGVDb2xvcihlbnRyeS50eXBlKSB9fSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1tZWRpdW0gdGV4dC13aGl0ZVwiPntmb3JtYXRMYWJlbChlbnRyeS50eXBlKX08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57ZW50cnkuY291bnR9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICkpfVxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDwvc2VjdGlvbj5cclxuXHJcbiAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJnbGFzcy1wYW5lbCByb3VuZGVkLTN4bCBwLTZcIj5cclxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCI+UmlzayBEaXN0cmlidXRpb248L2gyPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgc3BhY2UteS00XCI+XHJcbiAgICAgICAgICAgICAge3N1bW1hcnkucmlza0Rpc3RyaWJ1dGlvbi5tYXAoKGVudHJ5KSA9PiAoXHJcbiAgICAgICAgICAgICAgICA8ZGl2IGtleT17ZW50cnkua2V5fSBjbGFzc05hbWU9XCJyb3VuZGVkLTN4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1zbGF0ZS05NTAvNzAgcC00XCI+XHJcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1tZWRpdW0gdGV4dC13aGl0ZVwiPntlbnRyeS5sYWJlbH08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LXNlbWlib2xkIHRleHQtd2hpdGVcIj57ZW50cnkuY291bnR9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0zIGgtMiBvdmVyZmxvdy1oaWRkZW4gcm91bmRlZC1mdWxsIGJnLXNsYXRlLTgwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXZcclxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImgtZnVsbCByb3VuZGVkLWZ1bGxcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGAke3N1bW1hcnkudG90YWxDb21wb25lbnRzID09PSAwID8gMCA6IChlbnRyeS5jb3VudCAvIHN1bW1hcnkudG90YWxDb21wb25lbnRzKSAqIDEwMH0lYCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBnZXRSaXNrQ29sb3IoZW50cnkua2V5KSxcclxuICAgICAgICAgICAgICAgICAgICAgIH19XHJcbiAgICAgICAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICApKX1cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L3NlY3Rpb24+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgPC9kaXY+XHJcbiAgKTtcclxufVxyXG4iLCAiaW1wb3J0IGFzc2VydCBmcm9tICdub2RlOmFzc2VydC9zdHJpY3QnO1xyXG5pbXBvcnQgdGVzdCBmcm9tICdub2RlOnRlc3QnO1xyXG5pbXBvcnQgdHlwZSB7IFJlYWN0Tm9kZSB9IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IHsgcmVuZGVyVG9TdGF0aWNNYXJrdXAgfSBmcm9tICdyZWFjdC1kb20vc2VydmVyJztcclxuaW1wb3J0IHsgTWVtb3J5Um91dGVyIH0gZnJvbSAncmVhY3Qtcm91dGVyLWRvbSc7XHJcbmltcG9ydCB7IGNyZWF0ZU1vY2tDb250ZXh0LCBjcmVhdGVTYW1wbGVHcmFwaERhdGEsIGluc3RhbGxSdW50aW1lV2luZG93Q29uZmlnIH0gZnJvbSAnLi90ZXN0LXV0aWxzJztcclxuXHJcbmluc3RhbGxSdW50aW1lV2luZG93Q29uZmlnKCk7XHJcblxyXG5jb25zdCB7IEFwcENvbnRleHQgfSA9IGF3YWl0IGltcG9ydCgnLi4vc3JjL3N0YXRlL0FwcENvbnRleHQnKTtcclxuY29uc3QgeyBkZWZhdWx0OiBMYW5kaW5nUGFnZSB9ID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvcGFnZXMvTGFuZGluZ1BhZ2UnKTtcclxuY29uc3QgeyBkZWZhdWx0OiBQcm9jZXNzaW5nUGFnZSB9ID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvcGFnZXMvUHJvY2Vzc2luZ1BhZ2UnKTtcclxuY29uc3QgeyBkZWZhdWx0OiBTeXN0ZW1PdmVydmlldyB9ID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvY29tcG9uZW50cy9TeXN0ZW1PdmVydmlldycpO1xyXG5cclxuZnVuY3Rpb24gcmVuZGVyV2l0aENvbnRleHQoXHJcbiAgZWxlbWVudDogUmVhY3ROb2RlLFxyXG4gIGNvbnRleHRPdmVycmlkZXMgPSB7fSxcclxuICBpbml0aWFsRW50cmllcyA9IFsnLyddXHJcbikge1xyXG4gIHJldHVybiByZW5kZXJUb1N0YXRpY01hcmt1cChcclxuICAgIDxNZW1vcnlSb3V0ZXIgaW5pdGlhbEVudHJpZXM9e2luaXRpYWxFbnRyaWVzfT5cclxuICAgICAgPEFwcENvbnRleHQuUHJvdmlkZXIgdmFsdWU9e2NyZWF0ZU1vY2tDb250ZXh0KGNvbnRleHRPdmVycmlkZXMpfT57ZWxlbWVudH08L0FwcENvbnRleHQuUHJvdmlkZXI+XHJcbiAgICA8L01lbW9yeVJvdXRlcj5cclxuICApO1xyXG59XHJcblxyXG50ZXN0KCdsYW5kaW5nIHBhZ2UgcmVuZGVycyB0aGUgdXBsb2FkIHdvcmtzcGFjZSBjb250ZW50JywgKCkgPT4ge1xyXG4gIGNvbnN0IGh0bWwgPSByZW5kZXJXaXRoQ29udGV4dCg8TGFuZGluZ1BhZ2UgLz4pO1xyXG5cclxuICBhc3NlcnQubWF0Y2goaHRtbCwgL1R3aW5HcmFwaE9wcy8pO1xyXG4gIGFzc2VydC5tYXRjaChodG1sLCAvVXBsb2FkIFN5c3RlbSBEb2N1bWVudGF0aW9uLyk7XHJcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9TdXBwb3J0ZWQgZm9ybWF0czogXFwubWQgYW5kIFxcLnR4dC8pO1xyXG59KTtcclxuXHJcbnRlc3QoJ3Byb2Nlc3NpbmcgcGFnZSByZW5kZXJzIHRoZSBhY3RpdmUgcHJvY2Vzc2luZyBzdGF0ZScsICgpID0+IHtcclxuICBjb25zdCBodG1sID0gcmVuZGVyV2l0aENvbnRleHQoXHJcbiAgICA8UHJvY2Vzc2luZ1BhZ2UgLz4sXHJcbiAgICB7XHJcbiAgICAgIHVwbG9hZDoge1xyXG4gICAgICAgIC4uLmNyZWF0ZU1vY2tDb250ZXh0KCkudXBsb2FkLFxyXG4gICAgICAgIHBoYXNlOiAndXBsb2FkaW5nJyxcclxuICAgICAgICBzZWxlY3RlZEZpbGU6IG5ldyBGaWxlKFsnaGVsbG8nXSwgJ3N5c3RlbS5tZCcsIHsgdHlwZTogJ3RleHQvbWFya2Rvd24nIH0pLFxyXG4gICAgICAgIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWRpbmcgc3lzdGVtLm1kLi4uJyxcclxuICAgICAgICBzdGFydGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgWycvcHJvY2Vzc2luZyddXHJcbiAgKTtcclxuXHJcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9Qcm9jZXNzaW5nIFlvdXIgRG9jdW1lbnRhdGlvbi8pO1xyXG4gIGFzc2VydC5tYXRjaChodG1sLCAvVXBsb2FkaW5nIGRvY3VtZW50Lyk7XHJcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9VcGxvYWRpbmcgc3lzdGVtXFwubWQvKTtcclxufSk7XHJcblxyXG50ZXN0KCdzeXN0ZW0gb3ZlcnZpZXcgcmVuZGVycyB0aGUgbG9hZGVkIHdvcmtzcGFjZSBzdW1tYXJ5JywgKCkgPT4ge1xyXG4gIGNvbnN0IGdyYXBoRGF0YSA9IGNyZWF0ZVNhbXBsZUdyYXBoRGF0YSgpO1xyXG4gIGNvbnN0IGh0bWwgPSByZW5kZXJUb1N0YXRpY01hcmt1cCg8U3lzdGVtT3ZlcnZpZXcgZ3JhcGhEYXRhPXtncmFwaERhdGF9IC8+KTtcclxuXHJcbiAgYXNzZXJ0Lm1hdGNoKGh0bWwsIC9TeXN0ZW0gT3ZlcnZpZXcvKTtcclxuICBhc3NlcnQubWF0Y2goaHRtbCwgL1RvdGFsIENvbXBvbmVudHMvKTtcclxuICBhc3NlcnQubWF0Y2goaHRtbCwgL1JlbGF0aW9uc2hpcHMvKTtcclxuICBhc3NlcnQubWF0Y2goaHRtbCwgL01vc3QgQ29ubmVjdGVkIENvbXBvbmVudHMvKTtcclxuICBhc3NlcnQubWF0Y2goaHRtbCwgL0FQSSBTZXJ2aWNlLyk7XHJcbn0pO1xyXG4iLCAiZXhwb3J0IGZ1bmN0aW9uIGluc3RhbGxSdW50aW1lV2luZG93Q29uZmlnKG92ZXJyaWRlczogUGFydGlhbDxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXI+PiA9IHt9KSB7XHJcbiAgY29uc3QgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gKGNhbGxiYWNrOiBGcmFtZVJlcXVlc3RDYWxsYmFjaykgPT4gc2V0VGltZW91dCgoKSA9PiBjYWxsYmFjayhEYXRlLm5vdygpKSwgMCk7XHJcbiAgY29uc3QgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSAoaGFuZGxlOiBudW1iZXIpID0+IGNsZWFyVGltZW91dChoYW5kbGUpO1xyXG5cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ3dpbmRvdycsIHtcclxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIHdyaXRhYmxlOiB0cnVlLFxyXG4gICAgdmFsdWU6IHtcclxuICAgICAgX19UV0lOX0NPTkZJR19fOiB7XHJcbiAgICAgICAgTUFYX1VQTE9BRF9NQjogMTAsXHJcbiAgICAgICAgUFJPQ0VTU0lOR19USU1FT1VUX01TOiA5MDAwMCxcclxuICAgICAgICBBUFBfRU5WOiAndGVzdCcsXHJcbiAgICAgICAgLi4ub3ZlcnJpZGVzLFxyXG4gICAgICB9LFxyXG4gICAgICBzZXRUaW1lb3V0LFxyXG4gICAgICBjbGVhclRpbWVvdXQsXHJcbiAgICAgIHNldEludGVydmFsLFxyXG4gICAgICBjbGVhckludGVydmFsLFxyXG4gICAgICBhZGRFdmVudExpc3RlbmVyOiAoKSA9PiB7fSxcclxuICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogKCkgPT4ge30sXHJcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSxcclxuICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUsXHJcbiAgICAgIGRldmljZVBpeGVsUmF0aW86IDEsXHJcbiAgICB9LFxyXG4gIH0pO1xyXG5cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ2RvY3VtZW50Jywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZToge1xyXG4gICAgICBjcmVhdGVFbGVtZW50OiAoKSA9PiAoe1xyXG4gICAgICAgIGdldENvbnRleHQ6ICgpID0+ICh7fSksXHJcbiAgICAgICAgc3R5bGU6IHt9LFxyXG4gICAgICAgIHNldEF0dHJpYnV0ZTogKCkgPT4ge30sXHJcbiAgICAgICAgYXBwZW5kQ2hpbGQ6ICgpID0+IHt9LFxyXG4gICAgICB9KSxcclxuICAgICAgYm9keToge1xyXG4gICAgICAgIGFwcGVuZENoaWxkOiAoKSA9PiB7fSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSk7XHJcblxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnbmF2aWdhdG9yJywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZToge1xyXG4gICAgICB1c2VyQWdlbnQ6ICdub2RlLmpzJyxcclxuICAgIH0sXHJcbiAgfSk7XHJcblxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAncmVxdWVzdEFuaW1hdGlvbkZyYW1lJywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZTogcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxyXG4gIH0pO1xyXG5cclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgJ2NhbmNlbEFuaW1hdGlvbkZyYW1lJywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZTogY2FuY2VsQW5pbWF0aW9uRnJhbWUsXHJcbiAgfSk7XHJcblxyXG4gIGlmICghKCdSZXNpemVPYnNlcnZlcicgaW4gZ2xvYmFsVGhpcykpIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnUmVzaXplT2JzZXJ2ZXInLCB7XHJcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICAgIHZhbHVlOiBjbGFzcyBSZXNpemVPYnNlcnZlciB7XHJcbiAgICAgICAgb2JzZXJ2ZSgpIHt9XHJcbiAgICAgICAgdW5vYnNlcnZlKCkge31cclxuICAgICAgICBkaXNjb25uZWN0KCkge31cclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNhbXBsZUdyYXBoRGF0YSgpIHtcclxuICBjb25zdCBub2RlcyA9IFtcclxuICAgIHtcclxuICAgICAgaWQ6ICdhcGknLFxyXG4gICAgICBuYW1lOiAnQVBJIFNlcnZpY2UnLFxyXG4gICAgICB0eXBlOiAnc29mdHdhcmUnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvcmUgQVBJJyxcclxuICAgICAgcmlza1Njb3JlOiA4MixcclxuICAgICAgcmlza0xldmVsOiAnaGlnaCcsXHJcbiAgICAgIGRlZ3JlZTogMixcclxuICAgICAgYmV0d2Vlbm5lc3M6IDAuNTUsXHJcbiAgICAgIGNsb3NlbmVzczogMC42NyxcclxuICAgICAgYmxhc3RSYWRpdXM6IDMsXHJcbiAgICAgIGRlcGVuZGVuY3lTcGFuOiAyLFxyXG4gICAgICByaXNrRXhwbGFuYXRpb246ICdIYW5kbGVzIGNvcmUgcmVxdWVzdHMuJyxcclxuICAgICAgc291cmNlOiAnc2FtcGxlJyxcclxuICAgICAgZGVwZW5kZW5jaWVzOiBbJ2RiJ10sXHJcbiAgICAgIGRlcGVuZGVudHM6IFsnZnJvbnRlbmQnXSxcclxuICAgICAgdmFsOiAzNixcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGlkOiAnZGInLFxyXG4gICAgICBuYW1lOiAnRGF0YWJhc2UnLFxyXG4gICAgICB0eXBlOiAnZGF0YScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUGVyc2lzdGVuY2UgbGF5ZXInLFxyXG4gICAgICByaXNrU2NvcmU6IDQ0LFxyXG4gICAgICByaXNrTGV2ZWw6ICdtZWRpdW0nLFxyXG4gICAgICBkZWdyZWU6IDEsXHJcbiAgICAgIGJldHdlZW5uZXNzOiAwLjIyLFxyXG4gICAgICBjbG9zZW5lc3M6IDAuNDQsXHJcbiAgICAgIGJsYXN0UmFkaXVzOiAxLFxyXG4gICAgICBkZXBlbmRlbmN5U3BhbjogMSxcclxuICAgICAgcmlza0V4cGxhbmF0aW9uOiAnU3RvcmVzIHJlY29yZHMuJyxcclxuICAgICAgc291cmNlOiAnc2FtcGxlJyxcclxuICAgICAgZGVwZW5kZW5jaWVzOiBbXSxcclxuICAgICAgZGVwZW5kZW50czogWydhcGknXSxcclxuICAgICAgdmFsOiAyOCxcclxuICAgIH0sXHJcbiAgXTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHNvdXJjZTogJ3NhbXBsZScsXHJcbiAgICBub2RlcyxcclxuICAgIGxpbmtzOiBbXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ2FwaS1kYi0wJyxcclxuICAgICAgICBzb3VyY2U6ICdhcGknLFxyXG4gICAgICAgIHRhcmdldDogJ2RiJyxcclxuICAgICAgICByZWxhdGlvbjogJ2RlcGVuZHNfb24nLFxyXG4gICAgICAgIHJhdGlvbmFsZTogJ1JlYWRzIGFuZCB3cml0ZXMgcmVjb3Jkcy4nLFxyXG4gICAgICB9LFxyXG4gICAgXSxcclxuICAgIG5vZGVJbmRleDogT2JqZWN0LmZyb21FbnRyaWVzKG5vZGVzLm1hcCgobm9kZSkgPT4gW25vZGUuaWQsIG5vZGVdKSksXHJcbiAgICByZWxhdGlvblR5cGVzOiBbJ2RlcGVuZHNfb24nXSxcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTW9ja0NvbnRleHQob3ZlcnJpZGVzID0ge30pIHtcclxuICByZXR1cm4ge1xyXG4gICAgdXBsb2FkOiB7XG4gICAgICBwaGFzZTogJ2lkbGUnLFxuICAgICAgc2VsZWN0ZWRGaWxlOiBudWxsLFxuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBzdGF0dXNNZXNzYWdlOiAnVXBsb2FkIGEgLm1kIG9yIC50eHQgZmlsZSB0byBidWlsZCB0aGUgZ3JhcGguJyxcbiAgICAgIGluZ2VzdGlvbklkOiBudWxsLFxuICAgICAgaW5nZXN0aW9uOiBudWxsLFxuICAgICAgcHJvY2Vzc2luZ1N0YXR1czogbnVsbCxcbiAgICAgIHN0YXJ0ZWRBdDogbnVsbCxcbiAgICAgIGNvbXBsZXRlZEF0OiBudWxsLFxuICAgICAgcmV0cnlDb3VudDogMCxcbiAgICB9LFxuICAgIGdyYXBoOiB7XHJcbiAgICAgIHN0YXR1czogJ2lkbGUnLFxyXG4gICAgICBkYXRhOiBudWxsLFxyXG4gICAgICBlcnJvcjogbnVsbCxcclxuICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxyXG4gICAgfSxcclxuICAgIHNldERyYWdBY3RpdmU6ICgpID0+IHt9LFxyXG4gICAgc2VsZWN0RmlsZTogKCkgPT4gdHJ1ZSxcclxuICAgIGNsZWFyU2VsZWN0ZWRGaWxlOiAoKSA9PiB7fSxcclxuICAgIGJlZ2luUHJvY2Vzc2luZzogYXN5bmMgKCkgPT4ge30sXHJcbiAgICBsb2FkR3JhcGg6IGFzeW5jICgpID0+IHt9LFxyXG4gICAgcmVzZXRVcGxvYWRTdGF0ZTogKCkgPT4ge30sXHJcbiAgICAuLi5vdmVycmlkZXMsXHJcbiAgfTtcclxufVxyXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQUdBLFNBQVMsYUFBYSxPQUFnQixPQUFlO0FBQ25ELE1BQUksT0FBTyxVQUFVLFVBQVU7QUFDN0IsVUFBTSxJQUFJLE1BQU0sb0NBQW9DLEtBQUssa0JBQWtCO0FBQUEsRUFDN0U7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLGFBQWEsT0FBZ0IsT0FBZTtBQUNuRCxNQUFJLE9BQU8sVUFBVSxZQUFZLE9BQU8sTUFBTSxLQUFLLEdBQUc7QUFDcEQsVUFBTSxJQUFJLE1BQU0sb0NBQW9DLEtBQUssa0JBQWtCO0FBQUEsRUFDN0U7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLFlBQWUsT0FBZ0IsT0FBZTtBQUNyRCxNQUFJLENBQUMsTUFB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dURBQXVELE1BQU07QUFDaEUsUUFBTSxPQUFPO0FBQUEsSUFDWCxnQkFBQUYsS0FBQ0csaUJBQUEsRUFBZTtBQUFBLElBQ2hCO0FBQUEsTUFDRSxRQUFRO0FBQUEsUUFDTixHQUFHLGtCQUFrQixFQUFFO0FBQUEsUUFDdkIsT0FBTztBQUFBLFFBQ1AsY0FBYyxJQUFJLEtBQUssQ0FBQyxPQUFPLEdBQUcsYUFBYSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFBQSxRQUN4RSxlQUFlO0FBQUEsUUFDZixXQUFXLEtBQUssSUFBSTtBQUFBLE1BQ3RCO0FBQUEsSUFDRjtBQUFBLElBQ0EsQ0FBQyxhQUFhO0FBQUEsRUFDaEI7QUFFQSxTQUFPLE1BQU0sTUFBTSwrQkFBK0I7QUFDbEQsU0FBTyxNQUFNLE1BQU0sb0JBQW9CO0FBQ3ZDLFNBQU8sTUFBTSxNQUFNLHNCQUFzQjtBQUMzQyxDQUFDO0FBRUQsS0FBSyx3REFBd0QsTUFBTTtBQUNqRSxRQUFNLFlBQVksc0JBQXNCO0FBQ3hDLFFBQU0sT0FBTyxxQkFBcUIsZ0JBQUFILEtBQUNJLGlCQUFBLEVBQWUsV0FBc0IsQ0FBRTtBQUUxRSxTQUFPLE1BQU0sTUFBTSxpQkFBaUI7QUFDcEMsU0FBTyxNQUFNLE1BQU0sa0JBQWtCO0FBQ3JDLFNBQU8sTUFBTSxNQUFNLGVBQWU7QUFDbEMsU0FBTyxNQUFNLE1BQU0sMkJBQTJCO0FBQzlDLFNBQU8sTUFBTSxNQUFNLGFBQWE7QUFDbEMsQ0FBQzsiLAogICJuYW1lcyI6IFsianN4IiwgImpzeCIsICJqc3giLCAidXNlUmVmIiwgImpzeCIsICJqc3hzIiwgIkNoZWNrQ2lyY2xlMiIsICJqc3giLCAianN4cyIsICJ1c2VNZW1vIiwgInVzZVN0YXRlIiwgIkNoZWNrQ2lyY2xlMiIsICJMb2FkZXIyIiwgIk5ldHdvcmsiLCAidXNlTmF2aWdhdGUiLCAianN4IiwgImpzeHMiLCAiQWxlcnRUcmlhbmdsZSIsICJqc3giLCAianN4cyIsICJqc3giLCAiQXBwQ29udGV4dCIsICJMYW5kaW5nUGFnZSIsICJQcm9jZXNzaW5nUGFnZSIsICJTeXN0ZW1PdmVydmlldyJdCn0K
