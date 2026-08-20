FROM node:22-slim AS deps
WORKDIR /app
COPY student-core ./student-core
COPY student-app-v2/package*.json ./student-app-v2/
RUN npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-retry-maxtimeout 120000
RUN cd student-app-v2 && npm ci --no-audit --no-fund

FROM node:22-slim AS build
WORKDIR /app
ARG VITE_API_URL=/api/v2
ENV VITE_API_URL=$VITE_API_URL
COPY --from=deps /app/student-app-v2/node_modules ./student-app-v2/node_modules
COPY student-core ./student-core
COPY student-app-v2 ./student-app-v2
RUN cd student-core && ../student-app-v2/node_modules/.bin/tsc -p tsconfig.json
RUN cd student-app-v2 && npm run build

FROM nginx:1.27-alpine AS runtime
COPY student-app-v2/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/student-app-v2/dist /usr/share/nginx/html
ENV API_PROXY_TARGET=http://backend-v2:4000
EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst '$$API_PROXY_TARGET' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
