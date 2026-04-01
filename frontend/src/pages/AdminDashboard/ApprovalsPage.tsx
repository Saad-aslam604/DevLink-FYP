import React, { useEffect, useMemo, useState, useCallback } from 'react'
import AdminLayout from './AdminLayout'
import PageHeader from '../../components/AdminDashboard/PageHeader'
import FilterBar from '../../components/AdminDashboard/FilterBar'
import api from '../../services/mentorApplicationsApi'
import ApplicationCard from '../../components/AdminApprovals/ApplicationCard'
import FiltersPanel from '../../components/AdminApprovals/CompactFiltersPanel'
import StatisticsPanel from '../../components/AdminApprovals/StatisticsPanel'
import AIAssistantPanel from '../../components/AdminApprovals/AIAssistantPanel'
import BulkActionsPanel from '../../components/AdminApprovals/BulkActionsPanel'
import { ApproveModal, RejectModal, ToastNotification, InviteModal } from '../../components/AdminApprovals/modals'
import CardSkeleton from '../../components/UI/LoadingSkeleton'
import CenteredEmptyState from '../../components/AdminApprovals/CenteredEmptyState'

type ToastItem = { id: string; message: string; type: 'success'|'error'|'info'|'warning' }

const POLL_INTERVAL = 30000

const computeRecommendation = (application: any) => {
  // --- STEP 1: NORMALIZE APPLICATION FIELDS ---
  const experienceYears =
    application.yearsOfExperience ??
    application.experience ??
    application.experienceYears ??
    application.user?.yearsOfExperience ??
    application.user?.profile?.experienceYears ??
    application.profile?.experienceYears ??
    application.meta?.experience ??
    0;

  const skills =
    application.skills ??
    application.technologies ??
    application.expertise ??
    application.user?.skills ??
    application.user?.profile?.technologies ??
    application.profile?.technologies ??
    [];

  const requestedRate =
    application.requestedRate ??
    application.hourlyRate ??
    application.rate ??
    application.user?.hourlyRate ??
    application.profile?.requestedRate ??
    0;

  const profileComplete = Boolean(
    (application.title || application.user?.title || application.profile?.title) &&
    (application.bio || application.user?.bio || application.profile?.bio)
  );

  // --- STEP 2: COMPUTE SCORE USING NORMALIZED FIELDS ---
  // Make scoring easier to reach >=50 for applicants with 1 year + multiple skills.
  // New weights:
  // - experienceYears: 18 points per year (1 year -> 18)
  // - skills: 12 points per skill (2 skills -> 24)
  // - requestedRate: cheaper rates are rewarded (<=50 -> +20, otherwise +5)
  // - profileComplete: +10
  const score = Math.min(
    100,
    experienceYears * 18 +
    (Array.isArray(skills) ? skills.length : 0) * 12 +
    (requestedRate <= 50 ? 20 : 5) +
    (profileComplete ? 10 : 0)
  );

  const rounded = Math.round(score);

  // --- STEP 3: ASSIGN RECOMMENDATION ACCORDING TO EXISTING RULES ---
  // New thresholds: >80 auto-approve, <30 auto-reject, otherwise recommend review
  let recommendation: 'approve' | 'review' | 'reject';
  if (rounded > 80) recommendation = 'approve'
  else if (rounded < 30) recommendation = 'reject'
  else recommendation = 'review'

  // Detailed debug: log normalized inputs so we can see why scores are low
  try {
    console.debug(`AI Norm - app ${application._id || application.id}`, {
      experienceYears,
      skillsCount: Array.isArray(skills) ? skills.length : 0,
      requestedRate,
      profileComplete,
      score: rounded,
      recommendation,
    })
  } catch (e) { /* ignore debug errors */ }

  return { score: rounded, recommendation };
}

