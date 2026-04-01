const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const PostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    media: [{ type: String }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [CommentSchema],
      commentCount: { type: Number, default: 0 },
    meta: { type: Object, default: {} },
    removed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PostSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', PostSchema);
