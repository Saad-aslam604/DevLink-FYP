import React from 'react'

const BrainIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
    <path d="M9 2a3 3 0 0 0-3 3v1H6a3 3 0 0 0 0 6h1v5a3 3 0 0 0 6 0v-2h2a3 3 0 0 0 0-6h-1V5a3 3 0 0 0-3-3H9z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const AIAssistantPanel: React.FC<any> = ({ aiSummary = {}, onApplyAIDecisions }) => {
  const aiApprovedCount = aiSummary?.approveCount ?? 0
  const confidence = typeof aiSummary?.confidence === 'number' ? aiSummary.confidence : 0
  const autoApproveCount = aiSummary?.autoApproveCount ?? 0
  const autoRejectCount = aiSummary?.autoRejectCount ?? 0

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="flex items-start gap-3 mb-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
          <BrainIcon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">AI Assistant</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 break-words">Smart recommendations</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-md p-3 w-full min-w-0 bg-gray-50 dark:bg-gray-900 border border-gray-100">
          <div className="flex justify-between items-center mb-2 min-w-0">
            <span className="text-sm font-medium truncate">Ready to Approve</span>
            <span className="inline-flex items-center bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">{aiApprovedCount}</span>
          </div>
          <div className="flex gap-2">
            <button disabled={(autoApproveCount||0) === 0 && (autoRejectCount||0) === 0} className={`flex-1 ${ (autoApproveCount||0) + (autoRejectCount||0) === 0 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white' } rounded-md py-2 font-semibold whitespace-normal break-words`} onClick={onApplyAIDecisions}>
              Apply AI Decisions ({autoApproveCount} approve, {autoRejectCount} reject)
            </button>
          </div>
        </div>

        <div className="rounded-md p-3 w-full min-w-0 bg-gray-50 dark:bg-gray-900 border border-gray-100">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Confidence: {isNaN(confidence) ? '—' : `${confidence}%`}</div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="h-2 bg-purple-600" style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIAssistantPanel
