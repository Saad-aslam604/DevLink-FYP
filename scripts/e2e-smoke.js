#!/usr/bin/env node
const fetch = require('node-fetch');

const BACKEND = process.env.BACKEND_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admintoken123';

function ok(res) {
  return res && res.success;
}

async function run() {
  try {
    console.log('E2E Smoke Test — backend:', BACKEND);

    // 1) Register test user
    const email = `e2e-test+${Date.now()}@example.com`;
    const password = 'Password123!';
    console.log('Registering user', email);
    let r = await fetch(`${BACKEND}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'E2E Tester', role: 'junior' })
    });
    const reg = await r.json();
    if (!reg || !reg.success || !reg.data || !reg.data.token) {
      console.error('Register failed', reg);
      process.exit(2);
    }
    const userToken = reg.data.token;
    console.log('Registered. Token length:', String(userToken).length);

    // 2) Submit mentor application
    const appBody = {
      title: 'E2E Senior Developer',
      bio: 'I am testing the mentor application flow (E2E).',
      skills: 'Node.js,React,Testing',
      expertise: 'Fullstack',
      hourlyRate: 120,
      yearsOfExperience: 6,
      currentCompany: 'E2E Inc',
      githubUrl: 'https://github.com/e2e'
    };
    console.log('Submitting mentor application...');
    r = await fetch(`${BACKEND}/api/profiles/become-mentor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify(appBody)
    });
    const appRes = await r.json();
    if (!appRes || !appRes.success) {
      console.error('Application submission failed', appRes);
      process.exit(3);
    }
    const appId = appRes.applicationId || (appRes.data && appRes.data.applicationId) || (appRes.data && appRes.data._id) || null;
    console.log('Application submitted. id=', appId, 'status=', appRes.data && appRes.data.status);

    // 3) Admin list
    console.log('Listing admin applications (admin token)', ADMIN_TOKEN ? 'present' : 'missing');
    r = await fetch(`${BACKEND}/api/admin/mentor-applications`, { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } });
    const list = await r.json();
    if (!list || !list.success) {
      console.error('Admin list failed', list);
      process.exit(4);
    }
    console.log('Admin list total:', Array.isArray(list.data) ? list.data.length : (list.pagination && list.pagination.total) || 0);

    // Find our application in list
    let found = null;
    if (Array.isArray(list.data)) {
      found = list.data.find(a => (a.user && a.user.email === email) || (a.user && a.user._id && a.user._id === appId) || a._id === appId || a._id === (appId || ''));
    }
    if (!found && appId) {
      // Try fetch single
      r = await fetch(`${BACKEND}/api/admin/mentor-applications/${appId}`, { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } });
      const single = await r.json();
      if (single && single.success) found = single.data;
    }
    if (!found) console.warn('Could not locate application in admin list; continuing with reported appId');
    const targetId = (found && (found._id || found._id)) || appId;
    if (!targetId) {
      console.error('No application id to approve');
      process.exit(5);
    }

    // 4) Approve as admin
    console.log('Approving application', targetId);
    r = await fetch(`${BACKEND}/api/admin/mentor-applications/${targetId}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` }, body: JSON.stringify({ approvedRate: 120 }) });
    const approveRes = await r.json();
    if (!approveRes || !approveRes.success) {
      console.error('Approve failed', approveRes);
      process.exit(6);
    }
    console.log('Approve response:', approveRes.message || approveRes);

    // 5) Verify user role
    console.log('Verifying user role via /api/profiles/me');
    r = await fetch(`${BACKEND}/api/profiles/me`, { headers: { Authorization: `Bearer ${userToken}` } });
    const me = await r.json();
    if (!me || !me.success) {
      console.error('/profiles/me failed', me);
      process.exit(7);
    }
    const role = me.data && me.data.profile && (me.data.profile.role || me.data.profile.user && me.data.profile.user.role) || 'unknown';
    console.log('User role after approval:', role);
    if (role !== 'mentor') {
      console.error('Expected user role to be mentor after approval but got:', role);
      process.exit(8);
    }

    console.log('\nE2E smoke test completed successfully ✅');
    process.exit(0);
  } catch (err) {
    console.error('E2E script error', err && err.stack || err);
    process.exit(10);
  }
}

run();
