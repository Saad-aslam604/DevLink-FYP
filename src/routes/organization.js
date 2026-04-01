const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { protect } = require('../middleware/auth');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Resource = require('../models/Resource');
const OrganizationMember = require('../models/OrganizationMember');

// GET /api/organization/projects - get all projects linked to this organization
router.get('/projects', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if ((user.userType || '').toLowerCase() !== 'organization') return res.status(403).json({ success: false, message: 'Not an organization account' });
    const items = await Project.find({ organization: user._id }).populate('postedBy', 'firstName lastName avatar role').populate('attachments').lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('GET /organization/projects error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/organization/projects - create a project as an organization
router.post('/projects', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if ((user.userType || '').toLowerCase() !== 'organization') return res.status(403).json({ success: false, message: 'Only organization accounts can create organization projects' });
    const { title, description = '', budget = 0, deadline, skills = [], attachments = [] } = req.body || {};
    if (!title) return res.status(400).json({ success: false, message: 'title required' });
    const proj = new Project({ title: String(title), description: String(description || ''), budget: Number(budget || 0), deadline: deadline ? new Date(deadline) : undefined, skills: Array.isArray(skills) ? skills : (typeof skills === 'string' ? String(skills).split(',').map(s=>s.trim()).filter(Boolean) : []), organization: user._id, postedBy: user._id, attachments: Array.isArray(attachments) ? attachments : [] });
    await proj.save();
    return res.json({ success: true, data: proj });
  } catch (err) {
    console.error('POST /organization/projects error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/organization/projects/:projectId/tasks - create a task under a project
router.post('/projects/:projectId/tasks', protect, async (req, res) => {
  try {
    const user = req.user;
    const { projectId } = req.params;
    const { title, description, deadline, priority = 'medium', estimatedHours = 0 } = req.body || {};
    // assignedTo may be sent as an array or as a single string id from some callers
    // Diagnostic server-side logging for task creation
    try {
      console.log('=== TASK CREATION DEBUG ===');
      console.log('Request body:', req.body);
      console.log('assignedTo received:', req.body && req.body.assignedTo);
      console.log('assignedTo type:', typeof (req.body && req.body.assignedTo), 'isArray:', Array.isArray(req.body && req.body.assignedTo));
    } catch (e) {
      console.warn('Error logging task creation debug info', e && e.message ? e.message : e);
    }

    let assignedToRaw = (req.body && req.body.assignedTo) || [];
    let assignedToArr = [];
    if (Array.isArray(assignedToRaw)) assignedToArr = assignedToRaw;
    else if (typeof assignedToRaw === 'string' && assignedToRaw.trim()) assignedToArr = [assignedToRaw.trim()];
    else if (assignedToRaw && typeof assignedToRaw === 'object' && (assignedToRaw._id || assignedToRaw.id)) assignedToArr = [assignedToRaw._id || assignedToRaw.id];
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ success: false, message: 'projectId required' });
    const proj = await Project.findById(projectId);
    if (!proj) return res.status(404).json({ success: false, message: 'Project not found' });

    // Only organization admins or project owner can create tasks
    const isOrgAdmin = (user.userType === 'organization' && String(proj.organization) === String(user._id));
    const isProjectOwner = proj.postedBy && String(proj.postedBy) === String(user._id);
    if (!(isOrgAdmin || isProjectOwner || user.role === 'admin')) return res.status(403).json({ success: false, message: 'Not authorized to create tasks for this project' });

    const task = new Task({
      title: String(title || 'Untitled task'),
      description: String(description || ''),
      project: proj._id,
      assignedTo: Array.isArray(assignedToArr) ? assignedToArr.filter(a => mongoose.Types.ObjectId.isValid(String(a))).map(a => String(a)) : [],
      assignedBy: user._id,
      deadline: deadline ? new Date(deadline) : undefined,
      priority: String(priority || 'medium'),
      estimatedHours: Number(estimatedHours || 0)
    });
    await task.save();
    // Populate references before returning to client so UI gets user objects
    await task.populate('assignedTo', 'firstName lastName email avatar');
    await task.populate('assignedBy', 'firstName lastName email avatar');
    await task.populate('project', 'title');
    return res.json({ success: true, data: task });
  } catch (err) {
    console.error('POST /organization/projects/:projectId/tasks error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/organization/projects/:projectId/tasks - list tasks for a project
router.get('/projects/:projectId/tasks', protect, async (req, res) => {
  try {
    const user = req.user;
    const { projectId } = req.params;
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ success: false, message: 'projectId required' });
    const proj = await Project.findById(projectId);
    if (!proj) return res.status(404).json({ success: false, message: 'Project not found' });
    // allow org admins, project owner, assigned users, or admin
    const isOrgAdmin = (user.userType === 'organization' && String(proj.organization) === String(user._id));
    const isProjectOwner = proj.postedBy && String(proj.postedBy) === String(user._id);
    // Populate assigned users so frontend receives user objects (not just IDs)
    const tasks = await Task.find({ project: proj._id })
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('assignedBy', 'firstName lastName email avatar')
      .populate('project', 'title')
      .lean();
    // filter based on permissions
    if (!(isOrgAdmin || isProjectOwner || user.role === 'admin')) {
      // if not privileged, only show tasks assigned to the user
      const visible = tasks.filter(t => Array.isArray(t.assignedTo) && t.assignedTo.some(a => String(a._id) === String(user._id)));
      return res.json({ success: true, data: visible });
    }
    return res.json({ success: true, data: tasks });
  } catch (err) {
    console.error('GET /organization/projects/:projectId/tasks error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/organization/projects/:projectId/details - full project details (tasks, members)
router.get('/projects/:projectId/details', protect, async (req, res) => {
  try {
    const user = req.user;
    const { projectId } = req.params;
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ success: false, message: 'projectId required' });

    const project = await Project.findById(projectId).populate('organization', 'name firstName lastName avatar').populate('postedBy', 'firstName lastName email avatar').lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Check access: admin OR active member of the organization OR organization owner
    const isOrgOwner = (user.userType === 'organization' && String(project.organization) === String(user._id));
    const membership = await OrganizationMember.findOne({ user: user._id, organization: project.organization, status: 'active' }).lean();
    if (!membership && !isOrgOwner && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized to view this project' });

    // Fetch tasks under this project and populate assignments
    const tasks = await Task.find({ project: project._id })
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('assignedBy', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch active org members
    const members = await OrganizationMember.find({ organization: project.organization, status: 'active' }).populate('user', 'firstName lastName email avatar role').lean();

    // Construct a safe project details object
    const details = {
      project: project,
      tasks,
      members
    };

    return res.json({ success: true, data: details });
  } catch (err) {
    console.error('GET /organization/projects/:projectId/details error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/organization/resources - allocate resource
router.post('/resources', protect, async (req, res) => {
  try {
    const user = req.user;
    const { name, type = 'tool', allocatedTo, quantity = 1, cost = 0, description = '' } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    // only org admins can allocate resources
    if ((user.userType || '').toLowerCase() !== 'organization') return res.status(403).json({ success: false, message: 'Only organization accounts can allocate resources' });
    const r = new Resource({ name: String(name), type: String(type), allocatedTo: allocatedTo && mongoose.Types.ObjectId.isValid(String(allocatedTo)) ? String(allocatedTo) : undefined, allocatedBy: user._id, quantity: Number(quantity || 1), cost: Number(cost || 0), description: String(description || '') });
    await r.save();
    return res.json({ success: true, data: r });
  } catch (err) {
    console.error('POST /organization/resources error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/organization/resources - list org resources
router.get('/resources', protect, async (req, res) => {
  try {
    const user = req.user;
    if ((user.userType || '').toLowerCase() !== 'organization') return res.status(403).json({ success: false, message: 'Only organization accounts' });
    const items = await Resource.find({ allocatedBy: user._id }).lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('GET /organization/resources error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/organization/resources/:id - remove a resource (org admin only)
router.delete('/resources/:id', protect, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    if ((user.userType || '').toLowerCase() !== 'organization') return res.status(403).json({ success: false, message: 'Only organization accounts can remove resources' });
    const Resource = require('../models/Resource');
    const r = await Resource.findById(id);
    if (!r) return res.status(404).json({ success: false, message: 'Resource not found' });
    if (String(r.allocatedBy) !== String(user._id) && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized to remove this resource' });
    await Resource.deleteOne({ _id: r._id });
    return res.json({ success: true, message: 'Resource removed' });
  } catch (err) {
    console.error('DELETE /organization/resources/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/organization/team - get org team members
router.get('/team', protect, async (req, res) => {
  try {
    const user = req.user;
    if ((user.userType || '').toLowerCase() !== 'organization') return res.status(403).json({ success: false, message: 'Only organization accounts' });
    const members = await OrganizationMember.find({ organization: user._id }).populate('user', 'firstName lastName email avatar role').lean();
    return res.json({ success: true, data: members });
  } catch (err) {
    console.error('GET /organization/team error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/organization/team/invite - invite any user to organization team
router.post('/team/invite', protect, async (req, res) => {
  try {
    const user = req.user;
    const { email, role = 'member' } = req.body || {};
    if ((user.userType || '').toLowerCase() !== 'organization') return res.status(403).json({ success: false, message: 'Only organization accounts' });
    if (!email) return res.status(400).json({ success: false, message: 'email required' });
    const User = require('../models/User');
    const invitee = await User.findOne({ email: String(email).toLowerCase() });
    if (!invitee) return res.status(404).json({ success: false, message: 'User not found' });
    // allow inviting any user regardless of role
    // create or update OrganizationMember
    let om = await OrganizationMember.findOne({ organization: user._id, user: invitee._id });
    if (!om) {
      // record invitedAt when creating a new organization member invite
      om = new OrganizationMember({ organization: user._id, user: invitee._id, role: String(role || 'member'), invitedBy: user._id, status: 'invited', invitedAt: new Date() });
      await om.save();
    } else {
      om.role = String(role || om.role);
      om.status = 'invited';
      om.invitedAt = new Date();
      om.invitedBy = user._id;
      await om.save();
    }
    return res.json({ success: true, data: om, message: 'Invitation created' });
  } catch (err) {
    console.error('POST /organization/team/invite error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/organization/team/:id - remove a team member or cancel invite (org admin only)
router.delete('/team/:id', protect, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    if ((user.userType || '').toLowerCase() !== 'organization' && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only organization accounts or admins can remove members' });
    const om = await OrganizationMember.findById(id);
    if (!om) return res.status(404).json({ success: false, message: 'Member not found' });
    // only allow removing members of this org (or admin)
    if (String(om.organization) !== String(user._id) && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized' });
    // mark removed rather than hard delete for audit
    om.status = 'removed';
    await om.save();
    return res.json({ success: true, message: 'Member removed', data: om });
  } catch (err) {
    console.error('DELETE /organization/team/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----- Invitations for individual users (invite inbox) -----
// Note: OrganizationMember.status uses 'invited', 'active', 'removed'.
// We map accept -> status = 'active', reject -> status = 'removed' to avoid changing existing schema.

// GET /api/organization/invitations/my - pending invitations for current user
router.get('/invitations/my', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    // only individual users should see their invitations
    if (String((user.userType || '')).toLowerCase() !== 'individual') return res.status(403).json({ success: false, message: 'Only individual users can view invitations' });
    const invites = await OrganizationMember.find({ user: user._id, status: 'invited' }).populate('organization', 'firstName lastName name avatar').lean();
    return res.json({ success: true, data: invites });
  } catch (err) {
    console.error('GET /organization/invitations/my error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/organization/invitations/:id/accept - accept an invitation
router.post('/invitations/:id/accept', protect, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'invite id required' });
    const invite = await OrganizationMember.findById(id);
    if (!invite) return res.status(404).json({ success: false, message: 'Invitation not found' });
    if (String(invite.user) !== String(user._id)) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (invite.status !== 'invited') return res.status(400).json({ success: false, message: 'Invitation not pending' });
    invite.status = 'active';
    // record joinedAt for when a user accepts
    invite.joinedAt = new Date();
    await invite.save();
    return res.json({ success: true, data: invite, message: 'Invitation accepted' });
  } catch (err) {
    console.error('POST /organization/invitations/:id/accept error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/organization/invitations/:id/reject - reject an invitation
router.post('/invitations/:id/reject', protect, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'invite id required' });
    const invite = await OrganizationMember.findById(id);
    if (!invite) return res.status(404).json({ success: false, message: 'Invitation not found' });
    if (String(invite.user) !== String(user._id)) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (invite.status !== 'invited') return res.status(400).json({ success: false, message: 'Invitation not pending' });
    // map rejected -> 'removed' in existing schema
    invite.status = 'removed';
    await invite.save();
    return res.json({ success: true, data: invite, message: 'Invitation rejected' });
  } catch (err) {
    console.error('POST /organization/invitations/:id/reject error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/organization/invitations/:id/resend - resend an invitation (organization admin)
router.post('/invitations/:id/resend', protect, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'invite id required' });
    const invite = await OrganizationMember.findById(id);
    if (!invite) return res.status(404).json({ success: false, message: 'Invitation not found' });
    if (String(invite.organization) !== String(user._id)) return res.status(403).json({ success: false, message: 'Not authorized' });
    // only allow resending pending invites
    if (invite.status !== 'invited') return res.status(400).json({ success: false, message: 'Only pending invitations can be resent' });
    invite.invitedAt = new Date();
    invite.invitedBy = user._id;
    await invite.save();
    // NOTE: not implementing email sending here; keep additive
    return res.json({ success: true, data: invite, message: 'Invitation resent' });
  } catch (err) {
    console.error('POST /organization/invitations/:id/resend error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/organization/invitations/:id/cancel - cancel an invitation (organization admin)
router.post('/invitations/:id/cancel', protect, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'invite id required' });
    const invite = await OrganizationMember.findById(id);
    if (!invite) return res.status(404).json({ success: false, message: 'Invitation not found' });
    if (String(invite.organization) !== String(user._id)) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (invite.status !== 'invited') return res.status(400).json({ success: false, message: 'Only pending invitations can be cancelled' });
    invite.status = 'removed';
    await invite.save();
    return res.json({ success: true, data: invite, message: 'Invitation cancelled' });
  } catch (err) {
    console.error('POST /organization/invitations/:id/cancel error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===== Tasks for assigned users under organization namespace =====
// GET /api/organization/tasks/assigned-to-me - list tasks assigned to current user (non-completed)
router.get('/tasks/assigned-to-me', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    // Diagnostic logs to inspect DB structure when debugging task visibility
    console.log('=== TASK DIAGNOSTIC START ===');
    console.log('User ID:', user._id);
    console.log('User role:', user.role);
    console.log('🔍 [organization] Fetching assigned tasks for user:', user._id);

    // Find organization membership for this user
    const membership = await OrganizationMember.findOne({ user: user._id, status: 'active' });
    if (!membership) {
      console.log('⚠️ [organization] User has no active organization membership:', user._id);
      return res.json({ success: true, count: 0, tasks: [] });
    }

    const orgId = membership.organization;

    // DIAGNOSTIC: list all tasks in this organization and log structure to help debug field mismatches
    try {
      const allTasks = await Task.find({}).populate('project', 'title organization').lean();
      const allTasksInOrg = allTasks.filter(t => t.project && String(t.project.organization) === String(orgId));
      console.log(`🔎 [organization] Total tasks in org ${orgId}:`, allTasksInOrg.length);
      allTasksInOrg.forEach((task, i) => {
        try {
          console.log(`\nTask ${i+1} (${task._id}):`);
          console.log('  Title:', task.title);
          console.log('  Status:', task.status);
          console.log('  assignedTo:', task.assignedTo);
          console.log('  assignedUserId:', task.assignedUserId);
          console.log('  assignee:', task.assignee);
          console.log('  All fields:', Object.keys(task));
        } catch (e) {
          console.warn('Error logging task structure for', task && task._id, e && e.message ? e.message : e);
        }
      });
    } catch (diagErr) {
      console.warn('Diagnostic: failed to list all tasks in org', diagErr && diagErr.message ? diagErr.message : diagErr);
    }

    // SIMPLE FIX: Get all tasks assigned to user regardless of organization
    // (covers tasks with organizationId=null or missing)
    const tasks = await Task.find({
      assignedTo: user._id,
      // include 'todo' so newly created tasks (status='todo') also appear in the hub
      status: { $in: ['todo', 'pending', 'in-progress'] }
    })
      .populate('project', 'title organization')
      .populate('assignedBy', 'firstName lastName email avatar')
      .populate('assignedTo', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ [SIMPLE FIX] Found ${tasks.length} tasks for user ${user._id}`);
    // Diagnostic: log organizationId for each task (helps detect null/missing orgs)
    tasks.forEach((task, i) => {
      try {
        console.log(`  Task ${i + 1}: ${task.title || '<no-title>'}, OrgId: ${task.organizationId || (task.project && task.project.organization) || null}`);
      } catch (e) {
        console.warn('Error logging task org info', e && e.message ? e.message : e);
      }
    });

    return res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error('GET /organization/tasks/assigned-to-me error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching tasks', details: err && err.message ? err.message : String(err) });
  }
});

// PATCH /api/organization/tasks/:taskId/status - update status for a task if user is assigned
router.patch('/tasks/:taskId/status', protect, async (req, res) => {
  try {
    const user = req.user;
    const { taskId } = req.params;
    const { status } = req.body || {};
    if (!taskId || !taskId.length) return res.status(400).json({ success: false, message: 'taskId required' });
    if (!status) return res.status(400).json({ success: false, message: 'status required' });

    const validStatuses = ['todo', 'in-progress', 'review', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${validStatuses.join(', ')}` });
    }

    // ensure user is member of an organization
    const membership = await OrganizationMember.findOne({ user: user._id, status: 'active' });
    if (!membership) return res.status(403).json({ success: false, message: 'User not part of any organization' });
    const orgId = membership.organization;

    // load task and populate project to verify organization
    const task = await Task.findById(taskId).populate('project', 'organization');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // verify task belongs to the same organization
    if (!task.project || String(task.project.organization) !== String(orgId)) {
      return res.status(403).json({ success: false, message: 'Task does not belong to your organization' });
    }

    // verify user is assigned to task
    const assigned = Array.isArray(task.assignedTo) && task.assignedTo.some(a => String(a) === String(user._id));
    if (!assigned && String(task.assignedBy) !== String(user._id) && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized to update this task' });

    task.status = status;
    task.updatedAt = new Date();
    await task.save();
    return res.json({ success: true, message: 'Task status updated', task });
  } catch (err) {
    console.error('PATCH /organization/tasks/:taskId/status error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating task', details: err && err.message ? err.message : String(err) });
  }
});

// PATCH /api/organization/tasks/:taskId/progress - update progress for a task if user is assigned
router.patch('/tasks/:taskId/progress', protect, async (req, res) => {
  try {
    const user = req.user;
    const { taskId } = req.params;
    const { progress } = req.body || {};
    if (!taskId || !taskId.length) return res.status(400).json({ success: false, message: 'taskId required' });
    const p = Number(progress);
    if (isNaN(p) || p < 0 || p > 100) return res.status(400).json({ success: false, message: 'progress must be 0-100' });

    // ensure user is member of an organization
    const membership = await OrganizationMember.findOne({ user: user._id, status: 'active' });
    if (!membership) return res.status(403).json({ success: false, message: 'User not part of any organization' });
    const orgId = membership.organization;

    // load task and populate project to verify organization
    const task = await Task.findById(taskId).populate('project', 'organization');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // verify task belongs to the same organization
    if (!task.project || String(task.project.organization) !== String(orgId)) {
      return res.status(403).json({ success: false, message: 'Task does not belong to your organization' });
    }

    // verify user is assigned to task
    const assigned = Array.isArray(task.assignedTo) && task.assignedTo.some(a => String(a) === String(user._id));
    if (!assigned && String(task.assignedBy) !== String(user._id) && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized to update this task' });

    task.progress = p;
    task.status = p === 100 ? 'completed' : (p > 0 ? 'in-progress' : 'todo');
    task.updatedAt = new Date();
    await task.save();
    return res.json({ success: true, message: 'Task progress updated', task });
  } catch (err) {
    console.error('PATCH /organization/tasks/:taskId/progress error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating task', details: err && err.message ? err.message : String(err) });
  }
});

// PUT /api/organization/tasks/:taskId - update a task (organization-scoped)
router.put('/tasks/:taskId', protect, async (req, res) => {
  try {
    const user = req.user;
    const { taskId } = req.params;
    const updates = req.body || {};
    if (!taskId) return res.status(400).json({ success: false, message: 'taskId required' });

    console.log('🔍 [organization] Updating task:', taskId, updates);

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Determine organization for the task. Prefer project.organization if available.
    let taskOrgId = null;
    try {
      const proj = await require('../models/Project').findById(task.project).select('organization').lean();
      if (proj && proj.organization) taskOrgId = proj.organization;
    } catch (e) {
      // ignore
    }

    // Check user membership in that organization
    const membership = await OrganizationMember.findOne({ user: user._id, organization: taskOrgId, status: 'active' });
    // allow global admins
    if (!membership && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
    if (membership && membership.role === 'member' && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized to update this task' });

    // Allowed fields to update
    const allowedUpdates = ['title', 'description', 'status', 'priority', 'deadline', 'progress', 'estimatedHours', 'assignedTo', 'assignedBy', 'project'];
    allowedUpdates.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        task[field] = updates[field];
      }
    });

    task.updatedAt = new Date();
    await task.save();

    // Populate references for response
    await task.populate('project', 'title');
    await task.populate('assignedBy', 'firstName lastName email');
    await task.populate('assignedTo', 'firstName lastName email');

    console.log(`✅ Updated task ${taskId}: ${task.title}`);
    return res.json({ success: true, message: 'Task updated successfully', task });
  } catch (err) {
    console.error('❌ Error updating task:', err);
    return res.status(500).json({ success: false, message: 'Server error updating task', error: err && err.message ? err.message : String(err) });
  }
});

// Debug: whoami for organization-protected routes
// GET /api/organization/debug/whoami
router.get('/debug/whoami', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    // return a minimal user object to avoid leaking sensitive fields
    const safe = {
      _id: user._id,
      email: user.email,
      role: user.role,
      userType: user.userType,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    return res.json({ success: true, user: safe });
  } catch (err) {
    console.error('/api/organization/debug/whoami error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Debug: comprehensive tasks status check for the current user
// GET /api/organization/debug/tasks-status
router.get('/debug/tasks-status', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    console.log('🔍 [DEBUG] Checking tasks for user:', user._id, user.email);

    // 1. Basic user info
    const userInfo = {
      id: user._id,
      email: user.email,
      userType: user.userType,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // 2. DB counts
    const totalTasks = await Task.countDocuments({});
    const userTaskCount = await Task.countDocuments({ assignedTo: user._id });

    // 3. Actual assigned tasks
    const userTasks = await Task.find({ assignedTo: user._id })
      .populate('project', 'title')
      .populate('assignedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .lean();

    // 4. Sample task structure to inspect fields
    const sampleTask = await Task.findOne().lean();

    return res.json({
      success: true,
      debug: true,
      user: userInfo,
      database: {
        totalTasks,
        userTaskCount,
        hasAssignedTasks: userTaskCount > 0,
      },
      tasks: userTasks,
      sampleTaskStructure: sampleTask ? Object.keys(sampleTask) : 'No tasks in DB',
      endpoints: {
        assignedTasks: '/api/organization/tasks/assigned-to-me',
        globalTasks: '/api/tasks/assigned-to-me',
        progressUpdate: '/api/organization/tasks/:id/progress'
      }
    });
  } catch (err) {
    console.error('❌ [DEBUG ERROR]:', err);
    return res.status(500).json({ success: false, error: err && err.message ? err.message : String(err), stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
});

// DIAGNOSTIC: Check database field names for a specific user's tasks
// GET /api/organization/debug/task-fields/:userId
router.get('/debug/task-fields/:userId', protect, async (req, res) => {
  try {
    const requestingUser = req.user;
    // restrict to admin only for safety
    if (!requestingUser || requestingUser.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });

    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });

    // find tasks that might reference this user under several possible field names
    const tasks = await Task.find({
      $or: [
        { assignedTo: userId },
        { assignedUserId: userId },
        { assignee: userId },
        { 'assignedTo._id': userId },
        { 'assignedTo.id': userId }
      ]
    }).limit(10).lean();

    // collect unique field names
    const allFieldNames = new Set();
    tasks.forEach(task => {
      Object.keys(task).forEach(f => allFieldNames.add(f));
      // also inspect nested assignment objects if present
      if (task.assignedTo && Array.isArray(task.assignedTo)) {
        task.assignedTo.forEach(a => { if (a && typeof a === 'object') Object.keys(a).forEach(k => allFieldNames.add('assignedTo.' + k)) })
      }
      if (task.assignee && typeof task.assignee === 'object') Object.keys(task.assignee).forEach(k => allFieldNames.add('assignee.' + k))
    });

    // check organization membership for this user
    const membership = await OrganizationMember.findOne({ user: userId }).lean();

    return res.json({
      success: true,
      userId,
      hasOrgMembership: !!membership,
      org: membership ? { organization: membership.organization, role: membership.role } : null,
      totalTasksFound: tasks.length,
      allFieldNames: Array.from(allFieldNames),
      sampleTasks: tasks.map(task => ({
        _id: task._id,
        title: task.title,
        assignedTo: task.assignedTo || null,
        assignedUserId: task.assignedUserId || null,
        assignee: task.assignee || null,
        project: task.project || null,
        status: task.status || null,
        rawFields: Object.keys(task)
      }))
    });
  } catch (err) {
    console.error('DEBUG /organization/debug/task-fields error', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err && err.message ? err.message : String(err) });
  }
});

module.exports = router;

