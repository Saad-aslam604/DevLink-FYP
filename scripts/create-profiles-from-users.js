/**
 * One-off migration: copy essential profile fields from `users` collection to a
 * separate `profiles` collection. This can help teams that expect a `profiles`
 * collection to exist. Run with: `node scripts/create-profiles-from-users.js`
 */
require('dotenv').config()
const mongoose = require('mongoose')
const connectDB = require('../src/config/db')

async function run() {
  try {
    await connectDB()
    const User = require('../src/models/User')

    const users = await User.find({}).lean().exec()
    console.log(`Found ${users.length} users. Creating/updating profiles collection...`)

    const profilesColl = mongoose.connection.collection('profiles')

    let count = 0
    for (const u of users) {
      const doc = {
        userId: u._id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        avatar: u.avatar || '',
        bio: u.bio || '',
        title: u.title || '',
        company: u.company || '',
        skills: Array.isArray(u.skills) ? u.skills : (u.skills ? [u.skills] : []),
        experienceLevel: u.experienceLevel || u.experience || '',
        hourlyRate: u.hourlyRate || 0,
        updatedAt: new Date(),
      }

      await profilesColl.updateOne({ userId: u._id }, { $set: doc }, { upsert: true })
      count++
    }

    console.log(`Profiles migrated/updated: ${count}`)
    process.exit(0)
  } catch (err) {
    console.error('Migration error:', err)
    process.exit(1)
  }
}

run()
