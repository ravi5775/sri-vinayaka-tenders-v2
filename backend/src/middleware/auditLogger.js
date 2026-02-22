const { pool } = require('../config/database');

/**
 * Server-side audit logger middleware.
 * Logs all POST, PUT, DELETE requests with the user who made them.
 * Runs after the response is sent (non-blocking).
 */
const auditLogger = (req, res, next) => {
  // Only log mutating requests
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Capture the original end to log after response
  const originalEnd = res.end;
  res.end = function (...args) {
    originalEnd.apply(res, args);

    // Fire-and-forget audit log
    setImmediate(async () => {
      try {
        const userId = req.user?.id;
        if (!userId) return; // Skip unauthenticated requests

        const action = `${req.method} ${req.originalUrl}`;
        const statusCode = res.statusCode;

        // Only log successful mutations (2xx status)
        if (statusCode < 200 || statusCode >= 300) return;

        // Build details — strip sensitive fields
        const details = {
          method: req.method,
          path: req.originalUrl,
          statusCode,
          ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown',
        };

        // Include body summary for create/update (exclude passwords)
        if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
          const sanitizedBody = { ...req.body };
          delete sanitizedBody.password;
          delete sanitizedBody.oldPassword;
          delete sanitizedBody.newPassword;
          delete sanitizedBody.token;
          // Truncate large backup payloads
          if (sanitizedBody.loans && Array.isArray(sanitizedBody.loans)) {
            sanitizedBody.loans = `[${sanitizedBody.loans.length} loans]`;
          }
          if (sanitizedBody.investors && Array.isArray(sanitizedBody.investors)) {
            sanitizedBody.investors = `[${sanitizedBody.investors.length} investors]`;
          }
          details.body = sanitizedBody;
        }

        // Determine entity type from URL
        let entityType = 'unknown';
        if (req.originalUrl.includes('/loans')) entityType = 'loan';
        else if (req.originalUrl.includes('/investors')) entityType = 'investor';
        else if (req.originalUrl.includes('/admin')) entityType = 'admin';
        else if (req.originalUrl.includes('/auth')) entityType = 'auth';
        else if (req.originalUrl.includes('/notifications')) entityType = 'notification';
        else if (req.originalUrl.includes('/backup')) entityType = 'backup';

        await pool.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, details, ip_hint)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, action, entityType, JSON.stringify(details), details.ip]
        );
      } catch (err) {
        // Never let audit logging crash the app
        console.error('Audit log error (non-fatal):', err.message);
      }
    });
  };

  next();
};

module.exports = { auditLogger };
