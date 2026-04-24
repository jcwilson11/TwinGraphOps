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
var api_exports = {};
__export(api_exports, {
  ApiClientError: () => ApiClientError,
  UnsupportedEndpointError: () => UnsupportedEndpointError,
  getArchitectureSummary: () => getArchitectureSummary,
  getGraph: () => getGraph,
  getImpact: () => getImpact,
  getProcessingStatus: () => getProcessingStatus,
  getRisk: () => getRisk,
  getRiskRankedItems: () => getRiskRankedItems,
  seedDemoGraph: () => seedDemoGraph,
  uploadDocument: () => uploadDocument
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
async function getGraph() {
  return request("/graph");
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

// tests/api.test.ts
installRuntimeWindowConfig({
  MAX_UPLOAD_MB: 10,
  PROCESSING_TIMEOUT_MS: 5e3,
  APP_ENV: "test"
});
var apiModule = await Promise.resolve().then(() => (init_api(), api_exports));
var { ApiClientError: ApiClientError2, getGraph: getGraph2 } = apiModule;
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2xpYi9jb25maWcudHMiLCAiLi4vc3JjL2xpYi9hcGkudHMiLCAiLi4vdGVzdHMvYXBpLnRlc3QudHMiLCAiLi4vdGVzdHMvdGVzdC11dGlscy50c3giXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IHJ1bnRpbWVDb25maWcgPSB3aW5kb3cuX19UV0lOX0NPTkZJR19fID8/IHt9O1xyXG5cclxuZnVuY3Rpb24gcmVhZE51bWJlcih2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgdW5kZWZpbmVkLCBmYWxsYmFjazogbnVtYmVyKSB7XHJcbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHZhbHVlKTtcclxuICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgJiYgcGFyc2VkID4gMCA/IHBhcnNlZCA6IGZhbGxiYWNrO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgYXBwQ29uZmlnID0ge1xyXG4gIGFwaUJhc2VVcmw6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxyXG4gIG1heFVwbG9hZEJ5dGVzOlxyXG4gICAgcmVhZE51bWJlcihydW50aW1lQ29uZmlnLk1BWF9VUExPQURfTUIgfHwgaW1wb3J0Lm1ldGEuZW52LlZJVEVfTUFYX1VQTE9BRF9NQiwgMTApICogMTAyNCAqIDEwMjQsXHJcbiAgcHJvY2Vzc2luZ1RpbWVvdXRNczogcmVhZE51bWJlcihcclxuICAgIHJ1bnRpbWVDb25maWcuUFJPQ0VTU0lOR19USU1FT1VUX01TIHx8IGltcG9ydC5tZXRhLmVudi5WSVRFX1BST0NFU1NJTkdfVElNRU9VVF9NUyxcclxuICAgIDMwMDAwMFxyXG4gICksXHJcbiAgZW52aXJvbm1lbnQ6IHJ1bnRpbWVDb25maWcuQVBQX0VOViB8fCAnbG9jYWwnLFxyXG59O1xyXG4iLCAiaW1wb3J0IHsgYXBwQ29uZmlnIH0gZnJvbSAnLi9jb25maWcnO1xyXG5pbXBvcnQgdHlwZSB7XHJcbiAgQXBpR3JhcGhEYXRhLFxyXG4gIEFwaVBheWxvYWQsXHJcbiAgSW1wYWN0UmVzcG9uc2UsXHJcbiAgSW5nZXN0UmVzcG9uc2UsXHJcbiAgUHJvY2Vzc2luZ1N0YXR1cyxcclxuICBSaXNrUmVzcG9uc2UsXHJcbn0gZnJvbSAnLi4vdHlwZXMvYXBpJztcclxuXHJcbmV4cG9ydCBjbGFzcyBBcGlDbGllbnRFcnJvciBleHRlbmRzIEVycm9yIHtcclxuICBjb2RlPzogc3RyaW5nO1xyXG4gIHN0YXR1cz86IG51bWJlcjtcclxuICBkZXRhaWxzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcbiAgcmV0cnlhYmxlOiBib29sZWFuO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIG1lc3NhZ2U6IHN0cmluZyxcclxuICAgIG9wdGlvbnM6IHtcclxuICAgICAgY29kZT86IHN0cmluZztcclxuICAgICAgc3RhdHVzPzogbnVtYmVyO1xyXG4gICAgICBkZXRhaWxzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcbiAgICAgIHJldHJ5YWJsZT86IGJvb2xlYW47XHJcbiAgICB9ID0ge31cclxuICApIHtcclxuICAgIHN1cGVyKG1lc3NhZ2UpO1xyXG4gICAgdGhpcy5uYW1lID0gJ0FwaUNsaWVudEVycm9yJztcclxuICAgIHRoaXMuY29kZSA9IG9wdGlvbnMuY29kZTtcclxuICAgIHRoaXMuc3RhdHVzID0gb3B0aW9ucy5zdGF0dXM7XHJcbiAgICB0aGlzLmRldGFpbHMgPSBvcHRpb25zLmRldGFpbHM7XHJcbiAgICB0aGlzLnJldHJ5YWJsZSA9IG9wdGlvbnMucmV0cnlhYmxlID8/IGZhbHNlO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFVuc3VwcG9ydGVkRW5kcG9pbnRFcnJvciBleHRlbmRzIEVycm9yIHtcclxuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcpIHtcclxuICAgIHN1cGVyKG1lc3NhZ2UpO1xyXG4gICAgdGhpcy5uYW1lID0gJ1Vuc3VwcG9ydGVkRW5kcG9pbnRFcnJvcic7XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBwYXJzZUpzb25TYWZlbHkocmVzcG9uc2U6IFJlc3BvbnNlKSB7XHJcbiAgY29uc3QgdGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuICBjb25zb2xlLmxvZygnQkFDS0VORCBSRVNQT05TRTonLCB0ZXh0KTtcclxuXHJcbiAgaWYgKCF0ZXh0KSB7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIHRyeSB7XHJcbiAgICByZXR1cm4gSlNPTi5wYXJzZSh0ZXh0KSBhcyBBcGlQYXlsb2FkPHVua25vd24+O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdQQVJTRSBFUlJPUjonLCBlcnJvcik7XHJcbiAgICBjb25zb2xlLmVycm9yKCdSQVcgUkVTUE9OU0UgVEVYVDonLCB0ZXh0KTtcclxuICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcignVGhlIEFQSSByZXR1cm5lZCBtYWxmb3JtZWQgSlNPTi4nLCB7XHJcbiAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxyXG4gICAgICByZXRyeWFibGU6IGZhbHNlLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiByZXF1ZXN0PFQ+KHBhdGg6IHN0cmluZywgaW5pdDogUmVxdWVzdEluaXQgPSB7fSwgdGltZW91dE1zID0gMzAwMDApOiBQcm9taXNlPFQ+IHtcclxuICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xyXG4gIGNvbnN0IHRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIHRpbWVvdXRNcyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAvYXBpJHtwYXRofWAsIHtcclxuICAgICAgLi4uaW5pdCxcclxuICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCxcclxuICAgIH0pO1xyXG4gICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IHBhcnNlSnNvblNhZmVseShyZXNwb25zZSk7XHJcblxyXG4gICAgaWYgKCFwYXlsb2FkIHx8IHR5cGVvZiBwYXlsb2FkICE9PSAnb2JqZWN0Jykge1xyXG4gICAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoJ1RoZSBBUEkgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuJywge1xyXG4gICAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxyXG4gICAgICAgIHJldHJ5YWJsZTogZmFsc2UsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghcmVzcG9uc2Uub2sgfHwgcGF5bG9hZC5zdGF0dXMgIT09ICdvaycpIHtcclxuICAgICAgY29uc3QgZXJyb3JQYXlsb2FkID0gcGF5bG9hZCBhcyBFeGNsdWRlPEFwaVBheWxvYWQ8VD4sIHsgc3RhdHVzOiAnb2snIH0+O1xyXG4gICAgICB0aHJvdyBuZXcgQXBpQ2xpZW50RXJyb3IoZXJyb3JQYXlsb2FkLmVycm9yPy5tZXNzYWdlIHx8ICdUaGUgcmVxdWVzdCBmYWlsZWQuJywge1xyXG4gICAgICAgIGNvZGU6IGVycm9yUGF5bG9hZC5lcnJvcj8uY29kZSxcclxuICAgICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcclxuICAgICAgICBkZXRhaWxzOiBlcnJvclBheWxvYWQuZXJyb3I/LmRldGFpbHMsXHJcbiAgICAgICAgcmV0cnlhYmxlOiByZXNwb25zZS5zdGF0dXMgPj0gNTAwIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gMCxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHBheWxvYWQuZGF0YSBhcyBUO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlDbGllbnRFcnJvcikge1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyb3IubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSB7XHJcbiAgICAgIHRocm93IG5ldyBBcGlDbGllbnRFcnJvcignUHJvY2Vzc2luZyB0aW1lZCBvdXQgYmVmb3JlIHRoZSBiYWNrZW5kIGNvbXBsZXRlZCB0aGUgZ3JhcGggYnVpbGQuJywge1xyXG4gICAgICAgIGNvZGU6ICdyZXF1ZXN0X3RpbWVvdXQnLFxyXG4gICAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3cgbmV3IEFwaUNsaWVudEVycm9yKCdOZXR3b3JrIGZhaWx1cmUgd2hpbGUgY29udGFjdGluZyB0aGUgVHdpbkdyYXBoT3BzIEFQSS4nLCB7XHJcbiAgICAgIGNvZGU6ICduZXR3b3JrX2Vycm9yJyxcclxuICAgICAgcmV0cnlhYmxlOiB0cnVlLFxyXG4gICAgfSk7XHJcbiAgfSBmaW5hbGx5IHtcclxuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZW91dCk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBsb2FkRG9jdW1lbnQoXHJcbiAgZmlsZTogRmlsZSxcclxuICByZXBsYWNlRXhpc3RpbmcgPSB0cnVlLFxyXG4gIHRpbWVvdXRNcyA9IGFwcENvbmZpZy5wcm9jZXNzaW5nVGltZW91dE1zLFxyXG4gIGluZ2VzdGlvbklkPzogc3RyaW5nXHJcbikge1xyXG4gIGNvbnN0IGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKCk7XHJcbiAgZm9ybURhdGEuYXBwZW5kKCdmaWxlJywgZmlsZSk7XHJcbiAgZm9ybURhdGEuYXBwZW5kKCdyZXBsYWNlX2V4aXN0aW5nJywgU3RyaW5nKHJlcGxhY2VFeGlzdGluZykpO1xyXG4gIGlmIChpbmdlc3Rpb25JZCkge1xyXG4gICAgZm9ybURhdGEuYXBwZW5kKCdpbmdlc3Rpb25faWQnLCBpbmdlc3Rpb25JZCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVxdWVzdDxJbmdlc3RSZXNwb25zZT4oXHJcbiAgICAnL2luZ2VzdCcsXHJcbiAgICB7XHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICBib2R5OiBmb3JtRGF0YSxcclxuICAgIH0sXHJcbiAgICB0aW1lb3V0TXNcclxuICApO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0R3JhcGgoKSB7XHJcbiAgcmV0dXJuIHJlcXVlc3Q8QXBpR3JhcGhEYXRhPignL2dyYXBoJyk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRSaXNrKGNvbXBvbmVudElkOiBzdHJpbmcpIHtcclxuICByZXR1cm4gcmVxdWVzdDxSaXNrUmVzcG9uc2U+KGAvcmlzaz9jb21wb25lbnRfaWQ9JHtlbmNvZGVVUklDb21wb25lbnQoY29tcG9uZW50SWQpfWApO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0SW1wYWN0KGNvbXBvbmVudElkOiBzdHJpbmcpIHtcclxuICByZXR1cm4gcmVxdWVzdDxJbXBhY3RSZXNwb25zZT4oYC9pbXBhY3Q/Y29tcG9uZW50X2lkPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGNvbXBvbmVudElkKX1gKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlZWREZW1vR3JhcGgoKSB7XHJcbiAgcmV0dXJuIHJlcXVlc3Q8eyBzb3VyY2U6IHN0cmluZzsgbm9kZXNfY3JlYXRlZDogbnVtYmVyOyBlZGdlc19jcmVhdGVkOiBudW1iZXI7IHJpc2tfbm9kZXNfc2NvcmVkOiBudW1iZXIgfT4oXHJcbiAgICAnL3NlZWQnLFxyXG4gICAgeyBtZXRob2Q6ICdQT1NUJyB9XHJcbiAgKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFByb2Nlc3NpbmdTdGF0dXMoaW5nZXN0aW9uSWQ6IHN0cmluZykge1xyXG4gIHJldHVybiByZXF1ZXN0PFByb2Nlc3NpbmdTdGF0dXM+KGAvaW5nZXN0LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGluZ2VzdGlvbklkKX0vZXZlbnRzYCk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRSaXNrUmFua2VkSXRlbXMoKTogUHJvbWlzZTxuZXZlcj4ge1xyXG4gIC8vIFRPRE86IHJlcGxhY2UgY2xpZW50LXNpZGUgcmlzayByYW5raW5nIHdoZW4gdGhlIGJhY2tlbmQgZXhwb3NlcyBhIGRlZGljYXRlZCByaXNrIGxpc3QgZW5kcG9pbnQuXHJcbiAgdGhyb3cgbmV3IFVuc3VwcG9ydGVkRW5kcG9pbnRFcnJvcignVGhlIGN1cnJlbnQgYmFja2VuZCBjb250cmFjdCBkb2VzIG5vdCBleHBvc2UgYSByYW5rZWQgcmlzayBsaXN0IGVuZHBvaW50LicpO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXJjaGl0ZWN0dXJlU3VtbWFyeSgpOiBQcm9taXNlPG5ldmVyPiB7XHJcbiAgLy8gVE9ETzogcmVwbGFjZSBjbGllbnQtc2lkZSBzdW1tYXJ5IGRlcml2YXRpb24gd2hlbiB0aGUgYmFja2VuZCBleHBvc2VzIGEgZGVkaWNhdGVkIHN1bW1hcnkgZW5kcG9pbnQuXHJcbiAgdGhyb3cgbmV3IFVuc3VwcG9ydGVkRW5kcG9pbnRFcnJvcignVGhlIGN1cnJlbnQgYmFja2VuZCBjb250cmFjdCBkb2VzIG5vdCBleHBvc2UgYW4gYXJjaGl0ZWN0dXJlIHN1bW1hcnkgZW5kcG9pbnQuJyk7XHJcbn1cclxuIiwgImltcG9ydCBhc3NlcnQgZnJvbSAnbm9kZTphc3NlcnQvc3RyaWN0JztcclxuaW1wb3J0IHRlc3QgZnJvbSAnbm9kZTp0ZXN0JztcclxuaW1wb3J0IHsgaW5zdGFsbFJ1bnRpbWVXaW5kb3dDb25maWcgfSBmcm9tICcuL3Rlc3QtdXRpbHMnO1xyXG5cclxuaW5zdGFsbFJ1bnRpbWVXaW5kb3dDb25maWcoe1xyXG4gIE1BWF9VUExPQURfTUI6IDEwLFxyXG4gIFBST0NFU1NJTkdfVElNRU9VVF9NUzogNTAwMCxcclxuICBBUFBfRU5WOiAndGVzdCcsXHJcbn0pO1xyXG5cclxuY29uc3QgYXBpTW9kdWxlID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvbGliL2FwaScpO1xyXG5jb25zdCB7IEFwaUNsaWVudEVycm9yLCBnZXRHcmFwaCB9ID0gYXBpTW9kdWxlO1xyXG5cclxudGVzdCgnZ2V0R3JhcGggcmV0dXJucyBwYXJzZWQgQVBJIGRhdGEgb24gc3VjY2VzcycsIGFzeW5jICgpID0+IHtcclxuICBnbG9iYWxUaGlzLmZldGNoID0gYXN5bmMgKCkgPT5cclxuICAgIG5ldyBSZXNwb25zZShcclxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHN0YXR1czogJ29rJyxcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICBzb3VyY2U6ICdkZW1vJyxcclxuICAgICAgICAgIG5vZGVzOiBbXSxcclxuICAgICAgICAgIGVkZ2VzOiBbXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgICAge1xyXG4gICAgICAgIHN0YXR1czogMjAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHsgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICBjb25zdCBncmFwaCA9IGF3YWl0IGdldEdyYXBoKCk7XHJcbiAgYXNzZXJ0LmVxdWFsKGdyYXBoLnNvdXJjZSwgJ2RlbW8nKTtcclxuICBhc3NlcnQuZGVlcEVxdWFsKGdyYXBoLm5vZGVzLCBbXSk7XHJcbiAgYXNzZXJ0LmRlZXBFcXVhbChncmFwaC5lZGdlcywgW10pO1xyXG59KTtcclxuXHJcbnRlc3QoJ2dldEdyYXBoIHRocm93cyBBcGlDbGllbnRFcnJvciBvbiBtYWxmb3JtZWQgSlNPTicsIGFzeW5jICgpID0+IHtcclxuICBnbG9iYWxUaGlzLmZldGNoID0gYXN5bmMgKCkgPT5cclxuICAgIG5ldyBSZXNwb25zZSgne25vdC1qc29uJywge1xyXG4gICAgICBzdGF0dXM6IDIwMCxcclxuICAgICAgaGVhZGVyczogeyAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgYXdhaXQgYXNzZXJ0LnJlamVjdHMoKCkgPT4gZ2V0R3JhcGgoKSwgKGVycm9yOiB1bmtub3duKSA9PiB7XHJcbiAgICBhc3NlcnQub2soZXJyb3IgaW5zdGFuY2VvZiBBcGlDbGllbnRFcnJvcik7XHJcbiAgICBhc3NlcnQuZXF1YWwoZXJyb3IubWVzc2FnZSwgJ1RoZSBBUEkgcmV0dXJuZWQgbWFsZm9ybWVkIEpTT04uJyk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9KTtcclxufSk7XHJcblxyXG50ZXN0KCdnZXRHcmFwaCBtYXBzIGJhY2tlbmQgZXJyb3IgcGF5bG9hZHMgaW50byBBcGlDbGllbnRFcnJvcicsIGFzeW5jICgpID0+IHtcclxuICBnbG9iYWxUaGlzLmZldGNoID0gYXN5bmMgKCkgPT5cclxuICAgIG5ldyBSZXNwb25zZShcclxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHN0YXR1czogJ2Vycm9yJyxcclxuICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgY29kZTogJ2dyYXBoX2ZhaWxlZCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnVGhlIGdyYXBoIGNvdWxkIG5vdCBiZSBsb2FkZWQuJyxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgICAge1xyXG4gICAgICAgIHN0YXR1czogNTAyLFxyXG4gICAgICAgIGhlYWRlcnM6IHsgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICBhd2FpdCBhc3NlcnQucmVqZWN0cygoKSA9PiBnZXRHcmFwaCgpLCAoZXJyb3I6IHVua25vd24pID0+IHtcclxuICAgIGFzc2VydC5vayhlcnJvciBpbnN0YW5jZW9mIEFwaUNsaWVudEVycm9yKTtcclxuICAgIGFzc2VydC5lcXVhbChlcnJvci5jb2RlLCAnZ3JhcGhfZmFpbGVkJyk7XHJcbiAgICBhc3NlcnQuZXF1YWwoZXJyb3Iuc3RhdHVzLCA1MDIpO1xyXG4gICAgYXNzZXJ0LmVxdWFsKGVycm9yLm1lc3NhZ2UsICdUaGUgZ3JhcGggY291bGQgbm90IGJlIGxvYWRlZC4nKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0pO1xyXG59KTtcclxuXHJcbnRlc3QoJ2dldEdyYXBoIG1hcHMgQWJvcnRFcnJvciBpbnRvIGEgdGltZW91dCBBcGlDbGllbnRFcnJvcicsIGFzeW5jICgpID0+IHtcclxuICBnbG9iYWxUaGlzLmZldGNoID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgdGhyb3cgbmV3IERPTUV4Y2VwdGlvbignVGltZWQgb3V0JywgJ0Fib3J0RXJyb3InKTtcclxuICB9O1xyXG5cclxuICBhd2FpdCBhc3NlcnQucmVqZWN0cygoKSA9PiBnZXRHcmFwaCgpLCAoZXJyb3I6IHVua25vd24pID0+IHtcclxuICAgIGFzc2VydC5vayhlcnJvciBpbnN0YW5jZW9mIEFwaUNsaWVudEVycm9yKTtcclxuICAgIGFzc2VydC5lcXVhbChlcnJvci5jb2RlLCAncmVxdWVzdF90aW1lb3V0Jyk7XHJcbiAgICBhc3NlcnQubWF0Y2goZXJyb3IubWVzc2FnZSwgL3RpbWVkIG91dC9pKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0pO1xyXG59KTtcclxuXHJcbnRlc3QoJ2dldEdyYXBoIG1hcHMgbmV0d29yayBmYWlsdXJlcyBpbnRvIHJldHJ5YWJsZSBBcGlDbGllbnRFcnJvcicsIGFzeW5jICgpID0+IHtcclxuICBnbG9iYWxUaGlzLmZldGNoID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQgaGFuZyB1cCcpO1xyXG4gIH07XHJcblxyXG4gIGF3YWl0IGFzc2VydC5yZWplY3RzKCgpID0+IGdldEdyYXBoKCksIChlcnJvcjogdW5rbm93bikgPT4ge1xyXG4gICAgYXNzZXJ0Lm9rKGVycm9yIGluc3RhbmNlb2YgQXBpQ2xpZW50RXJyb3IpO1xyXG4gICAgYXNzZXJ0LmVxdWFsKGVycm9yLmNvZGUsICduZXR3b3JrX2Vycm9yJyk7XHJcbiAgICBhc3NlcnQuZXF1YWwoZXJyb3IucmV0cnlhYmxlLCB0cnVlKTtcclxuICAgIGFzc2VydC5tYXRjaChlcnJvci5tZXNzYWdlLCAvTmV0d29yayBmYWlsdXJlLyk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9KTtcclxufSk7XHJcbiIsICJleHBvcnQgZnVuY3Rpb24gaW5zdGFsbFJ1bnRpbWVXaW5kb3dDb25maWcob3ZlcnJpZGVzOiBQYXJ0aWFsPFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlcj4+ID0ge30pIHtcclxuICBjb25zdCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSAoY2FsbGJhY2s6IEZyYW1lUmVxdWVzdENhbGxiYWNrKSA9PiBzZXRUaW1lb3V0KCgpID0+IGNhbGxiYWNrKERhdGUubm93KCkpLCAwKTtcclxuICBjb25zdCBjYW5jZWxBbmltYXRpb25GcmFtZSA9IChoYW5kbGU6IG51bWJlcikgPT4gY2xlYXJUaW1lb3V0KGhhbmRsZSk7XHJcblxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnd2luZG93Jywge1xyXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICB2YWx1ZToge1xyXG4gICAgICBfX1RXSU5fQ09ORklHX186IHtcclxuICAgICAgICBNQVhfVVBMT0FEX01COiAxMCxcclxuICAgICAgICBQUk9DRVNTSU5HX1RJTUVPVVRfTVM6IDkwMDAwLFxyXG4gICAgICAgIEFQUF9FTlY6ICd0ZXN0JyxcclxuICAgICAgICAuLi5vdmVycmlkZXMsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNldFRpbWVvdXQsXHJcbiAgICAgIGNsZWFyVGltZW91dCxcclxuICAgICAgc2V0SW50ZXJ2YWwsXHJcbiAgICAgIGNsZWFySW50ZXJ2YWwsXHJcbiAgICAgIGFkZEV2ZW50TGlzdGVuZXI6ICgpID0+IHt9LFxyXG4gICAgICByZW1vdmVFdmVudExpc3RlbmVyOiAoKSA9PiB7fSxcclxuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxyXG4gICAgICBjYW5jZWxBbmltYXRpb25GcmFtZSxcclxuICAgICAgZGV2aWNlUGl4ZWxSYXRpbzogMSxcclxuICAgIH0sXHJcbiAgfSk7XHJcblxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnZG9jdW1lbnQnLCB7XHJcbiAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICB3cml0YWJsZTogdHJ1ZSxcclxuICAgIHZhbHVlOiB7XHJcbiAgICAgIGNyZWF0ZUVsZW1lbnQ6ICgpID0+ICh7XHJcbiAgICAgICAgZ2V0Q29udGV4dDogKCkgPT4gKHt9KSxcclxuICAgICAgICBzdHlsZToge30sXHJcbiAgICAgICAgc2V0QXR0cmlidXRlOiAoKSA9PiB7fSxcclxuICAgICAgICBhcHBlbmRDaGlsZDogKCkgPT4ge30sXHJcbiAgICAgIH0pLFxyXG4gICAgICBib2R5OiB7XHJcbiAgICAgICAgYXBwZW5kQ2hpbGQ6ICgpID0+IHt9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9KTtcclxuXHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICduYXZpZ2F0b3InLCB7XHJcbiAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICB3cml0YWJsZTogdHJ1ZSxcclxuICAgIHZhbHVlOiB7XHJcbiAgICAgIHVzZXJBZ2VudDogJ25vZGUuanMnLFxyXG4gICAgfSxcclxuICB9KTtcclxuXHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICdyZXF1ZXN0QW5pbWF0aW9uRnJhbWUnLCB7XHJcbiAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICB3cml0YWJsZTogdHJ1ZSxcclxuICAgIHZhbHVlOiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXHJcbiAgfSk7XHJcblxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCAnY2FuY2VsQW5pbWF0aW9uRnJhbWUnLCB7XHJcbiAgICBjb25maWd1cmFibGU6IHRydWUsXHJcbiAgICB3cml0YWJsZTogdHJ1ZSxcclxuICAgIHZhbHVlOiBjYW5jZWxBbmltYXRpb25GcmFtZSxcclxuICB9KTtcclxuXHJcbiAgaWYgKCEoJ1Jlc2l6ZU9ic2VydmVyJyBpbiBnbG9iYWxUaGlzKSkge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICdSZXNpemVPYnNlcnZlcicsIHtcclxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcclxuICAgICAgdmFsdWU6IGNsYXNzIFJlc2l6ZU9ic2VydmVyIHtcclxuICAgICAgICBvYnNlcnZlKCkge31cclxuICAgICAgICB1bm9ic2VydmUoKSB7fVxyXG4gICAgICAgIGRpc2Nvbm5lY3QoKSB7fVxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2FtcGxlR3JhcGhEYXRhKCkge1xyXG4gIGNvbnN0IG5vZGVzID0gW1xyXG4gICAge1xyXG4gICAgICBpZDogJ2FwaScsXHJcbiAgICAgIG5hbWU6ICdBUEkgU2VydmljZScsXHJcbiAgICAgIHR5cGU6ICdzb2Z0d2FyZScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29yZSBBUEknLFxyXG4gICAgICByaXNrU2NvcmU6IDgyLFxyXG4gICAgICByaXNrTGV2ZWw6ICdoaWdoJyxcclxuICAgICAgZGVncmVlOiAyLFxyXG4gICAgICBiZXR3ZWVubmVzczogMC41NSxcclxuICAgICAgY2xvc2VuZXNzOiAwLjY3LFxyXG4gICAgICBibGFzdFJhZGl1czogMyxcclxuICAgICAgZGVwZW5kZW5jeVNwYW46IDIsXHJcbiAgICAgIHJpc2tFeHBsYW5hdGlvbjogJ0hhbmRsZXMgY29yZSByZXF1ZXN0cy4nLFxyXG4gICAgICBzb3VyY2U6ICdzYW1wbGUnLFxyXG4gICAgICBkZXBlbmRlbmNpZXM6IFsnZGInXSxcclxuICAgICAgZGVwZW5kZW50czogWydmcm9udGVuZCddLFxyXG4gICAgICB2YWw6IDM2LFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgaWQ6ICdkYicsXHJcbiAgICAgIG5hbWU6ICdEYXRhYmFzZScsXHJcbiAgICAgIHR5cGU6ICdkYXRhJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdQZXJzaXN0ZW5jZSBsYXllcicsXHJcbiAgICAgIHJpc2tTY29yZTogNDQsXHJcbiAgICAgIHJpc2tMZXZlbDogJ21lZGl1bScsXHJcbiAgICAgIGRlZ3JlZTogMSxcclxuICAgICAgYmV0d2Vlbm5lc3M6IDAuMjIsXHJcbiAgICAgIGNsb3NlbmVzczogMC40NCxcclxuICAgICAgYmxhc3RSYWRpdXM6IDEsXHJcbiAgICAgIGRlcGVuZGVuY3lTcGFuOiAxLFxyXG4gICAgICByaXNrRXhwbGFuYXRpb246ICdTdG9yZXMgcmVjb3Jkcy4nLFxyXG4gICAgICBzb3VyY2U6ICdzYW1wbGUnLFxyXG4gICAgICBkZXBlbmRlbmNpZXM6IFtdLFxyXG4gICAgICBkZXBlbmRlbnRzOiBbJ2FwaSddLFxyXG4gICAgICB2YWw6IDI4LFxyXG4gICAgfSxcclxuICBdO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgc291cmNlOiAnc2FtcGxlJyxcclxuICAgIG5vZGVzLFxyXG4gICAgbGlua3M6IFtcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAnYXBpLWRiLTAnLFxyXG4gICAgICAgIHNvdXJjZTogJ2FwaScsXHJcbiAgICAgICAgdGFyZ2V0OiAnZGInLFxyXG4gICAgICAgIHJlbGF0aW9uOiAnZGVwZW5kc19vbicsXHJcbiAgICAgICAgcmF0aW9uYWxlOiAnUmVhZHMgYW5kIHdyaXRlcyByZWNvcmRzLicsXHJcbiAgICAgIH0sXHJcbiAgICBdLFxyXG4gICAgbm9kZUluZGV4OiBPYmplY3QuZnJvbUVudHJpZXMobm9kZXMubWFwKChub2RlKSA9PiBbbm9kZS5pZCwgbm9kZV0pKSxcclxuICAgIHJlbGF0aW9uVHlwZXM6IFsnZGVwZW5kc19vbiddLFxyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNb2NrQ29udGV4dChvdmVycmlkZXMgPSB7fSkge1xyXG4gIHJldHVybiB7XHJcbiAgICB1cGxvYWQ6IHtcbiAgICAgIHBoYXNlOiAnaWRsZScsXG4gICAgICBzZWxlY3RlZEZpbGU6IG51bGwsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIHN0YXR1c01lc3NhZ2U6ICdVcGxvYWQgYSAubWQgb3IgLnR4dCBmaWxlIHRvIGJ1aWxkIHRoZSBncmFwaC4nLFxuICAgICAgaW5nZXN0aW9uSWQ6IG51bGwsXG4gICAgICBpbmdlc3Rpb246IG51bGwsXG4gICAgICBwcm9jZXNzaW5nU3RhdHVzOiBudWxsLFxuICAgICAgc3RhcnRlZEF0OiBudWxsLFxuICAgICAgY29tcGxldGVkQXQ6IG51bGwsXG4gICAgICByZXRyeUNvdW50OiAwLFxuICAgIH0sXG4gICAgZ3JhcGg6IHtcclxuICAgICAgc3RhdHVzOiAnaWRsZScsXHJcbiAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgIGVycm9yOiBudWxsLFxyXG4gICAgICBsYXN0TG9hZGVkQXQ6IG51bGwsXHJcbiAgICB9LFxyXG4gICAgc2V0RHJhZ0FjdGl2ZTogKCkgPT4ge30sXHJcbiAgICBzZWxlY3RGaWxlOiAoKSA9PiB0cnVlLFxyXG4gICAgY2xlYXJTZWxlY3RlZEZpbGU6ICgpID0+IHt9LFxyXG4gICAgYmVnaW5Qcm9jZXNzaW5nOiBhc3luYyAoKSA9PiB7fSxcclxuICAgIGxvYWRHcmFwaDogYXN5bmMgKCkgPT4ge30sXHJcbiAgICByZXNldFVwbG9hZFN0YXRlOiAoKSA9PiB7fSxcclxuICAgIC4uLm92ZXJyaWRlcyxcclxuICB9O1xyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7O0FBRUEsU0FBUyxXQUFXLE9BQW9DLFVBQWtCO0FBQ3hFLFFBQU0sU0FBUyxPQUFPLEtBQUs7QUFDM0IsU0FBTyxPQUFPLFNBQVMsTUFBTSxLQUFLLFNBQVMsSUFBSSxTQUFTO0FB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QUFhLGFBQWEsWUFBWTtBQUFBLEVBQ2xEO0FBRUEsUUFBTSxPQUFPLFFBQVEsTUFBTUMsVUFBUyxHQUFHLENBQUMsVUFBbUI7QUFDekQsV0FBTyxHQUFHLGlCQUFpQkQsZUFBYztBQUN6QyxXQUFPLE1BQU0sTUFBTSxNQUFNLGlCQUFpQjtBQUMxQyxXQUFPLE1BQU0sTUFBTSxTQUFTLFlBQVk7QUFDeEMsV0FBTztBQUFBLEVBQ1QsQ0FBQztBQUNILENBQUM7QUFFRCxLQUFLLGdFQUFnRSxZQUFZO0FBQy9FLGFBQVcsUUFBUSxZQUFZO0FBQzdCLFVBQU0sSUFBSSxNQUFNLGdCQUFnQjtBQUFBLEVBQ2xDO0FBRUEsUUFBTSxPQUFPLFFBQVEsTUFBTUMsVUFBUyxHQUFHLENBQUMsVUFBbUI7QUFDekQsV0FBTyxHQUFHLGlCQUFpQkQsZUFBYztBQUN6QyxXQUFPLE1BQU0sTUFBTSxNQUFNLGVBQWU7QUFDeEMsV0FBTyxNQUFNLE1BQU0sV0FBVyxJQUFJO0FBQ2xDLFdBQU8sTUFBTSxNQUFNLFNBQVMsaUJBQWlCO0FBQzdDLFdBQU87QUFBQSxFQUNULENBQUM7QUFDSCxDQUFDOyIsCiAgIm5hbWVzIjogWyJBcGlDbGllbnRFcnJvciIsICJnZXRHcmFwaCJdCn0K
