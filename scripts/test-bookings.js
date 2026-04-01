const fetch = global.fetch || require('node-fetch');
const base = process.env.DEVLINK_BASE || 'http://localhost:5000';

function ok(msg) { console.log('[OK] ' + msg); }
function fail(msg) { console.error('[FAIL] ' + msg); process.exitCode = 2; }

async function run() {
  console.log('Starting DevLink booking tests against', base);

  // Create student and mentor users
  const ts = Math.floor(Date.now() / 1000);
  const studentEmail = `booking-student+${ts}@example.com`;
  const mentorEmail = `booking-mentor+${ts}@example.com`;
  const password = 'Password123';

  // Register mentor
  let mentorToken = null;
  let mentorId = null;
  try {
    let r = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: mentorEmail, password, role: 'mentor' }) });
    let j = await r.json();
    if (!j || !j.success) return fail('Mentor register failed: ' + JSON.stringify(j));
    // login to get token
    r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: mentorEmail, password }) });
    j = await r.json(); if (!j || !j.success) return fail('Mentor login failed'); mentorToken = j.data.token;
    // get mentor id
    r = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${mentorToken}` } }); j = await r.json(); mentorId = j.data.user._id;
    ok('Mentor ready');
  } catch (e) { return fail('Mentor setup error: ' + e.message); }

  // Register student
  let studentToken = null;
  let studentId = null;
  try {
    let r = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: studentEmail, password, role: 'junior' }) });
    let j = await r.json(); if (!j || !j.success) return fail('Student register failed: ' + JSON.stringify(j));
    r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: studentEmail, password }) }); j = await r.json(); studentToken = j.data.token;
    r = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${studentToken}` } }); j = await r.json(); studentId = j.data.user._id;
    ok('Student ready');
  } catch (e) { return fail('Student setup error: ' + e.message); }

  // Create a booking: 1 hour from now
  try {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const body = { mentorId, startTime: start.toISOString(), endTime: end.toISOString(), notes: 'Test booking' };
    const r = await fetch(base + '/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify(body) });
    const j = await r.json(); if (!j || !j.success) return fail('Create booking failed: ' + JSON.stringify(j));
    const bookingId = j.data.booking._id; ok('Booking created');

    // Attempt conflicting booking by another student (should fail)
    const otherStudentEmail = `booking-student2+${ts}@example.com`;
    let r2 = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: otherStudentEmail, password, role: 'junior' }) });
    let j2 = await r2.json(); if (!j2 || !j2.success) return fail('Other student register failed');
    r2 = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: otherStudentEmail, password }) }); j2 = await r2.json(); const otherToken = j2.data.token;
    const r3 = await fetch(base + '/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${otherToken}` }, body: JSON.stringify(body) });
    if (r3.status === 409) ok('Conflicting booking was prevented'); else {
      const jj = await r3.json(); return fail('Conflicting booking allowed: ' + JSON.stringify(jj));
    }

    // Mentor confirms the booking
    const r4 = await fetch(base + `/api/bookings/${bookingId}/status`, { method: 'PATCH', headers: { 'content-type': 'application/json', Authorization: `Bearer ${mentorToken}` }, body: JSON.stringify({ status: 'confirmed' }) });
    const j4 = await r4.json(); if (!j4 || !j4.success) return fail('Confirm booking failed: ' + JSON.stringify(j4)); ok('Mentor confirmed booking');

    // Student fetches their bookings
    const r5 = await fetch(base + '/api/bookings/my?role=student', { headers: { Authorization: `Bearer ${studentToken}` } }); const j5 = await r5.json(); if (!j5 || !j5.success) return fail('Fetch bookings failed: ' + JSON.stringify(j5)); ok('Student booking history fetched');

    // Mentor marks completed
    const r6 = await fetch(base + `/api/bookings/${bookingId}/status`, { method: 'PATCH', headers: { 'content-type': 'application/json', Authorization: `Bearer ${mentorToken}` }, body: JSON.stringify({ status: 'completed' }) }); const j6 = await r6.json(); if (!j6 || !j6.success) return fail('Complete booking failed: ' + JSON.stringify(j6)); ok('Mentor completed booking');

  } catch (e) { return fail('Booking test error: ' + e.message); }

  console.log('Booking tests complete');
}

run().catch(e => { console.error('Test runner fatal:', e); process.exit(2); });
