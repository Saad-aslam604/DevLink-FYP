const express = require('express')
const router = express.Router()
const User = require('../models/User')

const ADMIN_USER = process.env.ADMIN_USER || 'admin@example.com'
const ADMIN_PASS = process.env.ADMIN_PASS || 'adminpass'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admintoken123'
const adminAuth = require('../middleware/adminAuth')

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ success: false, message: 'email/password required' })
    if (email === ADMIN_USER && password === ADMIN_PASS) {
      return res.json({ success: true, token: ADMIN_TOKEN })
    }
    return res.status(401).json({ success: false, message: 'Invalid admin credentials' })
  } catch (e) {
    console.error('/api/admin/login error', e)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Use centralized adminAuth middleware

// GET /api/admin/me
router.get('/me', adminAuth, async (req, res) => {
  return res.json({ success: true, data: { email: ADMIN_USER, role: 'admin' } })
})

// GET /api/admin/users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().lean().limit(200)
    return res.json({ success: true, data: users })
  } catch (e) {
    console.error('GET /api/admin/users error', e)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body || {}
    if (!id || !role) return res.status(400).json({ success: false, message: 'id and role required' })
    const u = await User.findById(id)
    if (!u) return res.status(404).json({ success: false, message: 'User not found' })
    u.role = role
    await u.save()
    return res.json({ success: true, data: u })
  } catch (e) {
    console.error('PATCH /api/admin/users/:id/role error', e)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /api/admin/stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const Payment = require('../models/Payment')
    const Booking = require('../models/Booking')
    const MentorApplication = require('../models/MentorApplication')

    // Summary
    const usersCount = await User.countDocuments()
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000)
    const activeUsers = await User.countDocuments({ lastActive: { $gte: fifteenMinsAgo } })
    const activeSessions = await Booking.countDocuments({ status: 'active' })

    // Total revenue (succeeded payments)
    const revAgg = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    const totalRevenueCents = (revAgg[0] && revAgg[0].total) || 0
    const totalRevenue = Number((totalRevenueCents / 100).toFixed(2))

    const totalMentors = await User.countDocuments({ $or: [{ role: 'mentor' }, { isMentor: true }] })
    const pendingApplications = await MentorApplication.countDocuments({ status: 'pending' })

    // Revenue trend - last 30 days (daily)
    const start30 = new Date()
    start30.setDate(start30.getDate() - 29)
    start30.setHours(0,0,0,0)
    const revenueTrend = await Payment.aggregate([
      { $match: { status: 'succeeded', createdAt: { $gte: start30 } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$amount' }, sessions: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    // normalize to last 30 days (fill missing dates)
    const revenueMap = {}
    revenueTrend.forEach(r => { revenueMap[r._id] = r })
    const revenueTrendFilled = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(start30);
      d.setDate(start30.getDate() + i)
      const key = d.toISOString().slice(0,10)
      const rec = revenueMap[key]
      revenueTrendFilled.push({ date: key, revenue: rec ? Number((rec.revenue/100).toFixed(2)) : 0, sessions: rec ? rec.sessions : 0 })
    }

    // User growth - last 6 months by month
    const now = new Date()
    const months = []
    for (let m = 5; m >= 0; m--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - m, 1)
      months.push({ year: dt.getFullYear(), month: dt.getMonth() + 1, label: dt.toLocaleString('default', { month: 'short' }) })
    }
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const userGrowthAgg = await User.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $project: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, role: 1 } },
      { $group: { _id: { year: '$year', month: '$month', role: '$role' }, count: { $sum: 1 } } }
    ])
    const userMap = {}
    userGrowthAgg.forEach(u => {
      const key = `${u._id.year}-${u._id.month}`
      userMap[key] = userMap[key] || { month: `${u._id.month}`, students: 0, mentors: 0 }
      if (u._id.role === 'mentor') userMap[key].mentors += u.count
      else userMap[key].students += u.count
    })
    const userGrowth = months.map(m => {
      const key = `${m.year}-${m.month}`
      const rec = userMap[key] || { students: 0, mentors: 0 }
      return { month: m.label, students: rec.students, mentors: rec.mentors }
    })

    // Platform metrics
    const bookingAgg = await Booking.aggregate([
      { $group: { _id: null, avgPrice: { $avg: '$price' }, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status','completed'] }, 1, 0] } } } }
    ])
    const avgSessionPrice = bookingAgg[0] ? Number(((bookingAgg[0].avgPrice || 0) / 100).toFixed(2)) : 0
    const completionRate = bookingAgg[0] && bookingAgg[0].total ? Math.round((bookingAgg[0].completed / bookingAgg[0].total) * 100) : 0
    const userRatingAgg = await User.aggregate([{ $group: { _id: null, avgRating: { $avg: '$rating' } } }])
    const satisfactionScore = userRatingAgg[0] ? Number((userRatingAgg[0].avgRating || 0).toFixed(2)) : 0

    // Recent activity - combine latest payments/bookings/users/applications
    // Populate payer and booking->mentor so frontend can show receiver information
    const payments = await Payment.find({}).sort({ createdAt: -1 }).limit(5)
      .populate('payer', 'firstName lastName email')
      .populate({ path: 'booking', populate: { path: 'mentor', select: 'firstName lastName email' } })
      .lean()
    const bookings = await Booking.find({}).sort({ createdAt: -1 }).limit(5).populate('student mentor', 'firstName lastName email').lean()
    const users = await User.find({}).sort({ createdAt: -1 }).limit(5).select('firstName lastName email role createdAt').lean()
    const apps = await MentorApplication.find({}).sort({ submittedAt: -1 }).limit(5).populate('userId', 'firstName lastName email').lean()

    const recent = []
    payments.forEach(p => recent.push({
      type: 'payment',
      timestamp: p.createdAt,
      user: p.payer || null,
      action: 'payment_succeeded',
      metadata: {
        amount: Number((p.amount/100).toFixed(2)),
        currency: p.currency || 'usd',
        paymentIntentId: p.stripePaymentIntentId || p.stripeChargeId || null,
        bookingId: p.booking ? String(p.booking._id) : null,
        mentor: p.booking && p.booking.mentor ? { _id: p.booking.mentor._id, firstName: p.booking.mentor.firstName, lastName: p.booking.mentor.lastName, email: p.booking.mentor.email } : null
      }
    }))
    bookings.forEach(b => recent.push({ type: 'booking', timestamp: b.createdAt, user: b.student || null, action: 'booking_created', metadata: { mentor: b.mentor, startTime: b.startTime } }))
    users.forEach(u => recent.push({ type: 'user', timestamp: u.createdAt, user: u, action: 'user_registered', metadata: {} }))
    apps.forEach(a => recent.push({ type: 'application', timestamp: a.submittedAt || a.createdAt, user: a.userId || null, action: 'mentor_application', metadata: { score: a.applicationScore } }))

    recent.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
    const recentActivity = recent.slice(0, 10)

    const out = {
      summary: {
        totalUsers: usersCount,
        activeUsers,
        totalRevenue,
        activeSessions,
        totalMentors,
        pendingApplications
      },
      revenueTrend: revenueTrendFilled,
      userGrowth,
      platformMetrics: {
        commissionRate: 15,
        avgSessionPrice,
        completionRate,
        satisfactionScore
      },
      recentActivity
    }

    return res.json({ success: true, data: out })
  } catch (e) {
    console.error('GET /api/admin/stats error', e)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Debug endpoints (admin-only)
router.get('/debug/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 }).limit(50);
    console.log('🔍 Debug users endpoint called:', { count: users.length });
    res.json({ success: true, data: { total: users.length, users: users.map(u => ({ id: u._id, email: u.email, role: u.role, name: u.name, createdAt: u.createdAt, isMentorVerified: u.isMentorVerified })) } });
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
 
// POST /api/admin/announce - send announcement (development: console-only email)
try {
  const emailService = require('../utils/emailService')
  router.post('/announce', adminAuth, async (req, res) => {
    try {
      const { subject, message, sendTo } = req.body || {}
      if (!subject || !message) return res.status(400).json({ success: false, message: 'subject and message required' })

      const User = require('../models/User')
      // For development, default to log-only. If sendTo === 'all', iterate users and call console email
      const users = await User.find({}).select('email firstName').lean()
      users.forEach(u => {
        try {
          // console-only send
          if (emailService && typeof emailService.sendPasswordResetEmail === 'function') {
            // reuse sendPasswordResetEmail to log a message (it expects token param) - instead just console.log here
            console.log('ANNOUNCEMENT to', u.email, 'subject:', subject)
          } else {
            console.log('ANNOUNCEMENT to', u.email, 'subject:', subject)
          }
        } catch (e) { /* ignore per-user errors */ }
      })

      return res.json({ success: true, message: 'Announcement processed (console-only in dev)', recipients: users.length })
    } catch (err) {
      console.error('/api/admin/announce error', err)
      return res.status(500).json({ success: false, message: 'Server error' })
    }
  })
} catch (e) {
  // ignore if emailService not available
}

const MentorApplication = require('../models/MentorApplication');
router.get('/debug/applications', adminAuth, async (req, res) => {
  try {
    const applications = await MentorApplication.find({}).populate('userId', 'email name role').sort({ submittedAt: -1 });
    console.log('🔍 Debug applications:', { total: applications.length });
    res.json({ success: true, data: { total: applications.length, applications: applications.map(a => ({ id: a._id, userId: a.userId?._id, userEmail: a.userId?.email, userRole: a.userId?.role, title: a.title, status: a.status, score: a.applicationScore, requestedRate: a.requestedRate, submittedAt: a.submittedAt })) } });
  } catch (error) {
    console.error('Debug applications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router
