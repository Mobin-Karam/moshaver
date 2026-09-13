FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY packages/cmb ./packages/cmb
COPY apps/api/package*.json ./apps/api/
WORKDIR /app/apps/api
RUN npm ci --no-audit --no-fund

FROM deps AS prod-deps
WORKDIR /app/apps/api
RUN npm prune --omit=dev

FROM node:22-slim AS build
WORKDIR /app/apps/api
COPY --from=deps /app/apps/api/node_modules ./node_modules
COPY packages/cmb /app/packages/cmb
COPY apps/api .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app/apps/api
ENV NODE_ENV=production
COPY --from=prod-deps /app/apps/api/node_modules ./node_modules
COPY packages/cmb /app/packages/cmb
COPY apps/api/package*.json ./
COPY --from=build /app/apps/api/dist ./dist
EXPOSE 4000
CMD ["node", "dist/main.js"]
