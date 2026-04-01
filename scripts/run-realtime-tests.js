/*
  run-realtime-tests.js

  Test runner that starts an in-memory MongoDB, launches the app, runs the realtime test scripts,
  and tears everything down.

  Usage: node scripts/run-realtime-tests.js

  Environment:
    - You can set REMINDER_MINUTES or other env vars if needed.
    - Script sets MONGODB_URI and JWT_SECRET for the spawned server.

*/

if (process.env.SYNTAX_CHECK) {
  // Quick require-only path used by CI to validate syntax without side effects
  module.exports = {};
  process.exit(0);
}

const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const fetch = require('node-fetch');
const path = require('path');

const BASE_PORT = process.env.PORT || 5002;
const BASE_URL = (port) => `http://localhost:${port || BASE_PORT}`;

async function waitForServer(url, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const r = await fetch(url + '/');
      if (r.ok) return true;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Server did not become ready in time');
}

async function run() {
  console.log('Starting in-memory MongoDB...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log('MongoDB URI:', uri);

  const env = Object.assign({}, process.env, {
    MONGODB_URI: uri,
    JWT_SECRET: process.env.JWT_SECRET || 'testsecret',
    PORT: String(BASE_PORT),
  });

  console.log('Spawning application server...');
  const server = spawn(process.execPath, [path.join('src', 'index.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });

  server.stdout.on('data', (d) => process.stdout.write('[APP] ' + d.toString()));
  server.stderr.on('data', (d) => process.stderr.write('[APP-ERR] ' + d.toString()));

  let killed = false;
  const cleanup = async () => {
    if (killed) return; killed = true;
    console.log('Cleaning up: stopping server and in-memory MongoDB...');
    try { server.kill(); } catch (e) {}
    try { await mongod.stop(); } catch (e) {}
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    await waitForServer(BASE_URL(BASE_PORT));
    console.log('Server is ready at', BASE_URL(BASE_PORT));
  } catch (e) {
    await cleanup();
    console.error('Server did not start:', e.message);
    process.exit(2);
  }

  const tests = [
    'scripts/test-socket-connection.js',
    'scripts/test-webrtc-signaling.js',
    'scripts/test-chat-messaging.js',
    'scripts/test-notifications.js',
    'scripts/test-integration.js',
  ];

  for (const t of tests) {
    console.log('Running test:', t);
    await new Promise((resolve, reject) => {
      const p = spawn(process.execPath, [t], { env: Object.assign({}, env, { DEVLINK_BASE: BASE_URL(BASE_PORT) }), stdio: 'inherit' });
      p.on('exit', (code) => {
        if (code === 0) resolve(); else reject(new Error(`${t} exited with code ${code}`));
      });
      p.on('error', (err) => reject(err));
    }).catch(async (err) => {
      console.error('Test failed:', err.message);
      await cleanup();
      process.exit(2);
    });
  }

  console.log('All realtime tests passed');
  await cleanup();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Fatal runner error:', err);
  try { process.exit(2); } finally { /* noop */ }
});
