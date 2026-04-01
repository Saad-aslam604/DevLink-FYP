/*
Migration script: migrate_message_statuses.js
- Connects to MongoDB using existing src/config/db.js
- Updates Message.status for existing messages using the following heuristic:
  * If message.readBy has entries => status = 'read'
  * Else if message.createdAt is within RECENT_THRESHOLD_HOURS => status = 'delivered'
  * Else => status = 'sent'

Usage:
  node scripts/migrate_message_statuses.js --dry
  node scripts/migrate_message_statuses.js

Set environment variable STATUS_RECENT_HOURS to change the "recent" window (default 24h).
*/

const connectDB = require('../src/config/db');
const mongoose = require('mongoose');
const Message = require('../src/models/Message');

const RECENT_HOURS = parseInt(process.env.STATUS_RECENT_HOURS || '24', 10);
const BATCH_SIZE = parseInt(process.env.MIGRATE_BATCH_SIZE || '500', 10);

async function computeStatus(doc) {
  try {
    if (Array.isArray(doc.readBy) && doc.readBy.length > 0) return 'read';
    if (doc.status && ['sent', 'delivered', 'read'].includes(String(doc.status))) return String(doc.status);
    const created = doc.createdAt ? new Date(doc.createdAt).getTime() : 0;
    const now = Date.now();
    const recentMs = RECENT_HOURS * 60 * 60 * 1000;
    if (created && (now - created) <= recentMs) return 'delivered';
    return 'sent';
  } catch (e) {
    return doc.status || 'sent';
  }
}

async function migrate(dryRun = false) {
  console.log('Connecting to DB...');
  await connectDB();
  console.log('Connected. Starting migration...');

  let page = 0;
  while (true) {
    const msgs = await Message.find({}).sort({ createdAt: 1 }).skip(page * BATCH_SIZE).limit(BATCH_SIZE).lean();
    if (!msgs || msgs.length === 0) break;
    console.log(`Processing batch ${page + 1} (${msgs.length} messages)`);
    const updates = [];
    for (const m of msgs) {
      const newStatus = await computeStatus(m);
      const prev = m.status || 'undefined';
      if (String(prev) !== String(newStatus)) {
        updates.push({ id: m._id, from: prev, to: newStatus });
        if (!dryRun) {
          try {
            await Message.updateOne({ _id: m._id }, { $set: { status: newStatus } }).exec();
          } catch (e) {
            console.warn('Failed to update message', m._id, e && e.message ? e.message : e);
          }
        }
      }
    }

    if (updates.length) {
      console.log(`Batch ${page + 1} - updates: ${updates.length}`);
      if (dryRun) {
        updates.slice(0, 10).forEach(u => console.log(`DRY: ${u.id} ${u.from} -> ${u.to}`));
      } else {
        updates.slice(0, 10).forEach(u => console.log(`${u.id} ${u.from} -> ${u.to}`));
      }
    } else {
      console.log(`Batch ${page + 1} - no updates`);
    }

    page += 1;
  }

  console.log('Migration completed.');
  // Close mongoose connection
  try { await mongoose.connection.close(false); } catch (e) {}
}

const args = process.argv.slice(2);
const dry = args.includes('--dry') || args.includes('-d');

migrate(dry).catch((err) => {
  console.error('Migration failed', err && err.message ? err.message : err);
  process.exit(1);
});
