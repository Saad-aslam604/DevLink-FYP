import React, { useEffect, useState } from 'react'
import { getComments, addComment } from '../../utils/api'

export default function CommentSection({ postId, onNewComment }: { postId: string; onNewComment?: (c:any) => void }) {
  const [comments, setComments] = useState<Array<any>>([])
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [input, setInput] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const resp = await getComments(postId)
      if (resp && resp.data) setComments(resp.data)
    } catch (e) {
      console.warn('load comments failed', e)
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [postId])

  const submit = async () => {
    if (!input || !input.trim()) return
    const content = input.trim()
    const temp = { id: `temp_${Date.now()}`, content, createdAt: new Date().toISOString(), author: { id: localStorage.getItem('devlink_user_id') || undefined, firstName: 'You', avatar: undefined }, optimistic: true }
    setComments((s) => [...s, temp])
    setInput('')
    setPosting(true)
    try {
      const resp = await addComment(postId, content)
      if (resp && resp.data) {
        setComments((s) => s.map((c) => (c.id === temp.id ? resp.data : c)))
        if (onNewComment) onNewComment(resp.data)
      }
    } catch (e) {
      console.warn('post comment failed', e)
      setComments((s) => s.filter((c) => c.id !== temp.id))
      alert('Failed to post comment')
    } finally { setPosting(false) }
  }

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Comments</div>
        <div className="text-xs text-gray-500">{loading ? 'Loading…' : `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}</div>
      </div>
      {loading ? (
        <div className="text-sm text-gray-500">Loading comments…</div>
      ) : (
        <div className="space-y-3">
          {comments.length === 0 ? <div className="text-sm text-gray-500">No comments yet</div> : comments.map((c: any) => (
            <div key={c.id} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {c.author && c.author.avatar ? <img src={c.author.avatar} className="w-full h-full object-cover" alt="avatar" /> : <div className="text-sm font-semibold text-gray-500">{(c.author && (c.author.firstName || c.author.lastName) || 'U').charAt(0)}</div>}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{c.author ? `${c.author.firstName || ''} ${c.author.lastName || ''}`.trim() : 'User'}</div>
                    <div className="text-xs text-gray-500">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</div>
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{c.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Write a comment..." className="flex-1 px-3 py-2 rounded-full bg-white border border-gray-200 dark:bg-[#0B0D10] dark:border-[#111214] text-sm shadow-sm" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }} />
          <button onClick={() => submit()} disabled={posting} className="px-3 py-2 bg-blue-600 text-white rounded-full">{posting ? 'Posting…' : 'Post'}</button>
        </div>
      </div>
    </div>
  )
}
