import React from 'react'
import MainLayout from '../../components/Layout/MainLayout'
import { NavLink } from 'react-router-dom'

const navBtnBase = 'px-3 py-1.5 rounded-md text-sm font-medium transition-colors'
const navBtnInactive = 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
const navBtnActive = 'bg-indigo-600 text-white shadow-sm'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4 w-full">
          <h2 className="text-xl font-semibold">Admin Dashboard</h2>
          <nav className="ml-4 flex items-center gap-2 text-sm overflow-auto">
            <NavLink to="/admin" end className={({ isActive }) => `${navBtnBase} ${isActive ? navBtnActive : navBtnInactive}`}>
              Home
            </NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => `${navBtnBase} ${isActive ? navBtnActive : navBtnInactive}`}>
              Users
            </NavLink>
            <NavLink to="/admin/approvals" className={({ isActive }) => `${navBtnBase} ${isActive ? navBtnActive : navBtnInactive}`}>
              Mentor Applications
            </NavLink>
            <NavLink to="/admin/revenue" className={({ isActive }) => `${navBtnBase} ${isActive ? navBtnActive : navBtnInactive}`}>
              Revenue
            </NavLink>
          </nav>
        </div>
      </div>
      {children}
    </MainLayout>
  )
}
