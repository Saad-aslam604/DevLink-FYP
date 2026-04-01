import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../UX/ToastProvider'

export default function ForgotPassword() {
  const { forgotPassword } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await forgotPassword(email)
      if (res.error) {
        setError(res.error)
        toast.show(res.error, 'error')
      } else {
        const msg = 'If the email exists, password reset instructions were sent.'
        setMessage(msg)
        toast.show(msg, 'success')
      }
    } catch (err: any) {
      setError(String(err))
      toast.show(String(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Reset your password</h2>
        {message && <div className="bg-green-50 text-green-700 p-2 rounded mb-3">{message}</div>}
        {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-3">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
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

          <button
            type="submit"
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Sending…' : 'Send reset instructions'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          Remembered your password? <Link className="text-indigo-600" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
