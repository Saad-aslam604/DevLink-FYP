const { io } = require('socket.io-client');
const { register, login, createBooking, base } = require('./socket-test-utils');

function ok(msg) { console.log('[OK] ' + msg); }
function fail(msg) { console.error('[FAIL] ' + msg); process.exitCode = 2; }

async function run() {
  console.log('Starting webrtc signaling test against', base);
  const ts = Math.floor(Date.now() / 1000);
  const mentorEmail = `mentor+${ts}@example.com`;
  const studentEmail = `student+${ts}@example.com`;
  const password = 'Password123';

  // Create mentor and student
  const m = await register(mentorEmail, password, 'mentor').catch(e=>({success:false,message:e.message}));
  if (!(m && m.success)) { fail('Mentor register failed: ' + JSON.stringify(m)); return; }
  const sreg = await register(studentEmail, password).catch(e=>({success:false,message:e.message}));
  if (!(sreg && sreg.success)) { fail('Student register failed: ' + JSON.stringify(sreg)); return; }

  const lm = await login(mentorEmail, password);
  const ls = await login(studentEmail, password);
  if (!(lm && lm.success && lm.data && lm.data.token)) { fail('Mentor login failed'); return; }
  if (!(ls && ls.success && ls.data && ls.data.token)) { fail('Student login failed'); return; }

  const mentorToken = lm.data.token;
  const studentToken = ls.data.token;
  const mentorId = lm.data.user._id || lm.data.user.id;

  // Create a booking starting in 1 minute for 5 minutes
  const start = new Date(Date.now() + 60 * 1000).toISOString();
  const end = new Date(Date.now() + 6 * 60 * 1000).toISOString();
  const b = await createBooking(ls.data.token, mentorId, start, end);
  if (!(b && b.success && b.data && b.data.booking)) { fail('Create booking failed: ' + JSON.stringify(b)); return; }
  const bookingId = b.data.booking._id;

  // Connect both clients
  const opt = { reconnection: false, transports: ['websocket'] };
  const socketM = io(base, { auth: { token: mentorToken }, ...opt });
  const socketS = io(base, { auth: { token: studentToken }, ...opt });

  let mReady = false, sReady = false;

  socketM.on('connect', () => { socketM.emit('join-room', { bookingId }); });
  socketS.on('connect', () => { socketS.emit('join-room', { bookingId }); });

  // Wait for server acknowledgment that clients joined the booking room
  socketM.once('joined', () => { mReady = true; checkReady(); });
  socketS.once('joined', () => { sReady = true; checkReady(); });

  function checkReady() {
    if (mReady && sReady) {
      ok('Both clients connected and joined room');
      // Student sends offer and mentor should receive
      socketM.once('webrtc-offer', ({ from, offer }) => {
        ok('Mentor received offer');
        // Mentor responds with answer
        socketM.emit('webrtc-answer', { bookingId, answer: { type: 'answer', sdp: 'dummy' } });
      });

      socketS.once('webrtc-answer', ({ from, answer }) => {
        ok('Student received answer');
        cleanup(true);
      });

      // Student sends offer
      socketS.emit('webrtc-offer', { bookingId, offer: { type: 'offer', sdp: 'dummy' } });
    }
  }

  socketM.on('connect_error', (err) => fail('Mentor connect_error: ' + err.message));
  socketS.on('connect_error', (err) => fail('Student connect_error: ' + err.message));

  function cleanup(success) {
    socketM.disconnect(); socketS.disconnect();
    if (!success) process.exitCode = 2;
  }

  // Timeout fail-safe
  setTimeout(() => { fail('WeRTC signaling test timed out'); cleanup(false); }, 10000).unref();
}

run().catch(e=>{ console.error('Fatal:', e); process.exit(2); });
