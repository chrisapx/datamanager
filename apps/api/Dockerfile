FROM node:20-alpine AS base
RUN npm install -g pnpm@10

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @datamanager/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=deps /app/apps/api/node_modules ./node_modules
COPY apps/api/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/index.js"]
