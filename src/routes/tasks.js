const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { protect } = require('../middleware/auth');
const Task = require('../models/Task');

// GET /api/tasks/assigned-to-me - list tasks assigned to current user
router.get('/assigned-to-me', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const tasks = await Task.find({ assignedTo: user._id }).populate('project').populate('assignedBy', 'firstName lastName avatar').populate('assignedTo', 'firstName lastName email').lean();
    return res.json({ success: true, data: tasks });
  } catch (err) {
    console.error('GET /tasks/assigned-to-me error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/tasks/:id/progress - update task progress (0-100)
router.patch('/:id/progress', protect, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { progress } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    if (progress === undefined || progress === null) return res.status(400).json({ success: false, message: 'progress required' });
    const p = Number(progress);
    if (isNaN(p) || p < 0 || p > 100) return res.status(400).json({ success: false, message: 'progress must be 0-100' });
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    // only allow assigned users, assignedBy, project owner, org admin or admin to update
    const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.some(a => String(a) === String(user._id));
    const isAssignedBy = task.assignedBy && String(task.assignedBy) === String(user._id);
    // allow admin users
    if (!(isAssigned || isAssignedBy || user.role === 'admin')) return res.status(403).json({ success: false, message: 'Not authorized' });
    task.progress = p;
    // optionally update status from progress
    if (p >= 100) task.status = 'completed';
    else if (p > 0 && task.status === 'todo') task.status = 'in-progress';
    await task.save();
    return res.json({ success: true, data: task });
  } catch (err) {
    console.error('PATCH /tasks/:id/progress error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/tasks/:id - delete a task (assigned, creator, or admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // allow deletion by assigned user, assignedBy (creator), admin
    const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.some(a => String(a) === String(user._id));
    const isCreator = task.assignedBy && String(task.assignedBy) === String(user._id);
    if (!(isAssigned || isCreator || user.role === 'admin')) return res.status(403).json({ success: false, message: 'Not authorized' });

    await Task.deleteOne({ _id: task._id });
    return res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    console.error('DELETE /tasks/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
