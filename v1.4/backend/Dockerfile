FROM node:22.12.0-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_PATH=/data/moshaver.sqlite
ENV NODE_NO_WARNINGS=1

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
COPY seed ./seed
COPY scripts ./scripts

RUN mkdir -p /data && chown -R node:node /app /data

USER node

EXPOSE 4000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "http=require('http');r=http.get('http://127.0.0.1:'+(process.env.PORT||4000)+'/health',x=>process.exit(x.statusCode===200?0:1));r.on('error',()=>process.exit(1))"

CMD ["node", "--experimental-sqlite", "src/server.js"]
