import { z } from 'zod';

import { env } from '../env.js';

const uploadResponseSchema = z.object({
  id: z.string(),
  status: z.string()
});

const jobStatusSchema = z.object({
  status: z.enum(['PENDING', 'SUCCESS', 'ERROR', 'PARTIAL_SUCCESS']),
  error_message: z.string().optional()
});

const jobResultSchema = z.object({
  markdown: z.string()
});

export interface ParseResult {
  jobId: string;
  markdown: string;
}

const MOCK_JOB_ID = 'mock-llamaparse-job';
const MOCK_MARKDOWN = `# Documento simulado — MOCK_EXTERNAL_SERVICES=true

## Lancamentos

| Data | Descricao | Valor |
|------|-----------|-------|
| 2026-01-10 | Salario | 5000.00 |
| 2026-01-15 | Aluguel | -1500.00 |
| 2026-01-20 | Mercado | -800.00 |
`;

export const submitDocument = async (
  fileBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> => {
  if (env.MOCK_EXTERNAL_SERVICES) {
    return MOCK_JOB_ID;
  }

  if (!env.LLAMAPARSE_API_KEY) {
    throw new Error('LLAMAPARSE_API_KEY nao configurado. Configure a chave ou ative MOCK_EXTERNAL_SERVICES.');
  }

  if (!env.LLAMAPARSE_BASE_URL) {
    throw new Error('LLAMAPARSE_BASE_URL nao configurado.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.LLAMAPARSE_TIMEOUT_MS);

  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });

    formData.append('file', blob, filename);
    formData.append('result_type', env.LLAMAPARSE_RESULT_TYPE);

    const response = await fetch(`${env.LLAMAPARSE_BASE_URL}/api/parsing/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.LLAMAPARSE_API_KEY}`
      },
      body: formData,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`LlamaParse respondeu com status ${response.status} ao receber o arquivo.`);
    }

    const raw: unknown = await response.json();
    const parsed = uploadResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw new Error('Resposta do LlamaParse ao enviar arquivo em formato inesperado.');
    }

    return parsed.data.id;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`LlamaParse nao respondeu ao envio dentro do limite de ${env.LLAMAPARSE_TIMEOUT_MS}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const pollJobResult = async (jobId: string): Promise<ParseResult> => {
  if (env.MOCK_EXTERNAL_SERVICES) {
    return { jobId: MOCK_JOB_ID, markdown: MOCK_MARKDOWN };
  }

  if (!env.LLAMAPARSE_API_KEY || !env.LLAMAPARSE_BASE_URL) {
    throw new Error('LLAMAPARSE_API_KEY ou LLAMAPARSE_BASE_URL nao configurados.');
  }

  const deadline = Date.now() + env.LLAMAPARSE_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const statusResponse = await fetch(`${env.LLAMAPARSE_BASE_URL}/api/parsing/job/${jobId}`, {
      headers: { Authorization: `Bearer ${env.LLAMAPARSE_API_KEY}` }
    });

    if (!statusResponse.ok) {
      throw new Error(`LlamaParse retornou status ${statusResponse.status} ao consultar job ${jobId}.`);
    }

    const rawStatus: unknown = await statusResponse.json();
    const parsedStatus = jobStatusSchema.safeParse(rawStatus);

    if (!parsedStatus.success) {
      throw new Error('Status do job LlamaParse em formato inesperado.');
    }

    if (parsedStatus.data.status === 'ERROR') {
      throw new Error(`LlamaParse reportou erro no job ${jobId}: ${parsedStatus.data.error_message ?? 'desconhecido'}`);
    }

    if (parsedStatus.data.status === 'SUCCESS' || parsedStatus.data.status === 'PARTIAL_SUCCESS') {
      const resultResponse = await fetch(
        `${env.LLAMAPARSE_BASE_URL}/api/parsing/job/${jobId}/result/${env.LLAMAPARSE_RESULT_TYPE}`,
        { headers: { Authorization: `Bearer ${env.LLAMAPARSE_API_KEY}` } }
      );

      if (!resultResponse.ok) {
        throw new Error(`LlamaParse retornou status ${resultResponse.status} ao buscar resultado do job ${jobId}.`);
      }

      const rawResult: unknown = await resultResponse.json();
      const parsedResult = jobResultSchema.safeParse(rawResult);

      if (!parsedResult.success) {
        throw new Error('Resultado do LlamaParse em formato inesperado.');
      }

      return { jobId, markdown: parsedResult.data.markdown };
    }

    await new Promise((resolve) => setTimeout(resolve, env.LLAMAPARSE_POLL_INTERVAL_MS));
  }

  throw new Error(`LlamaParse nao concluiu o job ${jobId} dentro do limite de ${env.LLAMAPARSE_TIMEOUT_MS}ms.`);
};
