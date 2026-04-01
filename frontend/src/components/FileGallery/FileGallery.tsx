import React, { useEffect, useState } from 'react'
import { useToast } from '../UX/ToastProvider'

type FileItem = {
  _id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  createdAt?: string
}

export default function FileGallery({ userId, allowDelete = true }: { userId: string; allowDelete?: boolean }) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

  const fetchFiles = async () => {
    setLoading(true); setError(null)
    try {
      const token = localStorage.getItem('devlink_token')
      const res = await fetch(`${API_BASE}/uploads/files/user/${encodeURIComponent(userId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j || !j.success) {
        setError('Failed to load files')
        try { toast.show('Failed to load files', 'error') } catch (e) {}
        setLoading(false)
        return
      }
      setFiles(j.data.files || [])
    } catch (e: any) {
      setError(e.message || String(e))
      try { toast.show('Failed to load files', 'error') } catch (e) {}
    } finally { setLoading(false) }
  }

  useEffect(() => { if (userId) fetchFiles() }, [userId])

  const handleDelete = async (fileId: string) => {
    try {
      // optimistic UI: remove locally first for snappy feel
      const prev = files
      setFiles(prev => prev.filter(f => f._id !== fileId))
      const token = localStorage.getItem('devlink_token')
      const res = await fetch(`${API_BASE}/uploads/files/${encodeURIComponent(fileId)}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j || !j.success) {
        setError('Failed to delete file')
        try { toast.show('Failed to delete file', 'error') } catch (e) {}
        // revert optimistic change
        await fetchFiles()
        return
      }
      try { toast.show('File deleted', 'success') } catch (e) {}
    } catch (e: any) { setError(e.message || String(e)) }
  }

  if (!userId) return null

  function formatBytes(bytes: number) {
    if (!bytes && bytes !== 0) return ''
    const thresh = 1024
    if (Math.abs(bytes) < thresh) return bytes + ' B'
    const units = ['KB','MB','GB','TB']
    let u = -1
    do {
      bytes /= thresh
      ++u
    } while(Math.abs(bytes) >= thresh && u < units.length - 1)
    return bytes.toFixed(1)+' '+units[u]
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-2">Portfolio & Files</h3>
      {loading && <div className="text-sm text-gray-500">Loading files…</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {files.map(f => (
          <div key={f._id} className="p-2 border rounded-md bg-white dark:bg-gray-800 flex flex-col">
            <div className="flex-1">
            {f.mimeType.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.path} alt={f.originalName} className="w-full h-40 object-cover rounded" />
            ) : (
              <div className="w-full h-40 flex items-center justify-center bg-gray-50 dark:bg-gray-700 text-sm p-2 text-center">{f.originalName}</div>
            )}
            </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    {(() => {
                      const base = (import.meta.env.VITE_API_BASE as string) || ''
                      const downloadUrl = `${base}${f.path}`
                      return <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-blue-600">Download</a>
                    })()}
                    <div className="text-gray-500">{formatBytes(f.size)}</div>
                  </div>
            <div className="mt-2 flex items-center justify-between">
              {allowDelete && <button onClick={() => handleDelete(f._id)} className="text-xs text-red-500">Delete</button>}
            </div>
          </div>
        ))}
        {files.length === 0 && !loading && <div className="text-sm text-gray-500 col-span-full">No files uploaded yet.</div>}
      </div>
    </div>
  )
}
