import mongoose from 'mongoose';
import dns from 'dns';

// Required for resolving MongoDB Atlas SRV connection strings reliably on Windows & serverless
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  console.warn('DNS server configuration warning:', err.message);
}

// Global connection promise cache across serverless warm invocations
let cachedPromise = null;

async function connectDB() {
  // 1 = connected, 2 = connecting
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    console.warn('⚠️ MONGO_URI is not defined in environment variables.');
    return;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
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
