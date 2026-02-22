const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authenticate, hashToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Generate a unique device ID from request headers
const getClientIp = (req) => {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.headers['x-real-ip'] || req.ip || 'unknown';
};

const getDeviceId = (req) => {
  const ua = req.headers['user-agent'] || 'unknown';
  const ip = getClientIp(req);
  return crypto.createHash('md5').update(`${ua}-${ip}`).digest('hex').substring(0, 16);
};

// Sanitize input - strip dangerous characters
const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>'"`;\\]/g, '');
};

// POST /api/auth/login
router.post('/login', [
  body('email').trim().isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { email, password, forceLogin } = req.body;

    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    const userResult = await pool.query(
      'SELECT id, email, password_hash, display_name, active_token_hash, device_id, last_login_at FROM users WHERE email = $1',
      [sanitizedEmail]
    );

    // Use constant-time comparison approach - always hash even if user not found
    if (userResult.rows.length === 0) {
      // Prevent timing attacks by still doing a bcrypt compare
      await bcrypt.compare(password, '$2a$12$invalidhashtopreventtimingattacks000000000000000000');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const currentDeviceId = getDeviceId(req);

    // Check for existing active session on a different device
    if (user.active_token_hash && user.device_id && user.device_id !== currentDeviceId && !forceLogin) {
      return res.status(409).json({
        error: 'Active session exists on another device',
        code: 'SESSION_CONFLICT',
        // Only expose relative time, not exact timestamp
        message: 'You are already logged in on another device. Do you want to continue and logout the other session?'
      });
    }

    // Generate token with 24h strict expiry
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h', algorithm: 'HS256' }
    );

    // Store hashed token and device info
    const tokenHash = hashToken(token);
    await pool.query(
      'UPDATE users SET active_token_hash = $1, device_id = $2, last_login_at = now() WHERE id = $3',
      [tokenHash, currentDeviceId, user.id]
    );

    // Log login history - get real client IP
    const clientIp = getClientIp(req);
    await pool.query(
      'INSERT INTO login_history (user_id, email, ip_address, user_agent, device_id) VALUES ($1, $2, $3, $4, $5)',
      [user.id, user.email, clientIp, req.headers['user-agent'] || 'unknown', currentDeviceId]
    );

    res.json({
      token,
      user: { id: user.id, username: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET active_token_hash = NULL, device_id = NULL WHERE id = $1',
      [req.user.id]
    );
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/signup — disabled for closed system, only admin can create accounts
router.post('/signup', async (req, res) => {
  // Self-registration is disabled. Accounts are created by admins only.
  return res.status(403).json({ error: 'Self-registration is disabled. Contact your administrator.' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, display_name FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    res.json({ user: { id: user.id, username: user.email } });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').trim().isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { email } = req.body;

    // Always return the same generic message regardless of outcome (anti-enumeration)
    const genericMessage = 'If an account with that email exists, a password reset link has been sent.';

    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', [sanitizedEmail]);
    
    if (userResult.rows.length === 0) {
      // Simulate delay to prevent timing-based enumeration
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
      return res.json({ message: genericMessage });
    }

    const user = userResult.rows[0];

    // Invalidate existing tokens
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false', [user.id]);

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    // Auto-detect frontend URL from request origin, or use configured FRONTEND_URL
    const origin = req.headers.origin || req.headers.referer;
    const frontendUrl = origin ? origin.replace(/\/$/, '') : (process.env.FRONTEND_URL || 'http://localhost:8080');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send reset email — NEVER expose token in API response
    const { sendEmail } = require('../config/email');
    const { passwordResetTemplate } = require('../templates/emailTemplates');
    const displayNameResult = await pool.query('SELECT display_name FROM profiles WHERE id = $1', [user.id]);
    const displayName = displayNameResult.rows[0]?.display_name || user.email;
    const html = passwordResetTemplate(displayName, resetLink, user.email);
    await sendEmail(user.email, 'Password Reset - Sri Vinayaka Tenders', html);

    // Log for server-side debugging only (never in response)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n🔑 Password reset link for ${user.email}:\n   ${resetLink}\n`);
    }

    // NEVER return resetToken or resetLink in the response
    res.json({ message: genericMessage });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const client = await pool.connect();
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Token and new password (min 6 chars) are required' });
    }

    if (newPassword.length > 128) {
      return res.status(400).json({ error: 'Password is too long' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await client.query('BEGIN');

    // Atomically claim the token: SELECT ... FOR UPDATE prevents race conditions,
    // and we only select tokens that are NOT yet used.
    const tokenResult = await client.query(
      'SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token_hash = $1 AND used = false FOR UPDATE',
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This reset link is invalid or has already been used. Please request a new one.' });
    }

    const resetRecord = tokenResult.rows[0];

    if (new Date(resetRecord.expires_at) < new Date()) {
      await client.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [resetRecord.id]);
      await client.query('COMMIT');
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    // Mark this token as used FIRST (before changing password)
    await client.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [resetRecord.id]);

    // Invalidate all other unused tokens for this user
    await client.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false', [resetRecord.user_id]);

    // Update password and invalidate all sessions
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await client.query('UPDATE users SET password_hash = $1, active_token_hash = NULL, device_id = NULL WHERE id = $2', [passwordHash, resetRecord.user_id]);

    await client.query('COMMIT');

    res.json({ message: 'Password reset successfully. Please login with your new password.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
