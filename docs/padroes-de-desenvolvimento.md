# Padrões de Desenvolvimento

## Objetivo

Estabelecer um conjunto de práticas que reduza retrabalho, preserve consistência e mantenha velocidade de entrega sem abrir mão de segurança e legibilidade.

## Princípios obrigatórios

- Uma única fonte de verdade para cálculos financeiros.
- Contratos explícitos entre frontend, backend e file server.
- Menor privilégio e menor superfície de dados por padrão.
- Validação forte nas bordas e lógica pura no núcleo.
- Fail-fast para inconsistência de dados, com mensagem segura para o usuário.
- Segurança por padrão em armazenamento, transporte e persistência.
- Testes próximos do comportamento, não apenas da implementação.

## Padrões de stack e ambiente

- Use Node.js LTS atual para `apps/web` e `apps/api`.
- Use TypeScript estrito no frontend e no backend.
- Use `pnpm workspaces` para dependências JS e `turbo` para orquestração local e CI.
- Use Rails em modo API para o file server.
- Use PostgreSQL como banco principal e MinIO em desenvolvimento para simular object storage.
- Use Docker e Docker Compose como padrão tanto para desenvolvimento quanto para produção single-host.
- Mantenha o runtime principal dentro do teto físico de `2` vCPUs e `1 GiB` de RAM.
- No desenvolvimento padrão, a soma dos limites declarados da stack deve ficar em até `1.70` CPUs e `896MiB`, preservando reserva operacional.

## Padronização Docker e Compose

- O detalhamento oficial fica em [docs/docker-e-compose.md](docs/docker-e-compose.md).
- Todo serviço da stack principal deve declarar `cpus` e `mem_limit`.
- O orçamento é global da stack, não de um container isolado.
- Todo compose deve diferenciar claramente base, desenvolvimento, teste, produção e ferramentas auxiliares.
- Desenvolvimento pode usar bind mounts de código; produção não.
- Produção deve usar imagens imutáveis geradas pela CI.
- Todo serviço deve ter `healthcheck`, logging com rotação e política de restart.
- Ferramentas auxiliares devem ficar em compose separado e fora do orçamento principal.
- Sempre revisar se a soma da stack padrão permanece abaixo de `1.70` CPUs e `896MiB`.
- Nunca usar o limite do serviço como alvo de consumo; o código deve trabalhar com folga operacional.

## Organização de código

### Frontend

- Vue somente com Options API.
- Estrutura orientada a feature em `modules/`.
- Componentes reutilizáveis em `shared/components`.
- Chamadas HTTP concentradas em `shared/api`.
- Todo texto visível ao usuário deve estar em português do Brasil (`pt-BR`), com acentuação correta e linguagem natural.
- Botões, labels, placeholders, mensagens de validação, mensagens de erro, notificações, títulos, subtítulos e qualquer microcopy da interface devem seguir `pt-BR` consistente.
- Fluxos autenticados devem depender do contexto de sessão do usuário, nunca de identificadores inferidos apenas pela URL ou pela tela.
- Regras financeiras ficam fora dos componentes e, sempre que possível, no pacote compartilhado.

### Backend

- Cada módulo deve ter schema, controller, service e repository.
- Controllers não fazem cálculo financeiro.
- Services não conhecem detalhes de transporte HTTP.
- Repositories não recebem strings SQL montadas manualmente.
- Toda rota funcional deve validar identidade autenticada e autorização por recurso antes de consultar ou persistir dados.
- Defina DTOs distintos para listagem, detalhe, criação e atualização quando o frontend não precisar do agregado completo.
- Nunca envie campos internos, IDs de correlação, dados sensíveis ou coleções completas se a UI consome apenas um resumo.
- Integrações externas devem ter client dedicado, timeout e tratamento de erro.
- Para dados potencialmente grandes, prefira paginação, stream, cursor ou processamento em lotes.
- Evite carregar OCR bruto, listas extensas ou arquivos completos em memória do processo.
- Agregações, filtros e ordenações devem ser empurrados para o banco quando possível.

### File server

- Responsabilidade exclusiva por upload, armazenamento e acesso a arquivos.
- Nunca incorporar regra de negócio financeira.
- Sempre validar MIME type, extensão, tamanho e autorização.

## Contratos e validação

