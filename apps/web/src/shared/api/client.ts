import type {
  ActionPlan,
  DocumentRecord,
  FileServerDocument,
  FinancialDiagnosis,
  RegisterDocumentInput,
  UpdateOcrEntryInput
} from '@controle-financeiro/shared-contracts';

interface PlanComparisonResponse {
  householdId: string;
  avalanche: ActionPlan;
  snowball: ActionPlan;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';
const FILE_SERVER_BASE_URL = import.meta.env.VITE_FILE_SERVER_BASE_URL ?? 'http://localhost:3002/api';

const requestJson = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers
  });

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

export const getDiagnosisSummary = () => fetchJson<FinancialDiagnosis>('/diagnosis/summary');
export const getPlanComparison = () => fetchJson<PlanComparisonResponse>('/plans/comparison');
export const getDocuments = () => fetchJson<DocumentRecord[]>('/documents');
export const getDocumentReview = (documentId: string) =>
  fetchJson<DocumentRecord>(`/documents/${documentId}/review`);
export const registerDocument = (payload: RegisterDocumentInput) =>
  fetchJson<DocumentRecord>('/documents', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
export const updateDocumentOcrEntry = (
  documentId: string,
  entryId: string,
  payload: UpdateOcrEntryInput
) =>
  fetchJson<DocumentRecord>(`/documents/${documentId}/ocr-entries/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
export const uploadFileToStorage = async (householdId: string, file: File): Promise<FileServerDocument> => {
  const formData = new FormData();

  formData.append('household_id', householdId);
  formData.append('file', file);

  return requestJson<FileServerDocument>(`${FILE_SERVER_BASE_URL}/documents`, {
    method: 'POST',
    body: formData
  });
};