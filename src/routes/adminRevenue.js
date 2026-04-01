const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const adminAuth = require('../middleware/adminAuth')

const Payment = require('../models/Payment')
const Booking = require('../models/Booking')
const User = require('../models/User')

// Helper to parse range into a start date
function rangeToStartDate(range) {
  const now = new Date()
  if (!range || range === '7days') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    d.setHours(0,0,0,0)
    return d
  }
  if (range === '30days') {
    const d = new Date(now)
    d.setDate(d.getDate() - 29)
    d.setHours(0,0,0,0)
    return d
  }
  if (range === '90days') {
    const d = new Date(now)
    d.setDate(d.getDate() - 89)
    d.setHours(0,0,0,0)
    return d
  }
  if (range === 'year') {
    const d = new Date(now)
    d.setFullYear(d.getFullYear() - 1)
    d.setHours(0,0,0,0)
    return d
  }
  return null
}

// GET /api/admin/revenue
router.get('/', adminAuth, async (req, res) => {
  try {
    const range = req.query.range || '30days'
    const page = Math.max(1, parseInt(req.query.page || '1', 10))
    const limit = Math.min(200, Math.max(10, parseInt(req.query.limit || '50', 10)))

    const startDate = rangeToStartDate(range)

  const match = { status: 'succeeded' }
    if (startDate) match.createdAt = { $gte: startDate }

    // Total platform revenue & mentor payouts & transaction count
    const totalsAgg = [
      { $match: match },
      { $group: { _id: null, totalPlatformFee: { $sum: { $ifNull: ["$metadata.platformFee", 0] } }, totalMentorPayout: { $sum: { $ifNull: ["$metadata.mentorAmount", 0] } }, count: { $sum: 1 } } }
    ]
    const totalsRes = await Payment.aggregate(totalsAgg)
    const totals = (totalsRes && totalsRes[0]) ? totalsRes[0] : { totalPlatformFee: 0, totalMentorPayout: 0, count: 0 }

    // Growth calculations: compare to previous period of same length (if range provided)
    let growth = { platformFeePct: null, mentorPayoutPct: null }
    try {
      if (startDate) {
        const now = new Date()
        const periodMs = now.getTime() - startDate.getTime()
        const periodDays = Math.max(1, Math.round(periodMs / (24 * 60 * 60 * 1000)))
        const prevStart = new Date(startDate)
        prevStart.setDate(prevStart.getDate() - periodDays)
        const prevEnd = new Date(startDate)

        const prevMatch = { status: 'succeeded', createdAt: { $gte: prevStart, $lt: startDate } }
        const prevAgg = [
          { $match: prevMatch },
          { $group: { _id: null, totalPlatformFee: { $sum: { $ifNull: ["$metadata.platformFee", 0] } }, totalMentorPayout: { $sum: { $ifNull: ["$metadata.mentorAmount", 0] } } } }
        ]
        const prevRes = await Payment.aggregate(prevAgg)
        const prevTotals = (prevRes && prevRes[0]) ? prevRes[0] : { totalPlatformFee: 0, totalMentorPayout: 0 }

        const calcPct = (current, previous) => {
          if (!previous || previous === 0) return null
          return ((current - previous) / previous) * 100
        }

        growth.platformFeePct = calcPct(totals.totalPlatformFee || 0, prevTotals.totalPlatformFee || 0)
        growth.mentorPayoutPct = calcPct(totals.totalMentorPayout || 0, prevTotals.totalMentorPayout || 0)
      }
    } catch (e) {
      console.warn('Growth calc failed', e)
    }

    // Refund rate (payments refunded / total payments in period)
    let refundRate = null
    try {
      const refundMatch = { status: 'refunded' }
      if (startDate) refundMatch.createdAt = { $gte: startDate }
      const refundedCount = await Payment.countDocuments(refundMatch)
      const totalCountMatch = { status: { $in: ['succeeded','refunded'] } }
      if (startDate) totalCountMatch.createdAt = { $gte: startDate }
      const totalCount = await Payment.countDocuments(totalCountMatch)
      refundRate = totalCount > 0 ? (refundedCount / totalCount) : 0
    } catch (e) {
      console.warn('Refund rate calc failed', e)
    }

    // Cancellation rate (bookings cancelled / total bookings in period)
    let cancellationRate = null
    try {
      const bookingMatch = {}
      if (startDate) bookingMatch.createdAt = { $gte: startDate }
      const cancelledBookings = await Booking.countDocuments(Object.assign({}, bookingMatch, { status: 'cancelled' }))
      const totalBookings = await Booking.countDocuments(bookingMatch)
      cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) : 0
    } catch (e) {
      console.warn('Cancellation rate calc failed', e)
    }

    // Monthly trend (last 12 months) for charts
    let monthlyTrend = []
    try {
      const now = new Date()
      const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      const monthAgg = [
        { $match: { status: 'succeeded', createdAt: { $gte: startMonth } } },
        { $addFields: { month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } } } },
        { $group: { _id: "$month", platformFee: { $sum: { $ifNull: ["$metadata.platformFee", 0] } }, mentorPayout: { $sum: { $ifNull: ["$metadata.mentorAmount", 0] } } } },
        { $sort: { _id: 1 } }
      ]
      monthlyTrend = await Payment.aggregate(monthAgg)
    } catch (e) {
      console.warn('Monthly trend calc failed', e)
    }

    // MoM: compare this calendar month to previous calendar month
    let moM = null
    try {
      const now = new Date()
      const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

      const curAgg = [ { $match: { status: 'succeeded', createdAt: { $gte: startCurrentMonth, $lt: startNextMonth } } }, { $group: { _id: null, totalPlatformFee: { $sum: { $ifNull: ["$metadata.platformFee", 0] } } } } ]
      const prevAgg = [ { $match: { status: 'succeeded', createdAt: { $gte: startPrevMonth, $lt: startCurrentMonth } } }, { $group: { _id: null, totalPlatformFee: { $sum: { $ifNull: ["$metadata.platformFee", 0] } } } } ]

      const curRes = await Payment.aggregate(curAgg)
      const prevRes = await Payment.aggregate(prevAgg)
      const curVal = (curRes && curRes[0] && curRes[0].totalPlatformFee) ? curRes[0].totalPlatformFee : 0
      const prevVal = (prevRes && prevRes[0] && prevRes[0].totalPlatformFee) ? prevRes[0].totalPlatformFee : 0
      if (prevVal === 0) moM = null
      else moM = ((curVal - prevVal) / prevVal) * 100
    } catch (e) {
      console.warn('MoM calc failed', e)
    }

    // YoY: compare this calendar month to same calendar month last year
    let yoY = null
    try {
      const now = new Date()
      const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const startLastYearMonth = new Date(now.getFullYear() - 1, now.getMonth(), 1)
      const startLastYearNextMonth = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1)

      const thisAgg = [ { $match: { status: 'succeeded', createdAt: { $gte: startThisMonth, $lt: startNextMonth } } }, { $group: { _id: null, totalPlatformFee: { $sum: { $ifNull: ["$metadata.platformFee", 0] } } } } ]
      const lastYearAgg = [ { $match: { status: 'succeeded', createdAt: { $gte: startLastYearMonth, $lt: startLastYearNextMonth } } }, { $group: { _id: null, totalPlatformFee: { $sum: { $ifNull: ["$metadata.platformFee", 0] } } } } ]

      const thisRes = await Payment.aggregate(thisAgg)
      const lastRes = await Payment.aggregate(lastYearAgg)
      const thisVal = (thisRes && thisRes[0] && thisRes[0].totalPlatformFee) ? thisRes[0].totalPlatformFee : 0
      const lastVal = (lastRes && lastRes[0] && lastRes[0].totalPlatformFee) ? lastRes[0].totalPlatformFee : 0
      if (lastVal === 0) yoY = null
      else yoY = ((thisVal - lastVal) / lastVal) * 100
    } catch (e) {
      console.warn('YoY calc failed', e)
    }

    // Daily trends (last N days)
    const dailyAgg = [
      { $match: match },
      { $addFields: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } } },
      { $group: { _id: "$day", platformFee: { $sum: { $ifNull: ["$metadata.platformFee", 0] } }, mentorPayout: { $sum: { $ifNull: ["$metadata.mentorAmount", 0] } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]
    const daily = await Payment.aggregate(dailyAgg)

    // Top mentors by earnings & session count
    const topMentorsAgg = [
      { $match: match },
      // Join booking to get mentor id
      { $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'booking' } },
      { $unwind: { path: '$booking', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$booking.mentor', mentorEarnings: { $sum: { $ifNull: ["$metadata.mentorAmount", 0] } }, sessions: { $sum: 1 } } },
      { $sort: { mentorEarnings: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'mentor' } },
      { $unwind: { path: '$mentor', preserveNullAndEmptyArrays: true } },
      { $project: { mentorId: '$_id', mentorName: { $ifNull: [ { $concat: [ "$mentor.firstName", " ", "$mentor.lastName" ] }, "$mentor.name" ] }, mentorEmail: '$mentor.email', mentorEarnings: 1, sessions: 1 } }
    ]
    const topMentors = await Payment.aggregate(topMentorsAgg)

    // Transactions list (paginated)
    const txMatch = match
    const txAgg = [
      { $match: txMatch },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $lookup: { from: 'users', localField: 'payer', foreignField: '_id', as: 'payer' } },
      { $unwind: { path: '$payer', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'booking' } },
      { $unwind: { path: '$booking', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'booking.mentor', foreignField: '_id', as: 'mentor' } },
      { $unwind: { path: '$mentor', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, amount: 1, currency: 1, status: 1, createdAt: 1, metadata: 1, payer: { _id: '$payer._id', name: { $ifNull: [ { $concat: [ '$payer.firstName', ' ', '$payer.lastName' ] }, '$payer.name' ] }, email: '$payer.email' }, mentor: { _id: '$mentor._id', name: { $ifNull: [ { $concat: [ '$mentor.firstName', ' ', '$mentor.lastName' ] }, '$mentor.name' ] }, email: '$mentor.email' }, booking: { _id: '$booking._id' } } }
    ]
    const transactions = await Payment.aggregate(txAgg)

  res.json({ success: true, data: { totals, daily, topMentors, transactions, page, limit, growth, refundRate, cancellationRate, monthlyTrend, moM, yoY } })
  } catch (error) {
    console.error('adminRevenue error', error)
    res.status(500).json({ success: false, message: error.message || String(error) })
  }
})

