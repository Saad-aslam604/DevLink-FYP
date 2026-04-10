import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

// Password validation function with detailed messages
function validatePassword(pwd: string) {
  const errors: string[] = []
  if (pwd.length < 6) errors.push('• Password must be at least 6 characters long')
  if (!/[A-Z]/.test(pwd)) errors.push('• Must contain at least one UPPERCASE letter')
  if (!/[a-z]/.test(pwd)) errors.push('• Must contain at least one lowercase letter')
  if (!/[0-9]/.test(pwd)) errors.push('• Must contain at least one number (0-9)')
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) errors.push('• Must contain at least one special character (!@#$%^&* etc)')
  return errors
}

export default function Signup() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('student')
  const [error, setError] = useState<string | null>(null)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    const errors = validatePassword(value)
    setPasswordErrors(errors)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validate password on submit
    const pwdErrors = validatePassword(password)
    if (pwdErrors.length > 0) {
      setError('Please fix password requirements before submitting')
      return
    }

    setLoading(true)
    const { error } = await signUp({ name, email, password, role })
    setLoading(false)
    if (error) {
      const errorMsg = typeof error === 'string' ? error : String(error)
      setError(errorMsg)
      // Show alert for email already exists errors
      if (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('exist')) {
        alert('❌ Email Already Exists!\n\nThis email is already registered. Please use a different email or try signing in instead.')
      }
    }
    else {
      // Show success message and redirect to login
      alert('✅ Account Created Successfully!\n\nYour account has been created. Please sign in with your credentials.')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Create your account</h2>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded mb-4 flex gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Registration Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}
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
              onChange={(e) => {
                setEmail(e.target.value)
                // Clear error when user changes email
                if (error?.toLowerCase().includes('already') || error?.toLowerCase().includes('exist')) {
                  setError(null)
                }
              }}
              required
              placeholder="your@email.com"
            />
            <p className="text-xs text-gray-500 mt-1">Use a unique email address</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`block w-full rounded-md dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 p-2 pr-10 border-2 ${
                  passwordErrors.length > 0 ? 'border-red-400' : password ? 'border-green-400' : 'border-gray-200'
                }`}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {/* Password Requirements List */}
            {password && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-200 dark:border-gray-600">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Password Requirements:</p>
                <div className="space-y-1">
                  <div className={`text-xs ${password.length >= 6 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    ✓ At least 6 characters
                  </div>
                  <div className={`text-xs ${/[A-Z]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    ✓ One UPPERCASE letter
                  </div>
                  <div className={`text-xs ${/[a-z]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    ✓ One lowercase letter
                  </div>
                  <div className={`text-xs ${/[0-9]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    ✓ One number (0-9)
                  </div>
                  <div className={`text-xs ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    ✓ One special character (!@#$%^&* etc)
                  </div>
                </div>
              </div>
            )}

            {/* Error Messages */}
            {passwordErrors.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">Password Issues:</p>
                <ul className="space-y-1">
                  {passwordErrors.map((err, i) => (
                    <li key={i} className="text-xs text-red-600 dark:text-red-400">{err}</li>
                  ))}
                </ul>
              </div>
            )}
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
