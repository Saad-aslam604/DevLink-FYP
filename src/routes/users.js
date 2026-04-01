const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// POST /api/users/register-organization
// Protected endpoint that converts the authenticated user to an organization account
router.post('/register-organization', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Accept organizationDetails in the body; keep this additive and non-destructive
    const details = req.body.organizationDetails || {};

    // Minimal validation: require a name and contactEmail
    if (!details.name || !details.contactEmail) {
      return res.status(400).json({ success: false, message: 'organizationDetails.name and organizationDetails.contactEmail are required' });
    }

    const patch = {
      userType: 'organization',
      organizationDetails: {
        name: String(details.name || '').trim(),
        website: details.website ? String(details.website).trim() : '',
        address: details.address ? String(details.address).trim() : '',
        contactName: details.contactName ? String(details.contactName).trim() : '',
        contactEmail: String(details.contactEmail || '').trim(),
        description: details.description ? String(details.description).trim() : '',
      },
      lastActive: new Date(),
    };

    const updated = await User.findByIdAndUpdate(user._id, { $set: patch }, { new: true }).exec();
    if (!updated) return res.status(500).json({ success: false, message: 'Failed to update user' });

    // Return public-safe profile
    const out = updated.toObject();
    delete out.password; delete out.__v; delete out.loginAttempts; delete out.lockUntil;
    return res.json({ success: true, message: 'Organization registered', data: { profile: out } });
  } catch (err) {
    console.error('POST /users/register-organization error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/:id - return public user profile information
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    const u = await User.findById(id).select('firstName lastName avatar role isMentor title bio skills').lean();
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });
    const out = {
      id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      avatar: u.avatar,
      role: u.role,
      isMentor: u.isMentor,
      title: u.title || null,
      bio: u.bio || null,
      skills: u.skills || [],
    };
    return res.json({ success: true, data: out });
  } catch (err) {
    console.error('GET /users/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
