import React from 'react'

const ScoreBadge: React.FC<{ score?: number }> = ({ score = 0 }) => {
  const s = Math.round(Number(score) || 0)
  let cls = 'bg-red-100 text-red-800'
  if (s >= 75) cls = 'bg-green-100 text-green-800'
  else if (s >= 50) cls = 'bg-yellow-100 text-yellow-800'

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
      <span className="mr-2 font-semibold">{s}</span>
      <span className="text-[11px]">score</span>
    </div>
  )
}

export default ScoreBadge
