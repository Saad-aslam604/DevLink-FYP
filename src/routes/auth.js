const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { generateToken } = require('../utils/generateToken');

// Register a new user
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['student', 'junior', 'mentor'])
    .withMessage('Role must be one of: student, junior, mentor')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password, name, role = 'student' } = req.body;
    console.log('REGISTER ATTEMPT:', email);
    const normalizedEmail = String(email || '').toLowerCase().trim();

    // Check if user already exists (use normalized email)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Map optional 'name' into firstName/lastName if provided
    let firstName = '';
    let lastName = '';
    if (name) {
      const parts = String(name || '').split(' ').filter(Boolean);
      firstName = parts.shift() || '';
      lastName = parts.join('') || '';
    }

    // Create new user (explicitly set authMethod for clarity)
    // If the new user is a junior, ensure mentor-visibility fields are initialized so
    // they appear in the mentor list if intended. Do not overwrite existing users.
    const baseUser = {
      email: normalizedEmail,
      password,
      role,
      authMethod: 'local',
      firstName,
      lastName,
      isMentor: false,
    };

    if (role === 'junior') {
      baseUser.showInMentorList = true;
      baseUser.mentorProfile = {
        skills: [],
        hourlyRate: null,
        experienceYears: 0,
      };
    }

    const user = new User(baseUser);
    const savedUser = await user.save();
    console.log('USER SAVED:', savedUser && savedUser._id);

    // Include role in token payload to simplify role checks client/server side
    const token = generateToken(savedUser._id, savedUser.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully! Welcome to DevLink 🚀',
      data: {
        user: savedUser.getPublicProfile ? savedUser.getPublicProfile() : { id: savedUser._id, email: savedUser.email, role: savedUser.role },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    // Handle duplicate key race condition explicitly
    if (error && error.code === 11000) {
      return res.status(409).json({ success: false, message: 'User already exists with this email' });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password (matchPassword may throw if account is locked)
    let isMatch = false;
    try {
      isMatch = await user.matchPassword(password);
    } catch (matchErr) {
      // If the account is locked, return a 423 Locked with a clear message
      if (String(matchErr).toLowerCase().includes('locked')) {
        return res.status(423).json({ success: false, message: 'Account locked due to multiple failed login attempts. Try again later.' });
      }
      // otherwise rethrow to be handled by outer catch
      throw matchErr;
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful! Welcome back to DevLink 💻',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Google OAuth login / register
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'No token provided' });

    // Lazily initialize OAuth client and guard initialization errors so module load
    // doesn't crash the process if env is missing or verification lib fails.
    let client;
    try {
      client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    } catch (initErr) {
      console.error('Google OAuth client initialization failed:', initErr);
      return res.status(500).json({ success: false, message: 'Google OAuth client initialization failed' });
    }

    const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || '';
    const picture = payload.picture || '';

    // find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      // split name into first/last
      const names = (name || '').split(' ').filter(Boolean);
      const firstName = names.shift() || '';
      const lastName = names.join('') || '';

      user = new User({
        googleId,
        email,
        firstName,
        lastName,
        avatar: picture,
        authMethod: 'google',
        isVerified: true,
        role: 'student'
      });
      await user.save();
    } else {
      // ensure googleId/authMethod set
      let changed = false;
      if (!user.googleId) { user.googleId = googleId; changed = true; }
      if (user.authMethod !== 'google') { user.authMethod = 'google'; changed = true; }
      if (changed) await user.save();
    }

    const jwtToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: { id: user._id, email: user.email, role: user.role },
        token: jwtToken
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(400).json({ success: false, message: 'Google authentication failed' });
  }
});

// Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
});

// Forgot password - request reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal whether the email exists
      return res.json({ success: true, message: 'If email exists, reset instructions sent' });
    }

  const resetToken = crypto.randomBytes(32).toString('hex');
  // Hash the token before saving to DB for security
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Console-only: log reset link for manual testing (no external email service)
  // Keep logging the plain token for development/testing but store only the hashed value in DB
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    console.log('\n🔐 PASSWORD RESET LINK:');
    console.log('📧 For:', email);
    console.log('🔗 URL:', resetUrl);
    console.log('⏰ Token:', resetToken);
    console.log('⏳ Expires:', new Date(user.resetPasswordExpires).toISOString());
    console.log('----------------------------------------\n');

    res.json({
      success: true,
      message: 'If email exists, reset instructions sent',
      resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reset password using token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required' });

    // Hash the incoming token and compare to stored hashed token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Set new password (pre-save hook will hash it)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

// Token validation endpoint (helpful for debugging tokens)
// GET /api/auth/validate
router.get('/validate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided', message: 'Please provide Authorization: Bearer <token>' });
    }

    const token = authHeader.substring(7).trim();
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'devlink-secret-key');
    } catch (err) {
      if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, error: 'Invalid token', message: 'Token is malformed or invalid' });
      if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, error: 'Token expired', message: 'Token has expired. Please login again.', expiredAt: new Date(err.expiredAt).toISOString() });
      throw err;
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found', message: 'Token valid but user does not exist' });

    return res.json({ success: true, data: { tokenInfo: { id: decoded.id, iat: decoded.iat, exp: decoded.exp, expiresIn: `${Math.floor((decoded.exp * 1000 - Date.now()) / 1000)} seconds`, isValid: true }, user: { id: user._id, email: user.email, role: user.role, name: user.name } } });
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({ success: false, error: 'Validation failed', message: 'Could not validate token' });
  }
});