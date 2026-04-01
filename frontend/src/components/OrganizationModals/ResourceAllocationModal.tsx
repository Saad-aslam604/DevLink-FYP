import React, { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (resource: any) => void
  projects: any[]
  headers?: Record<string,string>
}

export default function ResourceAllocationModal({ open, onClose, onCreated, projects, headers }: Props) {
  const [type, setType] = useState('Tool')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState<number | ''>(1)
  const [cost, setCost] = useState<number | ''>('')
  const [projectId, setProjectId] = useState(projects && projects[0] ? (projects[0]._id || projects[0].id) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Name required')
    setLoading(true)
    try {
      // backend expects `allocatedTo` and lowercase `type`
      const body = { type: String(type || '').toLowerCase(), name: name.trim(), quantity: quantity === '' ? 0 : Number(quantity), cost: cost === '' ? 0 : Number(cost), allocatedTo: projectId || undefined }
      const res = await fetch('/api/organization/resources', { method: 'POST', headers: headers as any, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to allocate resource')
      const j = await res.json()
      const resource = j && (j.data || j.resource) ? (j.data || j.resource) : j
      onCreated(resource)
    } catch (err: any) { setError(err.message || 'Unknown error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold dark:text-white">Allocate Resource</h3>
        <div className="mt-4 grid gap-2">
          <select value={type} onChange={e => setType(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600">
            <option>Tool</option>
            <option>Subscription</option>
            <option>Documentation</option>
            <option>Hardware</option>
          </select>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Resource name" className="p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" />
          <div className="grid grid-cols-2 gap-2">
            <input value={quantity as any} onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Quantity" className="p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" />
            <input value={cost as any} onChange={e => setCost(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Cost" className="p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" />
          </div>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600">
            <option value="">(Optional) Project</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
          {error && <div className="text-red-600 dark:text-red-400">{error}</div>}
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded dark:border-gray-600 dark:text-gray-300 hover:dark:bg-gray-700">Cancel</button>
          <button type="submit" disabled={loading} className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">{loading ? 'Allocating...' : 'Allocate'}</button>
        </div>
      </form>
    </div>
  )
}
