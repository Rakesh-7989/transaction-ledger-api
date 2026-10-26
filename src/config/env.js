import dotenv from 'dotenv';

dotenv.config();

const required = ['DATABASE_URL'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}`
  );
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
};
