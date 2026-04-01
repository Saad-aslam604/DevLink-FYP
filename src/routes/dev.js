const express = require('express')
const router = express.Router()
const User = require('../models/User')

// Dev-only: create a test mentor quickly
router.post('/create-test-mentor', async (req, res) => {
  try {
    // Only allow in development
    if ((process.env.NODE_ENV || 'development') !== 'development') {
      return res.status(403).json({ success: false, message: 'Not allowed' })
    }

    const timestamp = Date.now()
    const email = `test-mentor-${timestamp}@dev.local`
    const firstName = 'Test'
    const lastName = 'Mentor'

    const user = new User({
      email,
      role: 'mentor',
      firstName,
      lastName,
      isMentor: true,
      isActive: true,
      isMentorVerified: true,
      skills: ['testing', 'mentoring'],
      title: 'Test Mentor',
      hourlyRate: 0
    })

    await user.save()

    return res.json({ success: true, data: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName } })
  } catch (err) {
    console.error('Dev create-test-mentor error:', err)
    return res.status(500).json({ success: false, message: 'Failed to create test mentor', error: err && err.message })
  }
})

module.exports = router
