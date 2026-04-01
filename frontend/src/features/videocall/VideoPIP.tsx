import React, { useEffect, useRef, useState } from 'react'

export interface VideoPIPProps {
  videoElement?: React.ReactNode
  stream?: MediaStream | null
  defaultPosition?: { x: number; y: number }
  onClose?: () => void
  onExpand?: () => void
  storageKey?: string
}

const SIZE_PRESETS = {
  small: 160,
  medium: 320,
  large: 480,
} as const

const STORAGE_POS_KEY = (key?: string) => key || 'devlink_pip_pos'
const STORAGE_SIZE_KEY = (key?: string) => (key || 'devlink_pip_size')

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export default function VideoPIP({ videoElement, stream, defaultPosition, onClose, onExpand, storageKey }: VideoPIPProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_POS_KEY(storageKey))
      if (raw) return JSON.parse(raw)
    } catch (e) {}
    return defaultPosition || { x: 24, y: 24 }
  })

  const [size, setSize] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SIZE_KEY(storageKey))
      if (raw) return Number(raw)
    } catch (e) {}
    return SIZE_PRESETS.medium
  })

  const [minimized, setMinimized] = useState(false)
  const innerVideoRef = useRef<HTMLVideoElement | null>(null)
  const dragMeta = useRef<{ dragging: boolean; sx: number; sy: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    if (!innerVideoRef.current) return
    try {
      if (stream) {
        if (innerVideoRef.current.srcObject !== stream) innerVideoRef.current.srcObject = stream
        innerVideoRef.current.play().catch(() => {})
      } else {
        try { innerVideoRef.current.srcObject = null } catch (e) {}
      }
    } catch (e) { console.warn('VideoPIP set stream failed', e) }
  }, [stream])

  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      if (!dragMeta.current) return
      if (!dragMeta.current.dragging) return
      ev.preventDefault()
      const nx = dragMeta.current.ox + (ev.clientX - dragMeta.current.sx)
      const ny = dragMeta.current.oy + (ev.clientY - dragMeta.current.sy)
      // keep within viewport
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = size
      const h = Math.round(w * (9 / 16))
      const clampedX = clamp(nx, 8 - w, vw - 8)
      const clampedY = clamp(ny, 8 - h, vh - 8)
      setPos({ x: clampedX, y: clampedY })
    }

    const onUp = () => {
      if (dragMeta.current && dragMeta.current.dragging) {
        dragMeta.current.dragging = false
        try { localStorage.setItem(STORAGE_POS_KEY(storageKey), JSON.stringify(pos)) } catch (e) {}
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, pos, storageKey])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_SIZE_KEY(storageKey), String(size)) } catch (e) {}
  }, [size, storageKey])

  const handlePointerDown = (ev: React.PointerEvent) => {
    (ev.target as Element).setPointerCapture && (ev.target as Element).setPointerCapture(ev.pointerId)
    dragMeta.current = { dragging: true, sx: ev.clientX, sy: ev.clientY, ox: pos.x, oy: pos.y }
  }

  const setPreset = (preset: keyof typeof SIZE_PRESETS) => {
    const w = SIZE_PRESETS[preset]
    setSize(w)
    // optionally keep within viewport
    const vw = window.innerWidth
    const vh = window.innerHeight
    const h = Math.round(w * (9 / 16))
    const nx = clamp(pos.x, 8 - w, vw - 8)
    const ny = clamp(pos.y, 8 - h, vh - 8)
    setPos({ x: nx, y: ny })
    try { localStorage.setItem(STORAGE_POS_KEY(storageKey), JSON.stringify({ x: nx, y: ny })) } catch (e) {}
  }

  const handleClose = () => {
    // call provided callback; caller can remove the PIP or restore full-screen video
    onClose && onClose()
  }

  const handleExpand = () => {
    onExpand && onExpand()
  }

  const toggleMinimize = () => setMinimized(v => !v)

  // header controls: close, expand, size toggles, minimize
  return (
    <div
      ref={ref}
      aria-hidden={false}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size,
        height: minimized ? 40 : Math.round(size * (9 / 16)),
        zIndex: 999999,
        boxShadow: '0 10px 30px rgba(2,6,23,0.6)',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#000',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'width 200ms ease, height 200ms ease, transform 120ms ease',
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'none',
      }}
    >
      <div
        ref={headerRef}
        onPointerDown={handlePointerDown}
        style={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 8px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 3, background: '#10b981' }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e6eef8' }}>Picture-in-Picture</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button aria-label="size-small" title="Small" onClick={() => setPreset('small')} style={controlButtonStyle}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="10" rx="2" /></svg>
          </button>
          <button aria-label="size-medium" title="Medium" onClick={() => setPreset('medium')} style={controlButtonStyle}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2" /></svg>
          </button>
          <button aria-label="size-large" title="Large" onClick={() => setPreset('large')} style={controlButtonStyle}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="5" width="22" height="14" rx="2" /></svg>
          </button>
          <button aria-label="minimize" title="Minimize" onClick={toggleMinimize} style={controlButtonStyle}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <button aria-label="expand" title="Expand" onClick={handleExpand} style={controlButtonStyle}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11V3h-8" /><path d="M3 13v8h8" /><path d="M21 3l-10 10" /></svg>
          </button>
          <button aria-label="close" title="Close" onClick={handleClose} style={controlButtonStyle}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', background: '#000' }}>
        {minimized ? (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setMinimized(false)} style={{ width: 40, height: 40, borderRadius: 20, background: '#111827', border: 'none', color: '#e6eef8' }} aria-label="restore">
              {/* simple play triangle */}
              <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </button>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch' }}>
            <div style={{ width: '100%', height: '100%', display: 'block' }}>
              {/** If a MediaStream is provided, render a video element that uses it. Otherwise render the provided React node. */}
              {stream ? (
                <video ref={innerVideoRef} autoPlay playsInline muted={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                videoElement
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const controlButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#cbd5e1',
  padding: 6,
  borderRadius: 6,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}
