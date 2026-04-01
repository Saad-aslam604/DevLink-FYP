import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import FileGallery from '../../components/FileGallery/FileGallery'
import { useToast } from '../../components/UX/ToastProvider'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'
  const toast = useToast()
  const [project, setProject] = useState<any>(null)
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [marking, setMarking] = useState(false)

  const load = async () => {
    if (!id) return
    try {
      const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(String(id))}`)
      const j = await res.json().catch(()=>null)
      if (res.ok && j && j.data) setProject(j.data)
      else { setProject(null); toast.show && toast.show('Failed to load project', 'error') }
    } catch (e) { console.warn('load project failed', e); toast.show && toast.show('Failed to load project', 'error') }
  }

  useEffect(()=>{ void load() }, [id])

  const apply = async () => {
    if (!id) return
    setApplying(true)
    try {
      const token = localStorage.getItem('devlink_token') || undefined
      const headers:any = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(String(id))}/apply`, { method: 'POST', headers, body: JSON.stringify({ message }) })
      const j = await res.json().catch(()=>null)
      if (!res.ok || !j || !j.success) { toast.show && toast.show((j && j.message) || 'Failed to apply', 'error'); setApplying(false); return }
      toast.show && toast.show('Application submitted', 'success')
      setMessage('')
      await load()
    } catch (e) { console.warn('apply failed', e); toast.show && toast.show('Failed to apply', 'error') }
    finally { setApplying(false) }
  }

  const deleteProject = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this project?')) return
    setDeleting(true)
    try {
      const token = localStorage.getItem('devlink_token') || undefined
      const headers:any = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(String(id))}`, { method: 'DELETE', headers })
      const j = await res.json().catch(()=>null)
      if (!res.ok || !j || !j.success) { toast.show && toast.show((j && j.message) || 'Failed to delete project', 'error'); setDeleting(false); return }
      toast.show && toast.show('Project deleted', 'success')
      navigate('/app/projects')
    } catch (e) { console.warn('delete failed', e); toast.show && toast.show('Failed to delete project', 'error') }
    finally { setDeleting(false) }
  }

  const markAsDone = async () => {
    if (!id) return
    setMarking(true)
    try {
      const token = localStorage.getItem('devlink_token') || undefined
      const headers:any = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const newStatus = project.status === 'completed' ? 'open' : 'completed'
      const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(String(id))}`, { method: 'PUT', headers, body: JSON.stringify({ status: newStatus }) })
      const j = await res.json().catch(()=>null)
      if (!res.ok || !j || !j.success) { toast.show && toast.show((j && j.message) || 'Failed to update project', 'error'); setMarking(false); return }
      toast.show && toast.show(`Project marked as ${newStatus}`, 'success')
      await load()
    } catch (e) { console.warn('mark as done failed', e); toast.show && toast.show('Failed to update project', 'error') }
    finally { setMarking(false) }
  }

  if (!project) return <div className="p-4">Loading…</div>

  return (
    <div className="p-4 max-w-3xl text-gray-900 dark:text-gray-100">
      <h2 className="text-lg font-semibold dark:text-white">{project.title}</h2>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">{project.description}</div>
      <div className="mt-3 flex gap-2 flex-wrap">
        <div className="text-xs text-gray-500 dark:text-gray-400">Budget: {project.budget?.amount ? `${project.budget.amount} ${project.budget.currency}` : '—'}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Status: {project.status}</div>
        {project.deadline && <div className="text-xs text-gray-500 dark:text-gray-400">Deadline: {new Date(project.deadline).toLocaleDateString()}</div>}
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium dark:text-white">Skills required</h3>
        <div className="flex gap-2 mt-2 flex-wrap">{(project.skillsRequired||[]).map((s:string,i:number)=>(<div key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 rounded text-sm">{s}</div>))}</div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium dark:text-white">Attachments</h3>
        <div className="mt-2 space-y-2">
          {(project.attachments || []).map((a:any) => {
            const url = a && a.path ? (String(a.path).startsWith('http') ? String(a.path) : `${(import.meta.env.VITE_API_BASE as string || '/api').replace(/\/api\/?$/, '')}${a.path}`) : ''
            return (
              <div key={String(a._id || a.filename)} className="p-2 border rounded bg-white dark:bg-gray-900 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium truncate max-w-[300px] dark:text-gray-200">{a.originalName || a.filename || String(a._id)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{a.size ? `${(a.size/1024).toFixed(1)} KB` : ''}</div>
                </div>
                <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Download</a>
              </div>
            )
          })}
          {(project.attachments||[]).length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No attachments</div>}
        </div>
      </div>

      {/* Show Apply section only if user is NOT the project creator */}
      {(!project.postedBy || String(project.postedBy._id || project.postedBy) !== String(localStorage.getItem('devlink_user_id'))) && (
        <div className="mt-6">
          <h3 className="text-sm font-medium dark:text-white">Apply</h3>
          <textarea value={message} onChange={(e)=>setMessage(e.target.value)} className="w-full p-2 border rounded h-24 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400" placeholder="Message to the project owner (optional)" />
          <div className="mt-2"><button onClick={apply} disabled={applying} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50">{applying ? 'Applying…' : 'Apply'}</button></div>
        </div>
      )}

      {/* If owner, show applicants and action buttons */}
      {project.postedBy && String(project.postedBy._id || project.postedBy) === String(localStorage.getItem('devlink_user_id')) && (
        <div className="mt-6 space-y-6">
          <div className="flex gap-2">
            <button onClick={markAsDone} disabled={marking} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50">
              {marking ? 'Updating…' : (project.status === 'completed' ? 'Mark as Open' : 'Mark as Done')}
            </button>
            <button onClick={deleteProject} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50">
              {deleting ? 'Deleting…' : 'Delete Project'}
            </button>
          </div>
          
          <div>
            <h3 className="text-sm font-medium dark:text-white">Applicants</h3>
            <div className="mt-2 space-y-2">
              {(project.applicants||[]).map((a:any, i:number) => (
                <div key={i} className="p-2 border rounded dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                  <div className="text-sm font-medium dark:text-gray-200">
                    {typeof a.user === 'string' ? a.user : (a.user && (a.user.firstName || a.user.lastName || a.user.email)) ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim() || a.user.email : 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{a.message}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{a.appliedAt ? new Date(a.appliedAt).toLocaleString() : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
