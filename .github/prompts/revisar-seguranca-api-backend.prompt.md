---
name: "Revisar Seguranca da API Backend"
description: "Use quando revisar seguranca de endpoints Node.js, autenticacao, autorizacao, tokens, validacao de params, query, body, uploads, OCR, SQL, integracoes externas e limites operacionais da API deste projeto."
argument-hint: "Descreva o endpoint, modulo, fluxo ou cole o codigo alvo"
agent: "agent"
---

Revise a seguranca da API backend informada neste projeto.

- Responda em portugues.
- Priorize findings reais, regressao de comportamento seguro e validacoes ausentes.
- Verifique autenticacao, autorizacao por recurso, escopo de conta e menor privilegio.
- Revise validacao server-side de `params`, `query`, `headers`, `body`, arquivos, OCR e variaveis de ambiente que entram no fluxo.
- Confirme limites de payload, upload, paginação, taxa, timeout, tentativas, concorrencia, volume processado e idempotencia quando aplicavel.
- Procure SQL concatenado, `eval`, `new Function`, `child_process.exec`, path traversal, SSRF, vazamento de stack trace, logs inseguros e respostas de erro excessivas.
- Verifique tratamento de tokens e segredos: armazenamento, mascaramento, expiracao, rotacao, revogacao, escopos e risco de exposicao em logs ou respostas.
- Considere integracoes externas, OCR e file server como entrada nao confiavel por padrao.
- Estruture a resposta com findings primeiro, em ordem de severidade, depois riscos residuais, testes recomendados e mitigacoes objetivas.
- Quando nao houver findings relevantes, diga isso explicitamente e aponte lacunas de cobertura ou testes.
