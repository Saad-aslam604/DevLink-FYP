import React, { useEffect, useMemo, useState } from 'react'
import AdminLayout from './AdminLayout'
import adminApi from '../../services/adminApi'

export default function UsersManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.fetchAdminUsers()
      if (res && res.success && Array.isArray(res.data)) setUsers(res.data)
    } catch (e) { console.warn('UsersManagement: fetch users failed', e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const changeRole = async (userId: string, role: string) => {
    try {
      const res = await adminApi.updateUserRole(userId, role)
      if (res && res.success) {
        setUsers((s) => s.map(u => u._id === userId ? { ...u, role } : u))
      }
    } catch (e) { console.warn('changeRole failed', e) }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase()
      const email = (u.email || '').toLowerCase()
      return name.includes(q) || email.includes(q) || String(u._id).includes(q)
    })
  }, [users, query])

  return (
    <AdminLayout>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Users</h3>
            {/* Display-only: terminology alignment for FYP docs: Mentor -> Senior Developer, Junior -> Junior Developer. 'Organization' is listed for clarity. */}
            <div className="mb-3 text-sm text-gray-500">Roles (display): Student, Junior Developer, Senior Developer, Organization, Admin</div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={load} className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">
              Refresh
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users by name or email"
            className="w-full sm:w-1/2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm text-gray-500">ID</th>
                <th className="px-4 py-2 text-left text-sm text-gray-500">Name</th>
                <th className="px-4 py-2 text-left text-sm text-gray-500">Email</th>
                <th className="px-4 py-2 text-left text-sm text-gray-500">Role</th>
                <th className="px-4 py-2 text-left text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map(u => (
                <tr key={u._id}>
                  <td className="px-4 py-2 text-sm">{String(u._id).slice(0,8)}</td>
                  <td className="px-4 py-2 text-sm">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-2 text-sm">{u.email}</td>
                  <td className="px-4 py-2 text-sm">{u.role}</td>
                  <td className="px-4 py-2 text-sm">
                    <select defaultValue={u.role} onChange={(e) => changeRole(u._id, e.target.value)} className="bg-gray-50 dark:bg-gray-900 border rounded px-2 py-1 text-sm">
                      <option value="student">Student</option>
                      <option value="junior">Junior Developer</option>
                      <option value="mentor">Senior Developer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {loading && <div className="text-sm text-gray-500 mt-2">Loading...</div>}
      </div>
    </AdminLayout>
  )
}
