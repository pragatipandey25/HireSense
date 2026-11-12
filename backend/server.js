import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import User from './models/User.js';
import authRoutes from './routes/authRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import { sanitizeAll } from './middleware/sanitizeMiddleware.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load backend/.env, falling back to process.cwd() .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

// Initialize DB connection in background
connectDB().catch((err) => {
  console.warn('Initial DB connection attempt:', err.message);
});

// Optional: Seed initial admin account ONLY if explicit env credentials are provided
mongoose.connection.once('open', async () => {
  try {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const normalizedEmail = adminEmail.trim().toLowerCase();
      const adminExists = await User.findOne({ email: normalizedEmail });
      if (!adminExists) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);
        await User.create({
          name: process.env.INITIAL_ADMIN_NAME || 'HireSense Admin',
          email: normalizedEmail,
          password: hashedPassword,
          role: 'admin'
        });
        console.log(`✅ Initial admin account initialized for ${normalizedEmail}`);
      }
    }
  } catch (error) {
    console.error('⚠️ Admin initialization notice:', error.message);
  }
});

const app = express();

// ============================================================
// 🔒 SECURITY MIDDLEWARE STACK
// ============================================================

// 1. Helmet — Set secure HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Disabled for pure REST API
}));

// 2. CORS — Restrict origins safely (supporting localhost, 127.0.0.1, Vercel deployments, & custom CLIENT_URL)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'https://hire-sense-six.vercel.app',
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL.trim());
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests, allowed origins, and any preview/production Vercel deployments
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Rate Limiting — Prevent brute force / abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'AI analysis rate limit exceeded. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/analysis/', aiLimiter);

// 4. Body parsing
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// 5. Custom Sanitization (strip $ operators, prevent NoSQL injection in body/query/params)
app.use(sanitizeAll);

// 6. HTTP Parameter Pollution protection
app.use(hpp());

// Fast Healthcheck / API status (does NOT block on database connection)
app.get(['/', '/api', '/api/health'], (req, res) => {
  const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const currentDbState = dbStates[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    status: 'ok',
    app: 'HireSense AI',
    tagline: 'Smarter Screening. Better Hiring.',
    message: 'HireSense AI API is running...',
    version: '2.0.0',
    database: currentDbState,
    hasMongoUri: Boolean(process.env.MONGO_URI),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 7. Ensure DB connection is active before processing database routes
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (err) {
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Please verify MONGO_URI in your Vercel Environment Variables and ensure MongoDB Atlas Network Access has 0.0.0.0/0 whitelisted.',
        error: process.env.NODE_ENV !== 'production' ? err.message : undefined
      });
    }
  }
  next();
});

// Routes — mounted with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analysis', analysisRoutes);

// Serverless fallback aliases (in case proxy strips /api prefix)
app.use('/auth', authRoutes);
app.use('/resumes', resumeRoutes);
app.use('/jobs', jobRoutes);
app.use('/applications', applicationRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/analysis', analysisRoutes);

// Error handling middleware (must be after routes)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 HireSense AI server running on port ${PORT}`);
    console.log('🔒 Security middleware enabled: Helmet, CORS, RateLimiter, Sanitizer, HPP');
  });
}

export default app;
