const express = require('express');
const { authenticate } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { getMongoClient } = require('../config/mongodb');
const { sendEmail } = require('../config/email');
const { backupEmailTemplate } = require('../templates/emailTemplates');
const { pool } = require('../config/database');
const { body, validationResult } = require('express-validator');
const {
  fetchBackupData,
  backupToLocal,
  backupToMongoDB,
  backupToGoogleDrive,
  getTransactionCounter,
  resetTransactionCounter,
} = require('../services/backupService');

const router = express.Router();
router.use(authenticate);
router.use(requireAdmin); // ✅ ALL backup endpoints require admin role

const APP_NAME = 'Sri Vinayaka Tenders';

/**
 * Mask sensitive data from response (for admin visibility but safety)
 */
const maskSensitiveData = (data) => {
  if (typeof data !== 'object') return data;
  
  const masked = { ...data };
  
  // Mask database connection strings
  if (masked.mongodb_uri) {
    masked.mongodb_uri = 'mongodb://***:***@*.mongodb.net/***';
  }
  if (masked.database_url) {
    masked.database_url = 'postgresql://***:***@localhost/***';
  }
  
  // Mask API keys
  if (masked.api_key) {
    masked.api_key = '***' + masked.api_key.slice(-4);
  }
  
  // Mask email addresses (partial)
  if (masked.email && typeof masked.email === 'string') {
    const [name, domain] = masked.email.split('@');
    masked.email = name.substring(0, 2) + '***@' + domain;
  }
  
  return masked;
};

// #5 Fix: Validate backup data structure
const validateBackupStructure = (data) => {
  if (!data || typeof data !== 'object') return 'Backup data must be an object';
  if (!data.loans && !data.investors) return 'Backup must contain loans or investors';

  if (data.loans && !Array.isArray(data.loans)) return 'loans must be an array';
  if (data.investors && !Array.isArray(data.investors)) return 'investors must be an array';

  // Validate loan structure
  if (data.loans) {
    for (let i = 0; i < data.loans.length; i++) {
      const loan = data.loans[i];
      if (!loan.customerName || typeof loan.customerName !== 'string') {
        return `loans[${i}].customerName is required and must be a string`;
      }
      if (!loan.loanType || !['Finance', 'Tender', 'InterestRate'].includes(loan.loanType)) {
        return `loans[${i}].loanType must be Finance, Tender, or InterestRate`;
      }
      if (typeof loan.loanAmount !== 'number' || loan.loanAmount < 0) {
        return `loans[${i}].loanAmount must be a non-negative number`;
      }
    }
  }

  // Validate investor structure
  if (data.investors) {
    for (let i = 0; i < data.investors.length; i++) {
      const inv = data.investors[i];
      if (!inv.name || typeof inv.name !== 'string') {
        return `investors[${i}].name is required and must be a string`;
      }
      if (!inv.investmentType || typeof inv.investmentType !== 'string') {
        return `investors[${i}].investmentType is required`;
      }
    }
  }

  return null; // Valid
};

// ═══════════════════════════════════════════════════════════════
// MANUAL BACKUP ENDPOINTS - All Destinations
// ═══════════════════════════════════════════════════════════════

// POST /api/backup/full - Manual backup to ALL destinations
router.post('/full', async (req, res) => {
  try {
    console.log(`🚀 Admin ${req.user.email} triggered full backup`);
    
    const results = await Promise.allSettled([
      backupToLocal(),
      backupToMongoDB(),
      backupToGoogleDrive('sri-vinayaka-manual-backups'),
    ]);

    const summary = {
      timestamp: new Date().toISOString(),
      triggeredBy: maskSensitiveData({ email: req.user.email }),
      backups: {
        local: results[0].status === 'fulfilled' ? { status: 'success', timestamp: results[0].value?.timestamp } : { status: 'failed' },
        mongodb: results[1].status === 'fulfilled' ? { status: 'success', timestamp: results[1].value?.timestamp } : { status: 'failed' },
        googleDrive: results[2].status === 'fulfilled' ? { status: 'success', timestamp: results[2].value?.timestamp } : { status: 'failed' },
      },
      allSuccessful: results.every(r => r.status === 'fulfilled'),
    };

    console.log('✅ Full backup completed:', summary.allSuccessful ? 'SUCCESS' : 'PARTIAL');
    res.json(summary);
  } catch (err) {
    console.error('Full backup error:', err);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'BACKUP_ERROR',
        message: 'Backup operation failed',
        timestamp: new Date().toISOString(),
      }
    });
  }
});

// POST /api/backup/local - Manual backup to LOCAL device
router.post('/local', async (req, res) => {
  try {
    console.log(`💾 Admin ${req.user.email} triggered local backup`);
    const result = await backupToLocal();
    res.json({ 
      success: true,
      status: 'success', 
      message: 'Local backup created successfully',
      timestamp: result?.timestamp 
    });
  } catch (err) {
    console.error('Local backup error:', err);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'LOCAL_BACKUP_ERROR',
        message: 'Local backup failed',
        timestamp: new Date().toISOString(),
      }
    });
  }
});

