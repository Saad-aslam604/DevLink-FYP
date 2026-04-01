import React from 'react'
import { NavLink } from 'react-router-dom'
import { HomeIcon, UsersIcon, CalendarIcon, MessageSquareIcon, UserPlus } from 'lucide-react'

export default function BottomNav() {
  const items = [
    { to: '/app/dashboard', label: 'Home', Icon: HomeIcon },
  { to: '/app/mentors', label: 'Senior Developers', Icon: UsersIcon },
  { to: '/app/become-mentor', label: 'Become Senior Developer', Icon: UserPlus },
    { to: '/app/sessions', label: 'Sessions', Icon: CalendarIcon },
    { to: '/app/messages', label: 'Messages', Icon: MessageSquareIcon },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 border-t border-white/6 dark:border-gray-800 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className="flex-1 flex flex-col items-center justify-center text-sm text-gray-700 dark:text-gray-200 py-1">
              <it.Icon size={20} />
              <span className="text-xs mt-1">{it.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