const buildAiRecommendation = (application: any, avgRequestedRate: number|null) => {
  // Use the same normalization logic as computeRecommendation so reasons match score
  const experienceYears =
    application.yearsOfExperience ??
    application.experience ??
    application.experienceYears ??
    application.user?.yearsOfExperience ??
    application.user?.profile?.experienceYears ??
    application.profile?.experienceYears ??
    application.meta?.experience ??
    0;

  const skills =
    application.skills ??
    application.technologies ??
    application.expertise ??
    application.user?.skills ??
    application.user?.profile?.technologies ??
    application.profile?.technologies ??
    [];

  const requestedRate =
    application.requestedRate ??
    application.hourlyRate ??
    application.rate ??
    application.user?.hourlyRate ??
    application.profile?.requestedRate ??
    application.meta?.requestedRate ??
    0;

  const profileComplete = Boolean(
    (application.title || application.user?.title || application.profile?.title) &&
    (application.bio || application.user?.bio || application.profile?.bio)
  );

  const base = computeRecommendation(application)
  const reasons: string[] = []
    if (experienceYears > 0) reasons.push(`experience: ${experienceYears}`)
    if (Array.isArray(skills) && skills.length > 0) reasons.push(`skills: ${skills.length}`)
    if (!Number.isNaN(Number(requestedRate))) {
      reasons.push(`requestedRate: $${requestedRate}`)
      if (avgRequestedRate !== null && requestedRate <= avgRequestedRate) reasons.push('competitive rate')
    }
    if (profileComplete) reasons.push('profile complete')
    // Apply same thresholds as computeRecommendation: >80 auto-approve, <30 auto-reject, otherwise review
    const recommendation = base.recommendation
    const autoAction: 'approve' | 'reject' | null = base.score > 80 ? 'approve' : base.score < 30 ? 'reject' : null
    return { score: base.score, recommendation, reasons, autoAction }

  const reason = reasons.length ? reasons.join(', ') : (base.recommendation === 'approve' ? 'high score' : (base.recommendation === 'reject' ? 'low score' : 'needs review'))
  return { score: base.score, recommendation: base.recommendation, reason }
}

