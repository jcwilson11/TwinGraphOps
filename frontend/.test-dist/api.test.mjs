var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
var api_exports = {};
__export(api_exports, {
  ApiClientError: () => ApiClientError,
  UnsupportedEndpointError: () => UnsupportedEndpointError,
  getActiveDocumentArtifacts: () => getActiveDocumentArtifacts,
  getArchitectureSummary: () => getArchitectureSummary,
  getDocumentArtifactBundleDownloadUrl: () => getDocumentArtifactBundleDownloadUrl,
  getDocumentArtifactDownloadUrl: () => getDocumentArtifactDownloadUrl,
  getDocumentArtifacts: () => getDocumentArtifacts,
  getDocumentGraph: () => getDocumentGraph,
  getDocumentProcessingStatus: () => getDocumentProcessingStatus,
  getGraph: () => getGraph,
  getImpact: () => getImpact,
  getProcessingStatus: () => getProcessingStatus,
  getRisk: () => getRisk,
  getRiskRankedItems: () => getRiskRankedItems,
  seedDemoGraph: () => seedDemoGraph,
  uploadDocument: () => uploadDocument,
  uploadKnowledgeDocument: () => uploadKnowledgeDocument
});
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
async function getActiveDocumentArtifacts() {
  return request("/document/artifacts");
}
async function getDocumentArtifacts(ingestionId) {
  return request(`/document/artifacts/${encodeURIComponent(ingestionId)}`);
}
function getDocumentArtifactDownloadUrl(ingestionId, artifactId) {
  return `/api/document/artifacts/${encodeURIComponent(ingestionId)}/files/${encodeURIComponent(artifactId)}`;
}
function getDocumentArtifactBundleDownloadUrl(ingestionId) {
  return `/api/document/artifacts/${encodeURIComponent(ingestionId)}/bundle`;
}
async function getRisk(componentId) {
  return request(`/risk?component_id=${encodeURIComponent(componentId)}`);
}
async function getImpact(componentId) {
  return request(`/impact?component_id=${encodeURIComponent(componentId)}`);
}
async function seedDemoGraph() {
  return request(
    "/seed",
    { method: "POST" }
  );
}
async function getProcessingStatus(ingestionId) {
  return request(`/ingest/${encodeURIComponent(ingestionId)}/events`);
}
async function getDocumentProcessingStatus(ingestionId) {
  return request(`/document/ingest/${encodeURIComponent(ingestionId)}/events`);
}
async function getRiskRankedItems() {
  throw new UnsupportedEndpointError("The current backend contract does not expose a ranked risk list endpoint.");
}
async function getArchitectureSummary() {
  throw new UnsupportedEndpointError("The current backend contract does not expose an architecture summary endpoint.");
}
var ApiClientError, UnsupportedEndpointError;
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
    UnsupportedEndpointError = class extends Error {
      constructor(message) {
        super(message);
        this.name = "UnsupportedEndpointError";
      }
    };
  }
});

// tests/api.test.ts
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

