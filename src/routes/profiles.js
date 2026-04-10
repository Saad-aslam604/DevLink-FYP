const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const User = require('../models/User');
const Booking = require('../models/Booking');
const MentorApplication = require('../models/MentorApplication');
const Portfolio = require('../models/Portfolio');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const multer = require('multer')
const fs = require('fs')
const path = require('path')

// ensure uploads directory exists
// Use the project-root uploads folder so uploaded files are served by the main static middleware
// __dirname is src/routes -> go up two levels to reach project root
const uploadsBase = path.join(__dirname, '..', '..', 'uploads')
const avatarsDir = path.join(uploadsBase, 'avatars')
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir)
  },
  filename: function (req, file, cb) {
    const ext = (file.originalname && file.originalname.split('.').pop()) || 'webp'
    const uid = req.user && (req.user._id || req.user.id) ? String(req.user._id || req.user.id) : String(Date.now())
    cb(null, `${uid}-${Date.now()}.${ext}`)
  }
})
const upload = multer({ storage })

// Helper to build public-safe profile
function publicProfile(user) {
  if (!user) return null;
  // If it's a Mongoose document, use toObject to detach
  const u = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  // Remove sensitive/internal fields
  delete u.password;
  delete u.loginAttempts;
  delete u.lockUntil;
  delete u.__v;
  return u;
}

// GET /api/profiles/me - protected
router.get('/me', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    // Compute number of unique other users this user has bookings with (connections)
    try {
      const userId = user._id;
      // distinct mentors where this user is the student
      const mentors = await Booking.distinct('mentor', { student: userId });
      // distinct students where this user is the mentor
      const students = await Booking.distinct('student', { mentor: userId });
      const set = new Set([...(mentors || []).map(String), ...(students || []).map(String)]);
      // remove own id if present
      set.delete(String(userId));
      const connections = set.size;

      return res.json({ success: true, data: { profile: publicProfile(user), connections } });
    } catch (innerErr) {
      // If booking lookup fails, still return profile with fallback connections = 0
      console.warn('Failed to calculate connections for user', user && user._id, innerErr);
      return res.json({ success: true, data: { profile: publicProfile(user), connections: 0 } });
    }
  } catch (err) {
    console.error('GET /profiles/me error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Avatar upload endpoint - accepts multipart/form-data with field 'avatar'
router.post('/me/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })
    const user = req.user
    const filename = req.file.filename
    user.avatar = `/uploads/avatars/${filename}`
    user.lastActive = new Date()
    await user.save()

    return res.json({ success: true, message: 'Avatar uploaded', data: { profile: publicProfile(user) } })
  } catch (err) {
    console.error('Avatar upload error:', err)
    return res.status(500).json({ success: false, message: 'Server error uploading avatar' })
  }
})

