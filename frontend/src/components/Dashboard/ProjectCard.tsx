import React from 'react'
import { FaCode, FaDatabase, FaFileAlt, FaDollarSign, FaEye, FaEdit, FaTrash } from 'react-icons/fa'

const typeIcon = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'data': return <FaDatabase />
    case 'docs': return <FaFileAlt />
    default: return <FaCode />
  }
}

type Props = {
  project: any
  onView?: (p: any) => void
  onEdit?: (p: any) => void
  onDelete?: (p: any) => void
  onCreateTask?: (p: any) => void
  onAllocate?: (p: any) => void
}

export default function ProjectCard({ project, onView, onEdit, onDelete, onCreateTask, onAllocate }: Props) {
  const statusColor = project && project.status === 'Closed' ? 'bg-gray-200 text-gray-700' : project && project.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
  return (
    <div className="project-card p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-150">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="proj-icon p-3 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 flex-shrink-0">{typeIcon(project.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 dark:text-white truncate">{project.title}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{project.description || 'No description'}</div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>{project.status}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {(() => {
            try {
              if (project == null) return '—'
              if (typeof project.budget === 'number') return `$${project.budget}`
              if (project.budget && (project.budget.amount !== undefined)) return `$${Number(project.budget.amount)}`
              return '—'
            } catch (e) { return '—' }
          })()}
        </span>
      </div>

      <div className="mb-3">
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${project.progress || 0}%` }} />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{project.progress || 0}% complete</div>
      </div>

      <div className="flex gap-1 flex-wrap">
        <button onClick={() => onView && onView(project)} className="flex-1 min-w-max px-2 py-1 rounded border text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition" title="View"><FaEye className="inline mr-1" />View</button>
        <button onClick={() => onEdit && onEdit(project)} className="flex-1 min-w-max px-2 py-1 rounded border text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition" title="Edit"><FaEdit className="inline mr-1" />Edit</button>
        <button onClick={() => onCreateTask && onCreateTask(project)} className="flex-1 min-w-max px-2 py-1 rounded border text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition" title="Create Task"><FaFileAlt className="inline mr-1" />Task</button>
        <button onClick={() => onAllocate && onAllocate(project)} className="flex-1 min-w-max px-2 py-1 rounded border text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition" title="Allocate Resource"><FaDollarSign className="inline mr-1" />Allocate</button>
        <button onClick={() => onDelete && onDelete(project)} className="flex-1 min-w-max px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs transition" title="Delete"><FaTrash className="inline mr-1" /></button>
      </div>
    </div>
  )
}
