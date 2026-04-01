import React, { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (projectId: string, task: any) => void
  projects: any[]
  members: any[]
  headers?: Record<string,string>
}

export default function TaskCreationModal({ open, onClose, onCreated, projects, members, headers }: Props) {
  const [projectId, setProjectId] = useState(projects && projects[0] ? (projects[0]._id || projects[0].id) : '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  // Diagnostics: log initial state and available members
  console.log('🔍 TaskCreationModal loaded')
  console.log('🔍 Available members:', members)
  console.log('🔍 Initial assignedTo state:', assignedTo)

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    if (!title.trim() || !projectId) return setError('Title and project are required')
    // Require assignment to at least one user
    if (!assignedTo || String(assignedTo).trim() === '') {
      return setError('Please assign task to at least one user')
    }
    setLoading(true)
    try {
      // Diagnostic logging before submit
      console.log('📤 SUBMITTING FORM DATA:', { title: title.trim(), description: description.trim(), assignedTo, deadline, priority })
      console.log('👤 assignedTo value:', assignedTo)
      console.log('👤 assignedTo type:', typeof assignedTo)

      // Backend expects assignedTo as an array of ids — convert single selection to array
      const submitAssignedTo = assignedTo ? [assignedTo] : []
      const body = { title: title.trim(), description: description.trim(), assignedTo: submitAssignedTo, deadline: deadline || undefined, priority }
      console.log('📦 Final submit data:', body)
      const res = await fetch(`/api/organization/projects/${projectId}/tasks`, { method: 'POST', headers: headers as any, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to create task')
      const j = await res.json()
      const task = j && (j.data || j.task) ? (j.data || j.task) : j
      onCreated(projectId, task)
    } catch (err: any) { setError(err.message || 'Unknown error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Task</h3>
        <div className="mt-4 grid gap-2">
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
            <option value="">Select project</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
            <option value="">Unassigned</option>
            {members.map(m => <option key={m._id} value={m.user?._id || m._id}>{m.user ? `${m.user.firstName || ''} ${m.user.lastName || ''}` : (m.name || m.email)}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
            <select value={priority} onChange={e => setPriority(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          {error && <div className="text-red-600 dark:text-red-400">{error}</div>}
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
          <button type="submit" disabled={loading} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded">{loading ? 'Creating...' : 'Create'}</button>
        </div>
      </form>
    </div>
  )
}
