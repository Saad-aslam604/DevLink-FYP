import React, { useEffect, useRef, useState } from 'react'
import '../../../styles/admin-approvals.css'
import useFocusTrap from '../../../utils/useFocusTrap'

const REJECTION_REASONS = [
  "Insufficient experience for requested rate",
  "Portfolio needs more depth",
  "Bio needs more detail about teaching approach",
  "Skillset doesn't match current demand",
  "Rate too high for experience level",
  "GitHub profile needs more activity",
  "Other (specify below)",
]

interface RejectModalProps {
  isOpen: boolean
  onClose: () => void
  onReject: (rejectionReason: string, notes: string) => Promise<void>
  application: any | null
}

const RejectModal: React.FC<RejectModalProps> = ({ isOpen, onClose, onReject, application }) => {
  const [reason, setReason] = useState<string>(REJECTION_REASONS[0])
  const [custom, setCustom] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<Element | null>(null)

  useEffect(()=>{
    if (isOpen) {
      setReason(REJECTION_REASONS[0])
      setCustom('')
      setNotes('')
      previouslyFocused.current = document.activeElement
      setTimeout(()=>{ try { dialogRef.current?.querySelector('select')?.focus() } catch(e){} },50)
    }
  }, [isOpen])

  useEffect(()=>{
    const onKey = (e:KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // trap focus inside modal
  useFocusTrap(dialogRef, isOpen)

  const handleReject = async () => {
    const finalReason = reason === 'Other (specify below)' ? (custom || '') : reason
    if (!finalReason || finalReason.trim().length === 0) { window.alert('Please provide a rejection reason'); return }
    setLoading(true)
    try {
      await onReject(finalReason, notes)
    } finally { setLoading(false) }
  }

  if (!isOpen || !application) return null

  const name = application.user ? `${application.user.firstName || ''} ${application.user.lastName || ''}`.trim() : 'Applicant'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog" aria-labelledby="reject-modal-title">
      <div className="absolute inset-0 dl-modal-backdrop" onClick={onClose} />
      <div ref={dialogRef} className="relative dl-card bg-white dl-modal max-w-xl w-full mx-4" role="document">
        <div className="dl-header-warning rounded-t-lg p-4 flex items-center gap-3 text-white" style={{ borderTopLeftRadius:12, borderTopRightRadius:12 }}>
          <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 17h.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div id="reject-modal-title" className="font-semibold text-lg">Reject Application</div>
            <div className="text-xs opacity-90">Provide a reason and optional notes to help the applicant improve</div>
          </div>
        </div>

        <div className="p-5">
          <div className="text-sm font-medium text-gray-900">{name}</div>
          <div className="text-xs text-gray-500">{application.title || ''}</div>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700">Reason</label>
            <select value={reason} onChange={(e)=>setReason(e.target.value)} className="w-full border rounded mt-2 p-2 text-sm">
              {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {reason === 'Other (specify below)' && (
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700">Custom reason</label>
              <textarea value={custom} onChange={(e)=>setCustom(e.target.value)} className="w-full border rounded mt-2 p-2 text-sm" rows={3} />
            </div>
          )}

          <div className="mt-3">
            <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full border rounded mt-2 p-2 text-sm" rows={3} />
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button className="px-4 py-2 bg-white border rounded text-sm" onClick={() => { onClose(); previouslyFocused.current && (previouslyFocused.current as HTMLElement).focus(); }} disabled={loading}>Cancel</button>
            <button className="px-4 py-2 rounded text-sm text-white" style={{ background: 'linear-gradient(90deg,#F59E0B,#FBBF24)' }} onClick={async ()=>{ await handleReject(); previouslyFocused.current && (previouslyFocused.current as HTMLElement).focus(); }} disabled={loading}>{loading ? 'Processing...' : 'Reject'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RejectModal
