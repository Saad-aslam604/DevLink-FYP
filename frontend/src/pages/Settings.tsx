import React, { useEffect, useRef, useState } from 'react'
import { useToast } from '../components/UX/ToastProvider'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import MentorCard from '../components/Mentors/MentorCard'
import type { Mentor } from '../data/mentors'
import MentorDetailModal from '../components/Mentors/MentorDetailModal'
import SessionBooking from '../components/SessionBooking'

export default function Settings() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user, updateProfile, token } = useAuth()

  // Initialize state from AuthContext user/profile to keep Settings and Profile consistent
  const [name, setName] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [bio, setBio] = useState<string>('')
  const [avatar, setAvatar] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [recentMentors, setRecentMentors] = useState<Mentor[]>([])
  const [loadingMentors, setLoadingMentors] = useState(false)
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [portfolioItems, setPortfolioItems] = useState<Array<{ id?: string; title: string; description: string; link: string; image?: string }>>([])
  const [showPortfolioForm, setShowPortfolioForm] = useState(false)
  const [newPortfolio, setNewPortfolio] = useState({ title: '', description: '', link: '' })

  useEffect(() => {
    if (!user) return
  // user may be a profile object returned from /profiles/me or auth user shape
  const firstName = (user.firstName || user.name || '').toString()
    const lastName = (user.lastName || '').toString()
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
    setName(fullName || '')
    setTitle((user.title || '') as string)
    setBio((user.bio || '') as string)
    setAvatar((user.avatar || '') as string)
  }, [user])

  // Fetch recent mentors from API
  useEffect(() => {
    const fetchMentors = async () => {
      setLoadingMentors(true)
      try {
        const res = await fetch(`${API_BASE}/profiles/mentors?limit=2`)
        const j = await res.json()
        if (j && j.success && j.data && Array.isArray(j.data.results)) {
          const mapped: Mentor[] = j.data.results.slice(0, 2).map((u: any) => {
            const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email || 'Mentor'
            return {
              id: u._id,
              name,
              title: u.title || u.jobTitle || '',
              skills: (u.skills && u.skills.length) ? u.skills : (u.expertiseAreas || []),
              level: u.experienceLevel || 'Mid',
              experienceYears: u.experienceYears || 0,
              availability: (u.availabilitySlots && Array.isArray(u.availabilitySlots) && u.availabilitySlots.length > 0)
                ? Array.from(new Set(u.availabilitySlots.map((s: any) => s.day).filter(Boolean)))
                : (u.isAvailable ? ['Online'] : []),
              rating: typeof u.rating === 'number' ? u.rating : (typeof u.avgRating === 'number' ? u.avgRating : 0),
              bio: u.bio || u.mentorBio || '',
              avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
              pricePerHour: typeof u.hourlyRate === 'number' ? u.hourlyRate : (typeof u.pricePerHour === 'number' ? u.pricePerHour : 0),
              role: u.role,
              isAvailable: !!u.isAvailable,
            } as Mentor
          })
          setRecentMentors(mapped)
        }
      } catch (e) {
        console.warn('Failed to fetch mentors', e)
      } finally {
        setLoadingMentors(false)
      }
    }
    fetchMentors()
  }, [API_BASE])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    // Map name to firstName/lastName
    const parts = (name || '').split(' ').filter(Boolean)
    const firstName = parts.shift() || ''
    const lastName = parts.join(' ') || ''

    const patch: Record<string, any> = {
      firstName,
      lastName,
      avatar: avatar || undefined,
      bio: bio || undefined,
      title: title || undefined,
    }

    // clean undefined
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k])

    try {
      const res = await updateProfile(patch)
      if (res && res.error) throw new Error(res.error)
      toast.show('Profile updated!', 'success')
    } catch (err: any) {
      toast.show('Failed to update profile: ' + (err?.message ?? String(err)), 'error')
    }
  }

  // Open file picker to change avatar
  function onPickAvatar() {
    fileInputRef.current?.click()
  }

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await fetch(`${API_BASE}/profiles/me/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j || !j.success) {
        throw new Error((j && j.message) || 'Upload failed')
      }
      const newAvatar = j.data && j.data.profile ? j.data.profile.avatar : j.data && j.data.avatar
      if (newAvatar) setAvatar(newAvatar)
      toast.show('Avatar updated', 'success')
    } catch (err: any) {
      console.error('Avatar upload failed', err)
      toast.show('Failed to upload avatar: ' + (err?.message ?? String(err)), 'error')
    }
  }

  function handleAccountSave(e: React.FormEvent) {
    e.preventDefault()
    toast.show('Account settings saved (not implemented)', 'success')
  }

  const handleViewMentor = (mentor: Mentor) => {
    setSelectedMentor(mentor)
  }

  const handleBookMentor = (mentor: Mentor) => {
    setSelectedMentor(mentor)
    setBookingOpen(true)
  }

  function handleConfirmBooking(payload: any) {
    (async () => {
      try {
        const body = {
          mentorId: selectedMentor?.id,
          date: payload.date,
          time: payload.time,
          duration: Number(payload.duration),
          meetingType: payload.meetingType,
          notes: payload.notes || ''
        }

        try {
          const res = await (await import('../services/bookingsApi')).createBooking(body)
          const booking = (res && res.data && res.data.booking) ? res.data.booking : (res && res.booking) ? res.booking : null
          if (!booking) {
            toast.show((res && res.message) || 'Failed to create booking', 'error')
            return
          }
          navigate('/app/sessions/confirmation', { state: { mentor: selectedMentor, booking } })
        } catch (err: any) {
          console.warn('Booking create failed', err && err.body ? err.body : err)
          toast.show(err && err.body && err.body.message ? err.body.message : 'Failed to create booking', 'error')
          return
        }
      } catch (e) {
        console.error('Error creating booking:', e)
        toast.show('Failed to create booking - please try again', 'error')
      }
    })()
  }

  const addPortfolioItem = async () => {
    if (!newPortfolio.title.trim() || !newPortfolio.link.trim()) {
      toast.show('Title and link are required', 'error')
      return
    }
    try {
      const token = localStorage.getItem('devlink_token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      const res = await fetch(`${API_BASE}/profiles/portfolio`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: newPortfolio.title, description: newPortfolio.description, link: newPortfolio.link })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) {
        throw new Error((j && j.message) || 'Failed to add portfolio item')
      }
      const item = j.data && j.data.item ? j.data.item : newPortfolio
      setPortfolioItems([...portfolioItems, { ...item, id: item._id || item.id }])
      setNewPortfolio({ title: '', description: '', link: '' })
      setShowPortfolioForm(false)
      toast.show('Portfolio item added', 'success')
    } catch (err: any) {
      toast.show('Failed to add portfolio item: ' + (err?.message ?? String(err)), 'error')
    }
  }

  const deletePortfolioItem = async (itemId?: string) => {
    if (!itemId) return
    try {
      const token = localStorage.getItem('devlink_token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      await fetch(`${API_BASE}/profiles/portfolio/${itemId}`, {
        method: 'DELETE',
        headers
      })
      setPortfolioItems(portfolioItems.filter(item => item.id !== itemId))
      toast.show('Portfolio item deleted', 'success')
    } catch (err: any) {
      toast.show('Failed to delete portfolio item', 'error')
    }
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Manage your profile, notifications and account settings.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <main className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveProfile} className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200/10 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-2xl font-semibold text-gray-500 dark:text-gray-300">{(name || 'U').charAt(0).toUpperCase()}</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex gap-2 items-center">
                    <button type="button" onClick={onPickAvatar} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100">Change photo</button>
                    {avatar && (
                      <button type="button" onClick={() => setAvatar('')} className="px-3 py-2 rounded-md bg-transparent border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200">Remove</button>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-300 mt-2">Your profile photo appears across DevLink</div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>

              <div className="mt-4">
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>

              <div className="mt-4 flex gap-3">
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Save profile</button>
                <button type="button" onClick={() => { setName('Your name'); setTitle(''); setBio(''); }} className="px-4 py-2 rounded-md bg-transparent border border-gray-200 text-gray-700 dark:text-gray-200 dark:border-gray-600">Reset</button>
              </div>
            </form>

            {/* Portfolio Section */}
            <section className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200/10 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Portfolio</h2>
                <button
                  type="button"
                  onClick={() => setShowPortfolioForm(!showPortfolioForm)}
                  className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  {showPortfolioForm ? 'Cancel' : '+ Add Project'}
                </button>
              </div>

              {showPortfolioForm && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
                  <input
                    type="text"
                    placeholder="Project title"
                    value={newPortfolio.title}
                    onChange={(e) => setNewPortfolio({ ...newPortfolio, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <textarea
                    placeholder="Project description (optional)"
                    value={newPortfolio.description}
                    onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <input
                    type="url"
                    placeholder="Project link (e.g., https://github.com/...)"
                    value={newPortfolio.link}
                    onChange={(e) => setNewPortfolio({ ...newPortfolio, link: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addPortfolioItem}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Save Project
                    </button>
                  </div>
                </div>
              )}

              {portfolioItems.length > 0 ? (
                <div className="space-y-3">
                  {portfolioItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                        )}
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                        >
                          View Project →
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => deletePortfolioItem(item.id)}
                        className="px-3 py-2 rounded-md bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm hover:bg-red-200 dark:hover:bg-red-900/40 ml-4"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No portfolio items yet. Add your first project!</p>
                </div>
              )}
            </section>

            {/* Sample user cards for quick visual check */}
            <section className="mt-6">
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">People</h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {loadingMentors ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Loading mentors...</div>
                ) : recentMentors.length > 0 ? (
                  recentMentors.map((m) => (
                    <MentorCard key={m.id} mentor={m as any} onView={handleViewMentor} onBook={handleBookMentor} />
                  ))
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">No mentors available</div>
                )}
              </div>
            </section>

            <form onSubmit={handleAccountSave} className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200/10 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Email" className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input placeholder="Change password" type="password" className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>

              <div className="mt-4 flex gap-3">
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Save account</button>
              </div>
            </form>
          </main>

          <aside className="space-y-6">
            <div className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200/10 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Email notifications</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={smsNotifications} onChange={(e) => setSmsNotifications(e.target.checked)} />
                  <span className="text-sm text-gray-700 dark:text-gray-200">SMS notifications</span>
                </label>
              </div>
            </div>

            <div className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200/10 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Manage your two-factor authentication and connected devices from here.</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Mentor Detail Modal */}
      <MentorDetailModal mentor={selectedMentor} onClose={() => setSelectedMentor(null)} onBook={(m) => { setSelectedMentor(m); setBookingOpen(true) }} />

      {/* Booking Modal */}
      <SessionBooking
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        mentor={selectedMentor}
        onConfirm={(payload) => {
          setBookingOpen(false)
          handleConfirmBooking(payload)
          toast.show('Meeting booked', 'success')
        }}
      />
    </div>
  )
}

