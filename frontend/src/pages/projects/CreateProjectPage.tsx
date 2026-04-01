import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FileUpload from '../../components/FileUpload/FileUpload'
import { useToast } from '../../components/UX/ToastProvider'

export default function CreateProjectPage() {
  const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'
  const toast = useToast()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [skills, setSkills] = useState<string[]> ([]) 
  const [skillInput, setSkillInput] = useState('')
  const [budget, setBudget] = useState<number | ''>('')
  const [currency, setCurrency] = useState('USD')
  const [deadline, setDeadline] = useState<string>('')
  const [status, setStatus] = useState<'draft'|'open'>('open')
  const [attachments, setAttachments] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const onAddSkill = () => {
    const s = skillInput.trim()
    if (!s) return
    if (!skills.includes(s)) setSkills([...skills, s])
    setSkillInput('')
  }

  const onRemoveSkill = (idx:number) => setSkills(skills.filter((_,i)=>i!==idx))

  const onUploaded = (f:any) => {
    // FileUpload returns uploaded file metadata; collect it
    setAttachments((cur) => [...cur, f])
    try { toast.show('Attachment uploaded', 'success') } catch (e) {}
  }

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) { toast.show && toast.show('Please fill title and description', 'error'); return }
    setSaving(true)
    try {
      const token = localStorage.getItem('devlink_token') || undefined
      const body:any = { title, description, skillsRequired: skills, budget: { amount: Number(budget || 0), currency }, deadline: deadline || undefined, status, attachments: (attachments || []).map(a => a._id || a.id || a.filename) }
      const headers:any = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/projects`, { method: 'POST', headers, body: JSON.stringify(body) })
      const j = await res.json().catch(()=>null)
      if (!res.ok || !j || !j.success) { toast.show && toast.show((j && j.message) || 'Failed to create project', 'error'); setSaving(false); return }
      toast.show && toast.show('Project posted', 'success')
      const id = j.data && (j.data._id || j.data.id)
      if (id) navigate(`/app/projects/${id}`)
    } catch (e) {
      console.warn('create project failed', e)
      toast.show && toast.show('Failed to create project', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-3">Post a Project</h2>
      <div className="space-y-3 max-w-2xl">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full p-2 border rounded h-36" />
        </div>
        <div>
          <label className="block text-sm font-medium">Skills Required</label>
          <div className="flex gap-2 mt-2">
            <input value={skillInput} onChange={(e)=>setSkillInput(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') { e.preventDefault(); onAddSkill() } }} className="p-2 border rounded flex-1" placeholder="Add a skill and press Enter" />
            <button onClick={onAddSkill} className="px-3 py-2 bg-gray-100 rounded">Add</button>
          </div>
          <div className="flex gap-2 flex-wrap mt-2">
            {skills.map((s,i)=> (
              <span key={i} className="px-2 py-1 bg-gray-100 rounded text-sm flex items-center gap-2">{s}<button onClick={()=>onRemoveSkill(i)} className="text-xs">✕</button></span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium">Budget (amount)</label>
            <input type="number" value={String(budget)} onChange={(e)=>setBudget(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded" />
          </div>
          <div style={{width:120}}>
            <label className="block text-sm font-medium">Currency</label>
            <select value={currency} onChange={(e)=>setCurrency(e.target.value)} className="w-full p-2 border rounded">
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Deadline</label>
          <input type="date" value={deadline} onChange={(e)=>setDeadline(e.target.value)} className="p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value as any)} className="p-2 border rounded">
            <option value="open">Open</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Attachments</label>
          <FileUpload multiple={true} onUploaded={onUploaded} />
          <div className="mt-2 flex gap-2 flex-wrap">
            {attachments.map((a,i)=> <div key={i} className="px-2 py-1 bg-gray-100 rounded text-sm">{a.originalName || a.filename || a._id || 'file'}</div>)}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">{saving ? 'Posting...' : 'Post project'}</button>
        </div>
      </div>
    </div>
  )
}
