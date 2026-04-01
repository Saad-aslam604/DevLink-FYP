const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['tool', 'subscription', 'documentation', 'hardware', 'budget'], default: 'tool' },
  allocatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quantity: { type: Number, default: 1 },
  cost: { type: Number, default: 0 },
  description: { type: String, default: '' },
  status: { type: String, enum: ['available', 'allocated', 'depleted', 'maintenance'], default: 'available' },
}, { timestamps: true });

ResourceSchema.index({ allocatedTo: 1, status: 1 });

module.exports = mongoose.model('Resource', ResourceSchema);
