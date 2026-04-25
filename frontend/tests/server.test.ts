import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const serverModule = await import('../server.js');
const { createApp } = serverModule.default ?? serverModule;

async function withServer(app: ReturnType<typeof createApp>, callback: (baseUrl: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => (error ? reject(error) : resolve()));
    });
  }
}

test('healthz returns expected service metadata', async () => {
  const app = createApp({
    environment: 'ci',
    apiBaseUrl: 'http://api:8000',
    maxUploadMb: 12,
    processingTimeoutMs: 45000,
    distDir: path.join(tmpdir(), 'twingraphops-does-not-exist'),
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.service, 'twin_frontend');
    assert.equal(payload.status, 'ok');
    assert.equal(payload.environment, 'ci');
    assert.equal(payload.api_base_url, 'http://api:8000');
    assert.equal(payload.max_upload_mb, 12);
    assert.equal(payload.processing_timeout_ms, 45000);
  });
});

test('config.js exposes the runtime config payload', async () => {
  const app = createApp({
    environment: 'test',
    maxUploadMb: 7,
    processingTimeoutMs: 12345,
    distDir: path.join(tmpdir(), 'twingraphops-does-not-exist'),
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

test('missing dist directory returns the fallback 503 response', async () => {
  const app = createApp({
    distDir: path.join(tmpdir(), 'twingraphops-no-dist'),
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app`);
    const body = await response.text();

    assert.equal(response.status, 503);
    assert.match(body, /Frontend build is missing/);
  });
});

test('serves the built index.html when dist exists', async () => {
  const distDir = mkdtempSync(path.join(tmpdir(), 'twingraphops-dist-'));
  mkdirSync(distDir, { recursive: true });
  writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><html><body>frontend-ok</body></html>', 'utf8');

  const app = createApp({ distDir });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /frontend-ok/);
  });
});

test('proxy failures return the expected 502 payload', async () => {
  const app = createApp({
    distDir: path.join(tmpdir(), 'twingraphops-does-not-exist'),
    fetchImpl: async () => {
      throw new Error('backend unavailable');
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/graph`);
    const payload = await response.json();

    assert.equal(response.status, 502);
    assert.equal(payload.status, 'error');
    assert.equal(payload.error.code, 'frontend_proxy_failed');
    assert.equal(payload.error.message, 'The frontend could not reach the API.');
  });
});

test('metrics returns Prometheus-style frontend counters', async () => {
  const app = createApp({
    distDir: path.join(tmpdir(), 'twingraphops-does-not-exist'),
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

test('processing status route proxies the backend event stream endpoint', async () => {
  let requestedUrl = '';

  const app = createApp({
    distDir: path.join(tmpdir(), 'twingraphops-does-not-exist'),
    fetchImpl: async (url: string | URL | Request) => {
      requestedUrl = String(url);
      return new Response(
        JSON.stringify({
          status: 'ok',
          data: {
            ingestion_id: 'demo-ingest',
            state: 'running',
            filename: 'system.md',
            chunks_total: 4,
            current_chunk: 2,
            started_at: null,
            completed_at: null,
            latest_event: 'Processing chunk 2 of 4',
            events: [],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ingest/demo-ingest/events?limit=5`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(
      requestedUrl,
      'http://api:8000/ingest/demo-ingest/events?limit=5'
    );
    assert.equal(payload.status, 'ok');
    assert.equal(payload.data.ingestion_id, 'demo-ingest');
    assert.equal(payload.data.latest_event, 'Processing chunk 2 of 4');
  });
});

test('document routes proxy graph events and uploads to the backend', async () => {
  const requestedUrls: string[] = [];
  const requestedMethods: string[] = [];

  const app = createApp({
    distDir: path.join(tmpdir(), 'twingraphops-does-not-exist'),
    fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
      requestedUrls.push(String(url));
      requestedMethods.push(init?.method ?? 'GET');
      return new Response(JSON.stringify({ status: 'ok', data: { source: 'document', nodes: [], edges: [] } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  await withServer(app, async (baseUrl) => {
    await fetch(`${baseUrl}/api/document/graph`);
    await fetch(`${baseUrl}/api/document/ingest/doc-1/events`);
    await fetch(`${baseUrl}/api/document/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=test' },
      body: '--test\r\n\r\n--test--\r\n',
    });

    assert.deepEqual(requestedUrls, [
      'http://api:8000/document/graph',
      'http://api:8000/document/ingest/doc-1/events',
      'http://api:8000/document/ingest',
    ]);
    assert.deepEqual(requestedMethods, ['GET', 'GET', 'POST']);
  });
});
