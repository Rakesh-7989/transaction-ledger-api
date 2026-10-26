import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { validate } from '../middleware/validate.js';
import {
  createTransactionSchema,
  historyQuerySchema,
} from '../validators/transactions.validator.js';
import { accountIdParamSchema } from '../validators/accounts.validator.js';
import * as transactionsController from '../controllers/transactions.controller.js';

const router = express.Router();

router.post(
  '/:accountId/transactions',
  validate(accountIdParamSchema, 'params'),
  validate(createTransactionSchema),
  asyncHandler(transactionsController.createTransaction)
);

router.get(
  '/:accountId/transactions',
  validate(accountIdParamSchema, 'params'),
  validate(historyQuerySchema, 'query'),
  asyncHandler(transactionsController.getHistory)
);

export default router;
