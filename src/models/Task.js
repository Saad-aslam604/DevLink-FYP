const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['todo', 'in-progress', 'review', 'completed'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  deadline: { type: Date },
  // progress percentage (0-100)
  progress: { type: Number, default: 0 },
  estimatedHours: { type: Number, default: 0 },
  actualHours: { type: Number, default: 0 },
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: { type: String },
      createdAt: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true });

TaskSchema.index({ project: 1, status: 1 });

module.exports = mongoose.model('Task', TaskSchema);
