#!/usr/bin/env node
/**
 * Usage:
 *  node scripts/check-reset-token.js email@example.com
 * or
 *  node scripts/check-reset-token.js --token <token>
 *
 * Connects to the project's MongoDB and prints reset token fields for debugging.
 */
require('dotenv').config()
const mongoose = require('mongoose')
const path = require('path')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devlink'

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: node scripts/check-reset-token.js <email>  OR  --token <token>')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  // require user model from src
  const User = require(path.join(__dirname, '..', 'src', 'models', 'User'))

  if (arg === '--token') {
    const token = process.argv[3]
    if (!token) { console.error('Provide token after --token'); process.exit(1) }
    const u = await User.findOne({ resetPasswordToken: token })
    if (!u) {
      console.log('No user found with that token')
    } else {
      console.log('User found:', { id: u._id.toString(), email: u.email })
      console.log('resetPasswordToken:', u.resetPasswordToken)
      console.log('resetPasswordExpires:', u.resetPasswordExpires)
    }
  } else {
    const email = arg
    const u = await User.findOne({ email }).lean()
    if (!u) {
      console.log('No user found with that email')
    } else {
      console.log('User:', { id: u._id.toString(), email: u.email })
      console.log('resetPasswordToken:', u.resetPasswordToken)
      console.log('resetPasswordExpires:', u.resetPasswordExpires)
    }
  }

  await mongoose.disconnect()
  process.exit(0)
}

main().catch((err) => {
  console.error('Error', err)
  process.exit(2)
})
