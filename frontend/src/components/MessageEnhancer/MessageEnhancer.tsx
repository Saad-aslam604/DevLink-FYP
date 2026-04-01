import React, { ReactNode } from 'react'
import StatusIndicator from './StatusIndicator'
import AvatarBadge from './AvatarBadge'

type Props = {
  children: ReactNode
  status?: 'sending' | 'sent' | 'failed' | 'delivered' | 'read'
  username?: string
  hover?: boolean
  className?: string
}

// MessageEnhancer is an opt-in non-invasive wrapper around existing message bubble JSX.
// It wraps children in an inline-block relative container and overlays status/avatar
// using position: absolute so there is no layout shift. Hover effects are subtle and optional.
export default function MessageEnhancer({ children, status, username, hover = true, className = '' }: Props) {
  return (
    <span className={`relative inline-block ${hover ? 'group hover:shadow-lg hover:-translate-y-0.5 transition-transform duration-150' : ''} ${className}`}>
      {children}
      {/* overlays: absolute positioned so no layout change */}
      {username ? <AvatarBadge username={username} /> : null}
      {status ? <StatusIndicator status={status} /> : null}
    </span>
  )
}
