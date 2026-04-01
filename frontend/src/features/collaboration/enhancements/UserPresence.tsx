import React, { useEffect, useState, useRef } from 'react'
import { initSocket, getSocket } from '../../../utils/socket'
import { UsersIcon } from './Icons'

type PresenceUser = {
  userId: string
  name: string
  color?: string
  joinedAt?: string
  sockets?: string[]
}

type Props = {
  roomId: string
  currentUserName?: string
  compact?: boolean
}

function shortTime(iso?: string) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString()
  } catch (e) { return iso }
}

export default function UserPresence({ roomId, currentUserName, compact }: Props) {
  const [users, setUsers] = useState<PresenceUser[]>([])
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<any>(null)
  const meRef = useRef<string | null>(null)

  useEffect(() => {
    initSocket()
    const s = getSocket()
    socketRef.current = s
    if (!s) {
      // no socket available right now
      setConnected(false)
      return
    }

    function setListFrom(arr: PresenceUser[]) {
      setUsers(arr.sort((a, b) => (a.name || '').localeCompare(b.name || '')))
    }

    const handleRoomUsers = (payload: any) => {
      if (!payload || payload.roomId !== roomId) return
      setListFrom((payload.users || []).map((u: any) => ({ userId: u.userId, name: u.name, color: u.color, joinedAt: u.joinedAt })))
    }

    const handleUserJoined = (payload: any) => {
      if (!payload || !payload.user) return
      setUsers(prev => {
        const exists = prev.find(p => p.userId === payload.user.userId)
        if (exists) return prev.map(p => p.userId === payload.user.userId ? { ...p, ...payload.user } : p)
        return [...prev, payload.user].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      })
    }

    const handleUserLeft = (payload: any) => {
      if (!payload || !payload.user) return
      setUsers(prev => prev.filter(p => p.userId !== payload.user.userId))
    }

    const onConnect = () => {
      setConnected(true)
    }

    const onDisconnect = () => setConnected(false)

    // helper to join presence room once socket is connected
    const joinPresenceRoom = (sock: any, rId: string) => {
      try {
        // request current users first
        if (sock && sock.emit) {
          sock.emit('presence-get-users', { roomId: rId }, (resp: any) => {
            try {
              if (resp && resp.success && Array.isArray(resp.users)) {
                const arr = resp.users.map((u: any) => ({ userId: u.userId, name: u.name, color: u.color, joinedAt: u.joinedAt }))
                setListFrom(arr)
              }
              if (resp && resp.user && resp.user.userId) meRef.current = resp.user.userId
            } catch (e) {}
          })

          // then join presence so server can track and broadcast
          sock.emit('presence-join', { roomId: rId, displayName: currentUserName }, (ack: any) => {
            try {
              if (ack && ack.success && ack.user) {
                meRef.current = ack.user.userId
              }
            } catch (e) {}
          })
        }
      } catch (e) { /* presence join failed */ }
    }

    s && s.on && s.on('connect', onConnect)
    s && s.on && s.on('disconnect', onDisconnect)
    s && s.on && s.on('presence-room-users', handleRoomUsers)
    s && s.on && s.on('presence-user-joined', handleUserJoined)
    s && s.on && s.on('presence-user-left', handleUserLeft)
    s && s.on && s.on('presence-update', (p: any) => { try { /* future: merge update */ } catch(e){} })
    s && s.on && s.on('presence-error', (err: any) => { console.warn('[presence] error', err) })

    // If socket already connected, join immediately; otherwise wait for connect
    if (s && (s as any).connected) {
      joinPresenceRoom(s, roomId)
    } else {
      const onceConnect = () => { joinPresenceRoom(s, roomId); s && s.off && s.off('connect', onceConnect) }
      s && s.on && s.on('connect', onceConnect)
    }

    // cleanup
    return () => {
      try {
        s && s.emit && s.emit('presence-leave', { roomId })
      } catch (e) {}
      try { s && s.off && s.off('connect', onConnect) } catch (e) {}
      try { s && s.off && s.off('disconnect', onDisconnect) } catch (e) {}
      try { s && s.off && s.off('presence-room-users', handleRoomUsers) } catch (e) {}
      try { s && s.off && s.off('presence-user-joined', handleUserJoined) } catch (e) {}
      try { s && s.off && s.off('presence-user-left', handleUserLeft) } catch (e) {}
    }
  }, [roomId, currentUserName])

  const count = users.length

  // If compact mode is requested, render a small inline badge suitable for headers
  // This avoids injecting the full presence panel into tight header areas.
  // Compact badge shows an icon, count and a small connected indicator.
  const CompactBadge = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e5e7eb' }}>
      <UsersIcon size={16} />
      <span style={{ fontSize: 13 }}>{count}</span>
      <svg width={10} height={10} viewBox="0 0 8 8">
        <circle cx={4} cy={4} r={4} fill={connected ? '#10b981' : '#ef4444'} />
      </svg>
    </div>
  )

  if (compact) {
    return <CompactBadge />
  }

  return (
    <div style={{ border: '1px solid #e6e6e6', padding: 10, borderRadius: 8, marginBottom: 8, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UsersIcon size={16} />
            <strong style={{ fontSize: 13 }}>Participants</strong>
          </div>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{count}</span>
          <svg width={12} height={12} viewBox="0 0 8 8" style={{ marginLeft: 4 }}>
            <circle cx={4} cy={4} r={4} fill={connected ? '#10b981' : '#ef4444'} />
          </svg>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{connected ? 'Connected' : 'Disconnected'}</div>
      </div>

      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {users.map(u => (
          <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: u.color || '#6b7280', fontWeight: 600 }}>
              {(u.name && u.name.charAt(0).toUpperCase()) || '?'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 13, color: '#111827' }}>
                {u.name} {meRef.current === u.userId ? <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>(You)</span> : null}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{shortTime(u.joinedAt)}</div>
            </div>
          </div>
        ))}
        {users.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7280' }}>No participants yet</div>
        ) : null}
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => {
              try {
                const s = getSocket()
                /* manual test - socket ready */
                /* manual test - room: */ roomId
                if (s && s.emit) s.emit('presence-get-users', { roomId })
              } catch (e) { console.debug('Manual test failed', e) }
            }}
            style={{ padding: '6px 8px', fontSize: 12, borderRadius: 6, background: '#3b82f6', color: 'white', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <UsersIcon size={14} /> <span>Test Presence</span>
          </button>
        </div>
      </div>
    </div>
  )
}
