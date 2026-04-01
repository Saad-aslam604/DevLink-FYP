import React from 'react'
import type { Mentor } from '../../data/mentors'

type Props = {
  mentor: Mentor
  onView: (m: Mentor) => void
  onBook: (m: Mentor) => void
}

export default function MentorCard({ mentor, onView, onBook }: Props) {
  return (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="p-4 flex items-center gap-4">
        <img
          src={mentor.avatar}
          alt={`${mentor.name} avatar`}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{mentor.name}</h3>
                {/* Organization badge: display-only when the user object marks this account as an organization */}
                {((mentor as any).userType || '').toString().toLowerCase() === 'organization' && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-purple-100 text-purple-800">Organization</span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-300">{mentor.title}</p>
              <div className="mt-1">
                {/* Display-only: show 'Senior Developer' and 'Junior Developer' labels while keeping internal role values unchanged */}
                {mentor.role === 'mentor' ? (
                  <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">Senior Developer</span>
                ) : mentor.role === 'junior' ? (
                  <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-green-100 text-green-800">Junior Developer</span>
                ) : null}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-indigo-600">
                {mentor.pricePerHour ? `$${mentor.pricePerHour}/hr` : mentor.role === 'mentor' ? '$100-500/hr' : mentor.role === 'junior' ? '$0-50/hr' : 'Variable'}
              </div>
              <div className="text-xs text-gray-500">{mentor.rating}★</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex flex-wrap gap-1">
              {mentor.skills.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded"
                >
                  {s}
                </span>
              ))}
            </div>
            {/* Teaching level badge (profile tag) - subtle, not a page filter */}
            <div className="mt-2">
              <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                Available for: {mentor.level}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 flex items-center gap-3">
        <button
          onClick={() => onView(mentor)}
          className="text-sm px-4 py-2 rounded-md bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors duration-150 dark:border-blue-500 dark:text-blue-200 dark:hover:bg-blue-900/30"
        >
          View Profile
        </button>
        <button
          onClick={() => {
            // debug: ensure click reaches here
            // eslint-disable-next-line no-console
            console.log('MentorCard: Book clicked', mentor.id)
            onBook(mentor)
          }}
          className="ml-auto text-sm px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          Book Meeting
        </button>
      </div>
    </div>
  )
}
