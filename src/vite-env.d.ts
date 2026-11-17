/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Shamayim weather Worker, e.g. https://shamayim-weather.example.workers.dev. Unset: Open-Meteo directly. */
  readonly VITE_WEATHER_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
