import express from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import accountsRoutes from './routes/accounts.routes.js';
import transactionsRoutes from './routes/transactions.routes.js';

const app = express();

app.use(express.json());

// Health check endpoint.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'transaction-ledger-api' });
});

// API routes (both mounted under /accounts).
app.use('/accounts', accountsRoutes);
app.use('/accounts', transactionsRoutes);

// 404 (includes transaction update/delete which are intentionally absent).
app.use(notFound);

// Centralised error handler (last).
app.use(errorHandler);

export { app };
