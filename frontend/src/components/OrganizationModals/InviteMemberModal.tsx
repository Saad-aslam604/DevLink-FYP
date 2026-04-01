import React, { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onInvited: (member: any) => void
  headers?: Record<string,string>
}

export default function InviteMemberModal({ open, onClose, onInvited, headers }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('mentor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function validEmail(e: string) {
    return /\S+@\S+\.\S+/.test(e)
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    if (!validEmail(email)) return setError('Enter a valid email')
    setLoading(true)
    try {
      const body = { email, role }
      const res = await fetch('/api/organization/team/invite', { method: 'POST', headers: headers as any, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        // show server-provided message when available
        const msg = (j && (j.message || j.error)) ? (j.message || j.error) : `Invite failed (${res.status})`
        return setError(msg)
      }
      const member = j && (j.data || j.member) ? (j.data || j.member) : j
      onInvited(member)
    } catch (err: any) {
      setError(err && err.message ? err.message : 'Unknown error')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold dark:text-white">Invite Team Member</h3>
        <div className="mt-4 grid gap-2">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" />
          <select value={role} onChange={e => setRole(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600">
            <option value="mentor">Senior Dev</option>
            <option value="junior">Junior Dev</option>
            <option value="designer">Designer</option>
            <option value="manager">Manager</option>
          </select>
          {error && <div className="text-red-600 dark:text-red-400">{error}</div>}
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded dark:border-gray-600 dark:text-gray-300 hover:dark:bg-gray-700">Cancel</button>
          <button type="submit" disabled={loading} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Inviting...' : 'Invite'}</button>
        </div>
      </form>
    </div>
  )
}
