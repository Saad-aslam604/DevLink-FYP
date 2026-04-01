import React, { useEffect, useState } from 'react'

type Invitation = {
  _id?: string
  id?: string
  organization?: { _id?: string; name?: string; firstName?: string; lastName?: string }
  role?: string
  invitedAt?: string
  status?: string
}

export default function InvitationInbox() {
  const [invites, setInvites] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string,boolean>>({})

  const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

  function getHeaders() {
    const headers: Record<string,string> = { 'Content-Type': 'application/json' }
    const token = typeof window !== 'undefined' ? localStorage.getItem('devlink_token') : null
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/organization/invitations/my`, { headers: getHeaders() })
      if (!res.ok) throw new Error('Failed to load invitations')
      const j = await res.json()
      const data = j && (j.data || j.invites) ? (j.data || j.invites) : j
      setInvites(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function doAction(id: string, action: 'accept' | 'reject') {
    setActionLoading((s) => ({ ...s, [id]: true }))
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/organization/invitations/${id}/${action}`, { method: 'POST', headers: getHeaders() })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Request failed')
      }
      // remove or update the invite in the list
      setInvites((cur) => cur.filter((c) => String(c._id || c.id) !== String(id)))
    } catch (err: any) {
      setError(err.message || 'Unknown error')
    } finally {
      setActionLoading((s) => ({ ...s, [id]: false }))
    }
  }

  return (
    <div className="rounded-2xl p-4 mb-6 bg-white dark:bg-gray-800 border">
      <h3 className="text-lg font-semibold mb-2">Organization Invitations</h3>
      <p className="text-sm text-gray-600 mb-3">Pending invitations to join organizations.</p>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
        </div>
      ) : null}
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {!loading && invites && invites.length === 0 && <div className="text-sm text-gray-600">No pending invitations.</div>}
      <div className="space-y-3">
        {invites.map((inv) => {
          const id = String(inv._id || inv.id)
          const orgName = (inv.organization && (inv.organization.name || `${inv.organization.firstName || ''} ${inv.organization.lastName || ''}`)) || 'Organization'
          return (
            <div key={id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">{orgName}</div>
                <div className="text-sm text-gray-500">Role: {inv.role || 'member'}</div>
                <div className="text-xs text-gray-400">Sent: {inv.invitedAt ? new Date(inv.invitedAt).toLocaleString() : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={!!actionLoading[id]}
                  onClick={() => doAction(id, 'accept')}
                  className={`px-3 py-1 rounded text-white ${actionLoading[id] ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {actionLoading[id] ? 'Please wait' : 'Accept'}
                </button>
                <button
                  disabled={!!actionLoading[id]}
                  onClick={() => doAction(id, 'reject')}
                  className={`px-3 py-1 rounded text-white ${actionLoading[id] ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {actionLoading[id] ? 'Please wait' : 'Decline'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
