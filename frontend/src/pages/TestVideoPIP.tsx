import React from 'react'
import VideoCallWithPIP from '../features/videocall/VideoCallWithPIP'

export default function TestVideoPIP() {
  const [bookingId, setBookingId] = React.useState('test-session-' + Date.now())

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* TEST BANNER - Clear this is for testing */}
      <div
        style={{
          background: '#fef3c7',
          color: '#92400e',
          padding: '12px',
          textAlign: 'center',
          borderBottom: '2px solid #f59e0b',
        }}
      >
        <strong>TEST MODE:</strong> Video Call + PIP Integration Testing
        <div style={{ fontSize: '12px', marginTop: '4px' }}>Booking ID: {bookingId} • This page is for development testing only</div>
      </div>

      {/* Main test area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <VideoCallWithPIP bookingId={bookingId} />
      </div>

      {/* Test controls footer */}
      <div
        style={{
          background: '#f8fafc',
          padding: '12px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <button onClick={() => setBookingId('test-session-' + Date.now())} style={{ padding: '8px 16px', fontSize: '14px' }}>
          New Test Session
        </button>
        <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', fontSize: '14px' }}>
          Reload Page
        </button>
      </div>
    </div>
  )
}
