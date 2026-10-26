import { z } from 'zod';

/**
 * Monetary amount. Accepts a string or number from the client, validates that it
 * is a positive value with at most two decimal places, then coerces to a JS
 * number. Final arithmetic is performed in PostgreSQL NUMERIC, not here.
 */
const amountSchema = z
  .preprocess(
    (v) => (typeof v === 'number' ? String(v) : v),
    z
      .string()
      .regex(
        /^\d+(\.\d{1,2})?$/,
        'amount must be a positive number with up to two decimal places'
      )
  )
  .transform((v) => Number(v))
  .refine((v) => v > 0, 'amount must be greater than zero');

export const createTransactionSchema = z
  .object({
    type: z.enum(['credit', 'debit'], {
      invalid_type_error: 'type must be credit or debit',
    }),
    amount: amountSchema,
    description: z.string().max(1000).optional().default(''),
    reference_id: z
      .string()
      .trim()
      .min(1, 'reference_id is required')
      .max(100),
  })
  .strict();

export const historyQuerySchema = z.object({
  type: z.enum(['credit', 'debit']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
