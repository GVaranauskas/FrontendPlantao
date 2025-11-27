/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_ENABLE_DEV_TOOLS: string;
  readonly VITE_ENABLE_QUERY_DEVTOOLS: string;
  readonly VITE_AUTH_TOKEN_KEY: string;
  readonly VITE_REFRESH_TOKEN_KEY: string;
  readonly VITE_TOKEN_EXPIRY_DAYS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
