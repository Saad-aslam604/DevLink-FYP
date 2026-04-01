const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');

// GET /api/posts/:postId/comments - list comments for a post
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) return res.status(400).json({ success: false, message: 'postId required' });
    const comments = await Comment.find({ post: postId }).sort({ createdAt: 1 }).populate('author', 'firstName lastName avatar').lean();
    const mapped = comments.map((c) => ({ id: c._id, content: c.content, createdAt: c.createdAt, author: c.author ? { id: c.author._id, firstName: c.author.firstName, lastName: c.author.lastName, avatar: c.author.avatar } : null }));
    return res.json({ success: true, data: mapped });
  } catch (err) {
    console.error('GET /posts/:postId/comments error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/posts/:postId/comments - add comment to post (protected)
router.post('/posts/:postId/comments', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { postId } = req.params;
    const { content } = req.body || {};
    if (!postId) return res.status(400).json({ success: false, message: 'postId required' });
    if (!content || String(content).trim() === '') return res.status(400).json({ success: false, message: 'content is required' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = new Comment({ post: postId, author: user._id, content: String(content).trim() });
    await comment.save();

    // atomically increment commentCount on post
    try {
      await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
    } catch (e) {
      console.warn('Failed to increment post.commentCount', e);
    }

    const populated = await Comment.findById(comment._id).populate('author', 'firstName lastName avatar').lean();
    const out = { id: populated._id, content: populated.content, createdAt: populated.createdAt, author: populated.author ? { id: populated.author._id, firstName: populated.author.firstName, lastName: populated.author.lastName, avatar: populated.author.avatar } : null };

    return res.status(201).json({ success: true, data: out });
  } catch (err) {
    console.error('POST /posts/:postId/comments error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
