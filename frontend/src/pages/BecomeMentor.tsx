import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useForm } from 'react-hook-form'

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

type FormValues = {
  title: string
  company: string
  yearsExperience: number
  bio: string
  github?: string
  skills: string[]
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  expertiseAreas: string
  hourlyRate: number
  hoursPerWeek: number
  acceptCommission: boolean
}

const SKILL_OPTIONS = [
  'React',
  'Node.js',
  'Python',
  'JavaScript',
  'TypeScript',
  'Java',
  'C++',
  'AWS',
  'Docker',
  'Kubernetes',
  // AI / ML related skills
  'Machine Learning',
  'Deep Learning',
  'NLP',
  'Computer Vision',
  'TensorFlow',
  'PyTorch',
  'MLOps',
  'Data Engineering',
]
const HOURS_OPTIONS = [5, 10, 15, 20]

export default function BecomeMentor() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } , setValue } = useForm<FormValues>({
    defaultValues: {
      title: '',
      company: '',
      yearsExperience: 1,
      bio: '',
      github: '',
      skills: [],
      skillLevel: 'Intermediate',
      expertiseAreas: '',
      hourlyRate: 50,
      hoursPerWeek: 5,
      acceptCommission: false,
    }
  })

  const bioValue = watch('bio')
  const years = watch('yearsExperience') || 1
  const suggestedRate = useMemo(() => {
    const base = 50
    const extra = Math.min(200, (years || 0) * 10)
    return base + extra
  }, [years])

  // keep hourlyRate suggested in sync if user hasn't touched it explicitly: we'll not auto-overwrite if set by user
  // but provide a quick "use suggested" button

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    setSuccess(null)
    try {
      const payload: any = {
        title: data.title,
        company: data.company,
        // backend expects `yearsOfExperience` — normalize the field name
        yearsOfExperience: data.yearsExperience,
        mentorBio: data.bio,
        githubUrl: data.github || undefined,
        skills: data.skills && data.skills.length ? data.skills : undefined,
        skillLevel: data.skillLevel,
        expertiseAreas: data.expertiseAreas ? data.expertiseAreas.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        hourlyRate: data.hourlyRate,
        hoursPerWeek: data.hoursPerWeek,
        acceptCommission: !!data.acceptCommission,
      }

      const res = await fetch(`${API_BASE}/profiles/become-mentor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = json && json.message ? json.message : 'Failed to submit'
        throw new Error(message)
      }

      setSuccess('Your request was submitted. Your profile will be updated.')
      setLoading(false)
      setTimeout(() => navigate('/app/mentors'), 900)
    } catch (err: any) {
      setLoading(false)
      setSuccess(null)
      alert(err?.message || 'Failed to submit')
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Display-only terminology mapping: "Mentor" -> "Senior Developer" */}
      <h1 className="text-2xl font-semibold mb-4">Become a Senior Developer</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Title</label>
          <input {...register('title', { required: 'Title is required' })} className="w-full rounded-md border px-3 py-2 bg-white text-gray-800 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="Senior React Engineer" />
          {errors.title && <div className="text-red-600 mt-1">{errors.title.message}</div>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Professional info</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <input {...register('company', { required: 'Current company is required' })} className="w-full rounded-md border px-3 py-2 bg-white text-gray-800 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="Current company" />
              {errors.company && <div className="text-red-600 mt-1">{errors.company.message}</div>}
            </div>
            <div>
              <input type="number" {...register('yearsExperience', { required: 'Years of experience is required', valueAsNumber: true, min: { value: 1, message: 'Minimum 1 year' }, max: { value: 50, message: 'Maximum 50' } })} className="w-full rounded-md border px-3 py-2 bg-white text-gray-800 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="Years of experience" min={1} max={50} />
              {errors.yearsExperience && <div className="text-red-600 mt-1">{errors.yearsExperience.message}</div>}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Short bio</label>
          <textarea {...register('bio', { required: 'Bio is required', minLength: { value: 10, message: 'Bio must be at least 10 characters' } })} className="w-full rounded-md border px-3 py-2 bg-white text-gray-800 dark:bg-gray-700 dark:text-white dark:border-gray-600" rows={4} placeholder="Tell learners what you teach" />
          <div className="flex items-center justify-between mt-1">
            {errors.bio && <div className="text-red-600">{errors.bio.message}</div>}
            <div className="text-sm text-gray-500 dark:text-gray-300">{(bioValue || '').length}/500</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Portfolio links</label>
          <input {...register('github', { validate: v => !v || v.includes('github.com') || 'GitHub URL must contain github.com' })} className="w-full rounded-md border px-3 py-2 bg-white text-gray-800 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="https://github.com/yourname (optional)" />
          {errors.github && <div className="text-red-600 mt-1">{errors.github.message}</div>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Skills</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Use checkboxes so multiple selection is explicit and accessible */}
            {SKILL_OPTIONS.map((s) => {
              const selected: string[] = watch('skills') || []
              const checked = selected.includes(s)
              return (
                <label key={s} className={`flex items-center gap-2 px-2 py-1 rounded border ${checked ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white border-gray-200'}`}>
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const current: string[] = watch('skills') || []
                      const next = e.target.checked ? [...current, s] : current.filter((x) => x !== s)
                      setValue('skills', next, { shouldValidate: true, shouldDirty: true })
                    }}
                  />
                  <span className="text-sm">{s}</span>
                </label>
              )
            })}
          </div>
          {errors.skills && <div className="text-red-600 mt-1">{(errors.skills as any).message || 'Select at least one skill'}</div>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Skill level</label>
          <select {...register('skillLevel', { required: 'Skill level is required' })} className="w-full rounded-md border px-3 py-2 bg-white text-gray-800 dark:bg-gray-700 dark:text-white dark:border-gray-600">
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
            <option>Expert</option>
          </select>
          {errors.skillLevel && <div className="text-red-600 mt-1">{errors.skillLevel.message}</div>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Expertise areas (comma separated)</label>
          <input {...register('expertiseAreas', { required: 'Expertise areas are required' })} className="w-full rounded-md border px-3 py-2 bg-white text-gray-800 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="Frontend, Architecture" />
          {errors.expertiseAreas && <div className="text-red-600 mt-1">{errors.expertiseAreas.message}</div>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Hourly rate (USD) <span title="Suggested rate is calculated from experience" className="text-xs text-gray-500 dark:text-gray-300">(suggested: ${suggestedRate})</span></label>
          <div className="flex gap-3">
            <input type="number" {...register('hourlyRate', { required: 'Hourly rate is required', valueAsNumber: true, min: { value: 1, message: 'Rate must be positive' } })} className="w-full rounded-md border px-3 py-2 bg-white text-gray-800 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="50" />
            <button type="button" onClick={() => setValue('hourlyRate', suggestedRate)} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">Use suggested</button>
          </div>
          {errors.hourlyRate && <div className="text-red-600 mt-1">{errors.hourlyRate.message}</div>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Availability</label>
          <select {...register('hoursPerWeek', { required: 'Availability is required', valueAsNumber: true })} className="w-full rounded-md border px-3 py-2 bg-white text-gray-800 dark:bg-gray-700 dark:text-white dark:border-gray-600">
            {HOURS_OPTIONS.map(h => <option key={h} value={h}>{h} hours/week</option>)}
          </select>
          {errors.hoursPerWeek && <div className="text-red-600 mt-1">{errors.hoursPerWeek.message}</div>}
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" {...register('acceptCommission', { validate: v => v === true || 'You must accept the 15% platform commission' })} />
          <label className="text-sm">I accept 15% platform commission</label>
        </div>
        {errors.acceptCommission && <div className="text-red-600">{errors.acceptCommission.message}</div>}

        {success && <div className="text-green-600">{success}</div>}

        <div>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md">
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  )
}
