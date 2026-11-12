import mongoose from 'mongoose';
import dns from 'dns';

// Only override DNS servers on Windows where local ISP / OS SRV resolution fails
if (process.platform === 'win32') {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (err) {
    console.warn('DNS server configuration warning:', err.message);
  }
}

// Global connection promise cache across serverless warm invocations
let cachedPromise = null;

async function connectDB() {
  // 1 = connected
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    console.warn('⚠️ MONGO_URI is not defined in environment variables.');
    return null;
  }

  if (!cachedPromise) {
    // Disable command buffering on serverless to prevent operations hanging for 10s
    mongoose.set('bufferCommands', false);

    cachedPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    }).then((conn) => {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    }).catch((error) => {
      cachedPromise = null;
      console.error(`❌ MongoDB Connection Error: ${error.message}`);
      throw error;
    });
  }

  return cachedPromise;
}

export default connectDB;