// PUT /api/profiles/me - protected (update profile)
router.put(
  '/me',
  protect,
  [
    body('firstName').optional().isString().trim().isLength({ max: 100 }),
    body('lastName').optional().isString().trim().isLength({ max: 100 }),
  // Accept avatar as either a full URL or a server-side upload path (e.g. '/uploads/avatars/xxx')
  // Many clients will POST a file to /me/avatar which returns a relative path, so
  // require avatar to be an optional string instead of enforcing isURL() here.
  body('avatar').optional().isString().trim().withMessage('avatar must be a string or upload path'),
    body('bio').optional().isString().isLength({ max: 2000 }),
    body('location').optional().isString(),
    body('timezone').optional().isString(),
    body('title').optional().isString(),
    body('company').optional().isString(),
    body('experienceLevel').optional().isString(),
    body('hourlyRate').optional().isFloat({ min: 0 }),
    body('skills').optional().isArray().withMessage('skills must be an array of strings'),
    body('githubUrl').optional().isURL(),
    body('linkedinUrl').optional().isURL(),
    body('portfolioUrl').optional().isURL(),
    body('twitterUrl').optional().isURL(),
    body('education').optional().isArray(),
    body('certifications').optional().isArray(),
    body('availabilitySlots').optional().isArray(),
    body('isAvailable').optional().isBoolean(),
    body('theme').optional().isString().isIn(['light', 'dark']),
    body('emailVisible').optional().isBoolean(),
    body('profileVisibility').optional().isString().isIn(['public', 'mentors', 'private']),
    body('allowAnalytics').optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      // List of safe fields to update
      const updatable = [
        'firstName',
        'lastName',
        'avatar',
        'bio',
        'location',
        'timezone',
        'title',
        'company',
        'experienceLevel',
        'hourlyRate',
        'skills',
        'githubUrl',
        'linkedinUrl',
        'portfolioUrl',
        'twitterUrl',
        'education',
        'certifications',
        'availabilitySlots',
        'isAvailable',
        'mentorBio',
        'expertiseAreas',
        'theme',
        'emailVisible',
        'profileVisibility',
        'allowAnalytics',
      ];

      // Build patch directly from incoming body to avoid depending on req.user being fully hydrated
      const patch = {};
      updatable.forEach((field) => {
        if (req.body[field] === undefined) return;
        const val = req.body[field];
        // Normalize arrays: accept arrays, comma-separated strings, or single values
        if (Array.isArray(val)) {
          patch[field] = val;
        } else if (typeof val === 'string' && val.includes(',')) {
          patch[field] = val.split(',').map((s) => s.trim()).filter(Boolean);
        } else {
          patch[field] = val;
        }
      });

      // parse/normalize a few common typed fields
      if (patch.hourlyRate !== undefined) {
        const parsed = parseFloat(patch.hourlyRate);
        patch.hourlyRate = Number.isFinite(parsed) ? parsed : patch.hourlyRate;
      }

      // Defensive: do not persist client-side blob: URLs (these are temporary and cannot be served from the server)
      if (typeof patch.avatar === 'string' && patch.avatar.startsWith('blob:')) {
        console.warn('PUT /profiles/me - client sent blob: URL for avatar; ignoring value to avoid persisting temporary URL')
        delete patch.avatar
      }

      if (req.body.profileCompleted !== undefined) patch.profileCompleted = !!req.body.profileCompleted;
      patch.lastActive = new Date();

      // Debug log for development to trace what will be saved
      console.log('PUT /profiles/me - db patch:', JSON.stringify(patch));

      const updated = await User.findByIdAndUpdate(user._id, { $set: patch }, { new: true }).exec();
      if (!updated) {
        console.error('PUT /profiles/me - findByIdAndUpdate returned null for id', user._id);
        return res.status(500).json({ success: false, message: 'Failed to update profile' });
      }

      // Return the public-safe profile to the client
      return res.json({ success: true, message: 'Profile updated', data: { profile: publicProfile(updated) } });
    } catch (err) {
      console.error('PUT /profiles/me error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /api/profiles/:userId - protected, allow only if editing own profile
router.put(
  '/:userId',
  protect,
  [
    body('firstName').optional().isString().trim().isLength({ max: 100 }),
    body('lastName').optional().isString().trim().isLength({ max: 100 }),
    body('avatar').optional().isString().trim().withMessage('avatar must be a string or upload path'),
    body('bio').optional().isString().isLength({ max: 2000 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { userId } = req.params;
      if (String(user._id || user.id) !== String(userId)) {
        return res.status(403).json({ success: false, message: 'You can only edit your own profile' });
      }

      // reuse the same updatable list as /me
      const updatable = [
        'firstName',
        'lastName',
        'avatar',
        'bio',
        'location',
        'timezone',
        'title',
        'company',
        'experienceLevel',
        'hourlyRate',
        'skills',
        'githubUrl',
        'linkedinUrl',
        'portfolioUrl',
        'twitterUrl',
        'education',
        'certifications',
        'availabilitySlots',
        'isAvailable',
        'mentorBio',
        'expertiseAreas',
      ];

      const patch = {};
      updatable.forEach((field) => {
        if (req.body[field] === undefined) return;
        const val = req.body[field];
        if (Array.isArray(val)) patch[field] = val;
        else if (typeof val === 'string' && val.includes(',')) patch[field] = val.split(',').map((s) => s.trim()).filter(Boolean);
        else patch[field] = val;
      });

      if (patch.hourlyRate !== undefined) {
        const parsed = parseFloat(patch.hourlyRate);
        patch.hourlyRate = Number.isFinite(parsed) ? parsed : patch.hourlyRate;
      }

      if (typeof patch.avatar === 'string' && patch.avatar.startsWith('blob:')) {
        delete patch.avatar
      }

      if (req.body.profileCompleted !== undefined) patch.profileCompleted = !!req.body.profileCompleted;
      patch.lastActive = new Date();

      const updated = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true }).exec();
      if (!updated) return res.status(500).json({ success: false, message: 'Failed to update profile' });
      return res.json({ success: true, message: 'Profile updated', data: { profile: publicProfile(updated) } });
    } catch (err) {
      console.error('PUT /profiles/:userId error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/profiles/:userId - public view of a profile
// NOTE: place more specific routes (like /mentors) before the generic '/:userId' route

// GET /api/profiles/mentors - search mentors
router.get(
  '/mentors',
  [
    query('skills').optional().isString(),
    query('availabilityDay').optional().isString(),
    query('hourlyMin').optional().isFloat({ min: 0 }),
    query('hourlyMax').optional().isFloat({ min: 0 }),
    query('experienceLevel').optional().isString(),
    query('ratingMin').optional().isFloat({ min: 0 }),
    query('page').optional().toInt(),
    query('limit').optional().toInt(),
    query('sort').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        skills,
        availabilityDay,
        hourlyMin,
        hourlyMax,
        experienceLevel,
        ratingMin,
  page = 1,
  limit = 20,
  // sort by rating desc, then lastActive desc so recently-active mentors appear earlier
  sort = '-rating,-lastActive',
      } = req.query;

  // Mentor discovery should include:
  // - Users explicitly flagged as mentors (isMentor === true)
  // - Users with role === 'mentor'
  // - Users with verification flag isMentorVerified === true
  // - Juniors who opted into being shown (role === 'junior' AND showInMentorList === true)
  // Always require the account to be active.
  const filter = {
    isActive: true,
    $or: [
      { isMentor: true },
      { role: 'mentor' },
      { isMentorVerified: true },
      { $and: [{ role: 'junior' }, { showInMentorList: true }] },
    ],
  };
      // Optional filter: profileCompleted flag (allow clients to request only completed profiles)
      if (req.query.profileCompleted !== undefined) {
        filter.profileCompleted = req.query.profileCompleted === 'true';
      }
      // Debug: log the final Mongo filter used for mentor lookup
      console.debug('GET /profiles/mentors filter=', JSON.stringify(filter));
      if (skills) {
        const arr = skills.split(',').map((s) => s.trim()).filter(Boolean);
        if (arr.length) filter.skills = { $in: arr };
      }
      if (experienceLevel) filter.experienceLevel = experienceLevel;
      if (ratingMin) filter.rating = { $gte: parseFloat(ratingMin) };
      if (hourlyMin || hourlyMax) {
        filter.hourlyRate = {};
        if (hourlyMin) filter.hourlyRate.$gte = parseFloat(hourlyMin);
        if (hourlyMax) filter.hourlyRate.$lte = parseFloat(hourlyMax);
      }
      if (availabilityDay) {
        filter['availabilitySlots.day'] = availabilityDay;
      }

      const sortObj = {};
      sort.split(',').forEach((s) => {
        s = s.trim();
        if (!s) return;
        if (s.startsWith('-')) sortObj[s.substring(1)] = -1;
        else sortObj[s] = 1;
      });

      const p = Math.max(parseInt(page, 10) || 1, 1);
      const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

      const total = await User.countDocuments(filter);
      const results = await User.find(filter)
        .sort(sortObj)
        .skip((p - 1) * l)
        .limit(l)
        .exec();
      const publicResults = results.map((u) => publicProfile(u));
      // Debug: show how many mentors returned in this page
      console.debug(`GET /profiles/mentors -> total=${total} page=${p} limit=${l} returned=${publicResults.length}`);
      return res.json({
        success: true,
        data: {
          total,
          page: p,
          limit: l,
          results: publicResults,
        },
      });
    } catch (err) {
      console.error('GET /profiles/mentors error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Portfolio endpoints - MUST come before /:userId catch-all route

// GET /api/profiles/portfolio - get user's portfolio items
router.get('/portfolio', protect, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const userId = req.user._id;
    const items = await Portfolio.find({ userId }).sort({ createdAt: -1 });
    
    return res.json({ success: true, data: { items } });
  } catch (err) {
    console.error('GET /profiles/portfolio error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/profiles/portfolio - add portfolio item
router.post(
  '/portfolio',
  protect,
  [
    body('title').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Title is required'),
    body('description').optional().isString().trim().isLength({ max: 2000 }),
    body('link').optional().isString().trim().isLength({ max: 500 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { title, description = '', link = '' } = req.body;

      const item = new Portfolio({
        userId,
        title,
        description,
        link,
      });

      await item.save();

      return res.status(201).json({
        success: true,
        message: 'Portfolio item added',
        data: { item },
      });
    } catch (err) {
      console.error('POST /profiles/portfolio error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /api/profiles/portfolio/:id - delete portfolio item
router.delete('/portfolio/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const itemId = req.params.id;

    const item = await Portfolio.findOne({ _id: itemId, userId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    }

    await Portfolio.deleteOne({ _id: itemId });

    return res.json({
      success: true,
      message: 'Portfolio item deleted',
    });
  } catch (err) {
    console.error('DELETE /profiles/portfolio/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/profiles/portfolio/:id - update portfolio item
router.put(
  '/portfolio/:id',
  protect,
  [
    body('title').optional().isString().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().isString().trim().isLength({ max: 2000 }),
    body('link').optional().isString().trim().isLength({ max: 500 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const itemId = req.params.id;
      const { title, description, link } = req.body;

      const item = await Portfolio.findOne({ _id: itemId, userId });
      if (!item) {
        return res.status(404).json({ success: false, message: 'Portfolio item not found' });
      }

      if (title !== undefined) item.title = title;
      if (description !== undefined) item.description = description;
      if (link !== undefined) item.link = link;

      await item.save();

      return res.json({
        success: true,
        message: 'Portfolio item updated',
        data: { item },
      });
    } catch (err) {
      console.error('PUT /profiles/portfolio/:id error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/profiles/:userId - public view of a profile
router.get(
  '/:userId',
  [param('userId').isMongoId().withMessage('Invalid userId')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: 'Profile not found' });
      return res.json({ success: true, data: { profile: publicProfile(user) } });
    } catch (err) {
      console.error('GET /profiles/:userId error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/profiles/mentors - search mentors
router.get(
  '/mentors',
  [
    query('skills').optional().isString(),
    query('availabilityDay').optional().isString(),
    query('hourlyMin').optional().isFloat({ min: 0 }),
    query('hourlyMax').optional().isFloat({ min: 0 }),
    query('experienceLevel').optional().isString(),
    query('ratingMin').optional().isFloat({ min: 0 }),
    query('page').optional().toInt(),
    query('limit').optional().toInt(),
    query('sort').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        skills,
        availabilityDay,
        hourlyMin,
        hourlyMax,
        experienceLevel,
        ratingMin,
  page = 1,
  limit = 20,
  // sort by rating desc, then lastActive desc so recently-active mentors appear earlier
  sort = '-rating,-lastActive',
      } = req.query;

  // Simplify mentor discovery to include either isMentor:true or role indicating mentor.
  const filter = { isActive: true, $or: [{ isMentor: true }, { role: 'mentor' }, { isMentorVerified: true }] };
      if (req.query.profileCompleted !== undefined) {
        filter.profileCompleted = req.query.profileCompleted === 'true';
      }
      // Debug: log the final Mongo filter used for mentor lookup
      console.debug('GET /profiles/mentors filter=', JSON.stringify(filter));
      if (skills) {
        const arr = skills.split(',').map((s) => s.trim()).filter(Boolean);
        if (arr.length) filter.skills = { $in: arr };
      }
      if (experienceLevel) filter.experienceLevel = experienceLevel;
      if (ratingMin) filter.rating = { $gte: parseFloat(ratingMin) };
      if (hourlyMin || hourlyMax) {
        filter.hourlyRate = {};
        if (hourlyMin) filter.hourlyRate.$gte = parseFloat(hourlyMin);
        if (hourlyMax) filter.hourlyRate.$lte = parseFloat(hourlyMax);
      }
      if (availabilityDay) {
        // match subdocument day in availabilitySlots
        filter['availabilitySlots.day'] = availabilityDay;
      }

      // Build sort object from comma-separated list
      const sortObj = {};
      sort.split(',').forEach((s) => {
        s = s.trim();
        if (!s) return;
        if (s.startsWith('-')) sortObj[s.substring(1)] = -1;
        else sortObj[s] = 1;
      });

      const p = Math.max(parseInt(page, 10) || 1, 1);
      const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

      const total = await User.countDocuments(filter);
      const results = await User.find(filter)
        .sort(sortObj)
        .skip((p - 1) * l)
        .limit(l)
        .exec();

      return res.json({
        success: true,
        data: {
          total,
          page: p,
          limit: l,
          results: results.map((u) => publicProfile(u)),
        },
      });
    } catch (err) {
      console.error('GET /profiles/mentors error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// POST /api/profiles/become-mentor - apply to become mentor (protected)
router.post(
  '/become-mentor',
  protect,
  [
    body('mentorBio').optional().isString().isLength({ max: 2000 }),
    body('expertiseAreas').optional().isArray(),
    body('title').optional().isString(),
    body('hourlyRate').optional().isFloat({ min: 0 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      // If user already has mentor role or is flagged as mentor, reject
      if (user.role === 'mentor' || user.isMentor) {
        return res.status(400).json({ success: false, message: 'User is already a mentor' });
      }

      console.log('🔍 BECOME-MENTOR REQUEST BODY:', req.body);
      console.log('👤 USER ID FROM AUTH:', user && (user._id || user.id));

      // Prevent duplicate pending applications
      const existing = await MentorApplication.findOne({ userId: user._id, status: 'pending' }).exec();
      if (existing) {
        return res.status(400).json({ success: false, message: 'You already have a pending application. Please wait for admin review.' });
      }

      // Extract and validate form fields
      const {
        title = '',
        bio: bioBody = '',
        mentorBio = '',
        skills = '',
        expertise = '',
        expertiseAreas = '',
        hourlyRate = 0,
        yearsOfExperience = 0,
        currentCompany = '',
        company = '',
        githubUrl = '',
        linkedinUrl = '',
        portfolioUrl = '',
        whyMentor = '',
      } = req.body || {};

      // Accept both `bio` and legacy `mentorBio`; accept `expertiseAreas` from frontend and `company`
      const bio = (bioBody && String(bioBody).trim()) ? bioBody : mentorBio;
      const expertiseVal = (expertise && expertise.length) ? expertise : expertiseAreas;
      const currentCompanyVal = (currentCompany && String(currentCompany).trim()) ? currentCompany : company;

      if (!title || !String(title).trim() || !bio || !String(bio).trim() || !skills || (Array.isArray(skills) ? skills.length === 0 : !String(skills).trim())) {
        return res.status(400).json({ success: false, message: 'Title, bio, and skills are required fields.' });
      }

      const skillsArray = Array.isArray(skills) ? skills : String(skills).split(',').map((s) => s.trim()).filter(Boolean);
      const expertiseArray = Array.isArray(expertiseVal) ? expertiseVal : String(expertiseVal).split(',').map((s) => s.trim()).filter(Boolean);

      const app = new MentorApplication({
        userId: user._id,
        title: String(title).trim(),
        bio: String(bio).trim(),
        skills: skillsArray,
        expertise: expertiseArray,
        requestedRate: parseFloat(hourlyRate) || 0,
        yearsOfExperience: parseInt(yearsOfExperience, 10) || 0,
        currentCompany: String(currentCompanyVal).trim(),
        githubUrl: String(githubUrl).trim(),
        linkedinUrl: String(linkedinUrl).trim(),
        portfolioUrl: String(portfolioUrl).trim(),
        whyMentor: String(whyMentor).trim(),
        status: 'pending',
        submittedAt: new Date(),
      });

      await app.save();

      // Optionally attach metadata to user for quick lookup (non-destructive)
      try {
        user.lastMentorApplicationId = app._id;
        user.lastMentorApplicationDate = new Date();
        await user.save();
      } catch (uErr) {
        console.warn('Failed to update user with application meta', uErr);
      }

      return res.status(201).json({
        success: true,
        message: 'Mentor application submitted successfully! Admin will review within 48 hours.',
        applicationId: app._id,
        data: { title: app.title, status: app.status, submittedAt: app.submittedAt },
      });
    } catch (err) {
      console.error('POST /profiles/become-mentor error:', err);
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors || {}).map((e) => e.message);
        return res.status(400).json({ success: false, message: 'Validation failed', details: messages });
      }
      if (err.code === 11000) {
        return res.status(400).json({ success: false, message: 'Duplicate application detected' });
      }
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/profiles/blocked-users - protected (fetch list of blocked users)
router.get('/blocked-users', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const blockedUsers = await User.find({ _id: { $in: user.blockedUsers } })
      .select('_id firstName lastName avatar email title')
      .exec();

    return res.json({ success: true, data: { blockedUsers } });
  } catch (err) {
    console.error('GET /blocked-users error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/profiles/unblock/:userId - protected (unblock a user)
router.post('/unblock/:userId', protect, async (req, res) => {
  try {
    const user = req.user;
    const userIdToUnblock = req.params.userId;
    
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!userIdToUnblock) return res.status(400).json({ success: false, message: 'User ID required' });

    const updated = await User.findByIdAndUpdate(
      user._id,
      { $pull: { blockedUsers: userIdToUnblock } },
      { new: true }
    ).exec();

    return res.json({ success: true, message: 'User unblocked', data: { user: publicProfile(updated) } });
  } catch (err) {
    console.error('POST /unblock error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
