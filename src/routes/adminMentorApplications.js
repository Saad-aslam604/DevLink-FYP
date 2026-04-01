const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const MentorApplication = require('../models/MentorApplication')
const User = require('../models/User')

const adminAuth = require('../middleware/adminAuth')

// Apply admin authentication middleware to all admin mentor-application routes
router.use(adminAuth)

// Helper: safe parse int
const toInt = (v, def = 0) => { const n = parseInt(v, 10); return Number.isNaN(n) ? def : n }

// 1. GET / - list applications
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20, sortBy = 'submittedAt', sortOrder = 'desc', search, minScore, maxScore } = req.query || {}
    const p = Math.max(toInt(page, 1), 1)
    const l = Math.min(Math.max(toInt(limit, 20), 1), 200)

    const match = {}
    if (status) match.status = status
    if (minScore !== undefined || maxScore !== undefined) {
      match.applicationScore = {}
      if (minScore !== undefined) match.applicationScore.$gte = Number(minScore)
      if (maxScore !== undefined) match.applicationScore.$lte = Number(maxScore)
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1
    const sort = { [sortBy]: sortDir }

    // Build aggregation with lookup to user
    const pipeline = [
      { $match: match },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]

    if (search) {
      const s = String(search)
      pipeline.push({ $match: { $or: [
        { title: { $regex: s, $options: 'i' } },
        { bio: { $regex: s, $options: 'i' } },
        { 'user.firstName': { $regex: s, $options: 'i' } },
        { 'user.lastName': { $regex: s, $options: 'i' } },
        { 'user.email': { $regex: s, $options: 'i' } },
      ] } })
    }

    // Count total
    const countPipeline = [...pipeline, { $count: 'total' }]
    const countRes = await MentorApplication.aggregate(countPipeline).exec()
    const total = (countRes && countRes[0] && countRes[0].total) ? countRes[0].total : 0

    // Add sort, pagination, projection
    pipeline.push({ $sort: sort })
    pipeline.push({ $skip: (p - 1) * l })
    pipeline.push({ $limit: l })
    pipeline.push({ $project: {
      title: 1, bio: 1, status:1, requestedRate:1, submittedAt:1, yearsOfExperience:1,
      user: { _id: '$user._id', firstName: '$user.firstName', lastName: '$user.lastName', email: '$user.email', avatar: '$user.avatar', role: '$user.role' }
    }})

    const results = await MentorApplication.aggregate(pipeline).exec()

    const pages = Math.ceil(total / l)
    return res.json({ success: true, data: results, pagination: { total, page: p, limit: l, pages, hasNext: p < pages, hasPrev: p > 1 } })
  } catch (err) {
    console.error('GET /api/admin/mentor-applications error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// 2. GET /stats (placed before :id to avoid route param collision)
router.get('/stats', async (req, res) => {
  try {
    const total = await MentorApplication.countDocuments()
    const pending = await MentorApplication.countDocuments({ status: 'pending' })
    const approved = await MentorApplication.countDocuments({ status: 'approved' })
    const rejected = await MentorApplication.countDocuments({ status: 'rejected' })

    const avgRequested = await MentorApplication.aggregate([{ $group: { _id: null, avg: { $avg: '$requestedRate' } } }])
    const avgApproved = await MentorApplication.aggregate([{ $group: { _id: null, avg: { $avg: '$approvedRate' } } }])
    const avgScore = await MentorApplication.aggregate([{ $group: { _id: null, avg: { $avg: '$applicationScore' } } }])

    // recent activity - group by day for last 14 days
    const recent = await MentorApplication.aggregate([
      { $match: { submittedAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } }, pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }, approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } } } },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ])

    const approvalRate = total > 0 ? `${((approved / total) * 100).toFixed(1)}%` : '0%'

    return res.json({ success: true, data: {
      total, pending, approved, rejected,
      avgRequestedRate: (avgRequested && avgRequested[0] && avgRequested[0].avg) ? Number(avgRequested[0].avg.toFixed(2)) : 0,
      avgApprovedRate: (avgApproved && avgApproved[0] && avgApproved[0].avg) ? Number(avgApproved[0].avg.toFixed(2)) : 0,
      avgApplicationScore: (avgScore && avgScore[0] && avgScore[0].avg) ? Number(avgScore[0].avg.toFixed(2)) : 0,
      approvalRate,
      recentActivity: recent.map(r => ({ date: r._id, pending: r.pending, approved: r.approved, rejected: r.rejected }))
    }})
  } catch (err) {
    console.error('GET /api/admin/mentor-applications/stats error:', err)
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      return res.status(500).json({ success: false, message: 'Server error', error: err && (err.message || String(err)), stack: err && err.stack })
    }
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// 3. GET /:id - get single application
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ success: false, message: 'id required' })
    const app = await MentorApplication.findById(id).populate({ path: 'userId', select: 'firstName lastName email avatar role createdAt rating' }).lean()
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' })
    // attach user under `user` key for consistency
    const user = app.userId ? {
      _id: app.userId._id,
      name: `${app.userId.firstName || ''} ${app.userId.lastName || ''}`.trim(),
      email: app.userId.email,
      avatar: app.userId.avatar,
      role: app.userId.role,
      createdAt: app.userId.createdAt,
      rating: app.userId.rating || 0,
    } : null
    return res.json({ success: true, data: { ...app, user } })
  } catch (err) {
    console.error('GET /api/admin/mentor-applications/:id error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// 3. POST /:id/approve - approve application
router.post('/:id/approve', async (req, res) => {
  const session = await mongoose.startSession()
  try {
    const { id } = req.params
    const { approvedRate, adminNotes } = req.body || {}
    // Debug: log incoming approve requests to help diagnose 500s
    try {
      console.debug('ADMIN APPROVE REQUEST', { id, body: req.body, authHeader: !!(req.headers.authorization || req.headers.Authorization) })
    } catch (e) { /* ignore logging errors */ }
    if (!id) return res.status(400).json({ success: false, message: 'id required' })

    // Attempt to use a transaction, but if the Mongo deployment does not support transactions
    // (e.g., standalone server), fall back to non-transactional updates.
    let usedTransaction = false
    try {
      session.startTransaction()
      usedTransaction = true
      const app = await MentorApplication.findById(id).session(session)
      if (!app) {
        await session.abortTransaction()
        session.endSession()
        return res.status(404).json({ success: false, message: 'Application not found' })
      }
      if (app.status !== 'pending') {
        await session.abortTransaction()
        session.endSession()
        return res.status(409).json({ success: false, message: 'Application already processed' })
      }

      // Update application
      app.status = 'approved'
      if (approvedRate !== undefined) app.approvedRate = Number(approvedRate)
      if (adminNotes) app.adminNotes = adminNotes
      app.reviewedBy = null // we don't have admin user id mapping for token-based admin; optional: store token
      app.reviewedAt = new Date()
      console.debug('Saving application (transaction)')
      await app.save({ session })

      // Update user profile and role
      const user = await User.findById(app.userId).session(session)
      if (!user) {
        await session.abortTransaction()
        session.endSession()
        return res.status(404).json({ success: false, message: 'Associated user not found' })
      }

      // Copy fields to user
      user.role = 'mentor'
      user.isMentor = true
      user.isMentorVerified = true
      user.title = app.title || user.title
      user.mentorBio = app.bio || user.mentorBio
      user.bio = app.bio || user.bio
      user.skills = Array.isArray(app.skills) ? app.skills : (user.skills || [])
      user.expertiseAreas = Array.isArray(app.expertise) ? app.expertise : (user.expertiseAreas || [])
      if (app.requestedRate) user.hourlyRate = app.requestedRate
      if (app.yearsOfExperience) user.experienceYears = app.yearsOfExperience
      if (app.currentCompany) user.company = app.currentCompany
      if (app.githubUrl) user.githubUrl = app.githubUrl

      console.debug('Saving user (transaction)')
      await user.save({ session })

      await session.commitTransaction()
      session.endSession()
      return res.json({ success: true, message: 'Application approved', data: { applicationId: app._id, userId: user._id, approvedRate: app.approvedRate || null } })
    } catch (txErr) {
      // If transaction-related error occurred, attempt fallback without transactions
      try {
        console.warn('Transaction failed or unsupported; falling back to non-transactional updates', txErr && (txErr.message || txErr))
        // End any active transaction/session
        try { await session.abortTransaction() } catch (e) { /* ignore */ }
        try { session.endSession() } catch (e) { /* ignore */ }

        // Perform non-transactional updates
        const app = await MentorApplication.findById(id)
        if (!app) return res.status(404).json({ success: false, message: 'Application not found' })
        if (app.status !== 'pending') return res.status(409).json({ success: false, message: 'Application already processed' })

        app.status = 'approved'
        if (approvedRate !== undefined) app.approvedRate = Number(approvedRate)
        if (adminNotes) app.adminNotes = adminNotes
        app.reviewedBy = null
        app.reviewedAt = new Date()
        console.debug('Saving application (no transaction)')
        await app.save()

        const user = await User.findById(app.userId)
        if (!user) return res.status(404).json({ success: false, message: 'Associated user not found' })

        user.role = 'mentor'
        user.isMentor = true
        user.isMentorVerified = true
        user.title = app.title || user.title
        user.mentorBio = app.bio || user.mentorBio
        user.bio = app.bio || user.bio
        user.skills = Array.isArray(app.skills) ? app.skills : (user.skills || [])
        user.expertiseAreas = Array.isArray(app.expertise) ? app.expertise : (user.expertiseAreas || [])
        if (app.requestedRate) user.hourlyRate = app.requestedRate
        if (app.yearsOfExperience) user.experienceYears = app.yearsOfExperience
        if (app.currentCompany) user.company = app.currentCompany
        if (app.githubUrl) user.githubUrl = app.githubUrl

        console.debug('Saving user (no transaction)')
        await user.save()

        return res.json({ success: true, message: 'Application approved', data: { applicationId: app._id, userId: user._id, approvedRate: app.approvedRate || null, fallback: true } })
      } catch (fallbackErr) {
        console.error('Fallback approve failed:', fallbackErr && (fallbackErr.stack || fallbackErr))
        return res.status(500).json({ success: false, message: 'Server error', error: fallbackErr && (fallbackErr.message || String(fallbackErr)), stack: fallbackErr && fallbackErr.stack })
      }
    }
  } catch (err) {
    try { await session.abortTransaction() } catch (e) { /* ignore */ }
    try { session.endSession() } catch (e) { /* ignore */ }
    console.error('POST /api/admin/mentor-applications/:id/approve error:', err && err.stack ? err.stack : err)
    // Include error details in development to aid debugging
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      return res.status(500).json({ success: false, message: 'Server error', error: err && (err.message || String(err)), stack: err && err.stack })
    }
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// 4. POST /:id/reject
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params
    const { rejectionReason, adminNotes } = req.body || {}
    if (!id) return res.status(400).json({ success: false, message: 'id required' })
    const app = await MentorApplication.findById(id)
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' })
    if (app.status !== 'pending') return res.status(409).json({ success: false, message: 'Application already processed' })

    app.status = 'rejected'
    app.rejectionReason = rejectionReason || ''
    if (adminNotes) app.adminNotes = adminNotes
    app.reviewedBy = null
    app.reviewedAt = new Date()
    await app.save()

    return res.json({ success: true, message: 'Application rejected', data: { applicationId: app._id } })
  } catch (err) {
    console.error('POST /api/admin/mentor-applications/:id/reject error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// (stats route moved earlier to avoid being captured by :id param)

// 6. POST /bulk-action
router.post('/bulk-action', async (req, res) => {
  try {
    const { action, applicationIds = [], approvedRate, rejectionReason } = req.body || {}
    if (!action || !Array.isArray(applicationIds) || applicationIds.length === 0) return res.status(400).json({ success: false, message: 'action and applicationIds required' })

    const results = { processed: 0, succeeded: 0, failed: 0, errors: [] }

    if (action === 'approve') {
      // Per-request non-transactional bulk approve (safe, independent operations)
      const resultsSimple = { approved: [], failed: [], errors: [] }
      for (const id of applicationIds) {
        try {
          const app = await MentorApplication.findById(id)
          if (!app) { resultsSimple.failed.push(id); resultsSimple.errors.push({ id, error: 'not found' }); continue }
          if (app.status !== 'pending') { resultsSimple.failed.push(id); resultsSimple.errors.push({ id, error: 'not pending' }); continue }

          // Approve application
          await MentorApplication.findByIdAndUpdate(id, { $set: { status: 'approved', approvedRate: (approvedRate !== undefined ? Number(approvedRate) : app.approvedRate), reviewedAt: new Date() } })

          // Update associated user (best-effort)
          try {
            await User.findByIdAndUpdate(app.userId, {
              $set: {
                role: 'mentor',
                isMentor: true,
                isMentorVerified: true,
                title: app.title || undefined,
                mentorBio: app.bio || undefined,
                bio: app.bio || undefined,
                skills: Array.isArray(app.skills) ? app.skills : undefined,
                expertiseAreas: Array.isArray(app.expertise) ? app.expertise : undefined,
                hourlyRate: app.requestedRate || undefined,
                experienceYears: app.yearsOfExperience || undefined,
                company: app.currentCompany || undefined,
                githubUrl: app.githubUrl || undefined,
              }
            })
          } catch (userErr) {
            console.error('Bulk approve - failed to update user for app', id, userErr)
            // don't mark overall app as failed; record user update issue
            resultsSimple.errors.push({ id, error: 'user update failed', detail: userErr && (userErr.message || String(userErr)) })
          }

          resultsSimple.approved.push(id)
        } catch (e) {
          resultsSimple.failed.push(id)
          resultsSimple.errors.push({ id, error: e && (e.message || String(e)) })
          console.error('Bulk approve failed for:', id, e)
        }
      }

      return res.status(200).json({ success: true, approved: resultsSimple.approved, failed: resultsSimple.failed, errors: resultsSimple.errors })
    } else if (action === 'reject') {
      for (const id of applicationIds) {
        try {
          const app = await MentorApplication.findById(id)
          if (!app) { results.failed++; results.errors.push({ id, error: 'not found' }); continue }
          if (app.status !== 'pending') { results.failed++; results.errors.push({ id, error: 'not pending' }); continue }
          app.status = 'rejected'
          app.rejectionReason = rejectionReason || ''
          app.reviewedAt = new Date()
          await app.save()
          results.succeeded++
        } catch (e) {
          results.failed++
          results.errors.push({ id, error: e.message || String(e) })
        }
        results.processed++
      }
      return res.json({ success: true, data: results })
    }

    return res.status(400).json({ success: false, message: 'Unknown action' })
  } catch (err) {
    // No session scoped to bulk-action; just log and return error
    console.error('POST /api/admin/mentor-applications/bulk-action error:', err && (err.stack || err))
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      return res.status(500).json({ success: false, message: 'Server error', error: err && (err.message || String(err)), stack: err && err.stack })
    }
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router
