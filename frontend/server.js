const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const API_BASE_URL = process.env.PUBLIC_API_BASE_URL || 'http://api:8000';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const APP_START_TIME = Date.now();
const APP_ENV = process.env.TWIN_ENV || 'local';
const PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PUBLIC_MAX_UPLOAD_MB = Number(process.env.PUBLIC_MAX_UPLOAD_MB || process.env.VITE_MAX_UPLOAD_MB || 10);
const PUBLIC_PROCESSING_TIMEOUT_MS = Number(
  process.env.PUBLIC_PROCESSING_TIMEOUT_MS || process.env.VITE_PROCESSING_TIMEOUT_MS || 90000
);
const STATIC_RATE_LIMIT_WINDOW_MS = Number(process.env.STATIC_RATE_LIMIT_WINDOW_MS || 60_000);
const STATIC_RATE_LIMIT_MAX = Number(process.env.STATIC_RATE_LIMIT_MAX || 120);
const DIST_DIR = path.join(__dirname, 'dist');
let requestCount = 0;
const staticAssetLimiter = rateLimit({
  windowMs: STATIC_RATE_LIMIT_WINDOW_MS,
  limit: STATIC_RATE_LIMIT_MAX,
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
    environment: APP_ENV,
    api_base_url: PUBLIC_API_BASE_URL,
    max_upload_mb: PUBLIC_MAX_UPLOAD_MB,
    processing_timeout_ms: PUBLIC_PROCESSING_TIMEOUT_MS,
    uptime_seconds: Math.floor((Date.now() - APP_START_TIME) / 1000),
    request_count: requestCount,
  });
});

app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(
    `window.__TWIN_CONFIG__ = ${JSON.stringify({
      API_BASE_URL: PUBLIC_API_BASE_URL,
      MAX_UPLOAD_MB: PUBLIC_MAX_UPLOAD_MB,
      PROCESSING_TIMEOUT_MS: PUBLIC_PROCESSING_TIMEOUT_MS,
      APP_ENV,
    })};`
  );
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
        },
        body,
      });

      const text = await response.text();
      console.log("BACKEND RESPONSE:", text);
      res.status(response.status);
      res.set('content-type', response.headers.get('content-type') || 'application/json');
      res.send(text);
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend running on port ${PORT} in ${APP_ENV} with API ${PUBLIC_API_BASE_URL}`);
});