// tests/api.test.ts
installRuntimeWindowConfig({
  MAX_UPLOAD_MB: 50,
  PROCESSING_TIMEOUT_MS: 5e3,
  APP_ENV: "test"
});
var apiModule = await Promise.resolve().then(() => (init_api(), api_exports));
var { ApiClientError: ApiClientError2, getActiveDocumentArtifacts: getActiveDocumentArtifacts2, getDocumentArtifacts: getDocumentArtifacts2, getGraph: getGraph2 } = apiModule;
test("getGraph returns parsed API data on success", async () => {
  globalThis.fetch = async () => new Response(
    JSON.stringify({
      status: "ok",
      data: {
        source: "demo",
        nodes: [],
        edges: []
      }
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" }
    }
  );
  const graph = await getGraph2();
  assert.equal(graph.source, "demo");
  assert.deepEqual(graph.nodes, []);
  assert.deepEqual(graph.edges, []);
});
test("getGraph throws ApiClientError on malformed JSON", async () => {
  globalThis.fetch = async () => new Response("{not-json", {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  await assert.rejects(() => getGraph2(), (error) => {
    assert.ok(error instanceof ApiClientError2);
    assert.equal(error.message, "The API returned malformed JSON.");
    return true;
  });
});
test("getGraph maps backend error payloads into ApiClientError", async () => {
  globalThis.fetch = async () => new Response(
    JSON.stringify({
      status: "error",
      error: {
        code: "graph_failed",
        message: "The graph could not be loaded."
      }
    }),
    {
      status: 502,
      headers: { "content-type": "application/json" }
    }
  );
  await assert.rejects(() => getGraph2(), (error) => {
    assert.ok(error instanceof ApiClientError2);
    assert.equal(error.code, "graph_failed");
    assert.equal(error.status, 502);
    assert.equal(error.message, "The graph could not be loaded.");
    return true;
  });
});
test("getGraph maps AbortError into a timeout ApiClientError", async () => {
  globalThis.fetch = async () => {
    throw new DOMException("Timed out", "AbortError");
  };
  await assert.rejects(() => getGraph2(), (error) => {
    assert.ok(error instanceof ApiClientError2);
    assert.equal(error.code, "request_timeout");
    assert.match(error.message, /timed out/i);
    return true;
  });
});
test("getGraph maps network failures into retryable ApiClientError", async () => {
  globalThis.fetch = async () => {
    throw new Error("socket hang up");
  };
  await assert.rejects(() => getGraph2(), (error) => {
    assert.ok(error instanceof ApiClientError2);
    assert.equal(error.code, "network_error");
    assert.equal(error.retryable, true);
    assert.match(error.message, /Network failure/);
    return true;
  });
});
test("getActiveDocumentArtifacts returns the parsed artifact manifest", async () => {
  globalThis.fetch = async () => new Response(
    JSON.stringify({
      status: "ok",
      data: {
        ingestion_id: "doc-1",
        bundle: {
          filename: "document_source_materials.zip",
          download_url: "/api/document/artifacts/doc-1/bundle"
        },
        artifacts: [
          {
            id: "final-markdown",
            type: "final-markdown",
            filename: "source_document.md",
            relative_path: "source_document.md",
            size_bytes: 128,
            download_url: "/api/document/artifacts/doc-1/files/final-markdown"
          }
        ],
        chunk_artifacts: []
      }
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" }
    }
  );
  const manifest = await getActiveDocumentArtifacts2();
  assert.equal(manifest.ingestion_id, "doc-1");
  assert.equal(manifest.bundle.filename, "document_source_materials.zip");
  assert.equal(manifest.artifacts[0].filename, "source_document.md");
});
test("getDocumentArtifacts requests the specific ingestion manifest", async () => {
  let requestedUrl = "";
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        status: "ok",
        data: {
          ingestion_id: "doc-99",
          bundle: {
            filename: "document_source_materials.zip",
            download_url: "/api/document/artifacts/doc-99/bundle"
          },
          artifacts: [],
          chunk_artifacts: []
        }
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" }
      }
    );
  };
  const manifest = await getDocumentArtifacts2("doc-99");
  assert.equal(requestedUrl, "/api/document/artifacts/doc-99");
  assert.equal(manifest.ingestion_id, "doc-99");
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2xpYi9jb25maWcudHMiLCAiLi4vc3JjL2xpYi9hcGkudHMiLCAiLi4vdGVzdHMvYXBpLnRlc3QudHMiLCAiLi4vdGVzdHMvdGVzdC11dGlscy50c3giXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IHJ1bnRpbWVDb25maWcgPSB3aW5kb3cuX19UV0lOX0NPTkZJR19fID8/IHt9O1xuXG5mdW5jdGlvbiByZWFkTnVtYmVyKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCB1bmRlZmluZWQsIGZhbGxiYWNrOiBudW1iZXIpIHtcbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHZhbHVlKTtcbiAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShwYXJzZWQpICYmIHBhcnNlZCA+IDAgPyBwYXJzZWQgOiBmYWxsYmFjaztcbn1cblxuZXhwb3J0IGNvbnN0IGFwcENvbmZpZyA9IHtcbiAgYXBpQmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXG4gIG1heFVwbG9hZEJ5dGVzOlxuICAgIHJlYWROdW1iZXIocnVudGltZUNvbmZpZy5NQVhfVVBMT0FEX01CIHx8IGltcG9ydC5tZXRhLmVudi5WSVRFX01BWF9VUExPQURfTUIsIDUwKSAqIDEwMjQgKiAxMDI0LFxuICBwcm9jZXNzaW5nVGltZW91dE1zOiByZWFkTnVtYmVyKFxuICAgIHJ1bnRpbWVDb25maWcuUFJPQ0VTU0lOR19USU1FT1VUX01TIHx8IGltcG9ydC5tZXRhLmVudi5WSVRFX1BST0NFU1NJTkdfVElNRU9VVF9NUyxcbiAgICAzMDAwMDBcbiAgKSxcbiAgZW52aXJvbm1lbnQ6IHJ1bnRpbWVDb25maWcuQVBQX0VOViB8fCAnbG9jYWwnLFxufTtcbiIsICJpbXBvcnQgeyBhcHBDb25maWcgfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgdHlwZSB7XG4gIEFwaUdyYXBoRGF0YSxcbiAgQXBpUGF5bG9hZCxcbiAgQXBpRG9jdW1lbnRHcmFwaERhdGEsXG4gIERvY3VtZW50QXJ0aWZhY3RNYW5pZmVzdCxcbiAgRG9jdW1lbnRJbmdlc3RSZXNwb25zZSxcbiAgSW1wYWN0UmVzcG9uc2UsXG4gIEluZ2VzdFJlc3BvbnNlLFxuICBQcm9jZXNzaW5nU3RhdHVzLFxuICBSaXNrUmVzcG9uc2UsXG59IGZyb20gJy4uL3R5cGVzL2FwaSc7XG5cbmV4cG9ydCBjbGFzcyBBcGlDbGllbnRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29kZT86IHN0cmluZztcbiAgc3RhdHVzPzogbnVtYmVyO1xuICBkZXRhaWxzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIHJldHJ5YWJsZTogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgb3B0aW9uczoge1xuICAgICAgY29kZT86IHN0cmluZztcbiAgICAgIHN0YXR1cz86IG51bWJlcjtcbiAgICAgIGRldGFpbHM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICAgIHJldHJ5YWJsZT86IGJvb2xlYW47XG4gICAgfSA9IHt9XG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdBcGlDbGllbnRFcnJvcic7XG4gICAgdGhpcy5jb2RlID0gb3B0aW9ucy5jb2RlO1xuICAgIHRoaXMuc3RhdHVzID0gb3B0aW9ucy5zdGF0dXM7XG4gICAgdGhpcy5kZXRhaWxzID0gb3B0aW9ucy5kZXRhaWxzO1xuICAgIHRoaXMucmV0cnlhYmxlID0gb3B0aW9ucy5yZXRyeWFibGUgPz8gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFVuc3VwcG9ydGVkRW5kcG9pbnRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gJ1Vuc3VwcG9ydGVkRW5kcG9pbnRFcnJvcic7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VKc29uU2FmZWx5KHJlc3BvbnNlOiBSZXNwb25zZSkge1xuICBjb25zdCB0ZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICBjb25zb2xlLmxvZygnQkFDS0VORCBSRVNQT05TRTonLCB0ZXh0KTtcblxuICBpZiAoIXRleHQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UodGV4dCkgYXMgQXBpUGF5bG9hZDx1bmtub3duPjtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdQQVJTRSBFUlJPUjonLCBlcnJvcik7XG4gICAgY29uc29sZS5lcnJvcignUkFXIFJFU1BPTlNFIFRFWFQ6JywgdGV4dCk7XG4gICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdUaGUgQVBJIHJldHVybmVkIG1hbGZvcm1lZCBKU09OLicsIHtcbiAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcbiAgICB9KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiByZXF1ZXN0PFQ+KHBhdGg6IHN0cmluZywgaW5pdDogUmVxdWVzdEluaXQgPSB7fSwgdGltZW91dE1zID0gMzAwMDApOiBQcm9taXNlPFQ+IHtcbiAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgY29uc3QgdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgdGltZW91dE1zKTtcblxuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYC9hcGkke3BhdGh9YCwge1xuICAgICAgLi4uaW5pdCxcbiAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXG4gICAgfSk7XG4gICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IHBhcnNlSnNvblNhZmVseShyZXNwb25zZSk7XG5cbiAgICBpZiAoIXBheWxvYWQgfHwgdHlwZW9mIHBheWxvYWQgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoJ1RoZSBBUEkgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuJywge1xuICAgICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICghcmVzcG9uc2Uub2sgfHwgcGF5bG9hZC5zdGF0dXMgIT09ICdvaycpIHtcbiAgICAgIGNvbnN0IGVycm9yUGF5bG9hZCA9IHBheWxvYWQgYXMgRXhjbHVkZTxBcGlQYXlsb2FkPFQ+LCB7IHN0YXR1czogJ29rJyB9PjtcbiAgICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcihlcnJvclBheWxvYWQuZXJyb3I/Lm1lc3NhZ2UgfHwgJ1RoZSByZXF1ZXN0IGZhaWxlZC4nLCB7XG4gICAgICAgIGNvZGU6IGVycm9yUGF5bG9hZC5lcnJvcj8uY29kZSxcbiAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXG4gICAgICAgIGRldGFpbHM6IGVycm9yUGF5bG9hZC5lcnJvcj8uZGV0YWlscyxcbiAgICAgICAgcmV0cnlhYmxlOiByZXNwb25zZS5zdGF0dXMgPj0gNTAwIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gMCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBwYXlsb2FkLmRhdGEgYXMgVDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlDbGllbnRFcnJvcikge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRE9NRXhjZXB0aW9uICYmIGVycm9yLm5hbWUgPT09ICdBYm9ydEVycm9yJykge1xuICAgICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdQcm9jZXNzaW5nIHRpbWVkIG91dCBiZWZvcmUgdGhlIGJhY2tlbmQgY29tcGxldGVkIHRoZSBncmFwaCBidWlsZC4nLCB7XG4gICAgICAgIGNvZGU6ICdyZXF1ZXN0X3RpbWVvdXQnLFxuICAgICAgICByZXRyeWFibGU6IHRydWUsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoJ05ldHdvcmsgZmFpbHVyZSB3aGlsZSBjb250YWN0aW5nIHRoZSBUd2luR3JhcGhPcHMgQVBJLicsIHtcbiAgICAgIGNvZGU6ICduZXR3b3JrX2Vycm9yJyxcbiAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcbiAgICB9KTtcbiAgfSBmaW5hbGx5IHtcbiAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWREb2N1bWVudChcbiAgZmlsZTogRmlsZSxcbiAgcmVwbGFjZUV4aXN0aW5nID0gdHJ1ZSxcbiAgdGltZW91dE1zID0gYXBwQ29uZmlnLnByb2Nlc3NpbmdUaW1lb3V0TXMsXG4gIGluZ2VzdGlvbklkPzogc3RyaW5nXG4pIHtcbiAgY29uc3QgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgZm9ybURhdGEuYXBwZW5kKCdmaWxlJywgZmlsZSk7XG4gIGZvcm1EYXRhLmFwcGVuZCgncmVwbGFjZV9leGlzdGluZycsIFN0cmluZyhyZXBsYWNlRXhpc3RpbmcpKTtcbiAgaWYgKGluZ2VzdGlvbklkKSB7XG4gICAgZm9ybURhdGEuYXBwZW5kKCdpbmdlc3Rpb25faWQnLCBpbmdlc3Rpb25JZCk7XG4gIH1cblxuICByZXR1cm4gcmVxdWVzdDxJbmdlc3RSZXNwb25zZT4oXG4gICAgJy9pbmdlc3QnLFxuICAgIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgYm9keTogZm9ybURhdGEsXG4gICAgfSxcbiAgICB0aW1lb3V0TXNcbiAgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZEtub3dsZWRnZURvY3VtZW50KFxuICBmaWxlOiBGaWxlLFxuICByZXBsYWNlRXhpc3RpbmcgPSB0cnVlLFxuICB0aW1lb3V0TXMgPSBhcHBDb25maWcucHJvY2Vzc2luZ1RpbWVvdXRNcyxcbiAgaW5nZXN0aW9uSWQ/OiBzdHJpbmdcbikge1xuICBjb25zdCBmb3JtRGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuICBmb3JtRGF0YS5hcHBlbmQoJ2ZpbGUnLCBmaWxlKTtcbiAgZm9ybURhdGEuYXBwZW5kKCdyZXBsYWNlX2V4aXN0aW5nJywgU3RyaW5nKHJlcGxhY2VFeGlzdGluZykpO1xuICBpZiAoaW5nZXN0aW9uSWQpIHtcbiAgICBmb3JtRGF0YS5hcHBlbmQoJ2luZ2VzdGlvbl9pZCcsIGluZ2VzdGlvbklkKTtcbiAgfVxuXG4gIHJldHVybiByZXF1ZXN0PERvY3VtZW50SW5nZXN0UmVzcG9uc2U+KFxuICAgICcvZG9jdW1lbnQvaW5nZXN0JyxcbiAgICB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGJvZHk6IGZvcm1EYXRhLFxuICAgIH0sXG4gICAgdGltZW91dE1zXG4gICk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRHcmFwaCgpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8QXBpR3JhcGhEYXRhPignL2dyYXBoJyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXREb2N1bWVudEdyYXBoKCkge1xuICByZXR1cm4gcmVxdWVzdDxBcGlEb2N1bWVudEdyYXBoRGF0YT4oJy9kb2N1bWVudC9ncmFwaCcpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QWN0aXZlRG9jdW1lbnRBcnRpZmFjdHMoKSB7XG4gIHJldHVybiByZXF1ZXN0PERvY3VtZW50QXJ0aWZhY3RNYW5pZmVzdD4oJy9kb2N1bWVudC9hcnRpZmFjdHMnKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldERvY3VtZW50QXJ0aWZhY3RzKGluZ2VzdGlvbklkOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8RG9jdW1lbnRBcnRpZmFjdE1hbmlmZXN0PihgL2RvY3VtZW50L2FydGlmYWN0cy8ke2VuY29kZVVSSUNvbXBvbmVudChpbmdlc3Rpb25JZCl9YCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREb2N1bWVudEFydGlmYWN0RG93bmxvYWRVcmwoaW5nZXN0aW9uSWQ6IHN0cmluZywgYXJ0aWZhY3RJZDogc3RyaW5nKSB7XG4gIHJldHVybiBgL2FwaS9kb2N1bWVudC9hcnRpZmFjdHMvJHtlbmNvZGVVUklDb21wb25lbnQoaW5nZXN0aW9uSWQpfS9maWxlcy8ke2VuY29kZVVSSUNvbXBvbmVudChhcnRpZmFjdElkKX1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG9jdW1lbnRBcnRpZmFjdEJ1bmRsZURvd25sb2FkVXJsKGluZ2VzdGlvbklkOiBzdHJpbmcpIHtcbiAgcmV0dXJuIGAvYXBpL2RvY3VtZW50L2FydGlmYWN0cy8ke2VuY29kZVVSSUNvbXBvbmVudChpbmdlc3Rpb25JZCl9L2J1bmRsZWA7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRSaXNrKGNvbXBvbmVudElkOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8Umlza1Jlc3BvbnNlPihgL3Jpc2s/Y29tcG9uZW50X2lkPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGNvbXBvbmVudElkKX1gKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEltcGFjdChjb21wb25lbnRJZDogc3RyaW5nKSB7XG4gIHJldHVybiByZXF1ZXN0PEltcGFjdFJlc3BvbnNlPihgL2ltcGFjdD9jb21wb25lbnRfaWQ9JHtlbmNvZGVVUklDb21wb25lbnQoY29tcG9uZW50SWQpfWApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VlZERlbW9HcmFwaCgpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8eyBzb3VyY2U6IHN0cmluZzsgbm9kZXNfY3JlYXRlZDogbnVtYmVyOyBlZGdlc19jcmVhdGVkOiBudW1iZXI7IHJpc2tfbm9kZXNfc2NvcmVkOiBudW1iZXIgfT4oXG4gICAgJy9zZWVkJyxcbiAgICB7IG1ldGhvZDogJ1BPU1QnIH1cbiAgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQ6IHN0cmluZykge1xuICByZXR1cm4gcmVxdWVzdDxQcm9jZXNzaW5nU3RhdHVzPihgL2luZ2VzdC8ke2VuY29kZVVSSUNvbXBvbmVudChpbmdlc3Rpb25JZCl9L2V2ZW50c2ApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0RG9jdW1lbnRQcm9jZXNzaW5nU3RhdHVzKGluZ2VzdGlvbklkOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHJlcXVlc3Q8UHJvY2Vzc2luZ1N0YXR1cz4oYC9kb2N1bWVudC9pbmdlc3QvJHtlbmNvZGVVUklDb21wb25lbnQoaW5nZXN0aW9uSWQpfS9ldmVudHNgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFJpc2tSYW5rZWRJdGVtcygpOiBQcm9taXNlPG5ldmVyPiB7XG4gIC8vIFRPRE86IHJlcGxhY2UgY2xpZW50LXNpZGUgcmlzayByYW5raW5nIHdoZW4gdGhlIGJhY2tlbmQgZXhwb3NlcyBhIGRlZGljYXRlZCByaXNrIGxpc3QgZW5kcG9pbnQuXG4gIHRocm93IG5ldyBVbnN1cHBvcnRlZEVuZHBvaW50RXJyb3IoJ1RoZSBjdXJyZW50IGJhY2tlbmQgY29udHJhY3QgZG9lcyBub3QgZXhwb3NlIGEgcmFua2VkIHJpc2sgbGlzdCBlbmRwb2ludC4nKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFyY2hpdGVjdHVyZVN1bW1hcnkoKTogUHJvbWlzZTxuZXZlcj4ge1xuICAvLyBUT0RPOiByZXBsYWNlIGNsaWVudC1zaWRlIHN1bW1hcnkgZGVyaXZhdGlvbiB3aGVuIHRoZSBiYWNrZW5kIGV4cG9zZXMgYSBkZWRpY2F0ZWQgc3VtbWFyeSBlbmRwb2ludC5cbiAgdGhyb3cgbmV3IFVuc3VwcG9ydGVkRW5kcG9pbnRFcnJvcignVGhlIGN1cnJlbnQgYmFja2VuZCBjb250cmFjdCBkb2VzIG5vdCBleHBvc2UgYW4gYXJjaGl0ZWN0dXJlIHN1bW1hcnkgZW5kcG9pbnQuJyk7XG59XG4iLCAiaW1wb3J0IGFzc2VydCBmcm9tICdub2RlOmFzc2VydC9zdHJpY3QnO1xuaW1wb3J0IHRlc3QgZnJvbSAnbm9kZTp0ZXN0JztcbmltcG9ydCB7IGluc3RhbGxSdW50aW1lV2luZG93Q29uZmlnIH0gZnJvbSAnLi90ZXN0LXV0aWxzJztcblxuaW5zdGFsbFJ1bnRpbWVXaW5kb3dDb25maWcoe1xuICBNQVhfVVBMT0FEX01COiA1MCxcbiAgUFJPQ0VTU0lOR19USU1FT1VUX01TOiA1MDAwLFxuICBBUFBfRU5WOiAndGVzdCcsXG59KTtcblxuY29uc3QgYXBpTW9kdWxlID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvbGliL2FwaScpO1xuY29uc3QgeyBBcGlDbGllbnRFcnJvciwgZ2V0QWN0aXZlRG9jdW1lbnRBcnRpZmFjdHMsIGdldERvY3VtZW50QXJ0aWZhY3RzLCBnZXRHcmFwaCB9ID0gYXBpTW9kdWxlO1xuXG50ZXN0KCdnZXRHcmFwaCByZXR1cm5zIHBhcnNlZCBBUEkgZGF0YSBvbiBzdWNjZXNzJywgYXN5bmMgKCkgPT4ge1xuICBnbG9iYWxUaGlzLmZldGNoID0gYXN5bmMgKCkgPT5cbiAgICBuZXcgUmVzcG9uc2UoXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN0YXR1czogJ29rJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHNvdXJjZTogJ2RlbW8nLFxuICAgICAgICAgIG5vZGVzOiBbXSxcbiAgICAgICAgICBlZGdlczogW10sXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICAgIHtcbiAgICAgICAgc3RhdHVzOiAyMDAsXG4gICAgICAgIGhlYWRlcnM6IHsgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgfVxuICAgICk7XG5cbiAgY29uc3QgZ3JhcGggPSBhd2FpdCBnZXRHcmFwaCgpO1xuICBhc3NlcnQuZXF1YWwoZ3JhcGguc291cmNlLCAnZGVtbycpO1xuICBhc3NlcnQuZGVlcEVxdWFsKGdyYXBoLm5vZGVzLCBbXSk7XG4gIGFzc2VydC5kZWVwRXF1YWwoZ3JhcGguZWRnZXMsIFtdKTtcbn0pO1xuXG50ZXN0KCdnZXRHcmFwaCB0aHJvd3MgQXBpQ2xpZW50RXJyb3Igb24gbWFsZm9ybWVkIEpTT04nLCBhc3luYyAoKSA9PiB7XG4gIGdsb2JhbFRoaXMuZmV0Y2ggPSBhc3luYyAoKSA9PlxuICAgIG5ldyBSZXNwb25zZSgne25vdC1qc29uJywge1xuICAgICAgc3RhdHVzOiAyMDAsXG4gICAgICBoZWFkZXJzOiB7ICdjb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICB9KTtcblxuICBhd2FpdCBhc3NlcnQucmVqZWN0cygoKSA9PiBnZXRHcmFwaCgpLCAoZXJyb3I6IHVua25vd24pID0+IHtcbiAgICBhc3NlcnQub2soZXJyb3IgaW5zdGFuY2VvZiBBcGlDbGllbnRFcnJvcik7XG4gICAgYXNzZXJ0LmVxdWFsKGVycm9yLm1lc3NhZ2UsICdUaGUgQVBJIHJldHVybmVkIG1hbGZvcm1lZCBKU09OLicpO1xuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbn0pO1xuXG50ZXN0KCdnZXRHcmFwaCBtYXBzIGJhY2tlbmQgZXJyb3IgcGF5bG9hZHMgaW50byBBcGlDbGllbnRFcnJvcicsIGFzeW5jICgpID0+IHtcbiAgZ2xvYmFsVGhpcy5mZXRjaCA9IGFzeW5jICgpID0+XG4gICAgbmV3IFJlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBzdGF0dXM6ICdlcnJvcicsXG4gICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgY29kZTogJ2dyYXBoX2ZhaWxlZCcsXG4gICAgICAgICAgbWVzc2FnZTogJ1RoZSBncmFwaCBjb3VsZCBub3QgYmUgbG9hZGVkLicsXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICAgIHtcbiAgICAgICAgc3RhdHVzOiA1MDIsXG4gICAgICAgIGhlYWRlcnM6IHsgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgfVxuICAgICk7XG5cbiAgYXdhaXQgYXNzZXJ0LnJlamVjdHMoKCkgPT4gZ2V0R3JhcGgoKSwgKGVycm9yOiB1bmtub3duKSA9PiB7XG4gICAgYXNzZXJ0Lm9rKGVycm9yIGluc3RhbmNlb2YgQXBpQ2xpZW50RXJyb3IpO1xuICAgIGFzc2VydC5lcXVhbChlcnJvci5jb2RlLCAnZ3JhcGhfZmFpbGVkJyk7XG4gICAgYXNzZXJ0LmVxdWFsKGVycm9yLnN0YXR1cywgNTAyKTtcbiAgICBhc3NlcnQuZXF1YWwoZXJyb3IubWVzc2FnZSwgJ1RoZSBncmFwaCBjb3VsZCBub3QgYmUgbG9hZGVkLicpO1xuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbn0pO1xuXG50ZXN0KCdnZXRHcmFwaCBtYXBzIEFib3J0RXJyb3IgaW50byBhIHRpbWVvdXQgQXBpQ2xpZW50RXJyb3InLCBhc3luYyAoKSA9PiB7XG4gIGdsb2JhbFRoaXMuZmV0Y2ggPSBhc3luYyAoKSA9PiB7XG4gICAgdGhyb3cgbmV3IERPTUV4Y2VwdGlvbignVGltZWQgb3V0JywgJ0Fib3J0RXJyb3InKTtcbiAgfTtcblxuICBhd2FpdCBhc3NlcnQucmVqZWN0cygoKSA9PiBnZXRHcmFwaCgpLCAoZXJyb3I6IHVua25vd24pID0+IHtcbiAgICBhc3NlcnQub2soZXJyb3IgaW5zdGFuY2VvZiBBcGlDbGllbnRFcnJvcik7XG4gICAgYXNzZXJ0LmVxdWFsKGVycm9yLmNvZGUsICdyZXF1ZXN0X3RpbWVvdXQnKTtcbiAgICBhc3NlcnQubWF0Y2goZXJyb3IubWVzc2FnZSwgL3RpbWVkIG91dC9pKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG59KTtcblxudGVzdCgnZ2V0R3JhcGggbWFwcyBuZXR3b3JrIGZhaWx1cmVzIGludG8gcmV0cnlhYmxlIEFwaUNsaWVudEVycm9yJywgYXN5bmMgKCkgPT4ge1xuICBnbG9iYWxUaGlzLmZldGNoID0gYXN5bmMgKCkgPT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignc29ja2V0IGhhbmcgdXAnKTtcbiAgfTtcblxuICBhd2FpdCBhc3NlcnQucmVqZWN0cygoKSA9PiBnZXRHcmFwaCgpLCAoZXJyb3I6IHVua25vd24pID0+IHtcbiAgICBhc3NlcnQub2soZXJyb3IgaW5zdGFuY2VvZiBBcGlDbGllbnRFcnJvcik7XG4gICAgYXNzZXJ0LmVxdWFsKGVycm9yLmNvZGUsICduZXR3b3JrX2Vycm9yJyk7XG4gICAgYXNzZXJ0LmVxdWFsKGVycm9yLnJldHJ5YWJsZSwgdHJ1ZSk7XG4gICAgYXNzZXJ0Lm1hdGNoKGVycm9yLm1lc3NhZ2UsIC9OZXR3b3JrIGZhaWx1cmUvKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG59KTtcblxudGVzdCgnZ2V0QWN0aXZlRG9jdW1lbnRBcnRpZmFjdHMgcmV0dXJucyB0aGUgcGFyc2VkIGFydGlmYWN0IG1hbmlmZXN0JywgYXN5bmMgKCkgPT4ge1xuICBnbG9iYWxUaGlzLmZldGNoID0gYXN5bmMgKCkgPT5cbiAgICBuZXcgUmVzcG9uc2UoXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN0YXR1czogJ29rJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGluZ2VzdGlvbl9pZDogJ2RvYy0xJyxcbiAgICAgICAgICBidW5kbGU6IHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiAnZG9jdW1lbnRfc291cmNlX21hdGVyaWFscy56aXAnLFxuICAgICAgICAgICAgZG93bmxvYWRfdXJsOiAnL2FwaS9kb2N1bWVudC9hcnRpZmFjdHMvZG9jLTEvYnVuZGxlJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFydGlmYWN0czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBpZDogJ2ZpbmFsLW1hcmtkb3duJyxcbiAgICAgICAgICAgICAgdHlwZTogJ2ZpbmFsLW1hcmtkb3duJyxcbiAgICAgICAgICAgICAgZmlsZW5hbWU6ICdzb3VyY2VfZG9jdW1lbnQubWQnLFxuICAgICAgICAgICAgICByZWxhdGl2ZV9wYXRoOiAnc291cmNlX2RvY3VtZW50Lm1kJyxcbiAgICAgICAgICAgICAgc2l6ZV9ieXRlczogMTI4LFxuICAgICAgICAgICAgICBkb3dubG9hZF91cmw6ICcvYXBpL2RvY3VtZW50L2FydGlmYWN0cy9kb2MtMS9maWxlcy9maW5hbC1tYXJrZG93bicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgY2h1bmtfYXJ0aWZhY3RzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgICAge1xuICAgICAgICBzdGF0dXM6IDIwMCxcbiAgICAgICAgaGVhZGVyczogeyAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXG4gICAgICB9XG4gICAgKTtcblxuICBjb25zdCBtYW5pZmVzdCA9IGF3YWl0IGdldEFjdGl2ZURvY3VtZW50QXJ0aWZhY3RzKCk7XG4gIGFzc2VydC5lcXVhbChtYW5pZmVzdC5pbmdlc3Rpb25faWQsICdkb2MtMScpO1xuICBhc3NlcnQuZXF1YWwobWFuaWZlc3QuYnVuZGxlLmZpbGVuYW1lLCAnZG9jdW1lbnRfc291cmNlX21hdGVyaWFscy56aXAnKTtcbiAgYXNzZXJ0LmVxdWFsKG1hbmlmZXN0LmFydGlmYWN0c1swXS5maWxlbmFtZSwgJ3NvdXJjZV9kb2N1bWVudC5tZCcpO1xufSk7XG5cbnRlc3QoJ2dldERvY3VtZW50QXJ0aWZhY3RzIHJlcXVlc3RzIHRoZSBzcGVjaWZpYyBpbmdlc3Rpb24gbWFuaWZlc3QnLCBhc3luYyAoKSA9PiB7XG4gIGxldCByZXF1ZXN0ZWRVcmwgPSAnJztcbiAgZ2xvYmFsVGhpcy5mZXRjaCA9IGFzeW5jIChpbnB1dCkgPT4ge1xuICAgIHJlcXVlc3RlZFVybCA9IFN0cmluZyhpbnB1dCk7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcbiAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgc3RhdHVzOiAnb2snLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgaW5nZXN0aW9uX2lkOiAnZG9jLTk5JyxcbiAgICAgICAgICBidW5kbGU6IHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiAnZG9jdW1lbnRfc291cmNlX21hdGVyaWFscy56aXAnLFxuICAgICAgICAgICAgZG93bmxvYWRfdXJsOiAnL2FwaS9kb2N1bWVudC9hcnRpZmFjdHMvZG9jLTk5L2J1bmRsZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBhcnRpZmFjdHM6IFtdLFxuICAgICAgICAgIGNodW5rX2FydGlmYWN0czogW10sXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICAgIHtcbiAgICAgICAgc3RhdHVzOiAyMDAsXG4gICAgICAgIGhlYWRlcnM6IHsgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgfVxuICAgICk7XG4gIH07XG5cbiAgY29uc3QgbWFuaWZlc3QgPSBhd2FpdCBnZXREb2N1bWVudEFydGlmYWN0cygnZG9jLTk5Jyk7XG4gIGFzc2VydC5lcXVhbChyZXF1ZXN0ZWRVcmwsICcvYXBpL2RvY3VtZW50L2FydGlmYWN0cy9kb2MtOTknKTtcbiAgYXNzZXJ0LmVxdWFsKG1hbmlmZXN0LmluZ2VzdGlvbl9pZCwgJ2RvYy05OScpO1xufSk7XG4iLCAiZXhwb3J0IGZ1bmN0aW9uIGluc3RhbGxSdW50aW1lV2luZG93Q29uZmlnKG92ZXJyaWRlczogUGFydGlhbDxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXI+PiA9IHt9KSB7XG4gIGNvbnN0IHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IChjYWxsYmFjazogRnJhbWVSZXF1ZXN0Q2FsbGJhY2spID0+IHNldFRpbWVvdXQoKCkgPT4gY2FsbGJhY2soRGF0ZS5ub3coKSksIDApO1xuICBjb25zdCBjYW5jZWxBbmltYXRpb25GcmFtZSA9IChoYW5kbGU6IG51bWJlcikgPT4gY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICd3aW5kb3cnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiB7XG4gICAgICBfX1RXSU5fQ09ORklHX186IHtcbiAgICAgICAgTUFYX1VQTE9BRF9NQjogNTAsXG4gICAgICAgIFBST0NFU1NJTkdfVElNRU9VVF9NUzogOTAwMDAsXG4gICAgICAgIEFQUF9FTlY6ICd0ZXN0JyxcbiAgICAgICAgLi4ub3ZlcnJpZGVzLFxuICAgICAgfSxcbiAgICAgIHNldFRpbWVvdXQsXG4gICAgICBjbGVhclRpbWVvdXQsXG4gICAgICBzZXRJbnRlcnZhbCxcbiAgICAgIGNsZWFySW50ZXJ2YWwsXG4gICAgICBhZGRFdmVudExpc3RlbmVyOiAoKSA9PiB7fSxcbiAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6ICgpID0+IHt9LFxuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUsXG4gICAgICBkZXZpY2VQaXhlbFJhdGlvOiAxLFxuICAgIH0sXG4gIH0pO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnZG9jdW1lbnQnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiB7XG4gICAgICBjcmVhdGVFbGVtZW50OiAoKSA9PiAoe1xuICAgICAgICBnZXRDb250ZXh0OiAoKSA9PiAoe30pLFxuICAgICAgICBzdHlsZToge30sXG4gICAgICAgIHNldEF0dHJpYnV0ZTogKCkgPT4ge30sXG4gICAgICAgIGFwcGVuZENoaWxkOiAoKSA9PiB7fSxcbiAgICAgIH0pLFxuICAgICAgYm9keToge1xuICAgICAgICBhcHBlbmRDaGlsZDogKCkgPT4ge30sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnbmF2aWdhdG9yJywge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICB2YWx1ZToge1xuICAgICAgdXNlckFnZW50OiAnbm9kZS5qcycsXG4gICAgfSxcbiAgfSk7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICdyZXF1ZXN0QW5pbWF0aW9uRnJhbWUnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXG4gIH0pO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnY2FuY2VsQW5pbWF0aW9uRnJhbWUnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiBjYW5jZWxBbmltYXRpb25GcmFtZSxcbiAgfSk7XG5cbiAgaWYgKCEoJ1Jlc2l6ZU9ic2VydmVyJyBpbiBnbG9iYWxUaGlzKSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnUmVzaXplT2JzZXJ2ZXInLCB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIHZhbHVlOiBjbGFzcyBSZXNpemVPYnNlcnZlciB7XG4gICAgICAgIG9ic2VydmUoKSB7fVxuICAgICAgICB1bm9ic2VydmUoKSB7fVxuICAgICAgICBkaXNjb25uZWN0KCkge31cbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNhbXBsZUdyYXBoRGF0YSgpIHtcbiAgY29uc3Qgbm9kZXMgPSBbXG4gICAge1xuICAgICAgaWQ6ICdhcGknLFxuICAgICAgbmFtZTogJ0FQSSBTZXJ2aWNlJyxcbiAgICAgIHR5cGU6ICdzb2Z0d2FyZScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvcmUgQVBJJyxcbiAgICAgIHJpc2tTY29yZTogODIsXG4gICAgICByaXNrTGV2ZWw6ICdoaWdoJyxcbiAgICAgIGRlZ3JlZTogMixcbiAgICAgIGJldHdlZW5uZXNzOiAwLjU1LFxuICAgICAgY2xvc2VuZXNzOiAwLjY3LFxuICAgICAgYmxhc3RSYWRpdXM6IDMsXG4gICAgICBkZXBlbmRlbmN5U3BhbjogMixcbiAgICAgIHJpc2tFeHBsYW5hdGlvbjogJ0hhbmRsZXMgY29yZSByZXF1ZXN0cy4nLFxuICAgICAgc291cmNlOiAnc2FtcGxlJyxcbiAgICAgIGRlcGVuZGVuY2llczogWydkYiddLFxuICAgICAgZGVwZW5kZW50czogWydmcm9udGVuZCddLFxuICAgICAgdmFsOiAzNixcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAnZGInLFxuICAgICAgbmFtZTogJ0RhdGFiYXNlJyxcbiAgICAgIHR5cGU6ICdkYXRhJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUGVyc2lzdGVuY2UgbGF5ZXInLFxuICAgICAgcmlza1Njb3JlOiA0NCxcbiAgICAgIHJpc2tMZXZlbDogJ21lZGl1bScsXG4gICAgICBkZWdyZWU6IDEsXG4gICAgICBiZXR3ZWVubmVzczogMC4yMixcbiAgICAgIGNsb3NlbmVzczogMC40NCxcbiAgICAgIGJsYXN0UmFkaXVzOiAxLFxuICAgICAgZGVwZW5kZW5jeVNwYW46IDEsXG4gICAgICByaXNrRXhwbGFuYXRpb246ICdTdG9yZXMgcmVjb3Jkcy4nLFxuICAgICAgc291cmNlOiAnc2FtcGxlJyxcbiAgICAgIGRlcGVuZGVuY2llczogW10sXG4gICAgICBkZXBlbmRlbnRzOiBbJ2FwaSddLFxuICAgICAgdmFsOiAyOCxcbiAgICB9LFxuICBdO1xuXG4gIHJldHVybiB7XG4gICAgc291cmNlOiAnc2FtcGxlJyxcbiAgICBub2RlcyxcbiAgICBsaW5rczogW1xuICAgICAge1xuICAgICAgICBpZDogJ2FwaS1kYi0wJyxcbiAgICAgICAgc291cmNlOiAnYXBpJyxcbiAgICAgICAgdGFyZ2V0OiAnZGInLFxuICAgICAgICByZWxhdGlvbjogJ2RlcGVuZHNfb24nLFxuICAgICAgICByYXRpb25hbGU6ICdSZWFkcyBhbmQgd3JpdGVzIHJlY29yZHMuJyxcbiAgICAgIH0sXG4gICAgXSxcbiAgICBub2RlSW5kZXg6IE9iamVjdC5mcm9tRW50cmllcyhub2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLmlkLCBub2RlXSkpLFxuICAgIHJlbGF0aW9uVHlwZXM6IFsnZGVwZW5kc19vbiddLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2FtcGxlTWVyZ2VkR3JhcGhEYXRhKCkge1xuICByZXR1cm4ge1xuICAgIG5vZGVzOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnYXBpJyxcbiAgICAgICAgbmFtZTogJ0FQSSBTZXJ2aWNlJyxcbiAgICAgICAgdHlwZTogJ3NvZnR3YXJlJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdDb3JlIEFQSScsXG4gICAgICAgIHJpc2tfc2NvcmU6IDgyLFxuICAgICAgICByaXNrX2xldmVsOiAnaGlnaCcsXG4gICAgICAgIGRlZ3JlZTogMixcbiAgICAgICAgYmV0d2Vlbm5lc3M6IDAuNTUsXG4gICAgICAgIGNsb3NlbmVzczogMC42NyxcbiAgICAgICAgYmxhc3RfcmFkaXVzOiAzLFxuICAgICAgICBkZXBlbmRlbmN5X3NwYW46IDIsXG4gICAgICAgIHJpc2tfZXhwbGFuYXRpb246ICdIYW5kbGVzIGNvcmUgcmVxdWVzdHMuJyxcbiAgICAgICAgc291cmNlOiAnc2FtcGxlJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiAnZGInLFxuICAgICAgICBuYW1lOiAnRGF0YWJhc2UnLFxuICAgICAgICB0eXBlOiAnZGF0YScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnUGVyc2lzdGVuY2UgbGF5ZXInLFxuICAgICAgICByaXNrX3Njb3JlOiA0NCxcbiAgICAgICAgcmlza19sZXZlbDogJ21lZGl1bScsXG4gICAgICAgIGRlZ3JlZTogMSxcbiAgICAgICAgYmV0d2Vlbm5lc3M6IDAuMjIsXG4gICAgICAgIGNsb3NlbmVzczogMC40NCxcbiAgICAgICAgYmxhc3RfcmFkaXVzOiAxLFxuICAgICAgICBkZXBlbmRlbmN5X3NwYW46IDEsXG4gICAgICAgIHJpc2tfZXhwbGFuYXRpb246ICdTdG9yZXMgcmVjb3Jkcy4nLFxuICAgICAgICBzb3VyY2U6ICdzYW1wbGUnLFxuICAgICAgfSxcbiAgICBdLFxuICAgIGVkZ2VzOiBbXG4gICAgICB7XG4gICAgICAgIHNvdXJjZTogJ2FwaScsXG4gICAgICAgIHRhcmdldDogJ2RiJyxcbiAgICAgICAgcmVsYXRpb246ICdkZXBlbmRzX29uJyxcbiAgICAgICAgcmF0aW9uYWxlOiAnUmVhZHMgYW5kIHdyaXRlcyByZWNvcmRzLicsXG4gICAgICB9LFxuICAgIF0sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTYW1wbGVEb2N1bWVudEdyYXBoRGF0YSgpIHtcbiAgY29uc3Qgbm9kZXMgPSBbXG4gICAge1xuICAgICAgaWQ6ICdEMScsXG4gICAgICBsYWJlbDogJ1JldGVudGlvbiBQb2xpY3knLFxuICAgICAga2luZDogJ3JlcXVpcmVtZW50JyxcbiAgICAgIGNhbm9uaWNhbE5hbWU6ICdSZXRlbnRpb24gUG9saWN5JyxcbiAgICAgIGFsaWFzZXM6IFsncmVjb3JkcyBwb2xpY3knXSxcbiAgICAgIHN1bW1hcnk6ICdEZWZpbmVzIHJlY29yZCByZXRlbnRpb24uJyxcbiAgICAgIGV2aWRlbmNlOiBbeyBxdW90ZTogJ1JlY29yZHMgYXJlIHJldGFpbmVkIGZvciA3IHllYXJzLicsIHBhZ2VTdGFydDogMSwgcGFnZUVuZDogMSB9XSxcbiAgICAgIHNvdXJjZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGRvY3VtZW50TmFtZTogJ3BvbGljeS5wZGYnLFxuICAgICAgICAgIGNodW5rRmlsZTogJ2NodW5rXzAxLnR4dCcsXG4gICAgICAgICAgY2h1bmtJZDogJ2NodW5rXzAxJyxcbiAgICAgICAgICBwZGZQYWdlU3RhcnQ6IDEsXG4gICAgICAgICAgcGRmUGFnZUVuZDogMSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBkZWdyZWU6IDEsXG4gICAgICBzb3VyY2U6ICdkb2N1bWVudCcsXG4gICAgICB2YWw6IDIwLFxuICAgIH0sXG4gICAge1xuICAgICAgaWQ6ICdEMicsXG4gICAgICBsYWJlbDogJ1NldmVuIFllYXJzJyxcbiAgICAgIGtpbmQ6ICdkYXRlJyxcbiAgICAgIGNhbm9uaWNhbE5hbWU6ICdTZXZlbiBZZWFycycsXG4gICAgICBhbGlhc2VzOiBbXSxcbiAgICAgIHN1bW1hcnk6ICdSZXRlbnRpb24gZHVyYXRpb24uJyxcbiAgICAgIGV2aWRlbmNlOiBbeyBxdW90ZTogJzcgeWVhcnMnLCBwYWdlU3RhcnQ6IDEsIHBhZ2VFbmQ6IDEgfV0sXG4gICAgICBzb3VyY2VzOiBbXSxcbiAgICAgIGRlZ3JlZTogMSxcbiAgICAgIHNvdXJjZTogJ2RvY3VtZW50JyxcbiAgICAgIHZhbDogMjAsXG4gICAgfSxcbiAgXTtcblxuICByZXR1cm4ge1xuICAgIHNvdXJjZTogJ2RvY3VtZW50JyxcbiAgICBpbmdlc3Rpb25JZDogJ2RvYy0xMjMnLFxuICAgIG5vZGVzLFxuICAgIGxpbmtzOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnREUxJyxcbiAgICAgICAgc291cmNlOiAnRDEnLFxuICAgICAgICB0YXJnZXQ6ICdEMicsXG4gICAgICAgIHR5cGU6ICdyZXF1aXJlcycsXG4gICAgICAgIHN1bW1hcnk6ICdSZXRlbnRpb24gcG9saWN5IHJlcXVpcmVzIHNldmVuIHllYXJzLicsXG4gICAgICAgIGV2aWRlbmNlOiBbeyBxdW90ZTogJ3JldGFpbmVkIGZvciA3IHllYXJzJywgcGFnZVN0YXJ0OiAxLCBwYWdlRW5kOiAxIH1dLFxuICAgICAgICBzb3VyY2VDaHVuazoge1xuICAgICAgICAgIGRvY3VtZW50TmFtZTogJ3BvbGljeS5wZGYnLFxuICAgICAgICAgIGNodW5rRmlsZTogJ2NodW5rXzAxLnR4dCcsXG4gICAgICAgICAgY2h1bmtJZDogJ2NodW5rXzAxJyxcbiAgICAgICAgICBwZGZQYWdlU3RhcnQ6IDEsXG4gICAgICAgICAgcGRmUGFnZUVuZDogMSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgXSxcbiAgICBub2RlSW5kZXg6IE9iamVjdC5mcm9tRW50cmllcyhub2Rlcy5tYXAoKG5vZGUpID0+IFtub2RlLmlkLCBub2RlXSkpLFxuICAgIGtpbmRUeXBlczogWydkYXRlJywgJ3JlcXVpcmVtZW50J10sXG4gICAgcmVsYXRpb25UeXBlczogWydyZXF1aXJlcyddLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTW9ja0NvbnRleHQob3ZlcnJpZGVzID0ge30pIHtcbiAgcmV0dXJuIHtcbiAgICB1cGxvYWQ6IHtcbiAgICAgIHBoYXNlOiAnaWRsZScsXG4gICAgICBzZWxlY3RlZEZpbGU6IG51bGwsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWQgYSAubWQgb3IgLnR4dCBmaWxlIHRvIGJ1aWxkIHRoZSBncmFwaC4nLFxuICAgICAgaW5nZXN0aW9uSWQ6IG51bGwsXG4gICAgICBpbmdlc3Rpb246IG51bGwsXG4gICAgICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxuICAgICAgc3RhcnRlZEF0OiBudWxsLFxuICAgICAgY29tcGxldGVkQXQ6IG51bGwsXG4gICAgICByZXRyeUNvdW50OiAwLFxuICAgIH0sXG4gICAgZ3JhcGg6IHtcbiAgICAgIHN0YXR1czogJ2lkbGUnLFxuICAgICAgZGF0YTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxuICAgIH0sXG4gICAgZG9jdW1lbnRVcGxvYWQ6IHtcbiAgICAgIHBoYXNlOiAnaWRsZScsXG4gICAgICBzZWxlY3RlZEZpbGU6IG51bGwsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWQgYSAucGRmLCAubWQsIG9yIC50eHQgZmlsZSB0byBidWlsZCBhIGRvY3VtZW50IGdyYXBoLicsXG4gICAgICBpbmdlc3Rpb25JZDogbnVsbCxcbiAgICAgIGluZ2VzdGlvbjogbnVsbCxcbiAgICAgIHByb2Nlc3NpbmdTdGF0dXM6IG51bGwsXG4gICAgICBzdGFydGVkQXQ6IG51bGwsXG4gICAgICBjb21wbGV0ZWRBdDogbnVsbCxcbiAgICAgIHJldHJ5Q291bnQ6IDAsXG4gICAgfSxcbiAgICBkb2N1bWVudEdyYXBoOiB7XG4gICAgICBzdGF0dXM6ICdpZGxlJyxcbiAgICAgIGRhdGE6IG51bGwsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIGxhc3RMb2FkZWRBdDogbnVsbCxcbiAgICAgIGFydGlmYWN0czogbnVsbCxcbiAgICAgIGFydGlmYWN0c0Vycm9yOiBudWxsLFxuICAgIH0sXG4gICAgdXBsb2FkZWRHcmFwaFVwbG9hZDoge1xuICAgICAgcGhhc2U6ICdpZGxlJyxcbiAgICAgIHNlbGVjdGVkRmlsZTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgc3RhdHVzTWVzc2FnZTogJ1VwbG9hZCBhIG1lcmdlZF9ncmFwaC5qc29uIGZpbGUgdG8gaW5zcGVjdCBhIGZpbmFsaXplZCBrbm93bGVkZ2UgZ3JhcGguJyxcbiAgICB9LFxuICAgIHVwbG9hZGVkR3JhcGg6IHtcbiAgICAgIHN0YXR1czogJ2lkbGUnLFxuICAgICAga2luZDogbnVsbCxcbiAgICAgIG9wZXJhdGlvbmFsRGF0YTogbnVsbCxcbiAgICAgIGRvY3VtZW50RGF0YTogbnVsbCxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgbGFzdExvYWRlZEF0OiBudWxsLFxuICAgICAgZmlsZW5hbWU6IG51bGwsXG4gICAgICByYXdEYXRhOiBudWxsLFxuICAgIH0sXG4gICAgc2V0RHJhZ0FjdGl2ZTogKCkgPT4ge30sXG4gICAgc2VsZWN0RmlsZTogKCkgPT4gdHJ1ZSxcbiAgICBjbGVhclNlbGVjdGVkRmlsZTogKCkgPT4ge30sXG4gICAgYmVnaW5Qcm9jZXNzaW5nOiBhc3luYyAoKSA9PiB7fSxcbiAgICBsb2FkR3JhcGg6IGFzeW5jICgpID0+IHt9LFxuICAgIHNldERvY3VtZW50RHJhZ0FjdGl2ZTogKCkgPT4ge30sXG4gICAgc2VsZWN0RG9jdW1lbnRGaWxlOiAoKSA9PiB0cnVlLFxuICAgIGNsZWFyU2VsZWN0ZWREb2N1bWVudEZpbGU6ICgpID0+IHt9LFxuICAgIGJlZ2luRG9jdW1lbnRQcm9jZXNzaW5nOiBhc3luYyAoKSA9PiB7fSxcbiAgICBsb2FkRG9jdW1lbnRHcmFwaDogYXN5bmMgKCkgPT4ge30sXG4gICAgc2V0VXBsb2FkZWRHcmFwaERyYWdBY3RpdmU6ICgpID0+IHt9LFxuICAgIHNlbGVjdFVwbG9hZGVkR3JhcGhGaWxlOiAoKSA9PiB0cnVlLFxuICAgIGNsZWFyU2VsZWN0ZWRVcGxvYWRlZEdyYXBoRmlsZTogKCkgPT4ge30sXG4gICAgbG9hZFVwbG9hZGVkR3JhcGhGcm9tU2VsZWN0ZWRGaWxlOiBhc3luYyAoKSA9PiB7fSxcbiAgICByZXNldFVwbG9hZFN0YXRlOiAoKSA9PiB7fSxcbiAgICAuLi5vdmVycmlkZXMsXG4gIH07XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQUVBLFNBQVMsV0FBVyxPQUFvQyxVQUFrQjtBQUN4RSxRQUFNLFNBQVMsT0FBTyxLQUFLO0FBQzNCLFNBQU8sT0FBTyxTQUFTLE1BQU0sS0FBSyxTQUFTLElBQUksU0FBUztBQUMxRDtBQUxBLElBQU0sZUFPTztBQVBiO0FBQUE7QUFBQTtBQUFBLElBQU0sZ0JBQWdCLE9BQU8sbUJBQW1CLENBQUM7QUFPMUMsSUFBTSxZQUFZO0FBQUEsTUFDdkIsWUFBWTtBQUFBLE1BQ1osZ0JBQ0UsV0FBVyxjQUFjLGlCQUFpQixZQUFZLElBQUksb0JBQW9CLEVBQUUsSUFBSSxPQUFPO0FBQUEsTUFDN0YscUJBQXFCO0FBQUEsUUFDbkIsY0FBYyx5QkFBeUIsWUFBWSxJQUFJO0FBQUEsUUFDdkQ7QUFBQSxNQUNGO0FBQUEsTUFDQSxhQUFhLGNBQWMsV0FBVztBQUFBLElBQ3hDO0FBQUE7QUFBQTs7O0FDaEJBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUE0Q0EsZUFBZSxnQkFBZ0IsVUFBb0I7QUFDakQsUUFBTSxPQUFPLE1BQU0sU0FBUyxLQUFLO0FBQ2pDLFVBQVEsSUFBSSxxQkFBcUIsSUFBSTtBQUVyQyxNQUFJLENBQUMsTUFBTTtBQUNULFdBQU87QUFBQSxFQUNUO0FBRUEsTUFBSTtBQUNGLFdBQU8sS0FBSyxNQUFNLElBQUk7QUFBQSxFQUN4QixTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sZ0JBQWdCLEtBQUs7QUFDbkMsWUFBUSxNQUFNLHNCQUFzQixJQUFJO0FBQ3hDLFVBQU0sSUFBSSxlQUFlLG9DQUFvQztBQUFBLE1BQzNELFFBQVEsU0FBUztBQUFBLE1BQ2pCLFdBQVc7QUFBQSxJQUNiLENBQUM7QUFBQSxFQUNIO0FBQ0Y7QUFFQSxlQUFlLFFBQVcsTUFBYyxPQUFvQixDQUFDLEdBQUcsWUFBWSxLQUFtQjtBQUM3RixRQUFNLGFBQWEsSUFBSSxnQkFBZ0I7QUFDdkMsUUFBTSxVQUFVLE9BQU8sV0FBVyxNQUFNLFdBQVcsTUFBTSxHQUFHLFNBQVM7QUFFckUsTUFBSTtBQUNGLFVBQU0sV0FBVyxNQUFNLE1BQU0sT0FBTyxJQUFJLElBQUk7QUFBQSxNQUMxQyxHQUFHO0FBQUEsTUFDSCxRQUFRLFdBQVc7QUFBQSxJQUNyQixDQUFDO0FBQ0QsVUFBTSxVQUFVLE1BQU0sZ0JBQWdCLFFBQVE7QUFFOUMsUUFBSSxDQUFDLFdBQVcsT0FBTyxZQUFZLFVBQVU7QUFDM0MsWUFBTSxJQUFJLGVBQWUsdUNBQXVDO0FBQUEsUUFDOUQsUUFBUSxTQUFTO0FBQUEsUUFDakIsV0FBVztBQUFBLE1BQ2IsQ0FBQztBQUFBLElBQ0g7QUFFQSxRQUFJLENBQUMsU0FBUyxNQUFNLFFBQVEsV0FBVyxNQUFNO0FBQzNDLFlBQU0sZUFBZTtBQUNyQixZQUFNLElBQUksZUFBZSxhQUFhLE9BQU8sV0FBVyx1QkFBdUI7QUFBQSxRQUM3RSxNQUFNLGFBQWEsT0FBTztBQUFBLFFBQzFCLFFBQVEsU0FBUztBQUFBLFFBQ2pCLFNBQVMsYUFBYSxPQUFPO0FBQUEsUUFDN0IsV0FBVyxTQUFTLFVBQVUsT0FBTyxTQUFTLFdBQVc7QUFBQSxNQUMzRCxDQUFDO0FBQUEsSUFDSDtBQUVBLFdBQU8sUUFBUTtBQUFBLEVBQ2pCLFNBQVMsT0FBTztBQUNkLFFBQUksaUJBQWlCLGdCQUFnQjtBQUNuQyxZQUFNO0FBQUEsSUFDUjtBQUVBLFFBQUksaUJBQWlCLGdCQUFnQixNQUFNLFNBQVMsY0FBYztBQUNoRSxZQUFNLElBQUksZUFBZSxzRUFBc0U7QUFBQSxRQUM3RixNQUFNO0FBQUEsUUFDTixXQUFXO0FBQUEsTUFDYixDQUFDO0FBQUEsSUFDSDtBQUVBLFVBQU0sSUFBSSxlQUFlLDBEQUEwRDtBQUFBLE1BQ2pGLE1BQU07QUFBQSxNQUNOLFdBQVc7QUFBQSxJQUNiLENBQUM7QUFBQSxFQUNILFVBQUU7QUFDQSxXQUFPLGFBQWEsT0FBTztBQUFBLEVBQzdCO0FBQ0Y7QUFFQSxlQUFzQixlQUNwQixNQUNBLGtCQUFrQixNQUNsQixZQUFZLFVBQVUscUJBQ3RCLGFBQ0E7QUFDQSxRQUFNLFdBQVcsSUFBSSxTQUFTO0FBQzlCLFdBQVMsT0FBTyxRQUFRLElBQUk7QUFDNUIsV0FBUyxPQUFPLG9CQUFvQixPQUFPLGVBQWUsQ0FBQztBQUMzRCxNQUFJLGFBQWE7QUFDZixhQUFTLE9BQU8sZ0JBQWdCLFdBQVc7QUFBQSxFQUM3QztBQUVBLFNBQU87QUFBQSxJQUNMO0FBQUEsSUFDQTtBQUFBLE1BQ0UsUUFBUTtBQUFBLE1BQ1IsTUFBTTtBQUFBLElBQ1I7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUNGO0FBRUEsZUFBc0Isd0JBQ3BCLE1BQ0Esa0JBQWtCLE1BQ2xCLFlBQVksVUFBVSxxQkFDdEIsYUFDQTtBQUNBLFFBQU0sV0FBVyxJQUFJLFNBQVM7QUFDOUIsV0FBUyxPQUFPLFFBQVEsSUFBSTtBQUM1QixXQUFTLE9BQU8sb0JBQW9CLE9BQU8sZUFBZSxDQUFDO0FBQzNELE1BQUksYUFBYTtBQUNmLGFBQVMsT0FBTyxnQkFBZ0IsV0FBVztBQUFBLEVBQzdDO0FBRUEsU0FBTztBQUFBLElBQ0w7QUFBQSxJQUNBO0FBQUEsTUFDRSxRQUFRO0FBQUEsTUFDUixNQUFNO0FBQUEsSUFDUjtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxlQUFzQixXQUFXO0FBQy9CLFNBQU8sUUFBc0IsUUFBUTtBQUN2QztBQUVBLGVBQXNCLG1CQUFtQjtBQUN2QyxTQUFPLFFBQThCLGlCQUFpQjtBQUN4RDtBQUVBLGVBQXNCLDZCQUE2QjtBQUNqRCxTQUFPLFFBQWtDLHFCQUFxQjtBQUNoRTtBQUVBLGVBQXNCLHFCQUFxQixhQUFxQjtBQUM5RCxTQUFPLFFBQWtDLHVCQUF1QixtQkFBbUIsV0FBVyxDQUFDLEVBQUU7QUFDbkc7QUFFTyxTQUFTLCtCQUErQixhQUFxQixZQUFvQjtBQUN0RixTQUFPLDJCQUEyQixtQkFBbUIsV0FBVyxDQUFDLFVBQVUsbUJBQW1CLFVBQVUsQ0FBQztBQUMzRztBQUVPLFNBQVMscUNBQXFDLGFBQXFCO0FBQ3hFLFNBQU8sMkJBQTJCLG1CQUFtQixXQUFXLENBQUM7QUFDbkU7QUFFQSxlQUFzQixRQUFRLGFBQXFCO0FBQ2pELFNBQU8sUUFBc0Isc0JBQXNCLG1CQUFtQixXQUFXLENBQUMsRUFBRTtBQUN0RjtBQUVBLGVBQXNCLFVBQVUsYUFBcUI7QUFDbkQsU0FBTyxRQUF3Qix3QkFBd0IsbUJBQW1CLFdBQVcsQ0FBQyxFQUFFO0FBQzFGO0FBRUEsZUFBc0IsZ0JBQWdCO0FBQ3BDLFNBQU87QUFBQSxJQUNMO0FBQUEsSUFDQSxFQUFFLFFBQVEsT0FBTztBQUFBLEVBQ25CO0FBQ0Y7QUFFQSxlQUFzQixvQkFBb0IsYUFBcUI7QUFDN0QsU0FBTyxRQUEwQixXQUFXLG1CQUFtQixXQUFXLENBQUMsU0FBUztBQUN0RjtBQUVBLGVBQXNCLDRCQUE0QixhQUFxQjtBQUNyRSxTQUFPLFFBQTBCLG9CQUFvQixtQkFBbUIsV0FBVyxDQUFDLFNBQVM7QUFDL0Y7QUFFQSxlQUFzQixxQkFBcUM7QUFFekQsUUFBTSxJQUFJLHlCQUF5QiwyRUFBMkU7QUFDaEg7QUFFQSxlQUFzQix5QkFBeUM7QUFFN0QsUUFBTSxJQUFJLHlCQUF5QixnRkFBZ0Y7QUFDckg7QUF2TkEsSUFhYSxnQkF3QkE7QUFyQ2I7QUFBQTtBQUFBO0FBQUE7QUFhTyxJQUFNLGlCQUFOLGNBQTZCLE1BQU07QUFBQSxNQUN4QztBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BRUEsWUFDRSxTQUNBLFVBS0ksQ0FBQyxHQUNMO0FBQ0EsY0FBTSxPQUFPO0FBQ2IsYUFBSyxPQUFPO0FBQ1osYUFBSyxPQUFPLFFBQVE7QUFDcEIsYUFBSyxTQUFTLFFBQVE7QUFDdEIsYUFBSyxVQUFVLFFBQVE7QUFDdkIsYUFBSyxZQUFZLFFBQVEsYUFBYTtBQUFBLE1BQ3hDO0FBQUEsSUFDRjtBQUVPLElBQU0sMkJBQU4sY0FBdUMsTUFBTTtBQUFBLE1BQ2xELFlBQVksU0FBaUI7QUFDM0IsY0FBTSxPQUFPO0FBQ2IsYUFBSyxPQUFPO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFBQTtBQUFBOzs7QUMxQ0EsT0FBTyxZQUFZO0FBQ25CLE9BQU8sVUFBVTs7O0FDRFYsU0FBUywyQkFBMkIsWUFBc0QsQ0FBQyxHQUFHO0FBQ25HLFFBQU0sd0JBQXdCLENBQUMsYUFBbUMsV0FBVyxNQUFNLFNBQVMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQzFHLFFBQU0sdUJBQXVCLENBQUMsV0FBbUIsYUFBYSxNQUFNO0FBRXBFLFNBQU8sZUFBZSxZQUFZLFVBQVU7QUFBQSxJQUMxQyxjQUFjO0FBQUEsSUFDZCxVQUFVO0FBQUEsSUFDVixPQUFPO0FBQUEsTUFDTCxpQkFBaUI7QUFBQSxRQUNmLGVBQWU7QUFBQSxRQUNmLHVCQUF1QjtBQUFBLFFBQ3ZCLFNBQVM7QUFBQSxRQUNULEdBQUc7QUFBQSxNQUNMO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0Esa0JBQWtCLE1BQU07QUFBQSxNQUFDO0FBQUEsTUFDekIscUJBQXFCLE1BQU07QUFBQSxNQUFDO0FBQUEsTUFDNUI7QUFBQSxNQUNBO0FBQUEsTUFDQSxrQkFBa0I7QUFBQSxJQUNwQjtBQUFBLEVBQ0YsQ0FBQztBQUVELFNBQU8sZUFBZSxZQUFZLFlBQVk7QUFBQSxJQUM1QyxjQUFjO0FBQUEsSUFDZCxVQUFVO0FBQUEsSUFDVixPQUFPO0FBQUEsTUFDTCxlQUFlLE9BQU87QUFBQSxRQUNwQixZQUFZLE9BQU8sQ0FBQztBQUFBLFFBQ3BCLE9BQU8sQ0FBQztBQUFBLFFBQ1IsY0FBYyxNQUFNO0FBQUEsUUFBQztBQUFBLFFBQ3JCLGFBQWEsTUFBTTtBQUFBLFFBQUM7QUFBQSxNQUN0QjtBQUFBLE1BQ0EsTUFBTTtBQUFBLFFBQ0osYUFBYSxNQUFNO0FBQUEsUUFBQztBQUFBLE1BQ3RCO0FBQUEsSUFDRjtBQUFBLEVBQ0YsQ0FBQztBQUVELFNBQU8sZUFBZSxZQUFZLGFBQWE7QUFBQSxJQUM3QyxjQUFjO0FBQUEsSUFDZCxVQUFVO0FBQUEsSUFDVixPQUFPO0FBQUEsTUFDTCxXQUFXO0FBQUEsSUFDYjtBQUFBLEVBQ0YsQ0FBQztBQUVELFNBQU8sZUFBZSxZQUFZLHlCQUF5QjtBQUFBLElBQ3pELGNBQWM7QUFBQSxJQUNkLFVBQVU7QUFBQSxJQUNWLE9BQU87QUFBQSxFQUNULENBQUM7QUFFRCxTQUFPLGVBQWUsWUFBWSx3QkFBd0I7QUFBQSxJQUN4RCxjQUFjO0FBQUEsSUFDZCxVQUFVO0FBQUEsSUFDVixPQUFPO0FBQUEsRUFDVCxDQUFDO0FBRUQsTUFBSSxFQUFFLG9CQUFvQixhQUFhO0FBQ3JDLFdBQU8sZUFBZSxZQUFZLGtCQUFrQjtBQUFBLE1BQ2xELGNBQWM7QUFBQSxNQUNkLFVBQVU7QUFBQSxNQUNWLE9BQU8sTUFBTSxlQUFlO0FBQUEsUUFDMUIsVUFBVTtBQUFBLFFBQUM7QUFBQSxRQUNYLFlBQVk7QUFBQSxRQUFDO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFBQztBQUFBLE1BQ2hCO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUNGOzs7QURyRUEsMkJBQTJCO0FBQUEsRUFDekIsZUFBZTtBQUFBLEVBQ2YsdUJBQXVCO0FBQUEsRUFDdkIsU0FBUztBQUNYLENBQUM7QUFFRCxJQUFNLFlBQVksTUFBTTtBQUN4QixJQUFNLEVBQUUsZ0JBQUFBLGlCQUFnQiw0QkFBQUMsNkJBQTRCLHNCQUFBQyx1QkFBc0IsVUFBQUMsVUFBUyxJQUFJO0FBRXZGLEtBQUssK0NBQStDLFlBQVk7QUFDOUQsYUFBVyxRQUFRLFlBQ2pCLElBQUk7QUFBQSxJQUNGLEtBQUssVUFBVTtBQUFBLE1BQ2IsUUFBUTtBQUFBLE1BQ1IsTUFBTTtBQUFBLFFBQ0osUUFBUTtBQUFBLFFBQ1IsT0FBTyxDQUFDO0FBQUEsUUFDUixPQUFPLENBQUM7QUFBQSxNQUNWO0FBQUEsSUFDRixDQUFDO0FBQUEsSUFDRDtBQUFBLE1BQ0UsUUFBUTtBQUFBLE1BQ1IsU0FBUyxFQUFFLGdCQUFnQixtQkFBbUI7QUFBQSxJQUNoRDtBQUFBLEVBQ0Y7QUFFRixRQUFNLFFBQVEsTUFBTUEsVUFBUztBQUM3QixTQUFPLE1BQU0sTUFBTSxRQUFRLE1BQU07QUFDakMsU0FBTyxVQUFVLE1BQU0sT0FBTyxDQUFDLENBQUM7QUFDaEMsU0FBTyxVQUFVLE1BQU0sT0FBTyxDQUFDLENBQUM7QUFDbEMsQ0FBQztBQUVELEtBQUssb0RBQW9ELFlBQVk7QUFDbkUsYUFBVyxRQUFRLFlBQ2pCLElBQUksU0FBUyxhQUFhO0FBQUEsSUFDeEIsUUFBUTtBQUFBLElBQ1IsU0FBUyxFQUFFLGdCQUFnQixtQkFBbUI7QUFBQSxFQUNoRCxDQUFDO0FBRUgsUUFBTSxPQUFPLFFBQVEsTUFBTUEsVUFBUyxHQUFHLENBQUMsVUFBbUI7QUFDekQsV0FBTyxHQUFHLGlCQUFpQkgsZUFBYztBQUN6QyxXQUFPLE1BQU0sTUFBTSxTQUFTLGtDQUFrQztBQUM5RCxXQUFPO0FBQUEsRUFDVCxDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssNERBQTRELFlBQVk7QUFDM0UsYUFBVyxRQUFRLFlBQ2pCLElBQUk7QUFBQSxJQUNGLEtBQUssVUFBVTtBQUFBLE1BQ2IsUUFBUTtBQUFBLE1BQ1IsT0FBTztBQUFBLFFBQ0wsTUFBTTtBQUFBLFFBQ04sU0FBUztBQUFBLE1BQ1g7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNEO0FBQUEsTUFDRSxRQUFRO0FBQUEsTUFDUixTQUFTLEVBQUUsZ0JBQWdCLG1CQUFtQjtBQUFBLElBQ2hEO0FBQUEsRUFDRjtBQUVGLFFBQU0sT0FBTyxRQUFRLE1BQU1HLFVBQVMsR0FBRyxDQUFDLFVBQW1CO0FBQ3pELFdBQU8sR0FBRyxpQkFBaUJILGVBQWM7QUFDekMsV0FBTyxNQUFNLE1BQU0sTUFBTSxjQUFjO0FBQ3ZDLFdBQU8sTUFBTSxNQUFNLFFBQVEsR0FBRztBQUM5QixXQUFPLE1BQU0sTUFBTSxTQUFTLGdDQUFnQztBQUM1RCxXQUFPO0FBQUEsRUFDVCxDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssMERBQTBELFlBQVk7QUFDekUsYUFBVyxRQUFRLFlBQVk7QUFDN0IsVUFBTSxJQUFJLGFBQWEsYUFBYSxZQUFZO0FBQUEsRUFDbEQ7QUFFQSxRQUFNLE9BQU8sUUFBUSxNQUFNRyxVQUFTLEdBQUcsQ0FBQyxVQUFtQjtBQUN6RCxXQUFPLEdBQUcsaUJBQWlCSCxlQUFjO0FBQ3pDLFdBQU8sTUFBTSxNQUFNLE1BQU0saUJBQWlCO0FBQzFDLFdBQU8sTUFBTSxNQUFNLFNBQVMsWUFBWTtBQUN4QyxXQUFPO0FBQUEsRUFDVCxDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssZ0VBQWdFLFlBQVk7QUFDL0UsYUFBVyxRQUFRLFlBQVk7QUFDN0IsVUFBTSxJQUFJLE1BQU0sZ0JBQWdCO0FBQUEsRUFDbEM7QUFFQSxRQUFNLE9BQU8sUUFBUSxNQUFNRyxVQUFTLEdBQUcsQ0FBQyxVQUFtQjtBQUN6RCxXQUFPLEdBQUcsaUJBQWlCSCxlQUFjO0FBQ3pDLFdBQU8sTUFBTSxNQUFNLE1BQU0sZUFBZTtBQUN4QyxXQUFPLE1BQU0sTUFBTSxXQUFXLElBQUk7QUFDbEMsV0FBTyxNQUFNLE1BQU0sU0FBUyxpQkFBaUI7QUFDN0MsV0FBTztBQUFBLEVBQ1QsQ0FBQztBQUNILENBQUM7QUFFRCxLQUFLLG1FQUFtRSxZQUFZO0FBQ2xGLGFBQVcsUUFBUSxZQUNqQixJQUFJO0FBQUEsSUFDRixLQUFLLFVBQVU7QUFBQSxNQUNiLFFBQVE7QUFBQSxNQUNSLE1BQU07QUFBQSxRQUNKLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxVQUNOLFVBQVU7QUFBQSxVQUNWLGNBQWM7QUFBQSxRQUNoQjtBQUFBLFFBQ0EsV0FBVztBQUFBLFVBQ1Q7QUFBQSxZQUNFLElBQUk7QUFBQSxZQUNKLE1BQU07QUFBQSxZQUNOLFVBQVU7QUFBQSxZQUNWLGVBQWU7QUFBQSxZQUNmLFlBQVk7QUFBQSxZQUNaLGNBQWM7QUFBQSxVQUNoQjtBQUFBLFFBQ0Y7QUFBQSxRQUNBLGlCQUFpQixDQUFDO0FBQUEsTUFDcEI7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNEO0FBQUEsTUFDRSxRQUFRO0FBQUEsTUFDUixTQUFTLEVBQUUsZ0JBQWdCLG1CQUFtQjtBQUFBLElBQ2hEO0FBQUEsRUFDRjtBQUVGLFFBQU0sV0FBVyxNQUFNQyw0QkFBMkI7QUFDbEQsU0FBTyxNQUFNLFNBQVMsY0FBYyxPQUFPO0FBQzNDLFNBQU8sTUFBTSxTQUFTLE9BQU8sVUFBVSwrQkFBK0I7QUFDdEUsU0FBTyxNQUFNLFNBQVMsVUFBVSxDQUFDLEVBQUUsVUFBVSxvQkFBb0I7QUFDbkUsQ0FBQztBQUVELEtBQUssaUVBQWlFLFlBQVk7QUFDaEYsTUFBSSxlQUFlO0FBQ25CLGFBQVcsUUFBUSxPQUFPLFVBQVU7QUFDbEMsbUJBQWUsT0FBTyxLQUFLO0FBQzNCLFdBQU8sSUFBSTtBQUFBLE1BQ1QsS0FBSyxVQUFVO0FBQUEsUUFDYixRQUFRO0FBQUEsUUFDUixNQUFNO0FBQUEsVUFDSixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsWUFDTixVQUFVO0FBQUEsWUFDVixjQUFjO0FBQUEsVUFDaEI7QUFBQSxVQUNBLFdBQVcsQ0FBQztBQUFBLFVBQ1osaUJBQWlCLENBQUM7QUFBQSxRQUNwQjtBQUFBLE1BQ0YsQ0FBQztBQUFBLE1BQ0Q7QUFBQSxRQUNFLFFBQVE7QUFBQSxRQUNSLFNBQVMsRUFBRSxnQkFBZ0IsbUJBQW1CO0FBQUEsTUFDaEQ7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUVBLFFBQU0sV0FBVyxNQUFNQyxzQkFBcUIsUUFBUTtBQUNwRCxTQUFPLE1BQU0sY0FBYyxnQ0FBZ0M7QUFDM0QsU0FBTyxNQUFNLFNBQVMsY0FBYyxRQUFRO0FBQzlDLENBQUM7IiwKICAibmFtZXMiOiBbIkFwaUNsaWVudEVycm9yIiwgImdldEFjdGl2ZURvY3VtZW50QXJ0aWZhY3RzIiwgImdldERvY3VtZW50QXJ0aWZhY3RzIiwgImdldEdyYXBoIl0KfQo=
