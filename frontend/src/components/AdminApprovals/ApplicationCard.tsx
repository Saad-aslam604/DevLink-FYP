import React from 'react'
import '../../styles/admin-approvals.css'
import StatusBadge from './StatusBadge'

const ApplicationCard: React.FC<{ application: any; selected?: boolean; onSelect?: (id:string, checked:boolean)=>void; onApprove?: ()=>void; onReject?: ()=>void; onView?: ()=>void }> = ({ application, selected, onSelect, onApprove, onReject, onView }) => {
  const name = application.user ? `${application.user.firstName || ''} ${application.user.lastName || ''}`.trim() : 'Unknown'
  const avatar = application.user && (application.user.avatar || application.user.avatarUrl)
  const score = Math.round(Number((application.aiRecommendation && application.aiRecommendation.score) ?? application.applicationScore ?? 0))

  const circleRadius = 24
  const circumference = 2 * Math.PI * circleRadius
  const progress = Math.max(0, Math.min(100, score))
  const dash = (progress/100) * circumference

  const skillColor = (s: string) => {
    // simple deterministic color from string
    const code = s.split('').reduce((acc,c)=>acc + c.charCodeAt(0), 0)
    const hues = ['#FDE68A','#BFDBFE','#C7F9CC','#FBCFE8','#E9D5FF','#FEF3C7']
    return hues[code % hues.length]
  }

  return (
    <div className="app-card-gradient-border">
      <div className="app-card flex gap-4">
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className={`avatar-ring ${application.isAvailable ? 'avatar-status' : ''}`} title={name}>
            {avatar ? <img src={avatar} alt={name} /> : <div className="w-14 h-14 bg-gray-200 flex items-center justify-center text-gray-600">{(name[0]||'').toUpperCase()}</div>}
          </div>
          <div className="mt-2 score-circle">
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" stroke="#F1F5F9" strokeWidth="6" fill="none" />
              <circle cx="28" cy="28" r="24" stroke="url(#g)" strokeWidth="6" strokeDasharray={`${dash} ${circumference-dash}`} strokeLinecap="round" fill="none" />
              <defs>
                <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
              <text x="28" y="32" textAnchor="middle" className="score-text" fill="#0F172A">{score}</text>
            </svg>
          </div>
        </div>

        <div className="flex-1">
          {/* AI recommendation badge (inline to avoid overlapping header actions) */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">{name}</div>
              <div className="text-xs text-gray-500">
                {application.title || ''} • {((application.yearsOfExperience ?? application.user?.yearsOfExperience ?? application.user?.experienceYears) !== undefined ? `${(application.yearsOfExperience ?? application.user?.yearsOfExperience ?? application.user?.experienceYears) || 0} yrs` : '—')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={application.status} />
              {
                (() => {
                  const rec = application.aiRecommendation && application.aiRecommendation.recommendation
                  if (!rec) return null
                  if (rec === 'approve') return <div className="inline-flex items-center bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-1 rounded">AI: Approve</div>
                  if (rec === 'review') return <div className="inline-flex items-center bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">AI: Review</div>
                  if (rec === 'reject') return <div className="inline-flex items-center bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded">AI: Reject</div>
                  return null
                })()
              }
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(application.skills || []).slice(0,8).map((s: string) => (
              <span key={s} className="skill-chip" style={{ background: skillColor(s) }}>{s}</span>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">Requested: <span className="font-medium">${application.requestedRate || '—'}/hr</span></div>
            <div className="flex items-center gap-2">
              {application.status === 'pending' ? (
                <>
                  <button title="Approve" className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-2" onClick={onApprove}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Approve
                  </button>
                  <button title="Reject" className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2" onClick={onReject}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Reject
                  </button>
                </>
              ) : (
                <div className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-600">{application.status === 'approved' ? 'Approved' : application.status === 'rejected' ? 'Rejected' : application.status}</div>
              )}
              <button title="View" className="px-3 py-1 text-sm border border-gray-200 text-gray-700 rounded" onClick={onView}>View</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApplicationCard
