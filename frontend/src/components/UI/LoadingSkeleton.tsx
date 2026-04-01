import React from 'react'

const CardSkeleton: React.FC = () => (
  <div className="app-card-gradient-border" aria-hidden>
    <div className="app-card animate-pulse">
      <div className="flex gap-4">
        <div className="w-14 h-14 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/5 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="flex gap-2">
            <div className="h-6 bg-gray-200 rounded w-16" />
            <div className="h-6 bg-gray-200 rounded w-10" />
            <div className="h-6 bg-gray-200 rounded w-12" />
          </div>
        </div>
      </div>
    </div>
  </div>
)

export default CardSkeleton
