const http = require('http');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');

function readConfig(overrides = {}) {
  const port = Number(overrides.port || process.env.PORT || 3000);
  const startedAt = overrides.startedAt ?? Date.now();
  const environment = overrides.environment || process.env.TWIN_ENV || 'local';
  const apiBaseUrl =
    overrides.apiBaseUrl || process.env.PUBLIC_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://api:8000';
  const maxUploadMb = Number(
    overrides.maxUploadMb || process.env.PUBLIC_MAX_UPLOAD_MB || process.env.VITE_MAX_UPLOAD_MB || 50
  );
  const processingTimeoutMs = Number(
    overrides.processingTimeoutMs || process.env.PUBLIC_PROCESSING_TIMEOUT_MS || process.env.VITE_PROCESSING_TIMEOUT_MS || 300000
  );
  const staticRateLimitWindowMs = Number(
    overrides.staticRateLimitWindowMs || process.env.STATIC_RATE_LIMIT_WINDOW_MS || 60_000
  );
  const staticRateLimitMax = Number(overrides.staticRateLimitMax || process.env.STATIC_RATE_LIMIT_MAX || 120);
  const distDir = overrides.distDir || path.join(__dirname, 'dist');

  return {
    port,
    startedAt,
    environment,
    apiBaseUrl,
    maxUploadMb,
    processingTimeoutMs,
    staticRateLimitWindowMs,
    staticRateLimitMax,
    distDir,
  };
}

function createMetricsState(startedAt = Date.now()) {
  return {
    startedAt,
    requestCount: 0,
    inFlightRequests: 0,
    rateLimitHits: 0,
    requestsByRoute: new Map(),
    staticAssetByStatus: new Map(),
  };
}

function classifyPath(requestPath) {
  if (requestPath === '/healthz' || requestPath === '/metrics' || requestPath === '/config.js') {
    return requestPath;
  }
  if (/^\/api\/ingest\/[^/]+\/events$/.test(requestPath)) {
    return '/api/ingest/:ingestionId/events';
  }
  if (/^\/api\/document\/ingest\/[^/]+\/events$/.test(requestPath)) {
    return '/api/document/ingest/:ingestionId/events';
  }
  if (requestPath.startsWith('/assets/')) {
    return '/assets/*';
  }
  if (requestPath === '/' || requestPath.endsWith('.html')) {
    return '/';
  }
  return '/other';
}

function incrementCounter(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function renderMetrics(state, environment) {
  const lines = [
    '# HELP twingraphops_frontend_requests_total Frontend requests by method, path, and status.',
    '# TYPE twingraphops_frontend_requests_total counter',
  ];

  for (const [key, count] of [...state.requestsByRoute.entries()].sort()) {
    const [method, requestPath, status] = key.split('|');
    lines.push(
      `twingraphops_frontend_requests_total{method="${method}",path="${requestPath}",status="${status}"} ${count}`
    );
  }

  lines.push('# HELP twingraphops_frontend_static_asset_requests_total Static asset responses by status.');
  lines.push('# TYPE twingraphops_frontend_static_asset_requests_total counter');
  for (const [status, count] of [...state.staticAssetByStatus.entries()].sort()) {
    lines.push(`twingraphops_frontend_static_asset_requests_total{status="${status}"} ${count}`);
  }

  lines.push('# HELP twingraphops_frontend_rate_limit_hits_total Frontend rate limit blocks.');
  lines.push('# TYPE twingraphops_frontend_rate_limit_hits_total counter');
  lines.push(`twingraphops_frontend_rate_limit_hits_total ${state.rateLimitHits}`);

  lines.push('# HELP twingraphops_frontend_uptime_seconds Seconds since the frontend process started.');
  lines.push('# TYPE twingraphops_frontend_uptime_seconds gauge');
  lines.push(`twingraphops_frontend_uptime_seconds ${Math.floor((Date.now() - state.startedAt) / 1000)}`);

  lines.push('# HELP twingraphops_frontend_in_flight_requests Current in-flight frontend requests.');
  lines.push('# TYPE twingraphops_frontend_in_flight_requests gauge');
  lines.push(`twingraphops_frontend_in_flight_requests ${state.inFlightRequests}`);

  lines.push('# HELP twingraphops_frontend_environment_info Current frontend environment.');
  lines.push('# TYPE twingraphops_frontend_environment_info gauge');
  lines.push(`twingraphops_frontend_environment_info{environment="${environment}"} 1`);

  return `${lines.join('\n')}\n`;
}

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.ico':
      return 'image/x-icon';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.map':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.txt':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(body);
}

