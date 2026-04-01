import React, { createContext, useContext, useEffect, useState } from 'react'

type User = any

type AuthContextType = {
  user: User | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (payload: { name?: string; email: string; password: string; role?: string }) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (patch: Record<string, any>) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

const TOKEN_KEY = 'devlink_token'

function getAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(true)
  const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        if (!token) return

        // Prefer the profiles/me endpoint (richer/sanitized profile data). Fall back to auth/me for compatibility.
        const headers = getAuthHeaders(token)
        let res = await fetch(`${API_BASE}/profiles/me`, { headers })
        let j: any = null
        try {
          const ct = res.headers.get('content-type') || ''
          if (ct.includes('application/json')) j = await res.json()
          else {
            const text = await res.text()
            if (text && text.trim()) throw new Error('Non-JSON response from /api/profiles/me: ' + text.slice(0, 500))
          }
        } catch (parseErr) {
          console.warn('Failed to parse JSON from /api/profiles/me', parseErr)
        }

        if (!mounted) return
        if (res.ok && j && j.success && j.data && j.data.profile) {
          setUser(j.data.profile)
        } else {
          // fallback to /auth/me for older behavior
          try {
            res = await fetch(`${API_BASE}/auth/me`, { headers })
            j = null
            const ct2 = res.headers.get('content-type') || ''
            if (ct2.includes('application/json')) j = await res.json()
            else {
              const text = await res.text()
              if (text && text.trim()) throw new Error('Non-JSON response from /api/auth/me: ' + text.slice(0, 500))
            }
            if (res.ok && j && j.success && j.data && j.data.user) setUser(j.data.user)
            else {
              localStorage.removeItem(TOKEN_KEY)
              setToken(null)
            }
          } catch (e) {
            console.warn('Fallback /auth/me failed', e)
            localStorage.removeItem(TOKEN_KEY)
            setToken(null)
          }
        }
      } catch (err) {
        console.warn('Error initializing auth/profile', err)
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [token])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
  const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      let j: any = null
      try {
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('application/json')) j = await res.json()
        else {
          const text = await res.text()
          throw new Error('Non-JSON response from /api/auth/login: ' + text.slice(0, 500))
        }
      } catch (parseErr) {
        console.warn('Failed to parse JSON from /api/auth/login', parseErr)
      }

      if (!res.ok || !j || !j.success) {
        const msg = j && j.message ? j.message : 'Login failed'
        return { error: msg }
      }
      const t = j.data?.token ?? null
      if (t) {
        localStorage.setItem(TOKEN_KEY, t)
        setToken(t)
      }
      setUser(j.data?.user ?? null)
      return { error: null }
    } catch (err: any) {
      return { error: err?.message ?? String(err) }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async ({ name, email, password, role }: { name?: string; email: string; password: string; role?: string }) => {
    setLoading(true)
    try {
  const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })
      let j: any = null
      try {
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('application/json')) j = await res.json()
        else {
          const text = await res.text()
          throw new Error('Non-JSON response from /api/auth/register: ' + text.slice(0, 500))
        }
      } catch (parseErr) {
        console.warn('Failed to parse JSON from /api/auth/register', parseErr)
      }

      if (!res.ok || !j || !j.success) {
        const msg = j && j.message ? j.message : 'Registration failed'
        return { error: msg }
      }
      const t = j.data?.token ?? null
      if (t) {
        localStorage.setItem(TOKEN_KEY, t)
        setToken(t)
      }
      setUser(j.data?.user ?? null)

      if (name) {
        const names = (name || '').split(' ').filter(Boolean)
        const firstName = names.shift() || ''
        const lastName = names.join('') || ''
        try {
          await fetch(`${API_BASE}/profiles/me`, {
            method: 'PUT',
            headers: getAuthHeaders(t),
            body: JSON.stringify({ firstName, lastName }),
          })
        } catch (e) {
          console.warn('failed to write profile name', e)
        }
      }

      return { error: null }
    } catch (err: any) {
      return { error: err?.message ?? String(err) }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setLoading(false)
  }

  const updateProfile = async (patch: Record<string, any>) => {
    if (!token) return { error: 'Not authenticated' }
    try {
      const res = await fetch(`${API_BASE}/profiles/me`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(patch),
      })
      let j: any = null
      try {
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('application/json')) j = await res.json()
        else {
          const text = await res.text()
          throw new Error('Non-JSON response from /api/profiles/me: ' + text.slice(0, 500))
        }
      } catch (parseErr) {
        console.warn('Failed to parse JSON from /api/profiles/me', parseErr)
      }

      if (!res.ok || !j || !j.success) return { error: (j && j.message) ? j.message : 'Failed to update' }
      if (j.data && j.data.profile) setUser(j.data.profile)
      return { error: null }
    } catch (err: any) {
      return { error: err?.message ?? String(err) }
    }
  }

  const value: AuthContextType = {
    user,
    token,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
