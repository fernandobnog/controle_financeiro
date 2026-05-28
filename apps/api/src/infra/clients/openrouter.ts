import { z } from 'zod';

import { env } from '../env.js';
import { sanitizeForLog } from '../log-sanitizer.js';

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string()
});

const chatCompletionResponseSchema = z.object({
  id: z.string(),
  choices: z
    .array(
      z.object({
        message: z.object({
          role: z.string(),
          content: z.string()
        }),
        finish_reason: z.string().optional()
      })
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number()
    })
    .optional()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatCompletionResponse = z.infer<typeof chatCompletionResponseSchema>;

interface ChatCompletionOptions {
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
  retries?: number;
}

const MOCK_RESPONSE: ChatCompletionResponse = {
  id: 'mock-openrouter-response',
  choices: [
    {
      message: {
        role: 'assistant',
        content: '[mock] Resposta simulada do OpenRouter — MOCK_EXTERNAL_SERVICES=true'
      },
      finish_reason: 'stop'
    }
  ]
};

// Limite de concorrência: no máximo 3 chamadas simultâneas ao OpenRouter
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;

const withConcurrencyLimit = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    throw new Error(`Limite de ${MAX_CONCURRENT_REQUESTS} requisições simultâneas ao OpenRouter atingido. Tente novamente em instantes.`);
  }

  activeRequests += 1;

  try {
    return await fn();
  } finally {
    activeRequests -= 1;
  }
};

const callOpenRouter = async (
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> => {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY nao configurado. Configure a chave ou ative MOCK_EXTERNAL_SERVICES.');
  }

  if (!env.OPENROUTER_BASE_URL) {
    throw new Error('OPENROUTER_BASE_URL nao configurado.');
  }

  const timeoutMs = options.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.OPENROUTER_HTTP_REFERER ?? '',
        'X-Title': env.OPENROUTER_APP_TITLE
      },
      body: JSON.stringify({
        model: options.model ?? env.OPENROUTER_MODEL_DEFAULT,
        messages,
        ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens })
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      // Nunca loga o body completo pois pode conter dados sensíveis
      throw new Error(`OpenRouter respondeu com status ${response.status}.`);
    }

    const raw: unknown = await response.json();
    const parsed = chatCompletionResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw new Error('Resposta do OpenRouter em formato inesperado.');
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`OpenRouter nao respondeu dentro do limite de ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const chatCompletion = async (
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResponse> => {
  if (env.MOCK_EXTERNAL_SERVICES) {
    return MOCK_RESPONSE;
  }

  const maxRetries = options.retries ?? 2;

  // Nunca loga as mensagens diretamente — usa sanitizeForLog para remover conteúdo sensível
  const _ = sanitizeForLog; // Import used for future log statements

  return withConcurrencyLimit(async () => {
    let lastError: Error = new Error('Falha desconhecida.');

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await callOpenRouter(messages, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Não faz retry em erros de timeout ou limite de concorrência
        if (lastError.message.includes('ms.') || lastError.message.includes('simultâneas')) {
          throw lastError;
        }
      }
    }

    throw lastError;
  });
};

// Exporta o sanitizador para uso nos callers
export { sanitizeForLog };
