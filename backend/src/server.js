require('dotenv').config();

// ─── Startup Guards: Fail fast if critical env vars are missing ────
const REQUIRED_ENV = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} is not defined in environment. Exiting.`);
    process.exit(1);
  }
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { pool, testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const loanRoutes = require('./routes/loans');
const investorRoutes = require('./routes/investors');
const notificationRoutes = require('./routes/notifications');
const backupRoutes = require('./routes/backup');
const csrfRoutes = require('./routes/csrf');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Trust proxy (for correct IP behind reverse proxy) ────
app.set('trust proxy', 1);

// ─── Security Middleware ────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xContentTypeOptions: true,
  xFrameOptions: { action: 'deny' },
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.removeHeader('X-Powered-By');
  next();
});

app.use(cors({
  origin: (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  maxAge: 600, // Preflight cache 10 min
}));

// ─── Rate Limiting (disabled for hosted server) ────────────
// Rate limiting is intentionally disabled to avoid issues behind reverse proxies/load balancers.
// The hosting infrastructure (e.g., Cloudflare, Nginx) should handle rate limiting instead.

// ─── Body Parsing with size limits ──────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ─── Logging ────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Health Check ───────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
    });
  }
});

// ─── API Routes ─────────────────────────────
app.use('/api/csrf-token', csrfRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/investors', investorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/backup', backupRoutes);

// ─── Serve Frontend (Production) ────────────
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

// ─── 404 Handler ────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Error Handler (never leak stack traces) ─
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start Server ───────────────────────────
const { autoMigrate } = require('./config/autoMigrate');

const startServer = async () => {
  await testConnection();
  await autoMigrate();
  app.listen(PORT, () => {
    console.log(`\n🚀 Sri Vinayaka Backend running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
