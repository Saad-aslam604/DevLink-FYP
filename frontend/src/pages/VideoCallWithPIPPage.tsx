import React from 'react'
import { useParams } from 'react-router-dom'
import VideoCallWithPIP from '../features/videocall/VideoCallWithPIP'

export default function VideoCallWithPIPPage(): JSX.Element {
  const { bookingId } = useParams<{ bookingId?: string }>()

  if (!bookingId) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h3>Missing Booking ID</h3>
        <p>Please provide a valid booking ID in the URL.</p>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh' }}>
      <VideoCallWithPIP bookingId={bookingId} />
    </div>
  )
}
