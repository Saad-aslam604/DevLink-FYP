const fetch = global.fetch || require('node-fetch');
const base = process.env.DEVLINK_BASE || 'http://localhost:5000';

function ok(msg) { console.log('[OK] ' + msg); }
function fail(msg) { console.error('[FAIL] ' + msg); process.exitCode = 2; }

async function run() {
  console.log('Starting DevLink payment tests against', base);
  const ts = Math.floor(Date.now() / 1000);
  const studentEmail = `pay-student+${ts}@example.com`;
  const mentorEmail = `pay-mentor+${ts}@example.com`;
  const password = 'Password123';

  // Create mentor and student and booking
  let mentorToken, studentToken, mentorId, studentId, bookingId;
  try {
    let r = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: mentorEmail, password, role: 'mentor' }) });
    let j = await r.json();
    r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: mentorEmail, password }) }); j = await r.json(); mentorToken = j.data.token; r = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${mentorToken}` } }); j = await r.json(); mentorId = j.data.user._id;
    ok('Mentor ready');

    r = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: studentEmail, password, role: 'junior' }) }); j = await r.json();
    r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: studentEmail, password }) }); j = await r.json(); studentToken = j.data.token; r = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${studentToken}` } }); j = await r.json(); studentId = j.data.user._id; ok('Student ready');

    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const r2 = await fetch(base + '/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ mentorId, startTime: start.toISOString(), endTime: end.toISOString() }) });
    const j2 = await r2.json(); if (!j2 || !j2.success) return fail('Create booking failed: ' + JSON.stringify(j2)); bookingId = j2.data.booking._id; ok('Booking created for payment');
  } catch (e) { return fail('Setup error: ' + e.message); }

  // Create PaymentIntent
  let clientSecret, paymentId, paymentIntentId;
  try {
    const r = await fetch(base + '/api/payments/create-intent', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ bookingId }) });
    const j = await r.json(); if (!j || !j.success) return fail('Create intent failed: ' + JSON.stringify(j)); clientSecret = j.data.clientSecret; paymentId = j.data.paymentId; ok('PaymentIntent created');
    // We won't actually charge via Stripe in this test (requires test keys and network). Instead, verify DB record exists
    const r2 = await fetch(base + `/api/payments/my`, { headers: { Authorization: `Bearer ${studentToken}` } }); const j2 = await r2.json(); if (!j2 || !j2.success) return fail('Payments fetch failed: ' + JSON.stringify(j2)); const found = j2.data.results.some(p => p._id === paymentId); if (!found) return fail('Payment record not found in history'); ok('Payment record present in history');
  } catch (e) { return fail('Create intent error: ' + e.message); }

  console.log('Payment tests complete (note: full Stripe flow requires live/test keys and client confirmation)');
}

run().catch(e=>{ console.error('Test runner fatal', e); process.exit(2); });
