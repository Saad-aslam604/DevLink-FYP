import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Mentor } from '../data/mentors'
import { useForm } from 'react-hook-form'
import { useToast } from '../components/UX/ToastProvider'
import api from '../services/api'

type ExistingBooking = { date: string; time: string; duration: number }

type BookingPayload = {
  date: string
  time: string
  duration: number
  meetingType?: string
  startTime: string
  endTime: string
}

type Props = {
  open: boolean
  onClose: () => void
  onConfirm?: (data: BookingPayload) => void
  mentor?: Mentor | null
  existingBookings?: ExistingBooking[]
}

type FormValues = {
  date: string
  time: string
  duration: string
  meetingType: string
}

const DURATIONS = [30, 60]
const MEETING_TYPES = ['Video Call', 'Video Call and Live Coding']

function generateTimeSlots(start = 9, end = 18, intervalMin = 30) {
  const slots: string[] = []
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += intervalMin) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      slots.push(`${hh}:${mm}`)
    }
  }
  return slots
}

function toDateTime(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00`)
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}

export default function SessionBooking({ open, onClose, onConfirm, mentor, existingBookings = [] }: Props) {
  const slots = useMemo(() => generateTimeSlots(9, 18, 30), [])
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isValid }
  } = useForm<FormValues>({ mode: 'onChange', defaultValues: { date: '', time: '', duration: '', meetingType: '' } })

  const watchedDate = watch('date')
  const watchedTime = watch('time')
  const watchedDuration = watch('duration')

  // Create a stable key for existingBookings to avoid re-running validation effect
  // when a new array instance (but same contents) is passed in by parent.
  const bookingsKey = React.useMemo(() => JSON.stringify(existingBookings || []), [existingBookings])

  useEffect(() => {
    if (!open) {
      setSubmitting(false)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    clearErrors('time')
    clearErrors('date')
    clearErrors('duration')

    const d = watchedDate
    const t = watchedTime
    const dur = Number(watchedDuration)
    if (!d || !t || !dur) return

    const selected = toDateTime(d, t)
    const now = new Date()
    const max = new Date()
    max.setMonth(max.getMonth() + 3)

    if (selected < new Date(now.toDateString() + ' 00:00:00')) {
      setError('date', { type: 'manual', message: 'Cannot book a past date' })
      return
    }

    if (selected > max) {
      setError('date', { type: 'manual', message: 'Date must be within 3 months' })
      return
    }

    const day = selected.getDay()
    if (day === 0 || day === 6) {
      setError('date', { type: 'manual', message: 'Weekends are not available' })
      return
    }

    const hour = selected.getHours()
    const minute = selected.getMinutes()
    const startBusiness = 9
    const endBusiness = 18
    if (hour < startBusiness || hour > endBusiness || (hour === endBusiness && minute > 0)) {
      setError('time', { type: 'manual', message: 'Select a time during business hours (9:00-18:00)' })
      return
    }

    if (minute % 30 !== 0) {
      setError('time', { type: 'manual', message: 'Time must be on 30-minute intervals' })
      return
    }

    const aStart = selected
    const aEnd = new Date(selected.getTime() + dur * 60000)
    for (const b of existingBookings) {
      const bStart = toDateTime(b.date, b.time)
      const bEnd = new Date(bStart.getTime() + b.duration * 60000)
      if (overlaps(aStart, aEnd, bStart, bEnd)) {
        setError('time', { type: 'manual', message: 'This time overlaps with an existing meeting' })
        return
      }
    }
  }, [watchedDate, watchedTime, watchedDuration, bookingsKey, clearErrors, setError])

  async function onSubmit(values: FormValues) {
    if (submitting) return
    setSubmitting(true)
    try {
      // compute ISO start/end so backend receives a consistent shape
      const selected = toDateTime(values.date, values.time)
      const dur = Number(values.duration)
      const startISO = new Date(selected.getTime()).toISOString()
      const endISO = new Date(selected.getTime() + dur * 60000).toISOString()

      const payload = {
        ...values,
        duration: dur,
        startTime: startISO,
        endTime: endISO,
      }

      // Create booking via central API helper so auth headers are attached
      const j = await api.post('/bookings', { mentorId: mentor && (mentor as any).id, ...payload })
      const booking = j && j.data && j.data.booking ? j.data.booking : null
      // If Stripe publishable key present, redirect to checkout; else keep legacy behavior
      const publishable = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
      if (publishable && booking && booking._id) {
        navigate(`/app/checkout?bookingId=${booking._id}`)
      } else {
        onConfirm?.(payload)
        toast.show('Session booked successfully!', 'success')
        setTimeout(() => onClose(), 900)
      }
    } catch (e) {
      toast.show('Booking failed - please try again', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <form onSubmit={handleSubmit(onSubmit)} className="relative w-full max-w-xl mx-4 bg-white dark:bg-gray-900 rounded-2xl p-6 text-gray-800 dark:text-gray-200 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Book a Meeting</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Choose a date, time and meeting type.</p>
            {mentor && (
              <div className="mt-3 flex items-center gap-3">
                <img src={mentor.avatar} alt={mentor.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{mentor.name}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">{mentor.title}</div>
                </div>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" aria-label="Close">✕</button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Date</label>
            <input
              type="date"
              {...register('date', { required: 'Please select a date' })}
              className="w-full rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-3 py-2 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.date && <div className="text-xs text-red-400 mt-1">{errors.date.message}</div>}
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Time slot</label>
            <select
              {...register('time', { required: 'Please select a time slot' })}
              className="w-full rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-3 py-2 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" className="text-gray-600 dark:text-gray-300">Select time</option>
              {slots.map((s) => (
                <option key={s} value={s} className="text-gray-800 dark:text-gray-200">{s}</option>
              ))}
            </select>
            {errors.time && <div className="text-xs text-red-400 mt-1">{errors.time.message}</div>}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Duration</label>
            <select
              {...register('duration', { required: 'Please select a duration' })}
              className="w-full rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-3 py-2 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" className="text-gray-600 dark:text-gray-300">Select duration</option>
              {DURATIONS.map((d) => (
                <option key={d} value={d} className="text-gray-800 dark:text-gray-200">{d} min</option>
              ))}
            </select>
            {errors.duration && <div className="text-xs text-red-400 mt-1">{errors.duration.message}</div>}
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Meeting type</label>
            <div className="flex flex-col gap-2">
              {MEETING_TYPES.map((t) => (
                <label key={t} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    {...register('meetingType', { required: 'Please select a meeting type' })}
                    value={t}
                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-800 dark:text-gray-200">{t}</span>
                </label>
              ))}
            </div>
            {errors.meetingType && <div className="text-xs text-red-400 mt-1">{errors.meetingType.message}</div>}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 h-11 rounded-md bg-white/6 text-white/90">Cancel</button>
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="px-4 py-2 h-11 rounded-md bg-[#0066FF] hover:bg-[#0051d4] text-white disabled:opacity-60 flex items-center gap-2"
          >
            {submitting ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
            ) : null}
            {submitting ? 'Confirming...' : 'Confirm Meeting'}
          </button>
        </div>

        {/* Session booking uses global toast provider for feedback */}
      </form>
    </div>
  )
}
