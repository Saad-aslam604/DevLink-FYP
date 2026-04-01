import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  console.log('ProtectedRoute - user:', user, 'loading:', loading)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }
  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to /login')
    return <Navigate to="/login" replace />
  }
  console.log('ProtectedRoute - User authenticated, rendering children')
  return children
}
