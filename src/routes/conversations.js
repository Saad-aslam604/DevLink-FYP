const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const User = require('../models/User');
const Report = require('../models/Report');
const { getIo } = require('../socket');

// POST /api/conversations/find-or-create - find or create a booking-based conversation between two users
router.post('/find-or-create', protect, async (req, res) => {
  try {
    const { targetUserId } = req.body || {}
    if (!targetUserId) return res.status(400).json({ success: false, message: 'targetUserId required' })
    const me = req.user && (req.user._id || req.user.id)
    if (!me) return res.status(401).json({ success: false, message: 'Unauthorized' })

    // Look for an existing booking where these two users are participants
    let booking = await Booking.findOne({ $or: [ { student: me, mentor: targetUserId }, { student: targetUserId, mentor: me } ] }).lean()
    if (booking) return res.json({ success: true, data: booking })

    // If none exists, create a lightweight booking record to serve as a conversation container
    // Default to current user as student and target as mentor; if target is not a mentor this still allows a direct chat.
    const newBooking = new Booking({ student: me, mentor: targetUserId, createdAt: new Date(), lastMessageAt: new Date(), isActive: true })
    await newBooking.save()
    return res.json({ success: true, data: newBooking })
  } catch (err) {
    console.error('POST /conversations/find-or-create error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// DELETE /api/conversations/:id - remove conversation messages and reset booking metadata
router.delete('/:id', protect, async (req, res) => {
  try {
    const convId = req.params.id;
    if (!convId) return res.status(400).json({ success: false, message: 'Conversation id required' });
    const userId = req.user && (req.user._id || req.user.id);
    console.log('DELETE /api/conversations/:id called', { convId, userId });

    const booking = await Booking.findById(convId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Only participants or admin can delete a conversation
    const isParticipant = (booking.student && String(booking.student) === String(userId)) || (booking.mentor && String(booking.mentor) === String(userId)) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized' });

    // delete messages tied to this booking
    try {
      await Message.deleteMany({ booking: booking._id });
    } catch (e) { console.warn('Failed to delete messages for booking', convId, e); }

    // remove the booking itself so the conversation no longer appears in booking lists
    // NOTE: this is a permanent delete. If you'd prefer soft-delete instead, add a flag on Booking schema
    try {
      const del = await Booking.deleteOne({ _id: booking._id });
      console.log('Booking delete result for', convId, del);
    } catch (e) {
      console.error('Failed to delete booking document for conversation', convId, e);
      // still attempt to emit conversation-deleted (messages were removed) and respond with partial success
    }

    // emit real-time event
    try {
      const io = getIo();
      const payload = { bookingId: convId };
      if (io) {
        try { if (booking.student) { io.to(`user_${String(booking.student)}`).emit('conversation-deleted', payload); io.to(`user_${String(booking.student)}`).emit('conversationDeleted', payload); } } catch (e) {}
        try { if (booking.mentor) { io.to(`user_${String(booking.mentor)}`).emit('conversation-deleted', payload); io.to(`user_${String(booking.mentor)}`).emit('conversationDeleted', payload); } } catch (e) {}
        if (booking._id) { io.to(`booking_${String(booking._id)}`).emit('conversation-deleted', payload); io.to(`booking_${String(booking._id)}`).emit('conversationDeleted', payload); }
      }
    } catch (e) { console.warn('Failed to emit conversation-deleted', e); }

    return res.json({ success: true, message: 'Conversation deleted', data: { bookingId: convId } });
  } catch (err) {
    console.error('DELETE /conversations/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

// PUT /api/conversations/:id/mute - toggle mute for the current user on a conversation (booking)
router.put('/:id/mute', protect, async (req, res) => {
  try {
    const convId = req.params.id;
    if (!convId) return res.status(400).json({ success: false, message: 'Conversation id required' });
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const booking = await Booking.findById(convId).select('student mentor');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isParticipant = (booking.student && String(booking.student) === String(user._id)) || (booking.mentor && String(booking.mentor) === String(user._id)) || user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized' });

    const idx = (user.mutedConversations || []).indexOf(String(convId));
    if (idx === -1) {
      user.mutedConversations = Array.from(new Set([...(user.mutedConversations || []), String(convId)]));
    } else {
      user.mutedConversations = (user.mutedConversations || []).filter((x) => String(x) !== String(convId));
    }
    await user.save();

    // emit personal update so client can refresh UI
    try {
      const io = getIo();
      if (io) io.to(`user_${String(user._id)}`).emit('conversation-muted', { bookingId: convId, muted: idx === -1 });
    } catch (e) { console.warn('Failed to emit conversation-muted', e); }

    return res.json({ success: true, message: 'Toggled mute', data: { bookingId: convId, muted: idx === -1 } });
  } catch (err) {
    console.error('PUT /conversations/:id/mute error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/conversations/:id/archive - toggle archive for the current user on a conversation
router.put('/:id/archive', protect, async (req, res) => {
  try {
    const convId = req.params.id;
    if (!convId) return res.status(400).json({ success: false, message: 'Conversation id required' });
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const booking = await Booking.findById(convId).select('student mentor');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isParticipant = (booking.student && String(booking.student) === String(user._id)) || (booking.mentor && String(booking.mentor) === String(user._id)) || user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized' });

    const idx = (user.archivedConversations || []).indexOf(String(convId));
    if (idx === -1) {
      user.archivedConversations = Array.from(new Set([...(user.archivedConversations || []), String(convId)]));
    } else {
      user.archivedConversations = (user.archivedConversations || []).filter((x) => String(x) !== String(convId));
    }
    await user.save();

    try {
      const io = getIo();
      if (io) io.to(`user_${String(user._id)}`).emit('conversation-archived', { bookingId: convId, archived: idx === -1 });
    } catch (e) { console.warn('Failed to emit conversation-archived', e); }

    return res.json({ success: true, message: 'Toggled archive', data: { bookingId: convId, archived: idx === -1 } });
  } catch (err) {
    console.error('PUT /conversations/:id/archive error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/conversations/:id/block - block the other participant of a conversation
router.put('/:id/block', protect, async (req, res) => {
  try {
    const convId = req.params.id;
    if (!convId) return res.status(400).json({ success: false, message: 'Conversation id required' });
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const booking = await Booking.findById(convId).select('student mentor');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isParticipant = (booking.student && String(booking.student) === String(user._id)) || (booking.mentor && String(booking.mentor) === String(user._id)) || user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized' });

    // Determine the other participant
    const otherId = (booking.student && String(booking.student) !== String(user._id)) ? String(booking.student) : ((booking.mentor && String(booking.mentor) !== String(user._id)) ? String(booking.mentor) : null);
    if (!otherId) return res.status(400).json({ success: false, message: 'No other participant to block' });

    // toggle block
    const alreadyBlocked = (user.blockedUsers || []).some((b) => String(b) === String(otherId));
    if (!alreadyBlocked) {
      user.blockedUsers = Array.from(new Set([...(user.blockedUsers || []), otherId]));
    } else {
      user.blockedUsers = (user.blockedUsers || []).filter((b) => String(b) !== String(otherId));
    }
    await user.save();

    try {
      const io = getIo();
      if (io) io.to(`user_${String(user._id)}`).emit('user-block-updated', { blockedUserId: otherId, blocked: !alreadyBlocked });
    } catch (e) { console.warn('Failed to emit user-block-updated', e); }

    return res.json({ success: true, message: alreadyBlocked ? 'User unblocked' : 'User blocked', data: { blockedUserId: otherId, blocked: !alreadyBlocked } });
  } catch (err) {
    console.error('PUT /conversations/:id/block error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/conversations/:id/report - submit a report about a conversation / participant
router.post('/:id/report', protect, async (req, res) => {
  try {
    const convId = req.params.id;
    if (!convId) return res.status(400).json({ success: false, message: 'Conversation id required' });
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { reason, details } = req.body || {};

    const booking = await Booking.findById(convId).select('student mentor');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isParticipant = (booking.student && String(booking.student) === String(user._id)) || (booking.mentor && String(booking.mentor) === String(user._id)) || user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized' });

    const otherId = (booking.student && String(booking.student) !== String(user._id)) ? String(booking.student) : ((booking.mentor && String(booking.mentor) !== String(user._id)) ? String(booking.mentor) : null);

    const report = await Report.create({ reporter: user._id, booking: booking._id, reportedUser: otherId, reason: String(reason || '').slice(0, 1000), details: String(details || '').slice(0, 5000) });

    // Optionally notify admins via socket
    try {
      const io = getIo();
      if (io) io.emit('report-submitted', { reportId: report._id, bookingId: convId });
    } catch (e) { console.warn('Failed to emit report-submitted', e); }

    return res.json({ success: true, message: 'Report submitted', data: { reportId: report._id } });
  } catch (err) {
    console.error('POST /conversations/:id/report error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/conversations/archived - return archived conversations for current user
router.get('/archived', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    const archivedIds = (user && user.archivedConversations) ? user.archivedConversations : [];
    if (!archivedIds || archivedIds.length === 0) return res.json({ success: true, data: [] });
    const bookings = await Booking.find({ _id: { $in: archivedIds } }).lean();
    // attach a preview message if available
    const results = await Promise.all(bookings.map(async (b) => {
      const last = await Message.findOne({ booking: b._id }).sort({ createdAt: -1 }).lean().catch(() => null);
      // determine other participant
      const other = (b.student && String(b.student) !== String(user._id)) ? String(b.student) : ((b.mentor && String(b.mentor) !== String(user._id)) ? String(b.mentor) : null)
      let otherUser = null
      if (other) otherUser = await User.findById(other).select('firstName lastName avatar email').lean().catch(() => null)
      return {
        bookingId: String(b._id),
        lastMessage: last ? (last.content || last.text || '') : '',
        time: last ? last.createdAt : b.createdAt,
        other: otherUser ? { _id: otherUser._id, name: `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim(), avatar: otherUser.avatar || null } : null
      }
    }))
    return res.json({ success: true, data: results })
  } catch (err) {
    console.error('GET /conversations/archived error', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /api/conversations/blocked - return blocked users for current user
router.get('/blocked', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('blockedUsers').populate('blockedUsers', 'firstName lastName avatar email').lean();
    const blocked = (user && user.blockedUsers) ? (user.blockedUsers.map((b) => ({ id: b._id || b, name: `${b.firstName || ''} ${b.lastName || ''}`.trim(), avatar: b.avatar || null }))) : []
    return res.json({ success: true, data: blocked })
  } catch (err) {
    console.error('GET /conversations/blocked error', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// PUT /api/conversations/unblock/:userId - remove a user from current user's blocked list
router.put('/unblock/:userId', protect, async (req, res) => {
  try {
    const user = req.user
    const otherId = req.params.userId
    if (!otherId) return res.status(400).json({ success: false, message: 'userId required' })
    user.blockedUsers = (user.blockedUsers || []).filter((b) => String(b) !== String(otherId))
    await user.save()
    try { const io = getIo(); if (io) io.to(`user_${String(user._id)}`).emit('user-block-updated', { blockedUserId: otherId, blocked: false }) } catch (e) {}
    return res.json({ success: true, message: 'User unblocked', data: { blockedUserId: otherId, blocked: false } })
  } catch (err) {
    console.error('PUT /conversations/unblock/:userId error', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})
