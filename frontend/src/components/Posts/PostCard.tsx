import React, { useState } from 'react'
import { Heart, MessageCircle } from 'lucide-react'
import { likePost } from '../../utils/api'
import CommentSection from './CommentSection'
import { timeAgo, fullDate } from '../../utils/dateFormatter'
import { Link } from 'react-router-dom'
import useClickOutside from '../../hooks/useClickOutside'

export default function PostCard({ post, onLikeUpdated }: any) {
  const onDelete = (typeof (arguments[0] && (arguments[0] as any).onDelete) !== 'undefined') ? (arguments[0] as any).onDelete : undefined
  const onEditProp = (typeof (arguments[0] && (arguments[0] as any).onEdit) !== 'undefined') ? (arguments[0] as any).onEdit : undefined
  const [content, setContent] = useState<string>(post?.content || '')
  const [isLiked, setIsLiked] = useState(Boolean(post?.isLiked))
  const [likeCount, setLikeCount] = useState(Number(post?.likeCount || 0))
  const [loading, setLoading] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(Number(post?.commentCount || 0))
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useClickOutside<HTMLDivElement>(() => {
    setMenuOpen(false)
  })
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('spam')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)

  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('devlink_user_id') : null
  const authorId = post?.author && (post.author.id || post.author._id || post.author.id)
  const profileLink = (String(authorId) === String(currentUserId)) ? '/app/profile/me' : `/app/profile/${authorId}`

  const toggleLike = async () => {
    if (loading) return
    const prevLiked = isLiked
    const prevCount = likeCount
    setIsLiked(!prevLiked)
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1)
    setLoading(true)
    try {
      const resp = await likePost(String(post.id))
      if (resp && resp.data) {
        const d = resp.data
        setIsLiked(Boolean(d.isLiked))
        setLikeCount(Number(d.likeCount || 0))
        if (onLikeUpdated) onLikeUpdated(d)
      }
    } catch (e) {
      setIsLiked(prevLiked)
      setLikeCount(prevCount)
      console.warn('like failed', e)
    } finally {
      setLoading(false)
    }
  }

  const handleNewComment = (c: any) => {
    setCommentCount((n) => n + 1)
  }

  const deletePost = async () => {
    if (!confirm('Delete this post? This cannot be undone.')) return
    try {
      const token = localStorage.getItem('devlink_token')
      const headers: Record<string,string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`/api/posts/${encodeURIComponent(String(post.id))}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Failed to delete')
      if (onDelete) onDelete(post.id)
    } catch (e) {
      console.warn('delete post failed', e)
      alert('Unable to delete post')
    }
  }

  const submitEdit = async () => {
    try {
      const token = localStorage.getItem('devlink_token')
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`/api/posts/${encodeURIComponent(String(post.id))}`, { method: 'PATCH', headers, body: JSON.stringify({ content: editText }) })
      if (!res.ok) throw new Error('Failed to update post')
      const body = await res.json().catch(() => null)
      if (body && body.data) {
        // optimistic update of UI: update local content and notify parent if provided
        setContent(String(body.data.content || editText))
        try { if (onEditProp) onEditProp(body.data) } catch (e) {}
      }
      setEditing(false)
    } catch (e) {
      console.warn('edit post failed', e)
      alert('Unable to update post')
    }
  }

  return (
    <div className="p-4 bg-white dark:bg-[#0B0D10] rounded-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            {post.author && post.author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="text-sm font-semibold text-gray-500">{(post.author && (post.author.firstName || post.author.lastName) || 'U').charAt(0)}</div>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {post.author ? (
                  <Link to={profileLink} className="hover:underline">
                    {`${post.author.firstName || ''} ${post.author.lastName || ''}`.trim()}
                  </Link>
                ) : 'Unknown'}
              <span className="ml-2 text-xs text-gray-500">{post.author && post.author.role ? `• ${post.author.role}` : ''}</span>
            </div>
            <div className="text-xs text-gray-500" title={fullDate(post.createdAt)}>{timeAgo(post.createdAt)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
          <button onClick={toggleLike} disabled={loading} className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors">
            <Heart className={`w-5 h-5 ${isLiked ? 'text-red-500' : ''}`} />
            <span className="text-sm">{likeCount}</span>
          </button>
          <button onClick={() => setShowComments((s) => !s)} className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{commentCount}</span>
          </button>

          <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#111214]">⋯</button>
          {menuOpen && (
            <div ref={menuRef} className="absolute right-0 mt-8 w-56 bg-white dark:bg-[#0B0D10] rounded shadow-md z-50 p-2 text-sm">
              {String(currentUserId) === String(post.author?.id || post.author?._id || post.author?.id) && (
                <>
                  <button className="w-full text-left px-2 py-1 hover:bg-gray-100" onClick={() => { setMenuOpen(false); setEditing(true); setEditText(post.content || '') }}>Edit post</button>
                  <button className="w-full text-left px-2 py-1 hover:bg-gray-100 text-red-600" onClick={() => { setMenuOpen(false); deletePost() }}>Delete post</button>
                </>
              )}
              <button className="w-full text-left px-2 py-1 hover:bg-gray-100" onClick={async () => { setMenuOpen(false); try { await navigator.clipboard.writeText(window.location.origin + `/posts/${post.id}`); alert('Post link copied to clipboard') } catch(e) { console.warn('copy failed', e); alert('Unable to copy link') } }}>Share</button>
              <button className="w-full text-left px-2 py-1 hover:bg-gray-100" onClick={() => { setMenuOpen(false); setReportOpen(true) }}>Report</button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 text-sm text-gray-900 dark:text-white">{content}</div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white dark:bg-[#0B0D10] rounded-lg p-4">
            <h3 className="text-lg font-semibold">Edit post</h3>
            <div className="mt-3">
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full min-h-[120px] p-2 rounded border bg-white dark:bg-[#0B0D10] text-gray-900 dark:text-white" />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="px-3 py-1 rounded border">Cancel</button>
              <button onClick={submitEdit} className="px-3 py-1 rounded bg-blue-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {Array.isArray(post.media) && post.media.length > 0 && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
          {post.media.map((m: string, idx: number) => (
            <button key={String(m) + idx} onClick={() => setLightboxIndex(idx)} className="block w-full overflow-hidden rounded">
              <img src={m} alt={`post-image-${idx}`} className="w-full h-40 object-cover rounded" />
            </button>
          ))}
        </div>
      )}

      {showComments && <CommentSection postId={String(post.id)} onNewComment={handleNewComment} />}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80" onClick={() => setLightboxIndex(null)}>
          <img src={post.media[lightboxIndex]} alt="full" className="max-h-[90vh] max-w-[90vw] object-contain" />
        </div>
      )}

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-[#0B0D10] rounded-lg p-4">
            <h3 className="text-lg font-semibold">Report post</h3>
            <p className="text-sm text-gray-500 mt-1">Reason for reporting this post</p>
            <div className="mt-3">
              <select className="w-full border rounded p-2 bg-white dark:bg-[#0B0D10]" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                <option value="spam">Spam or misleading</option>
                <option value="harassment">Harassment or hate</option>
                <option value="explicit">Explicit content</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="mt-3">
              <textarea className="w-full border rounded p-2 min-h-[80px] bg-white dark:bg-[#0B0D10]" placeholder="Additional details (optional)" value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 rounded border" onClick={() => setReportOpen(false)} disabled={reportSubmitting}>Cancel</button>
              <button className="px-3 py-1 rounded bg-red-600 text-white" onClick={async () => {
                if (reportSubmitting) return
                try {
                  setReportSubmitting(true)
                  const token = localStorage.getItem('devlink_token')
                  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
                  if (token) headers['Authorization'] = `Bearer ${token}`
                  const res = await fetch('/api/reports', { method: 'POST', headers, body: JSON.stringify({ postId: String(post.id), reason: reportReason, details: reportDetails }) })
                  if (!res.ok) throw new Error('Report failed')
                  // success
                  setReportOpen(false)
                  setReportDetails('')
                  alert('Thanks — the report has been submitted')
                } catch (e) {
                  console.warn('report failed', e)
                  alert('Unable to submit report')
                } finally {
                  setReportSubmitting(false)
                }
              }} disabled={reportSubmitting}>{reportSubmitting ? 'Reporting...' : 'Submit report'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
