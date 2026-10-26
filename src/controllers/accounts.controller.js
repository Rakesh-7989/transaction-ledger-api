import * as accountsService from '../services/accounts.service.js';

export async function createAccount(req, res, next) {
  try {
    const account = await accountsService.createAccount(req.body);
    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
}

export async function getBalance(req, res, next) {
  try {
    const balance = await accountsService.getBalance(req.params.accountId);
    res.status(200).json({ account_id: req.params.accountId, balance });
  } catch (err) {
    next(err);
  }
}
