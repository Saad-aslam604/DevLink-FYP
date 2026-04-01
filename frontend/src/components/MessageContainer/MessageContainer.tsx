import React, { useState, useEffect } from 'react'

type Sender = { _id?: string | number; firstName?: string; lastName?: string; avatar?: string }

type MessageShape = {
  id?: string
  text?: string
  ts?: string
  createdAt?: string
  sender?: Sender | string | null
  senderId?: string | number
  readBy?: { userId?: string; readAt?: string | null }[]
  status?: 'sending' | 'sent' | 'failed'
  attachments?: Array<{ _id?: string; originalName?: string; mimeType?: string; size?: number; path?: string }>
}

type Props = {
  message: MessageShape
  currentUserId?: string
  children?: React.ReactNode
  /** Optional initials provided by parent to ensure stable avatars */
  currentInitial?: string
  otherInitial?: string
}

const initialsFrom = (s?: Sender | string | null) => {
  if (!s) return 'U'
  if (typeof s === 'string') {
    const str = String(s).trim()
    if (!str || str === 'me' || str === 'them') return 'U'
    return str.charAt(0).toUpperCase()
  }
  const name = `${s.firstName || ''} ${s.lastName || ''}`.trim()
  if (!name) return 'U'
  return String(name).charAt(0).toUpperCase()
}

const formatTime = (iso?: string) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch (e) {
    return iso || ''
  }
}

/**
 * MessageContainer
 * - Provides light/dark theme-aware bubbles
 * - Preserves children rendering so existing status UI (sending/failed) can be passed in
 */
