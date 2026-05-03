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
    await fetch(`${baseUrl}/api/document/artifacts`);
    await fetch(`${baseUrl}/api/document/artifacts/doc-1`);
    await fetch(`${baseUrl}/api/document/artifacts/doc-1/files/final-markdown`);
    await fetch(`${baseUrl}/api/document/artifacts/doc-1/bundle`);
    await fetch(`${baseUrl}/api/document/ingest`, {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=test" },
      body: "--test\r\n\r\n--test--\r\n"
    });
    assert.deepEqual(requestedUrls, [
      "http://api:8000/document/graph",
      "http://api:8000/document/ingest/doc-1/events",
      "http://api:8000/document/artifacts",
      "http://api:8000/document/artifacts/doc-1",
      "http://api:8000/document/artifacts/doc-1/files/final-markdown",
      "http://api:8000/document/artifacts/doc-1/bundle",
      "http://api:8000/document/ingest"
    ]);
    assert.deepEqual(requestedMethods, ["GET", "GET", "GET", "GET", "GET", "GET", "POST"]);
  });
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vdGVzdHMvc2VydmVyLnRlc3QudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCBhc3NlcnQgZnJvbSAnbm9kZTphc3NlcnQvc3RyaWN0JztcbmltcG9ydCB7IG1rZHRlbXBTeW5jLCBta2RpclN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IHRtcGRpciB9IGZyb20gJ25vZGU6b3MnO1xuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB0ZXN0IGZyb20gJ25vZGU6dGVzdCc7XG5cbmNvbnN0IHNlcnZlck1vZHVsZSA9IGF3YWl0IGltcG9ydCgnLi4vc2VydmVyLmpzJyk7XG5jb25zdCB7IGNyZWF0ZUFwcCB9ID0gc2VydmVyTW9kdWxlLmRlZmF1bHQgPz8gc2VydmVyTW9kdWxlO1xuXG5hc3luYyBmdW5jdGlvbiB3aXRoU2VydmVyKGFwcDogUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlQXBwPiwgY2FsbGJhY2s6IChiYXNlVXJsOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD4pIHtcbiAgY29uc3Qgc2VydmVyID0gYXBwLmxpc3RlbigwLCAnMTI3LjAuMC4xJyk7XG4gIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiBzZXJ2ZXIub25jZSgnbGlzdGVuaW5nJywgcmVzb2x2ZSkpO1xuICBjb25zdCBhZGRyZXNzID0gc2VydmVyLmFkZHJlc3MoKTtcbiAgY29uc3QgcG9ydCA9IHR5cGVvZiBhZGRyZXNzID09PSAnb2JqZWN0JyAmJiBhZGRyZXNzID8gYWRkcmVzcy5wb3J0IDogMDtcblxuICB0cnkge1xuICAgIGF3YWl0IGNhbGxiYWNrKGBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH1gKTtcbiAgfSBmaW5hbGx5IHtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBzZXJ2ZXIuY2xvc2UoKGVycm9yPzogRXJyb3IpID0+IChlcnJvciA/IHJlamVjdChlcnJvcikgOiByZXNvbHZlKCkpKTtcbiAgICB9KTtcbiAgfVxufVxuXG50ZXN0KCdoZWFsdGh6IHJldHVybnMgZXhwZWN0ZWQgc2VydmljZSBtZXRhZGF0YScsIGFzeW5jICgpID0+IHtcbiAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHtcbiAgICBlbnZpcm9ubWVudDogJ2NpJyxcbiAgICBhcGlCYXNlVXJsOiAnaHR0cDovL2FwaTo4MDAwJyxcbiAgICBtYXhVcGxvYWRNYjogMTIsXG4gICAgcHJvY2Vzc2luZ1RpbWVvdXRNczogNDUwMDAsXG4gICAgZGlzdERpcjogcGF0aC5qb2luKHRtcGRpcigpLCAndHdpbmdyYXBob3BzLWRvZXMtbm90LWV4aXN0JyksXG4gIH0pO1xuXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vaGVhbHRoemApO1xuICAgIGFzc2VydC5lcXVhbChyZXNwb25zZS5zdGF0dXMsIDIwMCk7XG5cbiAgICBjb25zdCBwYXlsb2FkID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIGFzc2VydC5lcXVhbChwYXlsb2FkLnNlcnZpY2UsICd0d2luX2Zyb250ZW5kJyk7XG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQuc3RhdHVzLCAnb2snKTtcbiAgICBhc3NlcnQuZXF1YWwocGF5bG9hZC5lbnZpcm9ubWVudCwgJ2NpJyk7XG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQuYXBpX2Jhc2VfdXJsLCAnaHR0cDovL2FwaTo4MDAwJyk7XG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQubWF4X3VwbG9hZF9tYiwgMTIpO1xuICAgIGFzc2VydC5lcXVhbChwYXlsb2FkLnByb2Nlc3NpbmdfdGltZW91dF9tcywgNDUwMDApO1xuICB9KTtcbn0pO1xuXG50ZXN0KCdjb25maWcuanMgZXhwb3NlcyB0aGUgcnVudGltZSBjb25maWcgcGF5bG9hZCcsIGFzeW5jICgpID0+IHtcbiAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHtcbiAgICBlbnZpcm9ubWVudDogJ3Rlc3QnLFxuICAgIG1heFVwbG9hZE1iOiA3LFxuICAgIHByb2Nlc3NpbmdUaW1lb3V0TXM6IDEyMzQ1LFxuICAgIGRpc3REaXI6IHBhdGguam9pbih0bXBkaXIoKSwgJ3R3aW5ncmFwaG9wcy1kb2VzLW5vdC1leGlzdCcpLFxuICB9KTtcblxuICBhd2FpdCB3aXRoU2VydmVyKGFwcCwgYXN5bmMgKGJhc2VVcmwpID0+IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2NvbmZpZy5qc2ApO1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG5cbiAgICBhc3NlcnQuZXF1YWwocmVzcG9uc2Uuc3RhdHVzLCAyMDApO1xuICAgIGFzc2VydC5tYXRjaChib2R5LCAvd2luZG93XFwuX19UV0lOX0NPTkZJR19fLyk7XG4gICAgYXNzZXJ0Lm1hdGNoKGJvZHksIC9cIk1BWF9VUExPQURfTUJcIjo3Lyk7XG4gICAgYXNzZXJ0Lm1hdGNoKGJvZHksIC9cIlBST0NFU1NJTkdfVElNRU9VVF9NU1wiOjEyMzQ1Lyk7XG4gICAgYXNzZXJ0Lm1hdGNoKGJvZHksIC9cIkFQUF9FTlZcIjpcInRlc3RcIi8pO1xuICB9KTtcbn0pO1xuXG50ZXN0KCdtaXNzaW5nIGRpc3QgZGlyZWN0b3J5IHJldHVybnMgdGhlIGZhbGxiYWNrIDUwMyByZXNwb25zZScsIGFzeW5jICgpID0+IHtcbiAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHtcbiAgICBkaXN0RGlyOiBwYXRoLmpvaW4odG1wZGlyKCksICd0d2luZ3JhcGhvcHMtbm8tZGlzdCcpLFxuICB9KTtcblxuICBhd2FpdCB3aXRoU2VydmVyKGFwcCwgYXN5bmMgKGJhc2VVcmwpID0+IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2FwcGApO1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG5cbiAgICBhc3NlcnQuZXF1YWwocmVzcG9uc2Uuc3RhdHVzLCA1MDMpO1xuICAgIGFzc2VydC5tYXRjaChib2R5LCAvRnJvbnRlbmQgYnVpbGQgaXMgbWlzc2luZy8pO1xuICB9KTtcbn0pO1xuXG50ZXN0KCdzZXJ2ZXMgdGhlIGJ1aWx0IGluZGV4Lmh0bWwgd2hlbiBkaXN0IGV4aXN0cycsIGFzeW5jICgpID0+IHtcbiAgY29uc3QgZGlzdERpciA9IG1rZHRlbXBTeW5jKHBhdGguam9pbih0bXBkaXIoKSwgJ3R3aW5ncmFwaG9wcy1kaXN0LScpKTtcbiAgbWtkaXJTeW5jKGRpc3REaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICB3cml0ZUZpbGVTeW5jKHBhdGguam9pbihkaXN0RGlyLCAnaW5kZXguaHRtbCcpLCAnPCFkb2N0eXBlIGh0bWw+PGh0bWw+PGJvZHk+ZnJvbnRlbmQtb2s8L2JvZHk+PC9odG1sPicsICd1dGY4Jyk7XG5cbiAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHsgZGlzdERpciB9KTtcblxuICBhd2FpdCB3aXRoU2VydmVyKGFwcCwgYXN5bmMgKGJhc2VVcmwpID0+IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2FwcGApO1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG5cbiAgICBhc3NlcnQuZXF1YWwocmVzcG9uc2Uuc3RhdHVzLCAyMDApO1xuICAgIGFzc2VydC5tYXRjaChib2R5LCAvZnJvbnRlbmQtb2svKTtcbiAgfSk7XG59KTtcblxudGVzdCgncHJveHkgZmFpbHVyZXMgcmV0dXJuIHRoZSBleHBlY3RlZCA1MDIgcGF5bG9hZCcsIGFzeW5jICgpID0+IHtcbiAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHtcbiAgICBkaXN0RGlyOiBwYXRoLmpvaW4odG1wZGlyKCksICd0d2luZ3JhcGhvcHMtZG9lcy1ub3QtZXhpc3QnKSxcbiAgICBmZXRjaEltcGw6IGFzeW5jICgpID0+IHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYmFja2VuZCB1bmF2YWlsYWJsZScpO1xuICAgIH0sXG4gIH0pO1xuXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vYXBpL2dyYXBoYCk7XG4gICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcblxuICAgIGFzc2VydC5lcXVhbChyZXNwb25zZS5zdGF0dXMsIDUwMik7XG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQuc3RhdHVzLCAnZXJyb3InKTtcbiAgICBhc3NlcnQuZXF1YWwocGF5bG9hZC5lcnJvci5jb2RlLCAnZnJvbnRlbmRfcHJveHlfZmFpbGVkJyk7XG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQuZXJyb3IubWVzc2FnZSwgJ1RoZSBmcm9udGVuZCBjb3VsZCBub3QgcmVhY2ggdGhlIEFQSS4nKTtcbiAgfSk7XG59KTtcblxudGVzdCgnbWV0cmljcyByZXR1cm5zIFByb21ldGhldXMtc3R5bGUgZnJvbnRlbmQgY291bnRlcnMnLCBhc3luYyAoKSA9PiB7XG4gIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7XG4gICAgZGlzdERpcjogcGF0aC5qb2luKHRtcGRpcigpLCAndHdpbmdyYXBob3BzLWRvZXMtbm90LWV4aXN0JyksXG4gIH0pO1xuXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xuICAgIGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2hlYWx0aHpgKTtcbiAgICBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9jb25maWcuanNgKTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vbWV0cmljc2ApO1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG5cbiAgICBhc3NlcnQuZXF1YWwocmVzcG9uc2Uuc3RhdHVzLCAyMDApO1xuICAgIGFzc2VydC5tYXRjaChcbiAgICAgIGJvZHksXG4gICAgICAvdHdpbmdyYXBob3BzX2Zyb250ZW5kX3JlcXVlc3RzX3RvdGFsXFx7bWV0aG9kPVwiR0VUXCIscGF0aD1cIlxcL2hlYWx0aHpcIixzdGF0dXM9XCIyMDBcIlxcfSAxL1xuICAgICk7XG4gICAgYXNzZXJ0Lm1hdGNoKFxuICAgICAgYm9keSxcbiAgICAgIC90d2luZ3JhcGhvcHNfZnJvbnRlbmRfcmVxdWVzdHNfdG90YWxcXHttZXRob2Q9XCJHRVRcIixwYXRoPVwiXFwvY29uZmlnXFwuanNcIixzdGF0dXM9XCIyMDBcIlxcfSAxL1xuICAgICk7XG4gICAgYXNzZXJ0Lm1hdGNoKGJvZHksIC90d2luZ3JhcGhvcHNfZnJvbnRlbmRfZW52aXJvbm1lbnRfaW5mb1xce2Vudmlyb25tZW50PVwibG9jYWxcIlxcfSAxLyk7XG4gICAgYXNzZXJ0Lm1hdGNoKGJvZHksIC90d2luZ3JhcGhvcHNfZnJvbnRlbmRfdXB0aW1lX3NlY29uZHMgXFxkKy8pO1xuICB9KTtcbn0pO1xuXG50ZXN0KCdwcm9jZXNzaW5nIHN0YXR1cyByb3V0ZSBwcm94aWVzIHRoZSBiYWNrZW5kIGV2ZW50IHN0cmVhbSBlbmRwb2ludCcsIGFzeW5jICgpID0+IHtcbiAgbGV0IHJlcXVlc3RlZFVybCA9ICcnO1xuXG4gIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7XG4gICAgZGlzdERpcjogcGF0aC5qb2luKHRtcGRpcigpLCAndHdpbmdyYXBob3BzLWRvZXMtbm90LWV4aXN0JyksXG4gICAgZmV0Y2hJbXBsOiBhc3luYyAodXJsOiBzdHJpbmcgfCBVUkwgfCBSZXF1ZXN0KSA9PiB7XG4gICAgICByZXF1ZXN0ZWRVcmwgPSBTdHJpbmcodXJsKTtcbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzdGF0dXM6ICdvaycsXG4gICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgaW5nZXN0aW9uX2lkOiAnZGVtby1pbmdlc3QnLFxuICAgICAgICAgICAgc3RhdGU6ICdydW5uaW5nJyxcbiAgICAgICAgICAgIGZpbGVuYW1lOiAnc3lzdGVtLm1kJyxcbiAgICAgICAgICAgIGNodW5rc190b3RhbDogNCxcbiAgICAgICAgICAgIGN1cnJlbnRfY2h1bms6IDIsXG4gICAgICAgICAgICBzdGFydGVkX2F0OiBudWxsLFxuICAgICAgICAgICAgY29tcGxldGVkX2F0OiBudWxsLFxuICAgICAgICAgICAgbGF0ZXN0X2V2ZW50OiAnUHJvY2Vzc2luZyBjaHVuayAyIG9mIDQnLFxuICAgICAgICAgICAgZXZlbnRzOiBbXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICAgIGhlYWRlcnM6IHsgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgICB9XG4gICAgICApO1xuICAgIH0sXG4gIH0pO1xuXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vYXBpL2luZ2VzdC9kZW1vLWluZ2VzdC9ldmVudHM/bGltaXQ9NWApO1xuICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG5cbiAgICBhc3NlcnQuZXF1YWwocmVzcG9uc2Uuc3RhdHVzLCAyMDApO1xuICAgIGFzc2VydC5lcXVhbChcbiAgICAgIHJlcXVlc3RlZFVybCxcbiAgICAgICdodHRwOi8vYXBpOjgwMDAvaW5nZXN0L2RlbW8taW5nZXN0L2V2ZW50cz9saW1pdD01J1xuICAgICk7XG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQuc3RhdHVzLCAnb2snKTtcbiAgICBhc3NlcnQuZXF1YWwocGF5bG9hZC5kYXRhLmluZ2VzdGlvbl9pZCwgJ2RlbW8taW5nZXN0Jyk7XG4gICAgYXNzZXJ0LmVxdWFsKHBheWxvYWQuZGF0YS5sYXRlc3RfZXZlbnQsICdQcm9jZXNzaW5nIGNodW5rIDIgb2YgNCcpO1xuICB9KTtcbn0pO1xuXG50ZXN0KCdkb2N1bWVudCByb3V0ZXMgcHJveHkgZ3JhcGggZXZlbnRzIGFuZCB1cGxvYWRzIHRvIHRoZSBiYWNrZW5kJywgYXN5bmMgKCkgPT4ge1xuICBjb25zdCByZXF1ZXN0ZWRVcmxzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCByZXF1ZXN0ZWRNZXRob2RzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7XG4gICAgZGlzdERpcjogcGF0aC5qb2luKHRtcGRpcigpLCAndHdpbmdyYXBob3BzLWRvZXMtbm90LWV4aXN0JyksXG4gICAgZmV0Y2hJbXBsOiBhc3luYyAodXJsOiBzdHJpbmcgfCBVUkwgfCBSZXF1ZXN0LCBpbml0PzogUmVxdWVzdEluaXQpID0+IHtcbiAgICAgIHJlcXVlc3RlZFVybHMucHVzaChTdHJpbmcodXJsKSk7XG4gICAgICByZXF1ZXN0ZWRNZXRob2RzLnB1c2goaW5pdD8ubWV0aG9kID8/ICdHRVQnKTtcbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBzdGF0dXM6ICdvaycsIGRhdGE6IHsgc291cmNlOiAnZG9jdW1lbnQnLCBub2RlczogW10sIGVkZ2VzOiBbXSB9IH0pLCB7XG4gICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICBoZWFkZXJzOiB7ICdjb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgIH0pO1xuICAgIH0sXG4gIH0pO1xuXG4gIGF3YWl0IHdpdGhTZXJ2ZXIoYXBwLCBhc3luYyAoYmFzZVVybCkgPT4ge1xuICAgIGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2FwaS9kb2N1bWVudC9ncmFwaGApO1xuICAgIGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2FwaS9kb2N1bWVudC9pbmdlc3QvZG9jLTEvZXZlbnRzYCk7XG4gICAgYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vYXBpL2RvY3VtZW50L2FydGlmYWN0c2ApO1xuICAgIGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2FwaS9kb2N1bWVudC9hcnRpZmFjdHMvZG9jLTFgKTtcbiAgICBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9hcGkvZG9jdW1lbnQvYXJ0aWZhY3RzL2RvYy0xL2ZpbGVzL2ZpbmFsLW1hcmtkb3duYCk7XG4gICAgYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vYXBpL2RvY3VtZW50L2FydGlmYWN0cy9kb2MtMS9idW5kbGVgKTtcbiAgICBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9hcGkvZG9jdW1lbnQvaW5nZXN0YCwge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzOiB7ICdjb250ZW50LXR5cGUnOiAnbXVsdGlwYXJ0L2Zvcm0tZGF0YTsgYm91bmRhcnk9dGVzdCcgfSxcbiAgICAgIGJvZHk6ICctLXRlc3RcXHJcXG5cXHJcXG4tLXRlc3QtLVxcclxcbicsXG4gICAgfSk7XG5cbiAgICBhc3NlcnQuZGVlcEVxdWFsKHJlcXVlc3RlZFVybHMsIFtcbiAgICAgICdodHRwOi8vYXBpOjgwMDAvZG9jdW1lbnQvZ3JhcGgnLFxuICAgICAgJ2h0dHA6Ly9hcGk6ODAwMC9kb2N1bWVudC9pbmdlc3QvZG9jLTEvZXZlbnRzJyxcbiAgICAgICdodHRwOi8vYXBpOjgwMDAvZG9jdW1lbnQvYXJ0aWZhY3RzJyxcbiAgICAgICdodHRwOi8vYXBpOjgwMDAvZG9jdW1lbnQvYXJ0aWZhY3RzL2RvYy0xJyxcbiAgICAgICdodHRwOi8vYXBpOjgwMDAvZG9jdW1lbnQvYXJ0aWZhY3RzL2RvYy0xL2ZpbGVzL2ZpbmFsLW1hcmtkb3duJyxcbiAgICAgICdodHRwOi8vYXBpOjgwMDAvZG9jdW1lbnQvYXJ0aWZhY3RzL2RvYy0xL2J1bmRsZScsXG4gICAgICAnaHR0cDovL2FwaTo4MDAwL2RvY3VtZW50L2luZ2VzdCcsXG4gICAgXSk7XG4gICAgYXNzZXJ0LmRlZXBFcXVhbChyZXF1ZXN0ZWRNZXRob2RzLCBbJ0dFVCcsICdHRVQnLCAnR0VUJywgJ0dFVCcsICdHRVQnLCAnR0VUJywgJ1BPU1QnXSk7XG4gIH0pO1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiQUFBQSxPQUFPLFlBQVk7QUFDbkIsU0FBUyxhQUFhLFdBQVcscUJBQXFCO0FBQ3RELFNBQVMsY0FBYztBQUN2QixPQUFPLFVBQVU7QUFDakIsT0FBTyxVQUFVO0FBRWpCLE1BQU0sZUFBZSxNQUFNLE9BQU8sY0FBYztBQUNoRCxNQUFNLEVBQUUsVUFBVSxJQUFJLGFBQWEsV0FBVztBQUU5QyxlQUFlLFdBQVcsS0FBbUMsVUFBOEM7QUFDekcsUUFBTSxTQUFTLElBQUksT0FBTyxHQUFHLFdBQVc7QUFDeEMsUUFBTSxJQUFJLFFBQWMsQ0FBQyxZQUFZLE9BQU8sS0FBSyxhQUFhLE9BQU8sQ0FBQztBQUN0RSxRQUFNLFVBQVUsT0FBTyxRQUFRO0FBQy9CLFFBQU0sT0FBTyxPQUFPLFlBQVksWUFBWSxVQUFVLFFBQVEsT0FBTztBQUVyRSxNQUFJO0FBQ0YsVUFBTSxTQUFTLG9CQUFvQixJQUFJLEVBQUU7QUFBQSxFQUMzQyxVQUFFO0FBQ0EsVUFBTSxJQUFJLFFBQWMsQ0FBQyxTQUFTLFdBQVc7QUFDM0MsYUFBTyxNQUFNLENBQUMsVUFBbUIsUUFBUSxPQUFPLEtBQUssSUFBSSxRQUFRLENBQUU7QUFBQSxJQUNyRSxDQUFDO0FBQUEsRUFDSDtBQUNGO0FBRUEsS0FBSyw2Q0FBNkMsWUFBWTtBQUM1RCxRQUFNLE1BQU0sVUFBVTtBQUFBLElBQ3BCLGFBQWE7QUFBQSxJQUNiLFlBQVk7QUFBQSxJQUNaLGFBQWE7QUFBQSxJQUNiLHFCQUFxQjtBQUFBLElBQ3JCLFNBQVMsS0FBSyxLQUFLLE9BQU8sR0FBRyw2QkFBNkI7QUFBQSxFQUM1RCxDQUFDO0FBRUQsUUFBTSxXQUFXLEtBQUssT0FBTyxZQUFZO0FBQ3ZDLFVBQU0sV0FBVyxNQUFNLE1BQU0sR0FBRyxPQUFPLFVBQVU7QUFDakQsV0FBTyxN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
