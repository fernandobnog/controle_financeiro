import type { FastifyPluginAsync } from 'fastify';

import { queryDatabase } from '../../infra/db/database.js';

export const healthRoute: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    await queryDatabase('SELECT 1');

    return {
      status: 'ok',
      service: 'api',
      database: 'ok',
      timestamp: new Date().toISOString()
    };
  });
};