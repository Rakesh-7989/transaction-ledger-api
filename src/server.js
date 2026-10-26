import { app } from './app.js';
import { config } from './config/env.js';

const server = app.listen(config.port, () => {
  console.log(
    `Transaction Ledger API listening on http://localhost:${config.port} (${config.nodeEnv})`
  );
});

export default server;
