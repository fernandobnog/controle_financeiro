---
name: "Frontend Vue PrimeVue"
description: "Use quando criar ou editar telas Vue, dashboards, upload de arquivos, revisão de OCR, componentes PrimeVue, ApexCharts ou testes Cypress deste projeto."
applyTo:
  - "**/*.vue"
  - "cypress/**"
  - "**/*.cy.js"
  - "**/*.cy.ts"
---

# Frontend Vue, PrimeVue e UX

- Use somente Vue Options API: `data`, `computed`, `methods`, `watch`, hooks de ciclo de vida e componentes tradicionais.
- Nunca use Composition API, `<script setup>` ou padrões centrados em composables para código novo.
- Prefira componentes PrimeVue para formulários, tabelas, diálogos, feedbacks e upload.
- Use `FileUpload` para PDFs e imagens enviados pelo usuário.
- Use `DataTable` com Cell Editing para revisão do OCR antes de persistir dados.
- Use `Card` e ApexCharts para apresentar OBZ, indicadores e evolução do endividamento.
- Mantenha a paleta visual em azul, cinza e verde; vermelho apenas para alertas críticos.
- Toda tela deve prever estados de loading, vazio, validação, erro e sucesso.
- Em testes de frontend, use Cypress Component Testing para componentes isolados e Cypress E2E para fluxos completos.