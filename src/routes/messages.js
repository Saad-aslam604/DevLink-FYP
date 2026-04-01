const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const { getIo } = require('../socket');
const { isUserOnline } = require('../socket');

const RECENT_THRESHOLD_HOURS = parseInt(process.env.STATUS_RECENT_HOURS || '24', 10);

function computeStatusForMessage(m, currentUserId) {
  // m may be a Mongoose doc or plain object with fields: status, readBy, createdAt
  try {
    // If readBy explicitly includes the requesting user, treat as 'read'
    if (currentUserId && Array.isArray(m.readBy) && m.readBy.some(r => String(r.userId) === String(currentUserId))) return 'read';

    // If any readBy entries exist (not specific to user), consider it 'read' for global consumers
    if (!currentUserId && Array.isArray(m.readBy) && m.readBy.length > 0) return 'read';

    // If explicit status set on message, return that
    if (m.status && ['sent', 'delivered', 'read'].includes(String(m.status))) return String(m.status);

    // If message is recent (within threshold) consider delivered; otherwise treat as sent
    const created = m.createdAt ? new Date(m.createdAt).getTime() : 0;
    const now = Date.now();
    const recentMs = RECENT_THRESHOLD_HOURS * 60 * 60 * 1000;
    if (created && (now - created) <= recentMs) return 'delivered';
    return 'sent';
  } catch (e) { return m.status || 'sent' }
}

