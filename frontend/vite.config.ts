// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
// We deliberately avoid enabling vite-plugin-monaco-editor by default
// because it can cause runtime issues in some dev setups. Instead we
// configure the loader to serve assets from /vs (copied into public/vs).

// ============================================
// ⚠️  IMPORTANT: NO CSP HEADERS IN DEVELOPMENT
// ============================================
// CSP breaks Vite's development features:
// - Hot Module Replacement (HMR)
// - Fast Refresh
// - Tailwind JIT compilation
// - Inline style injection
//
// Add CSP ONLY in production via:
// - nginx/ Apache headers
// - CDN configuration (Vercel, Netlify)
// - NOT in vite.config.ts
// ============================================

const plugins: any[] = [react()]

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // ✅ SAFE DEVELOPMENT SETTINGS (no CSP headers)
  server: {
    // Bind to localhost by default; allow overriding BACKEND_PORT via env or CURRENT_BACKEND_PORT file
    // FRONTEND_PORT env var can override the dev server port. If the requested port is busy,
    // allow Vite to try the next available port (strictPort: false) instead of failing.
    host: '127.0.0.1',
    port: parseInt(process.env.FRONTEND_PORT as any, 10) || 3000,
    strictPort: false,
    proxy: (() => {
      let backendPort = parseInt(process.env.BACKEND_PORT as any, 10);
      if (!backendPort) {
        try {
          const portFile = path.resolve(__dirname, '..', 'CURRENT_BACKEND_PORT');
          if (fs.existsSync(portFile)) {
            const val = fs.readFileSync(portFile, 'utf8').trim();
            const p = parseInt(val, 10);
            if (!Number.isNaN(p)) backendPort = p;
          }
        } catch (e) {
          // ignore and fallback to default
        }
      }
      backendPort = backendPort || 5000;
      const target = `http://localhost:${backendPort}`;
      return {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (pathStr: string) => pathStr,
        },
        '/socket.io': {
          target,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (p: string) => p,
        },
      };
    })(),
  },

  preview: {
    port: 3000,
    host: true,
  },

  // Optional build settings (production)
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

