const mongoose = require('mongoose')

const MentorApplicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Application data from form
    title: { type: String },
    bio: { type: String },
    skills: [{ type: String }],
    expertise: [{ type: String }],
    requestedRate: { type: Number },
    yearsOfExperience: { type: Number },
    currentCompany: { type: String },
    githubUrl: { type: String },
    linkedinUrl: { type: String },
    portfolioUrl: { type: String },

    // Status tracking
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    // Admin fields
    approvedRate: { type: Number },
    rejectionReason: { type: String },
    adminNotes: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },

    // Submission timestamp (mirrors createdAt)
    submittedAt: { type: Date, default: Date.now },
    // Heuristic score computed by server or AI for ranking/recommendation
    applicationScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
)

module.exports = mongoose.model('MentorApplication', MentorApplicationSchema)
