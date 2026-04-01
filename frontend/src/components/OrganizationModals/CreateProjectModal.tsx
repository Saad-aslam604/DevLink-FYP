import React, { useState } from 'react'
import FileUpload from '../FileUpload/FileUpload'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (project: any) => void
  orgId?: string | null
  headers?: Record<string,string>
}

export default function CreateProjectModal({ open, onClose, onCreated, orgId, headers }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState<number | ''>('')
  const [deadline, setDeadline] = useState<string>('')
  const [skills, setSkills] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<any[]>([])

  if (!open) return null

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    if (!title.trim()) return setError('Title is required')
    setLoading(true)
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        budget: budget === '' ? undefined : Number(budget),
        deadline: deadline || undefined,
        skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        organization: orgId || undefined,
        attachments: (attachments || []).map(a => a._id || a.id || a.filename || a.filename)
      }
  // Organizations should create projects via the organization-scoped endpoint to avoid permission issues
  const res = await fetch('/api/organization/projects', { method: 'POST', headers: headers as any, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to create project')
      const j = await res.json()
      const project = j && (j.data || j.project) ? (j.data || j.project) : j
      onCreated(project)
    } catch (err: any) {
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded p-6 w-full max-w-lg text-gray-900 dark:text-gray-100">
        <h3 className="text-lg font-semibold">Create New Project</h3>
        <div className="mt-4 grid gap-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
          <div className="grid grid-cols-3 gap-2">
            <input value={budget as any} onChange={e => setBudget(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Budget" className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            <input value={deadline} onChange={e => setDeadline(e.target.value)} type="date" className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="Skills (comma separated)" className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
          </div>
            <div>
              <label className="block text-sm font-medium">Attachments</label>
              <FileUpload multiple={true} onUploaded={(f) => setAttachments((cur) => [...cur, f])} />
              <div className="mt-2 flex gap-2 flex-wrap">
                {attachments.map((a, i) => (
                  <div key={i} className="px-2 py-1 bg-gray-100 rounded text-sm">{a.originalName || a.filename || a._id || 'file'}</div>
                ))}
              </div>
            </div>
          {error && <div className="text-red-600">{error}</div>}
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded bg-transparent dark:bg-transparent">Cancel</button>
          <button type="submit" disabled={loading} className="px-3 py-1 bg-green-600 text-white rounded">{loading ? 'Creating...' : 'Create'}</button>
        </div>
      </form>
    </div>
  )
}
