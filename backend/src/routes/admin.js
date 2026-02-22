const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { sendEmail } = require('../config/email');
const { adminPasswordResetTemplate } = require('../templates/emailTemplates');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();

// All admin routes require authentication
router.use(authenticate);

// POST /api/admin/create (wrapped in transaction)
router.post('/create', [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6, max: 128 }).withMessage('Password must be 6-128 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const client = await pool.connect();
  try {
    const { email, password } = req.body;

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await client.query(
      'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email',
      [email.toLowerCase(), passwordHash, email]
    );

    const newUser = result.rows[0];
    await client.query('INSERT INTO profiles (id, display_name) VALUES ($1, $2)', [newUser.id, email]);
    await client.query('COMMIT');

    res.json({ message: 'Admin created successfully', user: { id: newUser.id, email: newUser.email } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create admin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/change-password
router.put('/change-password', [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  body('newPassword').isLength({ min: 6, max: 128 }).withMessage('New password must be 6-128 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { oldPassword, newPassword } = req.body;

    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(oldPassword, userResult.rows[0].password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users - List all admin accounts
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.email, p.display_name, u.created_at FROM users u LEFT JOIN profiles p ON u.id::text = p.id::text ORDER BY u.created_at ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List admins error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id - Delete an admin account (wrapped in transaction)
router.delete('/users/:id', [param('id').isUUID()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM login_history WHERE user_id = $1', [id]);
    await client.query('DELETE FROM profiles WHERE id = $1', [id]);
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    await client.query('COMMIT');

    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete admin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/admin/reset-password/:id - Admin resets another user's password and emails it
router.post('/reset-password/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await pool.query(
      'SELECT u.id, u.email, p.display_name FROM users u LEFT JOIN profiles p ON u.id::text = p.id::text WHERE u.id = $1',
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = userResult.rows[0];

    // Generate random temporary password
    const tempPassword = crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Update password and invalidate sessions
    await pool.query(
      'UPDATE users SET password_hash = $1, active_token_hash = NULL, device_id = NULL WHERE id = $2',
      [passwordHash, id]
    );

    // Send email with new credentials
    // Auto-detect frontend URL from request origin
    const origin = req.headers.origin || req.headers.referer;
    const loginUrl = `${origin ? origin.replace(/\/$/, '') : (process.env.FRONTEND_URL || 'http://localhost:8080')}/login`;
    const html = adminPasswordResetTemplate(targetUser.display_name, targetUser.email, tempPassword, loginUrl);
    const emailResult = await sendEmail(targetUser.email, `Password Reset - Sri Vinayaka Tenders`, html);

    res.json({
      message: `Password reset for ${targetUser.email}. ${emailResult.success ? 'Email sent successfully.' : 'Email could not be sent.'}`,
      emailSent: emailResult.success,
      ...(process.env.NODE_ENV !== 'production' ? { tempPassword } : {}),
    });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/login-history
router.get('/login-history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, ip_address, user_agent, created_at FROM login_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Login history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/restore
router.post('/restore', async (req, res) => {
  try {
    const { loans, investors } = req.body;
    const userId = req.user.id;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Import loans
      let loanCount = 0;
      if (loans && Array.isArray(loans)) {
        for (const loan of loans) {
          const loanResult = await client.query(
            `INSERT INTO loans (user_id, customer_name, phone, loan_type, loan_amount, given_amount, interest_rate, duration_value, duration_unit, start_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [userId, loan.customerName, loan.phone || '', loan.loanType, loan.loanAmount, loan.givenAmount, loan.interestRate, loan.durationValue, loan.durationUnit, loan.startDate, loan.status || 'Active']
          );
          loanCount++;

          if (loan.transactions && Array.isArray(loan.transactions)) {
            for (const txn of loan.transactions) {
              await client.query(
                'INSERT INTO transactions (loan_id, user_id, amount, payment_date) VALUES ($1, $2, $3, $4)',
                [loanResult.rows[0].id, userId, txn.amount, txn.payment_date]
              );
            }
          }
        }
      }

      // Import investors
      let investorCount = 0;
      if (investors && Array.isArray(investors)) {
        for (const inv of investors) {
          const invResult = await client.query(
            `INSERT INTO investors (user_id, name, investment_amount, investment_type, profit_rate, start_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [userId, inv.name, inv.investmentAmount, inv.investmentType, inv.profitRate, inv.startDate, inv.status || 'On Track']
          );
          investorCount++;

          if (inv.payments && Array.isArray(inv.payments)) {
            for (const pay of inv.payments) {
              await client.query(
                'INSERT INTO investor_payments (investor_id, user_id, amount, payment_date, payment_type, remarks) VALUES ($1, $2, $3, $4, $5, $6)',
                [invResult.rows[0].id, userId, pay.amount, pay.payment_date, pay.payment_type, pay.remarks || null]
              );
            }
          }
        }
      }

      await client.query('COMMIT');
      res.json({ message: `Restored ${loanCount} loans and ${investorCount} investors successfully` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Failed to restore backup: ' + err.message });
  }
});

module.exports = router;
