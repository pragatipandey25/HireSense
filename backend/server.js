import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
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

dotenv.config();

connectDB();

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

// 2. CORS — Restrict origins safely (supporting localhost and 127.0.0.1 for local dev)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL.trim());
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, tests) or matching origins
    if (!origin || allowedOrigins.includes(origin)) {
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // generous limit for normal dashboard navigation
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 attempts per 15 min window (prevents locking out during testing)
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // Protect expensive AI endpoints
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analysis', analysisRoutes);

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'HireSense AI',
    tagline: 'Smarter Screening. Better Hiring.',
    message: 'HireSense AI API is running...',
    version: '2.0.0'
  });
});

// Error handling middleware (must be after routes)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 HireSense AI server running on port ${PORT}`);
  console.log('🔒 Security middleware enabled: Helmet, CORS, RateLimiter, Sanitizer, HPP');
});
