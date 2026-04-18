import React, { useState, useEffect } from 'react'
import { Star, MessageSquare } from 'lucide-react'

type RatingData = {
  _id: string
  reviewer: { _id: string; firstName: string; lastName: string; avatar: string }
  rating: number
  comment: string
  categories?: { communication?: number; expertise?: number; punctuality?: number; helpfulness?: number }
  createdAt: string
}

type RatingStats = {
  avgRating: number
  distribution: { [key: number]: number }
  totalRatings: number
}

export default function RatingDisplay({ mentorId, API_BASE }: { mentorId: string; API_BASE: string }) {
  const [ratings, setRatings] = useState<RatingData[]>([])
  const [stats, setStats] = useState<RatingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/ratings/mentor/${mentorId}?limit=5`)
        const j = await res.json()
        if (j.success && j.data) {
          setRatings(j.data.ratings)
          setStats(j.data.stats)
        }
      } catch (e) {
        console.warn('Failed to fetch ratings', e)
        setError('Failed to load ratings')
      } finally {
        setLoading(false)
      }
    }
    fetchRatings()
  }, [mentorId, API_BASE])

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading ratings...</div>
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-400" /> Ratings & Reviews
      </h3>

      {stats && (
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                {stats.avgRating.toFixed(1)}
              </div>
              <div className="flex gap-1 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(stats.avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stats.totalRatings} ratings</p>
            </div>
          </div>

          {/* Rating distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.distribution[stars] || 0
              const percentage = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0
              return (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-12">{stars}★</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
        {ratings.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No ratings yet</p>
        ) : (
          ratings.map((rating) => (
            <div key={rating._id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  {rating.reviewer.avatar && (
                    <img
                      src={rating.reviewer.avatar}
                      alt={rating.reviewer.firstName}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {rating.reviewer.firstName} {rating.reviewer.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(rating.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < rating.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>

              {rating.comment && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{rating.comment}</p>
              )}

              {/* Category ratings if provided */}
              {rating.categories && Object.keys(rating.categories).length > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {rating.categories.communication && <span>Communication: {rating.categories.communication}★ </span>}
                  {rating.categories.expertise && <span>Expertise: {rating.categories.expertise}★ </span>}
                  {rating.categories.punctuality && <span>Punctuality: {rating.categories.punctuality}★</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
