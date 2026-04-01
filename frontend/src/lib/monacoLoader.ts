import * as monacoReact from '@monaco-editor/react'

// Try to access loader in a type-safe-any way; the library's types
// don't always export `loader` in a way TypeScript recognizes, so we
// use `any` to avoid type errors.
const loader: any = (monacoReact as any).loader || (monacoReact as any).default?.loader

// Configure Monaco loader to serve assets from /vs (we will copy the
// monaco-editor `min/vs` folder into `public/vs`). This avoids CORS and
// path resolution issues during development.
try {
  if (loader && typeof loader.config === 'function') {
    // Configure loader to use local files served from /public/vs.
    // We copy monaco-editor/min/vs into public/vs so the editor loads
    // without relying on an external CDN.
    loader.config({
      paths: { vs: '/vs' },
      'vs/nls': { availableLanguages: { '*': 'en' } }
    })
    // eslint-disable-next-line no-console
    console.log('✅ Monaco configured for LOCAL files (paths.vs=/vs)')
  } else {
    // eslint-disable-next-line no-console
    console.warn('Monaco loader not found on @monaco-editor/react export')
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('Monaco loader configuration skipped/failed', e)
}

export default loader
