import React, { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../UX/ToastProvider'

function passwordStrength(pw: string) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>()
  const { resetPassword } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) return setError('Passwords do not match')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (!token) return setError('Missing reset token')

    setLoading(true)
    try {
      const res = await resetPassword(token, password)
      if (res.error) {
        setError(res.error)
        toast.show(res.error, 'error')
      } else {
        toast.show('Password reset successful', 'success')
        navigate('/login')
      }
    } catch (err: any) {
      setError(String(err))
      toast.show(String(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  const strength = passwordStrength(password)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Choose a new password</h2>
        {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-3">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">New password</label>
            <input
              type="password"
              className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="mt-2 text-xs text-gray-500">Strength: {strength}/4</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Confirm password</label>
            <input
              type="password"
              className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 p-2"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          Back to <Link className="text-indigo-600" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
