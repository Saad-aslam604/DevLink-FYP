/*
Run this script from the project root to seed 5 test mentor applications for the Admin UI.
It uses your project's MONGODB_URI from the root .env if present.

Usage (PowerShell):
  node scripts/seed_mentor_apps.js

This is safe for local development: it only touches the MentorApplication collection and marks seeds with devSeed=true.
*/

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })
const mongoose = require('mongoose')
const MentorApplication = require('../src/models/MentorApplication')

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/devlink'
  console.log('Connecting to', uri)
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })

  console.log('Cleaning previous dev seeds...')
  await MentorApplication.deleteMany({ devSeed: true })

  const now = new Date()
  const docs = [
    // High quality -> Approve
    {
      userId: new mongoose.Types.ObjectId(),
      title: 'Senior React Mentor',
      bio: 'Experienced React developer and architect.',
      skills: ['react','typescript','redux','jest','vite','webpack'],
      expertise: ['frontend','react'],
      requestedRate: 25,
      yearsOfExperience: 6,
      status: 'pending',
      submittedAt: now,
      devSeed: true
    },
    // Two average -> Review
    {
      userId: new mongoose.Types.ObjectId(),
      title: 'Frontend Engineer',
      bio: 'Building UIs for 2 years.',
      skills: ['react','css','html'],
      expertise: ['frontend'],
      requestedRate: 40,
      yearsOfExperience: 2,
      status: 'pending',
      submittedAt: now,
      devSeed: true
    },
    {
      userId: new mongoose.Types.ObjectId(),
      title: 'Fullstack Dev',
      bio: 'Some backend and frontend experience.',
      skills: ['node','react'],
      expertise: ['fullstack'],
      requestedRate: 35,
      yearsOfExperience: 3,
      status: 'pending',
      submittedAt: now,
      devSeed: true
    },
    // Two weak -> Reject
    {
      userId: new mongoose.Types.ObjectId(),
      title: 'Junior Dev',
      bio: '',
      skills: [],
      expertise: [],
      requestedRate: 60,
      yearsOfExperience: 0,
      status: 'pending',
      submittedAt: now,
      devSeed: true
    },
    {
      userId: new mongoose.Types.ObjectId(),
      title: '',
      bio: 'Looking to learn.',
      skills: [],
      expertise: [],
      requestedRate: 80,
      yearsOfExperience: 1,
      status: 'pending',
      submittedAt: now,
      devSeed: true
    }
  ]

  const res = await MentorApplication.insertMany(docs)
  console.log('Inserted test applications:', res.map(r => ({ id: r._id, title: r.title || '(no title)', yearsOfExperience: r.yearsOfExperience, skills: r.skills && r.skills.length })))

  await mongoose.disconnect()
  console.log('Done')
}

main().catch(err => { console.error(err); process.exit(1) })