- Defina schemas compartilhados em `packages/shared-contracts`.
- Gere tipos a partir desses schemas para reduzir drift entre frontend e backend.
- Toda entrada externa deve ser validada antes de entrar na regra de negócio.
- Todo payload de OCR deve passar por sanitização e revisão antes da consolidação definitiva.
- Modele contratos de leitura e escrita separadamente quando isso reduzir overfetching, underfetching ou exposição de campos desnecessários.
- O contrato de resposta deve nascer da necessidade real da tela consumidora, não do formato interno da entidade persistida.

## Padrões de dados e banco

- Toda operação SQL deve ser parametrizada.
- Migrations devem ser pequenas, reversíveis quando possível e revisadas em pull request.
- Seeds de desenvolvimento devem ser idempotentes.
- Valores monetários, taxas e percentuais devem usar precisão decimal.
- Fórmulas e premissas devem ser documentadas junto aos testes da regra.

## Tratamento de erros e observabilidade

- Padronize erros de domínio, validação, autenticação e integração.
- Respostas externas não devem expor stack trace, SQL ou detalhes internos.
- Logs devem ser estruturados, com `requestId`, módulo e tipo de evento.
- Eventos sensíveis devem gerar auditoria mínima.
- Eventos de cadastro, login, falha de autenticação e negação de acesso devem ser auditáveis.
- Integrações externas devem registrar tempo de resposta, falha e contexto de correlação.

## Checklist de segurança por feature

### Perguntas obrigatórias

- Qual é a origem de cada dado e qual fronteira de confiança ele cruza.
- Quem pode executar a ação e qual autorização por recurso deve ser exigida.
- Existe validação server-side para todos os campos, mesmo quando a interface já valida.
- Quais limites impedem abuso: payload, upload, paginação, taxa, timeout, tentativas, concorrência e volume processado.
- Há tokens, segredos, PII ou dados financeiros sensíveis no fluxo.
- O que acontece se OCR, arquivo ou integração externa devolver dado malicioso, incompleto ou excessivo.
- Quais logs, métricas, auditorias e mensagens de erro serão emitidos sem vazar dados internos.
- A operação precisa ser idempotente e como replay, duplicidade e reprocessamento serão tratados.

### APIs e comportamentos inseguros a evitar

- Nunca interpolar valores diretamente em SQL; use queries parametrizadas e allowlist para ordenação, filtros e nomes dinâmicos.
- Não usar `eval`, `new Function`, `vm`, desserialização de conteúdo não confiável ou execução dinâmica equivalente.
- Não usar `child_process.exec` ou `execSync` com entrada controlada por usuário.
- Não renderizar HTML cru com `v-html`, `innerHTML` ou equivalente sem sanitização estrita.
- Não montar paths ou URLs a partir de entrada externa sem normalização, allowlist e proteção contra path traversal e SSRF.
- Não gerar tokens, códigos ou segredos com fontes não criptográficas como `Math.random()`.
- Não confiar apenas em validação client-side, MIME enviado pelo cliente ou extensão do arquivo.

### Controle de tokens e segredos

- Nunca hardcode segredos, tokens, credenciais, chaves privadas ou exemplos reais em código, docs, logs, fixtures ou commits.
- Mascare segredos em logs, traces, dashboards, mensagens de erro e trilhas de auditoria.
- Use menor privilégio, TTL curto, rotação, revogação e escopos mínimos.
- Valide assinatura, expiração, `issuer`, `audience` e escopos antes de confiar em um token.
- Em aplicações web, prefira cookies `HttpOnly`, `Secure` e `SameSite` ou armazenamento transitório para credenciais.
- Separe credenciais por ambiente, serviço e finalidade; não reutilize credenciais administrativas no fluxo da aplicação.

### Limites e validações para todos os campos

- Strings: `trim`, normalização, tamanho mínimo e máximo, charset permitido, regex ou allowlist e rejeição de caracteres de controle indevidos.
- Números e valores monetários: tipo, faixa, sinal permitido, precisão, escala, arredondamento consistente e rejeição de `NaN` ou `Infinity`.
- Datas: formato, timezone, faixa aceitável e coerência entre início e fim, vencimento e pagamento ou datas equivalentes.
- Booleanos e enums: aceitar somente valores explícitos, sem fallback silencioso.
- Arrays e objetos: limitar quantidade de itens, profundidade, cardinalidade, campos desconhecidos, duplicidade e tamanho total do payload.
- Arquivos: validar extensão, MIME, assinatura mágica, tamanho, quantidade, páginas ou dimensões e nome seguro.
- OCR e IA: validar schema, campos obrigatórios, faixas numéricas, comprimentos, confiança mínima e revisão humana quando houver ambiguidade relevante.
- Headers, params, query string, body, variáveis de ambiente e metadados de arquivo devem seguir validação server-side explícita.

