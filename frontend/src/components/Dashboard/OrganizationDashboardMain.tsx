import React, { useMemo, useState, useEffect } from 'react'
import '../../styles/dashboard.css'
import StatsHeader from './StatsHeader'
import ProjectCard from './ProjectCard'
import AnalyticsCharts from './AnalyticsCharts'
import { FaPlus } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import organizationApi from '../../services/organizationApiService'
import { useNavigate } from 'react-router-dom'
import { EditProjectModal, TaskCreationModal, ResourceAllocationModal, InviteMemberModal } from '../OrganizationModals'
import LoadingSkeletons, { ProjectCardSkeleton, ChartSkeleton } from '../Organization/LoadingSkeletons'
import { CreateProjectModal } from '../OrganizationModals'
import DashboardDebug from '../Debug/DashboardDebug'

type Project = {
  _id: string
  title: string
  description?: string
  budget?: number
  status?: string
  progress?: number
  type?: string
}

const sampleProjects: Project[] = [
  { _id: '1', title: 'Website Redesign', description: 'Rebuild the marketing site', budget: 12000, status: 'In Progress', progress: 42, type: 'dev' },
  { _id: '2', title: 'Analytics Pipeline', description: 'ETL for product metrics', budget: 34000, status: 'Open', progress: 12, type: 'data' },
  { _id: '3', title: 'Mobile App', description: 'iOS + Android app', budget: 54000, status: 'In Progress', progress: 68, type: 'dev' },
  { _id: '4', title: 'Docs Migration', description: 'Move docs to new platform', budget: 4000, status: 'Closed', progress: 100, type: 'docs' },
]

