import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProtectedRoute from '../components/Auth/ProtectedRoute'

export default function RegisterOrganization() {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem('devlink_token') || undefined
      const body = { organizationDetails: { name, website, address, contactName, contactEmail, description } }
      const res = await fetch(`/api/users/register-organization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j && j.message ? j.message : 'Failed to register organization')
      // On success navigate to organization dashboard with proper app route
      navigate('/app/organization-dashboard')
    } catch (err: any) {
      alert(err?.message || 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Register your Organization</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">This will convert your account into an organization account for team/project management features. This action is additive and reversible by admin.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">Organization name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">Website</label>
          <input value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">Primary contact name</label>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">Primary contact email</label>
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required type="email" className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">Short description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2" rows={4} />
        </div>

        <div>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{loading ? 'Submitting…' : 'Register Organization'}</button>
        </div>
      </form>
    </div>
  )
}
