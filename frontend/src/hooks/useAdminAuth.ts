import { useState, useEffect } from 'react'
import adminApi from '../services/adminApi'

const ADMIN_TOKEN_KEY = 'devlink_admin_token'

export default function useAdminAuth() {
  const [token, setToken] = useState<string | null>(() => {
    try { return typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null } catch (e) { return null }
  })
  const [loading, setLoading] = useState(false)
  const [admin, setAdmin] = useState<any | null>(null)

  useEffect(() => {
    if (!token) return
    // Optionally fetch profile
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setAdmin(data.data || null)
        }
      } catch (e) {
        console.warn('useAdminAuth: fetch profile failed', e)
      } finally { setLoading(false) }
    }
    load()
  }, [token])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const res = await adminApi.loginAdmin(email, password)
      if (res && res.success && res.token) {
        try { localStorage.setItem(ADMIN_TOKEN_KEY, res.token) } catch (e) {}
        setToken(res.token)
        return { success: true }
      }
      return { success: false, error: res && res.message ? res.message : 'Login failed' }
    } catch (e: any) {
      console.warn('admin signIn failed', e)
      return { success: false, error: e?.message || String(e) }
    } finally { setLoading(false) }
  }

  const signOut = () => {
    try { localStorage.removeItem(ADMIN_TOKEN_KEY) } catch (e) {}
    setToken(null)
    setAdmin(null)
  }

  return { token, admin, loading, signIn, signOut, isAuthenticated: !!token }
}
