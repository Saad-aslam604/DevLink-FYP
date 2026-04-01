import React, { useState } from 'react'

const FiltersPanel: React.FC<any> = ({ filters, onChange }) => {
  const update = (patch: any) => onChange({ ...filters, ...patch })
  const [localSearch, setLocalSearch] = useState(filters.search || '')
  return (
    <div className="filters-compact mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm">Filters</h4>
        <button className="text-xs text-gray-600" onClick={()=>onChange({})}>Clear</button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Status</label>
          <select value={filters.status||''} onChange={(e)=>update({ status: e.target.value })} className="w-full border rounded p-2 text-sm">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Search</label>
          <div className="filters-search">
            <input value={localSearch} onChange={(e)=>{ setLocalSearch(e.target.value); update({ search: e.target.value }) }} className="w-full border rounded p-2 text-sm" placeholder="name, title, skill" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Min score</label>
          <div className="score-range">
            <input type="range" min={0} max={100} value={filters.minScore||0} onChange={(e)=>update({ minScore: e.target.value })} />
            <div className="text-sm text-gray-600 w-10 text-right">{filters.minScore||0}</div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Sort</label>
          <select value={filters.sortBy||'submittedAt'} onChange={(e)=>update({ sortBy: e.target.value })} className="w-full border rounded p-2 text-sm">
            <option value="submittedAt">Newest</option>
            <option value="applicationScore">Score</option>
            <option value="requestedRate">Requested Rate</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 bg-primary-light text-white p-2 rounded text-sm" onClick={()=>onChange(filters)}>Apply</button>
        </div>
      </div>
    </div>
  )
}

export default FiltersPanel
