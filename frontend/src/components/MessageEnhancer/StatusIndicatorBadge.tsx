import React from 'react'

type Props = {
  status?: 'sending' | 'sent' | 'failed' | 'delivered' | 'read'
}

export default function StatusIndicatorBadge({ status }: Props) {
  if (!status) return null
  const isPositive = status === 'delivered' || status === 'read'
  const colorClass = isPositive ? 'text-green-500' : 'text-gray-400'

  return (
    <span
      aria-hidden
      className={`absolute -right-2 -bottom-1 text-xs ${colorClass} pointer-events-none`}
      style={{ lineHeight: 1 }}
    >
      {/* render double-check symbol; color controlled via Tailwind class */}
      <span className="select-none">✓✓</span>
    </span>
  )
}
