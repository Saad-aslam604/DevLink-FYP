import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import EnhancedLiveCoding from '../features/collaboration/EnhancedLiveCoding'

export default function LiveCodingRoomPage(): JSX.Element {
  const { bookingId } = useParams<{ bookingId?: string }>()
  const effectiveBookingId = bookingId || 'shared-demo'
  const navigate = useNavigate()

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const initializeAuth = () => {
      try {
        // 1. First: check URL for token
        const urlParams = new URLSearchParams(window.location.search)
        const urlToken = urlParams.get('token')
        if (urlToken) {
          try {
            const decoded = decodeURIComponent(urlToken)
            localStorage.setItem('devlink_token', decoded)
            // Remove token from URL for security
            const clean = window.location.pathname + window.location.hash
            window.history.replaceState({}, '', clean)
            console.debug('Live Coding - Token received via URL')
            setIsAuthenticated(true)
            return
          } catch (e) { console.warn('Failed to parse token from URL', e) }
        }

        // 2. Check localStorage
        const stored = localStorage.getItem('devlink_token') || localStorage.getItem('token')
        if (stored) {
          console.debug('Live Coding - Using stored token')
          setIsAuthenticated(true)
          return
        }

        // 3. Try to copy from opener (parent video call window)
        if (window.opener) {
          try {
            const openerToken = window.opener.localStorage.getItem('devlink_token') || window.opener.localStorage.getItem('token')
            if (openerToken) {
              localStorage.setItem('devlink_token', openerToken)
              console.debug('Live Coding - Token copied from opener')
              setIsAuthenticated(true)
              return
            }
          } catch (e) {
            console.warn('Live Coding - cannot read opener localStorage (cross-origin?):', e)
          }
        }

        // No token found
        console.error('Live Coding - No authentication token found')
        setIsAuthenticated(false)
      } catch (e) {
        console.warn('Live Coding - auth init failed', e)
        setIsAuthenticated(false)
      }
    }

    initializeAuth()
  }, [navigate])

  // While we haven't determined auth state yet, show a neutral loading state
  if (isAuthenticated === null) {
    return <div style={{ padding: 24 }}>Loading…</div>
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 20, textAlign: 'center' }}>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>Authentication required</h3>
        <p style={{ color: '#6b7280' }}>We couldn't find a valid authentication token. Please return to the video call and try again.</p>
        <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 12px' }}>Retry</button>
          <button onClick={() => window.close()} style={{ padding: '8px 12px' }}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial, sans-serif', padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Live Coding Room</h1>
          <div style={{ color: '#6b7280', fontSize: 13 }}>Collaborative editing powered by Y.js</div>
        </div>
      </header>

      <main>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <EnhancedLiveCoding bookingId={effectiveBookingId} />
        </div>
      </main>
    </div>
  )
}
