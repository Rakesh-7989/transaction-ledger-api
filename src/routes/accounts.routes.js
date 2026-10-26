import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { validate } from '../middleware/validate.js';
import {
  createAccountSchema,
  accountIdParamSchema,
} from '../validators/accounts.validator.js';
import * as accountsController from '../controllers/accounts.controller.js';

const router = express.Router();

router.post(
  '/',
  validate(createAccountSchema),
  asyncHandler(accountsController.createAccount)
);

router.get(
  '/:accountId/balance',
  validate(accountIdParamSchema, 'params'),
  asyncHandler(accountsController.getBalance)
);

export default router;
