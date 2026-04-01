const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    skillsRequired: [{ type: String }],
    budget: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    deadline: { type: Date },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Optional link to an Organization account (user.userType === 'organization')
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    status: { type: String, enum: ['draft', 'open', 'in-progress', 'completed', 'cancelled'], default: 'open' },
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    applicants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: { type: String },
        appliedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

ProjectSchema.index({ postedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Project', ProjectSchema);
