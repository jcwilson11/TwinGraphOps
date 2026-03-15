/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_MAX_UPLOAD_MB?: string;
  readonly VITE_PROCESSING_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    __TWIN_CONFIG__?: {
      API_BASE_URL?: string;
      MAX_UPLOAD_MB?: number | string;
      PROCESSING_TIMEOUT_MS?: number | string;
      APP_ENV?: string;
    };
  }
}

export {};
