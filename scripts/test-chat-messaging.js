const { io } = require('socket.io-client');
const { register, login, createBooking, base } = require('./socket-test-utils');

function ok(msg) { console.log('[OK] ' + msg); }
function fail(msg) { console.error('[FAIL] ' + msg); process.exitCode = 2; }

async function run() {
  console.log('Starting chat messaging test against', base);
  const ts = Math.floor(Date.now() / 1000);
  const mentorEmail = `cm_mentor+${ts}@example.com`;
  const studentEmail = `cm_student+${ts}@example.com`;
  const password = 'Password123';

  const m = await register(mentorEmail, password, 'mentor');
  const s = await register(studentEmail, password);
  if (!(m && m.success && s && s.success)) { fail('Register failed'); return; }

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

  let received = 0;
  socketM.on('connect', () => socketM.emit('join-room', { bookingId }));
  socketS.on('connect', () => socketS.emit('join-room', { bookingId }));

  socketM.on('chat-message', (msg) => {
    console.log('mentor recv', msg);
    received++;
    if (received === 2) { ok('Both participants received message'); cleanup(true); }
  });

  socketS.on('chat-message', (msg) => {
    console.log('student recv', msg);
    received++;
    if (received === 2) { ok('Both participants received message'); cleanup(true); }
  });

  function cleanup(success) {
    socketM.disconnect(); socketS.disconnect(); if (!success) process.exitCode = 2;
  }

  // Wait for connections then send messages
  setTimeout(() => {
    socketS.emit('chat-message', { bookingId, content: 'Hello from student' });
    socketM.emit('chat-message', { bookingId, content: 'Hello from mentor' });
  }, 1500).unref();

  setTimeout(() => { if (received < 2) { fail('Not all messages received'); cleanup(false); } }, 8000).unref();
}

run().catch(e=>{ console.error('Fatal:', e); process.exit(2); });
