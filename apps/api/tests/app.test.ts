import request from 'supertest';

import { buildApp } from '../src/app.js';

describe('API bootstrap', () => {
  it('returns health information', async () => {
    const app = buildApp();
    await app.ready();
    const response = await request(app.server).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');

    await app.close();
  });

  it('returns plan comparison for the sample household', async () => {
    const app = buildApp();
    await app.ready();
    const response = await request(app.server).get('/api/plans/comparison');

    expect(response.status).toBe(200);
    expect(response.body.avalanche.strategy).toBe('avalanche');
    expect(response.body.snowball.strategy).toBe('snowball');

    await app.close();
  });

  it('registers a stored document and persists editable OCR entries', async () => {
    const app = buildApp();
    await app.ready();
    const registerResponse = await request(app.server).post('/api/documents').send({
      householdId: 'household-1',
      fileServerDocumentId: 'stored-doc-1',
      filename: 'extrato-upload.pdf',
      mimeType: 'application/pdf',
      sizeInBytes: 4096,
      signedDownloadUrl: 'http://localhost:3002/rails/mock/extrato-upload.pdf'
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.ocrEntries.length).toBeGreaterThan(0);

    const entryId = registerResponse.body.ocrEntries[0].id;
    const updateResponse = await request(app.server)
      .patch(`/api/documents/${registerResponse.body.id}/ocr-entries/${entryId}`)
      .send({ description: 'Lancamento revisado', amount: 250.75, reviewed: true });

    expect(updateResponse.status).toBe(200);
    const updatedEntry = updateResponse.body.ocrEntries.find((entry: { id: string }) => entry.id === entryId);

    expect(updatedEntry?.description).toBe('Lancamento revisado');
    expect(updatedEntry?.reviewed).toBe(true);

    await app.close();
  });
});