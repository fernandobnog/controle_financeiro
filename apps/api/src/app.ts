import fastify from 'fastify';
import cors from '@fastify/cors';

import { closeDatabase, prepareDatabase } from './infra/db/database.js';
import { diagnosisRoute } from './modules/diagnosis/diagnosis.route.js';
import { healthRoute } from './modules/health/health.route.js';
import { documentsRoute } from './modules/intake/documents.route.js';
import { plansRoute } from './modules/plans/plans.route.js';

export const buildApp = () => {
  const app = fastify({
    logger: {
      level: 'info'
    }
  });

  app.register(cors, {
    origin: true
  });
  app.addHook('onReady', async () => {
    await prepareDatabase();
  });
  app.addHook('onClose', async () => {
    await closeDatabase();
  });
  app.register(healthRoute, { prefix: '/api' });
  app.register(documentsRoute, { prefix: '/api' });
  app.register(diagnosisRoute, { prefix: '/api' });
  app.register(plansRoute, { prefix: '/api' });

  return app;
};