import type {
  AuthMessage,
  ChangePasswordInput,
  DocumentCreated,
  DocumentListItem,
  DocumentReview,
  FileServerUploadReceipt,
  FinancialDiagnosisSummary,
  FinancialDiagnosisExplained,
  FinancialCase,
  LoginInput,
  OnboardingProfileInput,
  PasswordRecoveryRequestInput,
  PasswordRecoveryRequestResult,
  PasswordResetInput,
  PlanComparison,
  PlanComparisonExplained,
  ReviewItemInput,
  RegisterDocumentInput,
  RegisterInput,
  Session,
  UpdateOcrEntryInput
} from '@controle-financeiro/shared-contracts';
import { clearCurrentSession, getCurrentAccessToken } from '@/shared/auth/session';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';
const FILE_SERVER_BASE_URL = import.meta.env.VITE_FILE_SERVER_BASE_URL ?? 'http://localhost:3002/api';

interface JsonRequestInit extends RequestInit {
  skipAuth?: boolean;
}

const requestJson = async <T>(url: string, init: JsonRequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  const { skipAuth, ...requestInit } = init;

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const accessToken = getCurrentAccessToken();

    if (accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(url, {
    ...requestInit,
    headers
  });

  if (response.status === 401 && !skipAuth) {
    clearCurrentSession();
  }

  if (!response.ok) {
    let message = `Falha ao carregar ${url}`;

    try {
      const body = (await response.json()) as { message?: string };

      if (body.message) {
        message = body.message;
      }
    } catch {
      // noop
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
};

const fetchJson = async <T>(path: string, init: RequestInit = {}): Promise<T> =>
  requestJson<T>(`${API_BASE_URL}${path}`, init);

export const loginUser = (payload: LoginInput) =>
  requestJson<Session>(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true
  });

export const registerUser = (payload: RegisterInput) =>
  requestJson<Session>(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true
  });

export const requestPasswordRecovery = (payload: PasswordRecoveryRequestInput) =>
  requestJson<PasswordRecoveryRequestResult>(`${API_BASE_URL}/auth/password-recovery`, {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true
  });

export const resetPassword = (payload: PasswordResetInput) =>
  requestJson<Session>(`${API_BASE_URL}/auth/password-reset`, {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true
  });

export const changePassword = (payload: ChangePasswordInput) =>
  fetchJson<AuthMessage>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const getOnboardingProfile = () => fetchJson<FinancialCase>('/onboarding/profile');

export const saveOnboardingProfile = (payload: OnboardingProfileInput) =>
  fetchJson<FinancialCase>('/onboarding/profile', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

export const getDiagnosisSummary = () => fetchJson<FinancialDiagnosisSummary>('/diagnosis/summary');
export const getDiagnosisExplained = () => fetchJson<FinancialDiagnosisExplained>('/diagnosis/explained');
export const getPlanComparison = () => fetchJson<PlanComparison>('/plans/comparison');
export const getPlanComparisonExplained = () => fetchJson<PlanComparisonExplained>('/plans/comparison/explained');
export const getDocuments = () => fetchJson<DocumentListItem[]>('/documents');
export const getDocumentReview = (documentId: string) =>
  fetchJson<DocumentReview>(`/documents/${documentId}/review`);
export const registerDocument = (payload: RegisterDocumentInput) =>
  fetchJson<DocumentCreated>('/documents', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
export const updateDocumentOcrEntry = (
  documentId: string,
  entryId: string,
  payload: UpdateOcrEntryInput
) =>
  fetchJson<DocumentReview>(`/documents/${documentId}/ocr-entries/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

interface ExtractedItemsResponse {
  documentId: string;
  totalItems: number;
  pendingReview: number;
  groups: Record<string, unknown[]>;
}

interface PipelineStatusResponse {
  status: string;
  detail: string | null;
  timestamp: string;
}

interface ReviewItemResponse {
  itemId: string;
  decision: string;
  pendingItemsRemaining: number;
}

export const getDocumentItems = (documentId: string) =>
  fetchJson<ExtractedItemsResponse>(`/documents/${documentId}/items`);

export const getPipelineStatus = (documentId: string) =>
  fetchJson<PipelineStatusResponse>(`/documents/${documentId}/pipeline-status`);

export const reviewExtractedItem = (documentId: string, itemId: string, payload: ReviewItemInput) =>
  fetchJson<ReviewItemResponse>(`/documents/${documentId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

export const processDocument = (
  documentId: string,
  payload: { mimeType: string; filename: string; fileBase64: string; householdId?: string }
) =>
  fetchJson<{ documentId: string; message: string }>(`/documents/${documentId}/process`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
export const uploadFileToStorage = async (householdId: string, file: File): Promise<FileServerUploadReceipt> => {
  const formData = new FormData();

  formData.append('household_id', householdId);
  formData.append('file', file);

  return requestJson<FileServerUploadReceipt>(`${FILE_SERVER_BASE_URL}/documents`, {
    method: 'POST',
    body: formData
  });
};