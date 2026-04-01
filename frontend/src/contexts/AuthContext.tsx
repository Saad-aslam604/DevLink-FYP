import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type User = any

type AuthContextType = {
  user: User | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: (idToken: string) => Promise<{ error: string | null }>
  forgotPassword: (email: string) => Promise<{ error: string | null }>
  resetPassword: (token: string, newPassword: string) => Promise<{ error: string | null }>
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

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

function getAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function parseJsonSafe(res: Response) {
  try {
    const j = await res.json()
    return j
  } catch (e) {
    const text = await res.text().catch(() => '')
    return { success: false, message: text || res.statusText }
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        console.log('AuthContext - Checking token:', token ? 'exists' : 'none')
        if (!token) {
          console.log('AuthContext - No token found')
          return
        }
        const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        const j = await parseJsonSafe(res)
        console.log('AuthContext - /auth/me response:', res.status, j)
        if (!mounted) return
        if (res.ok && j && j.success && j.data && j.data.user) {
          const u = j.data.user
          console.log('AuthContext - User authenticated:', u)
          setUser(u)
          try {
            const uid = u && (u._id || u.id || u.userId) ? String(u._id ?? u.id ?? u.userId) : null
            if (uid) localStorage.setItem('devlink_user_id', uid)
            const initial = (u && (u.firstName || u.name) ? String((u.firstName || u.name)).charAt(0).toUpperCase() : null)
            if (initial) localStorage.setItem('devlink_user_initial', initial)
          } catch (e) {
            // ignore localStorage set errors
          }
        } else {
          console.log('AuthContext - Authentication failed, clearing token')
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
        }
      } catch (err) {
        console.warn('Error calling /api/auth/me', err)
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

      const j = await parseJsonSafe(res)
      if (!res.ok || !j || !j.success) {
        return { error: j && j.message ? j.message : 'Login failed' }
      }

      const t = j.data?.token ?? null
      if (t) {
        localStorage.setItem(TOKEN_KEY, t)
        setToken(t)
      }
      const u = j.data?.user ?? null
      setUser(u)
      try {
        const uid = u && (u._id || u.id || u.userId) ? String(u._id ?? u.id ?? u.userId) : null
        if (uid) localStorage.setItem('devlink_user_id', uid)
        const initial = (u && (u.firstName || u.name) ? String((u.firstName || u.name)).charAt(0).toUpperCase() : null)
        if (initial) localStorage.setItem('devlink_user_initial', initial)
      } catch (e) {
        // ignore localStorage errors
      }
      return { error: null }
    } catch (err: any) {
      return { error: err?.message ?? String(err) }
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async (idToken: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken }),
      })

      const j = await parseJsonSafe(res)
      if (!res.ok || !j || !j.success) {
        return { error: j && j.message ? j.message : 'Google login failed' }
      }

      const t = j.data?.token ?? null
      if (t) {
        localStorage.setItem(TOKEN_KEY, t)
        setToken(t)
      }
      const userObj = j.data?.user ?? null
      setUser(userObj)
      try {
        const uid = userObj && (userObj._id || userObj.id || userObj.userId) ? String(userObj._id ?? userObj.id ?? userObj.userId) : null
        if (uid) localStorage.setItem('devlink_user_id', uid)
        const initial = (userObj && (userObj.firstName || userObj.name) ? String((userObj.firstName || userObj.name)).charAt(0).toUpperCase() : null)
        if (initial) localStorage.setItem('devlink_user_initial', initial)
      } catch (e) {
        // ignore
      }
      console.debug('[Auth] Google sign-in successful', { user: userObj })
      // navigate after state has been set
      try {
        console.log('Login successful, navigating to dashboard...')
        navigate('/app/dashboard')
        console.log('Navigation called')
      } catch (navErr) {
        console.warn('Navigation after Google sign-in failed', navErr)
      }
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

      const j = await parseJsonSafe(res)
      if (!res.ok || !j || !j.success) {
        return { error: j && j.message ? j.message : 'Registration failed' }
      }

      const t = j.data?.token ?? null
      if (t) {
        localStorage.setItem(TOKEN_KEY, t)
        setToken(t)
      }
      const u = j.data?.user ?? null
      setUser(u)
      try {
        const uid = u && (u._id || u.id || u.userId) ? String(u._id ?? u.id ?? u.userId) : null
        if (uid) localStorage.setItem('devlink_user_id', uid)
        const initial = (u && (u.firstName || u.name) ? String((u.firstName || u.name)).charAt(0).toUpperCase() : null)
        if (initial) localStorage.setItem('devlink_user_initial', initial)
      } catch (e) {}

      if (name) {
        const names = (name || '').split(' ').filter(Boolean)
        const firstName = names.shift() || ''
        const lastName = names.join('') || ''
        try {
          const r = await fetch(`${API_BASE}/profiles/me`, {
            method: 'PUT',
            headers: getAuthHeaders(t),
            body: JSON.stringify({ firstName, lastName }),
          })
          await parseJsonSafe(r)
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
    // remove persisted user id and initial as well
    try { localStorage.removeItem('devlink_user_id') } catch (e) {}
    try { localStorage.removeItem('devlink_user_initial') } catch (e) {}
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

      const j = await parseJsonSafe(res)
      if (!res.ok || !j || !j.success) return { error: j && j.message ? j.message : 'Failed to update' }
      if (j.data && j.data.profile) setUser(j.data.profile)
      return { error: null }
    } catch (err: any) {
      return { error: err?.message ?? String(err) }
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const j = await parseJsonSafe(res)
      if (!res.ok || !j) return { error: j && j.message ? j.message : 'Request failed' }
      // in dev the endpoint may return resetUrl; don't store it here
      return { error: null }
    } catch (err: any) {
      return { error: err?.message ?? String(err) }
    }
  }

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const j = await parseJsonSafe(res)
      if (!res.ok || !j) return { error: j && j.message ? j.message : 'Reset failed' }
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
    signInWithGoogle,
    forgotPassword,
    resetPassword,
    signUp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
