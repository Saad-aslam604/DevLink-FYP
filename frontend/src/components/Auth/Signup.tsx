import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Signup() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signUp({ name, email, password, role })
    setLoading(false)
    if (error) setError(typeof error === 'string' ? error : String(error))
    else navigate('/app/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Create your account</h2>
        {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-3">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Full name</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
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
            <input
              type="password"
              className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">What describes you best?</label>
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2"
            >
              <option value="">Select your role...</option>
              <option value="student">Student - I want to learn coding</option>
              <option value="junior">Junior Developer - I can help beginners ($0-50/hour)</option>
            </select>

            {/* Role descriptions */}
            {role === '' && (
              <p className="mt-2 text-sm text-gray-600">Choose the option that best describes you.</p>
            )}
            {role === 'student' && (
              <p className="mt-2 text-sm text-gray-600">
                Book sessions with developers to learn. Cannot offer paid sessions.
              </p>
            )}
            {role === 'junior' && (
              <p className="mt-2 text-sm text-gray-600">
                Help beginners while earning $0-50/hour. You can also learn from Senior Developers.
              </p>
            )}
            {/* mentor option removed from signup to prevent immediate mentor access */}
          </div>

          <button
            type="submit"
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          Already have an account? <Link className="text-indigo-600" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
