const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: false },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    // attachments: array of File references (additive)
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    meta: { type: Object, default: {} },
  // message status for UI: 'sent' | 'delivered' | 'read'
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    // readBy tracks which users have read this message (useful for read receipts)
    readBy: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, readAt: { type: Date } }],
    // deletedFor tracks per-user soft-deletes (delete for me)
    deletedFor: {
      type: Map,
      of: Boolean,
      default: {}
    },
  // reactions: array of { emoji: String, users: [ObjectId], count: Number }
  reactions: [{ emoji: { type: String }, users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], count: { type: Number, default: 0 } }],
    // removed flag indicates the message was deleted for everyone (hard delete handled by removal)
    removed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ booking: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
