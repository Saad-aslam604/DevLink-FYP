import React, { useCallback, useRef, useState } from 'react'
import { useToast } from '../UX/ToastProvider'

type UploadedFile = {
  _id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
}

export default function FileUpload({ onUploaded, multiple = false }: { onUploaded?: (f: UploadedFile) => void; multiple?: boolean }) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = [/^image\//, 'application/pdf', 'text/', 'application/json', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

  const validate = (file: File) => {
    if (file.size > maxSize) return 'File is too large (max 10MB)'
    const ok = allowedTypes.some((t) => (typeof t === 'string' ? file.type === t : t.test(file.type)))
    if (!ok) return 'File type not allowed'
    return null
  }

  const doUpload = useCallback((file: File) => {
    setError(null)
    setProgress(0)
    setUploading(true)
    const xhr = new XMLHttpRequest()
    const fd = new FormData()
    fd.append('file', file, file.name)

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100))
    }

    xhr.onload = () => {
      setProgress(null)
      setUploading(false)
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const j = JSON.parse(xhr.responseText)
          if (j && j.success && j.data && j.data.file) {
            onUploaded && onUploaded(j.data.file)
            try { toast.show('Upload successful', 'success') } catch (e) {}
          } else {
            setError('Upload failed')
            try { toast.show('Upload failed', 'error') } catch (e) {}
          }
        } catch (e) {
          setError('Upload response parse error')
          try { toast.show('Upload response parse error', 'error') } catch (e) {}
        }
      } else {
        setError('Upload failed: ' + xhr.statusText)
        try { toast.show('Upload failed', 'error') } catch (e) {}
      }
    }

    xhr.onerror = () => { setProgress(null); setUploading(false); setError('Upload network error'); try { toast.show('Upload network error', 'error') } catch (e) {} }

    // Attach Authorization header from localStorage token if present
    const token = localStorage.getItem('devlink_token')
    xhr.open('POST', (import.meta.env.VITE_API_BASE || '/api') + '/uploads/upload', true)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(fd)
  }, [onUploaded, toast])

  const onFiles = (files: FileList | null) => {
    if (!files) return
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      const v = validate(f)
      if (v) { setError(v); continue }
      doUpload(f)
      if (!multiple) break
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files) }}
        className={`border-dashed border-2 p-4 rounded-md text-center transition-colors ${dragOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}
      >
        <div className="text-sm text-gray-700 dark:text-gray-300">Drag & drop files here, or</div>
        <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="mt-2 px-3 py-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
          {uploading ? 'Uploading…' : 'Choose file'}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => onFiles(e.target.files)} multiple={multiple} />
      </div>
      {progress !== null && (
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">Uploading: {progress}%</div>
      )}
      {error && <div className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</div>}
    </div>
  )
}
