const assert = require('node:assert/strict');

const { createApp } = require('../server');

async function withServer(run) {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');

  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function testHealthEndpoint() {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.status, 'ok');
    assert.equal(payload.service, 'twin_frontend');
    assert.equal(payload.environment, 'local');
  });
}

async function testMetricsEndpoint() {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/healthz`);
    await fetch(`${baseUrl}/config.js`);

    const response = await fetch(`${baseUrl}/metrics`);
    assert.equal(response.status, 200);
    const payload = await response.text();

    assert.match(payload, /twingraphops_frontend_requests_total\{method="GET",path="\/healthz",status="200"\} 1/);
    assert.match(payload, /twingraphops_frontend_requests_total\{method="GET",path="\/config\.js",status="200"\} 1/);
    assert.match(payload, /twingraphops_frontend_environment_info\{environment="local"\} 1/);
    assert.match(payload, /twingraphops_frontend_uptime_seconds \d+/);
  });
}

async function main() {
  await testHealthEndpoint();
  await testMetricsEndpoint();
  process.stdout.write('frontend server tests passed\n');
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exit(1);
});
