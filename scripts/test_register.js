const http = require('http');

const payload = JSON.stringify({ email: `probe-${Date.now()}@example.com`, password: 'Password123!' });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    try {
      console.log('BODY:', JSON.parse(data));
    } catch (e) {
      console.log('BODY (raw):', data);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.write(payload);
req.end();
