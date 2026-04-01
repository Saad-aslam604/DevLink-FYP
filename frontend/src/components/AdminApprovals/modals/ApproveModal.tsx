import React, { useEffect, useRef, useState } from 'react'
import '../../../styles/admin-approvals.css'
import useFocusTrap from '../../../utils/useFocusTrap'

interface ApproveModalProps {
  isOpen: boolean
  onClose: () => void
  onApprove: (approvedRate: number, notes: string) => Promise<void>
  application: any | null
  aiSuggestion?: { suggestedRate: number; confidence: number; reasons: string[] } | null
}

const clamp = (v:number, a:number, b:number) => Math.max(a, Math.min(b, v))

const ApproveModal: React.FC<ApproveModalProps> = ({ isOpen, onClose, onApprove, application, aiSuggestion }) => {
  const [rate, setRate] = useState<number>(150)
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<Element | null>(null)

  useEffect(() => {
    if (isOpen) {
      const suggested = aiSuggestion?.suggestedRate ?? (application ? Math.min(500, Math.max(50, Number(application.requestedRate || 150))) : 150)
      setRate(clamp(Number(suggested), 20, 500))
      setNotes('')
      previouslyFocused.current = document.activeElement
      setTimeout(()=>{
        try { dialogRef.current?.querySelector('input')?.focus() } catch(e){}
      },50)
    }
  }, [isOpen, application, aiSuggestion])

  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // trap focus inside modal when open
  useFocusTrap(dialogRef, isOpen)

  const handleApprove = async () => {
    const v = clamp(Math.round(rate), 20, 500)
    setLoading(true)
    try {
      await onApprove(v, notes)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !application) return null

  const name = application.user ? `${application.user.firstName || ''} ${application.user.lastName || ''}`.trim() : 'Applicant'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog" aria-labelledby="approve-modal-title">
      <div className="absolute inset-0 dl-modal-backdrop" onClick={onClose} />
      <div ref={dialogRef} className="relative dl-card bg-white dl-modal max-w-xl w-full mx-4" role="document">
        {/* Header */}
        <div className="dl-header-success rounded-t-lg p-4 flex items-center gap-3 text-white" style={{ borderTopLeftRadius:12, borderTopRightRadius:12 }}>
          <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div id="approve-modal-title" className="font-semibold text-lg">Approve Mentor Application</div>
            <div className="text-xs opacity-90">Confirm the approved hourly rate and add notes</div>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-gray-900">{name}</div>
              <div className="text-xs text-gray-500">{application.title || ''}</div>
              <div className="mt-2 text-sm text-gray-700">Requested: <span className="font-semibold">${application.requestedRate || '—'}/hr</span></div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-xs text-gray-500">AI suggested</div>
              <div className="mt-1 font-semibold text-gray-900">${aiSuggestion?.suggestedRate ?? Math.round(rate)}</div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Approved rate: <span className="font-semibold">${rate}/hr</span></label>
            <input aria-label="approved-rate" type="range" min={20} max={500} value={rate} onChange={(e)=>setRate(Number(e.target.value))} className="w-full mt-3" />
            <div className="mt-2 flex items-center gap-3">
              <div className="px-2 py-1 rounded bg-gray-50 text-xs text-gray-700">Min $20</div>
              <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                <div style={{ width: `${((rate-20)/480)*100}%` }} className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
              </div>
              <div className="px-2 py-1 rounded bg-gray-50 text-xs text-gray-700">Max $500</div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea aria-label="approve-notes" value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full border rounded mt-2 p-3 text-sm" rows={4} />
            <div className="text-xs text-gray-500 mt-1">{notes.length}/500</div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button className="px-4 py-2 bg-white border rounded text-sm" onClick={() => { onClose(); previouslyFocused.current && (previouslyFocused.current as HTMLElement).focus(); }} disabled={loading}>Cancel</button>
            <button className="px-4 py-2 rounded text-sm text-white" style={{ background: 'linear-gradient(90deg,#10B981,#34D399)' }} onClick={async ()=>{ await handleApprove(); previouslyFocused.current && (previouslyFocused.current as HTMLElement).focus(); }} disabled={loading}>{loading ? 'Processing...' : 'Approve'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApproveModal
