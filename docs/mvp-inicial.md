# MVP Inicial

## Objetivo do MVP

Entregar um fluxo funcional, auditável e seguro para um cliente SaaS e sua família vinculada:

1. Cadastrar usuário e iniciar sessão com acesso restrito.
2. Enviar documentos financeiros manualmente.
3. Revisar e corrigir o OCR antes da consolidação.
4. Consolidar renda, despesas e dívidas.
5. Calcular DTI com precisão decimal.
6. Gerar plano de priorização Avalanche ou Bola de Neve.
7. Montar envelopes de Orçamento Base Zero.
8. Acompanhar um dashboard simples com diagnóstico e plano.

## O que entra no MVP

### Módulo 0: identidade e acesso SaaS

- Cadastro de usuário com credenciais seguras.
- Login e gestão de sessão.
- Vinculação do usuário à conta ou unidade familiar autorizada.
- Bloqueio de acesso a dados de outras contas.

### Módulo 1: cadastro mínimo da unidade familiar

- Cadastro do caso familiar.
- Cadastro de membros e fontes de renda.
- Dados básicos para cálculo consolidado da renda.

### Módulo 2: ingestão documental manual

- Upload de PDFs e imagens.
- Registro do documento no file server.
- Disparo do processamento via LlamaParse.
- Rastreamento de status do documento: recebido, processando, revisao, aprovado, rejeitado.

### Módulo 3: revisão assistida do OCR

- Tabela editável para revisão das linhas extraídas.
- Validação de campos monetários, datas e descrições.
- Aprovação manual antes de transformar o OCR em dados financeiros persistidos.

### Módulo 4: diagnóstico financeiro

- Consolidação de rendas, despesas fixas e dívidas.
- Cálculo de DTI.
- Classificação inicial do nível de estresse financeiro.
- Alertas para inconsistência de dados ou ausência de informação crítica.

### Módulo 5: plano de ação financeiro

- Geração do plano Avalanche.
- Geração alternativa do plano Bola de Neve.
- Comparativo simples entre as duas abordagens.
- Escolha do plano ativo pelo usuário ou operador.

### Módulo 6: orçamento base zero

- Criação de envelopes por categoria.
- Alocação de renda disponível.
- Destaque para categoria crítica, excesso e saldo restante.

### Módulo 7: dashboard do caso

- Cards com renda, despesas, total de dívidas e DTI.
- Gráficos de composição da dívida e distribuição do orçamento.
- Linha do tempo simples com eventos principais do caso.

## O que fica fora do MVP

- Open Finance.
- Conciliação bancária automática.
- Chatbot financeiro generativo para usuário final.
- Renegociação automática com credores.
- Aplicativo mobile nativo.
- Administração multiempresa avançada e delegação complexa entre múltiplas contas.
- Motor avançado de previsão de inadimplência.
- Integrações com ERPs, CRMs ou mensageria externa complexa.

## Sequência recomendada de implementação

### Fase 0: fundação técnica

- Subir monorepo, workspace, lint, formatter, testes e CI básica.
- Configurar PostgreSQL, MinIO local e convenções de ambiente.
- Definir `compose.base.yaml`, `compose.dev.yaml`, `compose.test.yaml` e `compose.prod.yaml` como padrão operacional do projeto.
- Fixar limites de CPU e RAM em todos os serviços da stack principal, respeitando `2` vCPUs e `1 GiB` no total.
- Criar o pacote `finance-core` e os contratos compartilhados.
- Definir modelo de identidade, sessão e isolamento mínimo por conta desde o primeiro slice vertical.

### Fase 1: ingestão e revisão

- Implementar upload, file server e fluxo de documentos.
- Integrar o processamento com LlamaParse usando mocks primeiro.
- Entregar a tela de revisão OCR com persistência segura.

### Fase 2: consolidação e diagnóstico

- Persistir renda, dívidas e categorias extraídas.
- Implementar DTI e classificação de risco.
- Exibir o diagnóstico inicial no dashboard.

### Fase 3: plano e orçamento

