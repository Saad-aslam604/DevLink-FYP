const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Message = require('../models/Message');

// Helper to format a unified activity item
function fmt(id, type, title, time, meta = {}) {
  return { id, type, title, time, meta };
}

// GET /api/activities - return recent activities for the current user
router.get('/', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const userId = user._id;

    // Load recent bookings involving this user
    const bookings = await Booking.find({ $or: [{ student: userId }, { mentor: userId }] })
      .populate('mentor', 'firstName lastName')
      .populate('student', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    // Map bookings to activity items
    const bookingActivities = bookings.map((bk) => {
      const other = String(bk.student._id) === String(userId) ? bk.mentor : bk.student;
      const otherName = other ? `${other.firstName || ''} ${other.lastName || ''}`.trim() : 'User';
      const title = bk.status === 'confirmed' || bk.status === 'completed'
        ? `${otherName} - ${bk.status === 'confirmed' ? 'Session confirmed' : 'Session completed'}`
        : `${otherName} - Booking requested`;
      return fmt(bk._id, 'booking', title, bk.createdAt || bk.updatedAt || new Date(), { bookingId: bk._id, status: bk.status, startTime: bk.startTime });
    });

    // Load recent messages involving this user's bookings or sent by the user
    // First extract booking ids
    const bookingIds = bookings.map((b) => b._id);
    const messages = await Message.find({ $or: [{ sender: userId }, { booking: { $in: bookingIds } }] })
      .populate('sender', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const messageActivities = messages.map((m) => {
      const senderName = m.sender ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() : 'Someone';
      const title = (String(m.sender._id) === String(userId)) ? `You sent a message` : `${senderName} sent a message`;
      return fmt(m._id, 'message', title, m.createdAt || new Date(), { bookingId: m.booking, preview: String(m.content).slice(0, 200) });
    });

    // Merge and sort by time desc
    const merged = [...bookingActivities, ...messageActivities];
    merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Trim to sensible limit
    const activities = merged.slice(0, 30);

    return res.json({ success: true, data: { activities } });
  } catch (err) {
    console.error('GET /activities error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
