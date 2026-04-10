const nodemailer = require('nodemailer');

const getResetUrl = (token) => `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${token}`;

// Create transporter
let transporter = null;

const initializeTransporter = () => {
  if (transporter) return transporter;

  const emailConfig = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  };

  // Dev mode fallback: log instead of sending
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Using console logging mode.');
    return null;
  }

  try {
    transporter = nodemailer.createTransport(emailConfig);
    console.log('✅ Email transporter initialized');
    return transporter;
  } catch (error) {
    console.error('❌ Email transporter error:', error.message);
    return null;
  }
};

exports.sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = getResetUrl(resetToken);

  // Try to send real email
  const transport = initializeTransporter();
  
  if (!transport) {
    // Fallback: console logging for dev
    console.log('\n🔐 PASSWORD RESET LINK (Console Mode):');
    console.log('📧 Email:', email);
    console.log('🔗 URL:', resetUrl);
    console.log('⏰ Expires: 1 hour');
    console.log('---');
    return;
  }

  try {
    const mailOptions = {
      from: `"DevLink" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your DevLink Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #666; font-size: 14px;">
              We received a request to reset the password for your DevLink account. 
              If you didn't make this request, you can safely ignore this email.
            </p>

            <div style="margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">
              Or copy this link in your browser:
              <br />
              <code style="background-color: #e9ecef; padding: 5px 10px; border-radius: 3px; display: block; margin-top: 10px; word-break: break-all;">
                ${resetUrl}
              </code>
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px;">
              This link will expire in 1 hour.
              <br />
              DevLink Team
            </p>
          </div>
        </div>
      `,
      text: `
Password Reset Request

We received a request to reset the password for your DevLink account.
If you didn't make this request, you can safely ignore this email.

Reset your password here:
${resetUrl}

This link will expire in 1 hour.

DevLink Team
      `,
    };

    const info = await transport.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw new Error(`Email send failed: ${error.message}`);
  }
};
