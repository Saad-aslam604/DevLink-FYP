import React from 'react'

type Props = {
  username?: string
  className?: string
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AvatarBadge({ username = '', className = '' }: Props) {
  const text = initials(username)
  return (
    <span
      aria-hidden
      className={`absolute -top-2 -left-2 h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold ${className}`}
      style={{ pointerEvents: 'none' }}
    >
      <span className="text-white">{text}</span>
    </span>
  )
}
