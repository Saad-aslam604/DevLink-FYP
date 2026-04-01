import React, { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import CheckoutStepper from '../components/CheckoutStepper'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

function CheckoutForm({ bookingId, booking }: { bookingId: string; booking?: any }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  // Determine theme for styling the Stripe CardElement
  const prefersDark = (typeof window !== 'undefined') && (document.documentElement.classList.contains('dark') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches))
  const cardOptions = {
    hidePostalCode: true,
    style: {
      base: {
        color: prefersDark ? '#f8fafc' : '#0f172a',
        fontSize: '16px',
        '::placeholder': { color: prefersDark ? '#94a3b8' : '#6b7280' },
        fontSmoothing: 'antialiased'
      },
      invalid: { color: '#ef4444' }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
    setLoading(true)
    try {
      // Create payment intent server-side (use central api so auth header is attached)
      const j = await api.post('/payments/create-intent', { bookingId })
      if (!j || !j.success) throw new Error((j && (j.message || j.error)) || 'Failed to create payment intent')
  const clientSecret = j.data && j.data.clientSecret
  const stripePaymentIntentId = j.data && (j.data.stripePaymentIntentId || j.data.intentId || null)

      // If clientSecret looks like a real Stripe client secret (contains '_secret_'), use Stripe.js
      if (typeof clientSecret === 'string' && clientSecret.includes('_secret_')) {
        if (!stripe || !elements) throw new Error('Stripe.js has not loaded yet')
        const card = elements.getElement(CardElement)
        if (!card) throw new Error('Card element not found')
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, { payment_method: { card } })
        if (error) throw error
        if (paymentIntent && paymentIntent.status === 'succeeded') {
          // Optionally call server-side confirm (records already updated by webhook)
          await api.post('/payments/confirm', { paymentIntentId: paymentIntent.id })
          try { window.dispatchEvent(new CustomEvent('booking:paid', { detail: { bookingId } })) } catch (e) {}
          navigate(`/app/payment-success?bookingId=${bookingId}`)
        } else {
          throw new Error('Payment failed')
        }
      } else {
        // Mock mode (no real Stripe) - server returns a mock client secret. Confirm server-side directly.
        if (!stripePaymentIntentId) throw new Error('Missing payment intent id for mock confirmation')
        await api.post('/payments/confirm', { paymentIntentId: stripePaymentIntentId })
        try { window.dispatchEvent(new CustomEvent('booking:paid', { detail: { bookingId } })) } catch (e) {}
        navigate(`/app/payment-success?bookingId=${bookingId}`)
      }
    } catch (err: any) {
      alert(err?.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="max-w-md mx-auto p-4 space-y-4" spellCheck={false}>
  <div className="rounded-md border p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="text-sm font-medium mb-2">Payment summary</div>
        <div className="flex justify-between text-sm"><div>Session price</div><div className="font-medium">{booking && booking.price ? `$${((Number(booking.price) / 100)).toFixed(2)}` : '—'}</div></div>
        <div className="flex justify-between text-sm mt-1"><div>Platform fee (15%)</div><div className="text-gray-600 dark:text-gray-300">{booking && booking.price ? `$${((Number(booking.price) * 0.15) / 100).toFixed(2)}` : '—'}</div></div>
        <div className="flex justify-between text-sm mt-1"><div>Mentor receives</div><div className="font-medium">{booking && booking.price ? `$${((Number(booking.price) * 0.85) / 100).toFixed(2)}` : '—'}</div></div>
      </div>

      <div className="rounded-md border p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">Card details</label>
        <div className="mt-2 p-3 border rounded bg-gray-50 dark:bg-gray-700"><CardElement options={cardOptions as any} /></div>
        <div className="text-xs text-gray-500 dark:text-gray-300 mt-2">Secure payment powered by Stripe. Use test card <span className="font-mono">4242 4242 4242 4242</span>.</div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="px-2 py-1 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-200 rounded text-xs">SSL</span>
          <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded text-xs">Stripe Secured</span>
        </div>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Processing…' : 'Pay'}</button>
      </div>
    </form>
  )
}

export default function CheckoutPage() {
  const [params] = useSearchParams()
  const bookingId = params.get('bookingId') || ''
  const [booking, setBooking] = useState<any | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const token = localStorage.getItem('devlink_token') || localStorage.getItem('token') || null
        if (!token) {
          // No token: redirect to login
          navigate('/login')
          return
        }

        const res = await api.get(`/bookings/${bookingId}`)
        if (res && res.success && res.data && res.data.booking) setBooking(res.data.booking)
        else throw new Error('Failed to load booking')
      } catch (err: any) {
        // If unauthorized, clear token and redirect to login
        if (err && err.status === 401) {
          try { localStorage.removeItem('devlink_token'); localStorage.removeItem('token') } catch (e) {}
          navigate('/login')
          return
        }
        console.error('Failed to fetch booking:', err)
      }
    }

    if (bookingId) fetchBooking()
  }, [bookingId, navigate])

  if (!bookingId) return <div className="p-6">Invalid checkout link — missing booking id.</div>

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <CheckoutStepper steps={["Booking", "Payment", "Confirmation"]} current={1} />
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Checkout</h2>
          {booking ? (
            <>
              <div className="mb-4 text-sm text-gray-700 dark:text-gray-200">Paying for session with {booking.mentor && (booking.mentor.firstName || booking.mentor.name || 'mentor')}</div>
              <CheckoutForm bookingId={bookingId} booking={booking} />
            </>
          ) : (
            <div className="p-4 text-gray-700 dark:text-gray-200">Loading booking…</div>
          )}
        </div>
      </div>
    </Elements>
  )
}
