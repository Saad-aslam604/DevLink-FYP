import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './messages-layout-fix.css'
import EmptyState from '../components/UX/EmptyState'
import BackToTop from '../components/UX/BackToTop'
import ConversationsList from '../components/ConversationsList/ConversationsList'
import MessageInputWrapper from '../components/MessageInputWrapper/MessageInputWrapper'
import MessageContainer from '../components/MessageContainer/MessageContainer'
import { MessageSquareIcon, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { initSocket, getSocket } from '../utils/socket'

type Sender = { _id?: string; firstName?: string; lastName?: string; avatar?: string }
type ApiMsg = { _id?: string; content?: string; createdAt?: string; sender?: Sender | null; status?: string; reactions?: any[] }
type MessageShape = { id: string; content: string; createdAt?: string; sender?: Sender | null; status?: string; reactions?: any[]; attachments?: any[] }

type Preview = { id: string; bookingId?: string; from?: string; avatar?: string | null; text?: string; time?: string; unreadCount?: number }

function formatTs(iso?: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString() } catch (e) { return iso }
}

export default function Messages() {
  const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'
  const token = typeof window !== 'undefined' ? localStorage.getItem('devlink_token') || undefined : undefined

  const [previews, setPreviews] = useState<Preview[]>([])
  const [messages, setMessages] = useState<MessageShape[]>([])
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null)
  const [loadingPreviews, setLoadingPreviews] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [input, setInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<Array<any>>([])
  const [typingUsers, setTypingUsers] = useState<Record<string, { _id: string; firstName?: string; avatar?: string }>>({})
  // track typing timeouts to auto-clear stale indicators
  const typingTimeouts = useRef<Record<string, number>>({})
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const typingTimer = useRef<number | null>(null)
  const [msgMenuOpen, setMsgMenuOpen] = useState<string | null>(null)
  const [convMenuOpen, setConvMenuOpen] = useState(false)
  const [convItemMenuOpen, setConvItemMenuOpen] = useState<string | null>(null)
  const [mutedConvs, setMutedConvs] = useState<Set<string>>(() => new Set())
  const lastMsgRef = useRef<HTMLDivElement | null>(null)
  // remember when a user explicitly selected a conversation to avoid auto-open overrides
  const userSelectedBookingRef = useRef<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [archivedPreviews, setArchivedPreviews] = useState<Preview[]>([])
  const [blockedModalOpen, setBlockedModalOpen] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<Array<{ id: string; name?: string; avatar?: string }>>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Conversation settings handlers (mute/archive/block/report)
  const handleMuteConversation = useCallback(async (bookingId?: string | null) => {
    if (!bookingId) return
    const id = String(bookingId)
    try {
      const tokenLocal = localStorage.getItem('devlink_token')
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (tokenLocal) headers['Authorization'] = `Bearer ${tokenLocal}`
      const res = await fetch(`${API_BASE}/conversations/${encodeURIComponent(id)}/mute`, { method: 'PUT', headers })
      if (!res.ok) throw new Error('Failed to toggle mute')
      const body = await res.json().catch(() => null)
      const muted = body && body.data && body.data.muted === true
      setMutedConvs((prev) => {
        const nm = new Set(prev)
        if (muted) nm.add(id)
        else nm.delete(id)
        return nm
      })
      // notify UI
      try { window.dispatchEvent(new CustomEvent('local-conversation-updated', { detail: { bookingId: id } })) } catch (e) {}
      return body
    } catch (e) {
      console.warn('mute conv failed', e)
      alert('Unable to change mute setting')
    }
  }, [API_BASE])

  const handleArchiveConversation = useCallback(async (bookingId?: string | null) => {
    if (!bookingId) return
    const id = String(bookingId)
    try {
      const tokenLocal = localStorage.getItem('devlink_token')
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (tokenLocal) headers['Authorization'] = `Bearer ${tokenLocal}`
      const res = await fetch(`${API_BASE}/conversations/${encodeURIComponent(id)}/archive`, { method: 'PUT', headers })
      if (!res.ok) throw new Error('Failed to toggle archive')
      const body = await res.json().catch(() => null)
      const archived = body && body.data && body.data.archived === true
      // remove archived conversation from previews if archived
  if (archived) setPreviews((prev) => (prev || []).filter(p => String(p.bookingId || p.id) !== String(id)))
      // if currently open, close it when archived
      if (archived && String(activeBookingId) === String(id)) { setActiveBookingId(null); setMessages([]) }
  // clear user selection when archiving
  try { if (userSelectedBookingRef.current && String(userSelectedBookingRef.current) === String(id)) userSelectedBookingRef.current = null } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('local-conversation-updated', { detail: { bookingId: id } })) } catch (e) {}
      return body
    } catch (e) {
      console.warn('archive conv failed', e)
      alert('Unable to archive conversation')
    }
  }, [API_BASE, activeBookingId])

  const handleBlockUser = useCallback(async (bookingId?: string | null) => {
    if (!bookingId) return
    const id = String(bookingId)
    if (!confirm('Block this user? You can unblock them later from settings.')) return
    try {
      const tokenLocal = localStorage.getItem('devlink_token')
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (tokenLocal) headers['Authorization'] = `Bearer ${tokenLocal}`
      const res = await fetch(`${API_BASE}/conversations/${encodeURIComponent(id)}/block`, { method: 'PUT', headers })
      if (!res.ok) throw new Error('Failed to toggle block')
      const body = await res.json().catch(() => null)
      // close conversation after blocking
  setPreviews((prev) => (prev || []).filter(p => String(p.bookingId || p.id) !== String(id)))
      if (String(activeBookingId) === String(id)) { setActiveBookingId(null); setMessages([]) }
  // clear user selection when blocking
  try { if (userSelectedBookingRef.current && String(userSelectedBookingRef.current) === String(id)) userSelectedBookingRef.current = null } catch (e) {}
      alert(body && body.message ? body.message : 'User block toggled')
      try { window.dispatchEvent(new CustomEvent('local-conversation-updated', { detail: { bookingId: id } })) } catch (e) {}
      return body
    } catch (e) { console.warn('block conv failed', e); alert('Unable to block/unblock user') }
  }, [API_BASE, activeBookingId])

  // Report modal state
  const [reportModal, setReportModal] = useState<{ open: boolean; bookingId?: string | null; reason?: string; details?: string }>({ open: false });

  const openReportModal = useCallback((bookingId?: string | null) => {
    setReportModal({ open: true, bookingId: bookingId || null, reason: '', details: '' })
  }, [])

  const submitReport = useCallback(async () => {
    const bookingId = reportModal.bookingId;
    if (!bookingId) return
    try {
      const tokenLocal = localStorage.getItem('devlink_token')
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (tokenLocal) headers['Authorization'] = `Bearer ${tokenLocal}`
      const body = { reason: reportModal.reason || '', details: reportModal.details || '' }
      const res = await fetch(`${API_BASE}/conversations/${encodeURIComponent(String(bookingId))}/report`, { method: 'POST', headers, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to submit report')
      const j = await res.json().catch(() => null)
      alert('Report submitted. Our team will review it.')
      setReportModal({ open: false })
      return j
    } catch (e) { console.warn('submit report failed', e); alert('Unable to submit report') }
  }, [API_BASE, reportModal])

  const handleReportConversation = useCallback(async (bookingId?: string | null) => {
    if (!bookingId) return
    const id = String(bookingId)
    const reason = prompt('Please provide a short reason for reporting this conversation (optional):')
    try {
      const tokenLocal = localStorage.getItem('devlink_token')
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (tokenLocal) headers['Authorization'] = `Bearer ${tokenLocal}`
      // Best-effort report endpoint
      await fetch(`${API_BASE}/conversations/${encodeURIComponent(id)}/report`, { method: 'POST', headers, body: JSON.stringify({ reason }) }).catch(() => null)
      alert('Conversation reported. Our team will review it.')
    } catch (e) { console.warn('report conv failed', e) }
  }, [API_BASE])

  const fetchArchived = useCallback(async () => {
    try {
      const headers: Record<string,string> = {}
      const tokenLocal = localStorage.getItem('devlink_token')
      if (tokenLocal) headers['Authorization'] = `Bearer ${tokenLocal}`
      const res = await fetch(`${API_BASE}/conversations/archived`, { headers })
      if (!res.ok) { setArchivedPreviews([]); return }
      const body = await res.json()
      const list = Array.isArray(body?.data) ? body.data : []
      const mapped: Preview[] = list.map((p: any, i: number) => ({ id: String(p.bookingId || (`archived_${i}`)), bookingId: String(p.bookingId), from: (p.other && p.other.name) || 'Archived', avatar: (p.other && p.other.avatar) || null, text: p.lastMessage || '', time: p.time || '' }))
      setArchivedPreviews(mapped)
    } catch (e) { console.warn('fetchArchived failed', e); setArchivedPreviews([]) }
  }, [API_BASE])

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const headers: Record<string,string> = {}
      const tokenLocal = localStorage.getItem('devlink_token')
      if (tokenLocal) headers['Authorization'] = `Bearer ${tokenLocal}`
      const res = await fetch(`${API_BASE}/conversations/blocked`, { headers })
      if (!res.ok) { setBlockedUsers([]); return }
      const body = await res.json()
      const list = Array.isArray(body?.data) ? body.data : []
      const mapped = list.map((b: any) => ({ id: String(b.id || b._id), name: b.name || '', avatar: b.avatar || null }))
      setBlockedUsers(mapped)
    } catch (e) { console.warn('fetchBlockedUsers failed', e); setBlockedUsers([]) }
  }, [API_BASE])

  // Fetch conversation previews (recent messages)
  const loadPreviews = useCallback(async (opts?: { autoOpen?: boolean }) => {
    try {
      setLoadingPreviews(true)
      const headers: Record<string,string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/messages/recent`, { headers })
      if (!res.ok) return setPreviews([])
      const body = await res.json()
      const list = Array.isArray(body?.data?.results) ? body.data.results : (Array.isArray(body?.results) ? body.results : (Array.isArray(body?.previews) ? body.previews : []))
      const mapped: Preview[] = list.map((p: any, i: number) => {
        const rawId = p.id || p._id || p.booking || p.bookingId || (p.booking && p.booking._id) || p.bookingId
        const rawBooking = p.booking || p.bookingId || (p.booking && p.booking._id)
        const normalizedBooking = rawBooking && rawBooking !== 'undefined' && rawBooking !== 'null' ? String(rawBooking) : undefined
        const normalizedId = rawId && rawId !== 'undefined' && rawId !== 'null' ? String(rawId) : (normalizedBooking ? normalizedBooking : (p.from ? String(p.from).trim().toLowerCase() : `preview_${i}`))
        return ({
          id: normalizedId,
          bookingId: normalizedBooking,
          from: p.from || p.name || '',
          avatar: p.avatar || null,
          text: p.text || p.preview || '',
          time: p.time || p.createdAt || p.lastMessageAt || '',
          unreadCount: (p.unreadCount && typeof p.unreadCount === 'object' ? Object.values(p.unreadCount).reduce((a:any,b:any)=>a+Number(b||0),0) : Number(p.unreadCount || 0))
        })
      })

      // Deduplicate previews by participant/booking: prefer bookingId if available, otherwise normalize 'from' name
      const dedupMap = new Map<string, Preview>()
      for (const p of mapped) {
        const keyBase = (p.bookingId && String(p.bookingId) !== 'undefined' && String(p.bookingId) !== 'null') ? String(p.bookingId) : (p.from ? String(p.from).trim().toLowerCase() : String(p.id))
        const existing = dedupMap.get(keyBase)
        // choose the preview with the latest time
        if (!existing) dedupMap.set(keyBase, p)
        else {
          try {
            const tNew = p.time ? new Date(p.time).getTime() : 0
            const tOld = existing.time ? new Date(existing.time).getTime() : 0
            if (tNew >= tOld) dedupMap.set(keyBase, p)
          } catch (e) { /* ignore parse errors, keep existing */ }
        }
      }

      const deduped = Array.from(dedupMap.values())
      // sort deduped by time desc so most recent appears first
      deduped.sort((a,b) => {
        try { return (b.time ? new Date(b.time).getTime() : 0) - (a.time ? new Date(a.time).getTime() : 0) } catch (e) { return 0 }
      })
      setPreviews(deduped)
      // auto-open most recent conversation if none selected and user hasn't manually selected one
      try {
        const autoOpen = opts && typeof opts.autoOpen === 'boolean' ? opts.autoOpen : true
        if (autoOpen && !activeBookingId && !userSelectedBookingRef.current && deduped.length > 0) setActiveBookingId(String(deduped[0].bookingId || deduped[0].id))
      } catch (e) {}
      setLoadingPreviews(false)
    } catch (e) {
      console.warn('loadPreviews error', e)
      setLoadingPreviews(false)
    }
  }, [API_BASE, token])

  // refresh when local conversation updates (archive/unblock actions from UI)
  useEffect(() => {
    const onLocalUpdate = () => {
      try {
        if (showArchived) fetchArchived()
        loadPreviews()
      } catch (e) {}
    }
    window.addEventListener('local-conversation-updated', onLocalUpdate)
    return () => window.removeEventListener('local-conversation-updated', onLocalUpdate)
  }, [fetchArchived, loadPreviews, showArchived])

  // Load chat history for a booking (REST fallback)
  const loadHistory = useCallback(async (bookingId: string | null): Promise<MessageShape[]> => {
    if (!bookingId) return []
    try {
      try { console.log('[Messages] loadHistory start', { bookingId }); } catch (e) {}
      setLoadingHistory(true)
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/messages/history?bookingId=${encodeURIComponent(bookingId)}&limit=500`, { headers })
      if (!res.ok) { setMessages([]); setLoadingHistory(false); return [] }
      const body = await res.json()
      const msgs = Array.isArray(body?.messages) ? body.messages : (Array.isArray(body) ? body : [])
  const normalized: MessageShape[] = msgs.map((m: any) => ({ id: String(m._id || m.id), content: m.content || m.text || '', createdAt: m.createdAt || m.ts || m.createdAt, sender: m.sender || null, status: m.status || m.computedStatus || 'sent', reactions: m.reactions || [], attachments: m.attachments || [] }))
      setMessages(normalized)
      // Cache messages to localStorage so they persist after refresh
      try { localStorage.setItem(`devlink_messages_${bookingId}`, JSON.stringify(normalized)) } catch (e) {}
      try { console.log('[Messages] loadHistory done', { bookingId, count: normalized.length }) } catch (e) {}
      setLoadingHistory(false)
      // mark as read (batch) for messages not authored by current user
      try {
        const myId = localStorage.getItem('devlink_user_id')
        const unreadIds = normalized.filter((mm) => mm.sender && String((mm.sender as any)._id) !== String(myId)).map((mm) => mm.id)
        if (unreadIds.length) {
          await fetch(`${API_BASE}/messages/read`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ messageIds: unreadIds }) }).catch(() => null)
        }
      } catch (e) {}
      return normalized
    } catch (e) {
      console.warn('loadHistory error', e)
      setLoadingHistory(false)
      // Try to load from cache if API fails
      try {
        const cached = localStorage.getItem(`devlink_messages_${bookingId}`)
        if (cached) {
          const msgs = JSON.parse(cached)
          setMessages(msgs)
          return msgs
        }
      } catch (e) {}
      return []
    }
  }, [API_BASE, token])

  // Initialize socket and listeners
  useEffect(() => {
    // load previews initially
    loadPreviews()

    const sock = initSocket(token)

    const onChatMessage = (payload: any) => {
      try {
        const bid = payload.booking || payload.bookingId || payload.booking_id
  // stop showing typing for sender when a message arrives
        try {
          const senderId = payload && payload.sender && (payload.sender._id || payload.sender) ? String(payload.sender._id || payload.sender) : null
          if (senderId) {
            setTypingUsers((prev) => { const c = { ...prev }; delete c[String(senderId)]; return c })
            try { if (typingTimeouts.current && typingTimeouts.current[senderId]) { window.clearTimeout(typingTimeouts.current[senderId]); delete typingTimeouts.current[senderId]; } } catch (e) {}
          }
        } catch (e) {}
  // if message belongs to active booking, append
        if (String(bid) === String(activeBookingId)) {
          const m: MessageShape = { id: String(payload._id || payload.id), content: payload.content || payload.text || '', createdAt: payload.createdAt || payload.ts, sender: payload.sender || null, status: payload.status || 'sent', reactions: payload.reactions || [], attachments: payload.attachments || [] }
          setMessages((prev) => [...prev, m])
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
  // refresh previews (conversation list) when any new message arrives
  // do NOT auto-open a different conversation in response to a background message
  loadPreviews({ autoOpen: false })
        // if no conversation currently selected and user hasn't manually selected one, auto-open the one with the incoming recent message
        try { if (!activeBookingId && !userSelectedBookingRef.current && bid) setActiveBookingId(String(bid)) } catch (e) {}
      } catch (e) { console.warn('onChatMessage error', e) }
    }

    const onChatHistory = (data: any) => {
      try {
        if (!Array.isArray(data)) return
  const normalized: MessageShape[] = data.map((m: any) => ({ id: String(m._id || m.id), content: m.content || m.text || '', createdAt: m.createdAt || m.ts, sender: m.sender || null, status: m.status || m.computedStatus || 'sent', reactions: m.reactions || [], attachments: m.attachments || [] }))
        setMessages(normalized)
      } catch (e) { console.warn('onChatHistory', e) }
    }

    const onStatusUpdate = (payload: any) => {
      try {
        const mid = String(payload.messageId || payload.message)
        setMessages((prev) => prev.map((m) => m.id === mid ? { ...m, status: payload.status || m.status } : m))
      } catch (e) {}
    }

    const onDeleted = (payload: any) => {
      try {
        const mid = String(payload.messageId || payload.messageId)
        setMessages((prev) => prev.filter((m) => m.id !== mid))
        loadPreviews()
      } catch (e) {}
    }

    const onReaction = (payload: any) => {
      try {
        const mid = String(payload.messageId)
        setMessages((prev) => prev.map((m) => m.id === mid ? { ...m, reactions: payload.reactions || m.reactions } : m))
      } catch (e) {}
    }

    const onTypingStart = (data: any) => {
      const u = data && data.user
      if (!u || !u._id) return
      const id = String(u._id)
      setTypingUsers((prev) => ({ ...prev, [id]: { _id: id, firstName: u.firstName, avatar: u.avatar } }))
      // reset auto-clear timer for this typing user (6s)
      try { if (typingTimeouts.current[id]) window.clearTimeout(typingTimeouts.current[id]) } catch (e) {}
      try { typingTimeouts.current[id] = window.setTimeout(() => { setTypingUsers((prev) => { const c = { ...prev }; delete c[id]; return c }); delete typingTimeouts.current[id]; }, 6000) } catch (e) {}
    }

    const onTypingStop = (data: any) => {
      const u = data && data.user
      if (!u || !u._id) return
      const id = String(u._id)
      setTypingUsers((prev) => { const c = { ...prev }; delete c[id]; return c })
      try { if (typingTimeouts.current[id]) { window.clearTimeout(typingTimeouts.current[id]); delete typingTimeouts.current[id]; } } catch (e) {}
    }

    // when a user goes offline or leaves, remove typing indicator
    const onUserOffline = (data: any) => {
      try {
        const id = data && (data.userId || data.user) ? String(data.userId || data.user) : null
        if (!id) return
        setTypingUsers((prev) => { const c = { ...prev }; delete c[id]; return c })
        try { if (typingTimeouts.current[id]) { window.clearTimeout(typingTimeouts.current[id]); delete typingTimeouts.current[id]; } } catch (e) {}
      } catch (e) {}
    }

    const onMessageRead = (payload: any) => {
      try {
        const mid = String(payload.messageId || payload.message)
        const status = payload.status || payload.readStatus || 'read'
        setMessages((prev) => prev.map((m) => m.id === mid ? { ...m, status: status } : m))
      } catch (e) {}
    }


    sock.on && sock.on('chat-message', onChatMessage)
  sock.on && sock.on('user-offline', onUserOffline)
  sock.on && sock.on('participant-left', onUserOffline)
  sock.on && sock.on('message-read', onMessageRead)
    sock.on && sock.on('chat-history', onChatHistory)
    sock.on && sock.on('message-status-update', onStatusUpdate)
    sock.on && sock.on('message-deleted', onDeleted)
    sock.on && sock.on('message-reaction-updated', onReaction)
    sock.on && sock.on('typing-start', onTypingStart)
    sock.on && sock.on('typing-stop', onTypingStop)

    return () => {
      try {
        const s = getSocket()
        s && s.off && s.off('chat-message', onChatMessage)
        s && s.off && s.off('chat-history', onChatHistory)
        s && s.off && s.off('message-status-update', onStatusUpdate)
        s && s.off && s.off('message-deleted', onDeleted)
        s && s.off && s.off('message-reaction-updated', onReaction)
        s && s.off && s.off('typing-start', onTypingStart)
  s && s.off && s.off('typing-stop', onTypingStop)
  s && s.off && s.off('user-offline', onUserOffline)
  s && s.off && s.off('participant-left', onUserOffline)
  s && s.off && s.off('message-read', onMessageRead)
      } catch (e) {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPreviews, activeBookingId])

  // Join booking room when activeBookingId changes and load history
  useEffect(() => {
    try { console.log('[Messages] join-room effect, activeBookingId ->', activeBookingId) } catch (e) {}
    if (!activeBookingId) return
    const s = getSocket()
    try {
      s && s.emit && s.emit('join-room', { bookingId: activeBookingId })
      try { console.log('[Messages] emitted join-room', { bookingId: activeBookingId }) } catch (e) {}
      // prefer REST history as canonical fallback
      loadHistory(activeBookingId)
    } catch (e) { console.warn('join-room error', e) }
    return () => { try { s && s.emit && s.emit('leave-room', { bookingId: activeBookingId }); try { console.log('[Messages] leave-room', { bookingId: activeBookingId }) } catch (e) {} } catch (e) {} }
  }, [activeBookingId, loadHistory])

  // Log activeBookingId changes for debugging and ensure loadHistory is triggered
  useEffect(() => {
    try { console.log('[Messages] activeBookingId changed', { activeBookingId }) } catch (e) {}
  }, [activeBookingId])

  // persist active booking across reloads so user's selection survives refresh
  useEffect(() => {
    try {
      if (activeBookingId) localStorage.setItem('devlink_active_booking', String(activeBookingId))
      else localStorage.removeItem('devlink_active_booking')
    } catch (e) {}
  }, [activeBookingId])

  // on mount try to restore last selected booking and load it
  useEffect(() => {
    try {
      const saved = localStorage.getItem('devlink_active_booking')
      if (saved) {
        try { setActiveBookingId(saved); userSelectedBookingRef.current = saved; } catch (e) {}
        // restore messages from cache immediately
        try {
          const cached = localStorage.getItem(`devlink_messages_${saved}`)
          if (cached) {
            const msgs = JSON.parse(cached)
            setMessages(msgs)
          }
        } catch (e) {}
        // attempt to load history for saved booking once previews are fetched
        // call after a microtask so loadPreviews can set previews first
        setTimeout(() => { try { void loadHistory(saved) } catch (e) {} }, 50)
      }
    } catch (e) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Log when messages state updates
  useEffect(() => {
    try { console.log('[Messages] messages updated, length=', messages.length, 'activeBookingId=', activeBookingId) } catch (e) {}
  }, [messages, activeBookingId])

  // compute filtered previews for conversations list (move useMemo out of JSX to avoid conditional hook calls)
  const filteredPreviews = useMemo(() => {
    const src = showArchived ? archivedPreviews : previews
    if (!searchTerm || String(searchTerm).trim() === '') return src
    const q = String(searchTerm).toLowerCase().trim()
    return src.filter((p) => ((p.from || '') + '').toLowerCase().includes(q))
  }, [showArchived, archivedPreviews, previews, searchTerm])

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && (!selectedFiles || selectedFiles.length === 0)) || !activeBookingId) return
    const s = getSocket()
    try {
      const attachIds = (selectedFiles || []).map(f => String(f._id || f.id || f.filename))
      s && s.emit && s.emit('chat-message', { bookingId: activeBookingId, content: (input || '').trim(), attachments: attachIds })
      setInput('')
      setSelectedFiles([])
    } catch (e) { console.warn('sendMessage error', e) }
  }, [input, activeBookingId])

  const reloadConversation = useCallback(async () => {
    if (activeBookingId) await loadHistory(activeBookingId)
    await loadPreviews()
  }, [activeBookingId, loadHistory, loadPreviews])

  const deleteMessage = useCallback(async (messageId: string, scope: 'me' | 'everyone' = 'me') => {
    try {
      const headers: Record<string,string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      await fetch(`${API_BASE}/messages/${encodeURIComponent(messageId)}?scope=${encodeURIComponent(scope)}`, { method: 'DELETE', headers }).catch(() => null)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      await loadPreviews()
    } catch (e) { console.warn('deleteMessage', e) }
  }, [API_BASE, token, loadPreviews])

  const clearChat = useCallback(async () => {
    if (!activeBookingId) return
    if (!confirm('Clear chat for you? This will soft-delete messages for your account.')) return
    try {
      const ids = messages.map((m) => m.id)
      for (const id of ids) {
        await deleteMessage(id, 'me')
      }
      setMessages([])
      await loadPreviews()
    } catch (e) { console.warn('clearChat', e) }
  }, [activeBookingId, messages, deleteMessage, loadPreviews])

  // Typing signals (debounced stop)
  useEffect(() => {
    const s = getSocket()
    if (!s) return
    if (!activeBookingId) return
    if (!input) {
      s.emit && s.emit('stop-typing', { bookingId: activeBookingId })
      return
    }
    s.emit && s.emit('typingStart', { bookingId: activeBookingId })
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => { s.emit && s.emit('typingStop', { bookingId: activeBookingId }) }, 1500)
    return () => { if (typingTimer.current) window.clearTimeout(typingTimer.current) }
  }, [input, activeBookingId])

  // Close menus when clicking outside
  useEffect(() => {
    const onDocClick = () => {
      try { setConvItemMenuOpen(null); setMsgMenuOpen(null); setConvMenuOpen(false) } catch (e) {}
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  // Debugging hooks to capture navigation/reload events - helps trace unexpected reloads
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => { try { console.log('[Messages] beforeunload', e); } catch (err) {} };
    const onPop = (e: PopStateEvent) => { try { console.log('[Messages] popstate', e); } catch (err) {} };
    const onHash = (e: HashChangeEvent) => { try { console.log('[Messages] hashchange', e); } catch (err) {} };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onHash);
    };
  }, [])

  const activePreview = useMemo(() => previews.find((p) => String(p.bookingId) === String(activeBookingId) || String(p.id) === String(activeBookingId)) || null, [previews, activeBookingId])

  // When messages change, scroll the last message into view (reliable)
  useEffect(() => {
    try {
      if (!messages || messages.length === 0) return
      // Prefer lastMsgRef if available (attached to last message element)
      if (lastMsgRef.current && lastMsgRef.current.scrollIntoView) {
        lastMsgRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        return
      }
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    } catch (e) {}
  }, [messages])

  return (
    <div className="messages-page-root w-full flex bg-white dark:bg-[#0A0A0A]">
      {/* Sidebar */}
      <aside className="messages-aside w-[360px] bg-white dark:bg-[#0F0F0F] border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0 overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{previews.length} conversation{previews.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadPreviews()} title="Refresh" className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button title="Blocked users" onClick={() => { setBlockedModalOpen(true); fetchBlockedUsers(); }} className="p-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
            </button>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setShowArchived(false); loadPreviews(); }} 
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${!showArchived ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              Active
            </button>
            <button 
              onClick={() => { setShowArchived(true); fetchArchived(); }} 
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${showArchived ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              Archived
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {loadingPreviews ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : filteredPreviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <MessageSquareIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No conversations</p>
            </div>
          ) : (
            <ConversationsList
              items={filteredPreviews}
              getKey={(p) => p.id}
              onItemClick={async (p, e) => {
                try { if (e) { e.preventDefault(); e.stopPropagation(); } } catch (err) {}
                const sanitize = (s: any) => (s && s !== 'undefined' && s !== 'null') ? String(s) : null
                const bidCandidate = sanitize(p.bookingId) || sanitize(p.id)
                if (!bidCandidate) {
                  try { console.warn('[Messages] clicked preview missing booking id', { p }); } catch (err) {}
                  return
                }
                try { console.log('[Messages] conversation click handler called', { id: bidCandidate, p }); } catch (err) {}
                // Update React state and mark as user-selected so auto-open won't override
                try { userSelectedBookingRef.current = bidCandidate; setActiveBookingId(bidCandidate); } catch (err) { console.warn('setActiveBookingId failed', err) }
                // Safe immediate load: explicitly fetch history for this booking to ensure UI updates quickly
                try {
                  console.log('[Messages] triggering loadHistory for click', { bookingId: bidCandidate })
                  // clear optimistic messages while loading
                  setMessages([])
                  const res = await loadHistory(bidCandidate)
                  // if server returned no messages, try fallback: use preview.id or prompt socket join
                  if ((!res || res.length === 0) && p.id && String(p.id) !== String(bidCandidate)) {
                    try { console.log('[Messages] loadHistory returned empty, trying fallback with preview id', { previewId: p.id }) } catch (e) {}
                    const alt = sanitize(p.id)
                    if (alt) {
                      setActiveBookingId(alt)
                      setMessages([])
                      const res2 = await loadHistory(alt)
                      if (!res2 || res2.length === 0) {
                        // emit join-room to prompt server to send history via socket
                        const s = getSocket()
                        try { s && s.emit && s.emit('join-room', { bookingId: bidCandidate || alt }); } catch (e) {}
                      }
                    }
                  }
                } catch (err) { console.warn('loadHistory from click failed', err) }
              }}
              renderItem={(p: Preview) => {
                const isActive = String(p.bookingId || p.id) === String(activeBookingId)
                return (
                  <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors duration-150 ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                    <div className="relative flex-shrink-0">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.from} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-sm font-semibold">{(p.from && p.from.charAt(0)) || 'U'}</div>
                      )}
                      <span className="absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-green-500" style={{ display: 'none' }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.from || 'Conversation'}</h4>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">{p.time ? new Date(p.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-500 truncate">{p.text || 'No messages yet'}</p>
                    </div>

                    {p.unreadCount ? (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center min-w-max w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">{p.unreadCount > 9 ? '9+' : p.unreadCount}</span>
                      </div>
                    ) : null}

                    <div className="flex-shrink-0 relative opacity-100 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setConvItemMenuOpen((cur) => (cur === (p.bookingId || p.id) ? null : String(p.bookingId || p.id))) }} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors bg-gray-100 dark:bg-gray-800" title="Conversation options">
                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                      </button>

                      {convItemMenuOpen === String(p.bookingId || p.id) && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3" onClick={async (e) => { e.stopPropagation(); try { const headers: Record<string,string> = { 'Content-Type': 'application/json' }; const token = localStorage.getItem('devlink_token'); if (token) headers['Authorization'] = `Bearer ${token}`; const id = encodeURIComponent(String(p.bookingId || p.id)); await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE', headers }).catch(() => null); setConvItemMenuOpen(null); await loadPreviews(); if (String(activeBookingId) === String(p.bookingId || p.id)) { setActiveBookingId(null); setMessages([]) } } catch (e) { console.warn('Failed to delete conversation', e) } }}>
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Delete
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3" onClick={async (e) => { e.stopPropagation(); try { const headers: Record<string,string> = { 'Content-Type': 'application/json' }; const token = localStorage.getItem('devlink_token'); if (token) headers['Authorization'] = `Bearer ${token}`; const id = encodeURIComponent(String(p.bookingId || p.id)); await fetch(`${API_BASE}/bookings/${id}/read`, { method: 'PUT', headers }).catch(() => null); setConvItemMenuOpen(null); await loadPreviews(); } catch (e) { console.warn('Failed to mark conversation read', e) } }}>
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Mark as read
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3" onClick={(e) => { e.stopPropagation(); setConvItemMenuOpen(null); handleMuteConversation(p.bookingId || p.id) }}>
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707a1 1 0 011.414 1.414L9.414 9H20a2 2 0 012 2v4a2 2 0 01-2 2H9.414l.293.293a1 1 0 001.414 1.414L9.586 15z" /></svg>
                            Mute
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3" onClick={async (e) => { e.stopPropagation(); setConvItemMenuOpen(null); await handleArchiveConversation(p.bookingId || p.id); if (showArchived) await fetchArchived(); else await loadPreviews(); }}>
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9-3h4" /></svg>
                            Archive
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 border-t border-gray-200 dark:border-gray-700" onClick={(e) => { e.stopPropagation(); setConvItemMenuOpen(null); handleBlockUser(p.bookingId || p.id) }}>
                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93a10 10 0 1414.14 14.14M4.93 19.07A10 10 0 0019.07 4.93" stroke="white" strokeWidth="2"/></svg>
                            Block
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center gap-3" onClick={(e) => { e.stopPropagation(); setConvItemMenuOpen(null); openReportModal(p.bookingId || p.id) }}>
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 6v0m0-18a9 9 0 110 18 9 9 0 010-18z" /></svg>
                            Report
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }}
            />
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="messages-main flex-1 bg-white dark:bg-[#0A0A0A] flex flex-col overflow-y-auto min-w-0">
        <div className="h-full flex flex-col">
          {!activeBookingId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
                  <MessageSquareIcon className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">No conversation selected</h2>
                  <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">Choose a conversation from the list to start messaging</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-8 py-5 flex items-center justify-between bg-white dark:bg-[#0F0F0F]">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activePreview?.from || 'Conversation'}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activePreview?.time ? `Last message at ${formatTs(activePreview.time)}` : 'Active now'}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  <button onClick={() => reloadConversation()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Reload">
                    <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button onClick={() => clearChat()} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors" title="Clear chat">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </button>
                  <div className="relative">
                    <button onClick={() => setConvMenuOpen((c) => !c)} title="More options" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                    </button>
                    {convMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3" onClick={() => { reloadConversation(); setConvMenuOpen(false) }}>
                          <RefreshCw className="w-4 h-4 flex-shrink-0" />
                          Reload
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3" onClick={() => { clearChat(); setConvMenuOpen(false) }}>
                          <Trash2 className="w-4 h-4 flex-shrink-0" />
                          Clear chat
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3" onClick={() => { setConvMenuOpen(false); handleMuteConversation(activeBookingId) }}>
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707a1 1 0 011.414 1.414L9.414 9H20a2 2 0 012 2v4a2 2 0 01-2 2H9.414l.293.293a1 1 0 001.414 1.414L9.586 15z" /></svg>
                          Mute
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3" onClick={() => { setConvMenuOpen(false); handleArchiveConversation(activeBookingId) }}>
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9-3h4" /></svg>
                          Archive
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 border-t border-gray-200 dark:border-gray-700" onClick={() => { setConvMenuOpen(false); handleBlockUser(activeBookingId) }}>
                          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93a10 10 0 1414.14 14.14M4.93 19.07A10 10 0 0019.07 4.93" stroke="white" strokeWidth="2"/></svg>
                          Block
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center gap-3" onClick={() => { setConvMenuOpen(false); openReportModal(activeBookingId) }}>
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 6v0m0-18a9 9 0 110 18 9 9 0 010-18z" /></svg>
                          Report
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Loading messages...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-3">
                      <MessageSquareIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
                      <p className="text-gray-600 dark:text-gray-400">No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((m, idx) => (
                    <div key={m.id} className="relative group" ref={idx === messages.length - 1 ? lastMsgRef : undefined}>
                      <MessageContainer message={{ id: m.id, text: m.content, textContent: m.content, ts: m.createdAt, createdAt: m.createdAt, sender: m.sender, status: m.status as any, reactions: m.reactions, attachments: (m as any).attachments || [] } as any} currentUserId={localStorage.getItem('devlink_user_id') || undefined}>
                        {m.content}
                      </MessageContainer>
                      <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setMsgMenuOpen((cur) => (cur === m.id ? null : m.id)) }}
                            title="Message options"
                            className="p-1.5 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:shadow-md transition-all"
                          >
                            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                          </button>

                          {msgMenuOpen === m.id && (
                            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3" onClick={() => { try { navigator.clipboard && navigator.clipboard.writeText(m.content || ''); } catch (e) {} setMsgMenuOpen(null) }}>
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                Copy
                              </button>
                              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3" onClick={() => { deleteMessage(m.id, 'me'); setMsgMenuOpen(null) }}>
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete for me
                              </button>
                              <button className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 border-t border-gray-200 dark:border-gray-700" onClick={() => { if (confirm('Delete message for everyone?')) deleteMessage(m.id, 'everyone'); setMsgMenuOpen(null) }}>
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete for everyone
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {Object.keys(typingUsers).length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-bounce" style={{animationDelay: '0ms'}} />
                      <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-bounce" style={{animationDelay: '150ms'}} />
                      <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-bounce" style={{animationDelay: '300ms'}} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{Object.values(typingUsers).map(u => u.firstName || 'Someone').join(', ')} typing...</span>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 px-8 py-5 bg-white dark:bg-[#0F0F0F]">
                <MessageInputWrapper onSubmit={(e?: React.FormEvent) => { e && e.preventDefault(); sendMessage() }} disabled={!input.trim() && selectedFiles.length === 0} onFilesChange={(files) => setSelectedFiles(files || [])} selectedFiles={selectedFiles}>
                  <div className="flex items-center gap-3">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                      placeholder="Type a message..."
                      className="flex-1 rounded-xl px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={1}
                    />
                    <button
                      onClick={(e) => { e.preventDefault(); sendMessage() }}
                      disabled={!input.trim() && selectedFiles.length === 0}
                      className="flex-shrink-0 p-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-colors"
                      title="Send message"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16027278 C3.50612381,-0.1 2.40987922,-0.3 1.77946707,0.3 C0.994623095,0.9 0.837654326,1.99346049 1.15159189,2.77894408 L3.03521743,9.25 C3.03521743,9.40710736 3.19218622,9.56421473 3.50612381,9.56421473 L16.6915026,10.35 C16.6915026,10.35 17.1624089,10.35 17.1624089,10.8429026 L17.1624089,11.6889879 C17.1624089,12.1602801 16.6915026,12.4744748 16.6915026,12.4744748 Z"/></svg>
                    </button>
                  </div>
                </MessageInputWrapper>
              </div>
            </>
          )}
        </div>
      </main>

      <BackToTop />
      {/* Report modal */}
      {reportModal.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setReportModal({ open: false })} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Report conversation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Tell us why you're reporting this conversation. Our moderation team will review it.</p>
            <input 
              className="w-full mb-4 px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Short reason" 
              value={reportModal.reason || ''} 
              onChange={(e) => setReportModal((s) => ({ ...(s || {}), reason: e.target.value }))} 
            />
            <textarea 
              className="w-full mb-4 px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
              rows={5} 
              placeholder="More details (optional)" 
              value={reportModal.details || ''} 
              onChange={(e) => setReportModal((s) => ({ ...(s || {}), details: e.target.value }))} 
            />
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium" onClick={() => setReportModal({ open: false })}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-medium" onClick={() => submitReport()}>Submit report</button>
            </div>
          </div>
        </div>
      )}
      {/* Blocked users modal */}
      {blockedModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setBlockedModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Blocked users</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Users you've blocked. You can unblock them here.</p>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
              {blockedUsers.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  No blocked users
                </div>
              ) : (
                blockedUsers.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {b.avatar ? (
                        <img src={b.avatar} alt={b.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">{(b.name && b.name.charAt(0)) || 'U'}</div>
                      )}
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{b.name || 'User'}</div>
                    </div>
                    <button 
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors" 
                      onClick={async () => { 
                        try { 
                          const headers: Record<string,string> = { 'Content-Type': 'application/json' }; 
                          const tokenLocal = localStorage.getItem('devlink_token'); 
                          if (tokenLocal) headers['Authorization'] = `Bearer ${tokenLocal}`; 
                          await fetch(`${API_BASE}/conversations/unblock/${encodeURIComponent(b.id)}`, { method: 'PUT', headers }).catch(() => null); 
                          await fetchBlockedUsers(); 
                          loadPreviews(); 
                        } catch (e) { console.warn('unblock failed', e) } 
                      }}
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium" onClick={() => setBlockedModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
 
