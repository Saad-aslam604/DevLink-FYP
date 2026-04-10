#!/usr/bin/env node
/**
 * Comprehensive email + forgot-password test with detailed logging
 */

require('dotenv').config({ path: '.env' });
const http = require('http');

console.log('🔧 COMPREHENSIVE EMAIL TEST\n');

// Test 1: Email service directly
console.log('═══════════════════════════════════════');
console.log('TEST 1: Email Service Direct');
console.log('═══════════════════════════════════════\n');

const { sendPasswordResetEmail } = require('../src/utils/emailService');

(async () => {
  try {
    console.log('📧 Sending test email directly...');
    const result = await sendPasswordResetEmail('talhazulfiqar8334@gmail.com', 'test-token-12345');
    console.log('✅ Direct email result:', result);
  } catch (error) {
    console.error('❌ Direct email error:', error.message);
  }

  // Test 2: Forgot-password endpoint
  console.log('\n═══════════════════════════════════════');
  console.log('TEST 2: Forgot-Password Endpoint');
  console.log('═══════════════════════════════════════\n');

  const testData = JSON.stringify({
    email: 'talhazulfiqar8334@gmail.com'
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

  console.log('🔄 Posting to /api/auth/forgot-password...');

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📊 Response Status:', res.statusCode);
      try {
        const parsed = JSON.parse(data);
        console.log('📋 Response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('📋 Response (raw):', data);
      }

      console.log('\n═══════════════════════════════════════');
      console.log('✅ TESTS COMPLETE');
      console.log('═══════════════════════════════════════');
      console.log('\n✨ Check your Gmail inbox for emails!');
      console.log('   Email: talhazulfiqar8334@gmail.com');
    });
  });

  req.on('error', (error) => {
    console.error('❌ Connection error:', error.message);
  });

  req.write(testData);
  req.end();
})();
