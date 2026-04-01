const mongoose = require('mongoose');
const path = require('path');

async function main(){
  try{
    const MONGOURI = process.env.MONGO_URI || 'mongodb://localhost:27017/devlink';
    console.log('Connecting to', MONGOURI);
    await mongoose.connect(MONGOURI, { useNewUrlParser: true, useUnifiedTopology: true });
    const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));
    const filter = { isActive: true, $or: [{ isMentor: true }, { role: 'mentor' }, { role: 'both' }] };
  const sortObj = { rating: -1, lastActive: -1 };
    const results = await User.find(filter).sort(sortObj).limit(200).lean();
    console.log('Total mentors found (up to 200):', results.length);
    const idx = results.findIndex(u => String(u._id) === '692f44297b720f8372ff2859');
    console.log('Bilal index in results (0-based):', idx);
    if (idx >= 0) {
      const u = results[idx];
      console.log('Bilal entry:', JSON.stringify({ _id:u._id, firstName:u.firstName, role:u.role, isMentor:u.isMentor, isActive:u.isActive, rating:u.rating, lastActive:u.lastActive }, null, 2));
    } else {
      // If not found, try to print statistics about ratings distribution
      const hasZero = results.some(r => (r.rating || 0) === 0);
      console.log('Found any with rating 0?', hasZero);
    }
    await mongoose.disconnect();
    process.exit(0);
  }catch(err){
    console.error('ERROR', err && err.message? err.message: err);
    process.exit(2);
  }
}

main();
