import request from 'supertest';

import { buildApp } from '../src/app.js';
import {
  defaultHouseholdId,
  defaultUserEmail,
  defaultUserPassword,
  secondaryHouseholdId,
  secondaryUserEmail,
  secondaryUserPassword
} from '../src/infra/db/seed.js';

const login = async (app: ReturnType<typeof buildApp>, email = defaultUserEmail, password = defaultUserPassword) => {
  const response = await request(app.server).post('/api/auth/login').send({ email, password });

  expect(response.status).toBe(200);

  return response.body.accessToken as string;
};

const withBearer = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`
});

describe('API bootstrap', () => {
  it('returns health information', async () => {
    const app = buildApp();
    await app.ready();
    const response = await request(app.server).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');

    await app.close();
  });

  it('issues an authenticated session for the seeded user', async () => {
    const app = buildApp();
    await app.ready();
    const response = await request(app.server).post('/api/auth/login').send({
      email: defaultUserEmail,
      password: defaultUserPassword
    });

    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual(['accessToken', 'expiresAt', 'user']);
    expect(Object.keys(response.body.user).sort()).toEqual(['email', 'fullName']);

    await app.close();
  });

  it('registers a new account and immediately authorizes the first dashboard request', async () => {
    const app = buildApp();
    await app.ready();
    const registerResponse = await request(app.server).post('/api/auth/register').send({
      fullName: 'Maria Lima',
      email: 'maria.lima@example.com',
      householdName: 'Familia Lima',
      password: 'segredo123'
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user.email).toBe('maria.lima@example.com');
    expect(registerResponse.body.user.fullName).toBe('Maria Lima');

    const diagnosisResponse = await request(app.server)
      .get('/api/diagnosis/summary')
      .set(withBearer(registerResponse.body.accessToken));

    expect(diagnosisResponse.status).toBe(200);
    expect(diagnosisResponse.body.monthlyIncome).toBe(0);
    expect(diagnosisResponse.body.monthlyDebtPayments).toBe(0);
    expect(diagnosisResponse.body.dtiPercent).toBe(0);
    expect(diagnosisResponse.body.classification).toBe('sustainable');

    await app.close();
  });

  it('rejects registration when the email is already in use', async () => {
    const app = buildApp();
    await app.ready();
    const response = await request(app.server).post('/api/auth/register').send({
      fullName: 'Outra Pessoa',
      email: defaultUserEmail,
      householdName: 'Outra Familia',
      password: 'segredo123'
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Ja existe um usuario com este e-mail.');

    await app.close();
  });

  it('issues a recovery token and resets the password without exposing account existence', async () => {
    const app = buildApp();
    await app.ready();

    const recoveryResponse = await request(app.server).post('/api/auth/password-recovery').send({
      email: defaultUserEmail
    });

    expect(recoveryResponse.status).toBe(200);
    expect(recoveryResponse.body.message).toContain('Se existir uma conta');
    expect(typeof recoveryResponse.body.resetToken).toBe('string');

    const resetResponse = await request(app.server).post('/api/auth/password-reset').send({
      token: recoveryResponse.body.resetToken,
      newPassword: 'novaSenha123'
    });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.user.email).toBe(defaultUserEmail);

    const oldLoginResponse = await request(app.server).post('/api/auth/login').send({
      email: defaultUserEmail,
      password: defaultUserPassword
    });
    const newLoginResponse = await request(app.server).post('/api/auth/login').send({
      email: defaultUserEmail,
      password: 'novaSenha123'
    });

    expect(oldLoginResponse.status).toBe(401);
    expect(newLoginResponse.status).toBe(200);

    const unknownAccountRecovery = await request(app.server).post('/api/auth/password-recovery').send({
      email: 'desconhecido@example.com'
    });

    expect(unknownAccountRecovery.status).toBe(200);
    expect(unknownAccountRecovery.body.message).toBe(recoveryResponse.body.message);
    expect(unknownAccountRecovery.body.resetToken).toBeNull();

    await app.close();
  });

  it('changes the password for an authenticated session', async () => {
    const app = buildApp();
    await app.ready();
    const accessToken = await login(app);

    const changePasswordResponse = await request(app.server)
      .post('/api/auth/change-password')
      .set(withBearer(accessToken))
      .send({
        currentPassword: defaultUserPassword,
        newPassword: 'senhaAtualizada123'
      });

    expect(changePasswordResponse.status).toBe(200);
    expect(changePasswordResponse.body.message).toBe('Senha atualizada com sucesso.');

    const newLoginResponse = await request(app.server).post('/api/auth/login').send({
      email: defaultUserEmail,
      password: 'senhaAtualizada123'
    });

    expect(newLoginResponse.status).toBe(200);

    await app.close();
  });

  it('blocks protected endpoints when the request is unauthenticated', async () => {
    const app = buildApp();
    await app.ready();
    const response = await request(app.server).get('/api/diagnosis/summary');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Sessao nao autenticada.');

    await app.close();
  });

  it('returns minimal diagnosis and plan comparison payloads for the authenticated account', async () => {
    const app = buildApp();
    await app.ready();
    const accessToken = await login(app);

    const diagnosisResponse = await request(app.server)
      .get('/api/diagnosis/summary')
      .set(withBearer(accessToken));
    const plansResponse = await request(app.server)
      .get('/api/plans/comparison')
      .set(withBearer(accessToken));

    expect(diagnosisResponse.status).toBe(200);
    expect(Object.keys(diagnosisResponse.body).sort()).toEqual([
      'classification',
      'dtiPercent',
      'monthlyDebtPayments',
      'monthlyIncome',
      'totalDebtBalance'
    ]);
    expect(plansResponse.status).toBe(200);
    expect(Object.keys(plansResponse.body).sort()).toEqual(['avalanche', 'snowball']);
    expect(Object.keys(plansResponse.body.avalanche).sort()).toEqual(['installments']);
    expect(Object.keys(plansResponse.body.avalanche.installments[0]).sort()).toEqual([
      'creditor',
      'recommendedPayment'
    ]);

    await app.close();
  });

  it('rejects invalid household filters for diagnosis and plan queries with a safe validation message', async () => {
    const app = buildApp();
    await app.ready();
    const accessToken = await login(app);

    const diagnosisResponse = await request(app.server)
      .get('/api/diagnosis/summary')
      .query({ householdId: '   ' })
      .set(withBearer(accessToken));

    expect(diagnosisResponse.status).toBe(400);
    expect(diagnosisResponse.body).toEqual({ message: 'Dados invalidos enviados para a requisicao.' });

    const plansResponse = await request(app.server)
      .get('/api/plans/comparison')
      .query({ householdId: 'household/../1' })
      .set(withBearer(accessToken));

    expect(plansResponse.status).toBe(400);
    expect(plansResponse.body).toEqual({ message: 'Dados invalidos enviados para a requisicao.' });

    await app.close();
  });

  it('loads and updates the onboarding profile for the authenticated account', async () => {
    const app = buildApp();
    await app.ready();
    const accessToken = await login(app);

    const profileResponse = await request(app.server)
      .get('/api/onboarding/profile')
      .set(withBearer(accessToken));

    expect(profileResponse.status).toBe(200);
    expect(Object.keys(profileResponse.body).sort()).toEqual([
      'debts',
      'envelopes',
      'householdId',
      'householdName',
      'incomes'
    ]);

    const updateResponse = await request(app.server)
      .put('/api/onboarding/profile')
      .set(withBearer(accessToken))
      .send({
        householdName: 'Familia Souza Atualizada',
        incomes: [{ label: 'Salario principal', amount: 7500, recurring: true }],
        debts: [
          {
            creditor: 'Banco Central',
            balance: 12000,
            monthlyPayment: 650,
            interestRate: 1.8,
            overdueMonths: 0
          }
        ],
        envelopes: [{ category: 'Essenciais', plannedAmount: 2800, actualAmount: 0 }]
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.householdName).toBe('Familia Souza Atualizada');
    expect(updateResponse.body.incomes).toHaveLength(1);
    expect(updateResponse.body.debts).toHaveLength(1);
    expect(updateResponse.body.envelopes).toHaveLength(1);

    const diagnosisResponse = await request(app.server)
      .get('/api/diagnosis/summary')
      .set(withBearer(accessToken));

    expect(diagnosisResponse.status).toBe(200);
    expect(diagnosisResponse.body.monthlyIncome).toBe(7500);
    expect(diagnosisResponse.body.monthlyDebtPayments).toBe(650);
    expect(diagnosisResponse.body.totalDebtBalance).toBe(12000);

    await app.close();
  });

  it('rejects invalid onboarding payloads with a safe validation message', async () => {
    const app = buildApp();
    await app.ready();
    const accessToken = await login(app);

    const response = await request(app.server)
      .put('/api/onboarding/profile')
      .set(withBearer(accessToken))
      .send({
        householdName: '',
        incomes: [],
        debts: [],
        envelopes: []
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Dados invalidos enviados para a requisicao.' });

    await app.close();
  });

  it('rejects invalid document identifiers and household filters with a safe validation message', async () => {
    const app = buildApp();
    await app.ready();
    const accessToken = await login(app);
    const invalidIdentifier = 'invalid_identifier';

    const listResponse = await request(app.server)
      .get('/api/documents')
      .query({ householdId: '   ' })
      .set(withBearer(accessToken));

    expect(listResponse.status).toBe(400);
    expect(listResponse.body).toEqual({ message: 'Dados invalidos enviados para a requisicao.' });

    const reviewResponse = await request(app.server)
      .get(`/api/documents/${invalidIdentifier}/review`)
      .set(withBearer(accessToken));

    expect(reviewResponse.status).toBe(400);
    expect(reviewResponse.body).toEqual({ message: 'Dados invalidos enviados para a requisicao.' });

    const patchResponse = await request(app.server)
      .patch(`/api/documents/${invalidIdentifier}/ocr-entries/${invalidIdentifier}`)
      .set(withBearer(accessToken))
      .send({ reviewed: true });

    expect(patchResponse.status).toBe(400);
    expect(patchResponse.body).toEqual({ message: 'Dados invalidos enviados para a requisicao.' });

    await app.close();
  });

  it('returns minimal document payloads and persists editable OCR entries inside the account scope', async () => {
    const app = buildApp();
    await app.ready();
    const accessToken = await login(app);

    const registerResponse = await request(app.server)
      .post('/api/documents')
      .set(withBearer(accessToken))
      .send({
        householdId: defaultHouseholdId,
        fileServerDocumentId: 'stored-doc-1',
        filename: 'extrato-upload.pdf',
        mimeType: 'application/pdf',
        sizeInBytes: 4096,
        signedDownloadUrl: 'http://localhost:3002/rails/mock/extrato-upload.pdf'
      });

    expect(registerResponse.status).toBe(201);
    expect(Object.keys(registerResponse.body).sort()).toEqual(['filename', 'id', 'status']);

    const listResponse = await request(app.server).get('/api/documents').set(withBearer(accessToken));

    expect(listResponse.status).toBe(200);
    expect(Object.keys(listResponse.body[0]).sort()).toEqual(['filename', 'id']);

    const reviewResponse = await request(app.server)
      .get(`/api/documents/${registerResponse.body.id}/review`)
      .set(withBearer(accessToken));

    expect(reviewResponse.status).toBe(200);
    expect(Object.keys(reviewResponse.body).sort()).toEqual([
      'extractedItems',
      'filename',
      'id',
      'ocrEntries',
      'signedDownloadUrl',
      'status'
    ]);
    expect(reviewResponse.body.ocrEntries.length).toBeGreaterThan(0);

    const entryId = reviewResponse.body.ocrEntries[0].id;
    const updateResponse = await request(app.server)
      .patch(`/api/documents/${registerResponse.body.id}/ocr-entries/${entryId}`)
      .set(withBearer(accessToken))
      .send({ description: 'Lancamento revisado', amount: 250.75, reviewed: true });

    expect(updateResponse.status).toBe(200);
    expect(Object.keys(updateResponse.body).sort()).toEqual([
      'extractedItems',
      'filename',
      'id',
      'ocrEntries',
      'signedDownloadUrl',
      'status'
    ]);
    const updatedEntry = updateResponse.body.ocrEntries.find((entry: { id: string }) => entry.id === entryId);

    expect(updatedEntry?.description).toBe('Lancamento revisado');
    expect(updatedEntry?.reviewed).toBe(true);

    await app.close();
  });

  it('returns not found for missing review resources and rejects empty OCR patches safely', async () => {
    const app = buildApp();
    await app.ready();
    const accessToken = await login(app);

    const missingReviewResponse = await request(app.server)
      .get('/api/documents/documento-ausente/review')
      .set(withBearer(accessToken));

    expect(missingReviewResponse.status).toBe(404);
    expect(missingReviewResponse.body.message).toBe('Documento nao encontrado.');

    const registerResponse = await request(app.server)
      .post('/api/documents')
      .set(withBearer(accessToken))
      .send({
        householdId: defaultHouseholdId,
        fileServerDocumentId: 'stored-doc-invalid-patch',
        filename: 'extrato-invalid-patch.pdf',
        mimeType: 'application/pdf',
        sizeInBytes: 3072,
        signedDownloadUrl: 'http://localhost:3002/rails/mock/extrato-invalid-patch.pdf'
      });

    expect(registerResponse.status).toBe(201);

    const reviewResponse = await request(app.server)
      .get(`/api/documents/${registerResponse.body.id}/review`)
      .set(withBearer(accessToken));

    expect(reviewResponse.status).toBe(200);

    const entryId = reviewResponse.body.ocrEntries[0].id;
    const emptyPatchResponse = await request(app.server)
      .patch(`/api/documents/${registerResponse.body.id}/ocr-entries/${entryId}`)
      .set(withBearer(accessToken))
      .send({});

    expect(emptyPatchResponse.status).toBe(400);
    expect(emptyPatchResponse.body).toEqual({ message: 'Dados invalidos enviados para a requisicao.' });

    const missingDocumentPatchResponse = await request(app.server)
      .patch('/api/documents/documento-ausente/ocr-entries/entry-ausente')
      .set(withBearer(accessToken))
      .send({ reviewed: true });

    expect(missingDocumentPatchResponse.status).toBe(404);
    expect(missingDocumentPatchResponse.body.message).toBe('Documento nao encontrado.');

    await app.close();
  });

  it('forbids cross-account household and document access', async () => {
    const app = buildApp();
    await app.ready();
    const primaryAccessToken = await login(app);
    const secondaryAccessToken = await login(app, secondaryUserEmail, secondaryUserPassword);

    const forbiddenDiagnosis = await request(app.server)
      .get('/api/diagnosis/summary')
      .query({ householdId: defaultHouseholdId })
      .set(withBearer(secondaryAccessToken));

    expect(forbiddenDiagnosis.status).toBe(403);
    expect(forbiddenDiagnosis.body.message).toBe('Conta sem acesso ao caso familiar solicitado.');

    const forbiddenPlans = await request(app.server)
      .get('/api/plans/comparison')
      .query({ householdId: secondaryHouseholdId })
      .set(withBearer(primaryAccessToken));

    expect(forbiddenPlans.status).toBe(403);
    expect(forbiddenPlans.body.message).toBe('Conta sem acesso ao caso familiar solicitado.');

    const registerResponse = await request(app.server)
      .post('/api/documents')
      .set(withBearer(primaryAccessToken))
      .send({
        householdId: defaultHouseholdId,
        fileServerDocumentId: 'stored-doc-cross-account',
        filename: 'extrato-cross-account.pdf',
        mimeType: 'application/pdf',
        sizeInBytes: 2048,
        signedDownloadUrl: 'http://localhost:3002/rails/mock/extrato-cross-account.pdf'
      });

    expect(registerResponse.status).toBe(201);

    const forbiddenRegister = await request(app.server)
      .post('/api/documents')
      .set(withBearer(secondaryAccessToken))
      .send({
        householdId: defaultHouseholdId,
        fileServerDocumentId: 'stored-doc-foreign-household',
        filename: 'nao-autorizado.pdf',
        mimeType: 'application/pdf',
        sizeInBytes: 1024,
        signedDownloadUrl: null
      });

    expect(forbiddenRegister.status).toBe(403);
    expect(forbiddenRegister.body.message).toBe('Conta sem acesso ao caso familiar solicitado.');

    const forbiddenReview = await request(app.server)
      .get(`/api/documents/${registerResponse.body.id}/review`)
      .set(withBearer(secondaryAccessToken));

    expect(forbiddenReview.status).toBe(403);
    expect(forbiddenReview.body.message).toBe('Conta sem acesso ao documento solicitado.');

    await app.close();
  });
});

describe('Document pipeline (mock mode)', () => {
  it('accepts a valid process request and returns 202', async () => {
    const app = buildApp();
    await app.ready();
    const token = await login(app);

    // Register a document first
    const registerResponse = await request(app.server)
      .post('/api/documents')
      .set(withBearer(token))
      .send({
        householdId: defaultHouseholdId,
        fileServerDocumentId: 'test-pipeline-doc-001',
        filename: 'extrato-pipeline.pdf',
        mimeType: 'application/pdf',
        sizeInBytes: 2048,
        signedDownloadUrl: null
      });

    expect(registerResponse.status).toBe(201);

    const documentId = registerResponse.body.id as string;

    // 1 KB minimal valid PDF base64 placeholder (mock does not parse content)
    const fakeBase64 = Buffer.from('%PDF-1.4 fake content for mock').toString('base64');

    const processResponse = await request(app.server)
      .post(`/api/documents/${documentId}/process`)
      .set(withBearer(token))
      .send({
        householdId: defaultHouseholdId,
        mimeType: 'application/pdf',
        filename: 'extrato-pipeline.pdf',
        fileBase64: fakeBase64
      });

    expect(processResponse.status).toBe(202);
    expect(processResponse.body.documentId).toBe(documentId);
    expect(typeof processResponse.body.message).toBe('string');

    await app.close();
  });

  it('returns extracted items after mock processing', async () => {
    const app = buildApp();
    await app.ready();
    const token = await login(app);

    const registerResponse = await request(app.server)
      .post('/api/documents')
      .set(withBearer(token))
      .send({
        householdId: defaultHouseholdId,
        fileServerDocumentId: 'test-pipeline-items-001',
        filename: 'extrato-items.pdf',
        mimeType: 'application/pdf',
        sizeInBytes: 2048,
        signedDownloadUrl: null
      });

    const documentId = registerResponse.body.id as string;
    const fakeBase64 = Buffer.from('%PDF-1.4 fake content for mock').toString('base64');

    // Fire pipeline synchronously (mock resolves immediately)
    await request(app.server)
      .post(`/api/documents/${documentId}/process`)
      .set(withBearer(token))
      .send({
        householdId: defaultHouseholdId,
        mimeType: 'application/pdf',
        filename: 'extrato-items.pdf',
        fileBase64: fakeBase64
      });

    // Give async pipeline a moment to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    const itemsResponse = await request(app.server)
      .get(`/api/documents/${documentId}/items`)
      .set(withBearer(token));

    expect(itemsResponse.status).toBe(200);
    expect(itemsResponse.body.documentId).toBe(documentId);
    expect(typeof itemsResponse.body.totalItems).toBe('number');
    expect(typeof itemsResponse.body.pendingReview).toBe('number');
    expect(typeof itemsResponse.body.groups).toBe('object');

    await app.close();
  });

  it('returns pipeline status for a registered document', async () => {
    const app = buildApp();
    await app.ready();
    const token = await login(app);

    const registerResponse = await request(app.server)
      .post('/api/documents')
      .set(withBearer(token))
      .send({
        householdId: defaultHouseholdId,
        fileServerDocumentId: 'test-pipeline-status-001',
        filename: 'extrato-status.pdf',
        mimeType: 'application/pdf',
        sizeInBytes: 1024,
        signedDownloadUrl: null
      });

    const documentId = registerResponse.body.id as string;

    const fakeBase64 = Buffer.from('%PDF-1.4 fake content for mock').toString('base64');

    await request(app.server)
      .post(`/api/documents/${documentId}/process`)
      .set(withBearer(token))
      .send({
        mimeType: 'application/pdf',
        filename: 'extrato-status.pdf',
        fileBase64: fakeBase64
      });

    await new Promise((resolve) => setTimeout(resolve, 200));

    const statusResponse = await request(app.server)
      .get(`/api/documents/${documentId}/pipeline-status`)
      .set(withBearer(token));

    expect(statusResponse.status).toBe(200);
    expect(typeof statusResponse.body.status).toBe('string');

    await app.close();
  });

  it('rejects process request with unsupported MIME type', async () => {
    const app = buildApp();
    await app.ready();
    const token = await login(app);

    const registerResponse = await request(app.server)
      .post('/api/documents')
      .set(withBearer(token))
      .send({
        householdId: defaultHouseholdId,
        fileServerDocumentId: 'test-pipeline-mime-001',
        filename: 'arquivo.exe',
        mimeType: 'application/x-msdownload',
        sizeInBytes: 512,
        signedDownloadUrl: null
      });

    const documentId = registerResponse.body.id as string;

    const processResponse = await request(app.server)
      .post(`/api/documents/${documentId}/process`)
      .set(withBearer(token))
      .send({
        mimeType: 'application/x-msdownload',
        filename: 'arquivo.exe',
        fileBase64: Buffer.from('MZ').toString('base64')
      });

    expect(processResponse.status).toBe(400);

    await app.close();
  });

  it('rejects process request when base64 payload exceeds 10 MB', async () => {
    const app = buildApp();
    await app.ready();
    const token = await login(app);

    const registerResponse = await request(app.server)
      .post('/api/documents')
      .set(withBearer(token))
      .send({
        householdId: defaultHouseholdId,
        fileServerDocumentId: 'test-pipeline-oversize-001',
        filename: 'arquivo-grande.pdf',
        mimeType: 'application/pdf',
        sizeInBytes: 20_971_520,
        signedDownloadUrl: null
      });

    const documentId = registerResponse.body.id as string;

    // ~11 MB of base64
    const oversizedBase64 = 'A'.repeat(11 * 1024 * 1024 * 4 / 3);

    const processResponse = await request(app.server)
      .post(`/api/documents/${documentId}/process`)
      .set(withBearer(token))
      .send({
        mimeType: 'application/pdf',
        filename: 'arquivo-grande.pdf',
        fileBase64: oversizedBase64
      });

    expect(processResponse.status).toBe(400);

    await app.close();
  });
});

describe('Diagnosis explained endpoint', () => {
  it('returns explained diagnosis with narrative and first action', async () => {
    const app = buildApp();
    await app.ready();
    const token = await login(app);

    const response = await request(app.server)
      .get('/api/diagnosis/explained')
      .set(withBearer(token));

    expect(response.status).toBe(200);

    const body = response.body;

    expect(typeof body.dtiPercent).toBe('number');
    expect(typeof body.classification).toBe('string');
    expect(typeof body.classificationLabel).toBe('string');
    expect(typeof body.classificationSummary).toBe('string');
    expect(typeof body.situationNarrative).toBe('string');
    expect(typeof body.firstRecommendedAction).toBe('string');
    expect(typeof body.overdueDebtsCount).toBe('number');
    expect(typeof body.monthlySurplus).toBe('number');
    expect(typeof body.essentialMonthlyObligations).toBe('number');

    await app.close();
  });

  it('blocks unauthenticated access to explained diagnosis', async () => {
    const app = buildApp();
    await app.ready();

    const response = await request(app.server).get('/api/diagnosis/explained');

    expect(response.status).toBe(401);

    await app.close();
  });
});

describe('Plans comparison explained endpoint', () => {
  it('returns explained plan comparison with strategy rationale', async () => {
    const app = buildApp();
    await app.ready();
    const token = await login(app);

    const response = await request(app.server)
      .get('/api/plans/comparison/explained')
      .set(withBearer(token));

    expect(response.status).toBe(200);

    const body = response.body;

    expect(typeof body.recommendedStrategy).toBe('string');
    expect(['avalanche', 'snowball']).toContain(body.recommendedStrategy);
    expect(typeof body.recommendationReason).toBe('string');
    expect(typeof body.essentialMonthlyObligations).toBe('number');
    expect(typeof body.surplusAfterEssentials).toBe('number');
    expect(body.avalanche).toBeDefined();
    expect(body.snowball).toBeDefined();
    expect(typeof body.avalanche.strategy).toBe('string');
    expect(typeof body.avalanche.strategyLabel).toBe('string');
    expect(typeof body.avalanche.whyThisStrategy).toBe('string');
    expect(Array.isArray(body.avalanche.installments)).toBe(true);

    await app.close();
  });

  it('blocks unauthenticated access to explained plan comparison', async () => {
    const app = buildApp();
    await app.ready();

    const response = await request(app.server).get('/api/plans/comparison/explained');

    expect(response.status).toBe(401);

    await app.close();
  });
});