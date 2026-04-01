import React from 'react'
import { UserCheck, Search, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DashboardOnboarding({ onBook }: { onBook: () => void }) {
  const navigate = useNavigate()

  return (
    <div className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200/10 dark:border-gray-700">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="flex-none">
          <div className="w-20 h-20 rounded-lg bg-indigo-50 dark:bg-indigo-900 flex items-center justify-center">
            <UserCheck size={36} className="text-indigo-600 dark:text-indigo-300" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Welcome to DevLink 👋</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Get set up with a few quick steps so you can find Senior Developers and schedule your first meeting.</p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-700 text-center">
              <UserCheck className="mx-auto text-indigo-600 dark:text-indigo-300" />
              <div className="mt-2 font-medium text-gray-900 dark:text-white">Complete profile</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Add bio and skills</div>
            </div>
            <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-700 text-center">
              <Search className="mx-auto text-indigo-600 dark:text-indigo-300" />
              <div className="mt-2 font-medium text-gray-900 dark:text-white">Find Senior Developers</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Browse Senior Developers by skill</div>
            </div>
            <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-700 text-center">
              <Calendar className="mx-auto text-indigo-600 dark:text-indigo-300" />
              <div className="mt-2 font-medium text-gray-900 dark:text-white">Book session</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Schedule your first meeting</div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={() => navigate('/app/settings')} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Complete profile</button>
            <button onClick={() => navigate('/app/mentors')} className="px-4 py-2 rounded-md bg-transparent border border-gray-200 text-gray-700 dark:text-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-white/5">Find Senior Developers</button>
            <button onClick={onBook} className="px-4 py-2 rounded-md bg-transparent border border-gray-200 text-gray-700 dark:text-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-white/5">Book session</button>
          </div>
        </div>
      </div>
    </div>
  )
}
