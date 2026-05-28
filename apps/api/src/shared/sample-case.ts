import type { BudgetEnvelopeInput, DebtInput, DocumentRecord, IncomeInput, OcrEntry } from '@controle-financeiro/shared-contracts';

const ocrEntries: OcrEntry[] = [
  {
    id: 'ocr-1',
    description: 'Salario recebido',
    amount: 4200,
    occurredAt: '2026-05-01',
    category: 'income',
    reviewed: true
  },
  {
    id: 'ocr-2',
    description: 'Cartao Banco B',
    amount: -180,
    occurredAt: '2026-05-03',
    category: 'debt-payment',
    reviewed: false
  }
];

export const sampleIncomes: IncomeInput[] = [
  { id: 'income-1', label: 'Salario principal', amount: 4200, recurring: true },
  { id: 'income-2', label: 'Renda extra', amount: 600, recurring: false }
];

export const sampleDebts: DebtInput[] = [
  { id: 'debt-1', creditor: 'Banco A', balance: 9000, monthlyPayment: 450, interestRate: 4.2, overdueMonths: 1 },
  { id: 'debt-2', creditor: 'Cartao B', balance: 2400, monthlyPayment: 180, interestRate: 9.8, overdueMonths: 0 },
  { id: 'debt-3', creditor: 'Loja C', balance: 1200, monthlyPayment: 120, interestRate: 2.1, overdueMonths: 2 }
];

export const sampleEnvelopes: BudgetEnvelopeInput[] = [
  { category: 'Moradia', plannedAmount: 1200, actualAmount: 1200 },
  { category: 'Alimentacao', plannedAmount: 800, actualAmount: 760 },
  { category: 'Transporte', plannedAmount: 280, actualAmount: 310 },
  { category: 'Saude', plannedAmount: 220, actualAmount: 210 }
];

export const sampleDocuments: DocumentRecord[] = [
  {
    id: 'doc-1',
    householdId: 'household-1',
    fileServerDocumentId: 'stored-doc-legacy-1',
    filename: 'extrato-maio.pdf',
    mimeType: 'application/pdf',
    sizeInBytes: 4096,
    status: 'review',
    signedDownloadUrl: null,
    ocrEntries
  }
];

export const sampleHousehold = {
  householdId: 'household-1',
  householdName: 'Familia Souza',
  incomes: sampleIncomes,
  debts: sampleDebts,
  envelopes: sampleEnvelopes,
  documents: sampleDocuments
};