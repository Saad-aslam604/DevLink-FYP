#!/usr/bin/env node
/**
 * Test email service - verify password reset emails work
 * Usage: node scripts/test-email.js
 */

require('dotenv').config({ path: '.env' });
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🔧 Testing Email Configuration...\n');

  // Check configuration
  const config = {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? '***' : 'NOT SET',
  };

  console.log('📋 Current Configuration:');
  console.table(config);
  console.log();

  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-gmail@gmail.com' || !process.env.EMAIL_PASS) {
    console.error('❌ Email credentials not configured!');
    console.log('\n📝 SETUP INSTRUCTIONS:');
    console.log('\n1️⃣  Enable 2-Step Verification on your Google Account');
    console.log('   Visit: https://myaccount.google.com/security');
    console.log('\n2️⃣  Generate an App Password');
    console.log('   Visit: https://myaccount.google.com/apppasswords');
    console.log('   Select: Mail, Windows Computer');
    console.log('   Copy the 16-character password\n');
    console.log('3️⃣  Update your .env file:');
    console.log('   EMAIL_USER=your-email@gmail.com');
    console.log('   EMAIL_PASS=your-16-character-app-password\n');
    console.log('4️⃣  Run this test again: node scripts/test-email.js\n');
    process.exit(1);
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });

    console.log('🔗 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');

    // Send test email
    const testEmail = process.env.EMAIL_USER; // Send to own email
    console.log(`📧 Sending test email to: ${testEmail}`);

    const info = await transporter.sendMail({
      from: `"DevLink Test" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: '✅ DevLink Email Test - Password Reset Working',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #4f46e5;">✅ Email System Working!</h2>
            
            <p style="color: #666;">
              This is a test email to verify that your DevLink password reset email system is working correctly.
            </p>

            <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <strong style="color: #155724;">Status: All systems operational</strong>
              <ul style="margin: 10px 0 0 0; color: #155724;">
                <li>✅ SMTP connection successful</li>
                <li>✅ Email delivery verified</li>
                <li>✅ HTML formatting working</li>
              </ul>
            </div>

            <p style="color: #666; font-size: 14px;">
              Users can now reset their passwords and receive actual email instructions at their registered email addresses.
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px;">
              Test sent at: ${new Date().toISOString()}
              <br />
              DevLink Team
            </p>
          </div>
        </div>
      `,
    });

    console.log('✅ Email sent successfully!');
    console.log('\n📨 Message ID:', info.messageId);
    console.log('📊 Response:', info.response);
    console.log('\n🎉 Password reset emails are now fully functional!\n');

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Verify EMAIL_USER and EMAIL_PASS are correct');
    console.log('2. For Gmail: Use an "App Password", not your regular password');
    console.log('   Generate here: https://myaccount.google.com/apppasswords');
    console.log('3. Check if Gmail "Less secure app access" is enabled');
    console.log('4. Verify internet connection and firewall settings\n');
    process.exit(1);
  }
}

testEmail();
