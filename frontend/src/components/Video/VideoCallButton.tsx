import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../UX/ToastProvider'

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

export default function VideoCallButton({ bookingId }: { bookingId: string }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  async function handleClick() {
    try {
      setError(null)
      setLoading(true)
      // For WebRTC-based flows we no longer create provider rooms on the server.
      // Directly navigate to the session's video page which will use Socket.IO + WebRTC.
      navigate(`/app/video/${bookingId}`)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading} className={`px-3 py-1 rounded-md ${loading ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'} text-white`}>{loading ? 'Starting…' : 'Start Video Call'}</button>
      {error ? <div className="text-xs text-red-500 mt-1">{error}</div> : null}
    </div>
  )
}