function sendProxyFailure(res, error) {
  console.error('Frontend proxy failed:', error);
  sendJson(res, 502, {
    status: 'error',
    error: {
      code: 'frontend_proxy_failed',
      message: 'The frontend could not reach the API.',
    },
  });
}

function sendText(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.statusCode = statusCode;
  res.setHeader('content-type', contentType);
  res.end(body);
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function isPathInside(parentDir, candidatePath) {
  const relative = path.relative(parentDir, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveDistPath(distDir, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolvedPath = path.resolve(distDir, relativePath);
  return isPathInside(distDir, resolvedPath) ? resolvedPath : null;
}

function createStaticRateLimiter(config) {
  const hitsByIp = new Map();

  return function allowRequest(remoteAddress) {
    const key = remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - config.staticRateLimitWindowMs;
    const recentHits = (hitsByIp.get(key) || []).filter((timestamp) => timestamp > windowStart);

    if (recentHits.length >= config.staticRateLimitMax) {
      return false;
    }

    recentHits.push(now);
    hitsByIp.set(key, recentHits);
    return true;
  };
}

function createApp(options = {}) {
  const config = readConfig(options);
  const fetchImpl = options.fetchImpl || global.fetch;
  const distExists = fs.existsSync(config.distDir);
  const allowStaticRequest = createStaticRateLimiter(config);
  const metrics = createMetricsState(config.startedAt);

  async function proxyJson(res, method, targetUrl) {
    try {
      const response = await fetchImpl(targetUrl, {
        method,
        headers: {
          Accept: 'application/json',
        },
      });

      const text = await response.text();
      sendText(
        res,
        response.status,
        text,
        response.headers.get('content-type') || 'application/json; charset=utf-8'
      );
    } catch (error) {
      sendProxyFailure(res, error);
    }
  }

  function sendMissingBuildResponse(res) {
    sendText(
      res,
      503,
      'Frontend build is missing. Run "npm run build" in the frontend directory or use "npm run dev".'
    );
  }

  function serveFile(res, filePath) {
    return new Promise((resolve) => {
      res.statusCode = 200;
      res.setHeader('content-type', getMimeType(filePath));

      const fileStream = fs.createReadStream(filePath);
      pipeline(fileStream, res, (error) => {
        if (error && !res.headersSent) {
          sendText(res, 500, 'Failed to serve frontend asset.');
        }
        resolve();
      });
    });
  }

  function createServer() {
    return http.createServer(async (req, res) => {
      metrics.requestCount += 1;
      metrics.inFlightRequests += 1;

      res.on('finish', () => {
        metrics.inFlightRequests = Math.max(metrics.inFlightRequests - 1, 0);
        const requestUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
        const pathLabel = classifyPath(requestUrl.pathname);
        incrementCounter(metrics.requestsByRoute, `${req.method}|${pathLabel}|${res.statusCode}`);
        if (pathLabel === '/assets/*') {
          incrementCounter(metrics.staticAssetByStatus, String(res.statusCode));
        }
      });

      const requestUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
      const { pathname, search } = requestUrl;

      if (req.method === 'GET' && pathname === '/healthz') {
        sendJson(res, 200, {
          service: 'twin_frontend',
          status: 'ok',
          environment: config.environment,
          api_base_url: config.apiBaseUrl,
          max_upload_mb: config.maxUploadMb,
          processing_timeout_ms: config.processingTimeoutMs,
          uptime_seconds: Math.floor((Date.now() - config.startedAt) / 1000),
          request_count: metrics.requestCount,
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/metrics') {
        sendText(
          res,
          200,
          renderMetrics(metrics, config.environment),
          'text/plain; version=0.0.4; charset=utf-8'
        );
        return;
      }

      if (req.method === 'GET' && pathname === '/config.js') {
        sendText(
          res,
          200,
          `window.__TWIN_CONFIG__ = ${JSON.stringify({
            API_BASE_URL: '/api',
            MAX_UPLOAD_MB: config.maxUploadMb,
            PROCESSING_TIMEOUT_MS: config.processingTimeoutMs,
            APP_ENV: config.environment,
          })};`,
          'application/javascript; charset=utf-8'
        );
        return;
      }

      if (req.method === 'POST' && pathname === '/api/ingest') {
        try {
          const body = await readRequestBody(req);
          const response = await fetchImpl(`${config.apiBaseUrl}/ingest`, {
            method: 'POST',
            headers: {
              'content-type': req.headers['content-type'] || '',
              Accept: 'application/json',
            },
            body,
          });

          const text = await response.text();
          sendText(
            res,
            response.status,
            text,
            response.headers.get('content-type') || 'application/json; charset=utf-8'
          );
        } catch (error) {
          sendProxyFailure(res, error);
        }
        return;
      }

      if (req.method === 'POST' && pathname === '/api/document/ingest') {
        try {
          const body = await readRequestBody(req);
          const response = await fetchImpl(`${config.apiBaseUrl}/document/ingest`, {
            method: 'POST',
            headers: {
              'content-type': req.headers['content-type'] || '',
              Accept: 'application/json',
            },
            body,
          });

          const text = await response.text();
          sendText(
            res,
            response.status,
            text,
            response.headers.get('content-type') || 'application/json; charset=utf-8'
          );
        } catch (error) {
          sendProxyFailure(res, error);
        }
        return;
      }

      const processingEventsMatch =
        req.method === 'GET' ? pathname.match(/^\/api\/ingest\/([^/]+)\/events$/) : null;
      if (processingEventsMatch) {
        const ingestionId = processingEventsMatch[1];
        await proxyJson(
          res,
          'GET',
          `${config.apiBaseUrl}/ingest/${encodeURIComponent(ingestionId)}/events${search}`
        );
        return;
      }

      const documentProcessingEventsMatch =
        req.method === 'GET' ? pathname.match(/^\/api\/document\/ingest\/([^/]+)\/events$/) : null;
      if (documentProcessingEventsMatch) {
        const ingestionId = documentProcessingEventsMatch[1];
        await proxyJson(
          res,
          'GET',
          `${config.apiBaseUrl}/document/ingest/${encodeURIComponent(ingestionId)}/events${search}`
        );
        return;
      }

      if (req.method === 'GET' && pathname === '/api/graph') {
        await proxyJson(res, 'GET', `${config.apiBaseUrl}/graph${search}`);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/document/graph') {
        await proxyJson(res, 'GET', `${config.apiBaseUrl}/document/graph${search}`);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/impact') {
        await proxyJson(res, 'GET', `${config.apiBaseUrl}/impact${search}`);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/risk') {
        await proxyJson(res, 'GET', `${config.apiBaseUrl}/risk${search}`);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/seed') {
        await proxyJson(res, 'POST', `${config.apiBaseUrl}/seed${search}`);
        return;
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendText(res, 404, 'Not found.');
        return;
      }

      if (!distExists) {
        sendMissingBuildResponse(res);
        return;
      }

      if (!allowStaticRequest(req.socket.remoteAddress)) {
        metrics.rateLimitHits += 1;
        sendText(res, 429, 'Too many requests. Please try again shortly.');
        return;
      }

      const staticPath = resolveDistPath(config.distDir, pathname);

      if (staticPath && fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
        await serveFile(res, staticPath);
        return;
      }

      const indexPath = path.join(config.distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        await serveFile(res, indexPath);
        return;
      }

      sendMissingBuildResponse(res);
    });
  }

  return {
    listen(...args) {
      const server = createServer();
      return server.listen(...args);
    },
  };
}

function startServer(options = {}) {
  const config = readConfig(options);
  const app = createApp(options);
  return app.listen(config.port, '0.0.0.0', () => {
    console.log(
      `Frontend running on port ${config.port} in ${config.environment} with API ${config.apiBaseUrl}`
    );
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  classifyPath,
  createApp,
  readConfig,
  renderMetrics,
  startServer,
};
