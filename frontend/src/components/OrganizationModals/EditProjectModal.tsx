import React, { useEffect, useState } from 'react'

type Props = { open: boolean; onClose: () => void; project: any; onUpdated: (p: any) => void; headers?: Record<string,string> }

export default function EditProjectModal({ open, onClose, project, onUpdated, headers }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState<number | ''>('')
  const [deadline, setDeadline] = useState<string>('')
  const [skills, setSkills] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (project) {
      setTitle(project.title || '')
      setDescription(project.description || '')
      // project.budget may be a number or an object { amount, currency }
      try {
        const pb: any = project.budget
        if (pb == null) setBudget('')
        else if (typeof pb === 'number') setBudget(pb)
        else if (pb && pb.amount !== undefined) setBudget(Number(pb.amount))
        else setBudget('')
      } catch (e) { setBudget('') }
      setDeadline(project.deadline ? (new Date(project.deadline)).toISOString().slice(0,10) : '')
      setSkills(Array.isArray(project.skillsRequired) ? project.skillsRequired.join(', ') : (project.skills || '').toString())
    }
  }, [project])

  if (!open) return null

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    if (!title.trim()) return setError('Title required')
    setLoading(true)
    try {
      const body: any = { title: title.trim(), description: description.trim(), deadline: deadline || undefined }
      if (budget !== '') body.budget = { amount: Number(budget || 0), currency: 'USD' }
      if (skills) body.skillsRequired = skills.split(',').map(s => s.trim()).filter(Boolean)
      const res = await fetch(`/api/projects/${project._id}`, { method: 'PUT', headers: headers as any, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to update project')
      const j = await res.json()
      const p = j && (j.data || j.project) ? (j.data || j.project) : j
      onUpdated(p)
    } catch (err: any) { setError(err.message || 'Unknown error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <form onSubmit={submit} className="bg-white dark:bg-gray-900 rounded p-6 w-full max-w-lg text-gray-900 dark:text-white">
        <h3 className="text-lg font-semibold">Edit Project</h3>
        <div className="mt-4 grid gap-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          <div className="grid grid-cols-3 gap-2">
            <input value={budget as any} onChange={e => setBudget(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Budget" className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            <input value={deadline} onChange={e => setDeadline(e.target.value)} type="date" className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="Skills (comma separated)" className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          </div>
          {error && <div className="text-red-600 dark:text-red-400">{error}</div>}
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button type="submit" disabled={loading} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}
