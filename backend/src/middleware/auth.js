const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenHash = hashToken(token);

    const result = await pool.query(
      'SELECT active_token_hash, role, last_activity_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const storedHash = result.rows[0].active_token_hash;
    if (!storedHash || storedHash !== tokenHash) {
      return res.status(401).json({ 
        error: 'Session expired. You have been logged in from another device.',
        code: 'SESSION_REPLACED'
      });
    }

    const lastActivityAt = result.rows[0].last_activity_at ? new Date(result.rows[0].last_activity_at) : null;
    if (lastActivityAt && Date.now() - lastActivityAt.getTime() > INACTIVITY_TIMEOUT_MS) {
      await pool.query(
        'UPDATE users SET active_token_hash = NULL, device_id = NULL, last_activity_at = NULL WHERE id = $1',
        [decoded.id]
      );
      return res.status(401).json({
        error: 'Session expired due to inactivity. Please login again.',
        code: 'SESSION_INACTIVE'
      });
    }

    await pool.query(
      'UPDATE users SET last_activity_at = now() WHERE id = $1',
      [decoded.id]
    );

    req.user = { id: decoded.id, email: decoded.email, role: result.rows[0].role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const invalidateAuthCache = (tokenHash) => {
  return tokenHash;
};

const clearAllAuthCache = () => undefined;

// requireAdmin middleware — checks for admin role
const requireAdmin = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (err) {
    console.error('Admin authorization error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { authenticate, hashToken, invalidateAuthCache, clearAllAuthCache, requireAdmin };
