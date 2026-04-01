import React from 'react'

type Action = { label: string; onClick: () => void; variant?: 'primary' | 'secondary' }

export default function EmptyState({ title, subtitle, actions, Icon }: { title: string; subtitle?: string; actions?: Action[]; Icon?: React.ComponentType<any> }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon ? <div className="mb-4 text-indigo-600 dark:text-indigo-400"><Icon size={56} /></div> : null}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {subtitle ? <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 max-w-xl">{subtitle}</p> : null}
      {actions && actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          {actions.map((a, idx) => (
            <button key={idx} type="button" onClick={a.onClick} className={`px-4 py-2 rounded-md ${a.variant === 'secondary' ? 'bg-transparent border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