// GET /api/messages/recent - return recent messages relevant to the current user
router.get('/recent', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const userId = user._id;

    // Find bookings involving this user to scope messages
    const bookingDocs = await Booking.find({ $or: [{ student: userId }, { mentor: userId }] }).select('_id').lean();
    const bookingIds = bookingDocs.map((b) => b._id);

    // Query recent messages either sent by the user or tied to user's bookings
    let messages = await Message.find({ $or: [{ sender: userId }, { booking: { $in: bookingIds } }] })
      .populate('sender', 'firstName lastName avatar')
      .populate('attachments')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    // Remove messages that have been soft-deleted for this user (deletedFor[userId] === true)
    try {
      messages = messages.filter((m) => {
        if (!m) return false;
        const df = m.deletedFor;
        if (!df) return true;
        // support both Map-like and plain object shapes
        try {
          if (df.get && typeof df.get === 'function') return !df.get(String(userId));
        } catch (e) {}
        return !df[String(userId)];
      });
    } catch (e) {
      // If anything goes wrong, fall back to returning messages as-is
      console.warn('Failed to filter deletedFor in recent messages', e);
    }

    // Group messages by the other participant (dedupe conversations per user)
    try {
      // load booking participants to help compute the other participant when message.sender === current user
      const bookingIdsInMessages = Array.from(new Set(messages.filter(m => m && m.booking).map(m => String(m.booking))));
      const bookingsFull = bookingIdsInMessages.length ? await Booking.find({ _id: { $in: bookingIdsInMessages } }).populate('student', 'firstName lastName avatar').populate('mentor', 'firstName lastName avatar').lean() : [];
      const bookingMap = new Map((bookingsFull || []).map(b => [String(b._id), b]));

      const grouped = new Map(); // otherId -> latest message
      for (const m of messages) {
        try {
          const created = m.createdAt ? new Date(m.createdAt).getTime() : 0;
          let otherId = null;
          // If sender exists and is not the requesting user, that's the other participant
          if (m.sender && m.sender._id && String(m.sender._id) !== String(userId)) otherId = String(m.sender._id);
          // Otherwise derive from booking participants
          if (!otherId && m.booking) {
            const bk = bookingMap.get(String(m.booking));
            if (bk) {
              const studentId = bk.student ? String(bk.student._id || bk.student) : null;
              const mentorId = bk.mentor ? String(bk.mentor._id || bk.mentor) : null;
              if (studentId && String(studentId) !== String(userId)) otherId = studentId;
              else if (mentorId && String(mentorId) !== String(userId)) otherId = mentorId;
            }
          }
          // Fallback: if still missing, use sender id or booking id as grouping key
          const groupKey = otherId || (m.sender && m.sender._id ? String(m.sender._id) : (m.booking ? String(m.booking) : String(m._id)));
          const existing = grouped.get(groupKey);
          if (!existing) grouped.set(groupKey, { msg: m, ts: created });
          else if (existing.ts < created) grouped.set(groupKey, { msg: m, ts: created });
        } catch (e) { /* ignore per-message failures */ }
      }

  let previews = Array.from(grouped.values()).map(({ msg }) => {
        const m = msg;
        // Determine display name & avatar: prefer the other booking participant when available.
        let displayName = 'Someone';
        let avatar = null;

        // Try to derive other participant from booking
        if (m.booking) {
          const bk = bookingMap.get(String(m.booking));
          if (bk) {
            const student = bk.student || null;
            const mentor = bk.mentor || null;
            const studentId = student ? String(student._id || student) : null;
            const mentorId = mentor ? String(mentor._id || mentor) : null;
            const other = (studentId && studentId !== String(userId)) ? student : ((mentorId && mentorId !== String(userId)) ? mentor : null);
            if (other) {
              displayName = `${other.firstName || ''} ${other.lastName || ''}`.trim() || displayName;
              avatar = other.avatar || null;
            }
          }
        }

        // If we didn't find an other participant from booking, and sender exists and is not current user, use sender
        if ((!avatar || displayName === 'Someone') && m.sender && m.sender._id && String(m.sender._id) !== String(userId)) {
          displayName = `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() || displayName;
          avatar = m.sender.avatar || avatar || null;
        }

        return {
          id: m._id,
          booking: m.booking || null,
          from: displayName,
          avatar: avatar || null,
          text: String(m.content || '').slice(0, 200),
          time: m.createdAt || m.updatedAt || new Date(),
          readBy: Array.isArray(m.readBy) ? m.readBy.map(r => ({ userId: String(r.userId), readAt: r.readAt })) : [],
          status: computeStatusForMessage(m, userId),
          reactions: Array.isArray(m.reactions) ? m.reactions.map(r => ({ emoji: r.emoji, users: Array.isArray(r.users) ? r.users.map(u => String(u)) : [], count: Number(r.count || (Array.isArray(r.users) ? r.users.length : 0)) })) : [],
          attachments: Array.isArray(m.attachments) ? (m.attachments || []).map(a => ({ _id: String(a._id || a), originalName: a.originalName || a.filename || '', mimeType: a.mimeType || '', size: a.size || 0, path: a.path || '', uploadedBy: a.uploadedBy ? String(a.uploadedBy) : null })) : [],
        };
      });

      // filter out archived conversations for this user if present
      try {
        const archived = Array.isArray(user.archivedConversations) ? user.archivedConversations.map(String) : [];
        if (archived.length) {
          previews = previews.filter(p => !(p.booking && archived.includes(String(p.booking))));
        }
      } catch (e) { /* ignore */ }

      return res.json({ success: true, data: { results: previews } });
    } catch (e) {
      console.warn('Failed to group recent messages by participant, falling back to raw previews', e);
      const previews = messages.map((m) => ({
        id: m._id,
        from: m.sender ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() || 'Someone' : 'Someone',
        avatar: m.sender ? (m.sender.avatar || null) : null,
        text: String(m.content || '').slice(0, 200),
        time: m.createdAt || m.updatedAt || new Date(),
        booking: m.booking || null,
        readBy: Array.isArray(m.readBy) ? m.readBy.map(r => ({ userId: String(r.userId), readAt: r.readAt })) : [],
        status: computeStatusForMessage(m, userId),
        reactions: Array.isArray(m.reactions) ? m.reactions.map(r => ({ emoji: r.emoji, users: Array.isArray(r.users) ? r.users.map(u => String(u)) : [], count: Number(r.count || (Array.isArray(r.users) ? r.users.length : 0)) })) : [],
      }));
      return res.json({ success: true, data: { results: previews } });
    }
  } catch (err) {
    console.error('GET /messages/recent error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/messages/history?bookingId=...&limit=200 - return chat history for a booking (for API fallback)
router.get('/history', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const bookingId = req.query.bookingId;
    const limit = parseInt(req.query.limit || '200', 10) || 200;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });

    // verify participation
    const booking = await Booking.findById(bookingId).select('student mentor');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    const isParticipant = (booking.student && String(booking.student) === String(user._id)) || (booking.mentor && String(booking.mentor) === String(user._id)) || user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized to view this history' });

  let msgs = await Message.find({ booking: bookingId }).sort({ createdAt: -1 }).limit(limit).populate('sender', 'firstName lastName avatar').populate('attachments');
    // Filter out messages soft-deleted for requesting user
    try {
      msgs = msgs.filter((m) => {
        if (!m) return false;
        const df = m.deletedFor;
        if (!df) return true;
        try {
          if (df.get && typeof df.get === 'function') return !df.get(String(user._id));
        } catch (e) {}
        return !df[String(user._id)];
      });
    } catch (e) {
      console.warn('Failed to filter deletedFor in chat history', e);
    }
    const normalized = msgs.reverse().map((m) => {
      const readBy = Array.isArray(m.readBy) ? m.readBy.map(r => ({ userId: String(r.userId), readAt: r.readAt })) : [];
      const reactions = Array.isArray(m.reactions) ? m.reactions.map(r => ({ emoji: r.emoji, users: Array.isArray(r.users) ? r.users.map(u => String(u)) : [], count: Number(r.count || (Array.isArray(r.users) ? r.users.length : 0)) })) : [];
      let status = 'sent';
      try {
        if (readBy.length) status = 'read';
        else if (m.status && ['sent', 'delivered', 'read'].includes(String(m.status))) status = String(m.status);
        else {
          const created = m.createdAt ? new Date(m.createdAt).getTime() : 0;
          const now = Date.now();
          const recentMs = RECENT_THRESHOLD_HOURS * 60 * 60 * 1000;
          if (created && (now - created) <= recentMs) status = 'delivered';
          else status = 'sent';
        }
      } catch (e) { status = m.status || 'sent' }
      return {
        _id: m._id,
        booking: m.booking,
        content: m.content,
        meta: m.meta || {},
        attachments: Array.isArray(m.attachments) ? (m.attachments || []).map(a => ({ _id: String(a._id || a), originalName: a.originalName || a.filename || '', mimeType: a.mimeType || '', size: a.size || 0, path: a.path || '', uploadedBy: a.uploadedBy ? String(a.uploadedBy) : null })) : [],
        createdAt: m.createdAt,
        readBy,
        status,
        reactions,
        sender: m.sender ? { _id: String(m.sender._id), firstName: m.sender.firstName, lastName: m.sender.lastName, avatar: m.sender.avatar || null } : null,
      };
    });
    return res.json({ success: true, messages: normalized });
  } catch (err) {
    console.error('GET /messages/history error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

// POST /api/messages/send - create a message via REST (additive; mirrors socket behavior)
router.post('/send', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { bookingId, content, attachments = [], meta = {} } = req.body || {};
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });
    if (!content && (!attachments || attachments.length === 0)) return res.status(400).json({ success: false, message: 'content or attachments required' });

    const booking = await Booking.findById(bookingId).select('student mentor');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    const isParticipant = (booking.student && String(booking.student) === String(user._id)) || (booking.mentor && String(booking.mentor) === String(user._id)) || user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized to send messages for this booking' });

    // Validate attachments ownership
    let attachedFiles = [];
    try {
      if (Array.isArray(attachments) && attachments.length) {
        const ids = attachments.filter(a => a && String(a) && mongoose.Types.ObjectId.isValid(String(a))).map(a => String(a));
        if (ids.length) attachedFiles = await require('../models/File').find({ _id: { $in: ids } }).lean();
        const unauthorized = (attachedFiles || []).some(f => (!(f && String(f.uploadedBy) === String(user._id)) && user.role !== 'admin'));
        if (unauthorized) return res.status(403).json({ success: false, message: 'One or more attached files are not owned by you' });
      }
    } catch (e) { attachedFiles = [] }

    const msg = await Message.create({ booking: bookingId, sender: user._id, content: content || '', meta: meta || {}, attachments: (attachedFiles || []).map(f => f._id) });

    // Build payload to emit
    const payload = {
      _id: msg._id,
      booking: bookingId,
      sender: { _id: String(user._id), firstName: user.firstName, lastName: user.lastName, avatar: user.avatar || null },
      content: msg.content,
      meta: msg.meta || {},
      attachments: (attachedFiles || []).map(f => ({ _id: String(f._id), originalName: f.originalName, mimeType: f.mimeType, size: f.size, path: f.path, uploadedBy: String(f.uploadedBy) })),
      createdAt: msg.createdAt,
      status: msg.status || 'sent'
    };

    // Emit to booking room and user rooms
    try {
      const io = getIo();
      if (io) {
        io.to(`booking_${bookingId}`).emit('chat-message', payload);
        const studentId = booking.student ? String(booking.student) : null;
        const mentorId = booking.mentor ? String(booking.mentor) : null;
        if (studentId) io.to(`user_${studentId}`).emit('chat-message', payload);
        if (mentorId) io.to(`user_${mentorId}`).emit('chat-message', payload);
      }
    } catch (e) { console.warn('Failed to emit chat-message from REST send', e) }

    return res.json({ success: true, data: { message: payload } });
  } catch (err) {
    console.error('POST /messages/send error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/messages/:messageId/read - mark a message as read by the current user
router.put('/:messageId/read', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { messageId } = req.params;
    if (!messageId) return res.status(400).json({ success: false, message: 'messageId required' });

    const msg = await Message.findById(messageId).exec();
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

    // Do not allow marking a message as read by its sender (no-op)
    if (msg.sender && String(msg.sender) === String(user._id)) {
      return res.json({ success: true, message: 'Message belongs to requester; no-op', data: { messageId: msg._id, readBy: Array.isArray(msg.readBy) ? msg.readBy.map(r => ({ userId: String(r.userId), readAt: r.readAt })) : [] } });
    }

    // Verify user is a participant in the booking (if message tied to a booking)
    if (msg.booking) {
      const booking = await Booking.findById(msg.booking).select('student mentor');
      if (!booking) return res.status(404).json({ success: false, message: 'Associated booking not found' });
      const isParticipant = (booking.student && String(booking.student) === String(user._id)) || (booking.mentor && String(booking.mentor) === String(user._id)) || user.role === 'admin';
      if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized to mark this message' });
    }

  // Check if user already present in readBy
  const already = Array.isArray(msg.readBy) && msg.readBy.some((r) => String(r.userId) === String(user._id));
    if (!already) {
      msg.readBy = msg.readBy || [];
      msg.readBy.push({ userId: user._id, readAt: new Date() });
      await msg.save();

      // update message status to 'read' (coarse-grained: mark read when any recipient reads)
      try {
        msg.status = 'read';
        await msg.save();
        const io2 = getIo();
        const statusPayload = { messageId: String(msg._id), status: 'read', bookingId: msg.booking ? String(msg.booking) : null };
        if (io2 && msg.booking) io2.to(`booking_${String(msg.booking)}`).emit('message-status-update', statusPayload);
        if (io2) io2.to(`user_${String(user._id)}`).emit('message-status-update', statusPayload);
      } catch (e) {
        console.warn('Failed to update message status to read', e);
      }

      // Emit socket event to booking room and to involved users
      try {
        const io = getIo();
        const payload = { messageId: String(msg._id), userId: String(user._id), readAt: new Date(), bookingId: msg.booking ? String(msg.booking) : null };
        if (io && msg.booking) io.to(`booking_${String(msg.booking)}`).emit('message-read', payload);
        if (io && msg.booking) {
          // try to notify participants individually as well
          try { io.to(`user_${String(user._id)}`).emit('message-read', payload); } catch (e) {}
        }
      } catch (emitErr) {
        console.warn('Failed to emit message-read event', emitErr);
      }
    }

    return res.json({ success: true, message: 'Marked read', data: { messageId: msg._id, readBy: msg.readBy.map(r => ({ userId: String(r.userId), readAt: r.readAt })), status: computeStatusForMessage(msg, user._id) } });
  } catch (err) {
    console.error('PUT /messages/:id/read error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/messages/read - batch mark messages as read by the current user
// body: { messageIds: string[] }
router.put('/read', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { messageIds } = req.body || {};
    if (!Array.isArray(messageIds) || messageIds.length === 0) return res.status(400).json({ success: false, message: 'messageIds array required' });

    // load messages
    const msgs = await Message.find({ _id: { $in: messageIds } }).lean();
    if (!msgs || msgs.length === 0) return res.json({ success: true, message: 'No messages found', data: { updated: [] } });

    // collect booking ids to validate participant access
    const bookingIds = Array.from(new Set(msgs.filter(m => m.booking).map(m => String(m.booking))));
    const bookings = bookingIds.length ? await Booking.find({ _id: { $in: bookingIds } }).select('student mentor') : [];
    const bookingMap = new Map(bookings.map(b => [String(b._id), b]));

    const toMarkIds = [];
    for (const m of msgs) {
      // if message belongs to a booking, ensure requester is a participant
      if (m.booking) {
        const bk = bookingMap.get(String(m.booking));
        if (!bk) continue;
        const isParticipant = (bk.student && String(bk.student) === String(user._id)) || (bk.mentor && String(bk.mentor) === String(user._id)) || user.role === 'admin';
        if (!isParticipant) continue;
      }
  // skip messages that are authored by the requester
  if (m.sender && String(m.sender) === String(user._id)) continue;
  // skip messages that already have this user in readBy
  if (Array.isArray(m.readBy) && m.readBy.some(r => String(r.userId) === String(user._id))) continue;
      toMarkIds.push(String(m._id));
    }

    if (!toMarkIds.length) return res.json({ success: true, message: 'No messages to mark', data: { updated: [] } });

  const now = new Date();
  // To reduce duplicates under concurrency, first remove any existing readBy entries for this user
  // then push a single entry with the current timestamp. This is not fully transactional but reduces
  // the chance of duplicate entries compared to a single $push when concurrent writes occur.
  await Message.updateMany({ _id: { $in: toMarkIds } }, { $pull: { readBy: { userId: user._id } } });
  await Message.updateMany({ _id: { $in: toMarkIds } }, { $push: { readBy: { userId: user._id, readAt: now } } });

    // fetch updated messages to include readBy in response and to emit events
    const updated = await Message.find({ _id: { $in: toMarkIds } }).lean();

    // emit socket events per message so clients can update UI
    try {
      const io = getIo();
      if (io) {
        for (const m of updated) {
          const payload = { messageId: String(m._id), userId: String(user._id), readAt: now.toISOString(), bookingId: m.booking ? String(m.booking) : null };
          if (m.booking) io.to(`booking_${String(m.booking)}`).emit('message-read', payload);
          // also notify the user directly
          io.to(`user_${String(user._id)}`).emit('message-read', payload);
          // update status to 'read' and notify participants (coarse-grained)
          try {
            const mm = await Message.findById(m._id);
            if (mm) {
              mm.status = 'read';
              await mm.save();
              const statusPayload = { messageId: String(mm._id), status: 'read', bookingId: mm.booking ? String(mm.booking) : null };
              io.to(`booking_${String(mm.booking)}`).emit('message-status-update', statusPayload);
            }
          } catch (e) {
            console.warn('Failed to set message status to read for batch', e);
          }
        }
      }
    } catch (emitErr) {
      console.warn('Failed to emit message-read events (batch)', emitErr);
    }

    // Also update booking-level unreadCount for affected bookings (reset for this user)
    try {
      if (bookingIds && bookingIds.length) {
        const io = getIo();
        for (const bid of bookingIds) {
          try {
            const bk = await Booking.findById(bid);
            if (!bk) continue;
            if (!bk.unreadCount) bk.unreadCount = {};
            if (bk.unreadCount.set) bk.unreadCount.set(String(user._id), 0);
            else bk.unreadCount[String(user._id)] = 0;
            await bk.save();
            const convPayload = { bookingId: bid, lastMessageAt: bk.lastMessageAt, unreadCount: bk.unreadCount && bk.unreadCount.toObject ? bk.unreadCount.toObject() : (bk.unreadCount || {}) };
            if (io) {
              try { if (bk.student) io.to(`user_${String(bk.student)}`).emit('conversation-updated', convPayload); } catch (e) {}
              try { if (bk.mentor) io.to(`user_${String(bk.mentor)}`).emit('conversation-updated', convPayload); } catch (e) {}
            }
          } catch (e) {
            console.warn('Failed to reset unreadCount for booking', bid, e && e.message ? e.message : e);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to update booking unreadCount after marking messages read', e && e.message ? e.message : e);
    }

    return res.json({ success: true, message: 'Marked read', data: { updated: updated.map(m => ({ messageId: String(m._id), readBy: Array.isArray(m.readBy) ? m.readBy.map(r => ({ userId: String(r.userId), readAt: r.readAt })) : [], status: computeStatusForMessage(m, user._id) })) } });
  } catch (err) {
    console.error('PUT /messages/read error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/messages/:id/status - update message status (admin or sender can update)
router.put('/:messageId/status', protect, async (req, res) => {
  try {
    const user = req.user;
    const { messageId } = req.params;
    const { status } = req.body || {};
    if (!messageId || !status) return res.status(400).json({ success: false, message: 'messageId and status required' });
    if (!['sent', 'delivered', 'read'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    // Only sender or admin can set delivered/read explicitly
    if (!(String(msg.sender) === String(user._id) || user.role === 'admin')) {
      return res.status(403).json({ success: false, message: 'Not authorized to update status' });
    }
    msg.status = status;
    await msg.save();
    const io = getIo();
    const payload = { messageId: String(msg._id), status, bookingId: msg.booking ? String(msg.booking) : null };
    if (io && msg.booking) io.to(`booking_${String(msg.booking)}`).emit('message-status-update', payload);
    if (io) io.to(`user_${String(user._id)}`).emit('message-status-update', payload);
    return res.json({ success: true, message: 'Status updated', data: payload });
  } catch (err) {
    console.error('PUT /messages/:id/status error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/messages/:messageId/reactions - toggle a reaction for the current user on a message
router.post('/:messageId/reactions', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { messageId } = req.params;
    const { emoji } = req.body || {};
    if (!messageId || !emoji) return res.status(400).json({ success: false, message: 'messageId and emoji required' });

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

    // If tied to booking, ensure requester is participant
    if (msg.booking) {
      const booking = await Booking.findById(msg.booking).select('student mentor');
      if (!booking) return res.status(404).json({ success: false, message: 'Associated booking not found' });
      const isParticipant = (booking.student && String(booking.student) === String(user._id)) || (booking.mentor && String(booking.mentor) === String(user._id)) || user.role === 'admin';
      if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized to react to this message' });
    }

    // normalize reactions array
    msg.reactions = Array.isArray(msg.reactions) ? msg.reactions : [];
    const userId = String(user._id);
    const existing = msg.reactions.find((r) => String(r.emoji) === String(emoji));
    if (existing) {
      // check if user already reacted
      const idx = (existing.users || []).findIndex((u) => String(u) === userId);
      if (idx >= 0) {
        // remove user's reaction
        existing.users.splice(idx, 1);
        if (!existing.users.length) {
          msg.reactions = msg.reactions.filter((r) => String(r.emoji) !== String(emoji));
        } else {
          existing.count = existing.users.length;
        }
      } else {
        // add user
        existing.users = existing.users || [];
        existing.users.push(user._id);
        existing.count = existing.users.length;
      }
    } else {
      msg.reactions.push({ emoji: String(emoji), users: [user._id], count: 1 });
    }

    await msg.save();

    // build payload with user id strings
    const payload = { messageId: String(msg._id), bookingId: msg.booking ? String(msg.booking) : null, reactions: (msg.reactions || []).map(r => ({ emoji: r.emoji, users: Array.isArray(r.users) ? r.users.map(u => String(u)) : [] })) };

    // Emit socket event to booking room and user rooms
    try {
      const io = getIo();
      if (io && payload.bookingId) {
        io.to(`booking_${payload.bookingId}`).emit('message-reaction-updated', payload);
        io.to(`booking_${payload.bookingId}`).emit('messageReactionUpdated', payload);
      }
      if (io) {
        try { io.to(`user_${String(user._id)}`).emit('message-reaction-updated', payload); io.to(`user_${String(user._id)}`).emit('messageReactionUpdated', payload); } catch (e) {}
      }
    } catch (e) {
      console.warn('Failed to emit message reaction event', e);
    }

    return res.json({ success: true, data: payload });
  } catch (err) {
    console.error('POST /messages/:id/reactions error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/messages/:messageId - delete a message (soft delete for user or hard delete for everyone)
// Query param or body: { scope: 'me' | 'everyone' } default = 'me'
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { messageId } = req.params;
    if (!messageId) return res.status(400).json({ success: false, message: 'messageId required' });
    const scope = (req.query.scope || (req.body && req.body.scope) || 'me');

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

    const bookingId = msg.booking ? String(msg.booking) : null;

    if (scope === 'everyone') {
      // only sender or admin can hard-delete for everyone
      if (!(msg.sender && String(msg.sender) === String(user._id)) && user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to delete for everyone' });
      }
      // remove message document
      await Message.deleteOne({ _id: msg._id });

      // emit socket event to booking room and participant rooms (both kebab and camelCase for compatibility)
      try {
        const io = getIo();
        const payload = { messageId: String(messageId), bookingId, scope: 'everyone' };
        if (io && bookingId) {
          io.to(`booking_${bookingId}`).emit('message-deleted', payload);
          io.to(`booking_${bookingId}`).emit('messageDeleted', payload);
        }
        // also emit to participants if booking exists
        try {
          const bk = bookingId ? await Booking.findById(bookingId).select('student mentor') : null;
          const studentId = bk && bk.student ? String(bk.student) : null;
          const mentorId = bk && bk.mentor ? String(bk.mentor) : null;
          if (studentId) { io.to(`user_${studentId}`).emit('message-deleted', payload); io.to(`user_${studentId}`).emit('messageDeleted', payload); }
          if (mentorId) { io.to(`user_${mentorId}`).emit('message-deleted', payload); io.to(`user_${mentorId}`).emit('messageDeleted', payload); }
        } catch (e) {}
      } catch (e) { console.warn('Failed to emit message-deleted', e); }

      return res.json({ success: true, message: 'Message deleted for everyone', data: { messageId } });
    }

    // scope === 'me' (soft delete)
    // mark deletedFor[userId] = true
    if (!msg.deletedFor) msg.deletedFor = {};
    if (msg.deletedFor.set) msg.deletedFor.set(String(user._id), true);
    else msg.deletedFor[String(user._id)] = true;
    await msg.save();

    try {
      const io = getIo();
      const payload = { messageId: String(messageId), bookingId, userId: String(user._1 || user._id || user.id), scope: 'me' };
      if (io && bookingId) { io.to(`booking_${bookingId}`).emit('message-deleted', payload); io.to(`booking_${bookingId}`).emit('messageDeleted', payload); }
      try { io.to(`user_${String(user._id)}`).emit('message-deleted', payload); io.to(`user_${String(user._id)}`).emit('messageDeleted', payload); } catch(e){}
    } catch (e) { console.warn('Failed to emit message-deleted (soft)', e); }

    return res.json({ success: true, message: 'Message deleted for you', data: { messageId } });
  } catch (err) {
    console.error('DELETE /messages/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

