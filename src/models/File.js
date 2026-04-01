const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true }, // stored filename on disk
    originalName: { type: String, required: true }, // original uploaded name
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true }, // relative path under /uploads
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    metadata: {
      // allow linking to entities: { entityType: 'profile'|'project'|'session'|'post', entityId: '...' }
      entityType: { type: String, default: '' },
      entityId: { type: String, default: '' },
      description: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

FileSchema.index({ uploadedBy: 1 });
FileSchema.index({ 'metadata.entityType': 1, 'metadata.entityId': 1 });

module.exports = mongoose.model('File', FileSchema);
