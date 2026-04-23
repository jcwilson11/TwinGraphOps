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
    assert.match(payload.error.message, /backend unavailable/);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vdGVzdHMvc2VydmVyLnRlc3QudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCBhc3NlcnQgZnJvbSAnbm9kZTphc3NlcnQvc3RyaWN0JztcclxuaW1wb3J0IHsgbWtkdGVtcFN5bmMsIG1rZGlyU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xyXG5pbXBvcnQgeyB0bXBkaXIgfSBmcm9tICdub2RlOm9zJztcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcclxuaW1wb3J0IHRlc3QgZnJvbSAnbm9kZTp0ZXN0JztcclxuXHJcbmNvbnN0IHNlcnZlck1vZHVsZSA9IGF3YWl0IGltcG9ydCgnLi4vc2VydmVyLmpzJyk7XHJcbmNvbnN0IHsgY3JlYXRlQXBwIH0gPSBzZXJ2ZXJNb2R1bGUuZGVmYXVsdCA/PyBzZXJ2ZXJNb2R1bGU7XHJcblxyXG5hc3luYyBmdW5jdGlvbiB3aXRoU2VydmVyKGFwcDogUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlQXBwPiwgY2FsbGJhY2s6IChiYXNlVXJsOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD4pIHtcclxuICBjb25zdCBzZXJ2ZXIgPSBhcHAubGlzdGVuKDAsICcxMjcuMC4wLjEnKTtcclxuICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4gc2VydmVyLm9uY2UoJ2xpc3RlbmluZycsIHJlc29sdmUpKTtcclxuICBjb25zdCBhZGRyZXNzID0gc2VydmVyLmFkZHJlc3MoKTtcclxuICBjb25zdCBwb3J0ID0gdHlwZW9mIGFkZHJlc3MgPT09ICdvYmplY3QnICYmIGFkZHJlc3MgPyBhZGRyZXNzLnBvcnQgOiAwO1xyXG5cclxuICB0cnkge1xyXG4gICAgYXdhaXQgY2FsbGJhY2soYGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fWApO1xyXG4gIH0gZmluYWxseSB7XHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIHNlcnZlci5jbG9zZSgoZXJyb3I/OiBFcnJvcikgPT4gKGVycm9yID8gcmVqZWN0KGVycm9yKSA6IHJlc29sdmUoKSkpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG50ZXN0KCdoZWFsdGh6IHJldHVybnMgZXhwZWN0ZWQgc2VydmljZSBtZXRhZGF0YScsIGFzeW5jICgpID0+IHtcclxuICBjb25zdCBhcHAgPSBjcmVhdGVBcHAoe1xyXG4gICAgZW52aXJvbm1lbnQ6ICdjaScsXHJcbiAgICBhcGlCYXNlVXJsOiAnaHR0cDovL2FwaTo4MDAwJyxcclxuICAgIG1heFVwbG9hZE1iOiAxMixcclxuICAgIHByb2Nlc3NpbmdUaW1lb3V0TXM6IDQ1MDAwLFxyXG4gICAgZGlzdERpcjogcGF0aC5qb2luKHRtcGRpcigpLCAndHdpbmdyYXBob3BzLWRvZXMtbm90LWV4aXN0JyksXHJcbiAgfSk7XHJcblxyXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9oZWFsdGh6YCk7XHJcbiAgICBhc3NlcnQuZXF1YWwocmVzcG9uc2Uuc3RhdHVzLCAyMDApO1xyXG5cclxuICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICBhc3NlcnQuZXF1YWwocGF5bG9hZC5zZXJ2aWNlLCAndHdpbl9mcm9udGVuZCcpO1xyXG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQuc3RhdHVzLCAnb2snKTtcclxuICAgIGFzc2VydC5lcXVhbChwYXlsb2FkLmVudmlyb25tZW50LCAnY2knKTtcclxuICAgIGFzc2VydC5lcXVhbChwYXlsb2FkLmFwaV9iYXNlX3VybCwgJ2h0dHA6Ly9hcGk6ODAwMCcpO1xyXG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQubWF4X3VwbG9hZF9tYiwgMTIpO1xyXG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQucHJvY2Vzc2luZ190aW1lb3V0X21zLCA0NTAwMCk7XHJcbiAgfSk7XHJcbn0pO1xyXG5cclxudGVzdCgnY29uZmlnLmpzIGV4cG9zZXMgdGhlIHJ1bnRpbWUgY29uZmlnIHBheWxvYWQnLCBhc3luYyAoKSA9PiB7XHJcbiAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHtcclxuICAgIGVudmlyb25tZW50OiAndGVzdCcsXHJcbiAgICBtYXhVcGxvYWRNYjogNyxcclxuICAgIHByb2Nlc3NpbmdUaW1lb3V0TXM6IDEyMzQ1LFxyXG4gICAgZGlzdERpcjogcGF0aC5qb2luKHRtcGRpcigpLCAndHdpbmdyYXBob3BzLWRvZXMtbm90LWV4aXN0JyksXHJcbiAgfSk7XHJcblxyXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9jb25maWcuanNgKTtcclxuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcblxyXG4gICAgYXNzZXJ0LmVxdWFsKHJlc3BvbnNlLnN0YXR1cywgMjAwKTtcclxuICAgIGFzc2VydC5tYXRjaChib2R5LCAvd2luZG93XFwuX19UV0lOX0NPTkZJR19fLyk7XHJcbiAgICBhc3NlcnQubWF0Y2goYm9keSwgL1wiTUFYX1VQTE9BRF9NQlwiOjcvKTtcclxuICAgIGFzc2VydC5tYXRjaChib2R5LCAvXCJQUk9DRVNTSU5HX1RJTUVPVVRfTVNcIjoxMjM0NS8pO1xyXG4gICAgYXNzZXJ0Lm1hdGNoKGJvZHksIC9cIkFQUF9FTlZcIjpcInRlc3RcIi8pO1xyXG4gIH0pO1xyXG59KTtcclxuXHJcbnRlc3QoJ21pc3NpbmcgZGlzdCBkaXJlY3RvcnkgcmV0dXJucyB0aGUgZmFsbGJhY2sgNTAzIHJlc3BvbnNlJywgYXN5bmMgKCkgPT4ge1xyXG4gIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7XHJcbiAgICBkaXN0RGlyOiBwYXRoLmpvaW4odG1wZGlyKCksICd0d2luZ3JhcGhvcHMtbm8tZGlzdCcpLFxyXG4gIH0pO1xyXG5cclxuICBhd2FpdCB3aXRoU2VydmVyKGFwcCwgYXN5bmMgKGJhc2VVcmwpID0+IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vYXBwYCk7XHJcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG5cclxuICAgIGFzc2VydC5lcXVhbChyZXNwb25zZS5zdGF0dXMsIDUwMyk7XHJcbiAgICBhc3NlcnQubWF0Y2goYm9keSwgL0Zyb250ZW5kIGJ1aWxkIGlzIG1pc3NpbmcvKTtcclxuICB9KTtcclxufSk7XHJcblxyXG50ZXN0KCdzZXJ2ZXMgdGhlIGJ1aWx0IGluZGV4Lmh0bWwgd2hlbiBkaXN0IGV4aXN0cycsIGFzeW5jICgpID0+IHtcclxuICBjb25zdCBkaXN0RGlyID0gbWtkdGVtcFN5bmMocGF0aC5qb2luKHRtcGRpcigpLCAndHdpbmdyYXBob3BzLWRpc3QtJykpO1xyXG4gIG1rZGlyU3luYyhkaXN0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICB3cml0ZUZpbGVTeW5jKHBhdGguam9pbihkaXN0RGlyLCAnaW5kZXguaHRtbCcpLCAnPCFkb2N0eXBlIGh0bWw+PGh0bWw+PGJvZHk+ZnJvbnRlbmQtb2s8L2JvZHk+PC9odG1sPicsICd1dGY4Jyk7XHJcblxyXG4gIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7IGRpc3REaXIgfSk7XHJcblxyXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9hcHBgKTtcclxuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcblxyXG4gICAgYXNzZXJ0LmVxdWFsKHJlc3BvbnNlLnN0YXR1cywgMjAwKTtcclxuICAgIGFzc2VydC5tYXRjaChib2R5LCAvZnJvbnRlbmQtb2svKTtcclxuICB9KTtcclxufSk7XHJcblxyXG50ZXN0KCdwcm94eSBmYWlsdXJlcyByZXR1cm4gdGhlIGV4cGVjdGVkIDUwMiBwYXlsb2FkJywgYXN5bmMgKCkgPT4ge1xuICBjb25zdCBhcHAgPSBjcmVhdGVBcHAoe1xuICAgIGRpc3REaXI6IHBhdGguam9pbih0bXBkaXIoKSwgJ3R3aW5ncmFwaG9wcy1kb2VzLW5vdC1leGlzdCcpLFxuICAgIGZldGNoSW1wbDogYXN5bmMgKCkgPT4ge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdiYWNrZW5kIHVuYXZhaWxhYmxlJyk7XG4gICAgfSxcclxuICB9KTtcclxuXHJcbiAgYXdhaXQgd2l0aFNlcnZlcihhcHAsIGFzeW5jIChiYXNlVXJsKSA9PiB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2FwaS9ncmFwaGApO1xyXG4gICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuXHJcbiAgICBhc3NlcnQuZXF1YWwocmVzcG9uc2Uuc3RhdHVzLCA1MDIpO1xyXG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQuc3RhdHVzLCAnZXJyb3InKTtcclxuICAgIGFzc2VydC5lcXVhbChwYXlsb2FkLmVycm9yLmNvZGUsICdmcm9udGVuZF9wcm94eV9mYWlsZWQnKTtcbiAgICBhc3NlcnQubWF0Y2gocGF5bG9hZC5lcnJvci5tZXNzYWdlLCAvYmFja2VuZCB1bmF2YWlsYWJsZS8pO1xuICB9KTtcbn0pO1xuXG50ZXN0KCdtZXRyaWNzIHJldHVybnMgUHJvbWV0aGV1cy1zdHlsZSBmcm9udGVuZCBjb3VudGVycycsIGFzeW5jICgpID0+IHtcbiAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHtcbiAgICBkaXN0RGlyOiBwYXRoLmpvaW4odG1wZGlyKCksICd0d2luZ3JhcGhvcHMtZG9lcy1ub3QtZXhpc3QnKSxcbiAgfSk7XG5cbiAgYXdhaXQgd2l0aFNlcnZlcihhcHAsIGFzeW5jIChiYXNlVXJsKSA9PiB7XG4gICAgYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vaGVhbHRoemApO1xuICAgIGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2NvbmZpZy5qc2ApO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9tZXRyaWNzYCk7XG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcblxuICAgIGFzc2VydC5lcXVhbChyZXNwb25zZS5zdGF0dXMsIDIwMCk7XG4gICAgYXNzZXJ0Lm1hdGNoKFxuICAgICAgYm9keSxcbiAgICAgIC90d2luZ3JhcGhvcHNfZnJvbnRlbmRfcmVxdWVzdHNfdG90YWxcXHttZXRob2Q9XCJHRVRcIixwYXRoPVwiXFwvaGVhbHRoelwiLHN0YXR1cz1cIjIwMFwiXFx9IDEvXG4gICAgKTtcbiAgICBhc3NlcnQubWF0Y2goXG4gICAgICBib2R5LFxuICAgICAgL3R3aW5ncmFwaG9wc19mcm9udGVuZF9yZXF1ZXN0c190b3RhbFxce21ldGhvZD1cIkdFVFwiLHBhdGg9XCJcXC9jb25maWdcXC5qc1wiLHN0YXR1cz1cIjIwMFwiXFx9IDEvXG4gICAgKTtcbiAgICBhc3NlcnQubWF0Y2goYm9keSwgL3R3aW5ncmFwaG9wc19mcm9udGVuZF9lbnZpcm9ubWVudF9pbmZvXFx7ZW52aXJvbm1lbnQ9XCJsb2NhbFwiXFx9IDEvKTtcbiAgICBhc3NlcnQubWF0Y2goYm9keSwgL3R3aW5ncmFwaG9wc19mcm9udGVuZF91cHRpbWVfc2Vjb25kcyBcXGQrLyk7XG4gIH0pO1xufSk7XG5cbnRlc3QoJ3Byb2Nlc3Npbmcgc3RhdHVzIHJvdXRlIHByb3hpZXMgdGhlIGJhY2tlbmQgZXZlbnQgc3RyZWFtIGVuZHBvaW50JywgYXN5bmMgKCkgPT4ge1xuICBsZXQgcmVxdWVzdGVkVXJsID0gJyc7XG5cbiAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHtcbiAgICBkaXN0RGlyOiBwYXRoLmpvaW4odG1wZGlyKCksICd0d2luZ3JhcGhvcHMtZG9lcy1ub3QtZXhpc3QnKSxcbiAgICBmZXRjaEltcGw6IGFzeW5jICh1cmw6IHN0cmluZyB8IFVSTCB8IFJlcXVlc3QpID0+IHtcbiAgICAgIHJlcXVlc3RlZFVybCA9IFN0cmluZyh1cmwpO1xuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHN0YXR1czogJ29rJyxcbiAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBpbmdlc3Rpb25faWQ6ICdkZW1vLWluZ2VzdCcsXG4gICAgICAgICAgICBzdGF0ZTogJ3J1bm5pbmcnLFxuICAgICAgICAgICAgZmlsZW5hbWU6ICdzeXN0ZW0ubWQnLFxuICAgICAgICAgICAgY2h1bmtzX3RvdGFsOiA0LFxuICAgICAgICAgICAgY3VycmVudF9jaHVuazogMixcbiAgICAgICAgICAgIHN0YXJ0ZWRfYXQ6IG51bGwsXG4gICAgICAgICAgICBjb21wbGV0ZWRfYXQ6IG51bGwsXG4gICAgICAgICAgICBsYXRlc3RfZXZlbnQ6ICdQcm9jZXNzaW5nIGNodW5rIDIgb2YgNCcsXG4gICAgICAgICAgICBldmVudHM6IFtdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pLFxuICAgICAgICB7XG4gICAgICAgICAgc3RhdHVzOiAyMDAsXG4gICAgICAgICAgaGVhZGVyczogeyAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfSxcbiAgfSk7XG5cbiAgYXdhaXQgd2l0aFNlcnZlcihhcHAsIGFzeW5jIChiYXNlVXJsKSA9PiB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9hcGkvaW5nZXN0L2RlbW8taW5nZXN0L2V2ZW50cz9saW1pdD01YCk7XG4gICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcblxuICAgIGFzc2VydC5lcXVhbChyZXNwb25zZS5zdGF0dXMsIDIwMCk7XG4gICAgYXNzZXJ0LmVxdWFsKFxuICAgICAgcmVxdWVzdGVkVXJsLFxuICAgICAgJ2h0dHA6Ly9hcGk6ODAwMC9pbmdlc3QvZGVtby1pbmdlc3QvZXZlbnRzP2xpbWl0PTUnXG4gICAgKTtcbiAgICBhc3NlcnQuZXF1YWwocGF5bG9hZC5zdGF0dXMsICdvaycpO1xuICAgIGFzc2VydC5lcXVhbChwYXlsb2FkLmRhdGEuaW5nZXN0aW9uX2lkLCAnZGVtby1pbmdlc3QnKTtcbiAgICBhc3NlcnQuZXF1YWwocGF5bG9hZC5kYXRhLmxhdGVzdF9ldmVudCwgJ1Byb2Nlc3NpbmcgY2h1bmsgMiBvZiA0Jyk7XG4gIH0pO1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiQUFBQSxPQUFPLFlBQVk7QUFDbkIsU0FBUyxhQUFhLFdBQVcscUJBQXFCO0FBQ3RELFNBQVMsY0FBYztBQUN2QixPQUFPLFVBQVU7QUFDakIsT0FBTyxVQUFVO0FBRWpCLE1BQU0sZUFBZSxNQUFNLE9BQU8sY0FBYztBQUNoRCxNQUFNLEVBQUUsVUFBVSxJQUFJLGFBQWEsV0FBVztBQUU5QyxlQUFlLFdBQVcsS0FBbUMsVUFBOEM7QUFDekcsUUFBTSxTQUFTLElBQUksT0FBTyxHQUFHLFdBQVc7QUFDeEMsUUFBTSxJQUFJLFFBQWMsQ0FBQyxZQUFZLE9BQU8sS0FBSyxhQUFhLE9BQU8sQ0FBQztBQUN0RSxRQUFNLFVBQVUsT0FBTyxRQUFRO0FBQy9CLFFBQU0sT0FBTyxPQUFPLFlBQVksWUFBWSxVQUFVLFFBQVEsT0FBTztBQUVyRSxNQUFJO0FBQ0YsVUFBTSxTQUFTLG9CQUFvQixJQUFJLEVBQUU7QUFBQSxFQUMzQyxVQUFFO0FBQ0EsVUFBTSxJQUFJLFFBQWMsQ0FBQyxTQUFTLFdBQVc7QUFDM0MsYUFBTyxNQUFNLENBQUMsVUFBbUIsUUFBUSxPQUFPLEtBQUssSUFBSSxRQUFRLENBQUU7QUFBQSxJQUNyRSxDQUFDO0FBQUEsRUFDSDtBQUNGO0FBRUEsS0FBSyw2Q0FBNkMsWUFBWTtBQUM1RCxRQUFNLE1BQU0sVUFBVTtBQUFBLElBQ3BCLGFBQWE7QUFBQSxJ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
