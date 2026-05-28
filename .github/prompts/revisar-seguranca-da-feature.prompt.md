---
name: "Revisar Seguranca da Feature"
description: "Use quando revisar seguranca de uma feature, endpoint, tela, upload, OCR, autenticacao, autorizacao, tokens, validacao de campos, limites de sistema ou APIs inseguras deste projeto."
argument-hint: "Descreva a feature, fluxo, endpoint ou cole o codigo alvo"
agent: "agent"
---

Revise a seguranca da feature ou fluxo informado neste projeto.

- Responda em portugues.
- Priorize riscos reais, regressao de comportamento seguro e validacoes ausentes.
- Verifique origem e destino dos dados, autenticacao, autorizacao por recurso e menor privilegio.
- Revise validacao server-side de todos os campos: body, params, query, headers, arquivos, OCR e variaveis de ambiente quando entrarem no fluxo.
- Confira limites obrigatorios: payload, upload, paginacao, taxa, timeout, tentativas, concorrencia, volume processado e idempotencia quando aplicavel.
- Procure APIs e comportamentos inseguros como SQL concatenado, `eval`, `new Function`, `v-html`, `innerHTML`, `child_process.exec`, geracao fraca de token, path traversal e SSRF.
- Verifique controle de tokens e segredos: armazenamento, mascaramento, expiracao, revogacao, escopos, cookies seguros e risco de vazamento em logs ou respostas.
- Considere OCR, arquivos e integracoes externas como entrada nao confiavel por padrao.
- Estruture a resposta com findings primeiro, em ordem de severidade, depois checklist coberta, riscos residuais e testes recomendados.
- Quando uma mitigacao importante nao puder ser aplicada no contexto fornecido, explicite a lacuna e o risco residual.
