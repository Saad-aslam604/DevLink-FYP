import React from 'react'
import { Navigate } from 'react-router-dom'
import useAdminAuth from '../../hooks/useAdminAuth'

export default function AdminProtectedRoute({ children }: { children: JSX.Element }) {
  const { token, loading } = useAdminAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
