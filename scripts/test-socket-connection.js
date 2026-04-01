const { io } = require('socket.io-client');
const { register, login, base } = require('./socket-test-utils');

function ok(msg) { console.log('[OK] ' + msg); }
function fail(msg) { console.error('[FAIL] ' + msg); process.exitCode = 2; }

async function run() {
  console.log('Starting socket connection test against', base);
  const ts = Math.floor(Date.now() / 1000);
  const email = `sockconn+${ts}@example.com`;
  const password = 'Password123';

  // Register
  const r1 = await register(email, password);
  if (!(r1 && r1.success)) { fail('Register failed: ' + JSON.stringify(r1)); return; }

  // Login
  const lj = await login(email, password);
  if (!(lj && lj.success && lj.data && lj.data.token)) { fail('Login failed: ' + JSON.stringify(lj)); return; }
  const token = lj.data.token;

  // Connect socket
  const socket = io(base, { auth: { token }, reconnection: false, transports: ['websocket'] });

  let connected = false;
  socket.on('connect', () => {
    connected = true;
    ok('Socket connected: ' + socket.id);
    socket.disconnect();
  });

  socket.on('connect_error', (err) => {
    fail('Socket connect_error: ' + err.message);
  });

  socket.on('disconnect', () => {
    if (!connected) fail('Socket disconnected before connect');
    else ok('Socket disconnected cleanly');
  });

  // Timeout
  setTimeout(() => {
    if (!connected) fail('Socket did not connect within timeout');
  }, 5000).unref();
}

run().catch(e => { console.error('Test runner fatal:', e); process.exit(2); });
