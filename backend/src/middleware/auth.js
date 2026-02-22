const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ─── In-memory auth cache ────────────────────────────────
// Caches verified token hashes for 60 seconds to avoid a DB query on every request.
// When a user logs in from another device (token changes), the cache entry expires
// within 60s and the next request will re-verify against the DB.
const AUTH_CACHE_TTL = 60_000; // 60 seconds
const authCache = new Map(); // tokenHash -> { userId, email, expiresAt }

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of authCache) {
    if (val.expiresAt < now) authCache.delete(key);
  }
}, 300_000);

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenHash = hashToken(token);

    // Check in-memory cache first — avoids DB round-trip
    const cached = authCache.get(tokenHash);
    if (cached && cached.expiresAt > Date.now() && cached.userId === decoded.id) {
      req.user = { id: cached.userId, email: cached.email };
      return next();
    }

    // Cache miss — verify against DB
    const result = await pool.query(
      'SELECT active_token_hash FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const storedHash = result.rows[0].active_token_hash;
    if (!storedHash || storedHash !== tokenHash) {
      // Remove stale cache entry if exists
      authCache.delete(tokenHash);
      return res.status(401).json({ 
        error: 'Session expired. You have been logged in from another device.',
        code: 'SESSION_REPLACED'
      });
    }

    // Cache the verified token for subsequent requests
    authCache.set(tokenHash, {
      userId: decoded.id,
      email: decoded.email,
      expiresAt: Date.now() + AUTH_CACHE_TTL,
    });

    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Export invalidateAuthCache so login/logout can clear it
const invalidateAuthCache = (tokenHash) => {
  if (tokenHash) authCache.delete(tokenHash);
};

const clearAllAuthCache = () => authCache.clear();

module.exports = { authenticate, hashToken, invalidateAuthCache, clearAllAuthCache };
