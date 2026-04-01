const fetch = global.fetch || require('node-fetch');
const base = process.env.DEVLINK_BASE || 'http://localhost:5002';

async function register(email, password = 'Password123', role = 'junior') {
  const r = await fetch(base + '/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });
  return r.json();
}

async function login(email, password = 'Password123') {
  const r = await fetch(base + '/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return r.json();
}

async function createBooking(token, mentorId, startTime, endTime) {
  const r = await fetch(base + '/api/bookings', {
    method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    // Include meetingType default for tests (server requires this field)
    body: JSON.stringify({ mentorId, startTime, endTime, meetingType: 'video-call' })
  });
  return r.json();
}

module.exports = { base, register, login, createBooking };
