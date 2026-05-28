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
COPY apps/web ./apps/web
RUN pnpm install --filter @controle-financeiro/web... --filter @controle-financeiro/shared-contracts...
RUN pnpm --filter @controle-financeiro/shared-contracts build
RUN pnpm --filter @controle-financeiro/web build

FROM nginx:1.27-alpine AS production
COPY infra/docker/web.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]