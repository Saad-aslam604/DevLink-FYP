const mongoose = require('mongoose');

const DEFAULT_URI = 'mongodb://localhost:27017/devlink';

const connectDB = async (uri) => {
  const mongoUri = uri || process.env.MONGODB_URI || process.env.MONGO_URI || DEFAULT_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }

  // Mongoose connection options
  const opts = {
    // use the new url parser and unified topology
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // Keep trying to send operations for 5s
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  mongoose.connection.on('connected', () => {
    console.log('MongoDB: connected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB: reconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err && err.message ? err.message : err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB: disconnected - attempting to reconnect');
    // try to reconnect after a delay
    setTimeout(() => connectDB(mongoUri), 2000).unref();
  });

  try {
    await mongoose.connect(mongoUri, opts);
    console.log('MongoDB initial connection established');
  } catch (err) {
    console.error('Initial MongoDB connection failed:', err && err.message ? err.message : err);
    // attempt reconnect with backoff
    setTimeout(() => connectDB(mongoUri), 2000).unref();
  }
};

// Ensure process terminates cleanly
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close(false);
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection on SIGINT:', err);
    process.exit(1);
  }
});

module.exports = connectDB;
