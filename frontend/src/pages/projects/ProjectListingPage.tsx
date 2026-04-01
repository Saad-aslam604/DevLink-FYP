import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../components/UX/ToastProvider'

type Project = any

export default function ProjectListingPage() {
  const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'
  const toast = useToast()
  const [items, setItems] = useState<Project[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [skillFilter, setSkillFilter] = useState('')

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      q.set('page', String(p))
      q.set('limit', '20')
      if (search) q.set('search', search)
      if (skillFilter) q.set('skill', skillFilter)
      const res = await fetch(`${API_BASE}/projects?${q.toString()}`)
      const j = await res.json().catch(()=>null)
      if (res.ok && j && j.data && Array.isArray(j.data.items)) setItems(j.data.items)
      else setItems([])
    } catch (e) { console.warn('load projects failed', e); toast.show && toast.show('Failed to load projects', 'error') }
    finally { setLoading(false) }
  }

  useEffect(()=>{ void load(1) }, [])

  return (
    <div className="p-4 text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold dark:text-white">Projects</h2>
        <div className="flex gap-2 flex-wrap">
          <input placeholder="Search" value={search} onChange={(e)=>setSearch(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400" />
          <input placeholder="Skill" value={skillFilter} onChange={(e)=>setSkillFilter(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400" />
          <button onClick={() => load(1)} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-600">Filter</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? <div className="dark:text-gray-300">Loading…</div> : (
          items.map((p:Project) => (
            <div key={p._id} className="p-4 border rounded bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold dark:text-white">{p.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{p.status}</div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">{p.description}</div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">Budget: {p.budget && p.budget.amount ? `${p.budget.amount} ${p.budget.currency}` : '—'}</div>
                <Link to={`/app/projects/${p._id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">View</Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
