import assert from 'node:assert/strict';
import test from 'node:test';
import { installRuntimeWindowConfig } from './test-utils';

installRuntimeWindowConfig({
  MAX_UPLOAD_MB: 50,
  PROCESSING_TIMEOUT_MS: 5000,
  APP_ENV: 'test',
});

const apiModule = await import('../src/lib/api');
const { ApiClientError, getGraph } = apiModule;

test('getGraph returns parsed API data on success', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: 'ok',
        data: {
          source: 'demo',
          nodes: [],
          edges: [],
        },
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );

  const graph = await getGraph();
  assert.equal(graph.source, 'demo');
  assert.deepEqual(graph.nodes, []);
  assert.deepEqual(graph.edges, []);
});

test('getGraph throws ApiClientError on malformed JSON', async () => {
  globalThis.fetch = async () =>
    new Response('{not-json', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  await assert.rejects(() => getGraph(), (error: unknown) => {
    assert.ok(error instanceof ApiClientError);
    assert.equal(error.message, 'The API returned malformed JSON.');
    return true;
  });
});

test('getGraph maps backend error payloads into ApiClientError', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: 'error',
        error: {
          code: 'graph_failed',
          message: 'The graph could not be loaded.',
        },
      }),
      {
        status: 502,
        headers: { 'content-type': 'application/json' },
      }
    );

  await assert.rejects(() => getGraph(), (error: unknown) => {
    assert.ok(error instanceof ApiClientError);
    assert.equal(error.code, 'graph_failed');
    assert.equal(error.status, 502);
    assert.equal(error.message, 'The graph could not be loaded.');
    return true;
  });
});

test('getGraph maps AbortError into a timeout ApiClientError', async () => {
  globalThis.fetch = async () => {
    throw new DOMException('Timed out', 'AbortError');
  };

  await assert.rejects(() => getGraph(), (error: unknown) => {
    assert.ok(error instanceof ApiClientError);
    assert.equal(error.code, 'request_timeout');
    assert.match(error.message, /timed out/i);
    return true;
  });
});

test('getGraph maps network failures into retryable ApiClientError', async () => {
  globalThis.fetch = async () => {
    throw new Error('socket hang up');
  };

  await assert.rejects(() => getGraph(), (error: unknown) => {
    assert.ok(error instanceof ApiClientError);
    assert.equal(error.code, 'network_error');
    assert.equal(error.retryable, true);
    assert.match(error.message, /Network failure/);
    return true;
  });
});
