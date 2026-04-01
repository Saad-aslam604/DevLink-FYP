import React from 'react'

export default function DashboardDebug({ data, errors }: { data?: any; errors?: any }) {
  return (
    <details className="p-3 bg-yellow-50 dark:bg-yellow-900 rounded mt-4">
      <summary className="font-medium">Dashboard Debug (toggle)</summary>
      <div className="mt-2 text-xs">
        <div><strong>Data snapshot:</strong></div>
        <pre className="text-xs overflow-auto max-h-60">{JSON.stringify(data, null, 2)}</pre>
        <div className="mt-2"><strong>Errors:</strong></div>
        <pre className="text-xs overflow-auto max-h-60">{JSON.stringify(errors || {}, null, 2)}</pre>
      </div>
    </details>
  )
}
