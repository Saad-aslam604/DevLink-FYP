const mongoose = require('mongoose');
const path = require('path');

async function main() {
  try {
    const MONGOURI = process.env.MONGO_URI || 'mongodb://localhost:27017/devlink';
    console.log('Connecting to', MONGOURI);
    await mongoose.connect(MONGOURI, { useNewUrlParser: true, useUnifiedTopology: true });
    const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));
    const u = await User.findOne({ firstName: /bilal/i }).lean();
    if (!u) {
      console.log('No user found with firstName matching /bilal/i');
    } else {
      // Print a few relevant fields
      console.log('FOUND USER:');
      console.log(JSON.stringify({ _id: u._id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role, isMentor: u.isMentor, isActive: u.isActive, profileCompleted: u.profileCompleted, avatar: u.avatar }, null, 2));
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
    process.exit(2);
  }
}

main();
