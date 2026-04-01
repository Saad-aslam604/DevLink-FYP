// Type declarations for Vite's import.meta.env variables used in this project.
// Add any VITE_* or other env keys you access from the client here.

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_DEBUG_UI?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly REACT_APP_SUPABASE_URL?: string
  readonly REACT_APP_SUPABASE_ANON_KEY?: string
  // add other env variables you need here, e.g.:
  // readonly VITE_SOME_FLAG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
