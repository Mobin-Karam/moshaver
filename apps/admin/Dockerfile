FROM node:22-slim AS deps
WORKDIR /app/apps/admin
COPY packages/api-contract /app/packages/api-contract
COPY apps/admin/package*.json ./
RUN npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-retry-maxtimeout 120000
RUN npm ci --no-audit --no-fund

FROM node:22-slim AS build
WORKDIR /app/apps/admin
ARG VITE_API_URL=/api/v2
ENV VITE_API_URL=$VITE_API_URL
COPY --from=deps /app/apps/admin/node_modules ./node_modules
COPY packages/api-contract /app/packages/api-contract
COPY apps/admin ./
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY apps/admin/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
ENV API_PROXY_TARGET=http://backend-v2:4000
EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst '$$API_PROXY_TARGET' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
