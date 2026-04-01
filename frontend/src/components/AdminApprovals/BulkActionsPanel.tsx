import React from 'react'

const BulkActionsPanel: React.FC<any> = ({ selectedCount, onBulkApprove, onBulkReject, onExport }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h4 className="font-semibold mb-2">Bulk Actions</h4>
      <div className="text-sm text-gray-700 mb-3">Selected: <span className="font-medium">{selectedCount}</span></div>
      <div className="flex flex-col gap-2">
        <button disabled={!selectedCount} className="w-full bg-green-600 text-white p-2 rounded" onClick={onBulkApprove}>Approve Selected</button>
        <button disabled={!selectedCount} className="w-full bg-red-600 text-white p-2 rounded" onClick={onBulkReject}>Reject Selected</button>
        <button className="w-full bg-gray-100 text-gray-800 p-2 rounded" onClick={onExport}>Export CSV</button>
      </div>
    </div>
  )
}

export default BulkActionsPanel
