import React, { useEffect, useRef, useState } from 'react'
import { useToast } from '../components/UX/ToastProvider'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import MentorCard from '../components/Mentors/MentorCard'
import type { Mentor } from '../data/mentors'
import MentorDetailModal from '../components/Mentors/MentorDetailModal'
import SessionBooking from '../components/SessionBooking'
import { Mail, Lock, Bell, Shield, Palette, Eye, LogOut, ChevronRight, Plus, Trash2, ExternalLink, User, Briefcase, FileText, CheckCircle, Clock, X, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import ReactEasyCrop from 'react-easy-crop'

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
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string>('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<any>(null)
  const API_BASE = (import.meta.env.VITE_API_URL as string) || (import.meta.env.VITE_API_BASE as string) || '/api'
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'mentors' | 'private'>('public')
  const [allowAnalytics, setAllowAnalytics] = useState(true)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [theme, setTheme] = useState('light')
  const [recentMentors, setRecentMentors] = useState<Mentor[]>([])
  const [loadingMentors, setLoadingMentors] = useState(false)
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [portfolioItems, setPortfolioItems] = useState<Array<{ id?: string; title: string; description: string; link: string; image?: string }>>([])
  const [showPortfolioForm, setShowPortfolioForm] = useState(false)
  const [newPortfolio, setNewPortfolio] = useState({ title: '', description: '', link: '' })
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'account' | 'privacy'>('profile')
  const [blockedUsers, setBlockedUsers] = useState<Array<{ _id: string; firstName: string; lastName: string; avatar: string; email: string; title: string }>>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)

  const requireToken = (): string | null => {
    const t = token || localStorage.getItem('devlink_token')
    if (!t) {
      toast.show('Please sign in to continue', 'error')
      return null
    }
    return t
  }

  useEffect(() => {
    if (!user) return
    
    // Refresh profile from server to ensure we have the latest avatar and data
    const refreshProfile = async () => {
      try {
        const token = localStorage.getItem('devlink_token')
        if (!token) return
        
        const res = await fetch(`${API_BASE}/profiles/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (res.ok) {
          const j = await res.json()
          if (j.data && j.data.profile) {
            const profile = j.data.profile
            const firstName = (profile.firstName || profile.name || '').toString()
            const lastName = (profile.lastName || '').toString()
            const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
            setName(fullName || '')
            setTitle((profile.title || '') as string)
            setBio((profile.bio || '') as string)
            // Ensure avatar URL is absolute to avoid cache issues
            const avatarUrl = profile.avatar ? (profile.avatar.startsWith('http') ? profile.avatar : `${window.location.origin}${profile.avatar.startsWith('/') ? '' : '/'}${profile.avatar}`) : ''
            setAvatar(avatarUrl)
          }
        }
      } catch (e) {
        console.warn('Failed to refresh profile', e)
      }
    }
    
    refreshProfile()
  }, [user, API_BASE])

  useEffect(() => {
    if (!user) return
  // user may be a profile object returned from /profiles/me or auth user shape
  const firstName = (user.firstName || user.name || '').toString()
    const lastName = (user.lastName || '').toString()
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
    setName(fullName || '')
    setTitle((user.title || '') as string)
    setBio((user.bio || '') as string)
    const avatarUrl = user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${window.location.origin}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`) : ''
    setAvatar(avatarUrl)
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

  // Fetch portfolio items
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const token = localStorage.getItem('devlink_token')
        if (!token) {
          console.warn('No token found, skipping portfolio fetch')
          return
        }

        const headers: Record<string, string> = { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }

        const url = `${API_BASE}/profiles/portfolio`
        
        const res = await fetch(url, { headers })
        const j = await res.json()
        
        if (j && j.success && j.data && Array.isArray(j.data.items)) {
          const items = j.data.items.map((item: any) => ({
            id: item._id || item.id,
            title: item.title,
            description: item.description || '',
            link: item.link || '',
            image: item.image || ''
          }))
          setPortfolioItems(items)
        }
      } catch (e) {
        // Silently fail - portfolio is optional
      }
    }
    if (user) {
      fetchPortfolio()
    }
  }, [API_BASE, user])

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
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setImageToCrop(result)
        setShowCropModal(true)
        setCrop({ x: 0, y: 0 })
        setZoom(1)
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      toast.show('Failed to load image: ' + (err?.message ?? String(err)), 'error')
    }
  }

  const getCroppedImg = async (): Promise<Blob | null> => {
    if (!croppedArea || !imageToCrop) return null

    try {
      const image = new Image()
      image.src = imageToCrop

      return new Promise((resolve) => {
        image.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(null)
            return
          }

          canvas.width = croppedArea.width
          canvas.height = croppedArea.height

          ctx.drawImage(
            image,
            croppedArea.x,
            croppedArea.y,
            croppedArea.width,
            croppedArea.height,
            0,
            0,
            croppedArea.width,
            croppedArea.height
          )

          canvas.toBlob((blob) => {
            resolve(blob)
          }, 'image/jpeg', 0.95)
        }
      })
    } catch (err) {
      console.error('Failed to crop image', err)
      return null
    }
  }

  const handleSaveCroppedImage = async () => {
    try {
      const authToken = requireToken()
      if (!authToken) return

      const croppedBlob = await getCroppedImg()
      if (!croppedBlob) {
        toast.show('Failed to crop image', 'error')
        return
      }

      const fd = new FormData()
      fd.append('avatar', croppedBlob, 'avatar.jpg')

      const res = await fetch(`${API_BASE}/profiles/me/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: fd,
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j || !j.success) {
        throw new Error((j && j.message) || 'Upload failed')
      }

      const newAvatar = j.data && j.data.profile ? j.data.profile.avatar : j.data && j.data.avatar
      if (newAvatar) {
        // Convert relative path to absolute URL to avoid cache issues
        const absoluteAvatar = newAvatar.startsWith('http') ? newAvatar : `${window.location.origin}${newAvatar.startsWith('/') ? '' : '/'}${newAvatar}`
        setAvatar(absoluteAvatar)
        // Sync to AuthContext so the global user state is updated
        try {
          await updateProfile({ avatar: absoluteAvatar })
        } catch (e) {
          console.warn('updateProfile sync failed', e)
        }
        // Force refresh of user profile to ensure avatar persists after reload
        try {
          const profileRes = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` },
          })
          if (profileRes.ok) {
            const profileData = await profileRes.json()
            if (profileData.data && profileData.data.user) {
              await updateProfile({ ...profileData.data.user })
            }
          }
        } catch (e) {
          console.warn('Failed to refresh profile data', e)
        }
      }

      setShowCropModal(false)
      setImageToCrop('')
      toast.show('Avatar updated successfully', 'success')
    } catch (err: any) {
      console.error('Avatar upload failed', err)
      toast.show('Failed to upload avatar: ' + (err?.message ?? String(err)), 'error')
    }
  }

  function handleAccountSave(e: React.FormEvent) {
    e.preventDefault()
    toast.show('Account settings saved (not implemented)', 'success')
  }

  function handleLogout() {
    localStorage.removeItem('devlink_token')
    navigate('/login')
  }

  // Notifications handlers
  // Password change handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.show('Passwords do not match', 'error')
      return
    }
    if (newPassword.length < 6) {
      toast.show('Password must be at least 6 characters', 'error')
      return
    }
    try {
      const authToken = requireToken()
      if (!authToken) return

      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.show('Password changed successfully', 'success')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        throw new Error(data.message || 'Failed to change password')
      }
    } catch (err: any) {
      toast.show('Error: ' + (err?.message ?? 'Failed to change password'), 'error')
    }
  }

  // Privacy settings handler
  const handleSavePrivacy = async () => {
    try {
      const authToken = requireToken()
      if (!authToken) return

      const payload = {
        profileVisibility,
        allowAnalytics
      }
      const res = await fetch(`${API_BASE}/profiles/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        toast.show('Privacy settings saved', 'success')
      } else {
        throw new Error('Failed to save')
      }
    } catch (err: any) {
      toast.show('Error saving privacy settings: ' + (err?.message ?? ''), 'error')
    }
  }

  // Fetch blocked users when Privacy tab opens
  useEffect(() => {
    if (activeTab === 'privacy' && token) {
      const fetchBlockedUsers = async () => {
        setLoadingBlocked(true)
        try {
          const res = await fetch(`${API_BASE}/profiles/blocked-users`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const j = await res.json()
          if (j.success && j.data?.blockedUsers) {
            setBlockedUsers(j.data.blockedUsers)
          }
        } catch (e) {
          console.warn('Failed to fetch blocked users', e)
        } finally {
          setLoadingBlocked(false)
        }
      }
      fetchBlockedUsers()
    }
  }, [activeTab, token, API_BASE])

  const handleUnblockUser = async (blockedUserId: string) => {
    try {
      const authToken = requireToken()
      if (!authToken) return

      const res = await fetch(`${API_BASE}/profiles/blocked-users/${blockedUserId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        }
      })
      if (res.ok) {
        setBlockedUsers(blockedUsers.filter(user => user._id !== blockedUserId))
        toast.show('User unblocked successfully', 'success')
      } else {
        throw new Error('Failed to unblock user')
      }
    } catch (err: any) {
      toast.show('Error: ' + (err?.message ?? 'Failed to unblock'), 'error')
    }
  }

  // Account settings handler
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const authToken = requireToken()
      if (!authToken) return

      const payload = {
        theme
      }
      const res = await fetch(`${API_BASE}/profiles/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        toast.show('Account settings saved', 'success')
        if (theme !== 'system') {
          document.documentElement.classList.toggle('dark', theme === 'dark')
        }
      } else {
        throw new Error('Failed to save')
      }
    } catch (err: any) {
      toast.show('Error saving account settings: ' + (err?.message ?? ''), 'error')
    }
  }

  const handleLogoutAllDevices = async () => {
    if (window.confirm('This will log you out from all other devices. You will remain logged in on this device.')) {
      try {
        toast.show('Logged out from all other devices', 'success')
      } catch (err: any) {
        toast.show('Error: ' + (err?.message ?? 'Failed'), 'error')
      }
    }
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
    if (!newPortfolio.title.trim()) {
      toast.show('Project title is required', 'error')
      return
    }
    try {
      const authToken = requireToken()
      if (!authToken) return

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      headers['Authorization'] = `Bearer ${authToken}`
      
      const res = await fetch(`${API_BASE}/profiles/portfolio`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          title: newPortfolio.title, 
          description: newPortfolio.description, 
          link: newPortfolio.link 
        })
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
      const authToken = requireToken()
      if (!authToken) return

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      headers['Authorization'] = `Bearer ${authToken}`
      
      const res = await fetch(`${API_BASE}/profiles/portfolio/${itemId}`, {
        method: 'DELETE',
        headers
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok) {
        setPortfolioItems(portfolioItems.filter(item => item.id !== itemId))
        toast.show('Portfolio item deleted', 'success')
      } else {
        throw new Error(j.message || 'Failed to delete')
      }
    } catch (err: any) {
      toast.show('Failed to delete portfolio item: ' + (err?.message ?? ''), 'error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Manage your profile, preferences, and account settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-2 bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-sm border border-gray-200 dark:border-gray-700">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'security', label: 'Security', icon: Shield },
                { id: 'account', label: 'Account', icon: Mail },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{label}</span>
                  {activeTab === id && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              ))}
              <hr className="my-3 border-gray-200 dark:border-gray-700" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-200"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-4 space-y-6">
            <>
              {/* Profile Settings */}
              {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Profile Header Card */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
                  <h2 className="text-3xl font-bold mb-2">Your Profile</h2>
                  <p className="text-blue-100">Update your personal information and showcase your work</p>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleSaveProfile} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg ring-4 ring-blue-200 dark:ring-blue-900">
                        {avatar ? (
                          <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl font-bold text-white">{(name || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{name || 'Your Name'}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <button type="button" onClick={onPickAvatar} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all duration-200">
                          Upload Photo
                        </button>
                        {avatar && (
                          <button type="button" onClick={() => setAvatar('')} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 dark:text-red-400 text-sm font-medium transition-all duration-200">
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">JPG, PNG, or GIF (max. 5MB)</p>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                    </div>
                  </div>

                  <hr className="border-gray-200 dark:border-gray-700" />

                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title / Role</label>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Full Stack Developer" className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" />
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      About You
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself, your experience, and interests..." rows={5} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none" />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{bio.length}/500 characters</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                    <button type="submit" className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all duration-200">
                      Save Changes
                    </button>
                    <button type="button" onClick={() => { setName(''); setTitle(''); setBio('') }} className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200">
                      Clear All
                    </button>
                  </div>
                </form>

                {/* Portfolio Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                        Portfolio Projects
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Showcase your best work to potential clients and employers</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPortfolioForm(!showPortfolioForm)}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-2 transition-all duration-200"
                    >
                      <Plus className="w-4 h-4" />
                      {showPortfolioForm ? 'Cancel' : 'Add Project'}
                    </button>
                  </div>

                  {showPortfolioForm && (
                    <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl space-y-4 border border-blue-200 dark:border-blue-900">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Title <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          placeholder="e.g., E-commerce Platform"
                          value={newPortfolio.title}
                          onChange={(e) => setNewPortfolio({ ...newPortfolio, title: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description <span className="text-gray-400 text-xs">(Optional)</span></label>
                        <textarea
                          placeholder="Describe your project, technologies used, and your role..."
                          value={newPortfolio.description}
                          onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Link <span className="text-gray-400 text-xs">(Optional)</span></label>
                        <input
                          type="url"
                          placeholder="https://github.com/... or https://yourproject.com"
                          value={newPortfolio.link}
                          onChange={(e) => setNewPortfolio({ ...newPortfolio, link: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addPortfolioItem}
                        className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200"
                      >
                        Save Project
                      </button>
                    </div>
                  )}

                  {portfolioItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {portfolioItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200"
                        >
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-start justify-between gap-2">
                            {item.title}
                            <button
                              type="button"
                              onClick={() => deletePortfolioItem(item.id)}
                              className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </h4>
                          {item.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{item.description}</p>
                          )}
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-3 inline-flex items-center gap-1"
                            >
                              View Project <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-40" />
                      <p>No portfolio items yet. Start by adding your first project!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
                  <h2 className="text-3xl font-bold mb-2 flex items-center gap-2"><Shield className="w-8 h-8" />Security</h2>
                  <p className="text-blue-100">Secure your account with strong passwords</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Change Password */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2"><Lock className="w-5 h-5 text-red-600" />Change Password</h3>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
                        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required placeholder="••••••••" className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="••••••••" className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••" className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" />
                      </div>
                      <button type="submit" className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200">Update Password</button>
                    </form>
                  </div>

                  {/* Active Sessions */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Active Sessions</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Current Device</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">This session is active now</p>
                          </div>
                        </div>
                        <span className="text-xs text-green-600 dark:text-green-400 font-semibold bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded">CURRENT</span>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Log out from all other devices while remaining logged in on this one.</p>
                        <button onClick={handleLogoutAllDevices} className="w-full px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 dark:text-red-400 font-medium transition-all duration-200">
                          Logout All Other Devices
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Settings */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-lg">
                  <h2 className="text-3xl font-bold mb-2 flex items-center gap-2"><Mail className="w-8 h-8" />Account</h2>
                  <p className="text-purple-100">Manage your email, password, and account preferences</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email Settings */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Address</h3>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Email</label>
                        <input type="email" value={user?.email || ''} disabled placeholder="your@email.com" className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 cursor-not-allowed opacity-75" />
                      </div>
                      <div className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-semibold rounded-full">Verified</div>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-8 shadow-sm border border-green-200 dark:border-green-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" />Account Status</h3>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold text-green-700 dark:text-green-400">Active & Verified</span>
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Last Login */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-8 shadow-sm border border-blue-200 dark:border-blue-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-600" />Last Login</h3>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {user?.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'First login'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {user?.lastLogin ? `${Math.floor((Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60))} hours ago` : 'Just now'}
                      </p>
                    </div>
                  </div>

                  {/* Email Visibility */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-purple-600" />Email Visibility</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Control whether your email is visible on your public profile</p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={user?.emailVisible !== false}
                        onChange={(e) => {
                          const newValue = e.target.checked;
                          (async () => {
                            try {
                              const authToken = requireToken()
                              if (!authToken) return

                              const res = await fetch(`${API_BASE}/profiles/me`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${authToken}`
                                },
                                body: JSON.stringify({ emailVisible: newValue })
                              });
                              if (res.ok) {
                                toast.show(newValue ? 'Email is now visible' : 'Email is now hidden', 'success');
                              } else {
                                throw new Error('Failed to update');
                              }
                            } catch (err: any) {
                              toast.show('Error: ' + (err?.message ?? 'Failed'), 'error');
                            }
                          })();
                        }}
                        className="w-4 h-4 cursor-pointer" 
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show email on public profile</span>
                    </label>
                  </div>

                  {/* Theme Settings */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Palette className="w-5 h-5 text-purple-600" />Theme</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={(e) => setTheme(e.target.value)} className="w-4 h-4" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Light</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={(e) => setTheme(e.target.value)} className="w-4 h-4" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Dark</span>
                      </label>
                    </div>
                    <button onClick={handleSaveAccount} className="w-full mt-4 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200">Save Settings</button>
                  </div>
                </div>
              </div>
            )}
            </>
          </div>
        </div>

        {/* Crop Modal */}
        {showCropModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Crop Profile Photo</h2>
                <button onClick={() => setShowCropModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6">
                {imageToCrop && (
                  <>
                    <div className="relative h-96 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-6">
                      <ReactEasyCrop
                        image={imageToCrop}
                        crop={crop}
                        zoom={zoom}
                        aspect={1 / 1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={(croppedArea: any, croppedAreaPixels: any) => setCroppedArea(croppedAreaPixels)}
                        onZoomChange={setZoom}
                      />
                    </div>

                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Zoom</label>
                        <div className="flex items-center gap-3">
                          <ZoomOut className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                          />
                          <ZoomIn className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Current zoom: {zoom.toFixed(1)}x</p>
                      </div>

                      <div>
                        <button
                          onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }) }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm font-medium"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCropModal(false)}
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveCroppedImage}
                        className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all duration-200"
                      >
                        Save & Upload
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}