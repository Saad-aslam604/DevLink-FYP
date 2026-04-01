const { io } = require('socket.io-client');
const { register, login, base } = require('./socket-test-utils');

function ok(msg) { console.log('[OK] ' + msg); }
function fail(msg) { console.error('[FAIL] ' + msg); process.exitCode = 2; }

async function run() {
  console.log('Starting notifications test against', base);
  const ts = Math.floor(Date.now() / 1000);
  const mentorEmail = `ntf_mentor+${ts}@example.com`;
  const studentEmail = `ntf_student+${ts}@example.com`;
  const password = 'Password123';

  const m = await register(mentorEmail, password, 'mentor');
  const s = await register(studentEmail, password);
  if (!(m && m.success && s && s.success)) { fail('Register failed'); return; }

  const lm = await login(mentorEmail, password);
  const ls = await login(studentEmail, password);
  const mentorToken = lm.data.token; const studentToken = ls.data.token; const mentorId = lm.data.user._id || lm.data.user.id;

  // Connect mentor socket to listen for booking-created
  const socketM = io(base, { auth: { token: mentorToken }, reconnection: false, transports: ['websocket'] });
  socketM.on('connect', () => ok('mentor socket connected'));
  socketM.once('booking-created', (payload) => { ok('mentor received booking-created'); socketM.disconnect(); process.exit(0); });

  // Create booking via API as student
  setTimeout(async () => {
    const start = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 7 * 60 * 1000).toISOString();
    const fetch = global.fetch || require('node-fetch');
    const r = await fetch(base + '/api/bookings', {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${ls.data.token}` },
      body: JSON.stringify({ mentorId, startTime: start, endTime: end })
    });
    const j = await r.json();
    if (!(j && j.success)) { fail('Create booking failed: ' + JSON.stringify(j)); }
  }, 1000).unref();

  setTimeout(() => { fail('Timeout waiting for booking-created'); process.exitCode = 2; }, 8000).unref();
}

run().catch(e=>{ console.error('Fatal:', e); process.exit(2); });
