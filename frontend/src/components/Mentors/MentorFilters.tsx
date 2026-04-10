import React from 'react'

type Filters = {
  search: string
  skills: string[]
  availableOnly: boolean
  providerType: 'all' | 'mentor' | 'junior'
}

type Props = {
  allSkills: string[]
  filters: Filters
  onChange: (next: Filters) => void
}

export default function MentorFilters({ allSkills, filters, onChange }: Props) {
  const toggleSkill = (skill: string) => {
    const has = filters.skills.includes(skill)
    onChange({ ...filters, skills: has ? filters.skills.filter((s) => s !== skill) : [...filters.skills, skill] })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <input
          value={filters.search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search Senior Developer"
          className="w-full px-3 py-3 bg-white text-gray-800 border border-gray-200 rounded-md placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400"
        />
        {/* level selector removed per request - filtering by experience level is no longer shown in the UI */}
        <select
          value={filters.providerType || 'all'}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...filters, providerType: e.target.value as any })}
          className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-200 rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
        >
          <option value="all">Show all</option>
          <option value="mentor">Senior Developers only</option>
          <option value="junior">Junior Developers only</option>
        </select>
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-2">Skills</div>
        <div className="flex flex-wrap gap-2">
          {allSkills.map((s) => {
            const active = filters.skills.includes(s)
            return (
              <button
                key={s}
                onClick={() => toggleSkill(s)}
                className={`px-2 py-1 text-xs rounded ${
                  active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
