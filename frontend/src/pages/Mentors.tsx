import React, { useMemo, useState, useEffect } from 'react'
import type { Mentor } from '../data/mentors'
import MentorCard from '../components/Mentors/MentorCard'
import MentorFilters from '../components/Mentors/MentorFilters'
import MentorDetailModal from '../components/Mentors/MentorDetailModal'
import SessionBooking from '../components/SessionBooking'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/UX/EmptyState'
import Breadcrumbs from '../components/UX/Breadcrumbs'
import BackToTop from '../components/UX/BackToTop'
import { UsersIcon } from 'lucide-react'
import { useToast } from '../components/UX/ToastProvider'

export default function Mentors() {
  const [filters, setFilters] = useState({ search: '', skills: [] as string[], availableOnly: false, providerType: 'all' as 'all' | 'mentor' | 'junior' })
  const [selected, setSelected] = useState<Mentor | null>(null)

  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)

  const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

  useEffect(() => {
    let mounted = true
    const fetchMentors = async () => {
      // debug: flag that fetch is starting and show API base
      // eslint-disable-next-line no-console
      console.debug('Mentors.tsx: starting fetchMentors, API_BASE=', API_BASE)
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/profiles/mentors`)
        if (!mounted) return
        if (!res.ok) return setMentors([])
  const j = await res.json()
  // debug: log raw response to help trace why mentors may not be showing
  // eslint-disable-next-line no-console
  console.debug('Mentors.tsx: fetched /profiles/mentors response', j)
        if (j && j.success && j.data && Array.isArray(j.data.results)) {
          // Map backend user profile shape to frontend Mentor type
          const mapped = j.data.results.map((u: any) => {
            // build name with multiple fallbacks
            const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.displayName || u.email || 'Mentor'
            const levelRaw = (u.experienceLevel || '').toString().toLowerCase()
            const level = levelRaw.includes('jun') ? 'Junior' : levelRaw.includes('sen') ? 'Senior' : levelRaw.includes('lead') ? 'Lead' : levelRaw.includes('mid') ? 'Mid' : (u.role && u.role.toString().toLowerCase() === 'mentor' ? 'Senior' : 'Mid')
            const availability = (u.availabilitySlots && Array.isArray(u.availabilitySlots) && u.availabilitySlots.length > 0)
              ? Array.from(new Set(u.availabilitySlots.map((s: any) => s.day).filter(Boolean)))
              : (u.isAvailable ? ['Online'] : [])
            return {
              id: u._id,
              name,
              title: u.title || u.mentorBio || u.jobTitle || '',
              // prefer explicit skills array, fall back to expertiseAreas used by become-mentor
              skills: (u.skills && u.skills.length) ? u.skills : (u.expertiseAreas && u.expertiseAreas.length ? u.expertiseAreas : (u.skillsString ? (u.skillsString.split(',').map((s: string) => s.trim()).filter(Boolean)) : [])),
              level,
              experienceYears: u.experienceYears || 0,
              availability,
              rating: typeof u.rating === 'number' ? u.rating : (typeof u.avgRating === 'number' ? u.avgRating : 0),
              bio: u.bio || u.mentorBio || u.summary || '',
              avatar: u.avatar || u.picture || u.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
              // prefer hourlyRate, fall back to pricePerHour
              pricePerHour: typeof u.hourlyRate === 'number' ? u.hourlyRate : (typeof u.pricePerHour === 'number' ? u.pricePerHour : (typeof u.hourly === 'number' ? u.hourly : (typeof u.rate === 'number' ? u.rate : 0))),
              role: u.role || (u.isMentor ? 'mentor' : (u.isMentorVerified ? 'mentor' : (u.role || undefined))),
              isAvailable: !!u.isAvailable,
            } as Mentor
          })
          // debug: show raw backend results and mapped mentors
          // eslint-disable-next-line no-console
          console.log('🔍 RAW MENTORS:', j.data.results)
          // eslint-disable-next-line no-console
          console.log('🔍 MAPPED MENTORS:', mapped.slice(0, 10))
          // eslint-disable-next-line no-console
          console.log('🔍 TALHA FOUND:', mapped.find((m: any) => m.id === '6927690f584d4060a77e967e'))
          setMentors(mapped)
        } else {
          setMentors([])
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load mentors', e)
        setMentors([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchMentors()
    return () => { mounted = false }
  }, [API_BASE])

  const allSkills = useMemo(() => {
    const s = new Set<string>()
    mentors.forEach((m) => (m.skills || []).forEach((k) => s.add(k)))
    return Array.from(s).sort()
  }, [mentors])

  // levels UI removed; keep level on mentor objects for potential future use but don't expose as a filter

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return (mentors || []).filter((m) => {
      // availability filter
      if (filters.availableOnly && !m.isAvailable && !(m.availability || []).includes('Online')) return false
      // require that all selected filter skills are present on the mentor
      if (filters.skills.length > 0 && !filters.skills.every((sk) => (m.skills || []).includes(sk))) return false

      // provider type filter (apply regardless of search query)
      if (filters.providerType && filters.providerType !== 'all') {
        let providerMatch = false
        if (m.role) {
          providerMatch = m.role === filters.providerType
        } else {
          const lvl = (m.level || '').toString().toLowerCase()
          if (filters.providerType === 'mentor') providerMatch = lvl.includes('senior') || lvl.includes('lead')
          if (filters.providerType === 'junior') providerMatch = lvl.includes('junior')
        }
        if (!providerMatch) return false
      }

      // search query matching: if empty, let it pass (we already enforced provider/availability/skills)
      if (!q) return true
      const inName = (m.name || '').toLowerCase().includes(q)
      const inSkills = (m.skills || []).join(' ').toLowerCase().includes(q)
      return inName || inSkills
    })
  }, [filters, mentors])

  const [bookingOpen, setBookingOpen] = useState(false)
  const navigate = useNavigate()

  const handleBook = (m: Mentor) => {
    // debug: log when handler invoked
    // eslint-disable-next-line no-console
    console.log('Mentors.page: handleBook called', m.id)
    setSelected(m)
    setBookingOpen(true)
  }

  function handleConfirmBooking(payload: any) {
    // Call backend to create booking, then navigate to confirmation
    (async () => {
      try {
        const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'
        const token = localStorage.getItem('devlink_token') || undefined
        const headers: Record<string,string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        // payload expected to contain date, time, duration, meetingType
        const body = {
          mentorId: selected?.id,
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
          navigate('/app/sessions/confirmation', { state: { mentor: selected, booking } })
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

  const toast = useToast()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          {/* Display-only terminology mapping: "Mentor" -> "Senior Developer", "Junior" -> "Junior Developer" */}
          <h1 className="text-2xl font-semibold">Find a Senior Developer</h1>
          <p className="text-sm text-gray-500 mt-1">Search, filter and book 1:1 meetings with Senior Developers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <div className="sticky top-20">
            <MentorFilters allSkills={allSkills} filters={filters} onChange={setFilters} />
            <div className="mt-4 text-sm text-gray-500">Showing {filtered.length} Senior Developer{filtered.length !== 1 ? 's' : ''}</div>
          </div>
        </aside>

        <main className="lg:col-span-3">
          <Breadcrumbs items={[{ to: '/mentors', label: 'Senior Developers' }]} />

          {filtered.length === 0 ? (
            <EmptyState
              title="No Senior Developers match your criteria"
              subtitle="Try clearing filters or browse our full gallery to find the right match."
              Icon={UsersIcon}
              actions={[
                { label: 'Clear filters', onClick: () => { setFilters({ search: '', skills: [], availableOnly: false, providerType: 'all' }); toast.show('Filters cleared', 'info') }, variant: 'secondary' },
                { label: 'Browse all Senior Developers', onClick: () => { setFilters({ search: '', skills: [], availableOnly: false, providerType: 'all' }); toast.show('Showing all Senior Developers', 'info') }, variant: 'primary' }
              ]}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {filtered.map((m) => (
                <MentorCard key={m.id} mentor={m} onView={(mm) => setSelected(mm)} onBook={handleBook} />
              ))}
            </div>
          )}
        </main>
      </div>

      <MentorDetailModal mentor={selected} onClose={() => setSelected(null)} onBook={(m) => { setSelected(m); setBookingOpen(true) }} />

      <SessionBooking
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        mentor={selected}
        onConfirm={(payload) => {
          setBookingOpen(false)
          handleConfirmBooking(payload)
          toast.show('Meeting booked', 'success')
        }}
      />
      <BackToTop />
    </div>
  )
}
