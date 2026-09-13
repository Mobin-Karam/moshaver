FROM node:22-slim AS deps
WORKDIR /app
COPY student-core ./student-core
COPY packages/api-contract ./packages/api-contract
COPY apps/student/package*.json ./apps/student/
RUN npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-retry-maxtimeout 120000
RUN cd student-core && npm ci --no-audit --no-fund
RUN cd apps/student && npm ci --no-audit --no-fund

FROM node:22-slim AS build
WORKDIR /app
ARG VITE_API_URL=/api/v2
ENV VITE_API_URL=$VITE_API_URL
COPY --from=deps /app/apps/student/node_modules ./apps/student/node_modules
COPY --from=deps /app/student-core/node_modules ./student-core/node_modules
COPY student-core ./student-core
COPY packages/api-contract ./packages/api-contract
COPY apps/student ./apps/student
RUN cd student-core && ../apps/student/node_modules/.bin/tsc -p tsconfig.json
RUN cd apps/student && npm run build

FROM nginx:1.27-alpine AS runtime
COPY apps/student/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/student/dist /usr/share/nginx/html
ENV API_PROXY_TARGET=http://backend-v2:4000
EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst '$$API_PROXY_TARGET' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
