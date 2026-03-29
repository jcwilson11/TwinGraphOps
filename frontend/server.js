const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const APP_ENV = process.env.TWIN_ENV || 'local';

const API_BASE_URL =
  process.env.PUBLIC_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  'http://api:8000';

const PUBLIC_MAX_UPLOAD_MB = Number(
  process.env.PUBLIC_MAX_UPLOAD_MB || process.env.VITE_MAX_UPLOAD_MB || 10
);

const PUBLIC_PROCESSING_TIMEOUT_MS = Number(
  process.env.PUBLIC_PROCESSING_TIMEOUT_MS || process.env.VITE_PROCESSING_TIMEOUT_MS || 90000
);

const STATIC_RATE_LIMIT_WINDOW_MS = Number(process.env.STATIC_RATE_LIMIT_WINDOW_MS || 60_000);
const STATIC_RATE_LIMIT_MAX = Number(process.env.STATIC_RATE_LIMIT_MAX || 120);
const DIST_DIR = path.join(__dirname, 'dist');

function createMetricsState() {
  return {
    startedAt: Date.now(),
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

function renderMetrics(state) {
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
  lines.push(`twingraphops_frontend_environment_info{environment="${APP_ENV}"} 1`);
  return `${lines.join('\n')}\n`;
}

function createApp() {
  const app = express();
  const metrics = createMetricsState();

  const staticAssetLimiter = rateLimit({
    windowMs: STATIC_RATE_LIMIT_WINDOW_MS,
    limit: STATIC_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      metrics.rateLimitHits += 1;
      res.status(429).send('Too many requests. Please try again shortly.');
    },
  });

  app.use((req, res, next) => {
    metrics.requestCount += 1;
    metrics.inFlightRequests += 1;
    res.on('finish', () => {
      metrics.inFlightRequests = Math.max(metrics.inFlightRequests - 1, 0);
      const pathLabel = classifyPath(req.path);
      incrementCounter(metrics.requestsByRoute, `${req.method}|${pathLabel}|${res.statusCode}`);
      if (pathLabel === '/assets/*') {
        incrementCounter(metrics.staticAssetByStatus, String(res.statusCode));
      }
    });
    next();
  });

  app.get('/healthz', (req, res) => {
    res.json({
      service: 'twin_frontend',
      status: 'ok',
      environment: APP_ENV,
      api_base_url: API_BASE_URL,
      max_upload_mb: PUBLIC_MAX_UPLOAD_MB,
      processing_timeout_ms: PUBLIC_PROCESSING_TIMEOUT_MS,
      uptime_seconds: Math.floor((Date.now() - metrics.startedAt) / 1000),
      request_count: metrics.requestCount,
    });
  });

  app.get('/metrics', (req, res) => {
    res.type('text/plain; version=0.0.4; charset=utf-8');
    res.send(renderMetrics(metrics));
  });

  app.get('/config.js', (req, res) => {
    res.type('application/javascript');
    res.send(
      `window.__TWIN_CONFIG__ = ${JSON.stringify({
        API_BASE_URL: '/api',
        MAX_UPLOAD_MB: PUBLIC_MAX_UPLOAD_MB,
        PROCESSING_TIMEOUT_MS: PUBLIC_PROCESSING_TIMEOUT_MS,
        APP_ENV,
      })};`
    );
  });

  async function proxyJson(req, res, method, targetPath) {
    try {
      const query = req.originalUrl.includes('?')
        ? req.originalUrl.slice(req.originalUrl.indexOf('?'))
        : '';

      const response = await fetch(`${API_BASE_URL}${targetPath}${query}`, {
        method,
        headers: {
          Accept: 'application/json',
        },
      });

      const text = await response.text();
      res.status(response.status);
      res.type(response.headers.get('content-type') || 'application/json');
      res.send(text);
    } catch (error) {
      res.status(502).json({
        status: 'error',
        error: {
          code: 'frontend_proxy_failed',
          message: String(error),
        },
      });
    }
  }

  app.post('/api/ingest', async (req, res) => {
    try {
      const chunks = [];

      req.on('data', (chunk) => chunks.push(chunk));

      req.on('end', async () => {
        const body = Buffer.concat(chunks);

        const response = await fetch(`${API_BASE_URL}/ingest`, {
          method: 'POST',
          headers: {
            'content-type': req.headers['content-type'] || '',
            Accept: 'application/json',
          },
          body,
        });

        const text = await response.text();
        res.status(response.status);
        res.set('content-type', response.headers.get('content-type') || 'application/json');
        res.send(text);
      });

      req.on('error', (error) => {
        res.status(502).json({
          status: 'error',
          error: {
            code: 'frontend_proxy_request_stream_failed',
            message: String(error),
          },
        });
      });
    } catch (error) {
      res.status(502).json({
        status: 'error',
        error: {
          code: 'frontend_proxy_failed',
          message: String(error),
        },
      });
    }
  });

  app.get('/api/graph', (req, res) => {
    proxyJson(req, res, 'GET', '/graph');
  });

  app.get('/api/impact', (req, res) => {
    proxyJson(req, res, 'GET', '/impact');
  });

  app.get('/api/risk', (req, res) => {
    proxyJson(req, res, 'GET', '/risk');
  });

  app.post('/api/seed', (req, res) => {
    proxyJson(req, res, 'POST', '/seed');
  });

  if (fs.existsSync(DIST_DIR)) {
    app.use(staticAssetLimiter, express.static(DIST_DIR));

    app.get('*', staticAssetLimiter, (req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  } else {
    app.get('*', (req, res) => {
      res
        .status(503)
        .type('text/plain')
        .send('Frontend build is missing. Run "npm run build" in the frontend directory or use "npm run dev".');
    });
  }

  return app;
}

function startServer() {
  const app = createApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frontend running on port ${PORT} in ${APP_ENV} with API ${API_BASE_URL}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  classifyPath,
  createApp,
  renderMetrics,
  startServer,
};
