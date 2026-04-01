import React, { useRef } from 'react'

interface FileManagerProps {
  code: string
  language: string
  onCodeLoaded?: (code: string, language?: string) => void
}

const FileManager: React.FC<FileManagerProps> = ({ code, language, onCodeLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get file extension based on language
  const getExtension = () => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      html: 'html',
      css: 'css',
      java: 'java',
      cpp: 'cpp'
    }
    return extensions[language] || 'txt'
  }

  // Save code to file
  const handleSave = () => {
    const extension = getExtension()
    const filename = `code-${Date.now()}.${extension}`

    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    /* file saved: ${filename} */
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (onCodeLoaded) {
        onCodeLoaded(content)
      }
    }
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Save Button */}
      <button
        onClick={handleSave}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors"
        title={`Save as .${getExtension()} file`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
          />
        </svg>
        Save
      </button>

      {/* Load Button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors"
        title="Open code file"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Open
      </button>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".js,.ts,.py,.html,.css,.java,.cpp,.txt,.jsx,.tsx"
        className="hidden"
      />
    </div>
  )
}

export default FileManager
