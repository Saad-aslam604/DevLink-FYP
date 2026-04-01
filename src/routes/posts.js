const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { protect, optionalAuth } = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');

// Ensure uploads/posts directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'posts');
try { fs.mkdirSync(uploadsDir, { recursive: true }) } catch (e) { /* ignore */ }

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadsDir) },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    cb(null, `${Date.now()}-${safeName}`)
  }
})

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
  limits: { fileSize: 5 * 1024 * 1024 }
})

// GET /api/posts - list posts (public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10) || 50;
    const page = Math.max(0, parseInt(req.query.page || '0', 10) || 0);
    const posts = await Post.find({ removed: { $ne: true } })
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit)
      .populate('author', 'firstName lastName avatar')
      .lean();

    const mapped = posts.map((p) => {
      const likesArr = Array.isArray(p.likes) ? p.likes : [];
      const isLiked = req.user ? likesArr.some((u) => String(u) === String(req.user._id)) : false;
      return {
        id: p._id,
        author: p.author ? { id: p.author._id, firstName: p.author.firstName, lastName: p.author.lastName, avatar: p.author.avatar } : null,
        content: p.content,
        media: Array.isArray(p.media) ? p.media : [],
        likeCount: likesArr.length,
        isLiked,
        commentCount: typeof p.commentCount === 'number' ? p.commentCount : (Array.isArray(p.comments) ? p.comments.length : 0),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return res.json({ success: true, data: mapped });
  } catch (err) {
    console.error('GET /posts error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/posts - create a new post (protected) - supports multipart image uploads
router.post('/', protect, upload.array('images', 6), async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // content may be in req.body (from FormData) or raw JSON body
    const { content } = req.body || {};
    if (!content || String(content).trim() === '') return res.status(400).json({ success: false, message: 'content is required' });

    // map uploaded files to accessible URLs (server serves /uploads)
    const files = req.files || [];
    const uploaded = Array.isArray(files) ? files.map((f) => `/uploads/posts/${f.filename}`) : [];

    const post = new Post({ author: user._id, content: String(content).trim(), media: uploaded });
    await post.save();
    const populated = await Post.findById(post._id).populate('author', 'firstName lastName avatar').lean();

    const likesArr = Array.isArray(populated.likes) ? populated.likes : [];
    const out = {
      id: populated._id,
      author: populated.author ? { id: populated.author._id, firstName: populated.author.firstName, lastName: populated.author.lastName, avatar: populated.author.avatar } : null,
      content: populated.content,
      media: populated.media || [],
      likeCount: likesArr.length,
      isLiked: false,
      commentCount: typeof populated.commentCount === 'number' ? populated.commentCount : (Array.isArray(populated.comments) ? populated.comments.length : 0),
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
    };

    return res.status(201).json({ success: true, data: out });
  } catch (err) {
    console.error('POST /posts error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/posts/:postId/like - toggle like (protected)
router.post('/:postId/like', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { postId } = req.params;
    if (!postId) return res.status(400).json({ success: false, message: 'postId required' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const uid = String(user._id);
    const likes = Array.isArray(post.likes) ? post.likes.map((l) => String(l)) : [];
    let isLiked = false;
    if (likes.includes(uid)) {
      // remove like
      post.likes = (post.likes || []).filter((l) => String(l) !== uid);
      isLiked = false;
    } else {
      // add like
      post.likes = post.likes || [];
      post.likes.push(user._id);
      isLiked = true;
    }

    await post.save();
    const populated = await Post.findById(post._id).populate('author', 'firstName lastName avatar').lean();
    const likesArr = Array.isArray(populated.likes) ? populated.likes : [];
    const out = {
      id: populated._id,
      author: populated.author ? { id: populated.author._id, firstName: populated.author.firstName, lastName: populated.author.lastName, avatar: populated.author.avatar } : null,
      content: populated.content,
      media: populated.media || [],
      likeCount: likesArr.length,
      isLiked: likesArr.some((l) => String(l) === uid),
      commentCount: typeof populated.commentCount === 'number' ? populated.commentCount : (Array.isArray(populated.comments) ? populated.comments.length : 0),
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
    };

    return res.json({ success: true, data: out });
  } catch (err) {
    console.error('POST /posts/:postId/like error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/posts/:postId - edit post (author only)
router.patch('/:postId', protect, async (req, res) => {
  try {
    const user = req.user
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' })
    const { postId } = req.params
    const { content } = req.body || {}
    if (!postId) return res.status(400).json({ success: false, message: 'postId required' })

    const post = await Post.findById(postId)
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' })
    if (String(post.author) !== String(user._id)) return res.status(403).json({ success: false, message: 'Forbidden' })

    if (typeof content !== 'undefined') post.content = String(content || '')
    await post.save()

    const populated = await Post.findById(post._id).populate('author', 'firstName lastName avatar').lean()
    const likesArr = Array.isArray(populated.likes) ? populated.likes : []
    const out = {
      id: populated._id,
      author: populated.author ? { id: populated.author._id, firstName: populated.author.firstName, lastName: populated.author.lastName, avatar: populated.author.avatar } : null,
      content: populated.content,
      media: populated.media || [],
      likeCount: likesArr.length,
      isLiked: false,
      commentCount: typeof populated.commentCount === 'number' ? populated.commentCount : (Array.isArray(populated.comments) ? populated.comments.length : 0),
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
    }
    return res.json({ success: true, data: out })
  } catch (err) {
    console.error('PATCH /posts/:postId error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router;

// DELETE /api/posts/:postId - mark post removed (protected, author only)
router.delete('/:postId', protect, async (req, res) => {
  try {
    const user = req.user
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' })
    const { postId } = req.params
    if (!postId) return res.status(400).json({ success: false, message: 'postId required' })

    const post = await Post.findById(postId)
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' })
    if (String(post.author) !== String(user._id)) return res.status(403).json({ success: false, message: 'Forbidden' })

    post.removed = true
    await post.save()
    return res.json({ success: true, message: 'Post removed' })
  } catch (err) {
    console.error('DELETE /posts/:postId error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})
