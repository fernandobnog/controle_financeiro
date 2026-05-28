describe('Controle financeiro web', () => {
  it('carrega o dashboard e completa o fluxo inicial de upload com revisao', () => {
    const storedFile = {
      id: 'stored-doc-1',
      householdId: 'household-1',
      filename: 'extrato-upload.pdf',
      mimeType: 'application/pdf',
      sizeInBytes: 2048,
      status: 'received',
      signedDownloadUrl: 'http://localhost:3002/rails/active_storage/blobs/redirect/mock/extrato-upload.pdf'
    };

    let documents: Array<Record<string, unknown>> = [];
    let reviewDocument: Record<string, unknown> | null = null;

    cy.intercept('GET', 'http://localhost:3001/api/diagnosis/summary', {
      householdId: 'household-1',
      householdName: 'Familia Souza',
      monthlyIncome: 4800,
      monthlyDebtPayments: 750,
      dtiPercent: 15.63,
      classification: 'alert',
      debtCount: 3,
      totalDebtBalance: 12600,
      budgetRemaining: 2290
    }).as('diagnosis');

    cy.intercept('GET', 'http://localhost:3001/api/plans/comparison', {
      householdId: 'household-1',
      avalanche: {
        strategy: 'avalanche',
        totalDebtBalance: 12600,
        monthlyIncome: 4800,
        monthlyDebtPayments: 750,
        recommendedExtraPayment: 300,
        projectedBudgetGap: -1540,
        installments: [
          {
            debtId: 'debt-1',
            creditor: 'Banco A',
            recommendedPayment: 450,
            priority: 2
          },
          {
            debtId: 'debt-2',
            creditor: 'Cartao B',
            recommendedPayment: 480,
            priority: 1
          }
        ]
      },
      snowball: {
        strategy: 'snowball',
        totalDebtBalance: 12600,
        monthlyIncome: 4800,
        monthlyDebtPayments: 750,
        recommendedExtraPayment: 300,
        projectedBudgetGap: -1540,
        installments: [
          {
            debtId: 'debt-3',
            creditor: 'Loja C',
            recommendedPayment: 420,
            priority: 1
          },
          {
            debtId: 'debt-1',
            creditor: 'Banco A',
            recommendedPayment: 450,
            priority: 2
          }
        ]
      }
    }).as('plans');

    cy.intercept('GET', 'http://localhost:3001/api/documents', (request) => {
      request.reply(documents);
    }).as('documents');

    cy.intercept('GET', /http:\/\/localhost:3001\/api\/documents\/[^/]+\/review$/, (request) => {
      request.reply(reviewDocument ?? { message: 'Documento nao encontrado.' });
    }).as('documentReview');

    cy.intercept('POST', 'http://localhost:3002/api/documents', storedFile).as('fileUpload');

    cy.intercept('POST', 'http://localhost:3001/api/documents', (request) => {
      const payload = request.body as {
        householdId: string;
        fileServerDocumentId: string;
        filename: string;
        mimeType: string;
        sizeInBytes: number;
        signedDownloadUrl: string | null;
      };

      reviewDocument = {
        id: 'doc-1',
        householdId: payload.householdId,
        fileServerDocumentId: payload.fileServerDocumentId,
        filename: payload.filename,
        mimeType: payload.mimeType,
        sizeInBytes: payload.sizeInBytes,
        status: 'review',
        signedDownloadUrl: payload.signedDownloadUrl,
        ocrEntries: [
          {
            id: 'ocr-1',
            description: 'Linha inicial para revisao de extrato-upload.pdf',
            amount: 0,
            occurredAt: '2026-05-28',
            category: 'unclassified',
            reviewed: false
          }
        ]
      };
      documents = [
        {
          ...(reviewDocument as Record<string, unknown>),
          ocrEntries: []
        }
      ];

      request.reply({
        statusCode: 201,
        body: reviewDocument
      });
    }).as('documentRegister');

    cy.visit('/');

    cy.wait('@diagnosis');
    cy.wait('@plans');
    cy.contains('Diagnostico financeiro').should('be.visible');
    cy.contains('Renda mensal').should('be.visible');
    cy.contains('4.800').should('be.visible');

    cy.contains('button', 'Revisao OCR').click();
    cy.wait('@documents');
    cy.contains('Ingestao e revisao de OCR').should('be.visible');

    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
        fileName: 'extrato-upload.pdf',
        mimeType: 'application/pdf'
      },
      { force: true }
    );

    cy.wait('@fileUpload');
    cy.wait('@documentRegister');
    cy.wait('@documents');
    cy.wait('@documentReview');
    cy.contains('extrato-upload.pdf enviado e registrado para revisao.').should('be.visible');
    cy.contains('Abrir arquivo original')
      .should('be.visible')
      .and('have.attr', 'href', storedFile.signedDownloadUrl);
    cy.contains('Linha inicial para revisao de extrato-upload.pdf').should('be.visible');
  });
});