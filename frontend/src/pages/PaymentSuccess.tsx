import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function PaymentSuccess() {
  const [params] = useSearchParams()
  const bookingId = params.get('bookingId')
  const navigate = useNavigate()
  const [booking, setBooking] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        if (!bookingId) return
        // fetch booking details to show on success page
        const res = await api.get(`/bookings/${bookingId}`)
        if (res && res.success && res.data && res.data.booking) setBooking(res.data.booking)
      } catch (e) {
        console.warn('Failed to load booking on success page', e)
      } finally {
        // signal other pages to refresh (sessions)
        try { window.dispatchEvent(new CustomEvent('booking:paid', { detail: { bookingId } })) } catch (e) {}
        setLoading(false)
      }
    }
    load()
  }, [bookingId])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow text-center max-w-lg w-full">
        <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Payment successful</h2>
        {loading ? (
          <p className="mb-4 text-gray-700 dark:text-gray-200">Finalizing your booking…</p>
        ) : (
          <>
            <p className="mb-4 text-gray-700 dark:text-gray-200">Thank you! Your booking has been confirmed. A confirmation email has been sent.</p>
            {booking ? (
              <div className="text-left mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-300">Session with</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{booking.mentor?.firstName || booking.mentor?.name || 'Senior Developer'}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{booking.date || (booking.startTime ? new Date(booking.startTime).toLocaleString() : '')} • {booking.duration} min</div>
              </div>
            ) : null}
            <div className="flex gap-2 justify-center">
              <button onClick={() => navigate(`/app/sessions/confirmation?bookingId=${bookingId || ''}`)} className="px-4 py-2 bg-blue-600 text-white rounded">View Booking</button>
              <button onClick={() => navigate('/app/sessions')} className="px-4 py-2 border rounded text-gray-700 dark:text-gray-200">Go to Meetings</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
