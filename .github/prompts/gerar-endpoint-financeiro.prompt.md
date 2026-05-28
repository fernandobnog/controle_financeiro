---
name: "Gerar Endpoint Financeiro"
description: "Use quando criar endpoint, service ou regra de negócio Node.js para DTI, avalanche, bola de neve, persistência PostgreSQL, OCR ou mocks do servidor Rails."
argument-hint: "Descreva o endpoint, entradas, saídas e regra de negócio"
agent: "agent"
---

Implemente um endpoint ou serviço de backend para este projeto seguindo estas regras:

- Responda em português.
- Estruture o código em camadas claras de validação, regra de negócio e acesso a dados.
- Use biblioteca de precisão decimal para cálculos monetários.
- Use apenas parameterized queries no acesso ao PostgreSQL.
- Sanitize e valide toda entrada, inclusive payloads de OCR.
- Inclua testes Jest e Supertest adequados ao comportamento implementado.
- Mocke dependências externas quando elas não forem o foco principal da tarefa.