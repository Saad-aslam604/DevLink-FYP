import React from 'react'

type Props = {
  name?: string
  className?: string
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function InitialsAvatar({ name = '', className = '' }: Props) {
  const text = initials(name)
  return (
    <span
      aria-hidden
      className={`absolute left-2 top-2 w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs flex items-center justify-center pointer-events-none ${className}`}
    >
      {text}
    </span>
  )
}
