import React, { useState } from 'react'
import { Star, X } from 'lucide-react'
import { useToast } from '../UX/ToastProvider'

type SubmitRatingProps = {
  mentorId: string
  bookingId: string
  API_BASE: string
  onSuccess?: () => void
  onClose?: () => void
}

export default function SubmitRating({ mentorId, bookingId, API_BASE, onSuccess, onClose }: SubmitRatingProps) {
  const toast = useToast()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState({
    communication: 0,
    expertise: 0,
    punctuality: 0,
    helpfulness: 0,
  })

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.show('Please select a rating', 'error')
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('devlink_token')
      const res = await fetch(`${API_BASE}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mentorId,
          bookingId,
          rating,
          comment,
          categories,
        }),
      })

      const j = await res.json()
      if (!res.ok || !j.success) {
        throw new Error(j.message || 'Failed to submit rating')
      }

      toast.show('Rating submitted successfully!', 'success')
      onSuccess?.()
      onClose?.()
    } catch (err: any) {
      toast.show('Failed to submit rating: ' + (err?.message || String(err)), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rate This Session</h3>
        {onClose && <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>}
      </div>

      {/* Main rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Overall Rating</label>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-all transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </p>
        )}
      </div>

      {/* Category ratings */}
      <div className="mb-6 space-y-3">
        {Object.entries(categories).map(([key, value]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
              {key}
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setCategories({ ...categories, [key]: star })}
                  className="transition-all"
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= value
                        ? 'fill-blue-400 text-blue-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Comment */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Your Review (Optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this mentor..."
          maxLength={1000}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          rows={4}
        />
        <p className="text-xs text-gray-500 mt-1">{comment.length}/1000</p>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
      >
        {submitting ? 'Submitting...' : 'Submit Rating'}
      </button>
    </div>
  )
}
