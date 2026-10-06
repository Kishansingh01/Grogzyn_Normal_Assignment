/**
 * Centralized Error Handling Middlewares
 */

// 404 Not Found Middleware
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint '${req.method} ${req.originalUrl}' does not exist.`
    }
  });
};

// Global Error Handler
const errorHandler = (err, req, res, next) => {
  console.error('[Error Details]:', err);

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'MONGOOSE_VALIDATION_ERROR',
        message: 'Database schema validation failed',
        details
      }
    });
  }

  // Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'CAST_ERROR',
        message: `Resource not found or invalid format for '${err.path}': ${err.value}`
      }
    });
  }

  // Duplicate Key Error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY_ERROR',
        message: 'A resource with this identifier or unique field already exists'
      }
    });
  }

  // Fallback 500 Internal Server Error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal server error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
