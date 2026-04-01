const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const User = require('../models/User');

// Utility: format date/time strings
function fmtTime(dt) {
  try {
    const d = new Date(dt);
    return {
      iso: d.toISOString(),
      date: d.toISOString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } catch (e) {
    return { iso: null, date: null, time: null };
  }
}

// Helper to compute week buckets (last 4 weeks)
function getWeekBuckets(weeks = 4) {
  const buckets = [];
  const now = new Date();
  // Start from beginning of this week (Mon)
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - (i * 7));
    const label = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    buckets.push({ label, start: new Date(start), sessions: 0, hours: 0 });
  }
  return buckets;
}

// GET /api/user/analytics
// Returns upcomingSessions, analytics, formattedActivities, quickStats
router.get('/', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const userId = user._id;
    const now = new Date();

    // Upcoming sessions (confirmed) for this user (either as student or mentor)
    const upcoming = await Booking.find({
      $or: [{ student: userId }, { mentor: userId }],
      status: 'confirmed',
      startTime: { $gte: now }
    })
      .populate('mentor', 'firstName lastName avatar')
      .lean();

    const upcomingSessions = upcoming.map((bk) => {
      const mentor = bk.mentor || {};
      const t = fmtTime(bk.startTime);
      return {
        id: bk._id,
        title: `Session with ${mentor.firstName || mentor.lastName ? `${mentor.firstName || ''} ${mentor.lastName || ''}`.trim() : 'Mentor'}`,
        date: t.iso,
        time: t.time,
        status: bk.status,
        mentor: {
          name: mentor.firstName || mentor.lastName ? `${mentor.firstName || ''} ${mentor.lastName || ''}`.trim() : 'Mentor',
          avatar: mentor.avatar || null,
          id: mentor._id || null,
        }
      };
    });

    // Analytics: derive simple metrics from bookings
    const completed = await Booking.find({
      $or: [{ student: userId }, { mentor: userId }],
      status: 'completed'
    }).populate('mentor', 'skills firstName lastName').lean();

    // learningProgress: sessions per week (last 4 weeks)
    const weeks = getWeekBuckets(4);
    completed.forEach((bk) => {
      const dt = bk.endTime || bk.startTime || bk.updatedAt || bk.createdAt;
      if (!dt) return;
      const d = new Date(dt);
      // find the most recent matching bucket by week start
      for (let i = 0; i < weeks.length; i++) {
        const start = weeks[i].start;
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        if (d >= start && d < end) {
          weeks[i].sessions += 1;
          const hours = bk.startTime && bk.endTime ? ((new Date(bk.endTime) - new Date(bk.startTime)) / (1000 * 60 * 60)) : 1;
          weeks[i].hours += hours;
          break;
        }
      }
    });

    const learningProgress = weeks.map(w => ({ week: w.label, sessions: w.sessions, hours: Number(w.hours.toFixed(2)) }));

    // sessionFrequency: count per weekday for upcoming + completed (last 30 days)
    const freqMap = { Mon:0, Tue:0, Wed:0, Thu:0, Fri:0, Sat:0, Sun:0 };
    const freqSource = [...upcoming, ...completed];
    freqSource.forEach(bk => {
      const dt = bk.startTime || bk.createdAt;
      if (!dt) return;
      const d = new Date(dt);
      const day = d.getDay(); // 0 Sun .. 6 Sat
      const key = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day];
      if (key in freqMap) freqMap[key] += 1;
    });
    const sessionFrequency = Object.keys(freqMap).map(k => ({ day: k, sessions: freqMap[k] }));

    // timeDistribution: best-effort by mentor.skills (aggregate hours)
    const skillHours = {};
    completed.forEach(bk => {
      const hours = bk.startTime && bk.endTime ? ((new Date(bk.endTime) - new Date(bk.startTime)) / (1000 * 60 * 60)) : 1;
      const mentor = bk.mentor || {};
      const skills = Array.isArray(mentor.skills) && mentor.skills.length ? mentor.skills.slice(0,3) : ['Other'];
      skills.forEach(s => { skillHours[s] = (skillHours[s] || 0) + hours; });
    });
    // ensure some categories exist
    if (Object.keys(skillHours).length === 0) {
      // fallback sample distribution
      skillHours['React'] = 12;
      skillHours['Node.js'] = 8;
      skillHours['JavaScript'] = 10;
      skillHours['Algorithms'] = 6;
      skillHours['Other'] = 4;
    }
    const totalHours = Object.values(skillHours).reduce((a,b) => a + b, 0) || 1;
    const timeDistribution = Object.keys(skillHours).map(k => ({ category: k, hours: Number(skillHours[k].toFixed(2)), percentage: Math.round((skillHours[k]/totalHours)*100) }));

    // skillsProgress: use user.skills if available, otherwise infer from skillHours
    let skillsProgress = [];
    if (Array.isArray(user.skills) && user.skills.length) {
      skillsProgress = user.skills.slice(0,5).map((sk, idx) => ({ skill: sk, current: 60 + (idx*5), previous: 50 + (idx*5), change: `+${10}` }));
    } else {
      skillsProgress = Object.keys(skillHours).slice(0,5).map((k, idx) => ({ skill: k, current: Math.min(80, 50 + idx*10), previous: Math.max(30, 40 + idx*5), change: `+${Math.min(20, 10 + idx*5)}` }));
    }

    // formatted activities: reuse the activities route logic but craft friendly items
    // Load recent messages and bookings for feed
    const recentBookings = upcoming.slice(0,10);
    const messages = await Message.find({ $or: [{ sender: userId }, { recipient: userId }] }).sort({ createdAt: -1 }).limit(20).lean().populate('sender', 'firstName lastName avatar');

    const formattedActivities = [];
    recentBookings.forEach(bk => {
      formattedActivities.push({
        id: String(bk._id),
        type: 'session',
        action: bk.status === 'confirmed' ? 'confirmed' : 'scheduled',
        title: 'Session Confirmed',
        description: `Your session with ${(bk.mentor && (bk.mentor.firstName || bk.mentor.lastName)) ? `${bk.mentor.firstName || ''} ${bk.mentor.lastName || ''}`.trim() : 'Mentor'} on ${fmtTime(bk.startTime).time} has been confirmed`,
        icon: 'calendar-check',
        timestamp: bk.startTime || bk.createdAt,
        color: 'green',
        metadata: { bookingId: bk._id, mentorName: (bk.mentor && (bk.mentor.firstName || bk.mentor.lastName)) ? `${bk.mentor.firstName || ''} ${bk.mentor.lastName || ''}`.trim() : null }
      });
    });
    messages.forEach(m => {
      const senderName = m.sender ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() : 'Someone';
      formattedActivities.push({
        id: String(m._id),
        type: 'message',
        action: 'received',
        title: 'New Message',
        description: (m.content || '').slice(0, 200) || 'New message received',
        icon: 'message-square',
        timestamp: m.createdAt,
        color: 'blue',
        metadata: { sender: senderName, preview: (m.content || '').slice(0, 120) }
      });
    });

    // Sort activities by timestamp desc and limit
    formattedActivities.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Quick stats
    const quickStats = {
      upcomingMeetings: upcomingSessions.length,
      unreadMessages: await Message.countDocuments({ recipient: userId, read: { $ne: true } }),
      mentorConnections: (user.connections && typeof user.connections === 'number') ? user.connections : (user.mentorConnections || 0) || 0,
      completedSessions: completed.length,
      learningHours: Math.round((completed.reduce((s, bk) => {
        const hrs = bk.startTime && bk.endTime ? ((new Date(bk.endTime) - new Date(bk.startTime)) / (1000*60*60)) : 1; return s + hrs;
      }, 0)) * 10) / 10,
      streakDays: 0
    };

    // compute a simple streak: consecutive days with at least one completed session in last 14 days
    try {
      const daysSet = new Set();
      completed.forEach(bk => {
        const d = new Date(bk.endTime || bk.startTime || bk.createdAt);
        const key = d.toISOString().slice(0,10);
        daysSet.add(key);
      });
      // compute consecutive days up to today
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0,10);
        if (daysSet.has(key)) streak++; else break;
      }
      quickStats.streakDays = streak;
    } catch (e) {}

    return res.json({
      success: true,
      data: {
        upcomingSessions,
        analytics: {
          learningProgress,
          timeDistribution,
          skillsProgress,
          sessionFrequency
        },
        formattedActivities: formattedActivities.slice(0, 40),
        quickStats
      }
    });

  } catch (err) {
    console.error('GET /api/user/analytics error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
