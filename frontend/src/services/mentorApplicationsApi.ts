import api, { adminHeaders } from './api'

export async function fetchApplications(params = {}) {
  const qs = new URLSearchParams(params as any).toString()
  const path = `/admin/mentor-applications${qs ? `?${qs}` : ''}`
  return api.get(path, { useAdmin: true })
}

export async function fetchApplication(id: string) {
  return api.get(`/admin/mentor-applications/${id}`, { useAdmin: true })
}

export async function approveApplication(applicationId: string, approvedRate?: number, adminNotes?: string) {
  return api.post(`/admin/mentor-applications/${applicationId}/approve`, { approvedRate, adminNotes }, { useAdmin: true })
}

export async function rejectApplication(applicationId: string, rejectionReason?: string) {
  return api.post(`/admin/mentor-applications/${applicationId}/reject`, { rejectionReason }, { useAdmin: true })
}

export async function fetchStats() {
  return api.get('/admin/mentor-applications/stats', { useAdmin: true })
}

export async function bulkAction(action: string, applicationIds: string[], opts: any = {}) {
  return api.post('/admin/mentor-applications/bulk-action', { action, applicationIds, ...opts }, { useAdmin: true })
}

export async function exportApplicationsCsv(params = {}) {
  const json = await fetchApplications(params)
  const apps = (json && json.data) || []
  const headers = ['id', 'name', 'title', 'email', 'status', 'requestedRate', 'submittedAt', 'skills']
  const rows = apps.map((a: any) => [
    a._id || a._id,
    a.user ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim() : '',
    a.title || '',
    a.user ? a.user.email : '',
    a.status || '',
    a.requestedRate || '',
    a.submittedAt || '',
    Array.isArray(a.skills) ? a.skills.join('|') : (a.skills || ''),
  ])
  const csv = [headers.join(','), ...rows.map((r: any) => r.map((c: any) => `"${String(c || '').replace(/"/g, '""')}"`).join(','))].join('\n')
  return csv
}

export default {
  fetchApplications,
  fetchApplication,
  approveApplication,
  rejectApplication,
  fetchStats,
  bulkAction,
  exportApplicationsCsv,
}
