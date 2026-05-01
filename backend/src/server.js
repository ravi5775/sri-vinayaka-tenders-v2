require('dotenv').config();

const { createApp } = require('./app');
const { testConnection } = require('./config/database');
const { autoMigrate } = require('./config/autoMigrate');
const { startScheduledBackups } = require('./config/scheduledBackups');
const { startDailyBackupJob } = require('./config/dailyBackupScheduler');

const PORT = process.env.PORT || 5000;
const app = createApp({ isServerless: false });

const requiresDatabaseUrl = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET is not defined.');
}
if (requiresDatabaseUrl && !process.env.DATABASE_URL) {
  throw new Error('FATAL: DATABASE_URL is required for production/serverless runtime.');
}

const startServer = async () => {
  await testConnection();

  // Auto-migration is intentionally opt-in to avoid cold-start lockups in serverless deployments.
  if (process.env.AUTO_MIGRATE_ON_BOOT === 'true') {
    await autoMigrate();
  }

  // Start scheduled backup jobs if enabled
  if (process.env.ENABLE_SCHEDULED_BACKUPS !== 'false') {
    startScheduledBackups();
  }

  // Start daily backup email job
  startDailyBackupJob();

  app.listen(PORT, () => {
    console.log(`\nSri Vinayaka backend running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
