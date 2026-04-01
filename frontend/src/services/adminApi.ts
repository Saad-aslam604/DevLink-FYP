import api from '../utils/api'

const ADMIN_TOKEN_KEY = 'devlink_admin_token'

export async function loginAdmin(email: string, password: string) {
  const res = await api.post('/admin/login', { email, password })
  return res.data
}

export async function fetchAdminUsers(token?: string) {
  const t = token || (typeof window !== 'undefined' && localStorage.getItem(ADMIN_TOKEN_KEY)) || null
  const headers: Record<string,string> = {}
  if (t) headers['Authorization'] = `Bearer ${t}`
  const res = await api.get('/admin/users', { headers })
  return res.data
}

export async function updateUserRole(userId: string, role: string, token?: string) {
  const t = token || (typeof window !== 'undefined' && localStorage.getItem(ADMIN_TOKEN_KEY)) || null
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (t) headers['Authorization'] = `Bearer ${t}`
  const res = await api.patch(`/admin/users/${userId}/role`, { role }, { headers })
  return res.data
}

export async function fetchAdminStats(token?: string) {
  const t = token || (typeof window !== 'undefined' && localStorage.getItem(ADMIN_TOKEN_KEY)) || null
  const headers: Record<string,string> = {}
  if (t) headers['Authorization'] = `Bearer ${t}`
  const res = await api.get('/admin/stats', { headers })
  return res.data
}

export async function fetchPendingApplications(token?: string, limit = 1) {
  const t = token || (typeof window !== 'undefined' && localStorage.getItem(ADMIN_TOKEN_KEY)) || null
  const headers: Record<string,string> = {}
  if (t) headers['Authorization'] = `Bearer ${t}`
  const res = await api.get(`/admin/mentor-applications?status=pending&limit=${limit}`, { headers })
  return res.data
}

export async function approveApplication(id: string, body: any = {}, token?: string) {
  const t = token || (typeof window !== 'undefined' && localStorage.getItem(ADMIN_TOKEN_KEY)) || null
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (t) headers['Authorization'] = `Bearer ${t}`
  const res = await api.post(`/admin/mentor-applications/${id}/approve`, body, { headers })
  return res.data
}

export async function announce(subject: string, message: string, token?: string) {
  const t = token || (typeof window !== 'undefined' && localStorage.getItem(ADMIN_TOKEN_KEY)) || null
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (t) headers['Authorization'] = `Bearer ${t}`
  const res = await api.post('/admin/announce', { subject, message }, { headers })
  return res.data
}

export default { loginAdmin, fetchAdminUsers, updateUserRole, fetchAdminStats, fetchPendingApplications, approveApplication, announce }
