const express = require('express');
const fs = require('fs');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { sendEmail } = require('../config/email');
const { body, param, validationResult } = require('express-validator');
const { recordTransaction } = require('../services/backupService');
const { sendHighPaymentAlert } = require('../services/highPaymentAlertService');
const puppeteer = require('puppeteer');
const { buildLoanReceiptHtml } = require('../utils/loanReceiptTemplate');

const HIGH_PAYMENT_THRESHOLD = 30000; // ₹30,000

const router = express.Router();
router.use(authenticate);

const resolveChromeExecutablePath = () => {
  const candidatePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    puppeteer.executablePath(),
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  for (const executablePath of candidatePaths) {
    if (fs.existsSync(executablePath)) {
      return executablePath;
    }
  }

  return null;
};

const launchPdfBrowser = async () => {
  const executablePath = resolveChromeExecutablePath();
  const launchOptions = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  return puppeteer.launch(launchOptions);
};

// ─── Helper: Map DB row to frontend Loan shape ─────
const mapLoan = (row, transactions = []) => ({
  id: row.id,
  user_id: row.user_id,
  customerName: row.customer_name,
  phone: row.phone || '',
  loanType: row.loan_type,
  loanAmount: Number(row.loan_amount),
  givenAmount: Number(row.given_amount),
  interestRate: row.interest_rate ? Number(row.interest_rate) : null,
  durationInMonths: null,
  durationInDays: null,
  durationValue: row.duration_value ? Number(row.duration_value) : null,
  durationUnit: row.duration_unit,
  startDate: row.start_date,
  status: row.status,
  transactions,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const mapTransaction = (row) => ({
  id: row.id,
  loan_id: row.loan_id,
  user_id: row.user_id,
  amount: Number(row.amount),
  payment_date: row.payment_date,
  payment_type: row.payment_type || null,
  created_at: row.created_at,
});

// GET /api/loans — single JOIN query for speed
router.get('/', async (req, res) => {
  try {
    // Single query: fetch loans with transactions via LEFT JOIN
    // Note: All admins see all loans (no user_id filter)
    const result = await pool.query(`
      SELECT l.*, 
        COALESCE(json_agg(
          json_build_object(
            'id', t.id, 'loan_id', t.loan_id, 'user_id', t.user_id,
            'amount', t.amount, 'payment_date', t.payment_date,
            'payment_type', t.payment_type, 'created_at', t.created_at
          ) ORDER BY t.payment_date DESC
        ) FILTER (WHERE t.id IS NOT NULL), '[]') AS txns
      FROM loans l
      LEFT JOIN transactions t ON t.loan_id = l.id
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `);

    const loans = result.rows.map(row => {
      const transactions = row.txns.map(t => ({
        ...t,
        amount: Number(t.amount),
        payment_type: t.payment_type || null,
      }));
      return mapLoan(row, transactions);
    });

    res.json(loans);
  } catch (err) {
    console.error('Get loans error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/loans
router.post('/', [
  body('customerName').trim().notEmpty().withMessage('Customer name is required').isLength({ max: 200 }),
  body('loanType').trim().notEmpty().isIn(['Finance', 'Tender', 'InterestRate']).withMessage('Invalid loan type'),
  body('loanAmount').isNumeric().withMessage('Loan amount must be a number'),
  body('givenAmount').optional().isNumeric(),
  body('interestRate').optional({ nullable: true }).isNumeric(),
  body('durationValue').optional({ nullable: true }).isNumeric(),
  body('durationUnit').optional({ nullable: true }).isIn(['Days', 'Weeks', 'Months']),
  body('startDate').optional().isISO8601().toDate(),
  body('phone').optional().trim().isLength({ max: 20 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { customerName, phone, loanType, loanAmount, givenAmount, interestRate, durationValue, durationUnit, startDate, status } = req.body;
    const result = await pool.query(
      `INSERT INTO loans (user_id, customer_name, phone, loan_type, loan_amount, given_amount, interest_rate, duration_value, duration_unit, start_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [req.user.id, customerName || '', phone || '', loanType || 'Finance', loanAmount || 0, givenAmount || 0, interestRate, durationValue, durationUnit, startDate || new Date().toISOString().split('T')[0], status || 'Active']
    );
    res.status(201).json(mapLoan(result.rows[0]));
  } catch (err) {
    console.error('Create loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/loans/:id
router.put('/:id', [
  param('id').isUUID(),
  body('customerName').trim().notEmpty().isLength({ max: 200 }),
  body('loanType').trim().notEmpty().isIn(['Finance', 'Tender', 'InterestRate']),
  body('loanAmount').isNumeric(),
  body('givenAmount').optional().isNumeric(),
  body('interestRate').optional({ nullable: true }).isNumeric(),
  body('durationValue').optional({ nullable: true }).isNumeric(),
  body('durationUnit').optional({ nullable: true }).isIn(['Days', 'Weeks', 'Months']),
  body('startDate').optional().isISO8601().toDate(),
  body('phone').optional().trim().isLength({ max: 20 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { customerName, phone, loanType, loanAmount, givenAmount, interestRate, durationValue, durationUnit, startDate, status } = req.body;
    // All admins can update any loan (no user_id restriction)
    const result = await pool.query(
      `UPDATE loans SET customer_name=$1, phone=$2, loan_type=$3, loan_amount=$4, given_amount=$5, interest_rate=$6, duration_value=$7, duration_unit=$8, start_date=$9, status=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [customerName, phone, loanType, loanAmount, givenAmount, interestRate, durationValue, durationUnit, startDate, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Loan not found' });
    res.json(mapLoan(result.rows[0]));
  } catch (err) {
    console.error('Update loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/loans/delete-multiple (wrapped in transaction)
router.post('/delete-multiple', [
  body('ids').isArray({ min: 1 }).withMessage('Loan IDs array is required'),
  body('ids.*').isUUID().withMessage('Each loan ID must be a valid UUID'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const client = await pool.connect();
  try {
    const { ids } = req.body;
    await client.query('BEGIN');
    // Verify loans exist (all admins can delete any loan)
    const verifyResult = await client.query(
      'SELECT id FROM loans WHERE id = ANY($1::uuid[])',
      [ids]
    );
    if (verifyResult.rows.length !== ids.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'One or more loans not found' });
    }
    await client.query('DELETE FROM transactions WHERE loan_id = ANY($1::uuid[])', [ids]);
    await client.query('DELETE FROM loans WHERE id = ANY($1::uuid[])', [ids]);
    await client.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete loans error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ─── Transaction Routes ─────────────────────

// POST /api/loans/:loanId/transactions
router.post('/:loanId/transactions', [
  param('loanId').isUUID(),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('payment_date').optional().isISO8601().toDate(),
  body('payment_type').optional({ nullable: true }).isIn(['interest', 'principal']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { amount, payment_date, payment_type } = req.body;
    // Verify loan exists and belongs to current user
    const loanCheck = await pool.query('SELECT id, customer_name FROM loans WHERE id = $1 AND user_id = $2', [req.params.loanId, req.user.id]);
    if (loanCheck.rows.length === 0) return res.status(404).json({ error: 'Loan not found' });

    const result = await pool.query(
      'INSERT INTO transactions (loan_id, user_id, amount, payment_date, payment_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.params.loanId, req.user.id, amount, payment_date || new Date().toISOString().split('T')[0], payment_type || null]
    );

    const txn = mapTransaction(result.rows[0]);
    res.status(201).json(txn);

    // ── Record transaction for backup trigger (fire-and-forget) ─────────
    setImmediate(async () => {
      try {
        await recordTransaction();
      } catch (err) {
        console.error('Error recording transaction for backup:', err.message);
      }
    });

    // ── High-payment alert (fire-and-forget, non-blocking) ──────────────
    if (Number(amount) >= HIGH_PAYMENT_THRESHOLD) {
      setImmediate(async () => {
        try {
          const userRes = await pool.query(
            'SELECT email, display_name FROM users WHERE id = $1',
            [req.user.id]
          );
          const payingUser = userRes.rows[0] || {};
          const customerName = loanCheck.rows[0].customer_name;

          // Send high payment alert to all admins
          await sendHighPaymentAlert({
            amount,
            adminEmail: payingUser.email,
            adminName: payingUser.display_name || payingUser.email.split('@')[0],
            loanId: req.params.loanId,
            customerName,
            loanType: 'Loan Payment',
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Error sending high payment alert:', err.message);
        }
      });
    }
  } catch (err) {
    console.error('Add transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/loans/:loanId/transactions/:txnId
router.put('/:loanId/transactions/:txnId', [
  param('loanId').isUUID(),
  param('txnId').isUUID(),
  body('amount').optional().isNumeric(),
  body('payment_date').optional().isISO8601().toDate(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { amount, payment_date } = req.body;
    // Verify transaction belongs to loan owned by current user
    const txnVerify = await pool.query(
      `SELECT t.id FROM transactions t 
       JOIN loans l ON t.loan_id = l.id 
       WHERE t.id = $1 AND l.user_id = $2`,
      [req.params.txnId, req.user.id]
    );
    if (txnVerify.rows.length === 0) return res.status(403).json({ error: 'You can only update your own transactions' });
    const result = await pool.query(
      'UPDATE transactions SET amount = COALESCE($1, amount), payment_date = COALESCE($2, payment_date) WHERE id = $3 RETURNING *',
      [amount, payment_date, req.params.txnId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.json(mapTransaction(result.rows[0]));
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/loans/:loanId/transactions/:txnId
router.delete('/:loanId/transactions/:txnId', async (req, res) => {
  try {
    // Verify transaction belongs to loan owned by current user
    const txnVerify = await pool.query(
      `SELECT t.id FROM transactions t 
       JOIN loans l ON t.loan_id = l.id 
       WHERE t.id = $1 AND l.user_id = $2`,
      [req.params.txnId, req.user.id]
    );
    if (txnVerify.rows.length === 0) return res.status(403).json({ error: 'You can only delete your own transactions' });
    const result = await pool.query('DELETE FROM transactions WHERE id = $1 RETURNING id', [req.params.txnId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/loans/:loanId/receipt-pdf  -> generate PDF receipt for loan
router.get('/:loanId/receipt-pdf', [ param('loanId').isUUID() ], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const loanId = req.params.loanId;
    // Fetch loan
    const loanRes = await pool.query('SELECT * FROM loans WHERE id = $1', [loanId]);
    if (loanRes.rows.length === 0) return res.status(404).json({ error: 'Loan not found' });
    const loanRow = loanRes.rows[0];
    const txRes = await pool.query('SELECT * FROM transactions WHERE loan_id = $1 ORDER BY payment_date DESC', [loanId]);
    const transactions = txRes.rows.map(t => ({
      ...t,
      amount: Number(t.amount),
      payment_type: t.payment_type || null,
    }));

    const customerName = loanRow.customer_name || 'Loan';
    const totalAmount = Number(loanRow.loan_amount || 0);
    const amountPaid = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
    const balance = totalAmount - amountPaid;

    const html = buildLoanReceiptHtml({
      customerName,
      loanId: loanRow.id,
      issueDate: loanRow.created_at || loanRow.start_date,
      phone: loanRow.phone,
      totalAmount,
      amountPaid,
      balance,
      loanType: loanRow.loan_type,
      startDate: loanRow.start_date,
      status: loanRow.status,
      transactions,
      generatedAt: Date.now(),
    });

    // Launch puppeteer and render PDF
    const browser = await launchPdfBrowser();
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });

      const filename = `Loan-Receipt-${customerName.replace(/[^a-z0-9_-]/gi, '_')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
      return;
    } finally {
      await browser.close().catch((closeErr) => {
        console.error('PDF browser close error:', closeErr);
      });
    }
  } catch (err) {
    console.error('Generate PDF error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
