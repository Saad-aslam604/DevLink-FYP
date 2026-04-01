import React, { ReactNode } from 'react'

type Props = {
  children: ReactNode
  isMine?: boolean
  className?: string
}

// MessageBubbleWrapper: non-invasive visual wrapper that decorates an existing message
// without changing its layout or inner classes. It renders an absolutely-positioned
// decorative background and border using Tailwind classes so the wrapper itself
// doesn't change spacing of the child content.
export default function MessageBubbleWrapper({ children, isMine = false, className = '' }: Props) {
  // wrapper-level classes are additive only. We keep it inline-block so it doesn't
  // alter flow compared to existing inline/inline-block bubbles. 'relative' needed
  // so decorative absolute element is positioned correctly.
  const wrapperClasses = `relative inline-block ${isMine ? 'ml-auto' : ''} ${className}`.trim()

  // decorative classes: use low-opacity background variants and a left border for cue
  // Use explicit light/dark Tailwind variants so bubble decoration looks correct
  // in both light and dark modes (avoid appearing black in dark mode).
  const decoClasses = isMine
    ? 'absolute inset-0 rounded-lg pointer-events-none -z-10 bg-blue-50 border-l-4 border-blue-400 dark:bg-blue-900/20 dark:border-blue-600'
    : 'absolute inset-0 rounded-lg pointer-events-none -z-10 bg-gray-50 border-l-4 border-gray-300 dark:bg-gray-800/30 dark:border-gray-600'

  return (
    <span data-ismine={isMine ? 'true' : 'false'} className={wrapperClasses}>
      {/* decorative layer — absolutely positioned behind the message content */}
      <span aria-hidden className={`${decoClasses} -z-10`} />
      {children}
    </span>
  )
}
