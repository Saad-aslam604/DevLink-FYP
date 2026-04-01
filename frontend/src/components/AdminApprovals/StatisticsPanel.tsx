import React from 'react'

const StatisticsPanel: React.FC<any> = ({ stats }) => {
  if (!stats) return <div className="bg-white rounded-lg shadow p-4">Loading stats...</div>
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h4 className="font-semibold mb-3">Statistics</h4>
      <div className="text-sm text-gray-700 space-y-2">
        <div>Total: <span className="font-medium">{stats.total}</span></div>
        <div>Pending: <span className="font-medium">{stats.pending}</span></div>
        <div>Approved: <span className="font-medium">{stats.approved}</span></div>
        <div>Rejected: <span className="font-medium">{stats.rejected}</span></div>
        <div>Approval Rate: <span className="font-medium">{stats.approvalRate}</span></div>
      </div>
    </div>
  )
}

export default StatisticsPanel
