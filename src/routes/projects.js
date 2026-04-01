const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { protect } = require('../middleware/auth');
const Project = require('../models/Project');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const { getIo } = require('../socket');
const OrganizationMember = require('../models/OrganizationMember');
const User = require('../models/User');

// Middleware: ensure user is a Senior Developer (role === 'mentor')
function ensureSenior(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (user.role !== 'mentor') return res.status(403).json({ success: false, message: 'Only Senior Developers can perform this action' });
    return next();
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error' }) }
}

// POST /api/projects - create project (senior developers only)
router.post('/', protect, ensureSenior, async (req, res) => {
  try {
    const user = req.user;
  const { title, description, skillsRequired = [], budget = {}, deadline, status = 'open', attachments = [], organization } = req.body || {};
    if (!title || !description) return res.status(400).json({ success: false, message: 'title and description required' });

    // If an organization is supplied, validate permission: the requester must be the org account itself,
    // an active OrganizationMember for that org, or an admin.
    if (organization && mongoose.Types.ObjectId.isValid(String(organization))) {
      const orgUser = await User.findById(String(organization)).select('userType');
      if (!orgUser || (orgUser.userType || '').toString().toLowerCase() !== 'organization') {
        return res.status(400).json({ success: false, message: 'Invalid organization id' });
      }
      // Allow if the requester is the organization account
      if (!(String(user._id) === String(organization))) {
        // Otherwise require an active OrganizationMember linking this user to the org, or admin
        const member = await OrganizationMember.findOne({ organization: String(organization), user: user._id, status: 'active' });
        if (!member && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized to post projects for this organization' });
      }
    }

    const proj = new Project({
      title: String(title),
      description: String(description),
      skillsRequired: Array.isArray(skillsRequired) ? skillsRequired.map(String) : [],
      budget: { amount: Number(budget.amount || 0), currency: String(budget.currency || 'USD') },
      deadline: deadline ? new Date(deadline) : undefined,
      postedBy: user._id,
      organization: (organization && mongoose.Types.ObjectId.isValid(String(organization))) ? String(organization) : undefined,
      status: ['draft','open','in-progress','completed','cancelled'].includes(status) ? status : 'open',
      attachments: Array.isArray(attachments) ? attachments.filter(a => mongoose.Types.ObjectId.isValid(String(a))).map(a => String(a)) : [],
    });

    await proj.save();
    return res.json({ success: true, data: proj });
  } catch (err) {
    console.error('POST /projects error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/projects - list projects with filters & pagination
router.get('/', async (req, res) => {
  try {
    const q = req.query || {};
    const page = Math.max(1, parseInt(q.page || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(q.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (q.status) filter.status = String(q.status);
    if (q.skill) filter.skillsRequired = { $in: Array.isArray(q.skill) ? q.skill : [String(q.skill)] };
    if (q.minBudget) filter['budget.amount'] = { $gte: Number(q.minBudget) };
    if (q.maxBudget) filter['budget.amount'] = Object.assign(filter['budget.amount'] || {}, { $lte: Number(q.maxBudget) });
    if (q.search) filter.$or = [{ title: new RegExp(String(q.search), 'i') }, { description: new RegExp(String(q.search), 'i') }];
    if (q.deadlineBefore) filter.deadline = Object.assign(filter.deadline || {}, { $lte: new Date(q.deadlineBefore) });
    if (q.deadlineAfter) filter.deadline = Object.assign(filter.deadline || {}, { $gte: new Date(q.deadlineAfter) });

    const total = await Project.countDocuments(filter);
    const items = await Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('postedBy', 'firstName lastName avatar role').populate('attachments').lean();

    return res.json({ success: true, data: { items, total, page, limit } });
  } catch (err) {
    console.error('GET /projects error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/projects/:id - get project details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    const proj = await Project.findById(id)
      .populate('postedBy', 'firstName lastName avatar role')
      .populate('attachments')
      .populate('applicants.user', 'firstName lastName avatar email')
      .lean();
    if (!proj) return res.status(404).json({ success: false, message: 'Project not found' });
    return res.json({ success: true, data: proj });
  } catch (err) {
    console.error('GET /projects/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/projects/:id - update project (owner only)
router.put('/:id', protect, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    const proj = await Project.findById(id);
    if (!proj) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!proj.postedBy || String(proj.postedBy) !== String(user._id)) return res.status(403).json({ success: false, message: 'Not authorized' });

  const { title, description, skillsRequired, budget, deadline, status, attachments, organization } = req.body || {};
    if (title !== undefined) proj.title = String(title);
    if (description !== undefined) proj.description = String(description);
    if (skillsRequired !== undefined) proj.skillsRequired = Array.isArray(skillsRequired) ? skillsRequired.map(String) : proj.skillsRequired;
    if (budget !== undefined) proj.budget = { amount: Number(budget.amount || proj.budget.amount || 0), currency: String(budget.currency || proj.budget.currency || 'USD') };
    if (deadline !== undefined) proj.deadline = deadline ? new Date(deadline) : proj.deadline;
    if (status !== undefined && ['draft','open','in-progress','completed','cancelled'].includes(String(status))) proj.status = String(status);
    // If organization is being set/updated, validate permissions similar to create flow
    if (organization !== undefined) {
      if (organization && mongoose.Types.ObjectId.isValid(String(organization))) {
        const orgUser = await User.findById(String(organization)).select('userType');
        if (!orgUser || (orgUser.userType || '').toString().toLowerCase() !== 'organization') {
          return res.status(400).json({ success: false, message: 'Invalid organization id' });
        }
        if (!(String(user._id) === String(organization))) {
          const member = await OrganizationMember.findOne({ organization: String(organization), user: user._id, status: 'active' });
          if (!member && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized to link this project to the organization' });
        }
        proj.organization = String(organization);
      } else {
        // clear organization when passed falsy
        proj.organization = undefined;
      }
    }
    if (attachments !== undefined) proj.attachments = Array.isArray(attachments) ? attachments.filter(a => mongoose.Types.ObjectId.isValid(String(a))).map(a => String(a)) : proj.attachments;

    await proj.save();
    return res.json({ success: true, data: proj });
  } catch (err) {
    console.error('PUT /projects/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/projects/:id - delete project (owner only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    const proj = await Project.findById(id);
    if (!proj) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!proj.postedBy || String(proj.postedBy) !== String(user._id)) return res.status(403).json({ success: false, message: 'Not authorized' });

    await Project.deleteOne({ _id: proj._id });
    return res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    console.error('DELETE /projects/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/projects/:id/apply - apply to project (authenticated users)
router.post('/:id/apply', protect, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { message } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    const proj = await Project.findById(id);
    if (!proj) return res.status(404).json({ success: false, message: 'Project not found' });

    // Prevent duplicate applications by same user
    const existing = (proj.applicants || []).some(a => String(a.user) === String(user._id));
    if (existing) return res.status(400).json({ success: false, message: 'You have already applied to this project' });

    proj.applicants = proj.applicants || [];
    proj.applicants.push({ user: user._id, message: String(message || ''), appliedAt: new Date() });
    await proj.save();

    // Create or find a lightweight booking (conversation) between applicant and project owner,
    // then create a chat message in that booking so it appears in the existing messaging UI.
    try {
      const applicantName = (user.firstName || user.name || '').trim() || (user.email || 'Applicant');
      const ownerId = proj.postedBy;
      const applicationRecord = proj.applicants[proj.applicants.length - 1];

      // find existing booking (conversation) between these two users
      let booking = await Booking.findOne({ $or: [ { student: user._id, mentor: ownerId }, { student: ownerId, mentor: user._id } ] });
      if (!booking) {
        booking = new Booking({ student: user._id, mentor: ownerId, createdAt: new Date(), lastMessageAt: new Date(), isActive: true });
        await booking.save();
      }

      const contentLines = [
        '📋 New Project Application',
        `Project: ${proj.title || String(proj._id)}`,
        `Applicant: ${applicantName}`,
        `Message: ${String(message || 'No additional message provided')}`,
        `View project: /projects/${String(proj._id)}`,
      ];
      try {
        const skills = Array.isArray(user.skills) ? user.skills.join(', ') : (user.skills || 'Not specified');
        contentLines.splice(3, 0, `Skills: ${skills}`);
      } catch (e) {}

      // create message tied to the booking so it shows up in conversation lists
      const msg = await Message.create({ booking: booking._id, sender: user._id, content: contentLines.join('\n'), attachments: [], meta: { type: 'project_application', projectId: proj._id, applicationId: applicationRecord ? applicationRecord._id : undefined } });

      // Update booking metadata: lastMessageAt and unread counts for recipients
      try {
        const bk = await Booking.findById(booking._id);
        if (bk) {
          bk.lastMessageAt = msg.createdAt || new Date();
          if (!bk.unreadCount) bk.unreadCount = {};
          const senderIdStr = String(user._id);
          const studentId = bk.student ? String(bk.student) : null;
          const mentorId = bk.mentor ? String(bk.mentor) : null;
          const recipients = [];
          if (studentId && studentId !== senderIdStr) recipients.push(studentId);
          if (mentorId && mentorId !== senderIdStr && mentorId !== studentId) recipients.push(mentorId);
          for (const r of recipients) {
            const prev = bk.unreadCount.get ? (bk.unreadCount.get(r) || 0) : (bk.unreadCount[r] || 0);
            const next = (Number(prev) || 0) + 1;
            if (bk.unreadCount.set) bk.unreadCount.set(r, next);
            else bk.unreadCount[r] = next;
          }
          await bk.save();

          // emit conversation-updated
          try {
            const io = getIo();
            const convPayload = { bookingId: String(bk._id), lastMessageAt: bk.lastMessageAt, unreadCount: bk.unreadCount && bk.unreadCount.toObject ? bk.unreadCount.toObject() : (bk.unreadCount || {}) };
            if (io) {
              if (studentId) io.to(`user_${studentId}`).emit('conversation-updated', convPayload);
              if (mentorId) io.to(`user_${mentorId}`).emit('conversation-updated', convPayload);
            }
          } catch (e) { console.warn('Failed to emit conversation-updated from project apply', e); }
        }
      } catch (e) { console.warn('Failed to update booking lastMessageAt/unreadCount from project apply', e); }

      // Emit the chat-message to booking room and involved users so UI updates in real-time
      try {
        const io = getIo();
        if (io) {
          const payload = {
            _id: String(msg._id),
            booking: String(booking._id),
            sender: { _id: String(user._id), firstName: user.firstName, lastName: user.lastName, avatar: user.avatar || null },
            content: msg.content,
            meta: msg.meta || {},
            attachments: [],
            createdAt: msg.createdAt,
            status: msg.status || 'sent'
          };

          // Room emit
          try { io.to(`booking_${String(booking._id)}`).emit('chat-message', payload); } catch (e) {}
          // Personal rooms
          try { if (ownerId) io.to(`user_${String(ownerId)}`).emit('chat-message', payload); } catch (e) {}
          try { io.to(`user_${String(user._id)}`).emit('chat-message', payload); } catch (e) {}

          // Additionally emit a lightweight project-application notification to owner
          try { if (ownerId) io.to(`user_${String(ownerId)}`).emit('project-application', { projectId: String(proj._id), applicantId: String(user._id), applicationId: String(applicationRecord ? applicationRecord._id : '') }); } catch (e) {}
        }
      } catch (e) { console.warn('Failed to emit chat-message/project-application from project apply', e); }
    } catch (e) {
      console.warn('Failed to create application message', e && e.message ? e.message : e);
    }

    return res.json({ success: true, message: 'Application submitted' });
  } catch (err) {
    console.error('POST /projects/:id/apply error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/projects/user/:userId - list projects created by a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
    const items = await Project.find({ postedBy: userId }).sort({ createdAt: -1 }).populate('attachments').lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('GET /projects/user/:userId error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
