---
name: "Security and Financial Rules"
description: "Use quando revisar segurança, checklist de segurança, APIs inseguras, comportamentos inseguros, controle de tokens, limites de sistema, validação de campos, sanitização, SQL Injection, XSS, SSRF, uploads, OCR, autenticação, autorização ou cálculos financeiros."
---

# Segurança e Cálculo Financeiro

- Trate segurança como requisito padrão, não opcional.
- Trate toda saída de OCR como entrada não confiável.
- Sanitize dados antes de renderizar, persistir ou reutilizar em prompts e relatórios.
- Padronize cálculos financeiros com precisão decimal e arredondamento consistente entre frontend e backend.
- Em qualquer regra de negócio, deixe explícitas premissas, limites e fórmulas usadas no cálculo.

## Perguntas obrigatórias

- Qual é a origem de cada dado e qual fronteira de confiança ele cruza?
- Quem pode executar esta ação e qual autorização por recurso é necessária?
- Existe validação server-side para todos os campos, mesmo se o frontend já validar?
- Quais limites impedem abuso: tamanho de payload, tamanho de upload, paginação, taxa, timeout, tentativas, concorrência e volume processado?
- Há tokens, segredos ou dados sensíveis nesse fluxo? Onde são armazenados, mascarados, renovados e revogados?
- O que acontece se o OCR, arquivo ou integração externa devolver dado malicioso, incompleto ou muito grande?
- Quais logs, métricas e mensagens de erro serão emitidos? Eles evitam vazar segredos, PII e detalhes internos?
- A operação precisa ser idempotente? Como replay, duplicidade e reprocessamento são tratados?

## APIs e padrões inseguros a evitar

- Nunca interpolar valores diretamente em SQL; use sempre parâmetros e allowlist para nomes dinâmicos de coluna ou ordenação.
- Não use `eval`, `new Function`, `vm` ou desserialização de conteúdo não confiável.
- Não use `child_process.exec` ou `execSync` com entrada controlada pelo usuário; prefira comandos fixos ou APIs dedicadas.
- Não injete HTML cru com `v-html`, `innerHTML` ou equivalentes sem sanitização rigorosa.
- Não monte paths com concatenação de entrada do usuário; normalize e restrinja a diretórios permitidos para evitar path traversal.
- Não aceite URLs arbitrárias sem allowlist, resolução segura de hostname e proteções contra SSRF.
- Não gere tokens, códigos ou segredos com `Math.random()`; use fonte criptograficamente segura.
- Não confie apenas na validação client-side, no MIME enviado pelo navegador ou na extensão do arquivo.

## Controle de tokens e segredos

- Nunca hardcode segredos, tokens, credenciais, chaves privadas ou amostras reais em código, testes, fixtures, docs ou commits.
- Mascare segredos em logs, traces, dashboards, mensagens de erro, screenshots e payloads de auditoria.
- Use TTL curto, menor privilégio, escopos mínimos, rotação e revogação.
- Valide `issuer`, `audience`, expiração, assinatura e escopos de tokens antes de confiar neles.
- Prefira cookies `HttpOnly`, `Secure` e `SameSite` ou armazenamento transitório para credenciais web; evite persistir tokens sensíveis em `localStorage` ou `sessionStorage` sem necessidade comprovada.
- Separe credenciais por ambiente e serviço; não reutilize credenciais administrativas em fluxos de aplicação.

## Limites e validações para todos os campos

- Strings: `trim`, normalização, tamanho mínimo e máximo, charset permitido, regex ou allowlist, escaping na saída e rejeição de caracteres de controle quando não fizer sentido.
- Números e valores monetários: validar tipo, faixas, sinal permitido, precisão, escala, arredondamento consistente, sem aceitar `NaN`, `Infinity` ou conversões implícitas frágeis.
- Datas: validar formato, timezone, faixa aceitável e coerência entre campos como início e fim ou vencimento e pagamento.
- Booleanos e enums: aceitar somente valores explícitos e mapear entradas ambíguas para erro, nunca para fallback silencioso.
- Arrays e objetos: limitar quantidade de itens, profundidade, cardinalidade, campos desconhecidos, duplicidade e payload total.
- Arquivos: validar extensão, MIME, assinatura mágica, tamanho, quantidade, páginas ou dimensões quando aplicável e nome seguro; tratar upload como não confiável.
- OCR e IA: validar schema, comprimentos, faixas numéricas, campos obrigatórios, confiança mínima e revisão humana quando houver ambiguidade relevante.
- Headers, params, query string, body, variáveis de ambiente e metadados de arquivo devem seguir as mesmas regras de validação server-side.

## Comportamentos de sistema seguros

- Encapsule chamadas de I/O e integrações externas com tratamento explícito de erro, timeout, retry com backoff e limites de concorrência.
- Em falhas graves, pare o fluxo com segurança, registre o incidente internamente e devolva mensagens neutras ao usuário final.
- Aplique rate limiting, paginação com teto, limites de busca e proteção contra enumeração quando houver leitura massiva.
- Use idempotência em operações críticas de escrita, pagamentos, uploads e reprocessamentos.
- Desative debug verbose em produção e não exponha stack trace, queries SQL, tokens ou detalhes internos ao cliente.
- Registre eventos de segurança e trilhas de auditoria sem armazenar segredos ou PII desnecessária.
