import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
const serverModule = await import("../server.js");
const { createApp } = serverModule.default ?? serverModule;
async function withServer(app, callback) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}
test("healthz returns expected service metadata", async () => {
  const app = createApp({
    environment: "ci",
    apiBaseUrl: "http://api:8000",
    maxUploadMb: 12,
    processingTimeoutMs: 45e3,
    distDir: path.join(tmpdir(), "twingraphops-does-not-exist")
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.service, "twin_frontend");
    assert.equal(payload.status, "ok");
    assert.equal(payload.environment, "ci");
    assert.equal(payload.api_base_url, "http://api:8000");
    assert.equal(payload.max_upload_mb, 12);
    assert.equal(payload.processing_timeout_ms, 45e3);
  });
});
test("config.js exposes the runtime config payload", async () => {
  const app = createApp({
    environment: "test",
    maxUploadMb: 7,
    processingTimeoutMs: 12345,
    distDir: path.join(tmpdir(), "twingraphops-does-not-exist")
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/config.js`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(body, /window\.__TWIN_CONFIG__/);
    assert.match(body, /"MAX_UPLOAD_MB":7/);
    assert.match(body, /"PROCESSING_TIMEOUT_MS":12345/);
    assert.match(body, /"APP_ENV":"test"/);
  });
});
test("missing dist directory returns the fallback 503 response", async () => {
  const app = createApp({
    distDir: path.join(tmpdir(), "twingraphops-no-dist")
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app`);
    const body = await response.text();
    assert.equal(response.status, 503);
    assert.match(body, /Frontend build is missing/);
  });
});
test("serves the built index.html when dist exists", async () => {
  const distDir = mkdtempSync(path.join(tmpdir(), "twingraphops-dist-"));
  mkdirSync(distDir, { recursive: true });
  writeFileSync(path.join(distDir, "index.html"), "<!doctype html><html><body>frontend-ok</body></html>", "utf8");
  const app = createApp({ distDir });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(body, /frontend-ok/);
  });
});
test("proxy failures return the expected 502 payload", async () => {
  const app = createApp({
    distDir: path.join(tmpdir(), "twingraphops-does-not-exist"),
    fetchImpl: async () => {
      throw new Error("backend unavailable");
    }
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/graph`);
    const payload = await response.json();
    assert.equal(response.status, 502);
    assert.equal(payload.status, "error");
    assert.equal(payload.error.code, "frontend_proxy_failed");
    assert.equal(payload.error.message, "The frontend could not reach the API.");
  });
});
test("metrics returns Prometheus-style frontend counters", async () => {
  const app = createApp({
    distDir: path.join(tmpdir(), "twingraphops-does-not-exist")
  });
  await withServer(app, async (baseUrl) => {
    await fetch(`${baseUrl}/healthz`);
    await fetch(`${baseUrl}/config.js`);
    const response = await fetch(`${baseUrl}/metrics`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(
      body,
      /twingraphops_frontend_requests_total\{method="GET",path="\/healthz",status="200"\} 1/
    );
    assert.match(
      body,
      /twingraphops_frontend_requests_total\{method="GET",path="\/config\.js",status="200"\} 1/
    );
    assert.match(body, /twingraphops_frontend_environment_info\{environment="local"\} 1/);
    assert.match(body, /twingraphops_frontend_uptime_seconds \d+/);
  });
});
test("processing status route proxies the backend event stream endpoint", async () => {
  let requestedUrl = "";
  const app = createApp({
    distDir: path.join(tmpdir(), "twingraphops-does-not-exist"),
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return new Response(
        JSON.stringify({
          status: "ok",
          data: {
            ingestion_id: "demo-ingest",
            state: "running",
            filename: "system.md",
            chunks_total: 4,
            current_chunk: 2,
            started_at: null,
            completed_at: null,
            latest_event: "Processing chunk 2 of 4",
            events: []
          }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
    }
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ingest/demo-ingest/events?limit=5`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(
      requestedUrl,
      "http://api:8000/ingest/demo-ingest/events?limit=5"
    );
    assert.equal(payload.status, "ok");
    assert.equal(payload.data.ingestion_id, "demo-ingest");
    assert.equal(payload.data.latest_event, "Processing chunk 2 of 4");
  });
});
test("document routes proxy graph events and uploads to the backend", async () => {
  const requestedUrls = [];
  const requestedMethods = [];
  const app = createApp({
    distDir: path.join(tmpdir(), "twingraphops-does-not-exist"),
    fetchImpl: async (url, init) => {
      requestedUrls.push(String(url));
      requestedMethods.push(init?.method ?? "GET");
      return new Response(JSON.stringify({ status: "ok", data: { source: "document", nodes: [], edges: [] } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });
  await withServer(app, async (baseUrl) => {
    await fetch(`${baseUrl}/api/document/graph`);
    await fetch(`${baseUrl}/api/document/ingest/doc-1/events`);
    await fetch(`${baseUrl}/api/document/ingest`, {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=test" },
      body: "--test\r\n\r\n--test--\r\n"
    });
    assert.deepEqual(requestedUrls, [
      "http://api:8000/document/graph",
      "http://api:8000/document/ingest/doc-1/events",
      "http://api:8000/document/ingest"
    ]);
    assert.deepEqual(requestedMethods, ["GET", "GET", "POST"]);
  });
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vdGVzdHMvc2VydmVyLnRlc3QudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCBhc3NlcnQgZnJvbSAnbm9kZTphc3NlcnQvc3RyaWN0JztcclxuaW1wb3J0IHsgbWtkdGVtcFN5bmMsIG1rZGlyU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xyXG5pbXBvcnQgeyB0bXBkaXIgfSBmcm9tICdub2RlOm9zJztcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcclxuaW1wb3J0IHRlc3QgZnJvbSAnbm9kZTp0ZXN0JztcclxuXHJcbmNvbnN0IHNlcnZlck1vZHVsZSA9IGF3YWl0IGltcG9ydCgnLi4vc2VydmVyLmpzJyk7XHJcbmNvbnN0IHsgY3JlYXRlQXBwIH0gPSBzZXJ2ZXJNb2R1bGUuZGVmYXVsdCA/PyBzZXJ2ZXJNb2R1bGU7XHJcblxyXG5hc3luYyBmdW5jdGlvbiB3aXRoU2VydmVyKGFwcDogUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlQXBwPiwgY2FsbGJhY2s6IChiYXNlVXJsOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD4pIHtcclxuICBjb25zdCBzZXJ2ZXIgPSBhcHAubGlzdGVuKDAsICcxMjcuMC4wLjEnKTtcclxuICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4gc2VydmVyLm9uY2UoJ2xpc3RlbmluZycsIHJlc29sdmUpKTtcclxuICBjb25zdCBhZGRyZXNzID0gc2VydmVyLmFkZHJlc3MoKTtcclxuICBjb25zdCBwb3J0ID0gdHlwZW9mIGFkZHJlc3MgPT09ICdvYmplY3QnICYmIGFkZHJlc3MgPyBhZGRyZXNzLnBvcnQgOiAwO1xyXG5cclxuICB0cnkge1xyXG4gICAgYXdhaXQgY2FsbGJhY2soYGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fWApO1xyXG4gIH0gZmluYWxseSB7XHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIHNlcnZlci5jbG9zZSgoZXJyb3I/OiBFcnJvcikgPT4gKGVycm9yID8gcmVqZWN0KGVycm9yKSA6IHJlc29sdmUoKSkpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG50ZXN0KCdoZWFsdGh6IHJldHVybnMgZXhwZWN0ZWQgc2VydmljZSBtZXRhZGF0YScsIGFzeW5jICgpID0+IHtcclxuICBjb25zdCBhcHAgPSBjcmVhdGVBcHAoe1xyXG4gICAgZW52aXJvbm1lbnQ6ICdjaScsXHJcbiAgICBhcGlCYXNlVXJsOiAnaHR0cDovL2FwaTo4MDAwJyxcclxuICAgIG1heFVwbG9hZE1iOiAxMixcclxuICAgIHByb2Nlc3NpbmdUaW1lb3V0TXM6IDQ1MDAwLFxyXG4gICAgZGlzdERpcjogcGF0aC5qb2luKHRtcGRpcigpLCAndHdpbmdyYXBob3BzLWRvZXMtbm90LWV4aXN0JyksXHJcbiAgfSk7XHJcblxyXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9oZWFsdGh6YCk7XHJcbiAgICBhc3NlcnQuZXF1YWwocmVzcG9uc2Uuc3RhdHVzLCAyMDApO1xyXG5cclxuICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICBhc3NlcnQuZXF1YWwocGF5bG9hZC5zZXJ2aWNlLCAndHdpbl9mcm9udGVuZCcpO1xyXG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQuc3RhdHVzLCAnb2snKTtcclxuICAgIGFzc2VydC5lcXVhbChwYXlsb2FkLmVudmlyb25tZW50LCAnY2knKTtcclxuICAgIGFzc2VydC5lcXVhbChwYXlsb2FkLmFwaV9iYXNlX3VybCwgJ2h0dHA6Ly9hcGk6ODAwMCcpO1xyXG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQubWF4X3VwbG9hZF9tYiwgMTIpO1xyXG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQucHJvY2Vzc2luZ190aW1lb3V0X21zLCA0NTAwMCk7XHJcbiAgfSk7XHJcbn0pO1xyXG5cclxudGVzdCgnY29uZmlnLmpzIGV4cG9zZXMgdGhlIHJ1bnRpbWUgY29uZmlnIHBheWxvYWQnLCBhc3luYyAoKSA9PiB7XHJcbiAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHtcclxuICAgIGVudmlyb25tZW50OiAndGVzdCcsXHJcbiAgICBtYXhVcGxvYWRNYjogNyxcclxuICAgIHByb2Nlc3NpbmdUaW1lb3V0TXM6IDEyMzQ1LFxyXG4gICAgZGlzdERpcjogcGF0aC5qb2luKHRtcGRpcigpLCAndHdpbmdyYXBob3BzLWRvZXMtbm90LWV4aXN0JyksXHJcbiAgfSk7XHJcblxyXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9jb25maWcuanNgKTtcclxuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcblxyXG4gICAgYXNzZXJ0LmVxdWFsKHJlc3BvbnNlLnN0YXR1cywgMjAwKTtcclxuICAgIGFzc2VydC5tYXRjaChib2R5LCAvd2luZG93XFwuX19UV0lOX0NPTkZJR19fLyk7XHJcbiAgICBhc3NlcnQubWF0Y2goYm9keSwgL1wiTUFYX1VQTE9BRF9NQlwiOjcvKTtcclxuICAgIGFzc2VydC5tYXRjaChib2R5LCAvXCJQUk9DRVNTSU5HX1RJTUVPVVRfTVNcIjoxMjM0NS8pO1xyXG4gICAgYXNzZXJ0Lm1hdGNoKGJvZHksIC9cIkFQUF9FTlZcIjpcInRlc3RcIi8pO1xyXG4gIH0pO1xyXG59KTtcclxuXHJcbnRlc3QoJ21pc3NpbmcgZGlzdCBkaXJlY3RvcnkgcmV0dXJucyB0aGUgZmFsbGJhY2sgNTAzIHJlc3BvbnNlJywgYXN5bmMgKCkgPT4ge1xyXG4gIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7XHJcbiAgICBkaXN0RGlyOiBwYXRoLmpvaW4odG1wZGlyKCksICd0d2luZ3JhcGhvcHMtbm8tZGlzdCcpLFxyXG4gIH0pO1xyXG5cclxuICBhd2FpdCB3aXRoU2VydmVyKGFwcCwgYXN5bmMgKGJhc2VVcmwpID0+IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vYXBwYCk7XHJcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG5cclxuICAgIGFzc2VydC5lcXVhbChyZXNwb25zZS5zdGF0dXMsIDUwMyk7XHJcbiAgICBhc3NlcnQubWF0Y2goYm9keSwgL0Zyb250ZW5kIGJ1aWxkIGlzIG1pc3NpbmcvKTtcclxuICB9KTtcclxufSk7XHJcblxyXG50ZXN0KCdzZXJ2ZXMgdGhlIGJ1aWx0IGluZGV4Lmh0bWwgd2hlbiBkaXN0IGV4aXN0cycsIGFzeW5jICgpID0+IHtcclxuICBjb25zdCBkaXN0RGlyID0gbWtkdGVtcFN5bmMocGF0aC5qb2luKHRtcGRpcigpLCAndHdpbmdyYXBob3BzLWRpc3QtJykpO1xyXG4gIG1rZGlyU3luYyhkaXN0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICB3cml0ZUZpbGVTeW5jKHBhdGguam9pbihkaXN0RGlyLCAnaW5kZXguaHRtbCcpLCAnPCFkb2N0eXBlIGh0bWw+PGh0bWw+PGJvZHk+ZnJvbnRlbmQtb2s8L2JvZHk+PC9odG1sPicsICd1dGY4Jyk7XHJcblxyXG4gIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7IGRpc3REaXIgfSk7XHJcblxyXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9hcHBgKTtcclxuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcblxyXG4gICAgYXNzZXJ0LmVxdWFsKHJlc3BvbnNlLnN0YXR1cywgMjAwKTtcclxuICAgIGFzc2VydC5tYXRjaChib2R5LCAvZnJvbnRlbmQtb2svKTtcclxuICB9KTtcclxufSk7XHJcblxyXG50ZXN0KCdwcm94eSBmYWlsdXJlcyByZXR1cm4gdGhlIGV4cGVjdGVkIDUwMiBwYXlsb2FkJywgYXN5bmMgKCkgPT4ge1xyXG4gIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7XHJcbiAgICBkaXN0RGlyOiBwYXRoLmpvaW4odG1wZGlyKCksICd0d2luZ3JhcGhvcHMtZG9lcy1ub3QtZXhpc3QnKSxcclxuICAgIGZldGNoSW1wbDogYXN5bmMgKCkgPT4ge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhY2tlbmQgdW5hdmFpbGFibGUnKTtcclxuICAgIH0sXHJcbiAgfSk7XHJcblxyXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9hcGkvZ3JhcGhgKTtcclxuICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcblxyXG4gICAgYXNzZXJ0LmVxdWFsKHJlc3BvbnNlLnN0YXR1cywgNTAyKTtcclxuICAgIGFzc2VydC5lcXVhbChwYXlsb2FkLnN0YXR1cywgJ2Vycm9yJyk7XHJcbiAgICBhc3NlcnQuZXF1YWwocGF5bG9hZC5lcnJvci5jb2RlLCAnZnJvbnRlbmRfcHJveHlfZmFpbGVkJyk7XHJcbiAgICBhc3NlcnQuZXF1YWwocGF5bG9hZC5lcnJvci5tZXNzYWdlLCAnVGhlIGZyb250ZW5kIGNvdWxkIG5vdCByZWFjaCB0aGUgQVBJLicpO1xyXG4gIH0pO1xyXG59KTtcclxuXHJcbnRlc3QoJ21ldHJpY3MgcmV0dXJucyBQcm9tZXRoZXVzLXN0eWxlIGZyb250ZW5kIGNvdW50ZXJzJywgYXN5bmMgKCkgPT4ge1xyXG4gIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7XHJcbiAgICBkaXN0RGlyOiBwYXRoLmpvaW4odG1wZGlyKCksICd0d2luZ3JhcGhvcHMtZG9lcy1ub3QtZXhpc3QnKSxcclxuICB9KTtcclxuXHJcbiAgYXdhaXQgd2l0aFNlcnZlcihhcHAsIGFzeW5jIChiYXNlVXJsKSA9PiB7XHJcbiAgICBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9oZWFsdGh6YCk7XHJcbiAgICBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9jb25maWcuanNgKTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L21ldHJpY3NgKTtcclxuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcblxyXG4gICAgYXNzZXJ0LmVxdWFsKHJlc3BvbnNlLnN0YXR1cywgMjAwKTtcclxuICAgIGFzc2VydC5tYXRjaChcclxuICAgICAgYm9keSxcclxuICAgICAgL3R3aW5ncmFwaG9wc19mcm9udGVuZF9yZXF1ZXN0c190b3RhbFxce21ldGhvZD1cIkdFVFwiLHBhdGg9XCJcXC9oZWFsdGh6XCIsc3RhdHVzPVwiMjAwXCJcXH0gMS9cclxuICAgICk7XHJcbiAgICBhc3NlcnQubWF0Y2goXHJcbiAgICAgIGJvZHksXHJcbiAgICAgIC90d2luZ3JhcGhvcHNfZnJvbnRlbmRfcmVxdWVzdHNfdG90YWxcXHttZXRob2Q9XCJHRVRcIixwYXRoPVwiXFwvY29uZmlnXFwuanNcIixzdGF0dXM9XCIyMDBcIlxcfSAxL1xyXG4gICAgKTtcclxuICAgIGFzc2VydC5tYXRjaChib2R5LCAvdHdpbmdyYXBob3BzX2Zyb250ZW5kX2Vudmlyb25tZW50X2luZm9cXHtlbnZpcm9ubWVudD1cImxvY2FsXCJcXH0gMS8pO1xyXG4gICAgYXNzZXJ0Lm1hdGNoKGJvZHksIC90d2luZ3JhcGhvcHNfZnJvbnRlbmRfdXB0aW1lX3NlY29uZHMgXFxkKy8pO1xyXG4gIH0pO1xyXG59KTtcclxuXHJcbnRlc3QoJ3Byb2Nlc3Npbmcgc3RhdHVzIHJvdXRlIHByb3hpZXMgdGhlIGJhY2tlbmQgZXZlbnQgc3RyZWFtIGVuZHBvaW50JywgYXN5bmMgKCkgPT4ge1xuICBsZXQgcmVxdWVzdGVkVXJsID0gJyc7XHJcblxyXG4gIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7XHJcbiAgICBkaXN0RGlyOiBwYXRoLmpvaW4odG1wZGlyKCksICd0d2luZ3JhcGhvcHMtZG9lcy1ub3QtZXhpc3QnKSxcclxuICAgIGZldGNoSW1wbDogYXN5bmMgKHVybDogc3RyaW5nIHwgVVJMIHwgUmVxdWVzdCkgPT4ge1xyXG4gICAgICByZXF1ZXN0ZWRVcmwgPSBTdHJpbmcodXJsKTtcclxuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShcclxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBzdGF0dXM6ICdvaycsXHJcbiAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIGluZ2VzdGlvbl9pZDogJ2RlbW8taW5nZXN0JyxcclxuICAgICAgICAgICAgc3RhdGU6ICdydW5uaW5nJyxcclxuICAgICAgICAgICAgZmlsZW5hbWU6ICdzeXN0ZW0ubWQnLFxyXG4gICAgICAgICAgICBjaHVua3NfdG90YWw6IDQsXHJcbiAgICAgICAgICAgIGN1cnJlbnRfY2h1bms6IDIsXHJcbiAgICAgICAgICAgIHN0YXJ0ZWRfYXQ6IG51bGwsXHJcbiAgICAgICAgICAgIGNvbXBsZXRlZF9hdDogbnVsbCxcclxuICAgICAgICAgICAgbGF0ZXN0X2V2ZW50OiAnUHJvY2Vzc2luZyBjaHVuayAyIG9mIDQnLFxyXG4gICAgICAgICAgICBldmVudHM6IFtdLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdGF0dXM6IDIwMCxcclxuICAgICAgICAgIGhlYWRlcnM6IHsgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH0sXHJcbiAgfSk7XHJcblxyXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9hcGkvaW5nZXN0L2RlbW8taW5nZXN0L2V2ZW50cz9saW1pdD01YCk7XHJcbiAgICBjb25zdCBwYXlsb2FkID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG5cclxuICAgIGFzc2VydC5lcXVhbChyZXNwb25zZS5zdGF0dXMsIDIwMCk7XHJcbiAgICBhc3NlcnQuZXF1YWwoXHJcbiAgICAgIHJlcXVlc3RlZFVybCxcclxuICAgICAgJ2h0dHA6Ly9hcGk6ODAwMC9pbmdlc3QvZGVtby1pbmdlc3QvZXZlbnRzP2xpbWl0PTUnXHJcbiAgICApO1xyXG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQuc3RhdHVzLCAnb2snKTtcclxuICAgIGFzc2VydC5lcXVhbChwYXlsb2FkLmRhdGEuaW5nZXN0aW9uX2lkLCAnZGVtby1pbmdlc3QnKTtcclxuICAgIGFzc2VydC5lcXVhbChwYXlsb2FkLmRhdGEubGF0ZXN0X2V2ZW50LCAnUHJvY2Vzc2luZyBjaHVuayAyIG9mIDQnKTtcclxuICB9KTtcbn0pO1xuXG50ZXN0KCdkb2N1bWVudCByb3V0ZXMgcHJveHkgZ3JhcGggZXZlbnRzIGFuZCB1cGxvYWRzIHRvIHRoZSBiYWNrZW5kJywgYXN5bmMgKCkgPT4ge1xuICBjb25zdCByZXF1ZXN0ZWRVcmxzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCByZXF1ZXN0ZWRNZXRob2RzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7XG4gICAgZGlzdERpcjogcGF0aC5qb2luKHRtcGRpcigpLCAndHdpbmdyYXBob3BzLWRvZXMtbm90LWV4aXN0JyksXG4gICAgZmV0Y2hJbXBsOiBhc3luYyAodXJsOiBzdHJpbmcgfCBVUkwgfCBSZXF1ZXN0LCBpbml0PzogUmVxdWVzdEluaXQpID0+IHtcbiAgICAgIHJlcXVlc3RlZFVybHMucHVzaChTdHJpbmcodXJsKSk7XG4gICAgICByZXF1ZXN0ZWRNZXRob2RzLnB1c2goaW5pdD8ubWV0aG9kID8/ICdHRVQnKTtcbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBzdGF0dXM6ICdvaycsIGRhdGE6IHsgc291cmNlOiAnZG9jdW1lbnQnLCBub2RlczogW10sIGVkZ2VzOiBbXSB9IH0pLCB7XG4gICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICBoZWFkZXJzOiB7ICdjb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgIH0pO1xuICAgIH0sXG4gIH0pO1xuXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xuICAgIGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2FwaS9kb2N1bWVudC9ncmFwaGApO1xuICAgIGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2FwaS9kb2N1bWVudC9pbmdlc3QvZG9jLTEvZXZlbnRzYCk7XG4gICAgYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vYXBpL2RvY3VtZW50L2luZ2VzdGAsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVyczogeyAnY29udGVudC10eXBlJzogJ211bHRpcGFydC9mb3JtLWRhdGE7IGJvdW5kYXJ5PXRlc3QnIH0sXG4gICAgICBib2R5OiAnLS10ZXN0XFxyXFxuXFxyXFxuLS10ZXN0LS1cXHJcXG4nLFxuICAgIH0pO1xuXG4gICAgYXNzZXJ0LmRlZXBFcXVhbChyZXF1ZXN0ZWRVcmxzLCBbXG4gICAgICAnaHR0cDovL2FwaTo4MDAwL2RvY3VtZW50L2dyYXBoJyxcbiAgICAgICdodHRwOi8vYXBpOjgwMDAvZG9jdW1lbnQvaW5nZXN0L2RvYy0xL2V2ZW50cycsXG4gICAgICAnaHR0cDovL2FwaTo4MDAwL2RvY3VtZW50L2luZ2VzdCcsXG4gICAgXSk7XG4gICAgYXNzZXJ0LmRlZXBFcXVhbChyZXF1ZXN0ZWRNZXRob2RzLCBbJ0dFVCcsICdHRVQnLCAnUE9TVCddKTtcbiAgfSk7XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICJBQUFBLE9BQU8sWUFBWTtBQUNuQixTQUFTLGFBQWEsV0FB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