### Comportamentos de sistema seguros

- Encapsular I/O e integrações externas com timeout, retry com backoff, circuit breaker quando aplicável e limite de concorrência.
- Aplicar rate limiting, paginação com teto, limites de busca e proteção contra enumeração.
- Usar idempotência em operações críticas de escrita, upload, processamento e reprocessamento.
- Validar uploads por tamanho, MIME, assinatura, quantidade e origem; tratar OCR e integrações externas como não confiáveis.
- Falhar com segurança: encerrar fluxos inválidos cedo, registrar o incidente internamente e responder com mensagem neutra ao usuário.
- Desativar debug verboso em produção e nunca expor stack trace, queries SQL, tokens ou detalhes internos ao cliente.
- Registrar eventos de segurança e auditoria mínima sem armazenar segredos nem PII desnecessária.

## Estratégia de testes

- Frontend com Cypress Component Testing e E2E.
- Backend com Jest e Supertest.
- `packages/finance-core` com testes unitários exaustivos para DTI, Avalanche, Bola de Neve e OBZ.
- Fluxos de OCR, file server e IA com mocks por padrão.
- Todo bug corrigido deve, sempre que viável, ganhar um teste de regressão.

## Qualidade automatizada

- ESLint e Prettier compartilhados no monorepo.
- RuboCop no file server.
- Husky e lint-staged no root para impedir commit quebrado.
- CI com lint, testes, build e análise de segurança.
- CodeQL ou SonarQube para varredura contínua.

## Convenções de colaboração

- Use Conventional Commits.
- Nome de branch por intenção: `feat/`, `fix/`, `chore/`, `docs/`, `test/`.
- Toda mudança relevante de arquitetura deve atualizar a documentação correspondente.
- Requisitos de idioma que afetem a experiência final do produto devem ser documentados e preservados nos fluxos de UI, e-mail, notificações e mensagens exibidas ao usuário.
- Pull requests devem descrever escopo, risco, estratégia de teste e impacto em segurança.

## Técnicas que aceleram o desenvolvimento com qualidade

### 1. Contrato primeiro

Defina schema, payload e resposta antes da implementação da UI ou do endpoint. Isso reduz retrabalho e permite paralelismo entre frontend e backend.

### 2. Pacote financeiro isolado

Concentre toda a matemática em `packages/finance-core`. Isso acelera testes, reduz duplicação e impede divergência entre tela e API.

### 3. Mock por padrão nas integrações externas

Comece desenvolvimento e testes com mocks de LlamaParse, Cognee e file server. Ative integração real apenas em cenários controlados.

### 4. Fixtures determinísticas

Mantenha um conjunto pequeno de famílias, dívidas e documentos de exemplo. Isso acelera desenvolvimento visual, testes e depuração.

### 5. Vertical slice curta

Entregue fatias pequenas e completas: tela + endpoint + regra + teste. Evite construir toda a infraestrutura antes de validar o fluxo.

### 5.1. Ambiente idêntico desde o começo

Suba desenvolvimento, testes e produção com a mesma base de Dockerfiles e a mesma família de compose. Isso reduz diferença entre ambientes e acelera diagnóstico.

### 5.2. Processamento orientado a orçamento

Modele algoritmos, consultas e fluxos de arquivo para caber no orçamento total da stack. Se uma solução depende de consumir a maior parte da RAM de um único serviço, ela deve ser revista antes de entrar no projeto.

### 6. Definition of Done objetiva

Considere pronta apenas a entrega que tiver documentação mínima, validação, logs, testes relevantes e comportamento seguro em erro.

### 7. ADR leve para decisões estruturais

Quando uma decisão impactar muitas pastas ou times, registre em documento curto para evitar reabertura da mesma discussão.

## Checklist mínimo por feature

- Existe contrato de entrada e saída.
- Existe validação nas bordas.
- Existe autenticação e autorização compatíveis com o recurso exposto.
- A checklist de segurança da feature foi revisada, incluindo campos, limites, tokens, integrações e abuso.
- A lógica financeira usa precisão decimal.
- O erro é seguro e observável.
- O endpoint envia e recebe apenas os campos estritamente necessários para a experiência do frontend.
- Existem testes do comportamento principal.
- O fluxo cabe no orçamento de CPU e RAM da stack padrão sem monopolizar um serviço.
- A documentação relevante foi atualizada.