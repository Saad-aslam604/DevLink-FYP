import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import VideoCallButton from '../components/Video/VideoCallButton'

export default function SessionConfirmation() {
  const { state } = useLocation() as any
  const navigate = useNavigate()
  const mentor = state?.mentor
  const booking = state?.booking

  if (!mentor || !booking) {
      return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">No booking found</h2>
        <p className="mt-2 text-sm text-gray-500">It looks like you arrived at this page without completing a booking.</p>
        <div className="mt-4">
          <button onClick={() => navigate('/app/mentors')} className="px-3 py-2 bg-indigo-600 text-white rounded">Find a Senior Developer</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-lg p-6 shadow">
  <h2 className="text-2xl font-semibold">Meeting confirmed</h2>
  <p className="text-sm text-gray-600 mt-2">Your meeting is scheduled. Below are the details.</p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">Senior Developer</div>
            <div className="mt-1 font-medium">{mentor.name}</div>
            <div className="text-sm text-gray-500">{mentor.title}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">When</div>
            <div className="mt-1 font-medium">{booking.date} {booking.time}</div>
            <div className="text-sm text-gray-500">{booking.duration} minutes • {booking.meetingType}</div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {/* Show video join button if booking is confirmed and current time is within meeting timeframe */}
          {(() => {
            try {
              const start = booking?.startTime ? new Date(booking.startTime) : (booking?.date ? new Date(booking.date) : null)
              const startMs = start ? start.getTime() : null
              const duration = booking?.duration || 0
              const endMs = startMs ? (startMs + duration * 60000) : null
              const now = Date.now()
              const isConfirmed = String(booking?.status || '').toLowerCase() === 'confirmed'
              if (isConfirmed && startMs && endMs && now >= startMs && now <= endMs) {
                return <VideoCallButton bookingId={String(booking._id || booking.id || booking.bookingId || '')} />
              }
            } catch (e) {}
            return null
          })()}

          <button onClick={() => navigate('/app/sessions')} className="px-3 py-2 border rounded">My meetings</button>
          <button onClick={() => navigate('/app/mentors')} className="px-3 py-2 bg-indigo-600 text-white rounded">Back to Senior Developers</button>
        </div>
      </div>
    </div>
  )
}
