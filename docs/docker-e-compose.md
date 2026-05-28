# Docker e Compose

## Objetivo

Padronizar desenvolvimento e produção com containers previsíveis, reproduzíveis e leves. O projeto deve conseguir operar dentro de um orçamento máximo de 2 vCPUs e 1 GiB de RAM para a stack principal habilitada.

## Regra global de capacidade

- O perfil principal da aplicação não pode ultrapassar `2.00` CPUs e `1024MiB` de RAM.
- Esse valor é o orçamento total da stack inteira, não o limite de um serviço isolado.
- A soma dos limites de todos os serviços habilitados por padrão deve respeitar esse teto.
- Para desenvolvimento padrão, a soma declarada em compose deve ficar abaixo do teto bruto e preservar margem operacional para overhead do Docker, rede, filesystem cache e picos transitórios.
- Se um único serviço consumir sozinho perto de `1 GiB`, a stack é considerada inválida, porque banco, storage e demais serviços precisam continuar saudáveis ao mesmo tempo.
- Ferramentas auxiliares de inspeção, debug ou administração devem ficar em um compose separado e desligadas por padrão.
- LlamaParse e Cognee são serviços externos e não entram no orçamento local da stack.

## Orçamento padrão de desenvolvimento

- Teto físico da stack: `2.00` CPUs e `1024MiB` de RAM.
- Orçamento utilizável da stack no compose padrão de desenvolvimento: até `1.70` CPUs e `896MiB` de RAM.
- Reserva operacional obrigatória: pelo menos `0.30` CPU e `128MiB` livres para absorver overhead e evitar degradação por contenção.
- Toda revisão futura de limites deve preservar essa lógica: o total declarado para os containers padrão precisa ficar abaixo do teto físico do host-alvo.

## Estrutura recomendada

```text
infra/
|-- compose/
|   |-- compose.base.yaml
|   |-- compose.dev.yaml
|   |-- compose.prod.yaml
|   |-- compose.test.yaml
|   |-- compose.tools.yaml
|   `-- env/
|       |-- .env.example
|       `-- .env
`-- docker/
    |-- web.Dockerfile
    |-- api.Dockerfile
    |-- file-server.Dockerfile
    |-- nginx.Dockerfile
    `-- shared/
        |-- node-base.Dockerfile
        `-- rails-base.Dockerfile
