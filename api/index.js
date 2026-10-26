/**
 * Vercel serverless entry point.
 *
 * Imports the shared Express app from src/app.js and exports it as the
 * default handler. Vercel Node.js runtimes call this function for every
 * request to /api/* (or the configured route).
 */
import { app } from '../src/app.js';

export default app;
