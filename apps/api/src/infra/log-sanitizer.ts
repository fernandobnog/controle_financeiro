/**
 * Utilitário de sanitização de dados sensíveis para logs.
 * Mascara valores de chaves que correspondem a padrões sensíveis.
 * NUNCA expõe tokens, API keys ou senhas em logs.
 */

const SENSITIVE_KEY_PATTERN = /api[_-]?key|secret|token|password|authorization|bearer|credential|passphrase|private[_-]?key/iu;
const MASK = '[REDACTED]';

type SanitizableValue = string | number | boolean | null | undefined | SanitizableObject | SanitizableValue[];
type SanitizableObject = Record<string, SanitizableValue>;

export const sanitizeForLog = (value: unknown, depth = 0): unknown => {
  // Evita recursão infinita
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Mascara strings longas que parecem tokens (Bearer, base64, etc.)
    if (value.startsWith('Bearer ') || /^[A-Za-z0-9+/=]{40,}$/u.test(value)) {
      return MASK;
    }

    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  const obj = value as Record<string, unknown>;

  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = MASK;
    } else {
      sanitized[key] = sanitizeForLog(val, depth + 1);
    }
  }

  return sanitized;
};

/**
 * Sanitiza headers HTTP para log — mascara Authorization e similares.
 */
export const sanitizeHeaders = (headers: Record<string, string | string[] | undefined>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = MASK;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};
