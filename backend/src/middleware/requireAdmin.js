/**
 * Middleware to ensure user is authenticated AND has admin role
 * Returns 403 Forbidden for non-admin users
 * Returns 401 Unauthorized for unauthenticated users
 */
const requireAdmin = (req, res, next) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // User is admin, proceed
  next();
};

module.exports = requireAdmin;
