describe('Controle financeiro web', () => {
    it('mantem o usuario na tela de login quando as credenciais sao invalidas', () => {
      cy.intercept('POST', 'http://localhost:3001/api/auth/login', {
        statusCode: 401,
        body: {
          message: 'Credenciais invalidas.'
        }
      }).as('loginFailure');

      cy.visit('/');

      cy.url().should('include', '/auth/login');
      cy.get('input[type="email"]').type('owner@familia-souza.local');
      cy.get('input[type="password"]').type('senha-errada');
      cy.contains('button', 'Entrar').click();

      cy.wait('@loginFailure');
      cy.url().should('include', '/auth/login');
      cy.contains('Credenciais invalidas.').should('be.visible');
    });

    it('autentica o usuario e completa o fluxo inicial de upload com revisao', () => {
      const storedFile = {
        id: 'stored-doc-1',
        filename: 'extrato-upload.pdf',
        mimeType: 'application/pdf',
        sizeInBytes: 2048,
        signedDownloadUrl: 'http://localhost:3002/rails/active_storage/blobs/redirect/mock/extrato-upload.pdf'
      };
      const session = {
        accessToken: 'mock-token',
        expiresAt: '2030-05-28T10:00:00.000Z',
        user: {
          email: 'owner@familia-souza.local',
          fullName: 'Responsavel Familia Souza'
        }
      };

      let documents: Array<Record<string, unknown>> = [];
      let reviewDocument: Record<string, unknown> | null = null;

      cy.intercept('POST', 'http://localhost:3001/api/auth/login', session).as('login');

      cy.intercept('GET', 'http://localhost:3001/api/diagnosis/summary', {
        monthlyIncome: 4800,
        monthlyDebtPayments: 750,
        dtiPercent: 15.63,
        classification: 'alert',
        totalDebtBalance: 12600
      }).as('diagnosis');

      cy.intercept('GET', 'http://localhost:3001/api/plans/comparison', {
        avalanche: {
          installments: [
            {
              creditor: 'Banco A',
              recommendedPayment: 450
            },
            {
              creditor: 'Cartao B',
              recommendedPayment: 480
            }
          ]
        },
        snowball: {
          installments: [
            {
              creditor: 'Loja C',
              recommendedPayment: 420
            },
            {
              creditor: 'Banco A',
              recommendedPayment: 450
            }
          ]
        }
      }).as('plans');

      cy.intercept('GET', 'http://localhost:3001/api/documents', (request) => {
        request.reply(documents);
      }).as('documents');

      cy.intercept('GET', 'http://localhost:3001/api/onboarding/profile', {
        householdId: 'household-owned-1',
        householdName: 'Familia Souza',
        incomes: [],
        debts: [],
        envelopes: []
      }).as('onboardingProfile');

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

        expect(payload.householdId).to.equal('household-owned-1');

        reviewDocument = {
          id: 'doc-1',
          filename: payload.filename,
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
            id: 'doc-1',
            filename: payload.filename
          }
        ];

        request.reply({
          statusCode: 201,
          body: {
            id: 'doc-1',
            filename: payload.filename,
            status: 'review'
          }
        });
      }).as('documentRegister');

      cy.intercept('PATCH', /http:\/\/localhost:3001\/api\/documents\/[^/]+\/ocr-entries\/[^/]+$/, (request) => {
        expect(request.body).to.deep.equal({
          description: 'Linha revisada pelo operador',
          reviewed: true
        });

        reviewDocument = {
          ...(reviewDocument ?? {}),
          ocrEntries: [
            {
              id: 'ocr-1',
              description: 'Linha revisada pelo operador',
              amount: 0,
              occurredAt: '2026-05-28',
              category: 'unclassified',
              reviewed: true
            }
          ]
        };

        request.reply(reviewDocument);
      }).as('ocrEntryUpdate');

      cy.visit('/');

      cy.url().should('include', '/auth/login');
      cy.get('input[type="email"]').type('owner@familia-souza.local');
      cy.get('input[type="password"]').type('demo12345');
      cy.contains('button', 'Entrar').click();

      cy.wait('@login');
      cy.wait('@diagnosis');
      cy.wait('@plans');
      cy.contains('Responsavel Familia Souza | owner@familia-souza.local').should('be.visible');
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
      cy.wait('@onboardingProfile');
      cy.wait('@documentRegister');
      cy.wait('@documents');
      cy.wait('@documentReview');
      cy.contains('extrato-upload.pdf enviado e registrado para revisao.').should('be.visible');
      cy.contains('Abrir arquivo original')
        .should('be.visible')
        .and('have.attr', 'href', storedFile.signedDownloadUrl);
      cy.contains('Linha inicial para revisao de extrato-upload.pdf').should('be.visible');

      cy.contains('td', 'Linha inicial para revisao de extrato-upload.pdf').click();
      cy.get('td .p-inputtext:visible').clear().type('Linha revisada pelo operador');
      cy.get('body').click(0, 0);

      cy.wait('@ocrEntryUpdate');
      cy.contains('Linha revisada pelo operador').should('be.visible');
      cy.contains('td', 'sim').should('be.visible');
    });

    it('cadastra a conta, conclui o onboarding e entra no dashboard', () => {
      const session = {
        accessToken: 'register-token',
        expiresAt: '2030-05-28T10:00:00.000Z',
        user: {
          email: 'maria.lima@example.com',
          fullName: 'Maria Lima'
        }
      };

      let onboardingProfile = {
        householdId: 'household-new-1',
        householdName: 'Familia Lima',
        incomes: [],
        debts: [],
        envelopes: []
      };

      cy.intercept('POST', 'http://localhost:3001/api/auth/register', {
        statusCode: 201,
        body: session
      }).as('register');

      cy.intercept('GET', 'http://localhost:3001/api/onboarding/profile', () => onboardingProfile).as('getOnboarding');

      cy.intercept('PUT', 'http://localhost:3001/api/onboarding/profile', (request) => {
        const payload = request.body as {
          householdName: string;
          incomes: Array<{ label: string; amount: number; recurring: boolean }>;
          debts: Array<{
            creditor: string;
            balance: number;
            monthlyPayment: number;
            interestRate: number;
            overdueMonths: number;
          }>;
          envelopes: Array<{
            category: string;
            plannedAmount: number;
            actualAmount?: number;
          }>;
        };

        expect(payload.envelopes).to.deep.equal([
          {
            category: 'Essenciais',
            plannedAmount: 3200,
            actualAmount: 2800
          }
        ]);

        onboardingProfile = {
          householdId: onboardingProfile.householdId,
          householdName: payload.householdName,
          incomes: payload.incomes.map((income, index) => ({
            id: `income-${index + 1}`,
            ...income
          })),
          debts: payload.debts.map((debt, index) => ({
            id: `debt-${index + 1}`,
            ...debt
          })),
          envelopes: payload.envelopes
        };

        request.reply(onboardingProfile);
      }).as('saveOnboarding');

      cy.intercept('GET', 'http://localhost:3001/api/diagnosis/summary', {
        monthlyIncome: 6500,
        monthlyDebtPayments: 780,
        dtiPercent: 12,
        classification: 'healthy',
        totalDebtBalance: 18000
      }).as('diagnosis');

      cy.intercept('GET', 'http://localhost:3001/api/plans/comparison', {
        avalanche: {
          installments: [
            {
              creditor: 'Banco Azul',
              recommendedPayment: 780
            }
          ]
        },
        snowball: {
          installments: [
            {
              creditor: 'Banco Azul',
              recommendedPayment: 780
            }
          ]
        }
      }).as('plans');

      cy.visit('/auth/register');

      cy.get('input[autocomplete="name"]').type('Maria Lima');
      cy.get('input[type="email"]').type('maria.lima@example.com');
      cy.get('input[autocomplete="organization"]').type('Familia Lima');
      cy.get('input[type="password"]').type('segredo123');
      cy.contains('button', 'Criar conta').click();

      cy.wait('@register');
      cy.wait('@getOnboarding');
      cy.url().should('include', '/onboarding');
      cy.contains('Base inicial da conta').should('be.visible');

      cy.contains('p', 'Renda 1')
        .parents('.entry-card')
        .within(() => {
          cy.contains('span', 'Descricao').parent().find('input').type('Salario principal');
          cy.contains('span', 'Valor mensal').parent().find('input').type('6500');
        });

      cy.contains('button', 'Adicionar divida').click();

      cy.contains('p', 'Divida 1')
        .parents('.entry-card')
        .within(() => {
          cy.contains('span', 'Credor').parent().find('input').type('Banco Azul');
          cy.contains('span', 'Saldo total').parent().find('input').type('18000');
          cy.contains('span', 'Parcela mensal').parent().find('input').type('780');
          cy.contains('span', 'Juros mensais (%)').parent().find('input').type('1.8');
          cy.contains('span', 'Meses em atraso').parent().find('input').type('0');
        });

      cy.contains('button', 'Adicionar envelope').click();

      cy.contains('p', 'Envelope 1')
        .parents('.entry-card')
        .within(() => {
          cy.contains('span', 'Categoria').parent().find('input').type('Essenciais');
          cy.contains('span', 'Valor planejado').parent().find('input').clear().type('3200').blur();
          cy.contains('span', 'Valor atual').parent().find('input').clear().type('2800').blur();
        });

      cy.contains('button', 'Salvar e continuar').click();

      cy.wait('@saveOnboarding');
      cy.wait('@diagnosis');
      cy.wait('@plans');
      cy.url().should('eq', `${Cypress.config().baseUrl}/`);
      cy.contains('Diagnostico financeiro').should('be.visible');
      cy.contains('6.500').should('be.visible');
    });

    it('redireciona rotas guestOnly com sessao ativa e limpa o acesso ao sair', () => {
      const session = {
        accessToken: 'active-session-token',
        expiresAt: '2030-05-28T10:00:00.000Z',
        user: {
          email: 'owner@familia-souza.local',
          fullName: 'Responsavel Familia Souza'
        }
      };

      cy.intercept('GET', 'http://localhost:3001/api/diagnosis/summary', {
        monthlyIncome: 4800,
        monthlyDebtPayments: 750,
        dtiPercent: 15.63,
        classification: 'alert',
        totalDebtBalance: 12600
      }).as('diagnosis');

      cy.intercept('GET', 'http://localhost:3001/api/plans/comparison', {
        avalanche: {
          installments: []
        },
        snowball: {
          installments: []
        }
      }).as('plans');

      cy.visit('/auth/login', {
        onBeforeLoad(window) {
          window.localStorage.setItem('controle-financeiro.session', JSON.stringify(session));
        }
      });

      cy.wait('@diagnosis');
      cy.wait('@plans');
      cy.url().should('eq', `${Cypress.config().baseUrl}/`);
      cy.contains('Diagnostico financeiro').should('be.visible');

      cy.contains('button', 'Sair').click();

      cy.url().should('include', '/auth/login');
      cy.window().then((window) => {
        expect(window.localStorage.getItem('controle-financeiro.session')).to.equal(null);
      });

      cy.visit('/intake');

      cy.url().should('include', '/auth/login');
      cy.url().should('include', 'redirect=/intake');
    });

    it('altera a senha a partir da area autenticada', () => {
      const session = {
        accessToken: 'change-password-token',
        expiresAt: '2030-05-28T10:00:00.000Z',
        user: {
          email: 'owner@familia-souza.local',
          fullName: 'Responsavel Familia Souza'
        }
      };

      cy.intercept('POST', 'http://localhost:3001/api/auth/change-password', (request) => {
        expect(request.body).to.deep.equal({
          currentPassword: 'demo12345',
          newPassword: 'novaSenha123'
        });

        request.reply({
          message: 'Senha atualizada com sucesso.'
        });
      }).as('changePassword');

      cy.visit('/security/password', {
        onBeforeLoad(window) {
          window.localStorage.setItem('controle-financeiro.session', JSON.stringify(session));
        }
      });

      cy.contains('Alterar senha').should('be.visible');
      cy.get('input.auth-form__password-input').eq(0).type('demo12345');
      cy.get('input.auth-form__password-input').eq(1).type('novaSenha123');
      cy.get('input.auth-form__password-input').eq(2).type('novaSenha123');
      cy.contains('button', 'Atualizar senha').click();

      cy.wait('@changePassword');
      cy.contains('Senha atualizada com sucesso.').should('be.visible');
      cy.get('input.auth-form__password-input').eq(0).should('have.value', '');
      cy.get('input.auth-form__password-input').eq(1).should('have.value', '');
      cy.get('input.auth-form__password-input').eq(2).should('have.value', '');
    });

    it('solicita recuperacao, redefine a senha e abre uma nova sessao', () => {
      const session = {
        accessToken: 'reset-token',
        expiresAt: '2030-05-28T10:00:00.000Z',
        user: {
          email: 'owner@familia-lima.local',
          fullName: 'Responsavel Lima'
        }
      };

      cy.intercept('POST', 'http://localhost:3001/api/auth/password-recovery', {
        message: 'Se existir uma conta com este e-mail, um token temporario de recuperacao foi emitido.',
        resetToken: 'token-local-123'
      }).as('passwordRecovery');

      cy.intercept('POST', 'http://localhost:3001/api/auth/password-reset', session).as('passwordReset');

      cy.intercept('GET', 'http://localhost:3001/api/diagnosis/summary', {
        monthlyIncome: 5200,
        monthlyDebtPayments: 540,
        dtiPercent: 10.38,
        classification: 'healthy',
        totalDebtBalance: 9800
      }).as('diagnosis');

      cy.intercept('GET', 'http://localhost:3001/api/plans/comparison', {
        avalanche: {
          installments: []
        },
        snowball: {
          installments: []
        }
      }).as('plans');

      cy.visit('/auth/password-recovery');

      cy.get('input[type="email"]').type('owner@familia-lima.local');
      cy.contains('button', 'Gerar token').click();

      cy.wait('@passwordRecovery');
      cy.contains('token-local-123').should('be.visible');
      cy.contains('button', 'Ir para redefinicao').click();

      cy.url().should('include', '/auth/password-reset');
      cy.get('input[type="password"]').eq(0).type('novaSenha123');
      cy.get('input[type="password"]').eq(1).type('novaSenha123');
      cy.contains('button', 'Redefinir e entrar').click();

      cy.wait('@passwordReset');
      cy.wait('@diagnosis');
      cy.wait('@plans');
      cy.contains('Diagnostico financeiro').should('be.visible');
    });
  });