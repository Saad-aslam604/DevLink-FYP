import React, { useEffect, useState } from 'react'
import EmptyState from '../components/UX/EmptyState'
import { PlusCircle, Loader2 } from 'lucide-react'
import PostCard from '../components/Posts/PostCard'

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

export default function Feed() {
  const [modalOpen, setModalOpen] = useState(false)
  const [postText, setPostText] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [posts, setPosts] = useState<Array<any>>([])
  const [query, setQuery] = useState<string>('')
  const [debouncedQuery, setDebouncedQuery] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('devlink_token')
        const headers: Record<string,string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`${API_BASE}/posts`, { headers })
        if (!res.ok) {
          setLoading(false)
          return
        }
        const body = await res.json().catch(() => null)
        if (!mounted) return
        const list = Array.isArray(body?.data) ? body.data : []
        setPosts(list)
      } catch (e) {
        console.warn('Failed to load posts', e)
      } finally { if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [])

  // debounce the search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const filteredPosts = React.useMemo(() => {
    if (!debouncedQuery) return posts
    const q = debouncedQuery.toLowerCase()
    return posts.filter((p) => {
      const content = String(p.content || '').toLowerCase()
      const authorName = ((p.author && ((p.author.firstName || '') + ' ' + (p.author.lastName || ''))) || '').toLowerCase()
      return content.includes(q) || authorName.includes(q)
    })
  }, [posts, debouncedQuery])

  const openModal = () => setModalOpen(true)
  const closeModal = () => { setModalOpen(false); setPostText('') }

  const onSelectImages = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files).slice(0, 6)
    setSelectedImages(arr)
    setPreviewUrls(arr.map((f) => URL.createObjectURL(f)))
  }

  const removeImage = (idx: number) => {
    setSelectedImages((s) => s.filter((_, i) => i !== idx))
    setPreviewUrls((s) => s.filter((_, i) => i !== idx))
  }

  const submitPost = async () => {
    if (!postText.trim() && selectedImages.length === 0) return alert('Write something or add an image before posting')
    try {
      setPosting(true)
      const token = localStorage.getItem('devlink_token')
      const form = new FormData()
      form.append('content', postText.trim())
      for (const img of selectedImages) form.append('images', img)

      const headers: Record<string,string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE}/posts`, { method: 'POST', headers, body: form })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(errText || 'Failed to create post')
      }
      const body = await res.json().catch(() => null)
      if (body && body.data) {
        setPosts((p) => [body.data, ...p])
      }
      setPostText('')
      setSelectedImages([])
      setPreviewUrls([])
      setModalOpen(false)
    } catch (e) {
      console.warn('Create post failed', e)
      alert('Unable to create post')
    } finally { setPosting(false) }
  }

  return (
    <div className="w-full relative">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h1 className="text-2xl font-semibold">Feed</h1>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts or authors..."
            className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 text-sm"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500"><Loader2 className="inline-block mr-2 animate-spin" /> Loading posts…</div>
        ) : filteredPosts.length === 0 ? (
          <EmptyState title="No posts found" subtitle="Try a different search or create a post." Icon={PlusCircle} />
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((p) => (
              <PostCard
                key={String(p.id)}
                post={p}
                onLikeUpdated={(updated: any) => {
                  // merge updated like info into posts state
                  setPosts((prev) => prev.map((pp) => (String(pp.id) === String(updated.id) ? { ...pp, likeCount: updated.likeCount, isLiked: updated.isLiked } : pp)))
                }}
                onDelete={(id: string) => setPosts((prev) => prev.filter((pp) => String(pp.id) !== String(id)))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Create Post Button */}
      <button 
        onClick={openModal} 
        className="fixed bottom-20 right-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all z-40"
        title="Create a new post"
      >
        <PlusCircle className="w-5 h-5" />
        <span className="hidden sm:inline">Create Post</span>
      </button>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white dark:bg-[#0B0D10] rounded-lg p-4 w-full max-w-2xl shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Create post</h3>
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              rows={6}
              className="w-full p-3 border rounded bg-transparent text-gray-900 dark:text-white"
              placeholder="Share something with the community..."
            />
            <div className="mt-3">
              <label className="block text-sm mb-2">Images (optional)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => onSelectImages(e.target.files)} />
              {previewUrls.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {previewUrls.map((u, idx) => (
                    <div key={u} className="relative">
                      <img src={u} className="w-24 h-24 object-cover rounded" alt="preview" />
                      <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-black text-white rounded-full w-6 h-6 text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={closeModal} className="px-3 py-1 rounded border">Cancel</button>
              <button disabled={posting} onClick={submitPost} className={`px-3 py-1 rounded bg-blue-600 text-white ${posting ? 'opacity-60 pointer-events-none' : ''}`}>
                {posting ? (<><Loader2 className="inline-block mr-2 animate-spin" /> Posting...</>) : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
