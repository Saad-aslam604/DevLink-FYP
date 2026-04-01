const fetch = global.fetch || require('node-fetch');
const base = process.env.DEVLINK_BASE || 'http://localhost:5000';

function ok(msg) { console.log('[OK] ' + msg); }
function fail(msg) { console.error('[FAIL] ' + msg); process.exitCode = 2; }

async function run() {
  console.log('Starting DevLink profile tests against', base);

  const ts = Math.floor(Date.now() / 1000);
  const email = `profiletest+${ts}@example.com`;
  const password = 'Password123';

  // Register
  let token = null;
  let userId = null;
  try {
    const r = await fetch(base + '/api/auth/register', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'junior' })
    });
    const j = await r.json();
    if (!j || !j.success || !j.data || !j.data.token) return fail('Register failed: ' + JSON.stringify(j));
    token = j.data.token;
    ok('Register succeeded');
  } catch (e) { return fail('Register error: ' + e.message); }

  // Login to get token (also tests login path)
  try {
    const r = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const j = await r.json();
    if (!j || !j.success || !j.data || !j.data.token) return fail('Login failed: ' + JSON.stringify(j));
    token = j.data.token;
    ok('Login succeeded');
  } catch (e) { return fail('Login error: ' + e.message); }

  // GET /me
  try {
    const r = await fetch(base + '/api/profiles/me', { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (!j || !j.success || !j.data || !j.data.profile) return fail('/me failed: ' + JSON.stringify(j));
    userId = j.data.profile._id || j.data.profile.id;
    ok('GET /me returned profile');
  } catch (e) { return fail('/me error: ' + e.message); }

  // PUT /me - update some fields
  try {
    const body = { firstName: 'Test', lastName: 'User', skills: ['javascript','nodejs'] };
    const r = await fetch(base + '/api/profiles/me', {
      method: 'PUT', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (!j || !j.success || !j.data || !j.data.profile) return fail('PUT /me failed: ' + JSON.stringify(j));
    if (j.data.profile.firstName !== 'Test') return fail('PUT /me did not update firstName');
    ok('PUT /me updated profile');
  } catch (e) { return fail('PUT /me error: ' + e.message); }

  // POST /become-mentor
  try {
    const body = { mentorBio: 'I can help with Node.js', expertiseAreas: ['backend','nodejs'], hourlyRate: 30 };
    const r = await fetch(base + '/api/profiles/become-mentor', {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (!j || !j.success || !j.data || !j.data.profile) return fail('become-mentor failed: ' + JSON.stringify(j));
    if (j.data.profile.role !== 'mentor') return fail('become-mentor did not set role to mentor');
    ok('POST /become-mentor succeeded');
  } catch (e) { return fail('become-mentor error: ' + e.message); }

  // GET /mentors - search by skill
  try {
    const q = '?skills=nodejs&limit=10';
    const r = await fetch(base + '/api/profiles/mentors' + q);
    const j = await r.json();
    if (!j || !j.success || !j.data) return fail('/mentors failed: ' + JSON.stringify(j));
    const found = (j.data.results || []).some(p => (p.email && p.email.toLowerCase() === email.toLowerCase()) || (p.expertiseAreas && p.expertiseAreas.includes('nodejs')) || (p.skills && p.skills.includes('nodejs')));
    if (!found) return fail('Mentor search did not return the new mentor');
    ok('GET /mentors returned the new mentor');
  } catch (e) { return fail('/mentors error: ' + e.message); }

  // GET /:userId - public profile view
  try {
    if (!userId) return fail('no userId for public profile test');
    const r = await fetch(base + '/api/profiles/' + userId);
    const j = await r.json();
    if (!j || !j.success || !j.data || !j.data.profile) return fail('GET /:userId failed: ' + JSON.stringify(j));
    ok('GET /:userId returned public profile');
  } catch (e) { return fail('/profiles/:userId error: ' + e.message); }

  console.log('Profile tests complete');
}

run().catch(e => { console.error('Test runner fatal:', e); process.exit(2); });
