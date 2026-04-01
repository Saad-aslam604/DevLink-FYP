import React from 'react'

type Props = {
  status?: 'sending' | 'sent' | 'failed' | 'delivered' | 'read'
  className?: string
}

export default function StatusIndicator({ status, className = '' }: Props) {
  if (!status) return null

  // Small icons: single check, double check, spinner, or X
  const icon = (() => {
    switch (status) {
      case 'sending':
        return (
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2" strokeOpacity="0.25"/><path d="M22 12a10 10 0 00-10-10" strokeWidth="2"/></svg>
        )
      case 'sent':
        return (
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )
      case 'delivered':
      case 'read':
        return (
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 6L13 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )
      case 'failed':
      default:
        return (
          <svg className="h-3 w-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )
    }
  })()

  return (
    <span
      aria-hidden
      className={`absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/0 p-0.5 ${className}`}
      style={{ pointerEvents: 'none' }}
    >
      <span className="inline-flex items-center justify-center rounded-full bg-white/10 p-0.5 text-white">
        {icon}
      </span>
    </span>
  )
}
