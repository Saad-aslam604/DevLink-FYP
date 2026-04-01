import React from 'react'

const EmptyState: React.FC<{ message?: string }> = ({ message = 'No applications found' }) => {
  return (
    <div className="bg-white rounded-lg p-8 text-center dl-card">
      <div className="text-4xl mb-3">🧾</div>
      <div className="text-lg font-semibold mb-2">{message}</div>
      <div className="text-sm text-gray-600">Try adjusting filters or come back later.</div>
    </div>
  )
}

export default EmptyState
