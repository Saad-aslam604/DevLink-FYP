import React from 'react'

type ConfirmDialogProps = {
  open: boolean
  title?: string
  message?: string
  preview?: React.ReactNode
  onCancel: () => void
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
}

export default function ConfirmDialog({ open, title, message, preview, onCancel, onConfirm, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      {/* Backdrop: on md+ screens shift the backdrop to start after the 350px sidebar so it doesn't cover the conversation list. Use solid backgrounds (no opacity). */}
         <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md shadow-xl">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{title || 'Confirm'}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{message || 'Are you sure?'}</p>
        {preview ? <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">{preview}</div> : null}
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded-md border">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className="px-3 py-2 rounded-md bg-red-600 text-white">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
