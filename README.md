# controle_financeiro

Projeto de engenharia de controle financeiro familiar e recuperação de ativos, com ingestão manual de documentos, revisão assistida por IA, diagnóstico de endividamento e prescrição de plano financeiro.

## Documentação base

- [docs/arquitetura.md](docs/arquitetura.md)
- [docs/docker-e-compose.md](docs/docker-e-compose.md)
- [docs/mvp-inicial.md](docs/mvp-inicial.md)
- [docs/padroes-de-desenvolvimento.md](docs/padroes-de-desenvolvimento.md)
- [.github/copilot-instructions.md](.github/copilot-instructions.md)

## Decisões atuais

- Monorepo com `apps/web`, `apps/api` e `apps/file-server`.
- Frontend em Vue com Options API, PrimeVue e ApexCharts.
- Backend principal em Node.js com PostgreSQL.
- Servidor de arquivos isolado em Ruby on Rails.
- Cálculos financeiros centralizados em pacote compartilhado.
- Docker e Docker Compose como padrão para desenvolvimento e produção.
- Stack principal limitada a 2 vCPUs e 1 GiB de RAM.

## Ordem sugerida para iniciar

1. Estruturar o monorepo e a automação de workspace.
2. Definir Dockerfiles e composes base, dev, test e prod dentro do orçamento de recursos.
3. Criar o pacote compartilhado de contratos e o motor financeiro.
4. Subir o backend com endpoints mínimos de saúde, documentos e diagnóstico.
5. Subir a primeira tela de upload e revisão OCR.
