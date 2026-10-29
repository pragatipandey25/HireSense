import mongoose from 'mongoose';
import dns from 'dns';

// Required for resolving MongoDB Atlas SRV connection strings reliably on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  console.warn('DNS server configuration warning:', err.message);
}

async function connectDB() {
  if (!process.env.MONGO_URI) {
    console.warn('⚠️ MONGO_URI is not defined in environment variables.');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
  }
}

export default connectDB;
