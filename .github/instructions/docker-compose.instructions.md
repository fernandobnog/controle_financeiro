---
name: "Docker e Compose"
description: "Use quando criar ou editar Dockerfiles, arquivos Docker Compose, .dockerignore, infraestrutura de containers, runtime local, CI containerizada ou deploy single-host com Docker deste projeto."
applyTo:
  - "**/Dockerfile"
  - "**/*.Dockerfile"
  - "**/.dockerignore"
  - "infra/compose/**/*.yaml"
  - "infra/compose/**/*.yml"
  - "**/compose*.yaml"
  - "**/compose*.yml"
---

# Docker e Compose

- Use Docker e Docker Compose como padrão tanto em desenvolvimento quanto em produção single-host.
- Estruture os arquivos em `compose.base`, `compose.dev`, `compose.test`, `compose.prod` e `compose.tools`.
- Todo serviço deve declarar `cpus` e `mem_limit`, além de documentar `deploy.resources.limits`.
- O orçamento é total da stack, não por container isolado.
- No desenvolvimento padrão, a soma dos serviços habilitados deve ficar em até `1.70` CPUs e `896MiB`, preservando margem operacional dentro do teto físico de `2` vCPUs e `1 GiB`.
- Nenhum serviço pode monopolizar sozinho a RAM total da stack; backend, banco e file server devem ter tetos próprios bem abaixo do limite global.
- Todo serviço deve ter `healthcheck`, logging com rotação, restart policy e `stop_grace_period` coerente.
- Desenvolvimento pode usar bind mounts de código; produção não.
- Imagens devem ser multi-stage, enxutas e executadas com usuário não root quando possível.
- Ferramentas auxiliares devem ficar fora do compose principal e desligadas por padrão.