// GET /api/admin/revenue/export - CSV export
router.get('/export', adminAuth, async (req, res) => {
  try {
  const match = { status: 'succeeded' }
    const rows = await Payment.find(match).populate('payer').populate({ path: 'booking', populate: { path: 'mentor' } }).sort({ createdAt: -1 }).lean().exec()

    // Build CSV header
    const header = ['paymentId', 'createdAt', 'studentId', 'studentName', 'studentEmail', 'mentorId', 'mentorName', 'mentorEmail', 'amountCents', 'currency', 'platformFeeCents', 'mentorPayoutCents', 'status']
    const csvRows = [header.join(',')]
    rows.forEach(r => {
      const student = r.payer || {}
      const booking = r.booking || {}
      const mentor = booking.mentor || {}
      const vals = [
        `"${String(r._id)}"`,
        `"${(r.createdAt||'').toISOString ? (r.createdAt.toISOString()) : (r.createdAt||'') }"`,
        `"${student._id||''}"`,
        `"${((student.firstName||'') + ' ' + (student.lastName||'')).trim()||student.name||''}"`,
        `"${student.email||''}"`,
        `"${mentor._id||''}"`,
        `"${((mentor.firstName||'') + ' ' + (mentor.lastName||'')).trim()||mentor.name||''}"`,
        `"${mentor.email||''}"`,
        `${Number(r.amount||0)}`,
        `"${r.currency||'usd'}"`,
        `${Number((r.metadata && r.metadata.platformFee) || 0)}`,
        `${Number((r.metadata && r.metadata.mentorAmount) || 0)}`,
        `"${r.status||''}"`
      ]
      csvRows.push(vals.join(','))
    })

    const csv = csvRows.join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="devlink_revenue_export.csv"')
    res.send(csv)
  } catch (error) {
    console.error('adminRevenue export error', error)
    res.status(500).json({ success: false, message: error.message || String(error) })
  }
})

module.exports = router
