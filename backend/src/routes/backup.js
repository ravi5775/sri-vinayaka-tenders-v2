const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getMongoClient } = require('../config/mongodb');
const { sendEmail } = require('../config/email');
const { backupEmailTemplate } = require('../templates/emailTemplates');
const { pool } = require('../config/database');
const { body, validationResult } = require('express-validator');

const router = express.Router();
router.use(authenticate);

const APP_NAME = 'Sri Vinayaka Tenders';

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

// POST /api/backup/mongodb
router.post('/mongodb', async (req, res) => {
  try {
    const data = req.body;
    const validationError = validateBackupStructure(data);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const db = await getMongoClient();
    const collection = db.collection('backups');

    const fileName = `sri-vinayaka-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const backupDoc = {
      ...data,
      userId: req.user.id,
      userEmail: req.user.email,
      backedUpAt: new Date(),
      fileName,
    };

    await collection.insertOne(backupDoc);
    res.json({ message: 'Backup saved to MongoDB Atlas successfully' });
  } catch (err) {
    console.error('MongoDB backup error:', err);
    res.status(500).json({ error: 'Failed to backup to MongoDB: ' + err.message });
  }
});

// POST /api/backup/email - Send backup file via email
router.post('/email', async (req, res) => {
  try {
    const data = req.body;
    const validationError = validateBackupStructure(data);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Get admin user info
    const userResult = await pool.query(
      'SELECT u.email, p.display_name FROM users u LEFT JOIN profiles p ON u.id::text = p.id::text WHERE u.id = $1',
      [req.user.id]
    );
    const adminEmail = userResult.rows[0]?.email || req.user.email;
    const displayName = userResult.rows[0]?.display_name || 'Admin';

    const fileName = `sri-vinayaka-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const stats = {
      loans: data.loans?.length || 0,
      investors: data.investors?.length || 0,
    };

    const html = backupEmailTemplate(displayName, fileName, stats);
    const emailResult = await sendEmail(adminEmail, `Data Backup - ${APP_NAME}`, html);

    res.json({
      message: emailResult.success ? 'Backup email sent successfully' : 'Failed to send backup email',
      emailSent: emailResult.success,
    });
  } catch (err) {
    console.error('Backup email error:', err);
    res.status(500).json({ error: 'Failed to send backup email: ' + err.message });
  }
});

module.exports = router;
