import React, { useState } from 'react'

const CompactFiltersPanel: React.FC<any> = ({ filters, onChange }) => {
  const [minScore, setMinScore] = useState( (filters?.minScore) || 0 )
  const [maxScore, setMaxScore] = useState( (filters?.maxScore) || 100 )
  const update = (patch: any) => onChange({ ...filters, ...patch })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900 dark:text-white">Filters</h3>
        <button className="text-sm text-blue-600 hover:text-blue-800" onClick={() => onChange({})}>Clear all</button>
      </div>

      <div className="space-y-3 text-sm text-gray-600">
        {/* Keep this panel as an "advanced filters" area only — top toolbar contains status, search, score and sort. */}
        <div>
          <div className="text-xs text-gray-500 mb-2">Advanced</div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="rounded text-blue-500" />
              Show only applicants with portfolio
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="rounded text-blue-500" />
              Has video introduction
            </label>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-2">Quick stats</div>
          <div className="flex items-center gap-3">
            <div className="px-2 py-1 bg-gray-100 rounded text-xs">Pending: 0</div>
            <div className="px-2 py-1 bg-gray-100 rounded text-xs">Approve: 0</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompactFiltersPanel
