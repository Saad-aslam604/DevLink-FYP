const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: false },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: false },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  reason: { type: String, default: '' },
  details: { type: String, default: '' },
  status: { type: String, enum: ['open', 'reviewed', 'dismissed', 'actioned'], default: 'open' },
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
