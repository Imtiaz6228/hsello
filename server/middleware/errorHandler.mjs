/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, _next) {
  console.error('[Error]', err.message || err);

  // Prisma known errors
  if (err.code === 'P2002') {
    const field = err.meta?.target || 'field';
    return res.status(409).json({
      error: `A record with this ${field} already exists.`,
      code: 'DUPLICATE_ENTRY',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Record not found.',
      code: 'NOT_FOUND',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token has expired.' });
  }

  // Multer file errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size exceeds the maximum allowed limit.' });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field.' });
  }

  // Validation errors
  if (err.name === 'ZodError') {
    const issues = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({
      error: 'Validation failed.',
      code: 'VALIDATION_ERROR',
      issues,
    });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}