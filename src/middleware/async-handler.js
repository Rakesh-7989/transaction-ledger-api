/**
 * Wraps an async Express route handler so both rejected promises and
 * synchronous throws are forwarded to Express's error-handling middleware.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
