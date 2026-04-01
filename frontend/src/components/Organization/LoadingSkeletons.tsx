import React from 'react'

export function ProjectCardSkeleton() {
  return (
    <div className="project-card p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="p-4 rounded bg-white dark:bg-gray-900 border animate-pulse">
      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  )
}

export default function LoadingSkeletons() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
    </div>
  )
}
