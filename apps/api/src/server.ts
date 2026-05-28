import { buildApp } from './app.js';
import { env } from './infra/env.js';

const port = env.PORT;
const host = env.HOST;

const start = async () => {
  const app = buildApp();

  try {
    await app.listen({ host, port });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

await start();