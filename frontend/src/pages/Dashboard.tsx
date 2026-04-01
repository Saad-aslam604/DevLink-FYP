import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SessionBooking from '../components/SessionBooking'
import DashboardOnboarding from '../components/UX/DashboardOnboarding'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'

type Session = { id: string; mentor: string; startTime?: string; endTime?: string; duration?: number; status?: 'upcoming' | 'completed' | 'pending' }
type Message = { id: string; from: string; text: string; time: string }
type Activity = { id: string; title: string; time: string; meta?: string }

const now = new Date()

function addDaysStr(d: Date, days: number) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy.toISOString().slice(0, 10)
}

export default function Dashboard() {
  const { user } = useAuth() || {}
  const myId = user && (user._id || user.id || user?.uid) || null
  const navigate = useNavigate()

  // If this account is an organization, redirect to the Organization Dashboard (UI-only guard)
  React.useEffect(() => {
    try {
      const ut = String((user && (user as any).userType) || '').toLowerCase()
      if (ut === 'organization') {
        navigate('/app/organization-dashboard', { replace: true })
      }
    } catch (e) {}
  }, [user, navigate])

  const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

  const [profile, setProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [bookingsRaw, setBookingsRaw] = useState<any[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([])
  const [formattedActivities, setFormattedActivities] = useState<any[]>([])
  const [quickStats, setQuickStats] = useState<any>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // Normalize bookings into a stable shape
  const normalizedBookings = useMemo(() => {
    if (!Array.isArray(bookingsRaw)) return []
    return bookingsRaw.map((b: any) => {
      try {
        const id = b && (b._id || b.id || b.bookingId || String(Math.random()))
        const mentorId = b && (b.mentorId || (b.mentor && (b.mentor._id || b.mentor.id)) || (b.mentor && typeof b.mentor === 'string' ? b.mentor : null))
        const studentId = b && (b.studentId || (b.student && (b.student._id || b.student.id)) || null)
        const status = (b && (b.status || b.state || '') || '').toString().toLowerCase()
        let startMs: number | null = null
        if (typeof b.startMs === 'number') startMs = Number(b.startMs)
        if (!startMs && b.startTime) startMs = Number(new Date(b.startTime).getTime())
        if (!startMs && b.startAt) startMs = Number(new Date(b.startAt).getTime())
        if (!startMs && b.startsAt) startMs = Number(new Date(b.startsAt).getTime())
        if (!startMs && b.date) startMs = Number(new Date(b.date).getTime())
        if (!startMs && b.scheduledAt) startMs = Number(new Date(b.scheduledAt).getTime())
        if (!startMs && b.datetime) startMs = Number(new Date(b.datetime).getTime())

        let unreadRaw = b && (b.unreadCount ?? b.unread ?? b.unread_counts ?? b.unreadCounts ?? 0)
        let unreadCount: number = 0
        try {
          if (typeof unreadRaw === 'number') unreadCount = Number(unreadRaw) || 0
          else if (unreadRaw && typeof unreadRaw === 'object') {
            if (myId && (unreadRaw[myId] != null)) unreadCount = Number(unreadRaw[myId]) || 0
            else if (unreadRaw.total != null) unreadCount = Number(unreadRaw.total) || 0
            else unreadCount = Object.values(unreadRaw).reduce((s: number, v: any) => s + (Number(v) || 0), 0)
          } else unreadCount = 0
        } catch (e) { unreadCount = 0 }

        return { raw: b, id, mentorId, studentId, status, startMs, unreadCount }
      } catch (e) {
        return { raw: b, id: (b && (b._id || b.id)) || String(Math.random()), mentorId: null, studentId: null, status: '', startMs: null, unreadCount: 0 }
      }
    })
  }, [bookingsRaw, myId])

  // Derive upcoming sessions for the Dashboard only.
  // Rules (read-only, local only):
  // - session belongs to current user (mentorId or studentId matches myId)
  // - session start is in the future (timezone-safe via timestamps)
  // - and one of: status in scheduled|confirmed|paid OR paymentStatus === 'paid'
  const derivedUpcomingSessions = useMemo(() => {
    try {
      const nowMs = Date.now()
      const results: any[] = []
      const seen = new Set<string>()

      const pushIfValid = (s: any) => {
        try {
          if (!s) return
          const id = String(s.id || s._id || (s.raw && (s.raw._id || s.raw.id)) || JSON.stringify(s))
          if (seen.has(id)) return
          // determine startMs robustly
          let startMs: number | null = null
          if (typeof s.startMs === 'number') startMs = Number(s.startMs)
          // try common fields
          const tfields = ['startTime','start_at','start_at_ms','startAt','startsAt','scheduledAt','date','datetime','time','timestamp']
          for (const f of tfields) {
            if (startMs) break
            const rawVal = (s as any)[f] || (s.raw && s.raw[f])
            if (!rawVal) continue
            const attempt = Number(rawVal) || new Date(rawVal).getTime()
            if (attempt && !isNaN(attempt)) startMs = Number(attempt)
          }

          if (!startMs) return
          if (startMs <= nowMs) return

          // ensure belongs to this user if myId present
          if (myId) {
            const mentorId = s.mentorId || (s.mentor && (s.mentor._id || s.mentor.id)) || (s.raw && (s.raw.mentorId || (s.raw.mentor && (s.raw.mentor._id || s.raw.mentor.id))))
            const studentId = s.studentId || (s.student && (s.student._id || s.student.id)) || (s.raw && (s.raw.studentId || (s.raw.student && (s.raw.student._id || s.raw.student.id))))
            if (!(String(mentorId) === String(myId) || String(studentId) === String(myId))) return
          }

          // status/payment checks
          const status = (s.status || (s.raw && s.raw.status) || '').toString().toLowerCase()
          const paymentStatus = (s.paymentStatus || (s.raw && s.raw.paymentStatus) || (s.raw && s.raw.payment_status) || '').toString().toLowerCase()
          const allowed = ['scheduled','confirmed','paid','upcoming']
          if (!(allowed.includes(status) || paymentStatus === 'paid')) return

          // normalized shape like Sessions page expects
          const mentor = s.mentor || (s.raw && s.raw.mentor) || (s.mentorId ? { name: 'Mentor' } : undefined)
          const dateIso = new Date(startMs).toISOString()
          const date = dateIso.slice(0,10)
          const time = new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

          const item = {
            raw: s.raw || s,
            id,
            mentor,
            mentorId: s.mentorId || (s.raw && (s.raw.mentorId || (s.raw.mentor && (s.raw.mentor._id || s.raw.mentor.id)))) || null,
            studentId: s.studentId || (s.raw && (s.raw.studentId || (s.raw.student && (s.raw.student._id || s.raw.student.id)))) || null,
            date,
            time,
            duration: s.duration || (s.raw && s.raw.duration) || undefined,
            status: status === 'confirmed' ? 'upcoming' : (status || 'upcoming'),
            paymentPending: !(paymentStatus === 'paid' || status === 'paid'),
            startMs,
          }
          seen.add(id)
          results.push(item)
        } catch (e) { /* swallow per-dashboard-only logic */ }
      }

      // prefer authoritative bookingsRaw (same source Sessions page uses)
      if (Array.isArray(bookingsRaw) && bookingsRaw.length) {
        for (const b of bookingsRaw) pushIfValid(b)
      }

      // include normalizedBookings which might include derived timestamps
      for (const nb of normalizedBookings) pushIfValid(nb)

      // include sessions populated from analytics if not present
      for (const s of (sessions || [])) pushIfValid(s)

      // include upcomingSessions from analytics as last resort
      for (const s of (upcomingSessions || [])) pushIfValid(s)

      // sort by startMs ascending
      results.sort((a,b) => (Number(a.startMs || 0) - Number(b.startMs || 0)))
      return results
    } catch (e) { return [] }
  }, [bookingsRaw, normalizedBookings, sessions, upcomingSessions, myId])

  const upcomingCount = useMemo(() => {
    try {
      const nowMs = Date.now()
      let c = 0
      for (const b of normalizedBookings) {
        try {
          if (!b.startMs) continue
          if (b.startMs <= nowMs) continue
          if (!['confirmed', 'scheduled', 'upcoming', 'paid'].includes((b.status || '').toString().toLowerCase())) continue
          if (myId) {
            if (String(b.studentId) === String(myId) || String(b.mentorId) === String(myId)) c += 1
          } else { c += 1 }
        } catch (e) {}
      }
      if (c > 0) return c
      const seen = new Set<string>()
      const checkArray = (arr: any[]) => {
        for (const s of arr || []) {
          try {
            const st = s.startMs || s.startTime || s.date || s.timestamp || s.dateTime || s.time
            const start = st ? Number(new Date(st).getTime()) : null
            if (!start) continue
            if (start <= nowMs) continue
            const mId = s.mentorId || (s.mentor && (s.mentor._id || s.mentor.id)) || (s.mentor && typeof s.mentor === 'string' ? s.mentor : null)
            const sid = s.studentId || (s.student && (s.student._id || s.student.id)) || null
            if (myId) {
              if (String(mId) === String(myId) || String(sid) === String(myId)) seen.add(String(s.id || s._id || JSON.stringify(s)))
            } else {
              seen.add(String(s.id || s._id || JSON.stringify(s)))
            }
          } catch (e) {}
        }
      }
      checkArray(derivedUpcomingSessions)
      checkArray(sessions)
      return seen.size
    } catch (e) { return 0 }
  }, [normalizedBookings, myId, derivedUpcomingSessions, sessions])

  const unreadMessagesCount = useMemo(() => {
    try {
      if (normalizedBookings.length === 0) return null
      let sum = 0
      for (const b of normalizedBookings) {
        try { sum += Number(b.unreadCount || 0) } catch (e) {}
      }
      return sum
    } catch (e) { return null }
  }, [normalizedBookings])

  const mentorConnectionsCount = useMemo(() => {
    try {
      const ids = new Set<string>()
      for (const b of normalizedBookings) if (b && b.mentorId) ids.add(String(b.mentorId))
      if (profile) {
        if (Array.isArray(profile.connections)) for (const c of profile.connections) { const id = c && (c._id || c.id || c); if (id) ids.add(String(id)) }
        if (Array.isArray(profile.connectedMentors)) for (const c of profile.connectedMentors) { const id = c && (c._id || c.id || c); if (id) ids.add(String(id)) }
      }
      for (const s of (sessions || [])) {
        try { const m = (s as any).mentor || null; if (m) ids.add(String((m && (m._id || m.id)) || m)) } catch (e) {}
      }
      const size = ids.size
      if (size > 0) return size
      if (profile && typeof profile.connections === 'number') return profile.connections
      return null
    } catch (e) { return null }
  }, [normalizedBookings, profile, sessions])

  const format = (v: number | null | undefined) => (v == null ? '' : String(Number(v) || 0))

  const finalUpcoming = useMemo(() => {
    if (upcomingCount != null) return upcomingCount
    if (Array.isArray(upcomingSessions) && upcomingSessions.length) return upcomingSessions.length
    if (analytics && analytics.upcoming && typeof analytics.upcoming === 'number') return analytics.upcoming
    if (quickStats && Number(quickStats.upcomingMeetings) > 0) return Number(quickStats.upcomingMeetings)
    return 0
  }, [upcomingCount, upcomingSessions, analytics, quickStats])

  const finalUnreadMessages = useMemo(() => {
    if (unreadMessagesCount != null) return unreadMessagesCount
    if (quickStats && Number(quickStats.unreadMessages) > 0) return Number(quickStats.unreadMessages)
    if (analytics && typeof analytics.messages === 'number') return analytics.messages
    return 0
  }, [unreadMessagesCount, quickStats, analytics])

  const finalConnections = useMemo(() => {
    if (mentorConnectionsCount != null) return mentorConnectionsCount
    if (profile && typeof profile.connections === 'number') return profile.connections
    if (quickStats && Number(quickStats.mentorConnections) > 0) return Number(quickStats.mentorConnections)
    return 0
  }, [mentorConnectionsCount, profile, quickStats])

  const dataPresent = (Array.isArray(bookingsRaw) && bookingsRaw.length > 0) || (quickStats && Object.keys(quickStats).length > 0) || (Array.isArray(upcomingSessions) && upcomingSessions.length > 0) || (Array.isArray(sessions) && sessions.length > 0)

  const displayUpcoming = dataPresent ? format(finalUpcoming) : ''
  const displayMessages = dataPresent ? format(finalUnreadMessages) : ''
  const displayConnections = dataPresent ? format(finalConnections) : ''

  useEffect(() => {
    if (!loadingAnalytics) {
      try {
        console.debug('[Dashboard] computed counts', {
          bookingsRawCount: Array.isArray(bookingsRaw) ? bookingsRaw.length : 0,
          normalizedSample: normalizedBookings.slice(0,3),
          upcomingCount,
          unreadMessagesCount,
          mentorConnectionsCount,
          analytics,
          quickStats,
        })
      } catch (e) {}
    }
  }, [loadingAnalytics, bookingsRaw, normalizedBookings, upcomingCount, unreadMessagesCount, mentorConnectionsCount, analytics, quickStats])

  const [onboardingVisible, setOnboardingVisible] = useState<boolean>(false)
  const [onboardingHiding, setOnboardingHiding] = useState<boolean>(false)

  useEffect(() => {
    try {
      const seen = localStorage.getItem('devlink_onboarding_seen')
      if (!seen) setOnboardingVisible(true)
    } catch (e) { setOnboardingVisible(false) }
  }, [])

  function markOnboardingSeen() { try { localStorage.setItem('devlink_onboarding_seen', '1') } catch (e) {} }
  function dismissOnboarding() { setOnboardingHiding(true); setTimeout(() => { markOnboardingSeen(); setOnboardingVisible(false); setOnboardingHiding(false) }, 300) }
  function handleOnboardingBook() { setOnboardingHiding(true); setTimeout(() => { markOnboardingSeen(); setOnboardingVisible(false); setOnboardingHiding(false); openBookingModal() }, 300) }

  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('devlink_token')
    const headers: Record<string,string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    async function load() {
      try {
        setLoadingAnalytics(true)
        const [pRes, bRes, aRes] = await Promise.all([
          fetch(`${API_BASE}/profiles/me`, { headers }),
          fetch(`${API_BASE}/bookings/my`, { headers }),
          fetch(`${API_BASE}/user/analytics`, { headers }),
        ])

        if (pRes.ok) {
          const pj = await pRes.json()
          if (pj && pj.success && pj.data && pj.data.profile) setProfile(pj.data.profile)
        }

        if (bRes.ok) {
          const bj = await bRes.json()
          try {
            let bookingsArr: any[] = []
            if (bj) {
              if (bj.success && bj.data && Array.isArray(bj.data.results)) bookingsArr = bj.data.results
              else if (Array.isArray(bj.bookings)) bookingsArr = bj.bookings
              else if (bj.data && Array.isArray(bj.data.bookings)) bookingsArr = bj.data.bookings
              else if (Array.isArray(bj.data)) bookingsArr = bj.data
            }
            if (Array.isArray(bookingsArr)) { setBookingsRaw(bookingsArr); try { console.debug('[Dashboard] bookingsRaw loaded (sample 5)', bookingsArr.slice(0,5)) } catch (e) {} }
            else try { console.debug('[Dashboard] bookings/my returned but no bookings array found', bj) } catch (e) {}
          } catch (e) { console.warn('Failed to parse bookings response', e) }
        }

        if (aRes.ok) {
          const aj = await aRes.json()
          if (aj && aj.success && aj.data) {
            setAnalytics(aj.data.analytics)
            setUpcomingSessions(aj.data.upcomingSessions || [])
            setFormattedActivities(aj.data.formattedActivities || [])
            setQuickStats(aj.data.quickStats || null)
            try { console.debug('[Dashboard] analytics quickStats/upcomingSessions', { quickStats: aj.data.quickStats, upcomingSessions: (aj.data.upcomingSessions || []).slice(0,5) }) } catch (e) {}
            if (Array.isArray(aj.data.upcomingSessions)) {
              const mapped: Session[] = aj.data.upcomingSessions.map((bk: any) => ({
                id: bk.id,
                mentor: bk.mentor?.name || 'Mentor',
                startTime: bk.date,
                endTime: undefined,
                duration: undefined,
                status: bk.status === 'confirmed' ? 'upcoming' : 'pending'
              }))
              setSessions(mapped)
            }
            if (Array.isArray(aj.data.formattedActivities)) {
              const mappedAct: Activity[] = aj.data.formattedActivities.map((it: any) => ({
                id: it.id || String(Math.random()),
                title: it.title,
                time: it.timestamp || new Date().toISOString(),
                meta: it.description || undefined,
              }))
              setActivities(mappedAct)
            }
          }
        }
      } catch (e) { console.warn('Dashboard load error', e) }
      finally { setLoadingAnalytics(false) }
    }

    load()
  }, [API_BASE])

  function openBookingModal() { setBookingLoading(true); setTimeout(() => { setBookingLoading(false); setBookingOpen(true) }, 150) }
  function handleFindMentors() { navigate('/app/mentors') }
  function handleMessages() { navigate('/app/messages') }

  type DonutDatum = { name: string; value: number }
  const completedVsPending = useMemo<DonutDatum[]>(() => {
    const completed = bookingsRaw.filter((b: any) => b && (b.status === 'completed' || b.status === 'confirmed')).length
    const pending = bookingsRaw.filter((b: any) => b && (b.status === 'pending' || b.paymentStatus === 'pending')).length
    const upcoming = bookingsRaw.filter((b: any) => b && (b.status === 'upcoming' || b.status === 'confirmed')).length
    return [
      { name: 'Completed', value: completed },
      { name: 'Pending', value: pending },
      { name: 'Upcoming', value: upcoming },
    ]
  }, [bookingsRaw])

  // Weekly sessions: try analytics.learningProgress, otherwise derive from sessions dates
  type WeeklyDatum = { week: string; sessions: number }
  const weeklySessions = useMemo<WeeklyDatum[]>(() => {
    if (analytics && Array.isArray(analytics.learningProgress) && analytics.learningProgress.length) {
      return analytics.learningProgress.map((w: any) => ({ week: w.week || w.label, sessions: Number(w.sessions || 0) }))
    }
    // derive from sessions array (group by weekday)
    const map: Record<string, number> = {}
    const days = 7
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      map[key] = 0
    }
    sessions.forEach((s: Session) => {
      const key = s.startTime ? (new Date(s.startTime)).toISOString().slice(0, 10) : null
      if (key && map[key] !== undefined) map[key] = (map[key] || 0) + 1
    })
    return Object.keys(map).map(k => ({ week: k.slice(5), sessions: map[k] }))
  }, [analytics, sessions])

  // Messages per day (last 7 days)
  const messagesPerDay = useMemo<{ day: string; count: number }[]>(() => {
    const days = 7
    const result: { day: string; count: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const count = messages.filter(m => {
        try {
          const t = new Date(m.time)
          return t.toISOString().slice(0, 10) === key
        } catch (e) { return false }
      }).length
      result.push({ day: key.slice(5), count })
    }
    return result
  }, [messages])
  // Determine chart colors from Tailwind text color utilities at runtime
  const [chartColors, setChartColors] = useState<string[] | null>(null)

  const [gridStroke, setGridStroke] = useState<string | null>(null)

  useEffect(() => {
    try {
      // Map to Tailwind text color utilities (theme-aware)
      const classes = ['text-sky-500', 'text-emerald-500', 'text-amber-500']
      const tmp = document.createElement('div')
      tmp.style.position = 'absolute'
      tmp.style.left = '-9999px'
      document.body.appendChild(tmp)
      const colors: string[] = []
      classes.forEach((c) => {
        tmp.className = c
        const css = getComputedStyle(tmp).color
        // convert rgb(...) to hex
        const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (m) {
          const r = parseInt(m[1], 10)
          const g = parseInt(m[2], 10)
          const b = parseInt(m[3], 10)
          colors.push('#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join(''))
        } else {
          colors.push('#3b82f6')
        }
      })
      // grid stroke color from a Tailwind bg class
      try {
        tmp.className = 'bg-gray-100'
        const bg = getComputedStyle(tmp).backgroundColor
        const m2 = (bg || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (m2) {
          const r = parseInt(m2[1], 10)
          const g = parseInt(m2[2], 10)
          const b = parseInt(m2[3], 10)
          setGridStroke('#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join(''))
        }
      } catch (e) {}
      document.body.removeChild(tmp)
      setChartColors(colors)
    } catch (e) {
      // fallback to sensible defaults if DOM not available
      setChartColors(['#3b82f6', '#10b981', '#f59e0b'])
    }
  }, [])

  // Chart visibility guards: hide charts when there's no data
  const showDonut = useMemo(() => {
    const total = completedVsPending.reduce((s, it) => s + (it.value || 0), 0)
    return Boolean(total > 0 && chartColors && chartColors.length >= 3)
  }, [completedVsPending, chartColors])

  const showWeeklyLine = useMemo(() => {
    const total = weeklySessions.reduce((s, it) => s + (Number(it.sessions) || 0), 0)
    return Boolean(total > 0 && chartColors)
  }, [weeklySessions, chartColors])

  const showMessagesBar = useMemo(() => {
    const total = messagesPerDay.reduce((s, it) => s + (Number(it.count) || 0), 0)
    return Boolean(total > 0 && chartColors)
  }, [messagesPerDay, chartColors])

  const anyChartVisible = showDonut || showWeeklyLine || showMessagesBar

  // Professional activity timeline inline component
  const ProfessionalActivityTimeline = ({ items }: { items: any[] }) => (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 dark:bg-gray-800 border border-gray-200/10 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
        <button className="text-sm text-blue-600">View all</button>
      </div>
      <div className="space-y-3">
        {(!items || items.length === 0) ? (
          <div className="text-sm text-gray-500">No recent activity</div>
        ) : (
          items.map((act) => (
            <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${act.color === 'green' ? 'bg-green-100' : (act.color === 'blue' ? 'bg-blue-100' : 'bg-gray-100')}`}>
                <div className="text-sm font-medium text-gray-700">{act.icon === 'calendar-check' ? '📆' : (act.icon === 'message-square' ? '💬' : '•')}</div>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{act.title || act.text}</div>
                {act.time ? <div className="text-sm text-gray-600">{act.time}</div> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const UpcomingSessionsView = ({ sessions }: { sessions: any[] }) => (
    <div className="space-y-3">
      {(!sessions || sessions.length === 0) ? (
        <div className="text-sm text-gray-500">No upcoming sessions.</div>
      ) : (
        sessions.map(s => (
          <div key={s.id} className="p-3 rounded-lg border hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{s.title || `Session with ${s.mentor?.name || s.mentor}`}</div>
                <div className="text-sm text-gray-600">{s.date ? new Date(s.date).toLocaleDateString() : ''}{s.time ? ` • ${s.time}` : ''}</div>
              </div>
              <div>
                <button onClick={() => navigate(`/app/sessions/${s.id}`)} className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm">View</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="py-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-2xl p-8 mb-6 bg-white shadow-xl border border-gray-100/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Welcome back, {(profile && (profile.firstName || profile.name)) || 'there'}
                </h2>
                <p className="text-sm mt-2 text-gray-600">A quick view of your upcoming sessions and actions you can take.</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {(profile && (profile.firstName || profile.name)) ? (profile.firstName || profile.name).charAt(0).toUpperCase() : 'U'}
              </div>
            </div>

            {/* Invitation inbox has been moved to the header Organization Hub. */}

            

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard label="Upcoming Meetings" value={displayUpcoming !== '' ? displayUpcoming : '—'} />
              <StatCard label="Messages" value={displayMessages !== '' ? displayMessages : '—'} />
              <StatCard label="Senior Developer Connections" value={displayConnections !== '' ? displayConnections : '—'} />
            </div>

            {onboardingVisible ? (
              <div className={`mt-6 relative transition-opacity duration-300 ${onboardingHiding ? 'opacity-0' : 'opacity-100'}`}>
                <button
                  aria-label="Dismiss onboarding"
                  onClick={dismissOnboarding}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white p-1 rounded-full"
                >
                  ✕
                </button>
                <DashboardOnboarding onBook={handleOnboardingBook} />
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openBookingModal}
                disabled={bookingLoading}
                className={`px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg ${bookingLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {bookingLoading ? 'Opening...' : 'Schedule Meeting'}
              </button>

              <button
                type="button"
                onClick={handleFindMentors}
                className="px-6 py-3 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-medium hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 shadow-md"
              >
                Find Senior Developers
              </button>

              <button
                type="button"
                onClick={handleMessages}
                className="px-6 py-3 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-medium hover:border-green-300 hover:bg-green-50 transition-all duration-200 shadow-md"
              >
                View Messages
              </button>

              {user && (user as any).role === 'mentor' && (
                <button
                  type="button"
                  onClick={() => navigate('/app/projects/new')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Post a Project
                </button>
              )}
            </div>
            </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                <UpcomingSessionsView sessions={derivedUpcomingSessions || []} />
                <ProfessionalActivityTimeline items={formattedActivities || []} />
              </div>

              <div>
                <div className="mt-6 rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200/10 dark:border-gray-700">
                  <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Activity</h3>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Charts: Donut (completed vs pending), Line (weekly sessions), Bar (messages) */}
                    {anyChartVisible ? (
                      <>
                        {showDonut && chartColors ? (
                          <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Sessions: completed vs pending</div>
                            <div className="h-40" role="img" aria-label="Sessions completed vs pending">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={completedVsPending} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={4}>
                                    {completedVsPending.map((entry, idx) => (
                                      <Cell key={idx} fill={chartColors[idx % chartColors.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(val: any) => [String(val), 'sessions']} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        ) : null}

                        {showWeeklyLine && chartColors ? (
                          <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Weekly sessions</div>
                            <div className="h-36" role="img" aria-label="Weekly sessions">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weeklySessions} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke || undefined} />
                                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                                  <YAxis />
                                  <Tooltip />
                                  <Line type="monotone" dataKey="sessions" stroke={chartColors[0]} strokeWidth={2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        ) : null}

                        {showMessagesBar && chartColors ? (
                          <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Messages (last 7 days)</div>
                            <div className="h-36" role="img" aria-label="Messages per day">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={messagesPerDay} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke || undefined} />
                                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="count" fill={chartColors[2 % chartColors.length]} radius={[4,4,4,4]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="text-sm text-gray-600 dark:text-gray-300">No activity data to display.</div>
                    )}
                  </div>

                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Pending payments</h4>
                    {bookingsRaw.filter(b => b && (b.status === 'pending' || b.paymentStatus === 'pending')).length === 0 ? (
                      <div className="text-sm text-gray-600 dark:text-gray-300">No pending payments.</div>
                    ) : (
                      <div className="space-y-3">
                        {bookingsRaw.filter(b => b && (b.status === 'pending' || b.paymentStatus === 'pending')).map((b: any) => (
                          <div key={b._id} className="p-3 rounded-lg flex items-center justify-between bg-gray-50 dark:bg-gray-700">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{(b.mentor && (b.mentor.firstName || b.mentor.lastName)) ? `${b.mentor.firstName || ''} ${b.mentor.lastName || ''}`.trim() : 'Mentor'}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">{b.startTime ? new Date(b.startTime).toLocaleString() : 'No date'} • {b.price ? `$${(b.price/100).toFixed(2)}` : '-'}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => navigate(`/app/checkout?bookingId=${b._id}`)} className="px-3 py-1 rounded-md bg-emerald-600 text-white text-sm">Pay now</button>
                              <div className="text-xs text-gray-500 dark:text-gray-300">Pending</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </div>

        <aside>
          <div className="rounded-2xl p-6 sticky top-20 bg-white dark:bg-gray-800 border border-gray-200/10 dark:border-gray-700">
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Actions</h4>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={openBookingModal}
                  disabled={bookingLoading}
                  className={`w-full text-left px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150 ${bookingLoading ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {bookingLoading ? 'Opening...' : 'Schedule Meeting'}
                </button>
                <button type="button" onClick={handleFindMentors} className="w-full text-left px-3 py-2 rounded-md bg-transparent border border-gray-200 text-gray-700 dark:text-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-150">Find Mentors</button>
                <button type="button" onClick={handleMessages} className="w-full text-left px-3 py-2 rounded-md bg-transparent border border-gray-200 text-gray-700 dark:text-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-150">View Messages</button>
              </div>

            <div className="mt-6">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent messages</h5>
              <div className="flex flex-col gap-3">
                {messages.length === 0 ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300">No recent messages.</div>
                ) : (
                  messages.slice(0, 3).map((m) => (
                    <div key={m.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                      <div className="font-medium text-gray-900 dark:text-white">{m.from}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 truncate">{m.text}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">{m.time}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
      
      <SessionBooking
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onConfirm={(payload) => {
          setBookingOpen(false)
          // navigate to confirmation page
          navigate('/app/sessions/confirmation', { state: { booking: payload } })
        }}
      />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="group p-6 rounded-xl bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100/50 hover:border-blue-200 transform hover:-translate-y-1">
      <div className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">{label}</div>
      <div className="text-3xl font-bold mt-2 text-gray-900 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all">{value}</div>
    </div>
  )
}
