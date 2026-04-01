#!/usr/bin/env node
/**
 * Migration script: ensure every booking has at least one linked welcome message
 * Usage: node scripts/fix-messages.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../src/config/db');
const mongoose = require('mongoose');

async function run() {
  try {
    await connectDB(process.env.MONGO_URI || process.env.MONGODB_URI);

    const Booking = require('../src/models/Booking');
    const Message = require('../src/models/Message');
    const User = require('../src/models/User');

    const bookings = await Booking.find({}).populate('mentor student', 'firstName lastName avatar').exec();
    console.log(`Found ${bookings.length} bookings`);

    let created = 0;
    for (const bk of bookings) {
      try {
        const existing = await Message.findOne({ booking: bk._id }).exec();
        if (existing) {
          console.log(`Booking ${bk._id}: already has message ${existing._id}`);
          continue;
        }

        const mentor = bk.mentor;
        const start = bk.startTime ? new Date(bk.startTime).toLocaleString() : '';
        const content = `Hello! I'm looking forward to our session on ${start}. Feel free to message me with any questions!`;

        const msg = await Message.create({ booking: bk._id, sender: mentor._id, content, meta: { system: true } });
        created++;
        console.log(`Created message for booking ${bk._id} -> Total created: ${created}`);
      } catch (err) {
        console.error(`Failed processing booking ${bk._id}:`, err && err.message ? err.message : err);
      }
    }

    console.log(`Migration complete. Messages created: ${created}`);
    // close mongoose connection
    await mongoose.connection.close(false);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
