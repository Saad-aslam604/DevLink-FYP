const fetch = global.fetch || require('node-fetch');
const base = process.env.DEVLINK_BASE || 'http://localhost:5002';

function ok(msg) { console.log('[OK] ' + msg); }
function fail(msg) { console.error('[FAIL] ' + msg); process.exitCode = 2; }

async function run() {
  console.log('Starting DevLink auth automated tests (node) against', base);

  // 1) health
  try {
    const r = await fetch(base + '/');
    const j = await r.json();
    if (j && j.success) ok('Health check returned success'); else fail('Health check returned unexpected: ' + JSON.stringify(j));
  } catch (e) {
    fail('Health check failed: ' + e.message);
  }

  const ts = Math.floor(Date.now() / 1000);
  const email = `test+${ts}@example.com`;
  const password = 'Password123';

  // 2) register
  try {
    const r = await fetch(base + '/api/auth/register', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'junior' })
    });
    const j = await r.json();
    if (j && j.success && j.data && j.data.token) {
      ok('Register succeeded');
    } else {
      fail('Register failed: ' + JSON.stringify(j));
    }
  } catch (e) { fail('Register error: ' + e.message); }

  // 3) register validation
  try {
    const r = await fetch(base + '/api/auth/register', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'bad', password: '123' })
    });
    if (r.status >= 400) ok('Register validation returned error as expected'); else {
      const j = await r.json();
      fail('Register bad-data did not fail as expected: ' + JSON.stringify(j));
    }
  } catch (e) { fail('Register validation error: ' + e.message); }

  // 4) login correct
  let token = null;
  try {
    const r = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const j = await r.json();
    if (j && j.success && j.data && j.data.token) { token = j.data.token; ok('Login succeeded'); }
    else fail('Login failed: ' + JSON.stringify(j));
  } catch (e) { fail('Login error: ' + e.message); }

  // 5) login wrong password
  try {
    const r = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'WrongPassword' })
    });
    if (r.status === 401) ok('Wrong-password login returned 401'); else {
      const j = await r.json(); fail('Wrong-password login unexpected: ' + JSON.stringify(j));
    }
  } catch (e) { fail('Wrong-password login error: ' + e.message); }

  // 6) protected /me with token
  try {
    const r = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (j && j.success && j.data && j.data.user) ok('/api/auth/me returned user with token'); else fail('/api/auth/me failed: ' + JSON.stringify(j));
  } catch (e) { fail('/me with token error: ' + e.message); }

  // 7) protected /me without token
  try {
    const r = await fetch(base + '/api/auth/me');
    if (r.status === 401) ok('/me without token returned 401 as expected'); else {
      const j = await r.json(); fail('/me without token unexpected: ' + JSON.stringify(j));
    }
  } catch (e) { fail('/me without token error: ' + e.message); }

  console.log('Node test run complete');
}

run().catch((e) => { console.error('Test runner fatal:', e); process.exit(2); });
