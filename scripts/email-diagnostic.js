#!/usr/bin/env node
/**
 * Email credentials diagnostic
 */
require('dotenv').config({ path: '.env' });

console.log('🔍 Email Configuration Diagnostic\n');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS length:', (process.env.EMAIL_PASS || '').length);
console.log('EMAIL_PASS (first 4 chars):', (process.env.EMAIL_PASS || '').substring(0, 4) + '****');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('\n✅ Next steps:');
console.log('1. Verify the app password is exactly 16 characters without spaces');
console.log('2. Re-generate from: https://myaccount.google.com/apppasswords');
console.log('3. Copy the full 16-character password WITHOUT spaces');
console.log('4. Update .env and run test again');
