const {
  backupToLocal,
  backupToMongoDB,
  backupToGoogleDrive,
  ensureBackupDir,
} = require('../services/backupService');

// Store job IDs for cleanup
let jobs = [];

/**
 * Start scheduled backup jobs
 * - Every 3 hours: Full backup to MongoDB Atlas
 * - Every 6 hours: Full backup to Google Drive
 * - Continuous: Local backups with transaction triggers
 */
const startScheduledBackups = () => {
  ensureBackupDir();
  console.log('🕐 Starting scheduled backup jobs...');

  // 3-hour MongoDB backup (10800000ms = 3 hours)
  const mongodbJobId = setInterval(async () => {
    try {
      console.log('🔄 [MongoDB] Running scheduled backup...');
      const result = await backupToMongoDB();
      console.log(`✅ [MongoDB] Backup completed at ${result.timestamp}`);
    } catch (err) {
      console.error('❌ [MongoDB] Backup failed:', err.message);
    }
  }, 3 * 60 * 60 * 1000); // 3 hours

  // 6-hour Google Drive backup (21600000ms = 6 hours)
  const googleDriveJobId = setInterval(async () => {
    try {
      console.log('🔄 [Google Drive] Running scheduled backup...');
      const result = await backupToGoogleDrive('sri-vinayaka-auto-backups');
      console.log(`✅ [Google Drive] Backup completed at ${result.timestamp}`);
    } catch (err) {
      console.error('❌ [Google Drive] Backup failed:', err.message);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours

  jobs = [mongodbJobId, googleDriveJobId];

  console.log('✅ Scheduled backups started:');
  console.log('   📦 MongoDB Atlas: Every 3 hours');
  console.log('   📁 Google Drive: Every 6 hours');
  console.log('   📊 Local: On transaction triggers (every 3 transactions)');
  console.log('   📱 Manual: Available via API endpoints');
};

/**
 * Stop all scheduled backup jobs
 */
const stopScheduledBackups = () => {
  jobs.forEach(jobId => clearInterval(jobId));
  console.log('⏹️ Scheduled backup jobs stopped');
};

/**
 * Trigger immediate backup to all destinations (manual)
 */
const triggerFullBackup = async () => {
  try {
    console.log('🚀 Triggering full backup to all destinations...');
    
    const results = await Promise.allSettled([
      backupToLocal(),
      backupToMongoDB(),
      backupToGoogleDrive('sri-vinayaka-manual-backups'),
    ]);

    const summary = {
      timestamp: new Date().toISOString(),
      results: results.map((r, i) => ({
        destination: ['local', 'mongodb', 'google-drive'][i],
        status: r.status,
        value: r.value,
        reason: r.reason?.message,
      })),
      allSuccessful: results.every(r => r.status === 'fulfilled'),
    };

    console.log('📊 Full backup summary:', JSON.stringify(summary, null, 2));
    return summary;
  } catch (err) {
    console.error('❌ Full backup error:', err);
    throw err;
  }
};

/**
 * Trigger backup to specific destination
 */
const triggerBackupToDestination = async (destination) => {
  try {
    switch (destination.toLowerCase()) {
      case 'local':
        return await backupToLocal();
      case 'mongodb':
      case 'mongo':
        return await backupToMongoDB();
      case 'google-drive':
      case 'google':
        return await backupToGoogleDrive('sri-vinayaka-manual-backups');
      default:
        throw new Error(`Unknown backup destination: ${destination}`);
    }
  } catch (err) {
    console.error(`❌ Backup to ${destination} failed:`, err);
    throw err;
  }
};

module.exports = {
  startScheduledBackups,
  stopScheduledBackups,
  triggerFullBackup,
  triggerBackupToDestination,
};
