import type { Session } from '@controle-financeiro/shared-contracts';
import { sessionSchema } from '@controle-financeiro/shared-contracts';
import { reactive } from 'vue';

const SESSION_STORAGE_KEY = 'controle-financeiro.session';

const parseStoredSession = (rawSession: string | null): Session | null => {
  if (!rawSession) {
    return null;
  }

  try {
    const session = sessionSchema.parse(JSON.parse(rawSession));

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
};

const readStoredSession = (): Session | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const session = parseStoredSession(window.localStorage.getItem(SESSION_STORAGE_KEY));

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  return session;
};

export const authState = reactive({
  session: readStoredSession() as Session | null
});

export const getCurrentSession = (): Session | null => {
  const currentSession = authState.session;

  if (!currentSession) {
    return null;
  }

  if (new Date(currentSession.expiresAt).getTime() <= Date.now()) {
    clearCurrentSession();
    return null;
  }

  return currentSession;
};

export const getCurrentAccessToken = (): string | null => getCurrentSession()?.accessToken ?? null;

export const hasActiveSession = (): boolean => getCurrentSession() !== null;

export const setCurrentSession = (session: Session): void => {
  authState.session = session;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
};

export const clearCurrentSession = (): void => {
  authState.session = null;

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
};