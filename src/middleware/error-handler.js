/**
 * Domain error carried by services. Includes an HTTP status code and a stable
 * error code so the API can return consistent, machine-readable failures.
 */
export class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralised error handler. Never leaks SQL, credentials, or stack traces to
 * the client. Logs server-side for diagnostics.
 */
export function errorHandler(err, req, res, next) {
  // Domain errors (e.g. not found, duplicate, insufficient balance).
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Zod validation errors.
  if (err.name === 'ZodError') {
    const message = err.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message },
    });
  }

  // PostgreSQL unique violation -> duplicate (account_id, reference_id).
  if (err.code === '23505') {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_TRANSACTION',
        message: 'Duplicate reference for this account',
      },
    });
  }

  // Foreign key violation -> referenced account does not exist.
  if (err.code === '23503') {
    return res.status(404).json({
      error: { code: 'ACCOUNT_NOT_FOUND', message: 'Account not found' },
    });
  }

  // Check constraint violation (balance >= 0, amount > 0, etc.).
  if (err.code === '23514') {
    return res.status(422).json({
      error: { code: 'BUSINESS_RULE_VIOLATION', message: err.message },
    });
  }

  // Anything unexpected: log server-side, return generic 500.
  console.error('Unexpected error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