const MessageContainer: React.FC<Props> = ({ message, currentUserId, children, currentInitial, otherInitial }) => {
  // Normalize senderId from multiple possible shapes
  const senderIdFromMsg = ((): string | undefined => {
    // Prefer explicit senderId from server/optimistic message
    if (message.senderId) return String(message.senderId)
    // If sender is an object with _id, use that
    if (message?.sender && typeof message.sender === 'object' && (message.sender as Sender)._id) return String((message.sender as Sender)._id)
    // If sender is a string, only treat it as an id when it's not the legacy markers 'me'/'them'
    if (message?.sender && typeof message.sender === 'string') {
      const str = String(message.sender).trim()
      if (str && str !== 'me' && str !== 'them') return str
    }
    return undefined
  })()

  const meId = currentUserId ? String(currentUserId) : undefined
  // Robust isMe detection: consider several shapes the sender may come in
  const isMe = (() => {
    try {
  // explicit 'me' marker - treat as current user even if local user id is not yet available
  if ((message as any).sender === 'me') return true
      // explicit senderId field
      if (senderIdFromMsg && meId && String(senderIdFromMsg) === meId) return true
      // sender as object with _id
      if (message.sender && typeof message.sender === 'object' && (message.sender as Sender)._id && meId && String((message.sender as Sender)._id) === meId) return true
      // sender as a raw string id
      if (message.sender && typeof message.sender === 'string') {
        const s = String(message.sender).trim()
        if (s === meId) return true
      }
      return false
    } catch (e) {
      return false
    }
  })()

  // Bubble classes: light and dark combined via Tailwind
  const bubbleClass = isMe
    ? 'bg-blue-600/90 text-white rounded-xl rounded-tr-none max-w-[66%] px-4 py-2.5 shadow-sm'
    : 'bg-gray-100 text-gray-800 rounded-xl rounded-tl-none max-w-[66%] px-4 py-2.5 dark:bg-gray-800 dark:text-white shadow-sm'
  // Derive a stable avatar label in priority order:
  // 1. If message.sender is an object with a name, use that initial
  // 2. If message.sender (string) looks like a name (not 'me'/'them'), use its first letter
  // 3. If senderIdFromMsg is alphabetic, use its first letter
  // 4. Fallback to the first alphabetic char in the message text
  // 5. Final fallback 'U'
  const avatarLabel = (() => {
  if (isMe) return currentInitial ? currentInitial : 'Y'
    // If parent supplied an otherInitial for the conversation, prefer that so
    // all non-me messages show the same initial in a 1:1 chat.
    if (otherInitial) return otherInitial
    // sender object name
    if (message.sender && typeof message.sender === 'object') {
      const s = message.sender as Sender
      const name = `${s.firstName || ''} ${s.lastName || ''}`.trim()
      if (name) return name.charAt(0).toUpperCase()
    }
    // sender as string (not legacy markers)
    if (message.sender && typeof message.sender === 'string') {
      const str = String(message.sender).trim()
      if (str && str !== 'me' && str !== 'them' && /^[A-Za-z]/.test(str)) return str.charAt(0).toUpperCase()
    }
    // senderId if alphabetic
    if (senderIdFromMsg && /^[A-Za-z]/.test(String(senderIdFromMsg))) return String(senderIdFromMsg).charAt(0).toUpperCase()
    // look for first alphabetic char in text
    if (message.text) {
      const m = String(message.text).trim()
      const found = m.match(/[A-Za-z]/)
      if (found) return found[0].toUpperCase()
    }
    // if a parent provided otherInitial, use it
  if (otherInitial) return otherInitial
    return 'U'
  })()

  // Compute API origin for prefixing relative asset paths (strip trailing /api if present)
  const API_BASE_RAW = (import.meta.env.VITE_API_BASE as string) || '/api'
  const API_ORIGIN = API_BASE_RAW.replace(/\/api\/?$/, '') || ''
  const senderAvatarUrl = (() => {
    try {
      const av = message && (message as any).sender && typeof (message as any).sender === 'object' ? (message as any).sender.avatar : (message && (message as any).sender && typeof message.sender === 'string' ? (message as any).sender : null)
      if (!av) return null
      const s = String(av)
      if (s.startsWith('http')) return s
      if (s.startsWith('/')) return `${API_ORIGIN}${s}`
      return s
    } catch (e) { return null }
  })()

  const [imgError, setImgError] = useState(false);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});
  // local reactions copy for optimistic UI
  const [reactionsLocal, setReactionsLocal] = useState<Array<{ emoji: string; users: string[] }>>(() => (Array.isArray((message as any).reactions) ? (message as any).reactions : []));
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    try {
      setReactionsLocal(Array.isArray((message as any).reactions) ? (message as any).reactions : []);
    } catch (e) {}
  }, [message && (message as any).reactions]);

  const EMOJIS = ['❤️', '😂', '🎉', '👍', '👎', '🔥'];

  const toggleReaction = async (emoji: string) => {
    try {
      const me = currentUserId;
      const msgId = message.id;
      if (!msgId || !emoji) return;
      // optimistic update
      setReactionsLocal((prev) => {
        const found = prev.find((r) => r.emoji === emoji);
        if (found) {
          const has = (found.users || []).some((u) => String(u) === String(me));
          if (has) {
            // remove user
            const next = prev.map((r) => r.emoji === emoji ? ({ ...r, users: (r.users || []).filter(u => String(u) !== String(me)) }) : r).filter(r => (r.users || []).length > 0);
            return next;
          }
          // add user
          return prev.map((r) => r.emoji === emoji ? ({ ...r, users: [...(r.users || []), String(me)] }) : r);
        }
        return [...prev, { emoji, users: [String(me)] }];
      });

      const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api';
      const token = localStorage.getItem('devlink_token') || undefined;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      // POST toggles reaction on server
      const resp = await fetch(`${API_BASE}/messages/${encodeURIComponent(String(msgId))}/reactions`, { method: 'POST', headers, body: JSON.stringify({ emoji }) }).catch(() => null);
      if (!resp || !resp.ok) {
        // revert optimistic change on failure: re-fetch from server or invert
        // conservative: reload reactions from server by no-op; here we just revert the optimistic toggle
        setReactionsLocal((prev) => {
          const found = prev.find((r) => r.emoji === emoji);
          if (found) {
            const has = (found.users || []).some((u) => String(u) === String(currentUserId));
            if (has) {
              // if optimistic add failed, remove
              return prev.map((r) => r.emoji === emoji ? ({ ...r, users: (r.users || []).filter(u => String(u) !== String(currentUserId)) }) : r).filter(r => (r.users || []).length > 0);
            } else {
              // if optimistic remove failed, re-add
              return prev.map((r) => r.emoji === emoji ? ({ ...r, users: [...(r.users || []), String(currentUserId)] }) : r);
            }
          }
          return prev;
        });
      }
    } catch (e) {
      console.warn('toggleReaction error', e);
    }
  };

  return (
    <div data-msg-id={message.id} className={`flex items-start gap-3 mb-3 ${isMe ? 'flex-row-reverse' : ''}`}>
      {/* Avatar: show image when available, fallback to initials */}
      {message.sender && typeof message.sender === 'object' && senderAvatarUrl && !imgError ? (
        <img alt="avatar" src={senderAvatarUrl} onError={() => setImgError(true)} className={`w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-gray-300 dark:ring-gray-600 ${isMe ? '' : ''}`} />
      ) : (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${isMe ? 'bg-blue-600' : 'bg-gray-500'} ring-1 ring-gray-300 dark:ring-gray-600`}> 
          {avatarLabel}
        </div>
      )}

      <div className={`max-w-md ${isMe ? 'text-right ml-auto' : 'text-left'}`}>
        <div className={`${bubbleClass} ${isMe ? 'ml-auto' : ''}`}>{children}</div>

        <div className={`mt-2 flex items-center gap-2 text-xs`}> 
          <div className={`text-xs text-gray-500 dark:text-gray-400`}>{formatTime(message.createdAt || message.ts)}</div>
          {/* Message status icons for outgoing messages */}
          {isMe && (
            <div className="text-xs text-gray-400 ml-2">
              {(() => {
                // prefer computedStatus supplied by API/socket, otherwise fall back to persisted status
                const st = (message as any).computedStatus || (message as any).status || 'sent';
                if (st === 'sending') return <span className="text-gray-400">•</span>;
                if (st === 'failed') return <span className="text-red-500">!</span>;
                if (st === 'sent') return <span>✓</span>;
                if (st === 'delivered') return <span>✓✓</span>;
                if (st === 'read') return <span className="text-blue-400">✓✓✓</span>;
                return <span>✓</span>;
              })()}
            </div>
          )}
        </div>

        {/* Reactions row (left-aligned under message) */}
        <div className={`mt-2 flex items-start gap-2`}>
          <div className="flex items-center gap-2">
            {(reactionsLocal || []).map((r) => {
              const users = Array.isArray(r.users) ? r.users : [];
              const count = users.length || 0;
              const me = currentUserId ? String(currentUserId) : undefined;
              const reacted = me ? users.some((u) => String(u) === me) : false;
              return (
                <button key={r.emoji} onClick={() => toggleReaction(r.emoji)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${reacted ? 'bg-blue-600/95 text-white shadow-sm' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-transparent dark:border-gray-700'}`}>
                  <span>{r.emoji}</span>
                  <span className="text-xs">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Reaction picker toggle */}
          <div className="relative">
            <button onClick={() => setShowPicker(!showPicker)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">😊</button>
            {showPicker && (
              <div className="absolute z-30 mt-2 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-md flex gap-2">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => { toggleReaction(e); setShowPicker(false); }} className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">{e}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Attachments preview */}
        {Array.isArray((message as any).attachments) && (message as any).attachments.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {((message as any).attachments || []).map((a: any) => {
              const mime = a && a.mimeType ? String(a.mimeType) : (a && a.type ? String(a.type) : '')
              const isImage = mime.startsWith('image/')
              const API_BASE_RAW = (import.meta.env.VITE_API_BASE as string) || '/api'
              // Some deployments set VITE_API_BASE to '/api' (frontend proxy). The uploads are served at /uploads on the backend root.
              // If API_BASE_RAW contains a trailing '/api', strip it so we can prefix '/uploads/...' correctly.
              const API_ORIGIN = API_BASE_RAW.replace(/\/api\/?$/, '') || ''
              const url = a && a.path ? (String(a.path).startsWith('http') ? String(a.path) : `${API_ORIGIN}${a.path}`) : `${API_ORIGIN}/uploads/${String(a._id)}`
              const imgFailed = !!(a && a._id && imgErrorMap[String(a._id)])
              const name = a && (a.originalName || a.filename || 'file')
              const size = a && a.size ? Number(a.size) : 0
              const fmtSize = (s: number) => {
                if (!s) return ''
                if (s < 1024) return `${s} B`
                if (s < 1024 * 1024) return `${(s / 1024).toFixed(1)} KB`
                return `${(s / (1024 * 1024)).toFixed(2)} MB`
              }
              return (
                <div key={String(a._id || name)} className="flex items-center gap-3 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
                  {isImage && !imgFailed ? (
                    <a href={url} target="_blank" rel="noreferrer" className="w-28 h-20 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <img src={url} alt={name} className="w-full h-full object-cover" onError={() => { if (a && a._id) setImgErrorMap(m => ({ ...m, [String(a._id)]: true })) }} />
                    </a>
                  ) : (
                    <div className="w-28 h-20 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3 px-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded bg-blue-600 text-white font-semibold text-sm">{(name && name.split('.').pop() || 'FILE').slice(0,4).toUpperCase()}</div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[160px]">{name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{fmtSize(size)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-900 dark:text-white truncate block">{name}</a>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{fmtSize(size)}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 dark:text-blue-400">Download</a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageContainer
// Replaced corrupted content with a minimal clean stub. Use MessageBubble.tsx
// as the active implementation. This file is preserved as a small shim so that
// any remaining direct imports to MessageContainer won't crash the typechecker.

