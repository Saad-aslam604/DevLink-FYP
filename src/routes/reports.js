const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Report = require('../models/Report');
const Post = require('../models/Post');
const User = require('../models/User');

// POST /api/reports - report a post or user (protected)
router.post('/', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { postId, reportedUserId, reason, details } = req.body || {};
    if (!postId && !reportedUserId) return res.status(400).json({ success: false, message: 'postId or reportedUserId required' });

    // validate post if provided
    let post = null;
    if (postId) {
      post = await Post.findById(postId).lean();
      if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const rep = await Report.create({ reporter: user._id, post: postId || undefined, reportedUser: reportedUserId || undefined, reason: String(reason || '').slice(0, 1000), details: String(details || '').slice(0, 5000) });

    // Optionally notify admins via sockets (left out)
    return res.json({ success: true, message: 'Report submitted', data: { reportId: rep._id } });
  } catch (err) {
    console.error('POST /reports error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
