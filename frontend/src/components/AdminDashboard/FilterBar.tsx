import React, { useState } from 'react'
import { RefreshCw, LayoutGrid, Table } from 'lucide-react'

type Props = {
  filters: any
  setFilters: (f: any) => void
  onRefresh?: () => void
  viewMode?: 'grid' | 'table'
  setViewMode?: (v: 'grid'|'table') => void
}

const FilterBar: React.FC<Props> = ({ filters, setFilters, onRefresh, viewMode = 'grid', setViewMode }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const update = (patch: any) => setFilters({ ...filters, ...patch })
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
  <div className="container mx-auto px-4 py-4">
        {/* Mobile toggle */}
        <div className="sm:hidden flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Filters</div>
          <button onClick={() => setMobileOpen((s) => !s)} className="text-sm text-blue-600">{mobileOpen ? 'Close' : 'Open'}</button>
        </div>

        <div className={`${mobileOpen ? 'block' : 'hidden'} sm:block`}> 
          <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <select value={filters?.status||''} onChange={(e)=>update({ status: e.target.value })} className="rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm min-w-[140px]">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="relative flex-1 min-w-0">
              <input type="text" value={filters?.search||''} onChange={(e)=>update({ search: e.target.value })} placeholder="Search applications..." className="w-full pl-3 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm" />
            </div>
          </div>

            <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-transparent">
              <label className="text-sm text-gray-600 dark:text-gray-400 mr-2">Score</label>
              <input type="range" min={0} max={100} value={filters?.minScore||0} onChange={(e)=>update({ minScore: Number(e.target.value) })} className="w-28" />
              <span className="text-sm font-medium w-8 text-center">{filters?.minScore || 0}</span>
              <span className="text-sm text-gray-400">-</span>
              <input type="range" min={0} max={100} value={filters?.maxScore||100} onChange={(e)=>update({ maxScore: Number(e.target.value) })} className="w-28" />
              <span className="text-sm font-medium w-8 text-center">{filters?.maxScore || 100}</span>
            </div>

            <select value={filters?.sortBy||'submittedAt'} onChange={(e)=>update({ sortBy: e.target.value })} className="rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm">
              <option value="submittedAt">Newest First</option>
              <option value="applicationScore">Highest Score</option>
              <option value="yearsOfExperience">Most Experience</option>
            </select>

            <button onClick={onRefresh} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md" aria-label="Refresh">
              <RefreshCw className="w-5 h-5" />
            </button>

            <div className="flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
              <button onClick={()=>setViewMode && setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}><LayoutGrid className="w-5 h-5" /></button>
              <button onClick={()=>setViewMode && setViewMode('table')} className={`p-2 ${viewMode === 'table' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}><Table className="w-5 h-5" /></button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FilterBar
