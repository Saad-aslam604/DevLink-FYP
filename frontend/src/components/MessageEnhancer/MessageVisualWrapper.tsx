import React, { ReactNode } from 'react'

type Props = {
  children: ReactNode
  isMine?: boolean
  className?: string
}

export default function MessageVisualWrapper({ children, isMine = false, className = '' }: Props) {
  // wrapper is additive only: relative inline-block keeps flow and allows absolute overlays
  return (
    <span className={`relative inline-block group ${className}`}>
      {/* decorative accent: absolute so no layout change; subtle border-left accent */}
      <span
        aria-hidden
        className={`absolute inset-0 pointer-events-none -z-10 transition-colors duration-200 ${isMine ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800/30'}`}
      />
      {/* left accent bar */}
      <span
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-1 pointer-events-none ${isMine ? 'bg-blue-400 dark:bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
      />
      {/* apply hover shadow to wrapper (additive, no layout impact) */}
      <span className="relative z-0 group-hover:shadow-sm transition-shadow duration-150">{children}</span>
    </span>
  )
}
