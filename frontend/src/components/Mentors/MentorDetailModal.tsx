import React from 'react'
import type { Mentor } from '../../data/mentors'

type Props = {
  mentor: Mentor | null
  onClose: () => void
  onBook: (m: Mentor) => void
}

export default function MentorDetailModal({ mentor, onClose, onBook }: Props) {
  if (!mentor) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full z-50 overflow-hidden">
        <div className="p-6 flex gap-4">
          <img src={mentor.avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover" />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{mentor.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-300">{mentor.title}</p>
                <div className="mt-2">
                  <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    Available for: {mentor.level}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-indigo-600">${mentor.pricePerHour}/hr</div>
                <div className="text-xs text-gray-500">{mentor.rating}★</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{mentor.bio}</p>

            <div className="mt-4 text-sm">
              <div className="text-xs text-gray-500">Skills</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {mentor.skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                    onClick={() => {
                      // optional: could be used to filter/search by skill
                      // eslint-disable-next-line no-console
                      console.log('Skill clicked:', s)
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors duration-150 dark:border-blue-500 dark:text-blue-200 dark:hover:bg-blue-900/30"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              // debug: ensure click reaches here
              // eslint-disable-next-line no-console
              console.log('MentorDetailModal: Book clicked', mentor.id)
              onBook(mentor)
            }}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            Book Meeting
          </button>
        </div>
      </div>
    </div>
  )
}
