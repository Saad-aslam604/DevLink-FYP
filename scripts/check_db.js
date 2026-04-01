require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devlink';

async function main() {
  console.log('Using MONGODB_URI=', MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
  } catch (err) {
    console.error('Initial connection failed:', err && err.message ? err.message : err);
  }

  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  console.log('Mongoose connection state:', mongoose.connection.readyState, stateMap[mongoose.connection.readyState]);

  // require User model from src
  try {
    const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));
    const count = await User.countDocuments();
    console.log('Users collection count:', count);
    const recent = await User.find({}).sort({ createdAt: -1 }).limit(5).select('-password');
    console.log('Most recent users:', recent.map(u => ({ id: u._id, email: u.email, createdAt: u.createdAt })));
  } catch (err) {
    console.error('Error querying User model:', err && err.message ? err.message : err);
  }

  // show some driver info
  try {
    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    const serverStatus = await admin.serverStatus();
    console.log('Server status ok:', !!serverStatus.ok);
  } catch (err) {
    console.warn('Could not retrieve serverStatus:', err && err.message ? err.message : err);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