- Implementar Avalanche e Bola de Neve.
- Implementar envelopes do OBZ.
- Salvar o plano escolhido e projeções mensais.

### Fase 4: endurecimento operacional

- Auditoria mínima.
- Logs estruturados.
- Tratamento de erros ponta a ponta.
- Testes E2E dos fluxos centrais.

## Modelo funcional mínimo

| Entidade | Uso no MVP | Observação |
|---|---|---|
| Caso familiar | agrupa o atendimento | pode iniciar com um único responsável |
| Documento | rastreia arquivo e processamento | vinculado ao file server |
| Entrada de OCR | permite revisão humana | não confiar sem aprovação |
| Renda | base do DTI e OBZ | mensal recorrente ou eventual |
| Dívida | base da priorização | guardar saldo, taxa, parcela e atraso |
| Envelope | base do orçamento | categoria, meta e valor alocado |
| Plano de ação | resultado consolidado | estratégia escolhida e projeções |

## Fluxo documents-first (estratégia atual)

O MVP segue uma abordagem **documents-first**: o ponto de entrada preferencial é o upload de documentos reais, não o preenchimento manual de formulários. Isso reduz a fricção do onboarding e aumenta a precisão dos dados.

### Pipeline completo de um documento

```
Usuário faz upload do arquivo
    ↓
file-server (Rails) armazena e retorna receipts
    ↓
API registra o documento (status: received)
    ↓
POST /documents/:id/process dispara pipeline assíncrono
    ↓
LlamaParse converte PDF/imagem em Markdown
    ↓
OpenRouter classifica cada item extraído
    (income | fixed-expense | debt-installment | ambiguous | ...)
    ↓
Itens gravados em extracted_items (status: pending review)
    ↓
Usuário revisa na tela /review/:documentId
    (Confirmar / Corrigir / Descartar)
    ↓
Todos os itens revisados → pipeline_status: consolidated
    ↓
Dados alimentam diagnóstico e plano
```

### Modo mock (desenvolvimento sem chaves de API)

Com `MOCK_EXTERNAL_SERVICES=true`, o pipeline retorna automaticamente 3 itens fictícios (1 renda, 1 parcela de dívida, 1 despesa fixa), permitindo que todo o fluxo funcione offline.

### Tipos de documento aceitos

| Tipo | Mime types aceitos |
|------|--------------------|
| Extrato bancário | `application/pdf` |
| Fatura de cartão | `application/pdf` |
| Contrato de empréstimo | `application/pdf` |
| Comprovante / print | `image/jpeg`, `image/png`, `image/webp`, `image/tiff` |
| DDA (débito automático) | `application/pdf` |



- O usuário consegue se cadastrar, autenticar e acessar apenas os dados da sua conta.
- O usuário consegue enviar um documento e acompanhar seu status.
- O OCR pode ser revisado manualmente antes da consolidação.
- O sistema calcula DTI com precisão decimal e explica a fórmula usada.
- O sistema gera ao menos um plano Avalanche e um plano Bola de Neve com ordenação reproduzível.
- O orçamento base zero fecha a alocação da renda disponível sem diferença silenciosa de centavos.
- O dashboard final mostra os principais indicadores do caso.
- Os endpoints do fluxo principal expõem somente os campos necessários para a UI de cada etapa.
- Os principais fluxos têm cobertura automatizada.
- A stack principal sobe com Docker Compose dentro do teto operacional de `2` vCPUs e `1 GiB` de RAM.

## Métricas de sucesso do MVP

- Tempo para cadastrar um caso completo abaixo de 15 minutos com dados já disponíveis.
- Tempo de revisão OCR significativamente menor do que digitação manual integral.
- Capacidade de reproduzir o mesmo plano para a mesma entrada sem divergência matemática.
- Zero falhas conhecidas de sanitização em payloads validados do fluxo principal.

## Próximo passo após o MVP

Depois do MVP, a expansão mais valiosa tende a ser:

1. histórico de versões do plano.
2. simulações com cenários alternativos.
3. importadores adicionais de documentos.
4. automações de acompanhamento mensal.