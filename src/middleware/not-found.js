/**
 * 404 for any route that does not match. Also covers transaction
 * update/delete endpoints which are intentionally unimplemented.
 */
export function notFound(req, res, next) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}
