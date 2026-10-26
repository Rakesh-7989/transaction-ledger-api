import { z } from 'zod';

/**
 * Account creation.
 * `.strict()` rejects any supplied fields we do not accept - notably `balance`,
 * which must remain system-generated (clients cannot set an initial balance).
 */
export const createAccountSchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(200),
  })
  .strict();

export const accountIdParamSchema = z.object({
  accountId: z.string().uuid('invalid account id'),
});
