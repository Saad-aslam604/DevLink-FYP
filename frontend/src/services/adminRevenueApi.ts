import api from '../utils/api'

export async function fetchRevenue(options: { range?: string; page?: number; limit?: number } = {}) {
  const { range = '30days', page = 1, limit = 50 } = options
  const params = new URLSearchParams()
  if (range) params.set('range', range)
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))
  const token = typeof window !== 'undefined' ? (localStorage.getItem('devlink_admin_token') || localStorage.getItem('adminToken') || null) : null
  const headers: Record<string,string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const resp = await api.get(`/admin/revenue?${params.toString()}`, { headers })
  return resp.data
}

export function exportRevenueCsv() {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('devlink_admin_token') || localStorage.getItem('adminToken') || null) : null
  const headers: Record<string,string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return api.get('/admin/revenue/export', { headers, responseType: 'blob' } as any)
}

export default { fetchRevenue, exportRevenueCsv }
