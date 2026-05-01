const errorHandler = (err, req, res, next) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const isProduction = process.env.NODE_ENV === 'production';

  // Log full error internally (for debugging)
  console.error('[ERROR]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    status: err.status || 500,
    message: err.message,
    stack: err.stack,
  });

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Response based on user role and environment
  if (isAdmin) {
    // Admins get full error details
    return res.status(statusCode).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        ...(process.env.DEBUG === 'true' && { stack: err.stack }),
      },
    });
  }

  // Public users get generic error responses (no sensitive details)
  const publicErrors = {
    400: {
      code: 'BAD_REQUEST',
      message: 'Invalid request parameters',
    },
    401: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    },
    403: {
      code: 'FORBIDDEN',
      message: 'Access denied',
    },
    404: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
    429: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later',
    },
    500: {
      code: 'SERVER_ERROR',
      message: 'An error occurred. Please contact support',
    },
  };

  const publicError = publicErrors[statusCode] || publicErrors[500];

  return res.status(statusCode).json({
    success: false,
    error: {
      code: publicError.code,
      message: publicError.message,
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = errorHandler;
