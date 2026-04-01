import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAdminAuth from '../../hooks/useAdminAuth'
import GoogleSignIn from '../../components/Auth/GoogleSignIn'

export default function AdminLogin() {
  const { signIn } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    // This stops the page from reloading
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signIn(email, password)
    setLoading(false)
    if (res && res.success) {
      navigate('/admin')
    } else {
      setError(res.error || 'Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Sign in to DevLink</h2>
        {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
            <input
              type="email"
              className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
          <div className="mt-3 text-right">
            <a className="text-sm text-indigo-600 hover:underline" href="/forgot-password">Forgot password?</a>
          </div>
            <input
              type="password"
              className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <GoogleSignIn />

        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          New to DevLink? <Link className="text-indigo-600" to="/signup">Create an account</Link>
        </p>
        </div>
      </main>
    </div>
  )
}
