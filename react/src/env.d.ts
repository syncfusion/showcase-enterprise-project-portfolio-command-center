/// <reference types="vite/client" />
// Build-time constants defined in vite.config.ts.
declare const __APP_NAME__: string;
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_SYNCFUSION_LICENSE_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}