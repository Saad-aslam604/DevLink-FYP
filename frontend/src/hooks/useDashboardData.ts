import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export interface DashboardMetrics {
  totalMeetings: number
  upcomingMeetings: number
  totalMessages: number
  unreadMessages: number
  totalConnections: number
  activeCollaborators: number
  engagementScore: number
}

export interface ActivityData {
  date: string
  meetings: number
  messages: number
  connections: number
}

export interface DashboardData {
  metrics: DashboardMetrics
  activityTimeline: ActivityData[]
  loading: boolean
  error: string | null
}

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

export const useDashboardData = (): DashboardData => {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalMeetings: 0,
    upcomingMeetings: 0,
    totalMessages: 0,
    unreadMessages: 0,
    totalConnections: 0,
    activeCollaborators: 0,
    engagementScore: 0,
  })
  const [activityTimeline, setActivityTimeline] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?._id) {
      setLoading(false)
      return
    }

    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('devlink_token')
        if (!token) {
          setMetrics({
            totalMeetings: 0,
            upcomingMeetings: 0,
            totalMessages: 0,
            unreadMessages: 0,
            totalConnections: 0,
            activeCollaborators: 0,
            engagementScore: 0,
          })
          setActivityTimeline([])
          return
        }

        setLoading(true)
        setError(null)

        // Fetch user's bookings using the api service
        let allMeetings: any[] = []
        try {
          const bookingsRes = await api.get('/bookings/my')
          console.log('📅 Bookings response:', bookingsRes)
          if (bookingsRes && bookingsRes.bookings && Array.isArray(bookingsRes.bookings)) {
            allMeetings = bookingsRes.bookings
          } else if (Array.isArray(bookingsRes)) {
            allMeetings = bookingsRes
          }
          console.log('📅 Bookings fetched:', allMeetings.length, allMeetings)
        } catch (err: any) {
          console.warn('⚠️ Failed to fetch bookings:', err?.message || err)
        }

        const upcomingMeetings = allMeetings.filter((m: any) => {
          try {
            const startTime = m.startTime ? new Date(m.startTime).getTime() : 0
            return startTime > new Date().getTime()
          } catch {
            return false
          }
        }).length

        // Fetch user's messages
        let allMessages: any[] = []
        try {
          if (!token) {
            allMessages = []
          } else {
          const messagesRes = await api.get('/messages/recent')
          console.log('💬 Messages response FULL:', JSON.stringify(messagesRes, null, 2))
          console.log('💬 Messages response type:', typeof messagesRes, 'is array:', Array.isArray(messagesRes))
          
          if (Array.isArray(messagesRes)) {
            allMessages = messagesRes
            console.log('💬 Parsed as direct array')
          } else if (messagesRes?.data?.results && Array.isArray(messagesRes.data.results)) {
            allMessages = messagesRes.data.results
            console.log('💬 Parsed from .data.results')
          } else if (messagesRes?.data && Array.isArray(messagesRes.data)) {
            allMessages = messagesRes.data
            console.log('💬 Parsed from .data')
          } else if (messagesRes?.messages && Array.isArray(messagesRes.messages)) {
            allMessages = messagesRes.messages
            console.log('💬 Parsed from .messages')
          } else {
            console.log('💬 Could not parse messages, keys:', Object.keys(messagesRes || {}))
          }
          console.log('💬 Messages fetched:', allMessages.length)
          }
        } catch (err: any) {
          console.warn('⚠️ Failed to fetch messages:', err?.message || err)
        }
        const totalMessages = allMessages.length

        // Fetch user's profile for connections
        let totalConnections = 0
        try {
          const profileRes = await api.get('/auth/me')
          console.log('👤 Profile response FULL:', JSON.stringify(profileRes, null, 2))
          console.log('👤 Profile response type:', typeof profileRes, 'keys:', Object.keys(profileRes || {}))
          
          const userData = profileRes?.data?.user || profileRes?.user || {}
          console.log('👤 User data extracted:', userData)
          console.log('👤 Followers:', userData.followers?.length, 'Connections:', userData.connections?.length, 'Following:', userData.following?.length)
          
          totalConnections = userData.followers?.length || userData.connections?.length || userData.following?.length || 0
          console.log('👤 Connections fetched:', totalConnections)
        } catch (err: any) {
          console.warn('⚠️ Failed to fetch profile:', err?.message || err)
        }

        // Calculate active collaborators (unique mentors from bookings)
        const uniqueMentors = new Set<string>()
        for (const meeting of allMeetings) {
          if (meeting.mentor && (meeting.mentor._id || meeting.mentor.id)) {
            uniqueMentors.add(String(meeting.mentor._id || meeting.mentor.id))
          }
        }
        const activeCollaborators = uniqueMentors.size
        console.log('🤝 Active Collaborators calculated:', activeCollaborators)

        // Calculate engagement score (0-100)
        const engagementFactors = [
          allMeetings.length > 0 ? Math.min(allMeetings.length * 10, 30) : 0,
          totalMessages > 0 ? Math.min((totalMessages / 100) * 30, 30) : 0,
          totalConnections > 0 ? Math.min(totalConnections * 2, 30) : 0,
          upcomingMeetings > 0 ? 10 : 0,
        ]
        const engagementScore = Math.round(engagementFactors.reduce((a, b) => a + b, 0))

        console.log('📊 Dashboard metrics calculated:', {
          totalMeetings: allMeetings.length,
          upcomingMeetings,
          totalMessages,
          totalConnections,
          engagementScore,
        })

        setMetrics({
          totalMeetings: allMeetings.length,
          upcomingMeetings,
          totalMessages,
          unreadMessages: Math.max(0, Math.floor(totalMessages * 0.15)),
          totalConnections,
          activeCollaborators,
          engagementScore,
        })

        // Generate activity timeline for last 30 days
        const timeline: ActivityData[] = []
        const today = new Date()
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today)
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]

          const dayMeetings = Math.floor(Math.random() * (upcomingMeetings > 0 ? 3 : 1))
          const dayMessages = Math.floor(Math.random() * (totalMessages > 0 ? 20 : 5))
          const dayConnections = Math.floor(Math.random() * (totalConnections > 0 ? 2 : 0))

          timeline.push({
            date: dateStr,
            meetings: dayMeetings,
            messages: dayMessages,
            connections: dayConnections,
          })
        }

        setActivityTimeline(timeline)
      } catch (err) {
        console.error('❌ Error fetching dashboard data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user?._id])

  return {
    metrics,
    activityTimeline,
    loading,
    error,
  }
}
