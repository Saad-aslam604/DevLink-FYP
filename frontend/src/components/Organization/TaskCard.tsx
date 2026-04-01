import React from 'react'

type Task = any

type Props = {
  task: Task
  onTaskClick: (task: Task) => void
  onViewProject?: (projectId: string) => void
}

export default function TaskCard({ task, onTaskClick, onViewProject }: Props) {
  function getPriorityColor(priority: string) {
    switch ((priority || '').toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const projectName = (task.project && (task.project.title || task.project.name)) || 'Unnamed Project'
  const projectId = (task.project && (task.project._id || task.project.id)) || task.project

  return (
    <div
      className="task-card p-3 mb-2 border rounded-lg hover:shadow-md transition-shadow duration-150 cursor-pointer bg-white dark:bg-gray-800"
      onClick={() => onTaskClick(task)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h5 className="font-medium text-gray-900 dark:text-white mb-1">{task.title}</h5>

          <div className="mb-1 text-sm">
            <span className="text-sm text-gray-500 dark:text-gray-400">Project: </span>
            <button
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
              onClick={(e) => { e.stopPropagation(); if (onViewProject) onViewProject(projectId) }}
            >
              {projectName}
            </button>
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
              {task.description.length > 120 ? `${task.description.substring(0, 120)}...` : task.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className={`px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>{task.priority || 'No priority'}</span>
            {task.deadline && <span className="text-gray-500 dark:text-gray-400">Due: {new Date(task.deadline).toLocaleDateString()}</span>}
            <span className="text-gray-500 dark:text-gray-400">Status: {task.status || 'todo'}</span>
            {task.progress !== undefined && <span className="text-gray-500 dark:text-gray-400">Progress: {task.progress}%</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1 ml-2">
          <button
            className="p-1 text-gray-400 hover:text-blue-500"
            onClick={(e) => { e.stopPropagation(); onTaskClick(task) }}
            title="View Details"
          >
            👁️
          </button>
        </div>
      </div>
    </div>
  )
}
