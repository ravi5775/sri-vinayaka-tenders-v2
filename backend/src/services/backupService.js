const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const { getMongoClient } = require('../config/mongodb');
const { uploadFileToGoogleDrive, listFilesInFolder } = require('../config/googleDrive');

const BACKUP_DIR = path.join(__dirname, '../../backups');
const TRANSACTION_COUNTER_FILE = path.join(BACKUP_DIR, 'transaction-counter.json');
const BACKUP_METADATA_FILE = path.join(BACKUP_DIR, 'backup-metadata.json');

// Ensure backup directory exists
const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

// Get current transaction counter
const getTransactionCounter = () => {
  try {
    if (fs.existsSync(TRANSACTION_COUNTER_FILE)) {
      const data = JSON.parse(fs.readFileSync(TRANSACTION_COUNTER_FILE, 'utf8'));
      return data.count || 0;
    }
  } catch (err) {
    console.error('Error reading transaction counter:', err);
  }
  return 0;
};

// Update transaction counter
const updateTransactionCounter = (increment = 1) => {
  try {
    ensureBackupDir();
    const current = getTransactionCounter();
    const newCount = current + increment;
    fs.writeFileSync(TRANSACTION_COUNTER_FILE, JSON.stringify({ count: newCount, updatedAt: new Date().toISOString() }));
    return newCount;
  } catch (err) {
    console.error('Error updating transaction counter:', err);
    return 0;
  }
};

// Reset transaction counter
const resetTransactionCounter = () => {
  try {
    fs.writeFileSync(TRANSACTION_COUNTER_FILE, JSON.stringify({ count: 0, updatedAt: new Date().toISOString() }));
  } catch (err) {
    console.error('Error resetting transaction counter:', err);
  }
};

// Fetch all data for backup
const fetchBackupData = async () => {
  try {
    const loansResult = await pool.query(`
      SELECT l.*, 
        COALESCE(json_agg(
          json_build_object(
            'id', t.id, 'amount', t.amount, 'payment_date', t.payment_date,
            'payment_type', t.payment_type
          ) ORDER BY t.payment_date DESC
        ) FILTER (WHERE t.id IS NOT NULL), '[]') AS transactions
      FROM loans l
      LEFT JOIN transactions t ON t.loan_id = l.id
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `);

    const investorsResult = await pool.query(`
      SELECT i.*, 
        COALESCE(json_agg(
          json_build_object(
            'id', p.id, 'amount', p.amount, 'payment_date', p.payment_date,
            'payment_type', p.payment_type, 'remarks', p.remarks
          ) ORDER BY p.payment_date DESC
        ) FILTER (WHERE p.id IS NOT NULL), '[]') AS payments
      FROM investors i
      LEFT JOIN investor_payments p ON p.investor_id = i.id
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `);

    const loans = loansResult.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      customerName: row.customer_name,
      phone: row.phone || '',
      loanType: row.loan_type,
      loanAmount: Number(row.loan_amount),
      givenAmount: Number(row.given_amount),
      interestRate: row.interest_rate ? Number(row.interest_rate) : null,
      durationValue: row.duration_value ? Number(row.duration_value) : null,
      durationUnit: row.duration_unit,
      startDate: row.start_date,
      status: row.status,
      transactions: row.transactions,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const investors = investorsResult.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      investmentAmount: Number(row.investment_amount),
      investmentType: row.investment_type,
      profitRate: Number(row.profit_rate),
      startDate: row.start_date,
      status: row.status,
      payments: row.payments,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return {
      timestamp: new Date().toISOString(),
      loans,
      investors,
      summary: {
        totalLoans: loans.length,
        totalInvestors: investors.length,
        totalTransactions: loans.reduce((sum, l) => sum + l.transactions.length, 0),
        totalPayments: investors.reduce((sum, i) => sum + i.payments.length, 0),
      }
    };
  } catch (err) {
    console.error('Error fetching backup data:', err);
    throw err;
  }
};

