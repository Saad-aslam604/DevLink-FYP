const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return emailRegex.test(v);
        },
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    password: {
      type: String,
      required: false,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      // New role system: student, junior, senior, admin
      enum: ['student', 'junior', 'mentor', 'admin'],
      default: 'student',
    },
    // Google OAuth
    googleId: { type: String, default: '' },
    authMethod: { type: String, enum: ['local', 'google'], default: 'local' },
    // Personal profile
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    location: { type: String, default: '' },
    timezone: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    lastActive: {
      type: Date,
    },
    // Conversation preferences
    // IDs of bookings/conversations the user has muted (list of booking ids)
    mutedConversations: { type: [String], default: [] },
    // IDs of bookings/conversations the user has archived (hidden from main list)
    archivedConversations: { type: [String], default: [] },
    // Users that this user has blocked (prevent future messages)
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // For mentors - track verification status
    isMentorVerified: {
      type: Boolean,
      default: false,
    },
    // Legacy boolean flag used in some parts of the codebase / older records
    isMentor: { type: Boolean, default: false },
    // Whether to show juniors in the public mentor list. New juniors should default to true so
    // juniors who opt-in are discoverable like legacy records that had mentor flags.
    showInMentorList: { type: Boolean, default: true },
    // Structured mentor profile for junior users that may become mentors. Keep defaults minimal.
    mentorProfile: {
      skills: { type: [String], default: [] },
      hourlyRate: { type: Number, default: null },
      experienceYears: { type: Number, default: 0 },
    },
    mentorBio: { type: String, default: '' },
    expertiseAreas: { type: [String], default: [] },
    rating: { type: Number, default: 0 },
    sessionsCompleted: { type: Number, default: 0 },
    // Profile completion tracking
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    // Professional
    title: { type: String, default: '' },
    company: { type: String, default: '' },
    experienceLevel: { type: String, default: '' },
    hourlyRate: { type: Number, default: 0 },
    skills: { type: [String], default: [] },
    // Social links
    githubUrl: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },
    portfolioUrl: { type: String, default: '' },
    twitterUrl: { type: String, default: '' },
  // Reference to profile picture File document (additive only)
  profilePicture: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null },
    // Education and certifications
    education: {
      type: [
        {
          degree: { type: String, default: '' },
          university: { type: String, default: '' },
          graduationYear: { type: Number },
        },
      ],
      default: [],
    },
    certifications: { type: [String], default: [] },
    // Availability slots (array of objects)
    availabilitySlots: {
      type: [
        {
          day: { type: String, default: '' },
          startTime: { type: String, default: '' },
          endTime: { type: String, default: '' },
        },
      ],
      default: [],
    },
    // Track login attempts for security
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    // Password reset
    resetPasswordToken: { type: String, default: '' },
    resetPasswordExpires: { type: Date },
    // New: userType and organization details (additive - safe defaults)
    // userType: distinguishes individual accounts from organization accounts
    userType: {
      type: String,
      enum: ['individual', 'organization'],
      default: 'individual',
    },
    // organizationDetails stores optional metadata for organization accounts
    organizationDetails: {
      name: { type: String, default: '' },
      website: { type: String, default: '' },
      address: { type: String, default: '' },
      contactName: { type: String, default: '' },
      contactEmail: { type: String, default: '' },
      description: { type: String, default: '' },
    },
    // User preferences
    theme: { type: String, default: 'light', enum: ['light', 'dark'] },
    emailVisible: { type: Boolean, default: true },
    profileVisibility: { type: String, default: 'public', enum: ['public', 'mentors', 'private'] },
    allowAnalytics: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // remove sensitive/internal fields
        delete ret.password;
        delete ret.__v;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        // Optionally remove any internal flags
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
  }
);

// Virtual for checking if account is locked
UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// Compare provided password with stored hash
UserSchema.methods.matchPassword = async function (enteredPassword) {
  // If account is locked, don't allow login
  if (this.isLocked) {
    throw new Error('Account is temporarily locked due to too many failed login attempts');
  }
  
  const isMatch = await bcrypt.compare(enteredPassword, this.password);
  
  if (isMatch) {
    // Reset login attempts on successful login
    if (this.loginAttempts > 0) {
      this.loginAttempts = 0;
      this.lockUntil = undefined;
      await this.save();
    }
    return true;
  } else {
    // Increment failed login attempts
    await this.incLoginAttempts();
    return false;
  }
};

// Method to increment login attempts and lock account if needed
UserSchema.methods.incLoginAttempts = async function () {
  // If we have a previous lock that has expired, restart count
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Otherwise increment
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock the account if we've reached max attempts and it's not already locked
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return await this.updateOne(updates);
};

// Static method to find user by email for login
UserSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

// Method to get public profile (safe data)
UserSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  return userObject;
};

// Index for better query performance
// Virtual for full name (convenience compatibility with some clients)
UserSchema.virtual('name').get(function () {
  const f = this.firstName || '';
  const l = this.lastName || '';
  return (f + ' ' + l).trim();
});

// Virtual: displayRole - friendly label for UI (display-only)
UserSchema.virtual('displayRole').get(function () {
  // If account is an organization, show Organization
  if (this.userType === 'organization') return 'Organization';
  // Map internal role values to friendly display strings (display-only)
  if (this.role === 'mentor') return 'Senior Developer';
  if (this.role === 'junior') return 'Junior Developer';
  if (this.role === 'student') return 'Student';
  if (this.role === 'admin') return 'Admin';
  return this.role || 'Member';
});

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ isMentorVerified: 1 });
UserSchema.index({ 'skills': 1 });
UserSchema.index({ 'expertiseAreas': 1 });
UserSchema.index({ lastActive: -1 });

module.exports = mongoose.model('User', UserSchema);
