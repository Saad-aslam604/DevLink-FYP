import React from 'react'
import { FileSearch, UserPlus } from 'lucide-react'

type Props = { hasFilters?: boolean; onClearFilters?: () => void; onRefresh?: () => void }

const CenteredEmptyState: React.FC<Props> = ({ hasFilters = false, onClearFilters, onRefresh }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-32 h-32 mb-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl flex items-center justify-center">
        <FileSearch className="w-16 h-16 text-gray-400" />
      </div>

      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        {hasFilters ? 'No matching applications' : 'No applications yet'}
      </h3>

      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
        {hasFilters
          ? "Try adjusting your filters or search terms to find what you're looking for."
          : "When users apply to become Senior Developers, their applications will appear here for review."}
      </p>

      <div className="flex gap-3">
        {hasFilters ? (
          <>
            <button className="px-4 py-2 border border-gray-300 rounded-md text-sm" onClick={onClearFilters}>Clear all filters</button>
            <button className="px-4 py-2 text-sm text-gray-700" onClick={onRefresh}>View all</button>
          </>
        ) : (
          <>
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm flex items-center" onClick={() => {}}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Senior Developers to apply
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700" onClick={onRefresh}>Refresh page</button>
          </>
        )}
      </div>

      <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Need help managing applications?</p>
        <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View documentation →</button>
      </div>
    </div>
  )
}

export default CenteredEmptyState
