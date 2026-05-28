import assert from 'node:assert/strict';
import test from 'node:test';

import {
  diagnosisSummarySchema,
  documentCreatedSchema,
  documentReviewSchema,
  planComparisonSchema,
  updateOcrEntryInputSchema
} from './index.js';

test('diagnosisSummarySchema keeps only the dashboard metrics rendered by the frontend', () => {
  const payload = diagnosisSummarySchema.parse({
    householdId: 'household-1',
    monthlyIncome: 4800,
    monthlyDebtPayments: 750,
    dtiPercent: 15.63,
    classification: 'alert',
    debtCount: 3,
    totalDebtBalance: 12600,
    budgetRemaining: 2290
  });

  assert.deepEqual(payload, {
    monthlyIncome: 4800,
    monthlyDebtPayments: 750,
    dtiPercent: 15.63,
    classification: 'alert',
    totalDebtBalance: 12600
  });
});

test('planComparisonSchema strips strategy metadata and keeps only creditor and recommended payment', () => {
  const payload = planComparisonSchema.parse({
    avalanche: {
      strategy: 'avalanche',
      installments: [
        {
          debtId: 'debt-1',
          creditor: 'Banco A',
          recommendedPayment: 450,
          priority: 2
        }
      ]
    },
    snowball: {
      strategy: 'snowball',
      installments: [
        {
          debtId: 'debt-2',
          creditor: 'Cartao B',
          recommendedPayment: 480,
          priority: 1
        }
      ]
    }
  });

  assert.deepEqual(payload, {
    avalanche: {
      installments: [{ creditor: 'Banco A', recommendedPayment: 450 }]
    },
    snowball: {
      installments: [{ creditor: 'Cartao B', recommendedPayment: 480 }]
    }
  });
});

test('document schemas keep only the fields consumed by the intake flow', () => {
  const createdDocument = documentCreatedSchema.parse({
    id: 'doc-1',
    filename: 'extrato.pdf',
    status: 'review',
    fileServerDocumentId: 'stored-doc-1'
  });
  const reviewDocument = documentReviewSchema.parse({
    id: 'doc-1',
    filename: 'extrato.pdf',
    status: 'review',
    signedDownloadUrl: 'http://localhost:3002/files/extrato.pdf',
    fileServerDocumentId: 'stored-doc-1',
    ocrEntries: [
      {
        id: 'ocr-1',
        description: 'Lancamento inicial',
        amount: 250.75,
        occurredAt: '2026-05-28',
        category: 'unclassified',
        reviewed: false,
        sourceLine: 1
      }
    ]
  });

  assert.deepEqual(createdDocument, {
    id: 'doc-1',
    filename: 'extrato.pdf',
    status: 'review'
  });
  assert.deepEqual(reviewDocument, {
    id: 'doc-1',
    filename: 'extrato.pdf',
    status: 'review',
    signedDownloadUrl: 'http://localhost:3002/files/extrato.pdf',
    ocrEntries: [
      {
        id: 'ocr-1',
        description: 'Lancamento inicial',
        amount: 250.75,
        occurredAt: '2026-05-28',
        category: 'unclassified',
        reviewed: false
      }
    ]
  });
});

test('updateOcrEntryInputSchema fails fast when the review patch is empty', () => {
  assert.throws(() => updateOcrEntryInputSchema.parse({}), /Informe ao menos um campo/);
});