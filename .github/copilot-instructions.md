# Instruções de Contexto para o GitHub Copilot
# Projeto: Engenharia de Controle Financeiro Familiar e Recuperação de Ativos

## 1. Visão Geral do Projeto
O objetivo deste sistema é atuar como um planejador financeiro inteligente para famílias superendividadas. O sistema recebe dados financeiros via upload de extratos, calcula a saúde financeira (DTI - Razão de Endividamento sobre a Renda) e prescreve planos de ação matemáticos (Método Avalanche ou Bola de Neve) aliados ao Orçamento Base Zero (OBZ).

*Não utilizaremos integrações diretas de Open Finance.* O upload de dados será exclusivamente manual, processado com IA (LlamaParse).

## 2. Stack Tecnológica
* **Frontend:** Vue.js (Options API obrigatoriamente)
* **Biblioteca de UI/UX:** PrimeVue
* **Gráficos:** ApexCharts
* **Testes de Frontend:** Cypress (Component Testing e E2E)
* **Backend Principal:** Node.js
* **Banco de Dados:** PostgreSQL
* **File Server Isolado:** Ruby on Rails
* **IA e Contexto:** Cognee e LlamaParse

## 3. Padrões de Telas, Interfaces e UX (PrimeVue)
* **Tema e Cores:** Sobriedade e segurança (azul, cinza, verde). Vermelho apenas para alertas críticos.
* **Componentes:** `FileUpload` para PDFs/imagens, `DataTable` com Cell Editing para revisão de OCR da IA e `Cards` para envelopes do OBZ e gráficos.

## 4. Ferramentas de Qualidade e Padronização de Código (Lint & CI/CD)
Para garantir a qualidade íntegra e a padronização de todo o código escrito, o projeto utiliza as seguintes ferramentas:

* **Frontend e Backend (Node.js/Vue):**
  * **ESLint:** Para análise estática de código, garantindo que boas práticas do Vue e do Node sejam seguidas.
  * **Prettier:** Para formatação automática e padronização visual do código (tabs, aspas, ponto e vírgula).
* **File Server (Ruby on Rails):**
  * **RuboCop:** Analisador estático e formatador focado nas melhores práticas do ecossistema Ruby.
* **Automação de Commits (Husky & lint-staged):**
  * Nenhum código pode ser comitado com testes falhando ou erros de lint. O Husky acionará os testes unitários afetados e o ESLint/Prettier antes de cada `git commit`.
* **Análise Contínua de Segurança:**
  * **SonarQube / CodeQL:** A pipeline de CI/CD (ex: GitHub Actions) deve rodar ferramentas de inspeção para detectar code smells, dívida técnica e vulnerabilidades de segurança.

## 5. Planejamento de Testes Automatizados
* **Cypress (Frontend):** Testes de componentes isolados (renderização PrimeVue/ApexCharts) e jornadas E2E (upload -> revisão -> salvar).
* **Jest / Supertest (Backend Node):** Testar algoritmos matemáticos (Avalanche e DTI), endpoints da API e mockar a comunicação com o LlamaParse e o servidor Rails.

## 6. Segurança e Tratamento de Erros (Defensive Programming)
* **Prevenção a Injeções e XSS:** Todo input de usuário e todo retorno de OCR do LlamaParse deve ser rigidamente sanitizado. Consultas ao PostgreSQL DEVEM, obrigatoriamente, utilizar parameterized queries (ou statements preparados) para evitar SQL Injection.
* **Tratamento de Exceções:** Implemente tratamento robusto de erros (`try/catch`) cobrindo falhas em conexões de banco de dados e limites de API. Falhas graves não devem quebrar a aplicação, mas sim falhar de forma rápida (fail-fast), exibir mensagens seguras ao usuário e gravar logs em um serviço de mensageria interno para os administradores.

## 7. Diretrizes para Geração de Código do Copilot
* **Sintaxe de Testes:** Utilize estritamente sintaxe do Cypress (`cy.get`, `cy.mount()`) no front e Jest no back.
* **Vue.js (APENAS OPTIONS API):** Todo código Vue gerado DEVE utilizar a **Options API** (`data()`, `methods`, `computed`, etc.). **NUNCA** utilize Composition API ou `<script setup>`.
* **Tipagem e Qualidade:** O código deve estar em conformidade com regras rígidas do ESLint.
* **Matemática Financeira:** Sempre utilize bibliotecas de precisão decimal (ex: `currency.js` ou `decimal.js`) para evitar erros de ponto flutuante em cálculos.

## 8. Containerização e Ambientes
* **Padrão único:** Desenvolvimento e produção devem usar Docker e Docker Compose como padrão operacional.
* **Família de compose:** Estruture os ambientes com `compose.base.yaml`, `compose.dev.yaml`, `compose.test.yaml`, `compose.prod.yaml` e, quando necessário, `compose.tools.yaml`.
* **Teto físico:** A stack principal deve respeitar o teto físico de `2` vCPUs e `1 GiB` de RAM no total.
* **Orçamento padrão de desenvolvimento:** A soma dos serviços padrão deve ficar em até `1.70` CPUs e `896MiB`, mantendo reserva operacional.
* **Orçamento global:** Esse valor é da stack inteira; nenhum serviço isolado pode consumir sozinho o orçamento total.
* **Limites explícitos:** Todo serviço deve declarar limites de CPU e memória, healthcheck, restart policy e logging com rotação.
* **Produção:** Use imagens imutáveis, sem bind mount de código-fonte e sem portas de debug expostas.