const mongoose = require('mongoose')
require('dotenv').config()

const User = require('../src/models/User')

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/devlink'

async function run() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  try {
    console.log('Connected to DB:', MONGO_URI)

    // Backup warning
    console.log('WARNING: Make sure you have a DB backup before running this on production')

    // 1) Convert role == 'senior' -> 'mentor'
    const res1 = await User.updateMany({ role: 'senior' }, { $set: { role: 'mentor' } })
    console.log('senior -> mentor:', (res1.nModified || res1.modifiedCount || 0), 'documents updated')

    // 2) Fix misspelled 'junio' -> 'junior'
    const res2 = await User.updateMany({ role: 'junio' }, { $set: { role: 'junior' } })
    console.log('junio -> junior:', (res2.nModified || res2.modifiedCount || 0), 'documents updated')

    // 3) Print role counts
    const agg = await User.aggregate([ { $group: { _id: '$role', count: { $sum: 1 } } } ])
    console.log('Role counts after migration:')
    console.table(agg)

    console.log('Migration complete')
  } catch (err) {
    console.error('Migration error', err)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

run()
