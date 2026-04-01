import React from 'react'
import { UserPlus, Download } from 'lucide-react'

type Props = {
  title?: string
  subtitle?: string
  total?: number
  onInvite?: () => void
  onExport?: () => void
}

const PageHeader: React.FC<Props> = ({ title = 'Mentor Applications', subtitle = 'Review and approve mentor applications', total = 0, onInvite, onExport }) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onInvite} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md">
              <UserPlus className="w-4 h-4" />
              <span className="text-sm">Invite Mentors</span>
            </button>
            <button onClick={onExport} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-700">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export CSV</span>
            </button>
            <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">{total} total</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PageHeader
