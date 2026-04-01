const express = require('express')
const router = express.Router()

// Dev-only activate booking endpoint
// POST /api/test/activate-booking/:id
router.post('/activate-booking/:id', async (req, res) => {
  try {
    if ((process.env.NODE_ENV || 'development') !== 'development') {
      return res.status(403).json({ success: false, message: 'Not allowed' })
    }

    const Booking = require('../models/Booking')
    const Message = require('../models/Message')
    const socketModule = require('../socket')

    const id = req.params.id
    if (!id) return res.status(400).json({ success: false, message: 'Booking id required' })

    const booking = await Booking.findById(id)
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' })

  // Set startTime slightly in the future so the session remains "upcoming"
  // but the UI's safety margin will treat it as active for immediate video testing.
  const now = Date.now()
  booking.startTime = new Date(now + 60 * 1000) // start = now + 1 minute
  booking.endTime = new Date(now + 31 * 60 * 1000) // end = now + 31 minutes
    booking.status = 'confirmed'
    await booking.save()

    // Create a small system welcome message so conversations appear in UI
    try {
      const mentorId = booking.mentor
      const studentId = booking.student
      const startStr = booking.startTime ? new Date(booking.startTime).toLocaleString() : 'now'
      const content = `Test session activated for ${startStr}. This is an automated test message.`
      const msg = await Message.create({ booking: booking._id, sender: mentorId || studentId, content, meta: { system: true, receiver: String(studentId || '') } })

      // Emit socket events for booking and chat so clients refresh
      try {
        const io = socketModule && typeof socketModule.getIo === 'function' ? socketModule.getIo() : null
        if (io) {
          const bid = booking._id.toString()
          io.to(`booking_${bid}`).emit('booking-updated', { booking })
          if (booking.student) io.to(`user_${String(booking.student)}`).emit('chat-message', msg)
          if (booking.mentor) io.to(`user_${String(booking.mentor)}`).emit('chat-message', msg)
        }
      } catch (e) {
        console.warn('Failed to emit socket events for activate-booking:', e && e.message ? e.message : e)
      }
    } catch (e) {
      console.warn('Failed to create welcome message for activated booking:', e && e.message ? e.message : e)
    }

  console.log(`Activated booking ${booking._id} for testing: start=${booking.startTime.toISOString()} end=${booking.endTime.toISOString()}`)
  return res.json({ success: true, data: { booking } })
  } catch (err) {
    console.error('activate-booking error:', err && err.message ? err.message : err)
    return res.status(500).json({ success: false, message: 'Failed to activate booking', error: err && err.message })
  }
})

module.exports = router
