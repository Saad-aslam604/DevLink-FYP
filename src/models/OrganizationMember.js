const mongoose = require('mongoose');

const OrganizationMemberSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, default: 'member' },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['invited', 'active', 'removed'], default: 'invited' },
  invitedAt: { type: Date, default: Date.now },
  // joinedAt is set when a user accepts an invitation (additive field)
  joinedAt: { type: Date },
}, { timestamps: true });

OrganizationMemberSchema.index({ organization: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('OrganizationMember', OrganizationMemberSchema);