export default function OrganizationDashboardMain() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'projects'|'tasks'|'resources'|'team'|'analytics'>('projects')
  const [showDebug, setShowDebug] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editProject, setEditProject] = useState<any | null>(null)
  const [taskOpen, setTaskOpen] = useState(false)
  const [taskProject, setTaskProject] = useState<any | null>(null)
  const [allocateOpen, setAllocateOpen] = useState(false)
  const [allocateProject, setAllocateProject] = useState<any | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [apiError, setApiError] = useState<any | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        // organization endpoints are scoped to the authenticated user; service will call them directly
        const data = await organizationApi.getBasicOrganizationData()
        if (!mounted) return
        setProjects(Array.isArray(data.projects) ? data.projects : (data.projects || []))
        setTasks(Array.isArray(data.tasks) ? data.tasks : (data.tasks || []))
        setMembers(Array.isArray(data.team) ? data.team : (data.team || []))
        setResources(Array.isArray(data.resources) ? data.resources : (data.resources || []))
        setAnalytics(data.analytics || null)
        setApiError(null)
      } catch (e) {
        console.warn('Failed to load organization data', e)
        setApiError(e)
        // fallback to sample
        setProjects(sampleProjects)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [user])

  // Derive totals, treating 'members' as active members only and handling budget object shape
  const totals = useMemo(() => {
    // count only members with explicit 'active' status
    const activeMembersCount = Array.isArray(members) ? members.filter((m:any) => (m && m.status) ? String(m.status).toLowerCase() === 'active' : false).length : 0
    const budgetTotal = (projects || []).reduce((s, p) => {
      try {
        if (!p) return s
        const pb: any = (p as any).budget
        if (typeof pb === 'number') return s + pb
        if (pb && (pb.amount !== undefined)) return s + Number(pb.amount || 0)
      } catch (e) {}
      return s
    }, 0)
    return { projects: (projects || []).length, activeTasks: (tasks || []).length || 0, members: activeMembersCount, budget: budgetTotal }
  }, [projects, tasks, members])
  // filter panel state
  const [filterOpen, setFilterOpen] = useState(false)
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? localStorage.getItem('devlink_token') : null
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }

  // Periodically refresh organization data to pick up status changes (invites accepted elsewhere)
  useEffect(() => {
    let mounted = true
    let intervalId: any = null
    if (user && (user.userType || '').toLowerCase() === 'organization') {
      intervalId = setInterval(async () => {
        try {
          const d = await organizationApi.getBasicOrganizationData()
          if (!mounted) return
          setProjects(Array.isArray(d.projects) ? d.projects : (d.projects || []))
          setTasks(Array.isArray(d.tasks) ? d.tasks : (d.tasks || []))
          setMembers(Array.isArray(d.team) ? d.team : (d.team || []))
          setResources(Array.isArray(d.resources) ? d.resources : (d.resources || []))
        } catch (e) {
          // ignore transient errors
        }
      }, 10000)
    }
    return () => { mounted = false; if (intervalId) clearInterval(intervalId) }
  }, [user])

  // Listen for organization-wide events (invite accepted, task updates) and refresh/update local state
  useEffect(() => {
    function onInviteAccepted(e: any) {
      // reload team quickly
      organizationApi.getBasicOrganizationData().then(d => { setMembers(Array.isArray(d.team)?d.team:[]); setProjects(Array.isArray(d.projects)?d.projects:d.projects||projects) }).catch(() => {})
    }
    function onTaskUpdated(e: any) {
      try {
        const payload = e && e.detail ? e.detail : null
        if (!payload || !payload._id) return
        setTasks(prev => prev.map(t => (String(t._id) === String(payload._id) ? payload : t)))
      } catch (err) {}
    }
    window.addEventListener('org-invite-accepted', onInviteAccepted)
    window.addEventListener('org-task-updated', onTaskUpdated)
    return () => { window.removeEventListener('org-invite-accepted', onInviteAccepted); window.removeEventListener('org-task-updated', onTaskUpdated) }
  }, [projects, tasks, members])

  return (
    <div className="org-dashboard-root text-gray-900 dark:text-gray-100">
  <StatsHeader name={(user && ((user.organizationDetails && user.organizationDetails.name) || user.name)) || 'Your Organization'} totals={{ projects: totals.projects, activeTasks: totals.activeTasks, members: totals.members }} onTabChange={(t) => setActiveTab(t)} activeTab={activeTab} onFilterClick={() => setFilterOpen(s => !s)} />

      <div className="container mx-auto py-6">
        {filterOpen && (
          <div className="mb-4 p-4 rounded bg-white dark:bg-gray-800 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Filters</label>
                <select className="p-2 border rounded text-sm" onChange={e => { /* apply basic filter: status */ const v = e.target.value; if (!v) { organizationApi.getBasicOrganizationData().then(d => { setProjects(Array.isArray(d.projects)?d.projects:[]); setTasks(Array.isArray(d.tasks)?d.tasks:[]); }).catch(()=>{}) } else { setTasks(prev => prev.filter((t:any) => (t.status||'').toLowerCase() === v)) } }}>
                  <option value="">All statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <button onClick={() => setFilterOpen(false)} className="px-3 py-1 border rounded text-sm">Close</button>
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <>
            <ChartSkeleton />
            <div className="mt-4"><LoadingSkeletons /></div>
          </>
        ) : (
          <>
            {activeTab === 'analytics' ? (
              analytics ? <AnalyticsCharts projects={projects} /> : <AnalyticsCharts projects={projects} />
            ) : null}

            {activeTab === 'projects' && (
              <section>
                {projects.length === 0 ? (
                  <div className="text-sm text-gray-500">No projects yet.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {projects.map(p => (
                          <ProjectCard
                            key={(p && (p._id || (p as any).id)) || p.title || Math.random()}
                            project={p}
                            onView={(proj) => { if (proj && (proj._id || proj.id)) navigate(`/app/projects/${proj._id || proj.id}`) }}
                            onEdit={(proj) => { setEditProject(proj); setEditOpen(true) }}
                            onDelete={async (proj) => {
                              try {
                                const ok = window.confirm(`Delete project "${proj.title || proj._id}"? This cannot be undone.`)
                                if (!ok) return
                                const token = localStorage.getItem('devlink_token')
                                const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
                                const res = await fetch(`/api/projects/${proj._id || proj.id}`, { method: 'DELETE', headers })
                                if (!res.ok) {
                                  const j = await res.json().catch(() => ({}))
                                  throw new Error((j && j.message) ? j.message : 'Failed to delete')
                                }
                                setProjects(prev => prev.filter(x => String(x._id || (x as any).id) !== String(proj._id || (proj as any).id)))
                              } catch (err: any) {
                                console.warn('Delete failed', err)
                                alert(err && err.message ? err.message : 'Delete failed')
                              }
                            }}
                            onCreateTask={(proj) => { setTaskProject(proj); setTaskOpen(true) }}
                            onAllocate={(proj) => { setAllocateProject(proj); setAllocateOpen(true) }}
                          />
                        ))}
                  </div>
                )}

                <button className="fab" title="Create New Project" onClick={() => setCreateOpen(true)}>
                  <FaPlus />
                </button>
                <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(p:any) => { setProjects(prev => [p, ...prev]); setCreateOpen(false) }} orgId={localStorage.getItem('devlink_user_id')} headers={{ 'Content-Type': 'application/json', ...(localStorage.getItem('devlink_token') ? { Authorization: `Bearer ${localStorage.getItem('devlink_token')}` } : {}) }} />
              </section>
            )}

            <div className="fixed left-4 bottom-24">
              <button onClick={() => setShowDebug(s => !s)} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">{showDebug ? 'Hide' : 'Show'} Debug</button>
            </div>

            {activeTab === 'tasks' && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Tasks</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTaskOpen(true)} className="px-3 py-1 bg-yellow-600 text-white rounded">+ Create Task</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {['To Do','In Progress','Review','Done'].map(col => (
                    <div key={col} className="kanban-col p-3 rounded bg-white dark:bg-gray-800 border">
                      <div className="font-semibold mb-2">{col}</div>
                      <div className="space-y-2">
                        {/* smarter grouping: map task.status synonyms to columns */}
                        {tasks.filter((t:any) => {
                          const st = String((t && (t.status || t.state || 'todo')) || 'todo').toLowerCase()
                          if (col === 'To Do') return ['todo','open','new','draft'].includes(st)
                          if (col === 'In Progress') return ['in-progress','inprogress','doing','started'].includes(st)
                          if (col === 'Review') return ['review','qa','awaiting-review'].includes(st)
                          if (col === 'Done') return ['done','completed','closed'].includes(st)
                          return false
                        }).slice(0,5).map((t:any) => (
                          <div key={t._id || t.id} className="task-card p-2 rounded bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                            <div>{t.title || 'Task'} • <span className="text-xs text-gray-500">{t.priority || 'Medium'}</span></div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => { /* view */ setTaskProject(t.project || null); setTaskOpen(true) }} className="text-sm px-2 py-1 border rounded">View</button>
                              <button onClick={async () => {
                                // attempt to delete task if endpoint exists, otherwise remove locally
                                try {
                                  const token = localStorage.getItem('devlink_token')
                                  const h = { 'Content-Type': 'application/json', ...(token? { Authorization: `Bearer ${token}` } : {}) }
                                  const res = await fetch(`/api/tasks/${t._id}`, { method: 'DELETE', headers: h })
                                  if (res.ok) { setTasks(prev => prev.filter(x => String(x._id) !== String(t._id))) }
                                  else { /* no delete endpoint: just remove locally */ setTasks(prev => prev.filter(x => String(x._id) !== String(t._id))) }
                                } catch (e) { setTasks(prev => prev.filter(x => String(x._id) !== String(t._id))) }
                              }} className="text-sm px-2 py-1 bg-red-600 text-white rounded">Remove</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Resources</h3>
                  <div>
                    <button onClick={() => setAllocateOpen(true)} className="px-3 py-1 bg-purple-600 text-white rounded">+ Add Resource</button>
                  </div>
                </div>

                {resources.length === 0 ? <div className="text-sm text-gray-500">No resources allocated.</div> : resources.map((r:any) => (
                  <div key={r._id || r.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.name} <span className="text-xs text-gray-500">({r.type})</span></div>
                      <div className="text-sm text-gray-500">Quantity: {r.quantity} • Cost: {r.cost || 0}</div>
                    </div>
                    <div>
                      <button onClick={async () => {
                        try {
                          const id = r._id || r.id
                          if (!id) return
                          const token = localStorage.getItem('devlink_token')
                          const h = { 'Content-Type': 'application/json', ...(token? { Authorization: `Bearer ${token}` } : {}) }
                          const res = await fetch(`/api/organization/resources/${id}`, { method: 'DELETE', headers: h })
                          if (res.ok) setResources(prev => prev.filter(x => String(x._id || (x as any).id) !== String(id)))
                          else { const txt = await res.text().catch(()=>''); console.warn('Failed to delete resource', res.status, txt); alert('Failed to delete resource') }
                        } catch (e) { console.warn('Delete resource error', e); alert('Delete failed') }
                      }} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'team' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Team Members</h3>
                  <div>
                    <button onClick={() => setInviteOpen(true)} className="px-3 py-1 bg-indigo-600 text-white rounded">+ Invite Team Member</button>
                  </div>
                </div>

                {/* Active members list */}
                {(!members || !members.some((m:any) => String(m.status).toLowerCase() === 'active')) ? (
                  <div className="text-sm text-gray-500">No active team members yet.</div>
                ) : (
                  members.filter((m:any) => String(m.status).toLowerCase() === 'active').map((m:any) => {
                    const userObj = m.user || m.userId || m.assignee || m
                    const name = (userObj && ((userObj.firstName && userObj.lastName) ? `${userObj.firstName} ${userObj.lastName}` : (userObj.name || `${userObj.firstName || ''} ${userObj.lastName || ''}`))) || m.name || m.email || 'Member'
                    const email = userObj && (userObj.email || userObj.emails) || m.email
                    const role = m.role || (userObj && userObj.role) || 'Member'
                    return (
                      <div key={m._id || m.id || (userObj && (userObj._id || userObj.id)) || name} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{name}</div>
                          <div className="text-sm text-gray-500">{email}</div>
                          <div className="text-xs text-gray-400">Status: {m.status || 'active'}{m.joinedAt ? ` • Joined: ${new Date(m.joinedAt).toLocaleDateString()}` : ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-500">{role}</div>
                          <button onClick={async () => {
                            try {
                              const id = m._id || (m as any).id
                              if (!id) return
                              const token = localStorage.getItem('devlink_token')
                              const h = { 'Content-Type': 'application/json', ...(token? { Authorization: `Bearer ${token}` } : {}) }
                              const res = await fetch(`/api/organization/team/${id}`, { method: 'DELETE', headers: h })
                              if (res.ok) setMembers(prev => prev.filter(x => String(x._id || (x as any).id) !== String(id)))
                              else { const txt = await res.text().catch(()=>''); console.warn('Failed to remove member', res.status, txt); alert('Failed to remove member') }
                            } catch (e) { console.warn('Remove member error', e); alert('Remove failed') }
                          }} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Remove</button>
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Pending invitations */}
                {members && members.some((m:any) => String(m.status).toLowerCase() === 'invited' || m.invitedAt) && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold">Pending Invitations</h4>
                    <div className="space-y-2 mt-2">
                      {members.filter((m:any) => String(m.status).toLowerCase() === 'invited').map((inv:any) => (
                        <div key={(inv && (inv._id || (inv as any).id)) || inv.email} className="p-2 rounded bg-yellow-50 dark:bg-yellow-900 flex items-center justify-between">
                          <div>
                            <div className="text-sm">{inv.email || (inv.user && inv.user.email) || '—'}</div>
                            <div className="text-xs text-gray-500">Invited: {inv.invitedAt ? new Date(inv.invitedAt).toLocaleString() : 'Just now'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={async () => {
                              try {
                                // support multiple id shapes
                                const id = inv._id || (inv as any).id || (inv as any).invitationId || (inv as any).inviteId
                                if (!id) return
                                const token = localStorage.getItem('devlink_token')
                                const h = { 'Content-Type': 'application/json', ...(token? { Authorization: `Bearer ${token}` } : {}) }

                                // try the most common cancel endpoint first, then fallback to DELETE invitation resource
                                let res = await fetch(`/api/organization/invitations/${id}/cancel`, { method: 'POST', headers: h })
                                if (!res.ok) {
                                  // fallback: some servers implement DELETE /invitations/:id
                                  try {
                                    res = await fetch(`/api/organization/invitations/${id}`, { method: 'DELETE', headers: h })
                                  } catch (err) {
                                    // keep original response if fallback failed to reach
                                  }
                                }

                                if (res && res.ok) {
                                  setMembers(prev => prev.filter(x => String(x._id || (x as any).id || (x as any).invitationId || (x as any).inviteId) !== String(id)))
                                } else {
                                  // parse helpful server message if available
                                  let msg = 'Failed to cancel invite'
                                  try {
                                    const j = await (res && res.json ? res.json() : Promise.reject())
                                    if (j) {
                                      if (typeof j === 'string') msg = j
                                      else if (j.message) msg = j.message
                                      else if (j.error) msg = j.error
                                    }
                                  } catch (_) {
                                    try { const t = await (res && res.text ? res.text() : Promise.resolve('')); if (t) msg = t } catch (_) {}
                                  }
                                  console.warn('Failed to cancel invite', res && res.status, msg)
                                  alert(msg)
                                }
                              } catch (e) { console.warn('Cancel invite error', e); const em: any = e; alert((em && (em.message || String(em))) || 'Cancel failed') }
                            }} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Cancel</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {showDebug && (
              <div className="mt-4">
                <DashboardDebug data={{ projects, tasks, members, resources, analytics }} errors={apiError} />
              </div>
            )}
            {/* Modals for edit, tasks, allocation, invites */}
            <EditProjectModal open={editOpen} onClose={() => { setEditOpen(false); setEditProject(null) }} project={editProject} onUpdated={(p:any) => { setProjects(prev => prev.map(x => (String(x._id || (x as any).id) === String(p._id || (p as any).id) ? p : x))); setEditOpen(false); setEditProject(null) }} headers={headers} />
            <TaskCreationModal open={taskOpen} onClose={() => { setTaskOpen(false); setTaskProject(null) }} onCreated={async (projectId:string, t:any) => { /* reload tasks from API for consistency */ await organizationApi.getBasicOrganizationData().then(d => { setTasks(Array.isArray(d.tasks)?d.tasks:[]); setProjects(Array.isArray(d.projects)?d.projects:d.projects||projects) }).catch(() => {}); setTaskOpen(false); setTaskProject(null) }} projects={projects} members={members} headers={headers} />
            <ResourceAllocationModal open={allocateOpen} onClose={() => { setAllocateOpen(false); setAllocateProject(null) }} onCreated={(r:any) => { setResources(prev => [r, ...prev]); setAllocateOpen(false); setAllocateProject(null) }} projects={projects} headers={headers} />
            <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={(m:any) => setMembers(prev => [m, ...prev])} headers={headers} />
          </>
        )}
      </div>
    </div>
  )
}
