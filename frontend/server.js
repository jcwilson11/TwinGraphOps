const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

function readConfig(overrides = {}) {
  const port = Number(overrides.port || process.env.PORT || 3000);
  const startedAt = overrides.startedAt ?? Date.now();
  const environment = overrides.environment || process.env.TWIN_ENV || 'local';
  const apiBaseUrl =
    overrides.apiBaseUrl || process.env.PUBLIC_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://api:8000';
  const maxUploadMb = Number(overrides.maxUploadMb || process.env.PUBLIC_MAX_UPLOAD_MB || process.env.VITE_MAX_UPLOAD_MB || 10);
  const processingTimeoutMs = Number(
    overrides.processingTimeoutMs || process.env.PUBLIC_PROCESSING_TIMEOUT_MS || process.env.VITE_PROCESSING_TIMEOUT_MS || 90000
  );
  const staticRateLimitWindowMs = Number(overrides.staticRateLimitWindowMs || process.env.STATIC_RATE_LIMIT_WINDOW_MS || 60_000);
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

function createApp(options = {}) {
  const config = readConfig(options);
  const app = express();
  const fetchImpl = options.fetchImpl || global.fetch;
  let requestCount = 0;

  const staticAssetLimiter = rateLimit({
    windowMs: config.staticRateLimitWindowMs,
    limit: config.staticRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests. Please try again shortly.',
  });

  app.use((req, res, next) => {
    requestCount += 1;
    next();
  });

  app.get('/healthz', (req, res) => {
    res.json({
      service: 'twin_frontend',
      status: 'ok',
      environment: config.environment,
      api_base_url: config.apiBaseUrl,
      max_upload_mb: config.maxUploadMb,
      processing_timeout_ms: config.processingTimeoutMs,
      uptime_seconds: Math.floor((Date.now() - config.startedAt) / 1000),
      request_count: requestCount,
    });
  });

  app.get('/config.js', (req, res) => {
    res.type('application/javascript');
    res.send(
      `window.__TWIN_CONFIG__ = ${JSON.stringify({
        API_BASE_URL: '/api',
        MAX_UPLOAD_MB: config.maxUploadMb,
        PROCESSING_TIMEOUT_MS: config.processingTimeoutMs,
        APP_ENV: config.environment,
      })};`
    );
  });

  async function proxyJson(req, res, method, targetPath) {
    try {
      const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';

      const response = await fetchImpl(`${config.apiBaseUrl}${targetPath}${query}`, {
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

        const response = await fetchImpl(`${config.apiBaseUrl}/ingest`, {
          method: 'POST',
          headers: {
            'content-type': req.headers['content-type'] || '',
            Accept: 'application/json',
          },
          body,
        });

        const text = await response.text();
        console.log('BACKEND RESPONSE:', text);

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

  if (fs.existsSync(config.distDir)) {
    app.use(staticAssetLimiter, express.static(config.distDir));

    app.get('*', staticAssetLimiter, (req, res) => {
      res.sendFile(path.join(config.distDir, 'index.html'));
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

function startServer(options = {}) {
  const config = readConfig(options);
  const app = createApp(options);
  return app.listen(config.port, '0.0.0.0', () => {
    console.log(`Frontend running on port ${config.port} in ${config.environment} with API ${config.apiBaseUrl}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  readConfig,
  startServer,
};
