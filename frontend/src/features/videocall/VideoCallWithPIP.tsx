import React, { useState, useEffect, useRef } from 'react'
import VideoCall from '../../components/Video/VideoCall'
import VideoPIP from './VideoPIP'
import EnhancedLiveCoding from '../collaboration/EnhancedLiveCoding'
import '../../styles/transitions.css'

export default function VideoCallWithPIP({ bookingId }: { bookingId: string }) {
  // Read mode from URL parameter
  const searchParams = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const urlMode = searchParams.get('mode')

  // (removed debug logs)

  // Mode defaults to 'coding' when ?mode=coding is present
  const [mode, setMode] = useState<'video' | 'coding'>(urlMode === 'coding' ? 'coding' : 'video')
  // Show the PIP overlay by default when starting in coding mode
  const [showPIP, setShowPIP] = useState<boolean>(urlMode === 'coding')
  // Remote stream captured from the active WebRTCCall
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  // Transition state
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const timers = useRef<{ showPIP?: any; finish?: any; loading?: any }>({})
  // Leave confirmation state (used to provide confirm function to WebRTCCall)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const leaveResolveRef = useRef<((ok: boolean) => void) | null>(null)
  const leaveConfirmButtonRef = useRef<HTMLButtonElement | null>(null)

  // Debounced mode switch with animation orchestration
  const changeMode = (target: 'video' | 'coding') => {
    if (target === mode) return
    // clear any existing timers
    try { if (timers.current.showPIP) clearTimeout(timers.current.showPIP) } catch (e) {}
    try { if (timers.current.finish) clearTimeout(timers.current.finish) } catch (e) {}
    try { if (timers.current.loading) clearTimeout(timers.current.loading) } catch (e) {}

    setIsTransitioning(true)
    setIsLoading(false)

    if (target === 'coding') {
      // fade out video, then show PIP slightly after
      timers.current.showPIP = setTimeout(() => setShowPIP(true), 140)
      // loading indicator if slow
      timers.current.loading = setTimeout(() => setIsLoading(true), 300)
      // finish transition
      timers.current.finish = setTimeout(() => {
        setIsTransitioning(false)
        setIsLoading(false)
      }, 600)
    } else {
      // exiting coding -> hide PIP first, then finish
      setShowPIP(false)
      timers.current.loading = setTimeout(() => setIsLoading(true), 300)
      timers.current.finish = setTimeout(() => {
        setIsTransitioning(false)
        setIsLoading(false)
      }, 500)
    }

    // finally set the target mode (this controls classes)
    setMode(target)
  }

  // Cleanup timers on unmount to avoid leaks
  useEffect(() => {
    return () => {
      try { if (timers.current.showPIP) clearTimeout(timers.current.showPIP) } catch (e) {}
      try { if (timers.current.finish) clearTimeout(timers.current.finish) } catch (e) {}
      try { if (timers.current.loading) clearTimeout(timers.current.loading) } catch (e) {}
    }
  }, [])

  // Function passed to WebRTCCall to ask parent for confirmation before ending
  const confirmLeave = () => {
    return new Promise<boolean>((resolve) => {
      leaveResolveRef.current = resolve
      setShowLeaveConfirm(true)
    })
  }

  // Focus and keyboard handling for modal
  useEffect(() => {
    if (!showLeaveConfirm) return
    // autofocus leave button when modal opens
    setTimeout(() => {
      try { leaveConfirmButtonRef.current?.focus() } catch (e) {}
    }, 50)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        try {
          if (leaveResolveRef.current) {
            leaveResolveRef.current(false)
            leaveResolveRef.current = null
          }
        } catch (err) {}
        setShowLeaveConfirm(false)
      }
      if (e.key === 'Enter') {
        try {
          if (leaveResolveRef.current) {
            leaveResolveRef.current(true)
            leaveResolveRef.current = null
          }
        } catch (err) {}
        setShowLeaveConfirm(false)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showLeaveConfirm])

  const VideoIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect x="3" y="6" width="14" height="12" rx="2" stroke="currentColor" />
      <polygon points="20,8 20,16 24,12" fill="currentColor" />
    </svg>
  )

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      {/* Both views are mounted to avoid unmount/remount cycles; visibility is toggled via CSS to keep VideoCall alive */}

      {/* Video view */}
      <div className={`transition-mode ${mode === 'video' && !isTransitioning ? 'mode-active' : (mode === 'video' && isTransitioning ? 'mode-exiting' : 'mode-exiting')}`}>
        <VideoCall onProvideRemoteStream={(s) => setRemoteStream(s)} confirmLeave={confirmLeave} />
      </div>

      {/* Coding view */}
      <div className={`transition-mode ${mode === 'coding' && !isTransitioning ? 'mode-active' : (mode === 'coding' && isTransitioning ? 'mode-exiting' : 'mode-exiting')}`}>
        <EnhancedLiveCoding bookingId={bookingId} />

        {/* PIP overlay (wrap to apply transition classes) */}
        <div className={`transition-pip ${showPIP ? 'pip-enter' : 'pip-exit'}`}>
          <VideoPIP
            stream={remoteStream}
            onClose={() => {
              changeMode('video')
            }}
            onExpand={() => {
              changeMode('video')
            }}
          />
        </div>
      </div>

      {/* Loading indicator when transition is slow */}
      {isLoading && (
        <div className="transition-loading" role="status">
          <div className="transition-spinner" />
          <div>Switching to {mode === 'video' ? 'Video Call' : 'Live Coding'}...</div>
        </div>
      )}

      {/* Leave confirmation modal supplied to WebRTCCall via confirmLeave */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* Backdrop - lighter for better visibility */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm modal-backdrop"
            onClick={() => {
              try { if (leaveResolveRef.current) { leaveResolveRef.current(false); leaveResolveRef.current = null } } catch (e) {}
              setShowLeaveConfirm(false)
            }}
            aria-hidden="true"
          />

          {/* Modal - high contrast */}
          <div className="relative bg-gray-800 border-2 border-red-600 rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeIn modal-content">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Leave Video Call?</h3>
            </div>

            <p className="text-gray-200 mb-6">
              Are you sure you want to leave this video call?
              <span className="block mt-2 font-medium text-red-300">
                You can rejoin anytime using the same link.
              </span>
            </p>

            <div className="flex gap-3">
              <button
                ref={leaveConfirmButtonRef}
                onClick={() => {
                  try { if (leaveResolveRef.current) { leaveResolveRef.current(true); leaveResolveRef.current = null } } catch (e) {}
                  setShowLeaveConfirm(false)
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                aria-label="Confirm leave call"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Yes, Leave Call
              </button>

              <button
                onClick={() => {
                  try { if (leaveResolveRef.current) { leaveResolveRef.current(false); leaveResolveRef.current = null } } catch (e) {}
                  setShowLeaveConfirm(false)
                }}
                className="flex-1 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white py-3 px-4 rounded-lg transition-colors"
                aria-label="Stay in call"
              >
                Stay in Call
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              Press ESC to cancel • Call ID: {bookingId?.slice(0, 8)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
