import { z } from 'zod';

const booleanString = z
  .string()
  .transform((value) => value === 'true')
  .or(z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().url().optional(),
  AUTO_SEED_DB: booleanString.default(false),

  APP_AUTH_SECRET: z.string().min(16).optional(),

  MOCK_EXTERNAL_SERVICES: booleanString.default(true),
  FILE_SERVER_URL: z.string().url().optional(),

  OPENROUTER_BASE_URL: z.string().url().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL_DEFAULT: z.string().default('openai/gpt-4.1-mini'),
  OPENROUTER_HTTP_REFERER: z.string().optional(),
  OPENROUTER_APP_TITLE: z.string().default('controle-financeiro'),

  LLAMAPARSE_BASE_URL: z.string().url().optional(),
  LLAMAPARSE_API_KEY: z.string().optional(),
  LLAMAPARSE_RESULT_TYPE: z.string().default('markdown'),
  LLAMAPARSE_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  LLAMAPARSE_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2_000),

  COGNEE_BASE_URL: z.string().url().optional(),
  COGNEE_API_KEY: z.string().optional(),
  COGNEE_PROJECT_ID: z.string().optional(),
  COGNEE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  process.stderr.write(`[env] Variaveis de ambiente invalidas:\n${issues}\n`);
  process.exit(1);
}

const rawEnv = parsed.data;

if (rawEnv.NODE_ENV === 'production') {
  const missing: string[] = [];

  if (!rawEnv.APP_AUTH_SECRET) {
    missing.push('APP_AUTH_SECRET');
  }

  if (!rawEnv.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  if (!rawEnv.MOCK_EXTERNAL_SERVICES) {
    if (!rawEnv.OPENROUTER_API_KEY) {
      missing.push('OPENROUTER_API_KEY');
    }

    if (!rawEnv.LLAMAPARSE_API_KEY) {
      missing.push('LLAMAPARSE_API_KEY');
    }
  }

  if (missing.length > 0) {
    process.stderr.write(
      `[env] Variaveis obrigatorias em producao nao configuradas: ${missing.join(', ')}\n`
    );
    process.exit(1);
  }
}

export const env = rawEnv;
