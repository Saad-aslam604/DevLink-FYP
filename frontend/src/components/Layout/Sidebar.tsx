import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, UsersIcon, CalendarIcon, MessageSquareIcon, SettingsIcon } from 'lucide-react';

type NavItem = { to: string; label: string; Icon: any };

const NAV: NavItem[] = [
  { to: '/app/dashboard', label: 'Dashboard', Icon: HomeIcon },
  // Display-only label change: show 'Senior Developers' in the UI while keeping internal routes/values unchanged
  { to: '/app/mentors', label: 'Senior Developers', Icon: UsersIcon },
  { to: '/app/sessions', label: 'Sessions', Icon: CalendarIcon },
  { to: '/app/messages', label: 'Messages', Icon: MessageSquareIcon },
  { to: '/app/settings', label: 'Settings', Icon: SettingsIcon },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: { collapsed: boolean; onToggle: () => void; mobileOpen?: boolean; onMobileClose?: () => void }) {
  return (
    <>
      {/* Desktop sidebar - normal flex layout */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-gray-800 text-white border-r border-gray-700 shrink-0 overflow-hidden">
        <div className="h-16 flex items-center px-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-purple-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12h18" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 7h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                <path d="M7 17h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
              </svg>
            </div>
            <span className="font-semibold">DevLink</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 min-h-0">
          <ul className="space-y-2">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600' : 'text-white/90 hover:bg-gray-700'}`}>
                  <n.Icon size={20} />
                  <span className="truncate">{n.label}</span>
                  {/** active pulse indicator */}
                  {/** NavLink provides isActive - show dot when active */}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700 text-xs text-gray-300 flex-shrink-0">© DevLink</div>
      </aside>

      {/* Mobile sliding drawer - stays fixed only on mobile */}
      <div className={`md:hidden fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 text-white transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} mt-16`}>
        <div className="h-16 flex items-center px-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/6" />
            <span className="font-semibold">DevLink</span>
          </div>
          <button type="button" onClick={() => onMobileClose?.()} aria-label="Close menu" className="ml-auto p-2">✕</button>
        </div>
        <nav className="py-4 px-2">
          <ul className="space-y-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} onClick={() => onMobileClose?.()} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-md text-base transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-white/90 hover:bg-gray-700'}`}>
                  <n.Icon size={20} />
                  <span>{n.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-700 text-xs text-gray-300 mt-auto">© DevLink</div>
      </div>

      {/* Overlay for mobile when open */}
      {mobileOpen && <div onClick={() => onMobileClose?.()} className="md:hidden fixed inset-0 z-30 bg-black/40" />}
    </>
  );
}
