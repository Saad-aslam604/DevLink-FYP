import React, { useState, useEffect } from 'react'
import FileUpload from '../FileUpload/FileUpload'

interface Props {
  onSubmit?: (e?: React.FormEvent<HTMLFormElement>) => void
  children?: React.ReactNode
  disabled?: boolean
  onFilesChange?: (files: Array<any>) => void
  selectedFiles?: Array<any>
}

const MessageInputWrapper: React.FC<Props> = ({ onSubmit, children, disabled = false, onFilesChange, selectedFiles }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (onSubmit) {
      e.preventDefault()
      onSubmit(e)
    }
  }
  const [showUploader, setShowUploader] = useState(false)
  const [selectedFilesInternal, setSelectedFilesInternal] = useState<Array<any>>([])

  // Keep internal selected files in sync with parent-controlled prop if provided
  useEffect(() => {
    try {
      if (Array.isArray(selectedFiles) && JSON.stringify(selectedFiles) !== JSON.stringify(selectedFilesInternal)) {
        setSelectedFilesInternal(selectedFiles)
        // if parent cleared files, auto-close the uploader
        if (!selectedFiles || selectedFiles.length === 0) setShowUploader(false)
      }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles])



  const removeFile = (idx: number) => {
    const next = (selectedFilesInternal || []).filter((_, i) => i !== idx)
    setSelectedFilesInternal(next)
    try { if (onFilesChange) onFilesChange(next) } catch (e) {}
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <div className="flex items-center gap-3 flex-1 bg-white dark:bg-gray-700 rounded-full px-4 py-2 border border-gray-300 dark:border-gray-600 focus-within:border-blue-500">
        <div className="flex items-center gap-2 mr-2 relative">
          <button type="button" onClick={() => setShowUploader((s) => !s)} title="Attach file" aria-label="Attach file" className="p-2 rounded hover:bg-gray-100 dark:hover:bg-[#111214] flex items-center justify-center">
            {/* Paperclip SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-gray-600 dark:text-gray-300">
              <path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 11-7.78-7.78l8.49-8.49a3.5 3.5 0 014.95 4.95l-8.49 8.49a1.5 1.5 0 01-2.12-2.12l7.07-7.07" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Uploader popover anchored to the attach button (opens below, left-aligned) */}
          {showUploader && (
            <div className="absolute left-0 top-full mt-2 z-50 w-72 max-w-xs sm:w-80">
              <div className="bg-white dark:bg-[#0B0D10] p-2 rounded shadow border border-gray-100 dark:border-[#111214]">
                <FileUpload multiple={true} onUploaded={(f) => {
                  // FileUpload returns single file at a time; push into internal selectedFiles and notify parent
                  const next = [...(selectedFilesInternal || []), f]
                  setSelectedFilesInternal(next)
                  try { if (onFilesChange) onFilesChange(next) } catch (e) {}
                }} />
                <div className="text-right mt-2">
                  <button type="button" onClick={() => setShowUploader(false)} className="px-3 py-1 rounded bg-gray-100 dark:bg-[#111214]">Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1">
          {children}
          {selectedFilesInternal.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedFilesInternal.map((f, i) => (
                <div key={String(f._id || f.filename || i)} className="flex items-center gap-2 bg-gray-100 dark:bg-[#111214] px-2 py-1 rounded text-sm">
                  <div className="max-w-[180px] truncate">{f.originalName || f.filename || 'file'}</div>
                  <button type="button" onClick={() => removeFile(i)} className="text-xs text-gray-500">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* uploader markup moved above and anchored to the attach button wrapper */}
    </form>
  )
}

export default MessageInputWrapper
