const { io } = require('socket.io-client');
const { register, login, createBooking, base } = require('./socket-test-utils');

function ok(msg) { console.log('[OK] ' + msg); }
function fail(msg) { console.error('[FAIL] ' + msg); process.exitCode = 2; }

async function run() {
  console.log('Starting end-to-end real-time integration test against', base);
  const ts = Math.floor(Date.now() / 1000);
  const mentorEmail = `intg_mentor+${ts}@example.com`;
  const studentEmail = `intg_student+${ts}@example.com`;
  const password = 'Password123';

  await register(mentorEmail, password, 'mentor');
  await register(studentEmail, password);
  const lm = await login(mentorEmail, password);
  const ls = await login(studentEmail, password);
  const mentorToken = lm.data.token; const studentToken = ls.data.token; const mentorId = lm.data.user._id || lm.data.user.id;

  const start = new Date(Date.now() + 60 * 1000).toISOString();
  const end = new Date(Date.now() + 6 * 60 * 1000).toISOString();
  const b = await createBooking(ls.data.token, mentorId, start, end);
  if (!(b && b.success)) { fail('Create booking failed'); return; }
  const bookingId = b.data.booking._id;

  const socketM = io(base, { auth: { token: mentorToken }, reconnection: false, transports: ['websocket'] });
  const socketS = io(base, { auth: { token: studentToken }, reconnection: false, transports: ['websocket'] });

  socketM.on('connect', () => socketM.emit('join-room', { bookingId }));
  socketS.on('connect', () => socketS.emit('join-room', { bookingId }));

  // Chat -> signaling -> booking update
  socketM.once('chat-message', (m) => { ok('mentor received chat'); });
  socketS.once('chat-message', (m) => { ok('student received chat'); });

  socketM.once('webrtc-offer', ({ from, offer }) => {
    ok('mentor received offer');
    socketM.emit('webrtc-answer', { bookingId, answer: { type: 'answer', sdp: 'ok' } });
  });

  socketS.once('webrtc-answer', ({ from, answer }) => { ok('student received answer'); });

  // Booking-updated listener
  socketM.once('booking-updated', (p) => ok('mentor received booking-updated'));
  socketS.once('booking-updated', (p) => ok('student received booking-updated'));

  setTimeout(() => {
    socketS.emit('chat-message', { bookingId, content: 'Hello from student' });
    socketS.emit('webrtc-offer', { bookingId, offer: { type: 'offer', sdp: 'dummy' } });
  }, 1500).unref();

  // After a short delay, update booking status via API to trigger booking-updated
  setTimeout(async () => {
    const fetch = global.fetch || require('node-fetch');
    const r = await fetch(base + `/api/bookings/${bookingId}/status`, {
      method: 'PATCH', headers: { 'content-type': 'application/json', Authorization: `Bearer ${lm.data.token}` },
      body: JSON.stringify({ status: 'confirmed' })
    });
    const j = await r.json();
    if (!(j && j.success)) { fail('Failed to update booking status: ' + JSON.stringify(j)); }
  }, 3000).unref();

  // Cleanup after test
  setTimeout(() => { socketM.disconnect(); socketS.disconnect(); ok('Integration test finished'); process.exit(0); }, 7000).unref();
}

run().catch(e=>{ console.error('Fatal:', e); process.exit(2); });
