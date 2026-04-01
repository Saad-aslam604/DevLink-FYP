// Console-only email service for development/testing.
// This intentionally does NOT send real emails. It simply logs the reset link
// so developers can copy it and test the password reset flow manually.

const getResetUrl = (token) => `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${token}`

exports.sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = getResetUrl(resetToken)

  // Log a simple, copyable message so testers can paste into the browser.
  console.log('RESET LINK:', resetUrl)
  console.log('RESET TOKEN:', resetToken, 'FOR EMAIL:', email)

  // Keep async signature for compatibility with callers.
  return Promise.resolve()
}
