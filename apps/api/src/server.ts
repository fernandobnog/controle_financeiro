import { buildApp } from './app.js';

const port = Number(process.env.PORT ?? '3001');
const host = process.env.HOST ?? '0.0.0.0';

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