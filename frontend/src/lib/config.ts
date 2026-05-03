const runtimeConfig = window.__TWIN_CONFIG__ ?? {};

function readNumber(value: number | string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const appConfig = {
  apiBaseUrl: 'http://localhost:8000',
  maxUploadBytes:
    readNumber(runtimeConfig.MAX_UPLOAD_MB || import.meta.env.VITE_MAX_UPLOAD_MB, 50) * 1024 * 1024,
  processingTimeoutMs: readNumber(
    runtimeConfig.PROCESSING_TIMEOUT_MS || import.meta.env.VITE_PROCESSING_TIMEOUT_MS,
    300000
  ),
  environment: runtimeConfig.APP_ENV || 'local',
};
