const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload, uploadsDir } = require('../middleware/upload');
const File = require('../models/File');

// POST /api/uploads/upload - single file upload
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      // Multer should have rejected invalid files; provide clearer message
      return res.status(400).json({ success: false, message: 'No file was uploaded. Check file type and size (max 10MB).' });
    }

    let meta = {}
    try { meta = req.body.metadata ? JSON.parse(String(req.body.metadata)) : {} } catch (e) { return res.status(400).json({ success: false, message: 'Invalid metadata JSON' }) }

    let fileDoc
    try {
      fileDoc = await File.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: `/uploads/${req.file.filename}`,
        uploadedBy: req.user._id,
        metadata: meta,
      });
    } catch (err) {
      console.error('File DB create error:', err && err.message ? err.message : err);
      if (err && err.code === 'ENOSPC') {
        // Disk full
        return res.status(507).json({ success: false, message: 'Server storage full. Upload failed.' });
      }
      return res.status(500).json({ success: false, message: 'Failed to save file metadata' });
    }

    return res.json({ success: true, data: { file: fileDoc } });
  } catch (err) {
    console.error('Upload error:', err);
    // Handle disk full errors from multer or other system-level writes
    if (err && err.code === 'ENOSPC') return res.status(507).json({ success: false, message: 'Server storage full. Upload failed.' })
    return res.status(500).json({ success: false, message: err && err.message ? err.message : 'Upload failed' });
  }
});

// GET /api/uploads/files/user/:userId - list files for a user
router.get('/files/user/:userId', protect, async (req, res) => {
  try {
    const userId = req.params.userId;
    // allow users to list their own files, admins can list any (use authorize elsewhere if needed)
    if (String(req.user._id) !== String(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const files = await File.find({ uploadedBy: userId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: { files } });
  } catch (err) {
    console.error('List files error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list files' });
  }
});

// GET /api/uploads/files/:fileId - metadata
router.get('/files/:fileId', protect, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    // allow owner or admin
    if (String(file.uploadedBy) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized' });
    return res.json({ success: true, data: { file } });
  } catch (err) {
    console.error('Get file metadata error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch file metadata' });
  }
});

// DELETE /api/uploads/files/:fileId - delete file (owner only)
router.delete('/files/:fileId', protect, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    if (String(file.uploadedBy) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized' });

    // remove from disk
    // compute file path relative to src/uploads
    const diskPath = path.join(__dirname, '..', 'uploads', file.filename || file.filename)
    try {
      if (fs.existsSync(diskPath)) {
        try {
          fs.unlinkSync(diskPath)
        } catch (e) {
          console.warn('Failed to delete file from disk:', diskPath, e && e.message ? e.message : e)
        }
      } else {
        console.warn('File missing on disk during delete:', diskPath)
      }
    } catch (e) {
      console.warn('Error checking file existence:', e && e.message ? e.message : e)
    }

      try {
        await file.deleteOne();
      } catch (e) {
        console.error('Failed to remove file doc from DB:', e && e.message ? e.message : e)
        return res.status(500).json({ success: false, message: 'Failed to remove file record' })
      }

      return res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    console.error('Delete file error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

  // POST /api/uploads/set-profile-picture/:fileId - sets the user's profilePicture to the given file (owner only)
  router.post('/set-profile-picture/:fileId', protect, async (req, res) => {
    try {
      const file = await File.findById(req.params.fileId);
      if (!file) return res.status(404).json({ success: false, message: 'File not found' });
      if (String(file.uploadedBy) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized to set this file as profile picture' });

      const User = require('../models/User')
      try {
        req.user.profilePicture = file._id
        await req.user.save()
      } catch (e) {
        console.error('Failed to update user profilePicture:', e && e.message ? e.message : e)
        return res.status(500).json({ success: false, message: 'Failed to set profile picture' })
      }

      // return updated user (safe fields as per User model transform)
      const updated = await User.findById(req.user._id).select('-password')
      return res.json({ success: true, data: { user: updated } })
    } catch (err) {
      console.error('Set profile picture error:', err)
      return res.status(500).json({ success: false, message: 'Failed to set profile picture' })
    }
  })

module.exports = router;