// POST /api/backup/mongodb - Manual backup to MongoDB Atlas
router.post('/mongodb', async (req, res) => {
  try {
    console.log(`🗄️ Admin ${req.user.email} triggered MongoDB backup`);
    const result = await backupToMongoDB();
    res.json({ 
      success: true,
      status: 'success', 
      message: 'MongoDB Atlas backup created successfully',
      timestamp: result?.timestamp 
    });
  } catch (err) {
    console.error('MongoDB backup error:', err);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'MONGODB_BACKUP_ERROR',
        message: 'MongoDB backup failed',
        timestamp: new Date().toISOString(),
      }
    });
  }
});

// POST /api/backup/google-drive - Manual backup to Google Drive
router.post('/google-drive', async (req, res) => {
  try {
    console.log(`📁 Admin ${req.user.email} triggered Google Drive backup`);
    const folderName = req.body.folderName || 'sri-vinayaka-manual-backups';
    const result = await backupToGoogleDrive(folderName);
    res.json({ 
      success: true,
      status: 'success', 
      message: 'Google Drive backup created successfully',
      timestamp: result?.timestamp 
    });
  } catch (err) {
    console.error('Google Drive backup error:', err);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'GOOGLE_DRIVE_BACKUP_ERROR',
        message: 'Google Drive backup failed',
        timestamp: new Date().toISOString(),
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// BACKUP METADATA & STATUS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// GET /api/backup/status - Check backup status and transaction counter
router.get('/status', async (req, res) => {
  try {
    const transactionCounter = getTransactionCounter();

    res.json({
      success: true,
      status: 'ok',
      transactionCounter,
      transactionsUntilBackup: Math.max(0, 3 - transactionCounter),
      nextBackupTrigger: transactionCounter >= 3 ? 'pending' : 'waiting',
      schedules: {
        mongodbAtlas: 'Every 3 hours',
        googleDrive: 'Every 6 hours',
        local: 'Per 3 transactions + Manual',
      },
    });
  } catch (err) {
    console.error('Backup status error:', err);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'STATUS_CHECK_ERROR',
        message: 'Failed to check backup status',
        timestamp: new Date().toISOString(),
      }
    });
  }
});

// GET /api/backup/metadata - List all backup metadata
router.get('/metadata', async (req, res) => {
  try {
    const db = await getMongoClient();
    const collection = db.collection('backups');
    
    const backups = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    res.json({
      success: true,
      totalBackups: backups.length,
      recentBackups: backups.map(b => ({
        timestamp: b.timestamp || b.createdAt,
        source: b.source || 'manual',
        loansCount: b.summary?.loans || 0,
        investorsCount: b.summary?.investors || 0,
        transactionsCount: b.summary?.transactions || 0,
      })),
    });
  } catch (err) {
    console.error('Get backup metadata error:', err);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'METADATA_ERROR',
        message: 'Failed to retrieve backup metadata',
        timestamp: new Date().toISOString(),
      }
    });
  }
});


// POST /api/backup/email - Send backup file via email
router.post('/email', async (req, res) => {
  try {
    const data = await fetchBackupData();
    const userResult = await pool.query(
      'SELECT u.email, p.display_name FROM users u LEFT JOIN profiles p ON u.id::text = p.id::text WHERE u.id = $1',
      [req.user.id]
    );
    const adminEmail = userResult.rows[0]?.email;
    const displayName = userResult.rows[0]?.display_name || 'Admin';

    const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const attachment = {
      filename: fileName,
      content: JSON.stringify(data, null, 2),
      contentType: 'application/json',
    };
    const stats = {
      loans: data.loans?.length || 0,
      investors: data.investors?.length || 0,
      totalTransactions: data.summary?.totalTransactions || 0,
    };

    const html = backupEmailTemplate(displayName, fileName, stats);
    const emailResult = await sendEmail(adminEmail, `📦 Data Backup Report`, html, [attachment]);

    res.json({
      success: emailResult.success,
      status: emailResult.success ? 'success' : 'failed',
      message: emailResult.success ? 'Backup email sent' : 'Failed to send email',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Backup email error:', err);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'EMAIL_SEND_ERROR',
        message: 'Failed to send backup email',
        timestamp: new Date().toISOString(),
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// RESET & MAINTENANCE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// POST /api/backup/reset-counter - Reset transaction counter (admin only)
router.post('/reset-counter', async (req, res) => {
  try {
    resetTransactionCounter();
    res.json({ 
      success: true,
      message: 'Transaction counter reset',
      counter: 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Reset counter error:', err);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'RESET_ERROR',
        message: 'Failed to reset counter',
        timestamp: new Date().toISOString(),
      }
    });
  }
});

module.exports = router;
