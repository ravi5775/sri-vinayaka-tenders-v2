const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ─── Helpers ────────────────────────────────
const mapInvestor = (row, payments = []) => ({
  id: row.id,
  user_id: row.user_id,
  name: row.name,
  investmentAmount: Number(row.investment_amount),
  investmentType: row.investment_type,
  profitRate: Number(row.profit_rate),
  startDate: row.start_date,
  status: row.status,
  payments,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const mapPayment = (row) => ({
  id: row.id,
  investor_id: row.investor_id,
  user_id: row.user_id,
  amount: Number(row.amount),
  payment_date: row.payment_date,
  payment_type: row.payment_type,
  remarks: row.remarks || undefined,
  created_at: row.created_at,
});

// GET /api/investors
router.get('/', async (req, res) => {
  try {
    const invResult = await pool.query('SELECT * FROM investors ORDER BY created_at DESC');
    const payResult = await pool.query('SELECT * FROM investor_payments ORDER BY payment_date DESC');

    const payMap = {};
    payResult.rows.forEach(p => {
      if (!payMap[p.investor_id]) payMap[p.investor_id] = [];
      payMap[p.investor_id].push(mapPayment(p));
    });

    const investors = invResult.rows.map(row => mapInvestor(row, payMap[row.id] || []));
    res.json(investors);
  } catch (err) {
    console.error('Get investors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/investors
router.post('/', async (req, res) => {
  try {
    const { name, investmentAmount, investmentType, profitRate, startDate, status } = req.body;
    const result = await pool.query(
      `INSERT INTO investors (user_id, name, investment_amount, investment_type, profit_rate, start_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, name, investmentAmount || 0, investmentType, profitRate || 0, startDate || new Date().toISOString().split('T')[0], status || 'On Track']
    );
    res.status(201).json(mapInvestor(result.rows[0]));
  } catch (err) {
    console.error('Create investor error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/investors/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, investmentAmount, investmentType, profitRate, startDate, status } = req.body;
    const result = await pool.query(
      `UPDATE investors SET name=$1, investment_amount=$2, investment_type=$3, profit_rate=$4, start_date=$5, status=$6
       WHERE id=$7 RETURNING *`,
      [name, investmentAmount, investmentType, profitRate, startDate, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Investor not found' });
    res.json(mapInvestor(result.rows[0]));
  } catch (err) {
    console.error('Update investor error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/investors/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM investor_payments WHERE investor_id = $1', [req.params.id]);
    const result = await pool.query('DELETE FROM investors WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Investor not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Delete investor error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Investor Payment Routes ────────────────

// POST /api/investors/:investorId/payments
router.post('/:investorId/payments', async (req, res) => {
  try {
    const invCheck = await pool.query('SELECT id FROM investors WHERE id = $1', [req.params.investorId]);
    if (invCheck.rows.length === 0) return res.status(404).json({ error: 'Investor not found' });

    const { amount, payment_date, payment_type, remarks } = req.body;
    const result = await pool.query(
      'INSERT INTO investor_payments (investor_id, user_id, amount, payment_date, payment_type, remarks) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.params.investorId, req.user.id, amount, payment_date || new Date().toISOString().split('T')[0], payment_type, remarks || null]
    );
    res.status(201).json(mapPayment(result.rows[0]));
  } catch (err) {
    console.error('Add investor payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/investors/:investorId/payments/:payId
router.put('/:investorId/payments/:payId', async (req, res) => {
  try {
    const { amount, payment_date, payment_type, remarks } = req.body;
    const result = await pool.query(
      `UPDATE investor_payments SET amount=COALESCE($1,amount), payment_date=COALESCE($2,payment_date), payment_type=COALESCE($3,payment_type), remarks=COALESCE($4,remarks)
       WHERE id=$5 RETURNING *`,
      [amount, payment_date, payment_type, remarks, req.params.payId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });

    // Return full investor with payments
    const invResult = await pool.query('SELECT * FROM investors WHERE id = $1', [req.params.investorId]);
    const payResult = await pool.query('SELECT * FROM investor_payments WHERE investor_id = $1 ORDER BY payment_date DESC', [req.params.investorId]);
    res.json(mapInvestor(invResult.rows[0], payResult.rows.map(mapPayment)));
  } catch (err) {
    console.error('Update investor payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/investors/:investorId/payments/:payId
router.delete('/:investorId/payments/:payId', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM investor_payments WHERE id = $1 RETURNING id', [req.params.payId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Delete investor payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
