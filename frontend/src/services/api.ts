// Central HTTP client for frontend services
// Provides helpers that automatically attach user/admin tokens from localStorage
const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

function isBrowser() {
  return typeof window !== 'undefined'
}

function dbg(...args: any[]) {
  // Vite exposes import.meta.env.DEV in development
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.DEV) console.debug('[api]', ...args)
  } catch (e) {
    // ignore
  }
}

export function getUserToken() {
  if (!isBrowser()) return null
  return localStorage.getItem('devlink_token') || localStorage.getItem('token') || null
}

export function getAdminToken() {
  if (!isBrowser()) return null
  // Support multiple dev keys for backward compatibility
  const fromStorage = localStorage.getItem('devlink_admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('ADMIN_TOKEN')
  if (fromStorage) return fromStorage

  // In development, support injecting a token via Vite env variable VITE_ADMIN_TOKEN
  try {
    const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : null
    const viteToken = env && env.VITE_ADMIN_TOKEN ? String(env.VITE_ADMIN_TOKEN) : null
    if (viteToken) {
      // persist to localStorage so subsequent calls behave normally
      try { localStorage.setItem('devlink_admin_token', viteToken) } catch (e) { /* ignore */ }
      return viteToken
    }
  } catch (e) { /* ignore when import.meta isn't available */ }

  return null
}

export function userHeaders(isJson = true) {
  const headers: Record<string,string> = {}
  const t = getUserToken()
  if (t) headers['Authorization'] = `Bearer ${t}`
  if (isJson) headers['Content-Type'] = 'application/json'
  return headers
}

export function adminHeaders(isJson = true) {
  const headers: Record<string,string> = {}
  const t = getAdminToken()
  if (t) headers['Authorization'] = `Bearer ${t}`
  if (isJson) headers['Content-Type'] = 'application/json'
  return headers
}

async function request(method: string, path: string, opts: { body?: any; headers?: Record<string,string>; useAdmin?: boolean } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
  const isJson = !(opts.body instanceof FormData)
  const baseHeaders = opts.headers || (opts.useAdmin ? adminHeaders(isJson) : userHeaders(isJson))
  dbg('request', method, url, { hasBody: !!opts.body, headers: Object.keys(baseHeaders) })

  // Log whether an auth token is being used
  try {
    const hasAuth = !!baseHeaders['Authorization']
    dbg('auth attached?', hasAuth)
  } catch (e) {}

  const fetchOpts: RequestInit = { method, headers: baseHeaders }
  if (opts.body !== undefined) fetchOpts.body = isJson ? JSON.stringify(opts.body) : opts.body
  // Force fresh GETs in dev to avoid stale 304 responses which the client treats as errors
  try {
    if (method === 'GET') (fetchOpts as any).cache = 'no-store'
  } catch (e) {}

  const res = await fetch(url, fetchOpts)
  let json = null
  try { json = await res.json() } catch (e) { /* ignore */ }
  if (!res.ok) {
    dbg('response error', res.status, json)
    // If unauthorized, clear stored tokens and emit a global event so UI can react
    if (res.status === 401 && isBrowser()) {
      try {
        localStorage.removeItem('devlink_token')
        localStorage.removeItem('adminToken')
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { path, method } }))
      } catch (e) {}
    }
    // rethrow a structured error
    const err: any = new Error('HTTP error')
    err.status = res.status
    err.body = json
    throw err
  }
  return json
}

export const api = {
  get: (path: string, opts?: any) => request('GET', path, opts),
  post: (path: string, body?: any, opts?: any) => request('POST', path, { body, ...(opts||{}) }),
  put: (path: string, body?: any, opts?: any) => request('PUT', path, { body, ...(opts||{}) }),
  patch: (path: string, body?: any, opts?: any) => request('PATCH', path, { body, ...(opts||{}) }),
  del: (path: string, opts?: any) => request('DELETE', path, opts),
  request,
  userHeaders,
  adminHeaders,
  getUserToken,
  getAdminToken,
}

export default api
