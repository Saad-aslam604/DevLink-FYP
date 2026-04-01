// Simple Socket.IO smoke test script
// Usage: set env vars STUDENT_TOKEN, MENTOR_TOKEN, BOOKING_ID then run: node scripts/socket_test.js

const io = require('../frontend/node_modules/socket.io-client');

const STUDENT_TOKEN = process.env.STUDENT_TOKEN;
const MENTOR_TOKEN = process.env.MENTOR_TOKEN;
const BOOKING_ID = process.env.BOOKING_ID;
const SERVER = process.env.SERVER || 'http://localhost:5000';

if (!STUDENT_TOKEN || !MENTOR_TOKEN || !BOOKING_ID) {
  console.error('Missing env vars. Set STUDENT_TOKEN, MENTOR_TOKEN and BOOKING_ID');
  process.exit(2);
}

function makeClient(name, token) {
  const socket = io(SERVER, { auth: { token }, transports: ['websocket'] });
  socket.on('connect', () => console.log(`${name} connected (${socket.id})`));
  socket.on('connect_error', (err) => console.error(`${name} connect_error:`, err && err.message ? err.message : err));
  socket.on('chat-message', (payload) => console.log(`${name} received chat-message:`, payload));
  socket.on('chat-history', (msgs) => console.log(`${name} received chat-history (${msgs.length})`));
  socket.on('joined', (p) => console.log(`${name} joined room:`, p));
  socket.on('error', (e) => console.error(`${name} socket error:`, e));
  socket.on('disconnect', (reason) => console.log(`${name} disconnected:`, reason));
  return socket;
}

async function run() {
  console.log('Connecting clients to', SERVER);
  const s = makeClient('STUDENT', STUDENT_TOKEN);
  const m = makeClient('MENTOR', MENTOR_TOKEN);

  // wait for both to connect
  await new Promise((res) => setTimeout(res, 1500));

  console.log('Joining booking room', BOOKING_ID);
  s.emit('join-room', { bookingId: BOOKING_ID });
  m.emit('join-room', { bookingId: BOOKING_ID });

  // wait then request history
  setTimeout(() => {
    s.emit('get-chat-history', { bookingId: BOOKING_ID, limit: 20 });
    m.emit('get-chat-history', { bookingId: BOOKING_ID, limit: 20 });
  }, 500);

  // student sends a message
  setTimeout(() => {
    console.log('STUDENT sending chat-message');
    s.emit('chat-message', { bookingId: BOOKING_ID, content: 'Hello from student (smoke test)', meta: { clientId: 'smoke-1' } });
  }, 1500);

  // after a few seconds close sockets
  setTimeout(() => {
    console.log('Closing sockets');
    s.disconnect();
    m.disconnect();
    process.exit(0);
  }, 5000);
}

run().catch((e) => { console.error('run failed', e); process.exit(1); });
