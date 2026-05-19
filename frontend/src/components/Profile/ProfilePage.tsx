import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Edit, X, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../UX/ToastProvider'
import FileUpload from '../../components/FileUpload/FileUpload'
import FileGallery from '../../components/FileGallery/FileGallery'
import ReactEasyCrop from 'react-easy-crop'
// small helper to build auth headers
function getAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

type Skill = string

const SUGGESTED_SKILLS: Skill[] = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Express',
  'GraphQL',
  'Postgres',
  'Docker',
  'CSS',
  'Tailwind',
]

// Display-only labels for experience levels to align with FYP terminology
const EXPERIENCE_LEVELS = ['Junior Developer', 'Mid', 'Senior Developer']

export default function ProfilePage(): JSX.Element {
  const { user, token, updateProfile } = useAuth()
  const params = useParams()
  const viewingUserIdParam = params.userId || null
  const toast = useToast()
  const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'
  const navigate = useNavigate()
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  // avatarFile can be the original File or a processed Blob (WebP)
  const [avatarFile, setAvatarFile] = useState<File | Blob | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string>('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<any>(null)

  function onPickAvatar() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
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
      toast?.show && toast.show('Failed to load image: ' + (err?.message ?? String(err)), 'error')
    }
  }

  const [fullName, setFullName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [role, setRole] = useState<string | undefined>(undefined)
  const [bio, setBio] = useState<string>('')
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillInput, setSkillInput] = useState<string>('')
  const [experience, setExperience] = useState<string>('Mid')
  const [jobTitle, setJobTitle] = useState<string>('')
  const [company, setCompany] = useState<string>('')
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editData, setEditData] = useState<Record<string, any> | null>(null)

  const originalRef = useRef<any>(null)

  // determine whether we're viewing our own profile or someone else's
  const isOwnProfile = (() => {
    try {
      if (!viewingUserIdParam) return true
      if (String(viewingUserIdParam) === 'me') return true
      const myId = (user && (user._id || user.id)) ? String(user._id || user.id) : null
      if (myId && String(viewingUserIdParam) === myId) return true
      return false
    } catch (e) { return true }
  })()

  useEffect(() => {
    if (!isOwnProfile) {
      // viewing another user's public profile
      if (viewingUserIdParam) fetchPublicProfile(viewingUserIdParam)
      return
    }
    if (!user) return
    setEmail(user.email ?? '')
    setRole(user.role ?? user.user_metadata?.role)
    // load profile details from API
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, viewingUserIdParam])

  async function fetchProfile() {
    if (!user) return
    if (!token) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/profiles/me`, { headers: { Authorization: `Bearer ${token || (user as any)?._token || (user as any)?.token || ''}` } })
      let j: any = null
      try {
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('application/json')) j = await res.json()
        else {
          const text = await res.text()
          if (text && text.trim()) throw new Error('Non-JSON response from /api/profiles/me: ' + text.slice(0, 500))
        }
      } catch (parseErr) {
        console.warn('Failed to parse JSON from /api/profiles/me', parseErr)
      }

      const profile = (j && j.success && j.data && j.data.profile) ? j.data.profile : {}

      const firstName = profile.firstName || profile.firstName === '' ? profile.firstName : ''
      const lastName = profile.lastName || profile.lastName === '' ? profile.lastName : ''
      const nameFromProfile = [firstName, lastName].filter(Boolean).join(' ')

      setFullName(nameFromProfile || (user.user_metadata?.full_name ?? '') || '')
      setAvatarUrl(profile.avatar ? `${profile.avatar}?t=${Date.now()}` : null)
      setBio(profile.bio ?? '')
      setSkills(Array.isArray(profile.skills) ? profile.skills : profile.skills ? [profile.skills] : [])
      setExperience((profile.experienceLevel ?? profile.experience) || 'Mid')
      setJobTitle(profile.title ?? '')
      setCompany(profile.company ?? '')

      originalRef.current = {
        fullName: nameFromProfile || (user.user_metadata?.full_name ?? ''),
        avatarUrl: profile.avatar ? `${profile.avatar}?t=${Date.now()}` : null,
        bio: profile.bio ?? '',
        skills: Array.isArray(profile.skills) ? profile.skills : profile.skills ? [profile.skills] : [],
        experience: (profile.experienceLevel ?? profile.experience) || 'Mid',
        jobTitle: profile.title ?? '',
        company: profile.company ?? '',
      }
    } catch (err: any) {
      setError(err.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  // Fetch public profile by user id
  async function fetchPublicProfile(id: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(String(id))}`)
      const j = await res.json().catch(() => null)
      if (!res.ok || !j || !j.success) {
        setError('Failed to load profile')
        setLoading(false)
        return
      }
      const profile = j.data || {}
      setFullName(((profile.firstName || '') + ' ' + (profile.lastName || '')).trim())
      setAvatarUrl(profile.avatar || null)
      setBio(profile.bio || '')
      setSkills(profile.skills || [])
      setJobTitle(profile.title || '')
      setCompany('')
      setLoading(false)
    } catch (err: any) {
      setError(err.message ?? String(err))
      setLoading(false)
    }
  }

  // Open edit modal prefilled with current profile values
  function handleEdit() {
    const edit = {
      firstName: fullName?.split(' ').shift() || '',
      lastName: fullName?.split(' ').slice(1).join('') || '',
      bio,
      skills,
      title: jobTitle,
      company,
      skillsString: Array.isArray(skills) ? skills.join(', ') : (typeof skills === 'string' ? skills : ''),
    }
    setEditData(edit)
    setIsEditing(true)
  }

  async function handleSaveEdit() {
    if (!user || !editData) return
    setSaving(true)
    try {
      const userId = (user._id || user.id)
      const tokenVal = token || (user as any)?._token || (user as any)?.token || ''
      // build payload; convert skillsString to skills array if present
      const payload: any = { ...editData }
      if (payload.skillsString !== undefined) {
        try {
          payload.skills = String(payload.skillsString).split(',').map((s: string) => s.trim()).filter(Boolean)
        } catch (e) { payload.skills = editData.skills || [] }
        delete payload.skillsString
      }
      const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(String(userId))}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {}) }, body: JSON.stringify(payload) })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j || !j.success) {
        toast?.show && toast.show('Failed to update profile', 'error')
        setSaving(false)
        return
      }
      // refresh and update global auth profile where possible
      try { await fetchProfile() } catch (e) {}
      try { await updateProfile(editData) } catch (e) {}
      setIsEditing(false)
      toast?.show && toast.show('Profile updated', 'success')
    } catch (err: any) {
      toast?.show && toast.show('Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleMessage(targetUserId?: string) {
    if (!targetUserId) return
    try {
      const t = token || (user as any)?._token || (user as any)?.token || ''
      const res = await fetch(`${API_BASE}/conversations/find-or-create`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ targetUserId }) })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j) {
        toast?.show && toast.show('Failed to start conversation', 'error')
        return
      }
      const conv = j && (j.data || j)
      const convId = conv && (conv._id || conv.id || conv.bookingId || conv.bookingId)
      if (convId) {
        navigate(`/app/messages?conversation=${convId}`)
      } else {
        toast?.show && toast.show('Started conversation', 'success')
      }
    } catch (e) {
      console.warn('start conversation failed', e)
      toast?.show && toast.show('Failed to start conversation', 'error')
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
      const croppedBlob = await getCroppedImg()
      if (!croppedBlob) {
        toast?.show && toast.show('Failed to crop image', 'error')
        return
      }

      // show preview immediately
      const previewUrl = URL.createObjectURL(croppedBlob)
      setAvatarUrl(previewUrl)
      setAvatarFile(croppedBlob)

      setShowCropModal(false)
      setImageToCrop('')
      toast?.show && toast.show('Image cropped. Click Save to upload.', 'success')
    } catch (err: any) {
      console.error('Avatar crop failed', err)
      toast?.show && toast.show('Failed to crop image: ' + (err?.message ?? String(err)), 'error')
    }
  }

  // Process an image file: center-crop square, resize to maxSize x maxSize, apply circular mask and export WebP blob
  async function processImageFile(file: File, maxSize = 500): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const iw = img.naturalWidth
          const ih = img.naturalHeight
          const side = Math.min(iw, ih)
          // center crop source rect
          const sx = Math.floor((iw - side) / 2)
          const sy = Math.floor((ih - side) / 2)

          // draw to intermediate canvas at desired size
          const canvas = document.createElement('canvas')
          canvas.width = maxSize
          canvas.height = maxSize
          const ctx = canvas.getContext('2d')!

          // enable transparency and high quality
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // draw cropped image scaled to canvas
          ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize)

          // create circular mask on a second canvas to keep transparency outside circle
          const out = document.createElement('canvas')
          out.width = maxSize
          out.height = maxSize
          const octx = out.getContext('2d')!
          octx.clearRect(0, 0, out.width, out.height)

          // draw circle clip
          octx.save()
          octx.beginPath()
          octx.arc(maxSize / 2, maxSize / 2, maxSize / 2, 0, Math.PI * 2)
          octx.closePath()
          octx.clip()

          // draw the image from first canvas
          octx.drawImage(canvas, 0, 0)
          octx.restore()

          // export to webp blob
          out.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Failed to convert image'))
              resolve(blob)
            },
            'image/webp',
            0.9,
          )
        } catch (err) {
          reject(err)
        }
      }
      img.onerror = (e) => reject(new Error('Failed to load image'))
      // to support local file URLs
      img.src = URL.createObjectURL(file)
    })
  }

  function addSkillFromInput(value?: string) {
    const v = (value ?? skillInput).trim()
    if (!v) return
    if (skills.includes(v)) {
      setSkillInput('')
      return
    }
    setSkills(prev => [...prev, v])
    setSkillInput('')
  }

  function removeSkill(idx: number) {
    setSkills(prev => prev.filter((_, i) => i !== idx))
  }

  async function uploadAvatarToStorage(file: File | Blob, userId: string) {
    // upload to Express backend via multipart POST /api/profiles/me/avatar
    const fd = new FormData()
    // create a File if needed
    let uploadFile: File
    if (file instanceof File) {
      uploadFile = file
    } else {
      // Determine file type - if it's from crop, it's JPEG, otherwise try to detect
      const fileType = (file as Blob).type || 'image/jpeg'
      const fileName = fileType.includes('webp') ? 'avatar.webp' : 'avatar.jpg'
      uploadFile = new File([file as Blob], fileName, { type: fileType })
    }
    fd.append('avatar', uploadFile)

    const t = token || (user as any)?._token || (user as any)?.token || ''
    const res = await fetch(`${API_BASE}/profiles/me/avatar`, {
      method: 'POST',
      headers: t ? { Authorization: `Bearer ${t}` } : undefined,
      body: fd
    })

    let j: any = null
    try {
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        j = await res.json()
      } else {
        const text = await res.text()
        throw new Error('Non-JSON response from /api/profiles/me/avatar: ' + text.slice(0, 500))
      }
    } catch (parseErr) {
      console.warn('Failed to parse JSON from /api/profiles/me/avatar', parseErr)
    }

    if (!res.ok || !j || !j.success) {
      throw new Error((j && j.message) ? j.message : 'Upload failed')
    }

    // server returns updated profile in j.data.profile
    const avatarPath = (j.data && j.data.profile && j.data.profile.avatar) ? j.data.profile.avatar : null
    // Convert relative path to absolute URL to avoid cache issues
    if (avatarPath) {
      const absoluteUrl = avatarPath.startsWith('http') ? avatarPath : `${window.location.origin}${avatarPath.startsWith('/') ? '' : '/'}${avatarPath}`
      return absoluteUrl
    }
    return null
  }
  async function handleSave() {
    if (!user) return
    setSaving(true)
    setError(null)
    setUploadingAvatar(false)
    try {
      let finalAvatarUrl = avatarUrl

      if (avatarFile) {
        setUploadingAvatar(true)
        try {
          const publicUrl = await uploadAvatarToStorage(avatarFile, user.id)
          finalAvatarUrl = publicUrl as string
          // sync to AuthContext early so other parts of the UI update
          try { await updateProfile({ avatar: finalAvatarUrl }) } catch (e) { console.warn('updateProfile avatar sync failed', e) }
          // Force refresh from server to ensure avatar persists after reload
          try {
            const profileRes = await fetch(`${API_BASE}/auth/me`, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            })
            if (profileRes.ok) {
              const profileData = await profileRes.json()
              if (profileData.data && profileData.data.user) {
                await updateProfile({ ...profileData.data.user })
              }
            }
          } catch (e) {
            console.warn('Failed to refresh profile data after avatar upload', e)
          }
        } catch (upErr: any) {
          setError('Failed to upload avatar: ' + (upErr.message ?? String(upErr)))
          setUploadingAvatar(false)
          setSaving(false)
          return
        } finally {
          setUploadingAvatar(false)
        }
      }

      // map frontend fields to backend profile fields
      const names = (fullName || '').split(' ').filter(Boolean)
      const firstName = names.shift() || ''
      const lastName = names.join('') || ''

      const updates: Record<string, any> = {
        firstName,
        lastName,
        avatar: finalAvatarUrl || undefined,
        bio,
        skills,
        experienceLevel: experience,
        title: jobTitle,
        company,
      }

      // clean undefined values
      Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k])

      // Use AuthContext.updateProfile so the global user state is refreshed
      try {
        const { error } = await updateProfile(updates)
        if (error) {
          setError(error)
          setSaving(false)
          return
        }

        // refresh local profile data to ensure UI shows latest server values
        try { await fetchProfile() } catch (e) { console.warn('fetchProfile after save failed', e) }

        // ensure avatarUrl reflects the final saved path from server
        if (finalAvatarUrl) {
          const cb = (s: string) => (s.includes('?') ? `${s}&t=${Date.now()}` : `${s}?t=${Date.now()}`)
          setAvatarUrl(cb(finalAvatarUrl as string))
          try { await updateProfile({ avatar: finalAvatarUrl }) } catch (e) { /* non-fatal */ }
        }

        // clear transient avatar file after successful save
        setAvatarFile(null)
        try { toast?.show && toast.show('Profile saved', 'success') } catch (e) {}

      } catch (e: any) {
        setError(e?.message ?? String(e))
        setSaving(false)
        return
      }
    } catch (err: any) {
      setError(err.message ?? String(err))
    } finally {
      setSaving(false)
    }
  }
  function handleCancel() {
    const orig = originalRef.current
    if (!orig) return
    setFullName(orig.fullName ?? '')
    setAvatarUrl(orig.avatarUrl ?? null)
    setBio(orig.bio ?? '')
    setSkills(orig.skills ?? [])
    setExperience(orig.experience ?? 'Mid')
    setJobTitle(orig.jobTitle ?? '')
    setCompany(orig.company ?? '')
    setAvatarFile(null)
    setError(null)
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-gray-700 dark:text-gray-200">You must be signed in to edit your profile.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left column - avatar */}
          <div className="md:w-1/3 flex flex-col items-center">
            <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                (() => {
                  try {
                    const base = (import.meta.env.VITE_API_BASE as string) || ''
                    const src = String(avatarUrl)
                    const full = src.startsWith('http') ? src : `${base}${src}`
                    return <img src={full} alt="avatar" className="w-full h-full object-cover" />
                  } catch (e) {
                    return <div className="text-4xl font-semibold text-gray-500 dark:text-gray-300">{(fullName || email).charAt(0).toUpperCase()}</div>
                  }
                })()
              ) : (
                <div className="text-4xl font-semibold text-gray-500 dark:text-gray-300">{(fullName || email).charAt(0).toUpperCase()}</div>
              )}
            </div>

            <div className="mt-4 w-full flex flex-col items-center">
              {isOwnProfile ? (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <button type="button" onClick={onPickAvatar} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm">
                    Upload photo
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarFile(null)
                        setAvatarUrl(null)
                      }}
                      className="mt-2 text-sm text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </>
              ) : (
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => handleMessage((viewingUserIdParam as string) || '')} className="px-3 py-1 rounded-md bg-blue-600 text-white">Message</button>
                </div>
              )}
            </div>

            <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
              <div className="font-medium text-gray-900 dark:text-gray-100">{fullName || 'No name'}</div>
              <div className="text-xs">{email}</div>
              <div className="mt-1 text-xs text-gray-500">{role ?? 'Member'}</div>
            </div>
            {isOwnProfile && (/* Show convert-to-organization action when user is not already an organization and is allowed (not admin) */
              <div className="mt-3 text-center">
                {/* userType may be available on the loaded profile; default to individual when missing */}
                {(() => {
                  try {
                    const ut = String((user && (user as any).userType) || '').toLowerCase();
                    const roleVal = String(role || (user && ((user as any).role || (user as any).user_metadata?.role)) || '').toLowerCase();
                    // allowed roles that can convert to organization — keep these UI-only choices
                    const allowed = ['student', 'junior', 'mentor', 'member'];
                    if (ut === 'organization') return false
                    if (!allowed.includes(roleVal)) return false
                    // hide for admin or elevated accounts
                    if (roleVal === 'admin') return false
                    return true
                  } catch (e) { return false }
                })() && (
                  <button onClick={() => { window.location.href = '/app/register-organization' }} className="mt-2 px-4 py-2 rounded-md bg-green-600 text-white text-sm">Become an Organization</button>
                )}
              </div>
            )}
          </div>

          {/* Right column - form */}
          <div className="md:w-2/3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Profile</h2>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">{isOwnProfile ? 'Manage your public profile information.' : 'Public profile'}</p>
              </div>
              <div>
                {isOwnProfile && (
                  <button onClick={handleEdit} className="px-3 py-1 rounded-md border bg-white dark:bg-gray-700 text-sm flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {!isOwnProfile && (
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-1 rounded-md bg-blue-600 text-white" onClick={() => handleMessage((viewingUserIdParam as string) || '')}>Message</button>
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Full name</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  readOnly={!isOwnProfile}
                  className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{email}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Role</label>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{role ?? 'Member'}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Job title</label>
                <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} readOnly={!isOwnProfile} className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Company</label>
                <input value={company} onChange={e => setCompany(e.target.value)} readOnly={!isOwnProfile} className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} readOnly={!isOwnProfile} className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Skills</label>
                <div className="mt-1">
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s, i) => (
                      <span key={s + i} className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100">
                        {s}
                        <button type="button" onClick={() => removeSkill(i)} className="ml-2 text-xs text-red-500 hover:underline">×</button>
                      </span>
                    ))}
                  </div>

                  {isOwnProfile && (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault()
                            addSkillFromInput()
                          }
                        }}
                        placeholder="Add a skill and press Enter"
                        className="flex-1 rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                      />
                      <button type="button" onClick={() => addSkillFromInput()} className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-sm">
                        Add
                      </button>
                    </div>
                  )}

                  {/* suggestions */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SUGGESTED_SKILLS.filter(s => !skills.includes(s) && s.toLowerCase().includes(skillInput.toLowerCase())).slice(0, 6).map(s => (
                      <button key={s} type="button" onClick={() => { if (isOwnProfile) { setSkills(prev => [...prev, s]); setSkillInput('') } }} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">{s}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Experience level</label>
                <select value={experience} onChange={e => setExperience(e.target.value)} className="mt-1 block w-48 rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm">
                  {EXPERIENCE_LEVELS.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {isOwnProfile ? (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                  <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" onClick={handleCancel} disabled={saving} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md">
                    Cancel
                  </button>
                  {error && <div className="text-sm text-red-500 ml-4">{error}</div>}
                </div>
              ) : (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  {/* read-only view - no edit actions */}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Portfolio / files section */}
      {isOwnProfile && (
        <div className="max-w-4xl mx-auto p-6 mt-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium">Portfolio & Files</h3>
            <p className="text-sm text-gray-500">Upload supporting materials, resumes, session files or project artifacts.</p>
            <div className="mt-4">
              <FileUpload onUploaded={() => { window.location.reload() }} multiple />
              <FileGallery userId={(user && (user._id || user.id)) || ''} allowDelete />
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {isEditing && editData && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold">Edit profile</h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-sm">Bio</label>
                <textarea value={editData.bio || ''} onChange={e => setEditData({...editData, bio: e.target.value})} className="w-full mt-1 p-2 rounded border" rows={4} />
              </div>
              <div>
                <label className="text-sm">Skills (comma separated)</label>
                <input value={editData.skillsString || ''} onChange={e => setEditData({...editData, skillsString: e.target.value})} className="w-full mt-1 p-2 rounded border" />
              </div>
              <div className="flex gap-2 justify-end pt-3">
                <button onClick={() => setIsEditing(false)} className="px-3 py-1 rounded border">Cancel</button>
                <button onClick={handleSaveEdit} className="px-3 py-1 rounded bg-blue-600 text-white">{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      Crop & Preview
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
