import { env } from '../env.js';

export interface CogneeDocument {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface CogneeQueryResult {
  status: 'ok' | 'not-implemented';
  answer?: string;
}

export interface CogneeAddResult {
  status: 'ok' | 'not-implemented';
  documentId?: string;
}

const isCogneeEnabled = (): boolean =>
  !env.MOCK_EXTERNAL_SERVICES && Boolean(env.COGNEE_API_KEY) && Boolean(env.COGNEE_BASE_URL);

export const addDocument = async (
  document: CogneeDocument
): Promise<CogneeAddResult> => {
  if (!isCogneeEnabled()) {
    return { status: 'not-implemented' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.COGNEE_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.COGNEE_BASE_URL}/api/v1/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.COGNEE_API_KEY}`
      },
      body: JSON.stringify({
        content: document.content,
        metadata: document.metadata,
        project_id: env.COGNEE_PROJECT_ID
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Cognee respondeu com status ${response.status} ao adicionar documento.`);
    }

    const raw = (await response.json()) as { id?: string };

    return { status: 'ok', documentId: raw.id };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Cognee nao respondeu dentro do limite de ${env.COGNEE_TIMEOUT_MS}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const query = async (prompt: string): Promise<CogneeQueryResult> => {
  if (!isCogneeEnabled()) {
    return { status: 'not-implemented' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.COGNEE_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.COGNEE_BASE_URL}/api/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.COGNEE_API_KEY}`
      },
      body: JSON.stringify({ query: prompt, project_id: env.COGNEE_PROJECT_ID }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Cognee respondeu com status ${response.status} ao processar consulta.`);
    }

    const raw = (await response.json()) as { answer?: string };

    return { status: 'ok', answer: raw.answer };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Cognee nao respondeu dentro do limite de ${env.COGNEE_TIMEOUT_MS}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
