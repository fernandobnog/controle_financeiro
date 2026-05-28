---
name: "Testing Guidelines"
description: "Use quando criar ou editar testes Cypress, Jest ou Supertest para componentes Vue, jornadas E2E, endpoints Node.js, regras de DTI, avalanche, bola de neve ou revisão de OCR."
applyTo:
  - "cypress/**"
  - "**/__tests__/**"
  - "**/*.spec.js"
  - "**/*.spec.ts"
  - "**/*.test.js"
  - "**/*.test.ts"
  - "**/*.cy.js"
  - "**/*.cy.ts"
---

# Estratégia de Testes

- No frontend, use estritamente Cypress: `cy.mount()` em testes de componente e fluxos E2E para upload -> revisão -> salvar.
- No backend Node.js, use Jest e Supertest para validar endpoints, contratos e regras matemáticas.
- Cubra casos de borda para DTI, ordenação Avalanche, ordenação Bola de Neve, arredondamento monetário e entradas inválidas.
- Use fixtures determinísticas e mocks para OCR, banco, Rails file server e serviços de IA sempre que possível.
- Teste cenários de erro, sanitização de payloads e mensagens seguras ao usuário, não apenas o caminho feliz.
- Prefira nomes de teste descritivos e organizados por comportamento.