const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { sendEmail } = require('../config/email');
const { highPaymentAlertTemplate } = require('../templates/emailTemplates');
const { body, param, validationResult } = require('express-validator');

const HIGH_PAYMENT_THRESHOLD = 30000; // ₹30,000

const router = express.Router();
router.use(authenticate);

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

// GET /api/loans
router.get('/', async (req, res) => {
  try {
    const loansResult = await pool.query(
      'SELECT * FROM loans ORDER BY created_at DESC'
    );
    const txnResult = await pool.query(
      'SELECT * FROM transactions ORDER BY payment_date DESC'
    );

    const txnMap = {};
    txnResult.rows.forEach(t => {
      if (!txnMap[t.loan_id]) txnMap[t.loan_id] = [];
      txnMap[t.loan_id].push(mapTransaction(t));
    });

    const loans = loansResult.rows.map(row => mapLoan(row, txnMap[row.id] || []));
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
    const result = await pool.query(
      `UPDATE loans SET customer_name=$1, phone=$2, loan_type=$3, loan_amount=$4, given_amount=$5, interest_rate=$6, duration_value=$7, duration_unit=$8, start_date=$9, status=$10
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
    // Verify loan exists and get customer name
    const loanCheck = await pool.query('SELECT id, customer_name FROM loans WHERE id = $1', [req.params.loanId]);
    if (loanCheck.rows.length === 0) return res.status(404).json({ error: 'Loan not found' });

    const result = await pool.query(
      'INSERT INTO transactions (loan_id, user_id, amount, payment_date, payment_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.params.loanId, req.user.id, amount, payment_date || new Date().toISOString().split('T')[0], payment_type || null]
    );

    const txn = mapTransaction(result.rows[0]);
    res.status(201).json(txn);

    // ── High-payment alert (fire-and-forget, non-blocking) ──────────────
    if (Number(amount) >= HIGH_PAYMENT_THRESHOLD) {
      setImmediate(async () => {
        try {
          // Fetch paying user details
          const userRes = await pool.query(
            'SELECT email, display_name FROM users WHERE id = $1',
            [req.user.id]
          );
          const payingUser = userRes.rows[0] || {};

          // Fetch all active admin alert email recipients
          const adminRes = await pool.query(
            'SELECT email, name FROM admin_alert_emails WHERE is_active = true'
          );

          if (adminRes.rows.length === 0) {
            console.warn('⚠️  High payment alert: no admin_alert_emails configured — skipping email.');
            return;
          }

          const customerName = loanCheck.rows[0].customer_name;
          const payDate = payment_date || new Date().toISOString().split('T')[0];

          // Log the alert
          await pool.query(
            `INSERT INTO high_payment_alert_log
               (transaction_id, loan_id, user_id, amount, payment_date, recipients)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              txn.id,
              req.params.loanId,
              req.user.id,
              amount,
              payDate,
              adminRes.rows.map(r => r.email),
            ]
          );

          // Send individual emails to each admin
          for (const admin of adminRes.rows) {
            const html = highPaymentAlertTemplate(
              admin.name,
              { displayName: payingUser.display_name, email: payingUser.email },
              Number(amount),
              payDate,
              req.params.loanId,
              customerName,
              admin.email
            );
            await sendEmail(
              admin.email,
              `🚨 High-Value Payment Alert — ₹${Number(amount).toLocaleString('en-IN')} received`,
              html
            );
          }
          console.log(`✅ High-payment alert sent to ${adminRes.rows.length} admin(s) for ₹${amount}`);
        } catch (alertErr) {
          console.error('❌ High-payment alert error:', alertErr.message);
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
    const result = await pool.query('DELETE FROM transactions WHERE id = $1 RETURNING id', [req.params.txnId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