// Backup to local device
const backupToLocal = async () => {
  try {
    ensureBackupDir();
    const data = await fetchBackupData();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // Save metadata
    const metadata = {
      timestamp: data.timestamp,
      fileName,
      filePath,
      size: fs.statSync(filePath).size,
      status: 'success',
    };

    console.log(`✅ Local backup created: ${fileName} (${metadata.size} bytes)`);
    return metadata;
  } catch (err) {
    console.error('❌ Local backup error:', err);
    throw err;
  }
};

// Backup to MongoDB Atlas
const backupToMongoDB = async () => {
  try {
    const data = await fetchBackupData();
    const db = await getMongoClient();
    const collection = db.collection('backups');

    const backupDoc = {
      ...data,
      backupType: 'scheduled',
      source: 'auto-backup',
      createdAt: new Date(),
    };

    const result = await collection.insertOne(backupDoc);
    console.log(`✅ MongoDB backup created: ${result.insertedId}`);
    
    return {
      timestamp: data.timestamp,
      mongoId: result.insertedId,
      status: 'success',
      size: JSON.stringify(backupDoc).length,
    };
  } catch (err) {
    console.error('❌ MongoDB backup error:', err);
    throw err;
  }
};

// Backup to Google Drive (MANDATORY - required configuration)
const backupToGoogleDrive = async (folderName = 'sri-vinayaka-manual-backups') => {
  try {
    // Check if Google Apps Script is configured
    if (!process.env.GOOGLE_APPS_SCRIPT_URL) {
      console.error('❌ GOOGLE_APPS_SCRIPT_URL is required for Google Drive backup');
      console.error('   Follow setup instructions in .env to deploy Google Apps Script');
      throw new Error('Google Apps Script URL not configured in .env');
    }

    if (!process.env.GOOGLE_APPS_SCRIPT_SECRET) {
      console.error('❌ GOOGLE_APPS_SCRIPT_SECRET is required in .env');
      throw new Error('Google Apps Script secret not configured');
    }

    // Fetch backup data
    const data = await fetchBackupData();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json`;

    console.log(`📁 Uploading to Google Drive via Google Apps Script...`);
    console.log(`   Method: Google Apps Script (personal account)`);
    console.log(`   File: ${fileName}`);
    console.log(`   Data: ${JSON.stringify(data.summary)}`);

    // Upload to Google Drive via Apps Script
    // Apps Script handles folder creation automatically
    const uploadResult = await uploadFileToGoogleDrive(
      data,  // Pass the entire backup data object
      fileName,
      process.env.GOOGLE_APPS_SCRIPT_URL,
      process.env.GOOGLE_APPS_SCRIPT_SECRET
    );

    console.log(`✅ Google Drive backup completed successfully`);
    console.log(`   File ID: ${uploadResult.fileId}`);
    console.log(`   View: ${uploadResult.webViewLink}`);

    return {
      timestamp: data.timestamp,
      fileName,
      folderName: 'sri-vinayaka-backups',
      fileId: uploadResult.fileId,
      webViewLink: uploadResult.webViewLink,
      status: 'success',
      note: 'Uploaded to Google Drive via Apps Script',
    };
  } catch (err) {
    console.error('❌ Google Drive backup error:', err.message);
    throw err;
  }
};

// Check if transaction backup is needed (every 3 transactions)
const shouldBackupAfterTransactions = () => {
  const counter = getTransactionCounter();
  return counter >= 3;
};

// Increment transaction counter and check for backup trigger
const recordTransaction = async () => {
  const newCount = updateTransactionCounter(1);
  
  if (newCount >= 3) {
    console.log(`📊 Transaction count reached 3 (${newCount} total). Triggering backup...`);
    resetTransactionCounter();
    
    try {
      // Backup to all destinations
      await Promise.all([
        backupToLocal(),
        backupToMongoDB(),
        backupToGoogleDrive('sri-vinayaka-transaction-backups'),
      ]).catch(err => {
        console.error('One or more backups failed:', err.message);
        // Don't throw - continue with partial backup
      });
    } catch (err) {
      console.error('Error during transaction-triggered backup:', err);
    }
  }
};

module.exports = {
  fetchBackupData,
  backupToLocal,
  backupToMongoDB,
  backupToGoogleDrive,
  recordTransaction,
  shouldBackupAfterTransactions,
  getTransactionCounter,
  resetTransactionCounter,
  updateTransactionCounter,
  ensureBackupDir,
};
