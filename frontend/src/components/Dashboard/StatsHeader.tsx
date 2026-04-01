import React from 'react'
import { FaBuilding, FaCalendarAlt, FaFilter } from 'react-icons/fa'

export default function StatsHeader({ name, totals, onTabChange, activeTab, onFilterClick }: { name: string; totals: any; onTabChange: (t: any) => void; activeTab: string; onFilterClick?: () => void }) {
  return (
    <header className="dashboard-header p-4 rounded-b-lg bg-white dark:bg-gray-900 border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="icon-building p-2 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-white">
            <FaBuilding />
          </div>
          <div>
            <div className="text-lg font-semibold">{name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-300">Organization dashboard</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-300">Projects <div className="stat-num">{totals.projects}</div></div>
          <div className="text-sm text-gray-500 dark:text-gray-300">Active tasks <div className="stat-num">{totals.activeTasks}</div></div>
          <div className="text-sm text-gray-500 dark:text-gray-300">Team <div className="stat-num">{totals.members}</div></div>
          {/* Budget intentionally removed from nav per request */}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-2"><FaCalendarAlt /> {new Date().toLocaleDateString()}</div>
          <button onClick={() => onFilterClick && onFilterClick()} className="btn-filter p-2 rounded bg-gray-100 dark:bg-gray-800" title="Filter"><FaFilter /></button>
        </div>
      </div>

      <nav className="mt-4 max-w-7xl mx-auto flex gap-2 overflow-auto">
        {['projects','tasks','resources','team','analytics'].map(tab => (
          <button key={tab} onClick={() => onTabChange(tab)} className={`px-3 py-1 rounded ${activeTab===tab ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700'}`}>
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
    </header>
  )
}
