import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import CollaborativeEditor from './CollaborativeEditor'
import FileManager from './enhancements/FileManager'
import UserPresence from './enhancements/UserPresence'
import SplitViewTerminal from './enhancements/SplitViewTerminal'
import { PlayIcon, UsersIcon } from './enhancements/Icons'

interface EnhancedLiveCodingProps {
  bookingId: string
  token?: string
  showBackButton?: boolean
  onBackToVideo?: () => void
}

export default function EnhancedLiveCoding({ bookingId, token, showBackButton, onBackToVideo }: EnhancedLiveCodingProps) {
  const [currentCode, setCurrentCode] = useState<string>('// Start coding...\nconsole.log("Hello World!");')
  const [language, setLanguage] = useState<string>('javascript')
  const [showPresencePanel, setShowPresencePanel] = useState(false)
  const presenceBtnRef = useRef<HTMLButtonElement | null>(null)
  const presencePanelRef = useRef<HTMLDivElement | null>(null)
  const [terminalHeight, setTerminalHeight] = useState<number>(() => {
    try {
      const h = localStorage.getItem('terminal-split-height')
      return h ? Math.max(150, Math.min(800, parseInt(h, 10) || 300)) : 300
    } catch (e) { return 300 }
  })
  const [terminalCollapsed, setTerminalCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('terminal-collapsed') === 'true' } catch (e) { return false }
  })
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false)
  const [saveBeforeEnd, setSaveBeforeEnd] = useState(true)

  // Poll Monaco to keep currentCode in sync (non-invasive)
  useEffect(() => {
    let mounted = true
    const poll = () => {
      try {
        const mon = (window as any).monaco
        if (!mon || !mon.editor || typeof mon.editor.getModels !== 'function') return
        const models = mon.editor.getModels()
        if (!models || models.length === 0) return
        const v = models[0].getValue()
        if (mounted && typeof v === 'string' && v !== currentCode) setCurrentCode(v)
      } catch (e) {
        // ignore
      }
    }
    const id = window.setInterval(poll, 500)
    poll()
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [currentCode])

  // Sync terminal dimension/collapsed state from localStorage so editor can add padding-bottom
  useEffect(() => {
    const read = () => {
      try {
        const h = localStorage.getItem('terminal-split-height')
        const c = localStorage.getItem('terminal-collapsed')
        if (h) setTerminalHeight(Math.max(150, Math.min(800, parseInt(h, 10) || 300)))
        if (c !== null) setTerminalCollapsed(c === 'true')
      } catch (e) {}
    }
    read()
    const onStorage = (ev: StorageEvent) => {
      if (!ev.key) return
      if (ev.key === 'terminal-split-height' || ev.key === 'terminal-collapsed') read()
    }
    window.addEventListener('storage', onStorage)
    const id = window.setInterval(read, 500)
    return () => { window.removeEventListener('storage', onStorage); clearInterval(id) }
  }, [])

  // Close presence panel when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!showPresencePanel) return
      const btn = presenceBtnRef.current
      const panel = presencePanelRef.current
      const target = e.target as Node | null
      if (panel && panel.contains(target)) return
      if (btn && btn.contains(target)) return
      setShowPresencePanel(false)
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [showPresencePanel])

  // Close presence panel on Escape key
  useEffect(() => {
    if (!showPresencePanel) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPresencePanel(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPresencePanel])

  // Debug: log when presence panel opens/closes
  useEffect(() => {
    /* presence panel state changed */
  }, [showPresencePanel])

  // Close end-session dialog with Escape
  useEffect(() => {
    if (!showEndSessionConfirm) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowEndSessionConfirm(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showEndSessionConfirm])

  const handleConfirmEndSession = async () => {
    try {
      if (saveBeforeEnd) {
        try {
          localStorage.setItem(`saved-session-${bookingId}`, JSON.stringify({ code: currentCode, savedAt: Date.now() }))
          /* session saved to localStorage */
        } catch (e) {
          console.warn('EnhancedLiveCoding: failed to save session locally', e)
        }
      }

      // Notify server via socket to end the session and video call
      const sock = (window as any).socket
      if (sock && typeof sock.emit === 'function') {
        try { 
          sock.emit('end-session', { bookingId })
          sock.emit('end-call', { bookingId })
        } catch (e) { console.warn('socket.emit failed', e) }
      } else {
        try { 
          window.dispatchEvent(new CustomEvent('devlink:end-session', { detail: { bookingId } }))
          window.dispatchEvent(new CustomEvent('devlink:end-call', { detail: { bookingId } }))
        } catch (e) { /* ignore */ }
      }

      try { localStorage.removeItem(`session-${bookingId}`) } catch (e) {}

      setShowEndSessionConfirm(false)

      // Priority 1: Use onBackToVideo callback if provided
      if (onBackToVideo) {
        try { onBackToVideo(); return } catch (e) { console.warn('onBackToVideo failed', e) }
      }

      // Priority 2: If this is a popup window with an opener, close it and notify opener
      if (window.opener) {
        try {
          window.opener.postMessage({ type: 'END_SESSION_FROM_CODING', bookingId }, window.location.origin)
          window.close()
          return
        } catch (e) { console.warn('Failed to notify opener or close window', e) }
      }

      // Priority 3: Try to go back in browser history
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const videoCallUrl = urlParams.get('returnUrl')
        if (videoCallUrl) {
          window.location.href = decodeURIComponent(videoCallUrl)
          return
        }
      } catch (e) { console.warn('Failed to use returnUrl', e) }

      // Priority 4: Try to find video call URL in sessionStorage
      try {
        const videoCallUrl = sessionStorage.getItem(`video-call-url-${bookingId}`)
        if (videoCallUrl) {
          window.location.href = videoCallUrl
          return
        }
      } catch (e) { console.warn('Failed to use sessionStorage', e) }

      // Priority 5: Go back to video call with booking ID
      window.location.href = `/app/video/${bookingId}`

    } catch (error) {
      console.error('Failed to end session:', error)
      // keep dialog open for retry; show user-friendly message
      alert('Failed to end session. Please try again.')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 w-full">
      {/* HEADER - FIXED AT TOP */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <PlayIcon size={18} />
            </div>
            <div>
              <h1 className="font-bold text-white">Live Coding</h1>
              <p className="text-xs text-gray-400">Session ID: {bookingId?.slice?.(0, 8) ?? ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm">Connected</span>
          </div>

          <div className="flex items-center relative">
            <button
              ref={presenceBtnRef}
              title="Participants"
              onClick={() => {
                /* presence panel toggled */
                setShowPresencePanel((s) => !s)
              }}
              className="p-1 rounded-md hover:bg-gray-800"
              aria-expanded={showPresencePanel}
            >
              <UserPresence roomId={bookingId} compact={true} />
            </button>

            {showPresencePanel &&
              createPortal(
                <div className="fixed inset-0 z-50 flex items-start justify-end p-6" onClick={() => setShowPresencePanel(false)}>
                  <div className="absolute inset-0 bg-black/40" />
                  <div
                    ref={presencePanelRef}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 360, maxHeight: '80vh' }}
                    className="relative shadow-2xl rounded bg-white dark:bg-gray-800 overflow-auto ring-2 ring-indigo-500/30"
                  >
                    <div style={{ padding: 8 }}>
                      <UserPresence roomId={bookingId} />
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* File Manager: simple save/load for the current editor code */}
          <FileManager
            code={currentCode}
            language={language}
            onCodeLoaded={(newCode) => {
              try {
                setCurrentCode(newCode)
                // If Monaco is available, update the editor model so the change is visible immediately
                try {
                  const mon = (window as any).monaco
                  if (mon && mon.editor && typeof mon.editor.getModels === 'function') {
                    const models = mon.editor.getModels()
                    if (models && models.length > 0) {
                      models[0].setValue(newCode)
                    }
                  }
                } catch (e) { console.warn('FileManager: failed to update Monaco model', e) }
              } catch (e) { console.warn('FileManager onCodeLoaded failed', e) }
            }}
          />
          <div className="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-2">
            <div className="text-sm text-gray-400">Language</div>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-transparent font-medium border-0 focus:outline-none dark:text-white text-gray-900">
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEndSessionConfirm(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium border border-red-700"
              title="End this coding session for all participants"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              End Session
            </button>
            {showBackButton && onBackToVideo && (
              <button
                onClick={onBackToVideo}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 5 17 10"/></svg>
                Back to Video
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN - SCROLLABLE */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        <div
          className="flex-1 min-h-0 relative border-b border-gray-800 editor-with-terminal"
          style={{ paddingBottom: terminalCollapsed ? 0 : `${terminalHeight}px`, transition: 'padding-bottom 0.18s ease' }}
        >
          <div className="absolute inset-0">
            <CollaborativeEditor bookingId={bookingId} initialCode={currentCode} language={language} />
          </div>
        </div>

        {/* Terminal is fixed at bottom; we still render it so it updates localStorage and UI */}
        <SplitViewTerminal code={currentCode} language={language} />
      </div>

      {showEndSessionConfirm && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowEndSessionConfirm(false)}>
          <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gray-800 rounded-xl p-6 border border-red-700 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">End Coding Session?</h3>
              </div>

              <p className="text-gray-300 mb-4">
                Are you sure you want to end this live coding session?
                <span className="block mt-2 text-red-300 font-medium">
                  All participants will be disconnected and unsaved code will be lost.
                </span>
              </p>

              <div className="mb-4 p-3 bg-gray-900 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveBeforeEnd}
                    onChange={(e) => setSaveBeforeEnd(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-gray-300">Save current code to my account before ending</span>
                </label>
                <p className="text-sm text-gray-500 mt-2 ml-7">You can restore it later from your session history.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmEndSession}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Yes, End Session
                </button>
                <button
                  onClick={() => setShowEndSessionConfirm(false)}
                  className="flex-1 border border-gray-600 text-gray-300 hover:bg-gray-700 py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">Session ID: {bookingId?.slice?.(0,8) ?? ''} • Started: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>, document.body)}

      {/* FOOTER */}
      <footer className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-gray-300">Live</span>
          </div>
          <div className="text-gray-500">Press <kbd className="px-1.5 py-0.5 bg-gray-900 rounded border border-gray-700">Ctrl+Space</kbd> for suggestions</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-gray-400">Lines: <span className="text-white">∞</span></div>
          <div className="text-gray-400">Encoding: <span className="text-white">UTF-8</span></div>
          <div className="text-gray-400"><span className="text-white">{language.toUpperCase()}</span></div>
        </div>
      </footer>
    </div>
  )
}