```

## Papel de cada compose

### `compose.base.yaml`

- Define redes, volumes nomeados, healthchecks, políticas de restart, logging e limites de recursos.
- Define apenas o comportamento comum e imutável entre ambientes.
- Não deve conter bind mounts de código-fonte.
- Deve declarar `cpus` e `mem_limit` para enforcement local e `deploy.resources.limits` para portabilidade documental.
- Deve organizar a stack mínima em dois perfis: `core` e `infra`.

### `compose.dev.yaml`

- Sobrescreve a base para desenvolvimento local.
- Pode usar bind mounts somente para código da aplicação.
- Deve habilitar hot reload para `web` e reinício rápido para `api`.
- Deve subir `postgres` e `minio` localmente no perfil padrão de desenvolvimento.
- Deve usar mocks por padrão para OCR, Cognee e integrações externas que não sejam indispensáveis ao fluxo local.
- Pode publicar portas de desenvolvimento no host, mas apenas as necessárias.

### `compose.prod.yaml`

- Usa imagens imutáveis geradas pela pipeline.
- Não usa bind mounts de código-fonte.
- Não expõe portas de debug.
- Deve trabalhar com segredos e variáveis externas ao repositório.
- Deve preferir storage e banco externos quando o alvo produtivo exigir mais previsibilidade operacional.
- Quando usar Docker Compose em produção, o escopo assumido é single-host. Escalonamento horizontal deve ser tratado separadamente.

### `compose.test.yaml`

- Sobe ambiente efêmero para testes automatizados.
- Deve reduzir ao mínimo os serviços necessários por suíte.
- Não deve reaproveitar volumes persistentes do ambiente de desenvolvimento.
- Pode usar banco e storage descartáveis para garantir repetibilidade.

### `compose.tools.yaml`

- Concentra Adminer, Mailpit, consoles de inspeção, ferramentas de profiling ou debug.
- Nunca sobe por padrão.
- Não faz parte do orçamento operacional do runtime principal.
- Não deve ser usado em produção.

## Orçamento de recursos por serviço

Os limites abaixo são o teto inicial obrigatório para o perfil padrão local com a stack principal completa:

| Serviço | CPU máxima | RAM máxima | Observação |
|---|---:|---:|---|
| `web` | `0.20` | `128MiB` | frontend Vite ou servidor web leve |
| `api` | `0.45` | `192MiB` | Fastify com validação, streaming e logs estruturados |
| `file-server` | `0.25` | `160MiB` | Rails API com configuração enxuta e sem jobs pesados locais |
| `postgres` | `0.55` | `320MiB` | parâmetros ajustados para ambiente pequeno |
| `minio` | `0.10` | `96MiB` | apenas para desenvolvimento local |
| **Total declarado** | **`1.55`** | **`896MiB`** | preserva reserva operacional dentro do teto bruto |
| **Reserva operacional** | **`0.45`** | **`128MiB`** | margem para overhead, picos e estabilidade |

### Regras adicionais do orçamento

- Nenhum serviço pode reivindicar sozinho o teto total da stack.
- O `api` não pode ultrapassar `192MiB` no compose padrão; se precisar de mais, a solução deve ser otimizar processamento antes de revisar orçamento.
- O `file-server` não pode ultrapassar `160MiB` no compose padrão; qualquer processamento pesado de arquivo deve ser delegado ou fatiado.
- O `web` deve permanecer enxuto; build pesada e tooling adicional não fazem parte do runtime padrão.
- Serviços auxiliares, workers experimentais, consoles administrativos e ferramentas de profiling só podem subir via `compose.tools.yaml`.

## Regras obrigatórias por serviço

- Todo serviço deve ter `healthcheck`.
- Todo serviço crítico deve usar `depends_on` com condição de saúde, não apenas ordem de subida.
- Todo serviço deve ter `restart` apropriado ao ambiente.
- Todo serviço deve declarar `stop_grace_period` coerente com encerramento limpo.
- Logs devem ter rotação com limites de tamanho e quantidade.
- Containers devem usar timezone e locale explícitos quando isso impactar data financeira ou processamento de arquivo.
- O processo principal deve operar bem abaixo do limite configurado em uso típico; limite não é meta de consumo.

## Regras de implementação para caber no orçamento

- Prefira paginação, cursores ou processamento em lotes para listas de dívidas, lançamentos e linhas de OCR.
- Prefira streaming para upload, download, leitura e transformação de arquivos.
- Nunca carregar arquivos grandes ou conjuntos extensos inteiros em memória quando houver alternativa incremental.
- Empurre agregações, filtros, ordenações e projeções para o PostgreSQL sempre que o banco puder fazer isso melhor que a aplicação.
- Selecione apenas colunas necessárias nas consultas; evite `select *` em fluxos de aplicação.
- Limite tamanho de payload HTTP, número de registros por página e quantidade de itens por lote.
- Evite serializar objetos grandes em logs, cache local ou respostas JSON.
- Em algoritmos financeiros, processe coleções normalizadas e enxutas; cópias desnecessárias de arrays e objetos devem ser evitadas.
- Operações de OCR e parsing devem persistir progresso e trabalhar por etapas, sem acumular tudo na RAM do serviço.

## Convenções de runtime

### Redes

- Use ao menos uma rede interna para comunicação entre serviços.
- Exponha ao host somente `web`, `api` e, quando estritamente necessário, `minio` no desenvolvimento.
- `postgres` e serviços internos não devem ser publicados externamente em produção.

### Volumes

- Use volumes nomeados para dados persistentes.
- Use bind mount apenas em desenvolvimento para código-fonte.
- Nunca persista segredos em volumes compartilhados do projeto.

### Variáveis e segredos

- Centralize todas as variáveis em `infra/compose/env/.env`.
- Versione apenas `infra/compose/env/.env.example` como template único e mantenha `infra/compose/env/.env` fora do controle de versão.
- Gere o arquivo real uma vez com `pnpm env:init` e passe a gerenciar apenas `infra/compose/env/.env` no dia a dia.
- O Compose deve interpolar esse arquivo central, mas cada serviço deve receber apenas as variáveis explicitamente mapeadas para ele.
- Produção deve preferir segredos injetados pelo host, pipeline ou orquestrador.
- Não duplicar chaves de configuração em múltiplos arquivos se a base puder centralizar isso.

## Regras para Dockerfiles

- Um Dockerfile por aplicação e imagens base compartilhadas somente quando reduzirem duplicação real.
- Sempre usar build multi-stage.
- Fixar versão da imagem base por tag explícita e revisar periodicamente.
- Executar processo com usuário não root sempre que possível.
- Ter `.dockerignore` rigoroso para evitar contexto inchado.
- Em produção, imagens não devem depender de ferramentas de build, shells desnecessários ou caches de pacote.

## Comportamento por ambiente

### Desenvolvimento

- Priorizar tempo de feedback e previsibilidade.
- Habilitar hot reload somente nos serviços que realmente ganham com isso.
- Rodar com mocks por padrão para integrações externas pagas, lentas ou instáveis.
- Permitir inspeção local com profiles opcionais sem alterar o compose de produção.
- O compose padrão de desenvolvimento deve subir apenas a stack mínima necessária para o fluxo principal.
- Qualquer serviço adicional deve entrar em perfil opcional, nunca no perfil padrão.

### Produção

- Priorizar imutabilidade, segurança e recuperação automática.
- Usar imagens geradas e versionadas pela CI.
- Ativar filesystem read-only quando a aplicação permitir.
- Declarar `tmpfs` para diretórios temporários quando necessário.
- Evitar publicar portas internas diretamente; preferir um ponto de entrada controlado.

## Comandos esperados

### Bootstrap do ambiente

```bash
pnpm env:init
```

### Desenvolvimento

```bash
docker compose --env-file infra/compose/env/.env -f infra/compose/compose.base.yaml -f infra/compose/compose.dev.yaml up --build
```

### Testes

```bash
docker compose --env-file infra/compose/env/.env -f infra/compose/compose.base.yaml -f infra/compose/compose.test.yaml up --abort-on-container-exit --exit-code-from api
```

### Produção

```bash
docker compose --env-file infra/compose/env/.env -f infra/compose/compose.base.yaml -f infra/compose/compose.prod.yaml up -d
```

## Critérios de aceite para futuros arquivos Docker e Compose

- Existe separação clara entre base, desenvolvimento, teste e produção.
- Os limites de CPU e RAM estão declarados, somam no máximo `1.70` CPUs e `896MiB` no desenvolvimento padrão e respeitam o teto bruto global.
- Todos os serviços têm healthcheck, logging e restart coerentes.
- As imagens são multi-stage e executadas com o mínimo necessário.
- O compose de produção não depende de bind mount de código.
- O compose local principal sobe a stack sem ultrapassar o orçamento total e sem permitir que um único serviço monopolize a RAM ou CPU disponíveis.