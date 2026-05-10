/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** "true" / "1" to show team plans, /team, team collections UX. Omitted or false = hidden (default). */
  readonly VITE_TEAMS_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

