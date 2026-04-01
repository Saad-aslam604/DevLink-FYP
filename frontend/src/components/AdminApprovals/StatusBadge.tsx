import React from 'react'

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }
  const cls = map[status] || 'bg-gray-100 text-gray-800'
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>{status}</span>
}

export default StatusBadge
