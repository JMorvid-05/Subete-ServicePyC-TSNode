FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build \
    # las migraciones .sql viajan junto al código compilado (no las copia tsc)
    && mkdir -p dist/db/migrations \
    && cp src/db/migrations/*.sql dist/db/migrations/

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3001
CMD ["node", "dist/server.js"]
