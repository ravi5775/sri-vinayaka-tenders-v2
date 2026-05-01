require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { pool } = require('./config/database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const loanRoutes = require('./routes/loans');
const investorRoutes = require('./routes/investors');
const notificationRoutes = require('./routes/notifications');
const backupRoutes = require('./routes/backup');
const { auditLogger } = require('./middleware/auditLogger');
const errorHandler = require('./middleware/errorHandler');

function createApp(options = {}) {
  const { isServerless = false } = options;
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
  }));

  app.use((req, res, next) => {
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.removeHeader('X-Powered-By');
    next();
  });

  const corsOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 600,
  }));

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => {
      const email = req.body?.email || '';
      return `${req.ip}:${email}`;
    },
    message: 'Too many login attempts. Please try again after 15 minutes.',
    standardHeaders: false,
  });

  const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyGenerator: (req) => {
      const email = req.body?.email || '';
      return `${req.ip}:${email}`;
    },
    message: 'Too many password reset requests. Please try again after 1 hour.',
    standardHeaders: false,
  });

  const resetPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.ip,
    message: 'Too many password reset attempts. Please try again after 1 hour.',
    standardHeaders: false,
  });

  app.use(compression());
  app.use(express.json({ limit: process.env.API_BODY_LIMIT || '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: process.env.API_BODY_LIMIT || '5mb' }));

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  app.use(auditLogger);

  app.get('/api/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        serverless: isServerless,
      });
    } catch (err) {
      res.status(500).json({
        status: 'error',
        database: 'disconnected',
      });
    }
  });

  app.post('/api/auth/login', loginLimiter);
  app.post('/api/auth/forgot-password', forgotPasswordLimiter);
  app.post('/api/auth/reset-password', resetPasswordLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/loans', loanRoutes);
  app.use('/api/investors', investorRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/backup', backupRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ 
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
        timestamp: new Date().toISOString(),
      }
    });
  });

  // Global error handler (masks sensitive info from public)
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };