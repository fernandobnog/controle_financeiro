import fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';

import { closeDatabase, prepareDatabase } from './infra/db/database.js';
import { authRoute } from './modules/auth/auth.route.js';
import {
  isPublicRoute,
  readBearerToken,
  setRequestAuthContext,
  verifyAccessToken
} from './modules/auth/auth.service.js';
import { diagnosisRoute } from './modules/diagnosis/diagnosis.route.js';
import { healthRoute } from './modules/health/health.route.js';
import { documentsRoute } from './modules/intake/documents.route.js';
import { pipelineRoute } from './modules/intake/pipeline.route.js';
import { onboardingRoute } from './modules/onboarding/onboarding.route.js';
import { plansRoute } from './modules/plans/plans.route.js';

// 15 MB allows up to 10 MB decoded files (base64 overhead ~33%) plus JSON framing
const BODY_LIMIT_BYTES = 15 * 1024 * 1024;

export const buildApp = () => {
  const app = fastify({
    logger: {
      level: 'info'
    },
    bodyLimit: BODY_LIMIT_BYTES
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
  app.addHook('preHandler', async (request, reply) => {
    if (isPublicRoute(request)) {
      return;
    }

    const accessToken = readBearerToken(request.headers.authorization);

    if (!accessToken) {
      return reply.code(401).send({ message: 'Sessao nao autenticada.' });
    }

    const authContext = verifyAccessToken(accessToken);

    if (!authContext) {
      return reply.code(401).send({ message: 'Sessao nao autenticada.' });
    }

    setRequestAuthContext(request, authContext);
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      request.log.warn(
        {
          issues: error.issues.map((issue) => ({
            code: issue.code,
            path: issue.path
          }))
        },
        'Request validation failed'
      );

      return reply.code(400).send({ message: 'Dados invalidos enviados para a requisicao.' });
    }

    request.log.error(error);

    const handledError = error instanceof Error ? Object.assign(error, { statusCode: undefined as number | undefined }) : null;
    const statusCode = typeof handledError?.statusCode === 'number' && handledError.statusCode >= 400 ? handledError.statusCode : 500;

    return reply.code(statusCode).send({
      message: statusCode >= 500 ? 'Erro interno do servidor.' : handledError?.message ?? 'Erro na requisicao.'
    });
  });
  app.register(healthRoute, { prefix: '/api' });
  app.register(authRoute, { prefix: '/api' });
  app.register(onboardingRoute, { prefix: '/api' });
  app.register(documentsRoute, { prefix: '/api' });
  app.register(pipelineRoute, { prefix: '/api' });
  app.register(diagnosisRoute, { prefix: '/api' });
  app.register(plansRoute, { prefix: '/api' });

  return app;
};