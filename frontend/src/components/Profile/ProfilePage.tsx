import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../UX/ToastProvider'
import FileUpload from '../../components/FileUpload/FileUpload'
import FileGallery from '../../components/FileGallery/FileGallery'
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

  function onPickAvatar() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return

    // show preview immediately
    const previewUrl = URL.createObjectURL(file)
    setAvatarUrl(previewUrl)

    // process image (resize, center-crop, convert to webp, circular mask)
    try {
      const processed = await processImageFile(file, 500)
      setAvatarFile(processed)
      // update preview to the processed blob
      const processedUrl = URL.createObjectURL(processed)
      setAvatarUrl(processedUrl)
    } catch (err: any) {
      console.error('Image processing failed', err)
      setError('Failed to process image. Please try a different picture.')
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
      setAvatarUrl(profile.avatar ?? null)
      setBio(profile.bio ?? '')
      setSkills(Array.isArray(profile.skills) ? profile.skills : profile.skills ? [profile.skills] : [])
      setExperience((profile.experienceLevel ?? profile.experience) || 'Mid')
      setJobTitle(profile.title ?? '')
      setCompany(profile.company ?? '')

      originalRef.current = {
        fullName: nameFromProfile || (user.user_metadata?.full_name ?? ''),
        avatarUrl: profile.avatar ?? null,
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
    if (file instanceof File) uploadFile = file
    else uploadFile = new File([file as Blob], `avatar.webp`, { type: (file as Blob).type || 'image/webp' })
    fd.append('avatar', uploadFile)

  const t = token || (user as any)?._token || (user as any)?.token || ''
  const res = await fetch(`${API_BASE}/profiles/me/avatar`, { method: 'POST', headers: t ? { Authorization: `Bearer ${t}` } : undefined, body: fd })
    let j: any = null
    try {
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) j = await res.json()
      else {
        const text = await res.text()
        throw new Error('Non-JSON response from /api/profiles/me/avatar: ' + text.slice(0, 500))
      }
    } catch (parseErr) {
      console.warn('Failed to parse JSON from /api/profiles/me/avatar', parseErr)
    }
    if (!res.ok || !j || !j.success) throw new Error((j && j.message) ? j.message : 'Upload failed')
    // server returns updated profile in j.data.profile
    return (j.data && j.data.profile && j.data.profile.avatar) ? j.data.profile.avatar : null
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
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Profile</h2>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Profile</h2>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">{isOwnProfile ? 'Manage your public profile information.' : 'Public profile'}</p>
              </div>
              <div>
                {isOwnProfile && (
                  <button onClick={handleEdit} className="px-3 py-1 rounded-md border bg-white dark:bg-gray-700 text-sm">✏️ Edit Profile</button>
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
              <FileUpload onUploaded={(f) => { try { /* refresh gallery by re-rendering via key change */ } catch (e) {} }} multiple />
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
    </div>
  )
}
