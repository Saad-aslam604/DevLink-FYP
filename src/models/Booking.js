const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // startTime / endTime are optional - some clients may send date/time/duration instead.
  // We'll accept either ISO datetimes or compute from provided date/time/duration server-side.
  startTime: { type: Date, required: false },
  endTime: { type: Date, required: false },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    // When the meeting was actually started (used to mark active sessions)
    startedAt: { type: Date, default: null },
    price: { type: Number, default: 0 },
    timezone: { type: String, default: '' },
    notes: { type: String, default: '' },
    // lastMessageAt helps sort conversations by activity
    lastMessageAt: { type: Date, default: null },
    // unreadCount is a map of userId -> number of unread messages for that user
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    },
  },
  {
    timestamps: true,
  }
);

// Index to speed conflict queries by mentor and time ranges
BookingSchema.index({ mentor: 1, startTime: 1, endTime: 1 });
BookingSchema.index({ student: 1, startTime: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