const ApprovalsPage: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [filters, setFilters] = useState<any>({ status: '', search: '', minScore: 0, maxScore: 100, sortBy: 'submittedAt' })
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // avoid calling admin endpoints if no admin token present
      const adminToken = typeof window !== 'undefined' ? (localStorage.getItem('devlink_admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('ADMIN_TOKEN')) : null
      if (!adminToken) {
        setApplications([])
        setStats(null)
        setLoading(false)
        return
      }
      const q: any = {}
      if (filters.status) q.status = filters.status
      if (filters.search) q.search = filters.search
      if (filters.minScore) q.minScore = filters.minScore
      if (filters.sortBy) q.sortBy = filters.sortBy
      const res = await api.fetchApplications(q)
      const st = await api.fetchStats()
      if (st && st.success) setStats(st.data)
      const avgRequestedRate = (st && st.success && st.data && st.data.avgRequestedRate) ? st.data.avgRequestedRate : null

      if (res && res.success) {
        const raw = (res.data || [])
        // normalize status and attach aiRecommendation
        const appsWithAi = raw.map((a: any) => {
          const status = a.status || 'pending'
          const app = { ...a, status }
          const aiRec = buildAiRecommendation(app, avgRequestedRate)
          return { ...app, aiRecommendation: aiRec }
        })

        const pendingApps = appsWithAi.filter((x:any) => (x.status || 'pending') === 'pending')

        // Debug logs required
        try {
          const pendingCount = appsWithAi.filter((x:any)=> (x.status||'pending') === 'pending').length
          const aiApproved = appsWithAi.filter((x:any)=> x.aiRecommendation && x.aiRecommendation.recommendation === 'approve').length
          console.debug('AI Debug - pendingCount', pendingCount, 'aiApproved', aiApproved)
          appsWithAi.forEach((x:any)=> console.debug('AI Debug - app', x._id, x.aiRecommendation))
        } catch(e){}

        setApplications(appsWithAi)
      } else setApplications([])
    } catch (err) {
      console.error('Load applications error', err)
      window.alert('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
    const iv = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(iv)
  }, [load])

  const onSelect = (id: string, checked: boolean) => {
    setSelected(s => ({ ...s, [id]: checked }))
  }

  const selectedIds = useMemo(() => Object.keys(selected).filter(k => selected[k]), [selected])
  // Only consider pending applications for bulk actions
  const selectedPendingIds = useMemo(() => selectedIds.filter(id => {
    const app = applications.find(a => (a._id || a._id) === id)
    return app && app.status === 'pending'
  }), [selectedIds, applications])

  // Modal state
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<any | null>(null)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const pushToast = (message: string, type: ToastItem['type']='info') => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2,6)
    setToasts(t => [...t, { id, message, type }])
  }
  const removeToast = (id: string) => setToasts(t => t.filter(x => x.id !== id))

  const openApproveModalFor = (app: any) => { setSelectedApp(app); setApproveModalOpen(true) }
  const openRejectModalFor = (app: any) => { setSelectedApp(app); setRejectModalOpen(true) }

  const handleApprove = async (id: string) => {
    // open modal
    const app = applications.find(a => (a._id || a._id) === id)
    openApproveModalFor(app)
  }

  const handleReject = async (id: string) => {
    const app = applications.find(a => (a._id || a._id) === id)
    openRejectModalFor(app)
  }

  const calculateSuggestedRate = (app: any) => {
    const baseRate = 50
    const experienceBonus = Math.min(Number(app?.yearsOfExperience || 0) * 15, 150)
    const skillsBonus = Math.min((app?.skills?.length || 0) * 5, 50)
    return Math.min(baseRate + experienceBonus + skillsBonus, 500)
  }

  const handleModalApprove = async (approvedRate: number, notes: string) => {
    if (!selectedApp) return
    try {
      // Optimistic UI update: mark application as approved locally (backup to rollback on failure)
      const backup = selectedApp
      const appId = backup._id || backup._id
      setApplications(prev => prev.map(a => ((a._id || a._id) === appId) ? { ...a, status: 'approved', approvedRate } : a))
      // remove from selection map
      setSelected(s => { const copy = { ...s }; delete copy[appId]; return copy })
  // send optional admin notes as well
  // log admin token presence for debugging
  try { console.debug('Approving', { id: backup._id, approvedRate, hasAdminToken: !!(localStorage.getItem('devlink_admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('ADMIN_TOKEN')) }) } catch(e){}
      const res = await api.approveApplication(backup._id || backup._id, approvedRate, notes)
      // update local record with any response data
      if (res && res.success && res.data && res.data.approvedRate !== undefined) {
        setApplications(prev => prev.map(a => ((a._id || a._id) === (backup._id || backup._id)) ? { ...a, approvedRate: res.data.approvedRate } : a))
      }
      pushToast('Application approved successfully', 'success')
      setApproveModalOpen(false)
      setSelectedApp(null)
      // update stats locally by refetching in background
      load()
    } catch (e: any) {
      // Restore optimistic change
      try { setApplications(prev => { const copy = [...prev]; const idx = copy.findIndex(a => (a._id || a._id) === (selectedApp?._id || selectedApp?._id)); if (idx >= 0) copy[idx] = selectedApp as any; return copy }) } catch(err){/* ignore */}
      console.error('Approve error', e)
      // If it's an HTTP error from our client, try to extract a useful message
      try {
        const anyErr = e as any
        let msg = 'Failed to approve application'
        if (anyErr && anyErr.body && typeof anyErr.body === 'object' && anyErr.body.message) msg = anyErr.body.message
        else if (anyErr && anyErr.message) msg = anyErr.message
        console.error('Approve failed details:', anyErr)
        pushToast(msg, 'error')
      } catch(err) {
        pushToast('Failed to approve application', 'error')
      }
    }
  }

  const handleModalReject = async (rejectionReason: string, notes: string) => {
    if (!selectedApp) return
    try {
      await api.rejectApplication(selectedApp._id || selectedApp._id, rejectionReason)
      pushToast('Application rejected', 'success')
      setRejectModalOpen(false)
      setSelectedApp(null)
      load()
    } catch (e) {
      console.error(e)
      pushToast('Failed to reject application', 'error')
    }
  }

  const handleBulkApprove = async () => {
    if (!selectedPendingIds.length) return window.alert('No pending selected')
    const confirmMsg = `Approve ${selectedPendingIds.length} applications?`
    if (!window.confirm(confirmMsg)) return
    try {
      const res = await api.bulkAction('approve', selectedPendingIds)
      if (res && res.success) {
        window.alert('Bulk approve completed')
        // update local state: mark those as approved
        setApplications(prev => prev.map(a => (selectedPendingIds.includes(a._id || a._id)) ? { ...a, status: 'approved' } : a))
        // clear only those selections
        setSelected(s => { const copy = { ...s }; selectedPendingIds.forEach(id => delete copy[id]); return copy })
        load()
      } else window.alert('Bulk approve failed')
    } catch (e) { window.alert('Bulk approve error'); console.error(e) }
  }

  const handleBulkReject = async () => {
    if (!selectedPendingIds.length) return window.alert('No pending selected')
    const reason = window.prompt('Common rejection reason for selected', '')
    if (reason === null) return
    try {
      const res = await api.bulkAction('reject', selectedPendingIds, { rejectionReason: reason })
      if (res && res.success) {
        window.alert('Bulk reject completed')
        setApplications(prev => prev.map(a => (selectedPendingIds.includes(a._id || a._id)) ? { ...a, status: 'rejected', rejectionReason: reason } : a))
        setSelected(s => { const copy = { ...s }; selectedPendingIds.forEach(id => delete copy[id]); return copy })
        load()
      } else window.alert('Bulk reject failed')
    } catch (e) { window.alert('Bulk reject error'); console.error(e) }
  }

  const handleApproveAllAI = async () => {
    // compute ai recommendations and approve those (use attached aiRecommendation and only pending apps)
    const toApprove = applications.filter(a => (a.status || 'pending') === 'pending' && a.aiRecommendation && a.aiRecommendation.recommendation === 'approve').map(a => a._id || a._id)
    if (!toApprove.length) return window.alert('No AI-recommended approvals')
    if (!window.confirm(`Approve ${toApprove.length} AI-recommended applications?`)) return
    try {
      const res = await api.bulkAction('approve', toApprove)
      if (res && res.success) { window.alert('Approved AI recommendations'); load() }
      else window.alert('AI bulk approve failed')
    } catch (e) { window.alert('AI bulk approve error'); console.error(e) }
  }

  const aiSummary = useMemo(() => {
    const pendingApps = applications.filter(a => (a.status || 'pending') === 'pending')
    const recs = pendingApps.map(a => (a.aiRecommendation || computeRecommendation(a)))
    const approveCount = recs.filter(r => r.recommendation === 'approve').length
    const reviewCount = recs.filter(r => r.recommendation === 'review').length
    const rejectCount = recs.filter(r => r.recommendation === 'reject').length
    const pendingCount = pendingApps.length
    const confidence = pendingCount > 0 ? Math.round((approveCount / pendingCount) * 100) : 0
    // auto action counts: apps that the AI would automatically apply
    const autoApproveCount = pendingApps.filter(a => a.aiRecommendation && a.aiRecommendation.autoAction === 'approve').length
    const autoRejectCount = pendingApps.filter(a => a.aiRecommendation && a.aiRecommendation.autoAction === 'reject').length
    return { approveCount, reviewCount, rejectCount, pendingCount, confidence, autoApproveCount, autoRejectCount }
  }, [applications])

  const handleApplyAIDecisions = async () => {
    // Collect IDs for auto-approve and auto-reject among pending apps
    const pendingApps = applications.filter(a => (a.status || 'pending') === 'pending')
    const toAutoApprove = pendingApps.filter(a => a.aiRecommendation && a.aiRecommendation.autoAction === 'approve').map(a => a._id || a._id)
    const toAutoReject = pendingApps.filter(a => a.aiRecommendation && a.aiRecommendation.autoAction === 'reject').map(a => a._id || a._id)
    if (!toAutoApprove.length && !toAutoReject.length) return window.alert('No auto actions available')
    if (!window.confirm(`Apply AI decisions? Approve ${toAutoApprove.length}, Reject ${toAutoReject.length}`)) return
    try {
      if (toAutoApprove.length) await api.bulkAction('approve', toAutoApprove)
      if (toAutoReject.length) await api.bulkAction('reject', toAutoReject, { rejectionReason: 'Auto-rejected by AI' })
      pushToast(`Applied AI decisions: approved ${toAutoApprove.length}, rejected ${toAutoReject.length}`, 'success')
      // refresh
      load()
    } catch (e) {
      console.error('Apply AI decisions error', e)
      pushToast('Failed to apply AI decisions', 'error')
    }
  }

  const handleExport = async () => {
    try {
      const csv = await api.exportApplicationsCsv({ status: filters.status })
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mentor-applications-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { window.alert('Export failed'); console.error(e) }
  }

  const handleClearSelection = () => {
    // clear selected map
    setSelected({})
    // remove processed (approved/rejected) items from the visible list
    setApplications(prev => prev.filter(a => (a.status || 'pending') === 'pending'))
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  <div className="container mx-auto px-4 py-4">
  <PageHeader title="Mentor Applications" subtitle="Review pending applications and manage approvals" total={applications.length} onExport={handleExport} onInvite={()=>{ setInviteModalOpen(true) }} />
  <FilterBar filters={filters} setFilters={setFilters} onRefresh={load} viewMode={'grid'} setViewMode={(v)=>{ /* placeholder */ }} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <FiltersPanel filters={filters} onChange={setFilters} />
            <div className="mt-4">
              <StatisticsPanel stats={stats} />
            </div>
            <div className="mt-4">
              {selectedPendingIds.length > 0 ? (
                <BulkActionsPanel selectedCount={selectedPendingIds.length} onBulkApprove={handleBulkApprove} onBulkReject={handleBulkReject} onExport={handleExport} />
              ) : (
                <div className="p-3 rounded bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm text-gray-600">No pending items selected</div>
              )}
            </div>
          </aside>

          <main className="lg:col-span-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">{loading ? 'Loading...' : `${applications.length} applications`}</div>
                <div className="flex gap-2">
                <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700" onClick={()=>load()}>Refresh</button>
                <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700" onClick={handleClearSelection}>Clear selection</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loading ? (
                // show skeletons while loading
                Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
              ) : applications.length ? (
                applications.map(app => (
                  <ApplicationCard key={app._id || app._id} application={app} selected={!!selected[app._id || app._id]} onSelect={onSelect} onApprove={()=>{ setSelectedApp(app); setApproveModalOpen(true); }} onReject={()=>{ setSelectedApp(app); setRejectModalOpen(true); }} onView={async ()=>{
                    const detail = await api.fetchApplication(app._id || app._id)
                    if (detail && detail.success) {
                      const data = detail.data
                      window.alert(JSON.stringify(data, null, 2))
                    } else window.alert('Failed to load detail')
                  }} />
                ))
              ) : (
                <div className="col-span-1 sm:col-span-2">
                  <CenteredEmptyState hasFilters={!!(filters?.status || filters?.search || filters?.minScore)} onClearFilters={() => setFilters({})} onRefresh={() => load()} />
                </div>
              )}
            </div>
          </main>

          <aside className="lg:col-span-3">
              <AIAssistantPanel aiSummary={aiSummary} onApplyAIDecisions={handleApplyAIDecisions} />
            <div className="mt-4">
              {/* Quick actions panel - compact set of useful buttons */}
              {/* Imported component to keep sidebar cohesive */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-gray-800 dark:text-white">Quick Actions</div>
                </div>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700" onClick={()=>load()}>Refresh list</button>
                  <button className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm" onClick={handleExport}>Export CSV</button>
                  <button className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm" onClick={()=>setSelected({})}>Clear selection</button>
                </div>
              </div>
            </div>
          </aside>
        </div>
        </div>
      </div>
        {/* Modals */}
        <ApproveModal isOpen={approveModalOpen} onClose={()=>{ setApproveModalOpen(false); setSelectedApp(null) }} onApprove={handleModalApprove} application={selectedApp} aiSuggestion={selectedApp ? { suggestedRate: calculateSuggestedRate(selectedApp), confidence: (computeRecommendation(selectedApp).score || 50)/100, reasons: [] } : null} />
        <RejectModal isOpen={rejectModalOpen} onClose={()=>{ setRejectModalOpen(false); setSelectedApp(null) }} onReject={handleModalReject} application={selectedApp} />
  <InviteModal isOpen={inviteModalOpen} onClose={()=>setInviteModalOpen(false)} />

        {/* Toast container */}
        <div className="fixed top-4 right-4 z-60 flex flex-col gap-2">
          {toasts.map(t => (
            <ToastNotification key={t.id} id={t.id} message={t.message} type={t.type} onClose={(id)=>removeToast(id)} />
          ))}
        </div>
    </AdminLayout>
  )
}

export default ApprovalsPage
