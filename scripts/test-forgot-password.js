#!/usr/bin/env node
/**
 * Test forgot-password endpoint with real email
 */

const http = require('http');

const testData = JSON.stringify({
  email: 'test@example.com'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/forgot-password',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length
  }
};

console.log('🔄 Testing forgot-password endpoint...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📊 Response Status:', res.statusCode);
    console.log('📋 Response Body:', JSON.stringify(JSON.parse(data), null, 2));
    
    if (res.statusCode === 200) {
      console.log('\n✅ Endpoint working! Check Gmail for reset email.');
    } else {
      console.log('\n❌ Endpoint returned error');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection failed:', error.message);
  console.log('\n💡 Make sure backend is running on port 5000');
  console.log('   Run: npm start');
});

req.write(testData);
req.end();
