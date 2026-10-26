import * as transactionsService from '../services/transactions.service.js';

export async function createTransaction(req, res, next) {
  try {
    const result = await transactionsService.createTransaction({
      accountId: req.params.accountId,
      ...req.body,
    });
    res.status(201).json(result.transaction);
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req, res, next) {
  try {
    const result = await transactionsService.getHistory(
      req.params.accountId,
      req.query
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
