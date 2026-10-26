/**
 * Request validation middleware using zod.
 *
 * `source` selects where to read input from: 'body' (default), 'params', or
 * 'query'. Parsed values are written back onto req so controllers receive
 * validated, typed data. Errors are forwarded to the error handler.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const input =
        source === 'body'
          ? req.body
          : source === 'params'
            ? req.params
            : req.query;
      const parsed = schema.parse(input);
      if (source === 'body') req.body = parsed;
      else if (source === 'params') req.params = parsed;
      else req.query = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}
