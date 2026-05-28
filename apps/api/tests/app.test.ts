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