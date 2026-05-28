ARG NODE_VERSION=24.14.1

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
RUN corepack enable
WORKDIR /workspace

FROM base AS development
COPY package.json pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web ./apps/web
RUN pnpm install
CMD ["bash"]

FROM base AS build
COPY package.json pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --filter @controle-financeiro/api... --filter @controle-financeiro/finance-core... --filter @controle-financeiro/shared-contracts...
RUN pnpm --filter @controle-financeiro/shared-contracts build
RUN pnpm --filter @controle-financeiro/finance-core build
RUN pnpm --filter @controle-financeiro/api build

FROM node:${NODE_VERSION}-bookworm-slim AS production
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
ENV NODE_ENV=production
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages/finance-core/package.json ./packages/finance-core/package.json
COPY packages/shared-contracts/package.json ./packages/shared-contracts/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --prod --filter @controle-financeiro/api... --filter @controle-financeiro/finance-core... --filter @controle-financeiro/shared-contracts...
COPY --from=build /workspace/packages/shared-contracts/dist ./packages/shared-contracts/dist
COPY --from=build /workspace/packages/finance-core/dist ./packages/finance-core/dist
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]